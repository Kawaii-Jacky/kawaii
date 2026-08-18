use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Manager, State};
use tokio::sync::Mutex;

const DEFAULT_SERVER: &str = "https://astroy.xyz";

#[derive(Default, Clone)]
struct NativeState { server: Arc<Mutex<String>>, token: Arc<Mutex<Option<String>>> }

#[derive(Serialize, Deserialize)]
struct NativeResult { access_token: String, token_type: String, expires_in: u64, user: serde_json::Value }

#[derive(Deserialize)]
struct LoginBody { identifier: String, password: String }

#[tauri::command]
async fn native_login(state: State<'_, NativeState>, body: LoginBody) -> Result<NativeResult, String> {
    let server = state.server.lock().await.clone();
    let value = Client::new().post(format!("{server}/api/v1/auth/native/login")).json(&body).send().await.map_err(|e| e.to_string())?.error_for_status().map_err(|e| e.to_string())?.json::<NativeResult>().await.map_err(|e| e.to_string())?;
    *state.token.lock().await = Some(value.access_token.clone());
    Ok(value)
}

#[tauri::command]
async fn set_server(state: State<'_, NativeState>, server: String) -> Result<(), String> {
    let parsed = url::Url::parse(server.trim()).map_err(|_| "Server must be a valid URL".to_string())?;
    if parsed.scheme() != "https" && parsed.host_str() != Some("localhost") { return Err("Only HTTPS servers are allowed".into()); }
    *state.server.lock().await = parsed.origin().ascii_serialization().trim_end_matches('/').to_string();
    *state.token.lock().await = None;
    Ok(())
}

#[tauri::command]
async fn start_sse(app: AppHandle, state: State<'_, NativeState>) -> Result<(), String> {
    let server = state.server.lock().await.clone();
    let token = state.token.lock().await.clone().ok_or("Not logged in")?;
    tokio::spawn(async move {
        let response = Client::new().get(format!("{server}/api/v1/events/stream")).bearer_auth(token).send().await;
        if let Ok(response) = response {
            let mut stream = response.bytes_stream();
            while let Some(Ok(chunk)) = stream.next().await {
                let _ = app.emit("astra://event", String::from_utf8_lossy(&chunk).to_string());
            }
        }
    });
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .manage(NativeState { server: Arc::new(Mutex::new(DEFAULT_SERVER.to_string())), token: Arc::new(Mutex::new(None)) })
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| password.to_owned()).build())
        .invoke_handler(tauri::generate_handler![native_login, set_server, start_sse])
        .run(tauri::generate_context!())
        .expect("error while running ASTRA");
}
