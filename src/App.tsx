import { useEffect, useCallback, useState, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSettings } from "./store/settings";
import { useContacts } from "./store/contacts";
import { useCluster, type DxSpot } from "./store/cluster";
import { Toolbar } from "./components/Toolbar";
import { ContactEntry } from "./components/ContactEntry";
import { SweepTracker } from "./components/SweepTracker";
import { StationGrid } from "./components/StationGrid";
import { BandModeMatrix } from "./components/BandModeMatrix";
import { LogList } from "./components/LogList";
import { SettingsModal } from "./components/SettingsModal";
import { Toast } from "./components/Toast";

export default function App() {
  const theme = useSettings((s) => s.theme);
  const myCallsign = useSettings((s) => s.myCallsign);
  const myQth = useSettings((s) => s.myQth);
  const clusterEnabled = useSettings((s) => s.clusterEnabled);
  const clusterHost = useSettings((s) => s.clusterHost);
  const clusterPort = useSettings((s) => s.clusterPort);
  const spotWindowMins = useSettings((s) => s.spotWindowMins);
  const settingsLoading = useSettings((s) => s.loading);
  const initializeSettings = useSettings((s) => s.initialize);
  const contactsLoading = useContacts((s) => s.loading);
  const initializeContacts = useContacts((s) => s.initialize);
  const undoLastContact = useContacts((s) => s.undoLastContact);
  const contacts = useContacts((s) => s.contacts);
  const { connect: clusterConnect, disconnect: clusterDisconnect, processSpot } = useCluster();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [firstRunSetup, setFirstRunSetup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [logPanelHeight, setLogPanelHeight] = useState(240);
  const [spotPrefill, setSpotPrefill] = useState<{ callsign: string; frequency: string; mode: string } | null>(null);
  const logResizing = useRef(false);
  const logResizeStartY = useRef(0);
  const logResizeStartH = useRef(0);

  // Initialize stores on mount
  useEffect(() => {
    initializeSettings().then(() => {
      initializeContacts();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-open settings in required mode when operator info is missing
  useEffect(() => {
    if (!settingsLoading && !contactsLoading) {
      if (!myCallsign.trim() || !myQth.trim()) {
        setFirstRunSetup(true);
      }
    }
  }, [settingsLoading, contactsLoading, myCallsign, myQth]);

  // Manage cluster connection when settings change
  useEffect(() => {
    if (settingsLoading || !myCallsign.trim()) return;
    if (clusterEnabled) {
      clusterConnect(clusterHost, clusterPort, myCallsign);
    } else {
      clusterDisconnect();
    }
    return () => { clusterDisconnect(); };
  }, [clusterEnabled, clusterHost, clusterPort, myCallsign, settingsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Process incoming spots for notifications
  useEffect(() => {
    const unlisten = listen<DxSpot>("cluster-spot", (event) => {
      const spot = event.payload;
      const workedCallsigns = new Set(contacts.map((c) => c.callsign));
      const workedBandMode = new Set(contacts.map((c) => `${c.callsign}|${c.band}|${c.mode}`));
      processSpot(spot, workedCallsigns, workedBandMode, spotWindowMins);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [contacts, processSpot, spotWindowMins]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        root.setAttribute("data-theme", mq.matches ? "dark" : "light");
      };
      handler();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "l") {
        e.preventDefault();
        const callInput = document.getElementById("callsign-input");
        callInput?.focus();
      }

      if (mod && e.key === "z" && !e.shiftKey) {
        const el = document.activeElement;
        const isInput =
          el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
        if (!isInput) {
          e.preventDefault();
          undoLastContact();
        }
      }

      if (e.key === "Escape") {
        const callInput = document.getElementById(
          "callsign-input"
        ) as HTMLInputElement;
        if (callInput) {
          callInput.value = "";
          callInput.dispatchEvent(new Event("input", { bubbles: true }));
          callInput.focus();
        }
      }
    },
    [undoLastContact]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Log panel resize via drag handle
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    logResizing.current = true;
    logResizeStartY.current = e.clientY;
    logResizeStartH.current = logPanelHeight;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!logResizing.current) return;
      const delta = logResizeStartY.current - ev.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.6, logResizeStartH.current + delta));
      setLogPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      logResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [logPanelHeight]);

  // Show loading state while stores initialize
  if (settingsLoading || contactsLoading) {
    return (
      <div className="app-shell app-loading">
        <div className="loading-indicator">
          <span className="loading-text">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <Toolbar onSettingsClick={() => setSettingsOpen(true)} />
      </header>

      <main className="app-main">
        <section className="entry-column">
          <ContactEntry onToast={setToast} prefill={spotPrefill} />
        </section>

        <section className="tracker-column">
          <SweepTracker />
          <StationGrid onSpotClick={(spot) => {
            setSpotPrefill({
              callsign: spot.callsign,
              frequency: String(spot.frequency),
              mode: spot.mode,
            });
            // Reset prefill after a tick so repeated clicks on the same spot still trigger
            setTimeout(() => setSpotPrefill(null), 100);
          }} />
          <BandModeMatrix />
        </section>
      </main>

      <div
        className="log-resize-handle"
        onMouseDown={handleResizeMouseDown}
      />

      <section className="log-panel" style={{ height: logPanelHeight }}>
        <LogList />
      </section>

      {firstRunSetup && (
        <SettingsModal
          required
          onClose={() => setFirstRunSetup(false)}
        />
      )}

      {settingsOpen && !firstRunSetup && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
