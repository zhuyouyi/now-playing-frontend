use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 启动后端（优先 NowPlayingService.exe，否则尝试 start-backend.bat）
            if let Ok(exe_dir) = app.path().app_dir() {
                let svc = exe_dir.join("NowPlayingService.exe");
                if svc.exists() {
                    let _ = std::process::Command::new(svc).spawn();
                } else {
                    let bat = exe_dir.join("start-backend.bat");
                    if bat.exists() {
                        let _ = std::process::Command::new("cmd")
                            .args(["/c", &bat.to_string_lossy()])
                            .spawn();
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
