import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { MdSettings, MdFileDownload, MdDarkMode, MdLightMode, MdBrightness6, MdExpandMore, MdSatelliteAlt } from "react-icons/md";
import { useSettings } from "../store/settings";
import { useContacts } from "../store/contacts";
import { useCluster } from "../store/cluster";
import "./Toolbar.css";

interface ToolbarProps {
  onSettingsClick: () => void;
}

export function Toolbar({ onSettingsClick }: ToolbarProps) {
  const { myCallsign, theme, setTheme } = useSettings();
  const clusterEnabled = useSettings((s) => s.clusterEnabled);
  const contacts = useContacts((s) => s.contacts);
  const clusterStatus = useCluster((s) => s.status);
  const clusterConnecting = useCluster((s) => s.connecting);
  const activeYear = useContacts((s) => s.activeYear);
  const eventLogs = useContacts((s) => s.eventLogs);
  const setActiveYear = useContacts((s) => s.setActiveYear);
  const createEventLog = useContacts((s) => s.createEventLog);
  const saveToBackend = useSettings((s) => s.saveToBackend);

  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const { clusterHost, clusterPort } = useSettings();
  const cluster = useCluster();

  const handleClusterToggle = async () => {
    if (clusterStatus.connected || clusterConnecting) {
      await cluster.disconnect();
    } else if (clusterEnabled) {
      await cluster.connect(clusterHost, clusterPort, myCallsign);
    }
  };

  const now = new Date();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  let eventStatus: "pre" | "active" | "post" = "pre";
  if (month === 6 && day >= 1 && day <= 7) {
    eventStatus = "active";
  } else if (month > 6 || (month === 6 && day > 7)) {
    eventStatus = "post";
  }

  const toggleTheme = () => {
    let next: "light" | "dark" | "system";
    if (theme === "dark") next = "light";
    else if (theme === "light") next = "system";
    else next = "dark";
    setTheme(next);
    setTimeout(() => saveToBackend(), 0);
  };

  const handleExport = async () => {
    try {
      const filePath = await save({
        title: "Export ADIF Log",
        defaultPath: `13colonies_${activeYear}.adi`,
        filters: [
          { name: "ADIF Files", extensions: ["adi", "adif"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (!filePath) return;

      const count = await invoke<number>("export_adif", {
        year: activeYear,
        filePath,
      });

      alert(`Exported ${count} QSO${count !== 1 ? "s" : ""} to:\n${filePath}`);
    } catch (err) {
      console.error("ADIF export failed:", err);
      alert(`Export failed: ${err}`);
    }
  };

  const handleYearChange = async (year: number) => {
    await setActiveYear(year);
    useSettings.getState().setActiveYear(year);
    await saveToBackend();
    setYearPickerOpen(false);
  };

  const handleNewYear = async () => {
    const input = prompt("Enter year (e.g. 2026):");
    if (!input) return;
    const year = parseInt(input, 10);
    if (isNaN(year) || year < 2009 || year > 2100) {
      alert("Please enter a valid year between 2009 and 2100.");
      return;
    }
    await createEventLog(year);
    await handleYearChange(year);
  };

  const ThemeIcon = () => {
    if (theme === "dark") return <MdDarkMode size={18} />;
    if (theme === "light") return <MdLightMode size={18} />;
    return <MdBrightness6 size={18} />;
  };

  return (
    <div className="toolbar">
      <div className="toolbar__left">
        {/* 13-star Betsy Ross circle — this one stays as SVG since it's a custom brand mark */}
        <svg className="toolbar__icon" viewBox="0 0 32 32" width="16" height="16" aria-hidden="true">
          {Array.from({ length: 13 }).map((_, i) => {
            const angle = (i * 360) / 13 - 90;
            const rad = (angle * Math.PI) / 180;
            const cx = 16 + 12 * Math.cos(rad);
            const cy = 16 + 12 * Math.sin(rad);
            return <circle key={i} cx={cx} cy={cy} r="2" fill="var(--accent-gold)" />;
          })}
        </svg>
        <h1 className="toolbar__title font-display">13 Colonies Event Logger</h1>
        <span className="toolbar__separator" />

        {/* Year Selector */}
        <div className="toolbar__year-picker">
          <button
            className="toolbar__year-btn"
            onClick={() => setYearPickerOpen(!yearPickerOpen)}
            title="Switch event year"
          >
            <span className="toolbar__year-label">EVENT</span>
            <span className="toolbar__year-value font-mono">{activeYear}</span>
            <MdExpandMore size={16} className="toolbar__year-chevron" />
          </button>

          {yearPickerOpen && (
            <div className="toolbar__year-dropdown">
              {eventLogs.map((log) => (
                <button
                  key={log.year}
                  className={`toolbar__year-option ${log.year === activeYear ? "toolbar__year-option--active" : ""}`}
                  onClick={() => handleYearChange(log.year)}
                >
                  <span className="font-mono">{log.year}</span>
                  {log.year === activeYear && <span className="toolbar__year-check">✓</span>}
                </button>
              ))}
              <hr className="toolbar__year-divider" />
              <button className="toolbar__year-option toolbar__year-option--new" onClick={handleNewYear}>
                + New Event Year
              </button>
            </div>
          )}
        </div>

        <span className={`toolbar__event-badge toolbar__event-badge--${eventStatus}`}>
          {eventStatus === "pre" && "July 1–7"}
          {eventStatus === "active" && (
            <>
              <span className="toolbar__pulse-dot" />
              EVENT ACTIVE
            </>
          )}
          {eventStatus === "post" && "Event Ended"}
        </span>
      </div>

      <div className="toolbar__right">
        <span className="toolbar__operator">
          <span className="toolbar__op-label">OP:</span>
          <span className="toolbar__op-call font-mono">{myCallsign || "—"}</span>
        </span>

        <span className="toolbar__qso-badge">{contacts.length}</span>

        {clusterEnabled && (
          <span
            className={`toolbar__cluster-badge ${clusterStatus.connected ? "toolbar__cluster-badge--on" : clusterConnecting ? "toolbar__cluster-badge--connecting" : "toolbar__cluster-badge--off"}`}
            title={clusterStatus.message}
            onClick={handleClusterToggle}
            style={{ cursor: 'pointer' }}
          >
            <MdSatelliteAlt size={12} />
            {clusterConnecting ? "…" : clusterStatus.connected ? "CLUSTER" : "OFFLINE"}
          </span>
        )}

        <button className="toolbar__btn" onClick={handleExport} title="Export ADIF">
          <MdFileDownload size={16} />
          <span>ADIF</span>
        </button>

        <button
          className="toolbar__btn toolbar__settings-btn"
          onClick={onSettingsClick}
          title="Settings"
        >
          <MdSettings size={18} />
        </button>

        <button className="toolbar__btn toolbar__theme-btn" onClick={toggleTheme} title={`Theme: ${theme}`}>
          <ThemeIcon />
        </button>
      </div>
    </div>
  );
}
