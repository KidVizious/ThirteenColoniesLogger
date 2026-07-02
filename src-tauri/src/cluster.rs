//! DX Cluster telnet client.
//!
//! Connects to a telnet DX cluster, parses spot lines, and emits
//! `cluster-spot` and `cluster-status` events to the frontend via Tauri.
//! Runs in a background Tokio task so it never blocks the UI thread.

use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::TcpStream;
use tokio::sync::oneshot;
use tokio::time::timeout;

/// A parsed DX spot from the cluster feed.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DxSpot {
    pub spotter: String,
    pub callsign: String,
    pub frequency: f64, // MHz
    pub band: String,
    pub mode: String, // best-guess from frequency
    pub comment: String,
    pub utc_time: String, // ISO 8601
}

/// Connection status sent to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterStatus {
    pub connected: bool,
    pub host: String,
    pub message: String,
}

/// Handle to the running cluster task. Dropping this disconnects it.
pub struct ClusterHandle {
    shutdown_tx: oneshot::Sender<()>,
}

/// Shared state managed by Tauri.
pub struct ClusterState {
    pub handle: Mutex<Option<ClusterHandle>>,
}

impl Default for ClusterState {
    fn default() -> Self {
        Self {
            handle: Mutex::new(None),
        }
    }
}

/// Connect to a DX cluster and start emitting spots.
pub async fn connect(
    app: AppHandle,
    host: String,
    port: u16,
    my_callsign: String,
) -> Result<ClusterHandle, String> {
    let addr = format!("{}:{}", host, port);

    let stream = timeout(Duration::from_secs(10), TcpStream::connect(&addr))
        .await
        .map_err(|_| format!("Connection timed out: {}", addr))?
        .map_err(|e| format!("Failed to connect to {}: {}", addr, e))?;

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

    let host_clone = host.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        run_cluster_session(app_clone, stream, my_callsign, host_clone, shutdown_rx).await;
    });

    // Emit connected status
    let _ = app.emit(
        "cluster-status",
        ClusterStatus {
            connected: true,
            host: host.clone(),
            message: format!("Connected to {}", host),
        },
    );

    Ok(ClusterHandle { shutdown_tx })
}

/// Main cluster session loop — reads lines, parses spots, emits events.
async fn run_cluster_session(
    app: AppHandle,
    stream: TcpStream,
    my_callsign: String,
    host: String,
    mut shutdown_rx: oneshot::Receiver<()>,
) {
    let (reader, mut writer) = stream.into_split();
    let mut lines = BufReader::new(reader).lines();

    // Login — most clusters expect your callsign as the login
    let login = format!("{}\r\n", my_callsign);
    if let Err(e) = writer.write_all(login.as_bytes()).await {
        let _ = app.emit(
            "cluster-status",
            ClusterStatus {
                connected: false,
                host: host.clone(),
                message: format!("Login failed: {}", e),
            },
        );
        return;
    }

    loop {
        tokio::select! {
            _ = &mut shutdown_rx => {
                let _ = app.emit("cluster-status", ClusterStatus {
                    connected: false,
                    host: host.clone(),
                    message: "Disconnected".to_string(),
                });
                break;
            }

            line = lines.next_line() => {
                match line {
                    Ok(Some(raw)) => {
                        if let Some(spot) = parse_spot_line(&raw) {
                            let _ = app.emit("cluster-spot", spot);
                        }
                    }
                    Ok(None) => {
                        // Server closed connection
                        let _ = app.emit("cluster-status", ClusterStatus {
                            connected: false,
                            host: host.clone(),
                            message: "Connection closed by server".to_string(),
                        });
                        break;
                    }
                    Err(e) => {
                        let _ = app.emit("cluster-status", ClusterStatus {
                            connected: false,
                            host: host.clone(),
                            message: format!("Read error: {}", e),
                        });
                        break;
                    }
                }
            }
        }
    }
}

/// Parse a standard DX cluster spot line.
///
/// Standard format:
/// `DX de <spotter>:  <freq>  <callsign>  <comment>  <HH:MMZ>`
///
/// Example:
/// `DX de W1AW:       14225.0  K2A         13 Colonies NY              1423Z`
pub fn parse_spot_line(line: &str) -> Option<DxSpot> {
    // Must start with "DX de "
    if !line.starts_with("DX de ") {
        return None;
    }

    let rest = &line[6..]; // after "DX de "

    // Spotter ends at the colon
    let colon = rest.find(':')?;
    let spotter = rest[..colon].trim().to_uppercase();

    let after_colon = rest[colon + 1..].trim();

    // Split remaining tokens by whitespace
    let tokens: Vec<&str> = after_colon.split_whitespace().collect();
    if tokens.len() < 2 {
        return None;
    }

    // First token is frequency in kHz
    let freq_khz: f64 = tokens[0].parse().ok()?;
    let freq_mhz = freq_khz / 1000.0;

    // Second token is the spotted callsign
    let callsign = tokens[1].to_uppercase();

    // Comment is everything between callsign and trailing time token
    // Last token matching HHMMz pattern is the time
    let time_str = tokens
        .iter()
        .rev()
        .find(|t| is_time_token(t))
        .copied()
        .unwrap_or("");

    let comment_tokens: Vec<&str> = tokens[2..]
        .iter()
        .filter(|t| !is_time_token(t))
        .copied()
        .collect();
    let comment = comment_tokens.join(" ");

    let band = freq_to_band(freq_mhz);
    let mode = guess_mode_from_freq(freq_mhz, &comment);

    let utc_time = parse_cluster_time(time_str);

    Some(DxSpot {
        spotter,
        callsign,
        frequency: freq_mhz,
        band,
        mode,
        comment,
        utc_time,
    })
}

