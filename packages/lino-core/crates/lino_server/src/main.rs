use lino_core::{FileCache, FileWatcher, NoAnyTypeRule, Scanner};
use serde::{Deserialize, Serialize};
use std::io::{self, BufRead, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tracing::{error, info};
use tracing_subscriber;

#[derive(Debug, Deserialize)]
struct Request {
    id: u64,
    method: String,
    params: serde_json::Value,
}

#[derive(Debug, Serialize)]
struct Response {
    id: u64,
    result: Option<serde_json::Value>,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct Notification {
    method: String,
    params: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct ScanParams {
    root: PathBuf,
}

#[derive(Debug, Deserialize)]
struct WatchParams {
    root: PathBuf,
}

struct ServerState {
    scanner: Option<Scanner>,
    watcher: Option<FileWatcher>,
    cache: Arc<FileCache>,
}

impl ServerState {
    fn new() -> Self {
        Self {
            scanner: None,
            watcher: None,
            cache: Arc::new(FileCache::new()),
        }
    }
}

fn main() {
    tracing_subscriber::fmt()
        .with_writer(io::stderr)
        .with_max_level(tracing::Level::INFO)
        .init();

    info!("Lino server started");

    let mut state = ServerState::new();
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                error!("Failed to read line: {}", e);
                continue;
            }
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: Request = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                error!("Failed to parse request: {}", e);
                continue;
            }
        };

        let response = handle_request(request, &mut state);

        if let Ok(json) = serde_json::to_string(&response) {
            if let Err(e) = writeln!(stdout, "{}", json) {
                error!("Failed to write response: {}", e);
            }
            if let Err(e) = stdout.flush() {
                error!("Failed to flush stdout: {}", e);
            }
        }

        if let Some(watcher) = &state.watcher {
            while let Some(event) = watcher.try_recv() {
                info!("File event: {:?}", event);

                use lino_core::watcher::FileEvent;
                match event {
                    FileEvent::Modified(path) | FileEvent::Created(path) => {
                        if let Some(scanner) = &state.scanner {
                            if let Some(result) = scanner.scan_single(&path) {
                                let notification = Notification {
                                    method: "file_updated".to_string(),
                                    params: serde_json::to_value(&result).unwrap(),
                                };
                                if let Ok(json) = serde_json::to_string(&notification) {
                                    let _ = writeln!(stdout, "{}", json);
                                    let _ = stdout.flush();
                                }
                            }
                        }
                    }
                    FileEvent::Removed(path) => {
                        state.cache.invalidate(&path);
                    }
                }
            }
        }
    }
}

fn handle_request(request: Request, state: &mut ServerState) -> Response {
    match request.method.as_str() {
        "scan" => {
            let params: ScanParams = match serde_json::from_value(request.params) {
                Ok(p) => p,
                Err(e) => {
                    return Response {
                        id: request.id,
                        result: None,
                        error: Some(format!("Invalid params: {}", e)),
                    }
                }
            };

            info!("Scanning workspace: {:?}", params.root);

            let scanner = Scanner::with_cache(
                vec![Box::new(NoAnyTypeRule)],
                state.cache.clone(),
            );
            let result = scanner.scan(&params.root);

            state.scanner = Some(scanner);

            Response {
                id: request.id,
                result: Some(serde_json::to_value(&result).unwrap()),
                error: None,
            }
        }
        "watch" => {
            let params: WatchParams = match serde_json::from_value(request.params) {
                Ok(p) => p,
                Err(e) => {
                    return Response {
                        id: request.id,
                        result: None,
                        error: Some(format!("Invalid params: {}", e)),
                    }
                }
            };

            info!("Starting file watcher: {:?}", params.root);

            match FileWatcher::new(&params.root) {
                Ok(watcher) => {
                    state.watcher = Some(watcher);
                    Response {
                        id: request.id,
                        result: Some(serde_json::json!({"status": "watching"})),
                        error: None,
                    }
                }
                Err(e) => Response {
                    id: request.id,
                    result: None,
                    error: Some(format!("Failed to start watcher: {}", e)),
                },
            }
        }
        _ => Response {
            id: request.id,
            result: None,
            error: Some(format!("Unknown method: {}", request.method)),
        },
    }
}
