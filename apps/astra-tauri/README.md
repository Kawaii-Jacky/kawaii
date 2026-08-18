# ASTRA native clients

This is the Tauri 2 wrapper for the canonical `remote-observatory-frontend`.
It produces an unsigned Windows NSIS installer and a universal debug Android
APK for internal testing. iOS/iPadOS intentionally use the web PWA instead of
an IPA.

## Development

From `apps/astra-tauri`, install Tauri 2 prerequisites and run:

```text
cargo tauri dev
cargo tauri build --target x86_64-pc-windows-msvc
cargo tauri android build --apk universal --debug
```

The default server is `https://astroy.xyz`. Native bearer credentials are kept
in the OS credential vault through the Rust `keyring` adapter (and are never
written to localStorage, URLs, or logs); the Tauri Stronghold plugin remains
enabled for future encrypted app settings.
