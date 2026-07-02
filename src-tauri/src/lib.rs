mod commands;
mod db;
mod models;

use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize database before building the app
    let database = Database::open().expect("Failed to open database");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(database)
        .invoke_handler(tauri::generate_handler![
            commands::list_event_logs,
            commands::create_event_log,
            commands::delete_event_log,
            commands::get_qsos,
            commands::add_qso,
            commands::update_qso,
            commands::delete_qso,
            commands::check_dupe,
            commands::get_settings,
            commands::save_settings,
            commands::set_active_year,
            commands::get_db_path,
            commands::export_adif,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
