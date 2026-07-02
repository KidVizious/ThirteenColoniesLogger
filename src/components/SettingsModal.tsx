import { useState } from "react";
import { MdClose } from "react-icons/md";
import { useSettings } from "../store/settings";
import { MODES } from "../data/stations";
import type { Mode } from "../data/stations";
import type { Theme } from "../store/types";
import { SegmentedButtons } from "./SegmentedButtons";
import "./SettingsModal.css";

interface SettingsModalProps {
  onClose: () => void;
  /** When true, callsign and QTH are required before the modal can be closed. */
  required?: boolean;
}

export function SettingsModal({ onClose, required = false }: SettingsModalProps) {
  const settings = useSettings();
  const [myCallsign, setMyCallsign] = useState(settings.myCallsign);
  const [myName, setMyName] = useState(settings.myName);
  const [myQth, setMyQth] = useState(settings.myQth);
  const [defaultMode, setDefaultMode] = useState(settings.defaultMode);
  const [defaultRst, setDefaultRst] = useState(settings.defaultRst);
  const [theme, setTheme] = useState(settings.theme);
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
    });
    // Persist to SQLite backend
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
