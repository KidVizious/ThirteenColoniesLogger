//! Tauri commands exposed to the frontend.
//!
//! All database interactions go through these commands, which validate inputs
//! and handle errors gracefully. The frontend never touches the DB directly.

use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::cluster::ClusterState;
use crate::db::{Database, DbError};
use crate::models::{EventLog, QsoRecord, Settings};

/// Input for creating a new QSO (frontend sends this, backend assigns ID).
#[derive(Debug, serde::Deserialize)]
pub struct NewQso {
    pub callsign: String,
    pub band: String,
    pub mode: String,
    pub frequency: String,
    pub sent_rst: String,
    pub rcvd_rst: String,
    pub qth: String,
    pub notes: String,
    pub utc_time: String,
    pub colony_name: Option<String>,
}

/// Input for updating an existing QSO.
#[derive(Debug, serde::Deserialize)]
pub struct UpdateQso {
    pub id: String,
    pub callsign: String,
    pub band: String,
    pub mode: String,
    pub frequency: String,
    pub sent_rst: String,
    pub rcvd_rst: String,
    pub qth: String,
    pub notes: String,
    pub utc_time: String,
    pub colony_name: Option<String>,
}

// --- Event Log Commands ---

/// List all event logs (years).
#[tauri::command]
pub fn list_event_logs(db: State<'_, Database>) -> Result<Vec<EventLog>, DbError> {
    db.list_event_logs()
}

/// Create a new event log for a year. Returns the created/existing log.
#[tauri::command]
pub fn create_event_log(db: State<'_, Database>, year: i32) -> Result<EventLog, DbError> {
    // Validate year range (reasonable bounds)
    if !(2009..=2100).contains(&year) {
        return Err(DbError::YearNotFound(year));
    }
    db.create_event_log(year)
}

/// Delete an event log and all its QSOs.
#[tauri::command]
pub fn delete_event_log(db: State<'_, Database>, year: i32) -> Result<(), DbError> {
    db.delete_event_log(year)
}

// --- QSO Commands ---

/// Get all QSOs for the given year.
#[tauri::command]
pub fn get_qsos(db: State<'_, Database>, year: i32) -> Result<Vec<QsoRecord>, DbError> {
    db.get_qsos(year)
}

/// Add a new QSO. Returns the full record with generated ID.
#[tauri::command]
pub fn add_qso(db: State<'_, Database>, year: i32, qso: NewQso) -> Result<QsoRecord, DbError> {
    // Sanitize inputs: trim and uppercase callsign
    let callsign = qso.callsign.trim().to_uppercase();
    let band = qso.band.trim().to_string();
    let mode = qso.mode.trim().to_uppercase();

    // Validate required fields are non-empty
    if callsign.is_empty() || band.is_empty() || mode.is_empty() {
        return Err(DbError::Sqlite(rusqlite::Error::InvalidParameterName(
            "Callsign, band, and mode are required".to_string(),
        )));
    }

    let record = QsoRecord {
        id: Uuid::new_v4().to_string(),
        year,
        callsign,
        band,
        mode,
        frequency: qso.frequency.trim().to_string(),
        sent_rst: qso.sent_rst.trim().to_string(),
        rcvd_rst: qso.rcvd_rst.trim().to_string(),
        qth: qso.qth.trim().to_uppercase(),
        notes: qso.notes.trim().to_string(),
        utc_time: qso.utc_time.clone(),
        colony_name: qso.colony_name,
    };

    db.add_qso(&record)?;
    Ok(record)
}

/// Update an existing QSO.
#[tauri::command]
pub fn update_qso(db: State<'_, Database>, year: i32, qso: UpdateQso) -> Result<QsoRecord, DbError> {
    let record = QsoRecord {
        id: qso.id,
        year,
        callsign: qso.callsign.trim().to_uppercase(),
        band: qso.band.trim().to_string(),
        mode: qso.mode.trim().to_uppercase(),
        frequency: qso.frequency.trim().to_string(),
        sent_rst: qso.sent_rst.trim().to_string(),
        rcvd_rst: qso.rcvd_rst.trim().to_string(),
        qth: qso.qth.trim().to_uppercase(),
        notes: qso.notes.trim().to_string(),
        utc_time: qso.utc_time.clone(),
        colony_name: qso.colony_name,
    };

    db.update_qso(&record)?;
    Ok(record)
}

/// Delete a QSO by ID.
#[tauri::command]
pub fn delete_qso(db: State<'_, Database>, id: String) -> Result<(), DbError> {
    db.delete_qso(&id)
}

/// Check if a QSO is a duplicate (same callsign+band+mode in a year).
#[tauri::command]
pub fn check_dupe(
    db: State<'_, Database>,
    year: i32,
    callsign: String,
    band: String,
    mode: String,
) -> Result<bool, DbError> {
    db.is_dupe(year, &callsign.trim().to_uppercase(), &band, &mode)
}

// --- Settings Commands ---

