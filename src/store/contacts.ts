import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { QSO, QsoRecord, EventLog } from "./types";
import { qsoRecordToQso } from "./types";
import type { Band, Mode } from "../data/stations";
import { STATION_MAP } from "../data/stations";

interface ContactsState {
  contacts: QSO[];
  activeYear: number;
  eventLogs: EventLog[];
  loading: boolean;
  lastLoggedId: string | null;
  lastLoggedAt: number | null;

  // Actions
  initialize: () => Promise<void>;
  loadQsos: (year: number) => Promise<void>;
  loadEventLogs: () => Promise<void>;
  setActiveYear: (year: number) => Promise<void>;
  createEventLog: (year: number) => Promise<void>;
  deleteEventLog: (year: number) => Promise<void>;
  addContact: (contact: Omit<QSO, "id" | "colonyName">) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  editContact: (id: string, updates: Partial<QSO>) => Promise<void>;
  undoLastContact: () => Promise<void>;
  isDupe: (callsign: string, band: Band, mode: Mode) => boolean;
  getWorkedStations: () => Set<string>;
  getWorkedColonies: () => Set<string>;
  getWorkedBonus: () => Set<string>;
}

export const useContacts = create<ContactsState>()((set, get) => ({
  contacts: [],
  activeYear: new Date().getUTCFullYear(),
  eventLogs: [],
  loading: true,
  lastLoggedId: null,
  lastLoggedAt: null,

  initialize: async () => {
    try {
      // Load settings to get active year
      const settings = await invoke<{ active_year: number }>("get_settings");
      const year = settings.active_year;

      // Load event logs
      const logs = await invoke<EventLog[]>("list_event_logs");

      // If no event log for this year, create one
      if (!logs.some((l) => l.year === year)) {
        await invoke("create_event_log", { year });
      }

      // Load QSOs for active year
      const records = await invoke<QsoRecord[]>("get_qsos", { year });
      const contacts = records.map(qsoRecordToQso);

      // Reload event logs after possible creation
      const updatedLogs = await invoke<EventLog[]>("list_event_logs");

      set({
        activeYear: year,
        contacts,
        eventLogs: updatedLogs,
        loading: false,
      });
    } catch (err) {
      console.error("Failed to initialize contacts store:", err);
      // Fallback: still mark as not loading so UI renders
      set({ loading: false });
    }
  },

  loadQsos: async (year: number) => {
    try {
      const records = await invoke<QsoRecord[]>("get_qsos", { year });
      set({ contacts: records.map(qsoRecordToQso) });
    } catch (err) {
      console.error("Failed to load QSOs:", err);
    }
  },

  loadEventLogs: async () => {
    try {
      const logs = await invoke<EventLog[]>("list_event_logs");
      set({ eventLogs: logs });
    } catch (err) {
      console.error("Failed to load event logs:", err);
    }
  },

  setActiveYear: async (year: number) => {
    try {
      await invoke("set_active_year", { year });

      // Ensure event log exists for this year
      const logs = get().eventLogs;
      if (!logs.some((l) => l.year === year)) {
        await invoke("create_event_log", { year });
      }

      const records = await invoke<QsoRecord[]>("get_qsos", { year });
      const updatedLogs = await invoke<EventLog[]>("list_event_logs");

      set({
        activeYear: year,
        contacts: records.map(qsoRecordToQso),
        eventLogs: updatedLogs,
      });
    } catch (err) {
      console.error("Failed to set active year:", err);
    }
  },

  createEventLog: async (year: number) => {
    try {
      await invoke("create_event_log", { year });
      const logs = await invoke<EventLog[]>("list_event_logs");
      set({ eventLogs: logs });
    } catch (err) {
      console.error("Failed to create event log:", err);
    }
  },

  deleteEventLog: async (year: number) => {
    try {
      await invoke("delete_event_log", { year });
      const logs = await invoke<EventLog[]>("list_event_logs");
      const state = get();

      // If we deleted the active year, switch to most recent
      if (state.activeYear === year) {
        const newYear = logs.length > 0 ? logs[0].year : new Date().getUTCFullYear();
        await get().setActiveYear(newYear);
      }

      set({ eventLogs: logs });
    } catch (err) {
      console.error("Failed to delete event log:", err);
    }
  },

  addContact: async (contact) => {
    const { activeYear } = get();
    const station = STATION_MAP.get(contact.callsign);

    try {
      const record = await invoke<QsoRecord>("add_qso", {
        year: activeYear,
        qso: {
          callsign: contact.callsign,
          band: contact.band,
          mode: contact.mode,
          frequency: contact.frequency,
          sent_rst: contact.sentRst,
          rcvd_rst: contact.rcvdRst,
          qth: contact.qth,
          notes: contact.notes,
          utc_time: contact.utcTime,
          colony_name: station?.name ?? null,
        },
      });

      const qso = qsoRecordToQso(record);
      set((state) => ({
        contacts: [qso, ...state.contacts],
        lastLoggedId: qso.id,
        lastLoggedAt: Date.now(),
      }));
    } catch (err) {
      console.error("Failed to add QSO:", err);
    }
  },

  deleteContact: async (id: string) => {
    try {
      await invoke("delete_qso", { id });
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== id),
      }));
    } catch (err) {
      console.error("Failed to delete QSO:", err);
    }
  },

  editContact: async (id: string, updates: Partial<QSO>) => {
    const { activeYear, contacts } = get();
    const existing = contacts.find((c) => c.id === id);
    if (!existing) return;

    const merged = { ...existing, ...updates };
    const station = STATION_MAP.get(merged.callsign);

    try {
      await invoke("update_qso", {
        year: activeYear,
        qso: {
          id: merged.id,
          callsign: merged.callsign,
          band: merged.band,
          mode: merged.mode,
          frequency: merged.frequency,
          sent_rst: merged.sentRst,
          rcvd_rst: merged.rcvdRst,
          qth: merged.qth,
          notes: merged.notes,
          utc_time: merged.utcTime,
          colony_name: station?.name ?? null,
        },
      });

      set((state) => ({
        contacts: state.contacts.map((c) =>
          c.id === id ? { ...c, ...updates, colonyName: station?.name } : c
        ),
      }));
    } catch (err) {
      console.error("Failed to update QSO:", err);
    }
  },

  undoLastContact: async () => {
    const { lastLoggedId, lastLoggedAt } = get();
    if (!lastLoggedId || !lastLoggedAt) return;
    if (Date.now() - lastLoggedAt > 10000) return;

    try {
      await invoke("delete_qso", { id: lastLoggedId });
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== lastLoggedId),
        lastLoggedId: null,
        lastLoggedAt: null,
      }));
    } catch (err) {
      console.error("Failed to undo QSO:", err);
    }
  },

  isDupe: (callsign: string, band: Band, mode: Mode) => {
    // Local check for instant feedback (no async round-trip)
    return get().contacts.some(
      (c) => c.callsign === callsign && c.band === band && c.mode === mode
    );
  },

  getWorkedStations: () => {
    return new Set(get().contacts.map((c) => c.callsign));
  },

  getWorkedColonies: () => {
    const worked = new Set<string>();
    for (const c of get().contacts) {
      const station = STATION_MAP.get(c.callsign);
      if (station?.type === "colony") worked.add(c.callsign);
    }
    return worked;
  },

  getWorkedBonus: () => {
    const worked = new Set<string>();
    for (const c of get().contacts) {
      const station = STATION_MAP.get(c.callsign);
      if (station?.type === "bonus") worked.add(c.callsign);
    }
    return worked;
  },
}));
