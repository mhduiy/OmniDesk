pub mod display;

use display::DisplayBackend;
use tauri::{Manager, Emitter};
use sysinfo::System;
use std::time::Duration;
use serde::Serialize;
use std::path::PathBuf;

#[derive(Clone, Serialize)]
struct SysInfoPayload {
    cpu_usage: f32,
    mem_usage: f32,
}

#[tauri::command]
fn save_layout(app_handle: tauri::AppHandle, layout: serde_json::Value) -> Result<(), String> {
    let path = app_handle.path().app_data_dir().unwrap_or_default().join("layout.json");
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, serde_json::to_string_pretty(&layout).unwrap())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn load_layout(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let path = app_handle.path().app_data_dir().unwrap_or_default().join("layout.json");
    if let Ok(content) = std::fs::read_to_string(path) {
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        Ok(serde_json::json!(null))
    }
}

#[tauri::command]
fn widget_write_file(app_handle: tauri::AppHandle, filename: String, content: String) -> Result<(), String> {
    let path = app_handle.path().app_data_dir().unwrap_or_default().join("widget_data").join(&filename);
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn widget_read_file(app_handle: tauri::AppHandle, filename: String) -> Result<String, String> {
    let path = app_handle.path().app_data_dir().unwrap_or_default().join("widget_data").join(&filename);
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_url(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    app_handle.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
async fn fetch_proxy(url: String, token: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut req = client.get(&url).header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    if let Some(t) = token {
        if !t.is_empty() {
            req = req.header("Authorization", format!("Bearer {}", t));
        }
    }
    req.send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn check_and_cache_video(app_handle: tauri::AppHandle, url: String, filename: String) -> Result<Option<String>, String> {
    let path = app_handle.path().app_data_dir().unwrap_or_default().join("wallpapers").join(&filename);
    if path.exists() {
        return Ok(Some(path.to_string_lossy().to_string()));
    }

    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    
    let tmp_path = path.with_extension("tmp");
    if tmp_path.exists() {
        return Ok(None);
    }

    tauri::async_runtime::spawn(async move {
        let _ = std::fs::write(&tmp_path, b""); 
        if let Ok(resp) = reqwest::get(&url).await {
            if let Ok(bytes) = resp.bytes().await {
                if std::fs::write(&tmp_path, bytes).is_ok() {
                    let _ = std::fs::rename(&tmp_path, &path);
                } else {
                    let _ = std::fs::remove_file(&tmp_path);
                }
            } else {
                let _ = std::fs::remove_file(&tmp_path);
            }
        } else {
            let _ = std::fs::remove_file(&tmp_path);
        }
    });

    Ok(None)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_layout, load_layout, widget_read_file, widget_write_file, open_url, fetch_proxy, check_and_cache_video
        ])
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Some(_window) = app.get_webview_window("main") {
                // [DEBUG MODE]: 用户要求先作为普通窗口调试，暂不注入 _NET_WM_WINDOW_TYPE_DESKTOP
                /*
                #[cfg(target_os = "linux")]
                {
                    let backend = display::x11::X11Backend;
                    if let Err(e) = backend.mount_to_desktop(&_window) {
                        eprintln!("Failed to mount to desktop: {}", e);
                    }
                }
                */
            }

            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut sys = System::new_all();
                sys.refresh_all();
                // 启动时稍作延迟，确保 CPU 测算有基准数据
                std::thread::sleep(Duration::from_millis(500));

                loop {
                    sys.refresh_cpu_usage();
                    sys.refresh_memory();

                    let cpu_usage = sys.global_cpu_usage();
                    let total_mem = sys.total_memory();
                    let used_mem = sys.used_memory();
                    let mem_usage = if total_mem > 0 {
                        (used_mem as f32 / total_mem as f32) * 100.0
                    } else {
                        0.0
                    };

                    let payload = SysInfoPayload {
                        cpu_usage,
                        mem_usage,
                    };

                    // 广播给前端
                    let _ = app_handle.emit("sysinfo_update", payload);
                    std::thread::sleep(Duration::from_secs(1));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
