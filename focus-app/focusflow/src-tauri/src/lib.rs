// FocusFlow — Tauri core.
//   pin_window(on)         — keep the window above other apps while running
//   alert_window()         — un-minimize, focus, flash the taskbar at time's up
//   login_via_dashboard()  — loopback OAuth-style login: open the dashboard
//                            authorize page in the browser, run a one-shot
//                            127.0.0.1 server, and return the minted api key
use std::time::Duration;

use tauri::{AppHandle, UserAttentionType, WebviewWindow};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
fn pin_window(window: WebviewWindow, on: bool) {
    let _ = window.set_always_on_top(on);
}

#[tauri::command]
fn alert_window(window: WebviewWindow) {
    let _ = window.unminimize();
    let _ = window.set_focus();
    let _ = window.request_user_attention(Some(UserAttentionType::Critical));
}

/// Pull `token` and `state` out of a `/callback?token=…&state=…` request path.
/// Both values are URL-safe (base64url key, uuid state) so no percent-decoding
/// is needed.
fn parse_callback(path: &str) -> (Option<String>, Option<String>) {
    let query = match path.splitn(2, '?').nth(1) {
        Some(q) => q,
        None => return (None, None),
    };
    let mut token = None;
    let mut state = None;
    for pair in query.split('&') {
        let mut kv = pair.splitn(2, '=');
        let key = kv.next().unwrap_or("");
        let value = kv.next().unwrap_or("").to_string();
        match key {
            "token" => token = Some(value),
            "state" => state = Some(value),
            _ => {}
        }
    }
    (token, state)
}

const OK_PAGE: &str = "<!doctype html><meta charset=utf-8><title>FocusFlow</title>\
<body style=\"font-family:system-ui;background:#080808;color:#ededed;display:grid;place-items:center;height:100vh;margin:0\">\
<div style=\"text-align:center\"><h2 style=\"color:#baff04\">Connected \u{2713}</h2>\
<p>You can close this tab and return to FocusFlow.</p></div>";

const ERR_PAGE: &str = "<!doctype html><meta charset=utf-8><title>FocusFlow</title>\
<body style=\"font-family:system-ui;background:#080808;color:#ededed;display:grid;place-items:center;height:100vh;margin:0\">\
<div style=\"text-align:center\"><h2 style=\"color:#ef4444\">Connection failed</h2>\
<p>Please return to FocusFlow and try again.</p></div>";

#[tauri::command]
async fn login_via_dashboard(
    app: AppHandle,
    dashboard_url: String,
    state: String,
) -> Result<String, String> {
    // Bind a loopback server on a random free port first, so the redirect_uri
    // we hand the dashboard points back at us.
    let server = tiny_http::Server::http("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = server
        .server_addr()
        .to_ip()
        .map(|addr| addr.port())
        .ok_or_else(|| "could not resolve callback port".to_string())?;

    let base = dashboard_url.trim_end_matches('/');
    let auth_url = format!(
        "{base}/connect/desktop?redirect_uri=http://127.0.0.1:{port}/callback&state={state}"
    );
    app.opener()
        .open_url(auth_url, None::<&str>)
        .map_err(|e| e.to_string())?;

    // Accept exactly one /callback request on a background thread; hand the
    // result to the async task via a oneshot channel.
    let expected = state.clone();
    let (tx, rx) = tokio::sync::oneshot::channel::<Result<String, String>>();
    std::thread::spawn(move || {
        for request in server.incoming_requests() {
            let path = request.url().to_string();
            if !path.starts_with("/callback") {
                let _ = request.respond(tiny_http::Response::empty(404));
                continue;
            }
            let (token, ret_state) = parse_callback(&path);
            let matched = token.is_some() && ret_state.as_deref() == Some(expected.as_str());
            let body = if matched { OK_PAGE } else { ERR_PAGE };
            let header = tiny_http::Header::from_bytes(
                &b"Content-Type"[..],
                &b"text/html; charset=utf-8"[..],
            )
            .expect("valid header");
            let _ = request.respond(tiny_http::Response::from_string(body).with_header(header));
            let result = match token {
                Some(t) if matched => Ok(t),
                _ => Err("callback validation failed".to_string()),
            };
            let _ = tx.send(result);
            return;
        }
        let _ = tx.send(Err("callback server closed".to_string()));
    });

    match tokio::time::timeout(Duration::from_secs(300), rx).await {
        Ok(Ok(result)) => result,
        Ok(Err(_)) => Err("login canceled".to_string()),
        Err(_) => Err("login timed out — please try again".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            pin_window,
            alert_window,
            login_via_dashboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