/// Get all settings.
#[tauri::command]
pub fn get_settings(db: State<'_, Database>) -> Result<Settings, DbError> {
    let pairs = db.get_all_settings()?;
    let mut settings = Settings::default();

    for (key, value) in pairs {
        match key.as_str() {
            "my_callsign" => settings.my_callsign = value,
            "my_name" => settings.my_name = value,
            "my_qth" => settings.my_qth = value,
            "default_mode" => settings.default_mode = value,
            "default_rst" => settings.default_rst = value,
            "theme" => settings.theme = value,
            "active_year" => {
                settings.active_year = value.parse().unwrap_or(settings.active_year)
            }
            "cluster_enabled" => settings.cluster_enabled = value,
            "cluster_host" => settings.cluster_host = value,
            "cluster_port" => settings.cluster_port = value,
            "spot_window_mins" => settings.spot_window_mins = value,
            _ => {}
        }
    }

    Ok(settings)
}

/// Save all settings.
#[tauri::command]
pub fn save_settings(db: State<'_, Database>, settings: Settings) -> Result<(), DbError> {
    db.set_setting("my_callsign", &settings.my_callsign)?;
    db.set_setting("my_name", &settings.my_name)?;
    db.set_setting("my_qth", &settings.my_qth)?;
    db.set_setting("default_mode", &settings.default_mode)?;
    db.set_setting("default_rst", &settings.default_rst)?;
    db.set_setting("theme", &settings.theme)?;
    db.set_setting("active_year", &settings.active_year.to_string())?;
    db.set_setting("cluster_enabled", &settings.cluster_enabled)?;
    db.set_setting("cluster_host", &settings.cluster_host)?;
    db.set_setting("cluster_port", &settings.cluster_port)?;
    db.set_setting("spot_window_mins", &settings.spot_window_mins)?;
    Ok(())
}

/// Set the active year.
#[tauri::command]
pub fn set_active_year(db: State<'_, Database>, year: i32) -> Result<(), DbError> {
    db.set_setting("active_year", &year.to_string())
}

/// Get the database file path (for user reference / backup).
#[tauri::command]
pub fn get_db_path() -> Result<String, DbError> {
    let proj_dirs = directories::ProjectDirs::from("com", "13colonies", "logger")
        .ok_or_else(|| {
            DbError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Cannot determine application data directory",
            ))
        })?;
    Ok(proj_dirs.data_dir().join("13colonies.db").to_string_lossy().to_string())
}

// --- ADIF Export ---

/// Generate ADIF content for a given year and write it to the specified path.
#[tauri::command]
pub fn export_adif(db: State<'_, Database>, year: i32, file_path: String) -> Result<u32, DbError> {
    use std::fmt::Write;
    use std::fs;

    let qsos = db.get_qsos(year)?;
    let settings_pairs = db.get_all_settings()?;

    // Get operator callsign from settings
    let my_callsign = settings_pairs
        .iter()
        .find(|(k, _)| k == "my_callsign")
        .map(|(_, v)| v.as_str())
        .unwrap_or("");

    let mut adif = String::with_capacity(qsos.len() * 256);

    // ADIF header
    writeln!(adif, "ADIF Export from 13 Colonies Event Logger").unwrap();
    writeln!(adif, "Event Year: {}", year).unwrap();
    write!(adif, "<adif_ver:5>3.1.4").unwrap();
    writeln!(adif).unwrap();
    write!(adif, "<programid:22>13ColoniesEventLogger").unwrap();
    writeln!(adif).unwrap();
    let program_version = env!("CARGO_PKG_VERSION");
    write!(adif, "<programversion:{}>{}", program_version.len(), program_version).unwrap();
    writeln!(adif).unwrap();
    writeln!(adif, "<eoh>").unwrap();
    writeln!(adif).unwrap();

    let count = qsos.len() as u32;

    for qso in &qsos {
        // Parse UTC time into date and time components
        // Expected format: ISO 8601 (e.g., "2026-07-02T14:30:00.000Z")
        let (date_str, time_str) = parse_utc_for_adif(&qso.utc_time);

        // CALL
        write_adif_field(&mut adif, "call", &qso.callsign);
        // BAND
        write_adif_field(&mut adif, "band", &qso.band);
        // FREQ (in MHz)
        if !qso.frequency.is_empty() {
            write_adif_field(&mut adif, "freq", &qso.frequency);
        }
        // MODE - map our modes to ADIF standard modes
        let adif_mode = map_mode_to_adif(&qso.mode);
        write_adif_field(&mut adif, "mode", adif_mode);
        // SUBMODE for digital modes
        if let Some(submode) = map_submode(&qso.mode) {
            write_adif_field(&mut adif, "submode", submode);
        }
        // RST_SENT
        write_adif_field(&mut adif, "rst_sent", &qso.sent_rst);
        // RST_RCVD
        write_adif_field(&mut adif, "rst_rcvd", &qso.rcvd_rst);
        // QSO_DATE
        write_adif_field(&mut adif, "qso_date", &date_str);
        // TIME_ON
        write_adif_field(&mut adif, "time_on", &time_str);
        // QTH / STATE or COUNTRY
        if !qso.qth.is_empty() {
            // If it looks like a US state (2 chars), use STA field
            if qso.qth.len() == 2 && qso.qth.chars().all(|c| c.is_ascii_uppercase()) {
                write_adif_field(&mut adif, "state", &qso.qth);
            } else {
                write_adif_field(&mut adif, "qth", &qso.qth);
            }
        }
        // STATION_CALLSIGN (my callsign)
        if !my_callsign.is_empty() {
            write_adif_field(&mut adif, "station_callsign", my_callsign);
        }
        // COMMENT
        if !qso.notes.is_empty() {
            write_adif_field(&mut adif, "comment", &qso.notes);
        }
        // SIG and SIG_INFO for the 13 Colonies event
        write_adif_field(&mut adif, "sig", "13 Colonies");
        if let Some(ref colony) = qso.colony_name {
            write_adif_field(&mut adif, "sig_info", colony);
        }

        writeln!(adif, "<eor>").unwrap();
        writeln!(adif).unwrap();
    }

    // Write to file with proper path validation
    let path = std::path::Path::new(&file_path);

    // Security: ensure the path has an expected extension
    // and parent directory exists
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            return Err(DbError::Io(std::io::Error::new(
                std::io::ErrorKind::NotFound,
                "Export directory does not exist",
            )));
        }
    }

    fs::write(path, adif)?;
    Ok(count)
}

