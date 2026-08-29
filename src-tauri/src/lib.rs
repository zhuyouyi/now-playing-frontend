use std::net::TcpStream;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};

/// 后端(Java)启动器所在. exe 名
const LAUNCHER: &str = "NowPlayingService.exe";

fn backend_ready() -> bool {
    "127.0.0.1:9863"
        .parse::<std::net::SocketAddr>()
        .ok()
        .map(|addr| TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok())
        .unwrap_or(false)
}

/// 显示主窗口并跳到指定前端路由
fn show_and_navigate(app: &tauri::AppHandle, route: &str) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.set_focus();
        // 前端使用 BrowserRouter（路径式路由），直接设置 location 即可
        let _ = w.eval(&format!("window.location.href = '{}';", route));
    }
}

fn ensure_backend_running(app: &tauri::AppHandle) -> Option<u32> {
    if backend_ready() {
        return None;
    }
    let dir = app.path().resource_dir().ok()?;
    let svc = dir.join(LAUNCHER);
    if !svc.exists() {
        return None;
    }
    let pid = std::process::Command::new(svc).spawn().ok()?.id();
    Some(pid)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // 启动后端启动器，并把它作为 java 的父进程记录下来，退出时可连带杀掉
            let backend_pid: Option<u32> = ensure_backend_running(app.handle());
            app.manage(Mutex::new(backend_pid));

            // 托盘图标 + 右键菜单（与作者桌面组件设置示意图一致）
            let home = MenuItem::with_id(app, "home", "主页", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
            let about = MenuItem::with_id(app, "about", "关于", true, None::<&str>)?;
            let player = MenuItem::with_id(app, "player", "播放器", true, None::<&str>)?;
            let desktop = MenuItem::with_id(app, "desktop", "桌面组件设置", true, None::<&str>)?;
            let restart = MenuItem::with_id(app, "restart", "重新启动", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&home, &settings, &about, &player, &desktop, &restart, &quit])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "home" => show_and_navigate(app, "http://localhost:9863/"),
                    "settings" => show_and_navigate(app, "http://localhost:9863/settings/general"),
                    "about" => show_and_navigate(app, "http://localhost:9863/about"),
                    "player" => show_and_navigate(app, "http://localhost:9863/player"),
                    "desktop" => show_and_navigate(app, "http://localhost:9863/settings/desktop"),
                    "restart" => {
                        // 重新启动：杀掉后端再拉起，并等待就绪
                        kill_backend(app);
                        let handle = app.handle().clone();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show();
                        }
                        thread::spawn(move || {
                            let _ = ensure_backend_running(&handle);
                            for _ in 0..40 {
                                if backend_ready() {
                                    break;
                                }
                                thread::sleep(Duration::from_millis(500));
                            }
                            if let Some(w) = handle.get_webview_window("main") {
                                let _ = w.eval("window.location.reload()");
                            }
                        });
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
                        thread::sleep(Duration::from_millis(1200));
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
            // 点“关闭/叉” → 最小化到托盘（不退出、不杀后端）
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
