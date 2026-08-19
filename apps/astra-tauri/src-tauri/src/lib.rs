use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{oneshot, Mutex};

const DEFAULT_SERVER: &str = "https://astroy.xyz";
const KEYRING_SERVICE: &str = "xyz.astroy.app";
const KEYRING_ACCOUNT: &str = "session-bearer";

#[derive(Default, Clone)]
struct NativeState {
    server: Arc<Mutex<String>>,
    token: Arc<Mutex<Option<String>>>,
    sse_abort: Arc<Mutex<Option<oneshot::Sender<()>>>>,
}

#[derive(Serialize, Deserialize)]
struct NativeResult { access_token: String, token_type: String, expires_in: u64, user: serde_json::Value }

#[derive(Deserialize, Serialize)]
struct LoginBody { identifier: String, password: String }

#[derive(Serialize)]
struct NativeHttpResponse { status: u16, body: String }

#[derive(Debug, Serialize)]
struct NativeCommandError {
    message: String,
    status: Option<u16>,
}

impl NativeCommandError {
    fn http(status: u16, message: String) -> Self {
        Self { message, status: Some(status) }
    }
}

impl From<String> for NativeCommandError {
    fn from(message: String) -> Self {
        Self { message, status: None }
    }
}

#[derive(Deserialize)]
struct FrontendHealthReport { icon_source: String, unresolved_icons: u32, rendered_icons: u32 }

fn native_login_error(status: u16, raw: &str) -> NativeCommandError {
    let detail = serde_json::from_str::<serde_json::Value>(raw)
        .ok()
        .and_then(|value| value.get("detail").and_then(|item| item.as_str()).map(str::to_owned));
    NativeCommandError::http(status, detail.unwrap_or_else(|| format!("Login failed ({status})")))
}

fn secure_entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).map_err(|e| e.to_string())
}

