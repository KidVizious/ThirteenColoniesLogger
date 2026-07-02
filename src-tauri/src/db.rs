//! SQLite database layer for the 13 Colonies Event Logger.
//!
//! Architecture: A single SQLite database file stored in the OS-appropriate
//! application data directory. Event logs are separated by year within
//! the same database using a `year` column, enabling easy cross-year queries
//! while keeping a single file for backup/portability.

use rusqlite::{params, Connection, OptionalExtension};
use std::path::PathBuf;
use std::sync::Mutex;
use thiserror::Error;

use crate::models::{EventLog, QsoRecord};

#[derive(Error, Debug)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Event log not found for year {0}")]
    YearNotFound(i32),
}

// Convert DbError to a string for Tauri command error serialization
impl serde::Serialize for DbError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Thread-safe database handle managed as Tauri state.
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Open (or create) the database at the platform-appropriate location.
    pub fn open() -> Result<Self, DbError> {
        let path = Self::db_path()?;

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(&path)?;

        // Security: enable WAL mode for safe concurrent reads, set busy timeout
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA foreign_keys = ON;
             PRAGMA secure_delete = ON;",
        )?;

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    /// Returns the platform-specific database file path.
    fn db_path() -> Result<PathBuf, DbError> {
        let proj_dirs = directories::ProjectDirs::from("com", "13colonies", "logger")
            .ok_or_else(|| {
                DbError::Io(std::io::Error::new(
                    std::io::ErrorKind::NotFound,
                    "Cannot determine application data directory",
                ))
            })?;
        Ok(proj_dirs.data_dir().join("13colonies.db"))
    }

    /// Run schema migrations. Idempotent — safe to call on every startup.
    fn migrate(&self) -> Result<(), DbError> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS event_logs (
                year        INTEGER PRIMARY KEY,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                notes       TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS qsos (
                id          TEXT PRIMARY KEY,
                year        INTEGER NOT NULL,
                callsign    TEXT NOT NULL,
                band        TEXT NOT NULL,
                mode        TEXT NOT NULL,
                frequency   TEXT NOT NULL DEFAULT '',
                sent_rst    TEXT NOT NULL,
                rcvd_rst    TEXT NOT NULL,
                qth         TEXT NOT NULL DEFAULT '',
                notes       TEXT NOT NULL DEFAULT '',
                utc_time    TEXT NOT NULL,
                colony_name TEXT,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (year) REFERENCES event_logs(year) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_qsos_year ON qsos(year);
            CREATE INDEX IF NOT EXISTS idx_qsos_callsign ON qsos(year, callsign);
            CREATE INDEX IF NOT EXISTS idx_qsos_band_mode ON qsos(year, band, mode);

            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );",
        )?;

        // Migration: add frequency column if it doesn't exist (for existing databases)
        let has_freq: bool = conn
            .prepare("SELECT 1 FROM pragma_table_info('qsos') WHERE name='frequency'")
            .and_then(|mut stmt| stmt.exists([]))
            .unwrap_or(false);
        if !has_freq {
            conn.execute_batch(
                "ALTER TABLE qsos ADD COLUMN frequency TEXT NOT NULL DEFAULT '';"
            )?;
        }

        Ok(())
    }

    // --- Event Log Operations ---

    /// List all event log years, most recent first.
    pub fn list_event_logs(&self) -> Result<Vec<EventLog>, DbError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT year, created_at, notes FROM event_logs ORDER BY year DESC",
        )?;
        let logs = stmt
            .query_map([], |row| {
                Ok(EventLog {
                    year: row.get(0)?,
                    created_at: row.get(1)?,
                    notes: row.get(2)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(logs)
    }

    /// Create a new event log for a given year. No-op if already exists.
    pub fn create_event_log(&self, year: i32) -> Result<EventLog, DbError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO event_logs (year) VALUES (?1)",
            params![year],
        )?;
        let log = conn.query_row(
            "SELECT year, created_at, notes FROM event_logs WHERE year = ?1",
            params![year],
            |row| {
                Ok(EventLog {
                    year: row.get(0)?,
                    created_at: row.get(1)?,
                    notes: row.get(2)?,
                })
            },
        )?;
        Ok(log)
    }

    /// Delete an event log and all its QSOs (cascade).
    pub fn delete_event_log(&self, year: i32) -> Result<(), DbError> {
        let conn = self.conn.lock().unwrap();
        // Manually delete QSOs first (SQLite FK cascade may not fire without PRAGMA)
        conn.execute("DELETE FROM qsos WHERE year = ?1", params![year])?;
        conn.execute("DELETE FROM event_logs WHERE year = ?1", params![year])?;
        Ok(())
    }

    // --- QSO Operations ---

    /// Get all QSOs for a given year, most recent first.
    pub fn get_qsos(&self, year: i32) -> Result<Vec<QsoRecord>, DbError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, year, callsign, band, mode, frequency, sent_rst, rcvd_rst, qth, notes, utc_time, colony_name
             FROM qsos WHERE year = ?1 ORDER BY utc_time DESC",
        )?;
        let qsos = stmt
            .query_map(params![year], |row| {
                Ok(QsoRecord {
                    id: row.get(0)?,
                    year: row.get(1)?,
                    callsign: row.get(2)?,
                    band: row.get(3)?,
                    mode: row.get(4)?,
                    frequency: row.get(5)?,
                    sent_rst: row.get(6)?,
                    rcvd_rst: row.get(7)?,
                    qth: row.get(8)?,
                    notes: row.get(9)?,
                    utc_time: row.get(10)?,
                    colony_name: row.get(11)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(qsos)
    }

    /// Add a new QSO. Returns the created record.
    pub fn add_qso(&self, qso: &QsoRecord) -> Result<(), DbError> {
        let conn = self.conn.lock().unwrap();

        // Ensure event log exists for this year
        conn.execute(
            "INSERT OR IGNORE INTO event_logs (year) VALUES (?1)",
            params![qso.year],
        )?;

        conn.execute(
            "INSERT INTO qsos (id, year, callsign, band, mode, frequency, sent_rst, rcvd_rst, qth, notes, utc_time, colony_name)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                qso.id,
                qso.year,
                qso.callsign,
                qso.band,
                qso.mode,
                qso.frequency,
                qso.sent_rst,
                qso.rcvd_rst,
                qso.qth,
                qso.notes,
                qso.utc_time,
                qso.colony_name,
            ],
        )?;
        Ok(())
    }

    /// Update an existing QSO.
    pub fn update_qso(&self, qso: &QsoRecord) -> Result<(), DbError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE qsos SET callsign = ?1, band = ?2, mode = ?3, frequency = ?4, sent_rst = ?5,
             rcvd_rst = ?6, qth = ?7, notes = ?8, utc_time = ?9, colony_name = ?10
             WHERE id = ?11",
            params![
                qso.callsign,
                qso.band,
                qso.mode,
                qso.frequency,
                qso.sent_rst,
                qso.rcvd_rst,
                qso.qth,
                qso.notes,
                qso.utc_time,
                qso.colony_name,
                qso.id,
            ],
        )?;
        Ok(())
    }

    /// Delete a QSO by ID.
    pub fn delete_qso(&self, id: &str) -> Result<(), DbError> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM qsos WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Check for duplicate QSO (same callsign + band + mode in a year).
    pub fn is_dupe(&self, year: i32, callsign: &str, band: &str, mode: &str) -> Result<bool, DbError> {
        let conn = self.conn.lock().unwrap();
        let exists: Option<i32> = conn
            .query_row(
                "SELECT 1 FROM qsos WHERE year = ?1 AND callsign = ?2 AND band = ?3 AND mode = ?4 LIMIT 1",
                params![year, callsign, band, mode],
                |row| row.get(0),
            )
            .optional()?;
        Ok(exists.is_some())
    }

    // --- Settings Operations ---

    /// Get a setting value by key.
    #[allow(dead_code)]
    pub fn get_setting(&self, key: &str) -> Result<Option<String>, DbError> {
        let conn = self.conn.lock().unwrap();
        let value: Option<String> = conn
            .query_row(
                "SELECT value FROM settings WHERE key = ?1",
                params![key],
                |row| row.get(0),
            )
            .optional()?;
        Ok(value)
    }

    /// Set a setting value (upsert).
    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), DbError> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )?;
        Ok(())
    }

    /// Get all settings as key-value pairs.
    pub fn get_all_settings(&self) -> Result<Vec<(String, String)>, DbError> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let pairs = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(pairs)
    }
}
