import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type { Settings, SettingsRecord, Theme } from "./types";
import { settingsRecordToSettings, settingsToRecord } from "./types";
import type { Mode } from "../data/stations";

interface SettingsState extends Settings {
  loading: boolean;
  initialize: () => Promise<void>;
  setMyCallsign: (v: string) => void;
  setMyName: (v: string) => void;
  setMyQth: (v: string) => void;
  setDefaultMode: (v: Mode) => void;
  setDefaultRst: (v: string) => void;
  setTheme: (v: Theme) => void;
  setActiveYear: (v: number) => void;
  updateSettings: (s: Partial<Settings>) => void;
  saveToBackend: () => Promise<void>;
}

// Debounce timer for auto-persist
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    useSettings.getState().saveToBackend();
  }, 300);
}

export const useSettings = create<SettingsState>()(
  subscribeWithSelector((set, get) => ({
    myCallsign: "",
    myName: "",
    myQth: "",
    defaultMode: "SSB" as Mode,
    defaultRst: "59",
    theme: "dark" as Theme,
    activeYear: new Date().getUTCFullYear(),
    loading: true,

    initialize: async () => {
      try {
        const record = await invoke<SettingsRecord>("get_settings");
        const settings = settingsRecordToSettings(record);
        set({ ...settings, loading: false });
      } catch (err) {
        console.error("Failed to load settings:", err);
        set({ loading: false });
      }
    },

    setMyCallsign: (v) => set({ myCallsign: v.toUpperCase() }),
    setMyName: (v) => set({ myName: v }),
    setMyQth: (v) => set({ myQth: v }),
    setDefaultMode: (v) => set({ defaultMode: v }),
    setDefaultRst: (v) => set({ defaultRst: v }),
    setTheme: (v) => set({ theme: v }),
    setActiveYear: (v) => set({ activeYear: v }),
    updateSettings: (s) => set(s),

    saveToBackend: async () => {
      const state = get();
      // Don't persist while still loading initial state
      if (state.loading) return;
      const record = settingsToRecord({
        myCallsign: state.myCallsign,
        myName: state.myName,
        myQth: state.myQth,
        defaultMode: state.defaultMode,
        defaultRst: state.defaultRst,
        theme: state.theme,
        activeYear: state.activeYear,
      });
      try {
        await invoke("save_settings", { settings: record });
      } catch (err) {
        console.error("Failed to save settings:", err);
      }
    },
  }))
);

// Auto-persist any settings change to the database (debounced).
// We subscribe to the subset of state that represents persisted settings.
useSettings.subscribe(
  (state) => ({
    myCallsign: state.myCallsign,
    myName: state.myName,
    myQth: state.myQth,
    defaultMode: state.defaultMode,
    defaultRst: state.defaultRst,
    theme: state.theme,
    activeYear: state.activeYear,
  }),
  () => {
    // Only auto-persist after initial load is complete
    if (!useSettings.getState().loading) {
      schedulePersist();
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);
