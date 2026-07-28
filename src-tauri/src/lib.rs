//! Chat — thread history and the API key in the OS config directory.
//!
//! The key is deliberately NOT in web storage: a renderer XSS in any webview
//! app can read localStorage, but it cannot read a file the Rust side only
//! hands over through an explicit command. Same reason the file is 0600.

use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

fn cfg(app: &AppHandle, name: &str) -> PathBuf {
    let d = app.path().app_config_dir().expect("config dir");
    let _ = fs::create_dir_all(&d);
    d.join(name)
}

#[cfg(unix)]
fn lock(p: &PathBuf) {
    use std::os::unix::fs::PermissionsExt;
    let _ = fs::set_permissions(p, fs::Permissions::from_mode(0o600));
}
#[cfg(not(unix))]
fn lock(_p: &PathBuf) {}

#[tauri::command]
fn load_threads(app: AppHandle) -> serde_json::Value {
    fs::read_to_string(cfg(&app, "threads.json"))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!([]))
}

#[tauri::command]
fn save_threads(app: AppHandle, threads: serde_json::Value) -> Result<(), String> {
    let p = cfg(&app, "threads.json");
    fs::write(&p, threads.to_string()).map_err(|e| e.to_string())?;
    lock(&p);
    Ok(())
}

#[tauri::command]
fn load_key(app: AppHandle) -> String {
    fs::read_to_string(cfg(&app, "key")).unwrap_or_default().trim().to_string()
}

#[tauri::command]
fn save_key(app: AppHandle, key: String) -> Result<(), String> {
    let p = cfg(&app, "key");
    fs::write(&p, key.trim()).map_err(|e| e.to_string())?;
    lock(&p);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_threads, save_threads, load_key, save_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