fn save_secure_token(token: &str) -> Result<(), String> { secure_entry()?.set_password(token).map_err(|e| e.to_string()) }
fn load_secure_token() -> Result<Option<String>, String> {
    match secure_entry()?.get_password() {
        Ok(token) if !token.is_empty() => Ok(Some(token)),
        Ok(_) => Ok(None),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}
fn clear_secure_token() -> Result<(), String> {
    match secure_entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
async fn native_login(state: State<'_, NativeState>, body: LoginBody) -> Result<NativeResult, NativeCommandError> {
    let server = state.server.lock().await.clone();
    let response = Client::new().post(format!("{server}/api/v1/auth/native/login")).json(&body).send().await.map_err(|e| e.to_string())?;
    let status = response.status();
    let raw = response.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(native_login_error(status.as_u16(), &raw));
    }
    let value = serde_json::from_str::<NativeResult>(&raw).map_err(|e| e.to_string())?;
    *state.token.lock().await = Some(value.access_token.clone());
    save_secure_token(&value.access_token)?;
    Ok(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn native_login_error_preserves_backend_detail_for_tauri() {
        let error = native_login_error(401, r#"{"detail":"Account does not exist"}"#);
        let serialized = serde_json::to_value(error).expect("native error must serialize");
        assert_eq!(serialized["message"], "Account does not exist");
        assert_eq!(serialized["status"], 401);
    }

    #[test]
    fn native_login_error_has_a_status_fallback() {
        let error = native_login_error(502, "not json");
        assert_eq!(error.message, "Login failed (502)");
        assert_eq!(error.status, Some(502));
    }
}

#[tauri::command]
async fn native_refresh(state: State<'_, NativeState>) -> Result<NativeResult, String> {
    let server = state.server.lock().await.clone();
    let token = state.token.lock().await.clone().ok_or("Not logged in")?;
    let value = Client::new().post(format!("{server}/api/v1/auth/native/session/refresh")).bearer_auth(token).send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?.json::<NativeResult>().await.map_err(|e| e.to_string())?;
    *state.token.lock().await = Some(value.access_token.clone());
    save_secure_token(&value.access_token)?;
    Ok(value)
}

#[tauri::command]
async fn load_native_token(state: State<'_, NativeState>) -> Result<Option<String>, String> {
    let token = load_secure_token()?;
    if let Some(value) = token.clone() { *state.token.lock().await = Some(value); }
    Ok(token)
}

#[tauri::command]
async fn clear_native_token(state: State<'_, NativeState>) -> Result<(), String> {
    *state.token.lock().await = None;
    clear_secure_token()
}

#[tauri::command]
async fn set_server(state: State<'_, NativeState>, server: String) -> Result<(), String> {
    let parsed = url::Url::parse(server.trim()).map_err(|_| "Server must be a valid URL".to_string())?;
    if parsed.scheme() != "https" && parsed.host_str() != Some("localhost") { return Err("Only HTTPS servers are allowed".into()); }
    let next = parsed.origin().ascii_serialization().trim_end_matches('/').to_string();
    let mut current = state.server.lock().await;
    if *current != next {
        *current = next;
        *state.token.lock().await = None;
        let _ = clear_secure_token();
    }
    Ok(())
}

#[tauri::command]
async fn native_fetch(state: State<'_, NativeState>, path: String, method: String, body: Option<String>) -> Result<NativeHttpResponse, String> {
    if !path.starts_with('/') || path.starts_with("//") { return Err("Invalid API path".into()); }
    let server = state.server.lock().await.clone();
    let token = state.token.lock().await.clone();
    let client = Client::new();
    let method = reqwest::Method::from_bytes(method.to_uppercase().as_bytes()).map_err(|_| "Invalid HTTP method".to_string())?;
    if !matches!(method, reqwest::Method::GET | reqwest::Method::POST | reqwest::Method::PATCH | reqwest::Method::DELETE) { return Err("HTTP method is not allowed".into()); }
    let mut request = client.request(method, format!("{server}{path}"));
    if let Some(token) = token { request = request.bearer_auth(token); }
    if let Some(raw) = body { request = request.header("content-type", "application/json").body(raw); }
    let response = request.send().await.map_err(|e| e.to_string())?;
    let status = response.status().as_u16();
    let body = response.text().await.map_err(|e| e.to_string())?;
    Ok(NativeHttpResponse { status, body })
}

#[tauri::command]
async fn start_sse(app: AppHandle, state: State<'_, NativeState>) -> Result<(), String> {
    let server = state.server.lock().await.clone();
    let token = state.token.lock().await.clone().ok_or("Not logged in")?;
    let response = Client::new()
        .get(format!("{server}/api/v1/events/stream"))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    let (abort_tx, mut abort_rx) = oneshot::channel();
    if let Some(previous) = state.sse_abort.lock().await.replace(abort_tx) { let _ = previous.send(()); }
    tokio::spawn(async move {
        let mut stream = response.bytes_stream();
        loop {
            tokio::select! {
                _ = &mut abort_rx => break,
                item = stream.next() => match item {
                    Some(Ok(chunk)) => { let _ = app.emit("astra://event", String::from_utf8_lossy(&chunk).to_string()); }
                    _ => break,
                }
            }
        }
    });
    Ok(())
}

#[tauri::command]
async fn stop_sse(state: State<'_, NativeState>) -> Result<(), String> {
    if let Some(abort) = state.sse_abort.lock().await.take() { let _ = abort.send(()); }
    Ok(())
}

#[tauri::command]
fn report_frontend_health(report: FrontendHealthReport) -> Result<(), String> {
    eprintln!(
        "ASTRA_FRONTEND_HEALTH icons={} unresolved={} rendered={}",
        report.icon_source, report.unresolved_icons, report.rendered_icons
    );
    if report.icon_source != "lucide" || report.unresolved_icons != 0 || report.rendered_icons < 20 {
        return Err("Bundled Lucide icons failed to initialize".into());
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(NativeState { server: Arc::new(Mutex::new(DEFAULT_SERVER.to_string())), token: Arc::new(Mutex::new(None)), sse_abort: Arc::new(Mutex::new(None)) })
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| password.to_owned().into()).build())
        .invoke_handler(tauri::generate_handler![native_login, native_refresh, load_native_token, clear_native_token, set_server, native_fetch, start_sse, stop_sse, report_frontend_health])
        .run(tauri::generate_context!())
        .expect("error while running ASTRA");
}
