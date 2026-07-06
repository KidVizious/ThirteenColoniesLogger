import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { STATION_MAP } from "../data/stations";

export interface DxSpot {
  spotter: string;
  callsign: string;
  frequency: number; // MHz
  band: string;
  mode: string;
  comment: string;
  utc_time: string;
}

export interface ClusterStatus {
  connected: boolean;
  host: string;
  message: string;
}

interface ClusterState {
  spots: DxSpot[];          // all spots received this session (pruned by window)
  status: ClusterStatus;
  connecting: boolean;
  unlisten: UnlistenFn | null;
  unlistenStatus: UnlistenFn | null;

  connect: (host: string, port: number, myCallsign: string) => Promise<void>;
  disconnect: () => Promise<void>;
  pruneSpots: (windowMins: number) => void;
  // Called from App on each new spot — determines if notification needed
  processSpot: (
    spot: DxSpot,
    workedCallsigns: Set<string>,
    workedBandMode: Set<string>,
    windowMins: number
  ) => void;
}

export const useCluster = create<ClusterState>()((set, get) => ({
  spots: [],
  status: { connected: false, host: "", message: "Not connected" },
  connecting: false,
  unlisten: null,
  unlistenStatus: null,

  connect: async (host, port, myCallsign) => {
    set({ connecting: true });

    // Detach old listeners
    const { unlisten, unlistenStatus } = get();
    if (unlisten) unlisten();
    if (unlistenStatus) unlistenStatus();

    // Listen for spots
    const newUnlisten = await listen<DxSpot>("cluster-spot", (event) => {
      const spot = event.payload;
      // Keep only recent spots (session-level pruning happens in processSpot)
      set((s) => ({ spots: [spot, ...s.spots].slice(0, 1000) }));
    });

    // Listen for status updates
    const newUnlistenStatus = await listen<ClusterStatus>("cluster-status", (event) => {
      set({ status: event.payload });
      if (!event.payload.connected) {
        // Server disconnected — clear handle state
        set({ connecting: false });
      }
    });

    set({ unlisten: newUnlisten, unlistenStatus: newUnlistenStatus });

    try {
      await invoke("cluster_connect", { host, port, myCallsign });
    } catch (err) {
      set({
        connecting: false,
        status: { connected: false, host, message: String(err) },
      });
      return;
    }

    set({ connecting: false });
  },

  disconnect: async () => {
    invoke("cluster_disconnect");
    const { unlisten, unlistenStatus } = get();
    if (unlisten) unlisten();
    if (unlistenStatus) unlistenStatus();
    set({
      unlisten: null,
      unlistenStatus: null,
      spots: [],
      status: { connected: false, host: "", message: "Disconnected" },
    });
  },

  pruneSpots: (windowMins) => {
    const cutoff = Date.now() - windowMins * 60 * 1000;
    set((s) => ({
      spots: s.spots.filter((sp) => new Date(sp.utc_time).getTime() > cutoff),
    }));
  },

  processSpot: async (spot, workedCallsigns, workedBandMode, windowMins) => {
    // Only process 13 colonies / bonus stations
    if (!STATION_MAP.has(spot.callsign)) return;

    const station = STATION_MAP.get(spot.callsign)!;
    const bandModeKey = `${spot.callsign}|${spot.band}|${spot.mode}`;

    const isNewStation = !workedCallsigns.has(spot.callsign);
    const isNewBandMode = workedCallsigns.has(spot.callsign) && !workedBandMode.has(bandModeKey);

    if (!isNewStation && !isNewBandMode) return;

    // Check this spot isn't already in our recent list to avoid duplicate notifications
    const cutoff = Date.now() - windowMins * 60 * 1000;
    const alreadyNotified = get().spots.some(
      (s) =>
        s.callsign === spot.callsign &&
        s.band === spot.band &&
        s.mode === spot.mode &&
        new Date(s.utc_time).getTime() > cutoff
    );
    if (alreadyNotified) return;

    // Request notification permission if needed
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      const title = isNewStation
        ? `🎯 ${spot.callsign} Spotted — ${station.name}`
        : `📡 ${spot.callsign} on new band/mode`;

      const body = isNewStation
        ? `${parseFloat(spot.frequency.toFixed(5))} MHz · ${spot.mode} · Not yet worked`
        : `${parseFloat(spot.frequency.toFixed(5))} MHz · ${spot.mode} · New ${spot.band} ${spot.mode} opportunity`;

      sendNotification({ title, body });
    }
  },
}));

/** Returns the most recent spot for each colony/bonus station within the window,
 *  excluding any spot whose callsign+band+mode has already been logged. */
export function getActiveSpots(
  spots: DxSpot[],
  windowMins: number,
  workedBandMode: Set<string>   // Set of "CALLSIGN|band|mode" keys from the contact log
): Map<string, DxSpot[]> {
  const cutoff = Date.now() - windowMins * 60 * 1000;
  const result = new Map<string, DxSpot[]>();
  const seenBandMode = new Set<string>(); // De-dupe: keep only most recent spot per callsign+band+mode

  for (const spot of spots) {
    if (!STATION_MAP.has(spot.callsign)) continue;
    if (new Date(spot.utc_time).getTime() < cutoff) continue;
    // Skip if this exact band+mode is already in the log
    if (workedBandMode.has(`${spot.callsign}|${spot.band}|${spot.mode}`)) continue;

    const bandModeKey = `${spot.callsign}|${spot.band}|${spot.mode}`;
    if (seenBandMode.has(bandModeKey)) continue;
    seenBandMode.add(bandModeKey);

    if (!result.has(spot.callsign)) {
      result.set(spot.callsign, []);
    }
    result.get(spot.callsign)!.push(spot);
  }

  return result;
}
