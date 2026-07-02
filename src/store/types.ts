import type { Band, Mode } from "../data/stations";

export interface QSO {
  id: string;
  callsign: string;
  band: Band;
  mode: Mode;
  frequency: string; // MHz as string, e.g. "14.074"
  sentRst: string;
  rcvdRst: string;
  qth: string;
  notes: string;
  utcTime: string; // ISO string
  colonyName?: string;
}

/** Maps to the Rust QsoRecord struct for Tauri command serialization */
export interface QsoRecord {
  id: string;
  year: number;
  callsign: string;
  band: string;
  mode: string;
  frequency: string;
  sent_rst: string;
  rcvd_rst: string;
  qth: string;
  notes: string;
  utc_time: string;
  colony_name: string | null;
}

export interface EventLog {
  year: number;
  created_at: string;
  notes: string;
}

export type Theme = "light" | "dark" | "system";

export interface Settings {
  myCallsign: string;
  myName: string;
  myQth: string;
  defaultMode: Mode;
  defaultRst: string;
  theme: Theme;
  activeYear: number;
}

/** Maps to the Rust Settings struct */
export interface SettingsRecord {
  my_callsign: string;
  my_name: string;
  my_qth: string;
  default_mode: string;
  default_rst: string;
  theme: string;
  active_year: number;
}

// Conversion helpers
export function qsoRecordToQso(record: QsoRecord): QSO {
  return {
    id: record.id,
    callsign: record.callsign,
    band: record.band as Band,
    mode: record.mode as Mode,
    frequency: record.frequency,
    sentRst: record.sent_rst,
    rcvdRst: record.rcvd_rst,
    qth: record.qth,
    notes: record.notes,
    utcTime: record.utc_time,
    colonyName: record.colony_name ?? undefined,
  };
}

export function settingsRecordToSettings(record: SettingsRecord): Settings {
  return {
    myCallsign: record.my_callsign,
    myName: record.my_name,
    myQth: record.my_qth,
    defaultMode: record.default_mode as Mode,
    defaultRst: record.default_rst,
    theme: record.theme as Theme,
    activeYear: record.active_year,
  };
}

export function settingsToRecord(settings: Settings): SettingsRecord {
  return {
    my_callsign: settings.myCallsign,
    my_name: settings.myName,
    my_qth: settings.myQth,
    default_mode: settings.defaultMode,
    default_rst: settings.defaultRst,
    theme: settings.theme,
    active_year: settings.activeYear,
  };
}