fn is_time_token(s: &str) -> bool {
    // Matches HHMMz or HHMM format (4 digits + optional Z)
    let s = s.trim_end_matches('z').trim_end_matches('Z');
    s.len() == 4 && s.chars().all(|c| c.is_ascii_digit())
}

fn parse_cluster_time(token: &str) -> String {
    // "1423Z" → today's date + 14:23:00 UTC
    let digits = token.trim_end_matches(|c: char| !c.is_ascii_digit());
    if digits.len() >= 4 {
        let hh = &digits[..2];
        let mm = &digits[2..4];
        let today = chrono::Utc::now();
        return format!(
            "{}-{:02}-{:02}T{}:{}:00Z",
            today.format("%Y"),
            today.format("%m"),
            today.format("%d"),
            hh,
            mm
        );
    }
    chrono::Utc::now().to_rfc3339()
}

fn freq_to_band(mhz: f64) -> String {
    match mhz {
        f if f >= 1.8 && f <= 2.0 => "160m",
        f if f >= 3.5 && f <= 4.0 => "80m",
        f if f >= 7.0 && f <= 7.3 => "40m",
        f if f >= 10.1 && f <= 10.15 => "30m",
        f if f >= 14.0 && f <= 14.35 => "20m",
        f if f >= 18.068 && f <= 18.168 => "17m",
        f if f >= 21.0 && f <= 21.45 => "15m",
        f if f >= 24.89 && f <= 24.99 => "12m",
        f if f >= 28.0 && f <= 29.7 => "10m",
        f if f >= 50.0 && f <= 54.0 => "6m",
        f if f >= 144.0 && f <= 148.0 => "2m",
        _ => "?",
    }
    .to_string()
}

/// Best-effort mode guess from frequency and comment.
fn guess_mode_from_freq(mhz: f64, comment: &str) -> String {
    let comment_upper = comment.to_uppercase();

    // Explicit mode in comment takes precedence
    if comment_upper.contains("FT8") { return "FT8".to_string(); }
    if comment_upper.contains("FT4") { return "FT4".to_string(); }
    if comment_upper.contains("CW") { return "CW".to_string(); }
    if comment_upper.contains("RTTY") { return "RTTY".to_string(); }
    if comment_upper.contains("SSB") || comment_upper.contains("LSB") || comment_upper.contains("USB") {
        return "SSB".to_string();
    }
    if comment_upper.contains("DIGI") || comment_upper.contains("DIGITAL") {
        return "DIG".to_string();
    }

    // Infer from well-known digital sub-bands (kHz)
    let khz = mhz * 1000.0;
    match khz {
        // FT8 sub-bands (USB dial)
        f if (f - 1840.0).abs() < 3.0 => "FT8",
        f if (f - 3573.0).abs() < 3.0 => "FT8",
        f if (f - 7074.0).abs() < 3.0 => "FT8",
        f if (f - 10136.0).abs() < 3.0 => "FT8",
        f if (f - 14074.0).abs() < 3.0 => "FT8",
        f if (f - 18100.0).abs() < 3.0 => "FT8",
        f if (f - 21074.0).abs() < 3.0 => "FT8",
        f if (f - 24915.0).abs() < 3.0 => "FT8",
        f if (f - 28074.0).abs() < 3.0 => "FT8",
        f if (f - 50313.0).abs() < 3.0 => "FT8",
        // FT4
        f if (f - 7047.5).abs() < 2.0 => "FT4",
        f if (f - 14080.0).abs() < 2.0 => "FT4",
        f if (f - 21140.0).abs() < 2.0 => "FT4",
        // CW portions (bottom of each band)
        f if f >= 1800.0 && f <= 1840.0 => "CW",
        f if f >= 3500.0 && f <= 3600.0 => "CW",
        f if f >= 7000.0 && f <= 7040.0 => "CW",
        f if f >= 14000.0 && f <= 14070.0 => "CW",
        f if f >= 21000.0 && f <= 21070.0 => "CW",
        f if f >= 28000.0 && f <= 28070.0 => "CW",
        _ => "SSB",
    }
    .to_string()
}

impl ClusterHandle {
    pub fn disconnect(self) {
        let _ = self.shutdown_tx.send(());
    }
}
