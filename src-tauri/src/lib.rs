mod cluster;
mod commands;
mod db;
mod models;

use cluster::ClusterState;
use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database = Database::open().expect("Failed to open database");
    let cluster_state = ClusterState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .manage(database)
        .manage(cluster_state)
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
            commands::cluster_connect,
            commands::cluster_disconnect,
            commands::cluster_is_connected,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
