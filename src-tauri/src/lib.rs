use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 自动拉起同目录的后端启动器（作者壳原本也是这么做）
            if let Ok(dir) = app.path().resource_dir() {
                let svc = dir.join("NowPlayingService.exe");
                if svc.exists() {
                    let _ = std::process::Command::new(svc).spawn();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
