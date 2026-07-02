export interface Station {
  callsign: string;
  name: string;
  state: string;
  number: number;
  type: "colony" | "bonus";
  country?: string;
}

export const STATIONS: Station[] = [
  { callsign: "K2A", name: "New York", state: "NY", number: 1, type: "colony" },
  { callsign: "K2B", name: "Virginia", state: "VA", number: 2, type: "colony" },
  { callsign: "K2C", name: "Rhode Island", state: "RI", number: 3, type: "colony" },
  { callsign: "K2D", name: "Connecticut", state: "CT", number: 4, type: "colony" },
  { callsign: "K2E", name: "Delaware", state: "DE", number: 5, type: "colony" },
  { callsign: "K2F", name: "Maryland", state: "MD", number: 6, type: "colony" },
  { callsign: "K2G", name: "Georgia", state: "GA", number: 7, type: "colony" },
  { callsign: "K2H", name: "Massachusetts", state: "MA", number: 8, type: "colony" },
  { callsign: "K2I", name: "New Jersey", state: "NJ", number: 9, type: "colony" },
  { callsign: "K2J", name: "North Carolina", state: "NC", number: 10, type: "colony" },
  { callsign: "K2K", name: "New Hampshire", state: "NH", number: 11, type: "colony" },
  { callsign: "K2L", name: "South Carolina", state: "SC", number: 12, type: "colony" },
  { callsign: "K2M", name: "Pennsylvania", state: "PA", number: 13, type: "colony" },
  { callsign: "WM3PEN", name: "Philadelphia", state: "PA", number: 14, type: "bonus", country: "US" },
  { callsign: "GB13COL", name: "Great Britain", state: "UK", number: 15, type: "bonus", country: "UK" },
  { callsign: "TM13COL", name: "France", state: "FR", number: 16, type: "bonus", country: "FR" },
];

export const STATION_MAP = new Map(STATIONS.map((s) => [s.callsign, s]));

export const BANDS = ["160m", "80m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "2m"] as const;
export type Band = (typeof BANDS)[number];

export const MODES = ["SSB", "CW", "RTTY", "FT8", "FT4", "DIG"] as const;
export type Mode = (typeof MODES)[number];

// Bands arranged numerically: 160m → 2m (high freq descending wavelength)
export const BAND_ROW_1: Band[] = ["160m", "80m", "40m", "30m", "20m", "17m"];
export const BAND_ROW_2: Band[] = ["15m", "12m", "10m", "6m", "2m"];

/** Band frequency ranges in MHz for auto-detection from frequency input */
export const BAND_FREQ_RANGES: { band: Band; min: number; max: number }[] = [
  { band: "160m", min: 1.8, max: 2.0 },
  { band: "80m", min: 3.5, max: 4.0 },
  { band: "40m", min: 7.0, max: 7.3 },
  { band: "30m", min: 10.1, max: 10.15 },
  { band: "20m", min: 14.0, max: 14.35 },
  { band: "17m", min: 18.068, max: 18.168 },
  { band: "15m", min: 21.0, max: 21.45 },
  { band: "12m", min: 24.89, max: 24.99 },
  { band: "10m", min: 28.0, max: 29.7 },
  { band: "6m", min: 50.0, max: 54.0 },
  { band: "2m", min: 144.0, max: 148.0 },
];

/** Given a frequency in MHz, return the matching band or null */
export function freqToBand(freqMhz: number): Band | null {
  for (const range of BAND_FREQ_RANGES) {
    if (freqMhz >= range.min && freqMhz <= range.max) {
      return range.band;
    }
  }
  return null;
}
