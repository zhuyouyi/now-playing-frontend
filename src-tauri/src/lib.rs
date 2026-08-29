use std::net::TcpStream;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

fn backend_ready() -> bool {
    "127.0.0.1:9863"
        .parse::<std::net::SocketAddr>()
        .ok()
        .map(|addr| TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok())
        .unwrap_or(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 启动后端启动器，并记住它的 PID（作为 java 的父进程，退出时可连带杀掉）
            let mut backend_pid: Option<u32> = None;
            if let Ok(dir) = app.path().resource_dir() {
                let svc = dir.join("NowPlayingService.exe");
                if svc.exists() {
                    if let Ok(child) = std::process::Command::new(svc).spawn() {
                        backend_pid = Some(child.id());
                    }
                }
            }
            app.manage(Mutex::new(backend_pid));

            // 托盘图标 + 右键菜单（打开主界面 / 退出并杀掉后端）
            let show = MenuItem::with_id(app, "show", "打开主界面", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    "quit" => {
                        kill_backend(app);
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // 等后端就绪后再显示窗口，避免 WebView 出现“拒绝访问”
            let handle = app.handle().clone();
            thread::spawn(move || {
                let mut shown = false;
                for _ in 0..80 {
                    if backend_ready() {
                        thread::sleep(Duration::from_millis(1500));
                        if let Some(w) = handle.get_webview_window("main") {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.eval("window.location.reload()");
                            shown = true;
                        }
                        break;
                    }
                    thread::sleep(Duration::from_millis(500));
                }
                if !shown {
                    if let Some(w) = handle.get_webview_window("main") {
                        let _ = w.show();
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // 点“关闭”按钮 → 最小化到托盘（不退出、不杀后端）
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn kill_backend(app: &tauri::AppHandle) {
    let state = app.state::<Mutex<Option<u32>>>();
    let pid = state.lock().unwrap().take();
    if let Some(pid) = pid {
        let _ = std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/T", "/F"])
            .spawn();
    }
}
