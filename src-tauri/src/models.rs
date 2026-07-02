//! Data models shared between the database layer and Tauri commands.

use serde::{Deserialize, Serialize};

/// Represents a year's event log.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLog {
    pub year: i32,
    pub created_at: String,
    pub notes: String,
}

/// A single QSO record.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QsoRecord {
    pub id: String,
    pub year: i32,
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

/// Application settings (serialized as JSON for complex values).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub my_callsign: String,
    pub my_name: String,
    pub my_qth: String,
    pub default_mode: String,
    pub default_rst: String,
    pub theme: String,
    pub active_year: i32,
    pub cluster_enabled: String,
    pub cluster_host: String,
    pub cluster_port: String,
    pub spot_window_mins: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            my_callsign: String::new(),
            my_name: String::new(),
            my_qth: String::new(),
            default_mode: "SSB".to_string(),
            default_rst: "59".to_string(),
            theme: "dark".to_string(),
            active_year: chrono::Utc::now().year(),
            cluster_enabled: "false".to_string(),
            cluster_host: "dxc.ve7cc.net".to_string(),
            cluster_port: "23".to_string(),
            spot_window_mins: "30".to_string(),
        }
    }
}

// Helper to get current year
use chrono::Datelike;
