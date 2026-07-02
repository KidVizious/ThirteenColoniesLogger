import { useState } from "react";
import { MdClose } from "react-icons/md";
import { useSettings } from "../store/settings";
import { useCluster } from "../store/cluster";
import { MODES } from "../data/stations";
import type { Mode } from "../data/stations";
import type { Theme } from "../store/types";
import { SegmentedButtons } from "./SegmentedButtons";
import "./SettingsModal.css";

const POPULAR_SERVERS = [
  { label: "VE7CC (NA)", host: "dxc.ve7cc.net", port: 23 },
  { label: "W3LPL (NA)", host: "w3lpl.net", port: 7373 },
  { label: "N2YO (NA)", host: "www.n2yo.com", port: 7373 },
  { label: "DX.SUMMITLINK (EU)", host: "dx.summitlink.net", port: 8000 },
  { label: "GB7TLH (EU)", host: "gb7tlh.ampr.org", port: 8000 },
  { label: "VK3RGL (OC)", host: "vk3rgl.net", port: 9000 },
];

interface SettingsModalProps {
  onClose: () => void;
  required?: boolean;
}

export function SettingsModal({ onClose, required = false }: SettingsModalProps) {
  const settings = useSettings();
  const clusterStatus = useCluster((s) => s.status);
  const clusterConnecting = useCluster((s) => s.connecting);

  const [myCallsign, setMyCallsign] = useState(settings.myCallsign);
  const [myName, setMyName] = useState(settings.myName);
  const [myQth, setMyQth] = useState(settings.myQth);
  const [defaultMode, setDefaultMode] = useState(settings.defaultMode);
  const [defaultRst, setDefaultRst] = useState(settings.defaultRst);
  const [theme, setTheme] = useState(settings.theme);
  const [clusterEnabled, setClusterEnabled] = useState(settings.clusterEnabled);
  const [clusterHost, setClusterHost] = useState(settings.clusterHost);
  const [clusterPort, setClusterPort] = useState(String(settings.clusterPort));
  const [spotWindowMins, setSpotWindowMins] = useState(String(settings.spotWindowMins));
  const [validationError, setValidationError] = useState<string | null>(null);

  const canClose = () => {
    if (!required) return true;
    // In required mode, callsign and QTH must be filled
    return myCallsign.trim().length > 0 && myQth.trim().length > 0;
  };

  const handleSave = async () => {
    if (required && !myCallsign.trim()) {
      setValidationError("Callsign is required to continue.");
      return;
    }
    if (required && !myQth.trim()) {
      setValidationError("State / Country is required to continue.");
      return;
    }
    setValidationError(null);

    settings.updateSettings({
      myCallsign: myCallsign.toUpperCase(),
      myName,
      myQth,
      defaultMode,
      defaultRst,
      theme,
      clusterEnabled,
      clusterHost: clusterHost.trim(),
      clusterPort: parseInt(clusterPort, 10) || 23,
      spotWindowMins: parseInt(spotWindowMins, 10) || 30,
    });
    await settings.saveToBackend();
    onClose();
  };

  const handleClose = () => {
    if (!canClose()) {
      setValidationError("Please fill in your callsign and state/country before continuing.");
      return;
    }
    onClose();
  };

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h2 className="settings-modal__title font-display">
            {required ? "Welcome — Set Up Your Station" : "Settings"}
          </h2>
          {!required && (
            <button className="settings-modal__close" onClick={handleClose}><MdClose size={18} /></button>
          )}
        </div>

        {required && (
          <p className="settings-modal__welcome-msg">
            Enter your callsign and location to get started. These are used for the QSO exchange and ADIF export.
          </p>
        )}

        {validationError && (
          <div className="settings-modal__error" role="alert">
            {validationError}
          </div>
        )}

        <div className="settings-modal__body">
          {/* Operator section */}
          <div className="settings-modal__section">
            <h3 className="settings-modal__section-title">Operator</h3>
            <label className="settings-modal__label">
              My Callsign {required && <span className="settings-modal__required">*</span>}
              <input
                className={`settings-modal__input font-mono ${required && !myCallsign.trim() ? "settings-modal__input--invalid" : ""}`}
                value={myCallsign}
                onChange={(e) => {
                  setMyCallsign(e.target.value.toUpperCase());
                  setValidationError(null);
                }}
                autoFocus={required}
                placeholder="e.g. W1ABC"
              />
            </label>
            <label className="settings-modal__label">
              My Name
              <input
                className="settings-modal__input"
                value={myName}
                onChange={(e) => setMyName(e.target.value)}
                placeholder="e.g. Jason"
              />
            </label>
            <label className="settings-modal__label">
              My State / Province / Country {required && <span className="settings-modal__required">*</span>}
              <input
                className={`settings-modal__input ${required && !myQth.trim() ? "settings-modal__input--invalid" : ""}`}
                value={myQth}
                onChange={(e) => {
                  setMyQth(e.target.value);
                  setValidationError(null);
                }}
                placeholder="e.g. CT, ON, DL"
              />
            </label>
          </div>

          {/* Defaults section */}
          <div className="settings-modal__section">
            <h3 className="settings-modal__section-title">Logging Defaults</h3>
            <label className="settings-modal__label">Default Mode</label>
            <SegmentedButtons
              options={[...MODES]}
              value={defaultMode}
              onChange={(v) => setDefaultMode(v as Mode)}
            />
            <label className="settings-modal__label" style={{ marginTop: "0.5rem" }}>
              Default Sent RST
              <input
                className="settings-modal__input font-mono"
                value={defaultRst}
                onChange={(e) => setDefaultRst(e.target.value)}
                maxLength={3}
              />
            </label>
          </div>

          {/* Appearance section */}
          <div className="settings-modal__section">
            <h3 className="settings-modal__section-title">Appearance</h3>
            <label className="settings-modal__label">Theme</label>
            <SegmentedButtons
              options={["Light", "Dark", "System"]}
              value={theme.charAt(0).toUpperCase() + theme.slice(1)}
              onChange={(v) => setTheme(v.toLowerCase() as Theme)}
            />
          </div>

          {/* DX Cluster section */}
          {!required && (
            <div className="settings-modal__section">
              <h3 className="settings-modal__section-title">DX Cluster</h3>

              <div className="settings-modal__cluster-toggle">
                <label className="settings-modal__toggle-label">
                  <input
                    type="checkbox"
                    className="settings-modal__checkbox"
                    checked={clusterEnabled}
                    onChange={(e) => setClusterEnabled(e.target.checked)}
                  />
                  Enable DX cluster spotting
                </label>
                {clusterEnabled && (
                  <span className={`settings-modal__cluster-status ${clusterStatus.connected ? "settings-modal__cluster-status--ok" : clusterConnecting ? "settings-modal__cluster-status--connecting" : "settings-modal__cluster-status--off"}`}>
                    {clusterConnecting ? "Connecting…" : clusterStatus.connected ? `● ${clusterStatus.host}` : `○ ${clusterStatus.message}`}
                  </span>
                )}
              </div>

              {clusterEnabled && (
                <>
                  <label className="settings-modal__label">
                    Popular Servers
                    <select
                      className="settings-modal__input"
                      onChange={(e) => {
                        const server = POPULAR_SERVERS.find((s) => s.host === e.target.value);
                        if (server) {
                          setClusterHost(server.host);
                          setClusterPort(String(server.port));
                        }
                      }}
                      value={POPULAR_SERVERS.find((s) => s.host === clusterHost)?.host || ""}
                    >
                      <option value="">— Custom —</option>
                      {POPULAR_SERVERS.map((s) => (
                        <option key={s.host} value={s.host}>{s.label} ({s.host}:{s.port})</option>
                      ))}
                    </select>
                  </label>
                  <div className="settings-modal__row">
                    <label className="settings-modal__label" style={{ flex: 2 }}>
                      Host
                      <input
                        className="settings-modal__input font-mono"
                        value={clusterHost}
                        onChange={(e) => setClusterHost(e.target.value.trim())}
                        placeholder="dxc.ve7cc.net"
                      />
                    </label>
                    <label className="settings-modal__label" style={{ flex: 1 }}>
                      Port
                      <input
                        className="settings-modal__input font-mono"
                        value={clusterPort}
                        onChange={(e) => setClusterPort(e.target.value)}
                        placeholder="23"
                        maxLength={5}
                      />
                    </label>
                  </div>
                  <label className="settings-modal__label">
                    Spot window (minutes)
                    <input
                      className="settings-modal__input font-mono"
                      value={spotWindowMins}
                      onChange={(e) => setSpotWindowMins(e.target.value)}
                      placeholder="30"
                      maxLength={3}
                    />
                    <span className="settings-modal__hint">Spots older than this are hidden from the station grid</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        <div className="settings-modal__footer">
          {!required && (
            <button className="settings-modal__cancel-btn" onClick={handleClose}>Cancel</button>
          )}
          <button className="settings-modal__save-btn" onClick={handleSave}>
            {required ? "Get Started" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