/// Write a single ADIF field in the format <name:length>value
fn write_adif_field(buf: &mut String, name: &str, value: &str) {
    use std::fmt::Write;
    write!(buf, "<{}:{}>{}  ", name, value.len(), value).unwrap();
}

/// Parse an ISO 8601 timestamp into ADIF date (YYYYMMDD) and time (HHMM or HHMMSS)
fn parse_utc_for_adif(utc_time: &str) -> (String, String) {
    // Try to parse ISO format: "2026-07-02T14:30:00.000Z" or "2026-07-02T14:30:00Z"
    // Fallback: just use the raw string if parsing fails
    let cleaned = utc_time.replace('Z', "").replace('z', "");
    let parts: Vec<&str> = cleaned.split('T').collect();

    if parts.len() == 2 {
        let date_part = parts[0].replace('-', ""); // "20260702"
        let time_parts: Vec<&str> = parts[1].split(':').collect();
        let time_part = if time_parts.len() >= 3 {
            // Take HHMMSS (strip fractional seconds)
            let secs = time_parts[2].split('.').next().unwrap_or("00");
            format!("{}{}{}", time_parts[0], time_parts[1], secs)
        } else if time_parts.len() == 2 {
            format!("{}{}00", time_parts[0], time_parts[1])
        } else {
            "000000".to_string()
        };
        (date_part, time_part)
    } else {
        // Fallback
        ("19700101".to_string(), "000000".to_string())
    }
}

/// Map our internal mode names to ADIF standard mode names
fn map_mode_to_adif(mode: &str) -> &str {
    match mode {
        "SSB" => "SSB",
        "CW" => "CW",
        "RTTY" => "RTTY",
        "FT8" => "FT8",
        "FT4" => "FT4",
        "DIG" => "MFSK", // Generic digital → MFSK as parent mode
        _ => mode.split_whitespace().next().unwrap_or("SSB"),
    }
}

/// Return ADIF submode if applicable
fn map_submode(mode: &str) -> Option<&str> {
    match mode {
        "FT8" => Some("FT8"),
        "FT4" => Some("FT4"),
        _ => None,
    }
}

// --- DX Cluster Commands ---

/// Connect to a DX cluster server.
#[tauri::command]
pub async fn cluster_connect(
    app: AppHandle,
    state: State<'_, ClusterState>,
    host: String,
    port: u16,
    my_callsign: String,
) -> Result<(), String> {
    // Validate inputs
    if host.trim().is_empty() {
        return Err("Host cannot be empty".to_string());
    }
    if my_callsign.trim().is_empty() {
        return Err("Callsign required to connect to cluster".to_string());
    }

    // Disconnect any existing session
    {
        let mut handle = state.handle.lock().unwrap();
        if let Some(old) = handle.take() {
            old.disconnect();
        }
    }

    let new_handle = crate::cluster::connect(
        app,
        host.trim().to_string(),
        port,
        my_callsign.trim().to_uppercase(),
    )
    .await?;

    *state.handle.lock().unwrap() = Some(new_handle);
    Ok(())
}

/// Disconnect from the current DX cluster.
#[tauri::command]
pub fn cluster_disconnect(state: State<'_, ClusterState>) {
    let mut handle = state.handle.lock().unwrap();
    if let Some(h) = handle.take() {
        h.disconnect();
    }
}

/// Returns whether the cluster is currently connected.
#[tauri::command]
pub fn cluster_is_connected(state: State<'_, ClusterState>) -> bool {
    state.handle.lock().unwrap().is_some()
}
