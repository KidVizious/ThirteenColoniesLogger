import { useState, useRef, useEffect, useCallback } from "react";
import { MdAccessTime } from "react-icons/md";
import { useContacts } from "../store/contacts";
import { useSettings } from "../store/settings";
import { STATION_MAP, BAND_ROW_1, BAND_ROW_2, MODES, freqToBand } from "../data/stations";
import type { Band, Mode } from "../data/stations";
import { SegmentedButtons } from "./SegmentedButtons";
import "./ContactEntry.css";

interface ContactEntryProps {
  onToast: (msg: string) => void;
  prefill?: { callsign: string; frequency: string; mode: string } | null;
}

function getRstForMode(mode: Mode): string {
  return mode === "SSB" ? "59" : "599";
}

export function ContactEntry({ onToast, prefill }: ContactEntryProps) {
  const addContact = useContacts((s) => s.addContact);
  const isDupe = useContacts((s) => s.isDupe);
  const undoLastContact = useContacts((s) => s.undoLastContact);
  const lastLoggedAt = useContacts((s) => s.lastLoggedAt);
  const lastLoggedId = useContacts((s) => s.lastLoggedId);
  const contacts = useContacts((s) => s.contacts);
  const defaultMode = useSettings((s) => s.defaultMode);

  const [callsign, setCallsign] = useState("");
  const [band, setBand] = useState<Band>("20m");
  const [frequency, setFrequency] = useState("");
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [sentRst, setSentRst] = useState(getRstForMode(defaultMode));
  const [rcvdRst, setRcvdRst] = useState(getRstForMode(defaultMode));
  const [qth, setQth] = useState("");
  const [notes, setNotes] = useState("");
  const [logged, setLogged] = useState(false);
  const [undoCountdown, setUndoCountdown] = useState<number | null>(null);

  const callRef = useRef<HTMLInputElement>(null);
  const undoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // UTC clock
  const [utcTime, setUtcTime] = useState(new Date().toISOString());
  const [editingTime, setEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState("");

  // Handle prefill from spot click
  useEffect(() => {
    if (!prefill) return;
    setCallsign(prefill.callsign);
    setFrequency(prefill.frequency);
    // Auto-detect band from frequency
    const mhz = parseFloat(prefill.frequency);
    if (!isNaN(mhz) && mhz > 0) {
      const detected = freqToBand(mhz);
      if (detected) setBand(detected);
    }
    // Set mode and RST defaults for that mode
    const m = prefill.mode as Mode;
    if (MODES.includes(m)) {
      setMode(m);
      setSentRst(getRstForMode(m));
      setRcvdRst(getRstForMode(m));
    }
    // Pre-fill QTH from station data
    const station = STATION_MAP.get(prefill.callsign);
    if (station) setQth(station.state);
    // Focus callsign field
    setTimeout(() => callRef.current?.focus(), 50);
  }, [prefill]);

  useEffect(() => {
    if (editingTime) return;
    const interval = setInterval(() => setUtcTime(new Date().toISOString()), 1000);
    return () => clearInterval(interval);
  }, [editingTime]);

  // Colony recognition
  const station = STATION_MAP.get(callsign);
  const dupeDetected = callsign.length >= 3 && isDupe(callsign, band, mode);

  // Auto-fill QTH on colony match
  useEffect(() => {
    if (station) {
      setQth(station.state);
    }
  }, [station]);

  // Mode → RST auto-fill
  const handleModeChange = (m: Mode) => {
    setMode(m);
    const rst = getRstForMode(m);
    setSentRst(rst);
    setRcvdRst(rst);
  };

  // Undo countdown
  useEffect(() => {
    if (lastLoggedAt && Date.now() - lastLoggedAt < 10000) {
      setUndoCountdown(10);
      undoTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - lastLoggedAt;
        const remaining = Math.max(0, 10 - Math.floor(elapsed / 1000));
        if (remaining <= 0) {
          setUndoCountdown(null);
          if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        } else {
          setUndoCountdown(remaining);
        }
      }, 500);
      return () => {
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
      };
    } else {
      setUndoCountdown(null);
    }
  }, [lastLoggedAt]);

  const handleLog = useCallback(() => {
    if (!callsign.trim()) return;

    addContact({
      callsign: callsign.toUpperCase(),
      band,
      mode,
      frequency,
      sentRst,
      rcvdRst,
      qth,
      notes,
      utcTime: editingTime ? new Date(editTimeValue || utcTime).toISOString() : utcTime,
    });

    // Check sweep completion
    const workedStations = new Set(contacts.map((c) => c.callsign));
    workedStations.add(callsign.toUpperCase());
    const colonies = ["K2A","K2B","K2C","K2D","K2E","K2F","K2G","K2H","K2I","K2J","K2K","K2L","K2M"];
    const allColonies = colonies.every((c) => workedStations.has(c));
    if (allColonies && !colonies.every((c) => new Set(contacts.map((q) => q.callsign)).has(c))) {
      onToast("13 Colony Sweep Complete!");
    }

    setLogged(true);
    setTimeout(() => setLogged(false), 800);

    // Reset form — keep band, mode, frequency
    setCallsign("");
    setQth("");
    setNotes("");
    setSentRst(getRstForMode(mode));
    setRcvdRst(getRstForMode(mode));
    setEditingTime(false);

    setTimeout(() => callRef.current?.focus(), 50);
  }, [callsign, band, mode, frequency, sentRst, rcvdRst, qth, notes, utcTime, editingTime, editTimeValue, addContact, contacts, onToast]);

  const handleCallsignKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLog();
    }
  };

  const handleNotesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLog();
    }
  };

  // Enter from any field logs the contact if minimum required info is present
  const handleFieldKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLog();
    }
  };

  const lastQso = lastLoggedId ? contacts.find((c) => c.id === lastLoggedId) : null;

  const formatUtc = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().slice(11, 19);
  };

  const formatUtcDate = (iso: string) => {
    const d = new Date(iso);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="contact-entry">
      <div className="panel-header">CONTACT ENTRY</div>

      {/* Callsign */}
      <div className="contact-entry__field">
        <label className="contact-entry__label">CALLSIGN</label>
        <div className={`contact-entry__input-wrap ${dupeDetected ? "contact-entry__input-wrap--dupe" : ""}`}>
          <input
            id="callsign-input"
            ref={callRef}
            tabIndex={1}
            type="text"
            className="contact-entry__input contact-entry__input--callsign font-mono"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase())}
            onKeyDown={handleCallsignKeyDown}
            placeholder="Enter callsign..."
            autoComplete="off"
            spellCheck={false}
          />
          {dupeDetected && (
            <span className="contact-entry__dupe-badge">DUPE</span>
          )}
        </div>
        {station && (
          <span className="contact-entry__colony-label">
            → {station.name} ({station.type === "colony" ? `Colony #${station.number}` : "Bonus"})
          </span>
        )}
        {dupeDetected && (
          <span className="contact-entry__dupe-hint">
            Already logged on {band} {mode}
          </span>
        )}
      </div>

      {/* Frequency */}
      <div className="contact-entry__field">
        <label className="contact-entry__label">FREQUENCY (MHz)</label>
        <input
          tabIndex={2}
          type="text"
          className="contact-entry__input font-mono"
          value={frequency}
          onChange={(e) => {
            const val = e.target.value;
            setFrequency(val);
            const mhz = parseFloat(val);
            if (!isNaN(mhz) && mhz > 0) {
              const detected = freqToBand(mhz);
              if (detected) setBand(detected);
            }
          }}
          onKeyDown={handleFieldKeyDown}
          placeholder="e.g. 14.074"
        />
      </div>

      {/* Band — below frequency; tab skips over if frequency is entered */}
      <div className="contact-entry__field">
        <label className="contact-entry__label">BAND</label>
        <SegmentedButtons
          options={BAND_ROW_1}
          value={band}
          onChange={(v) => { setBand(v as Band); setFrequency(""); }}
          tabIndex={frequency.trim() ? -1 : 3}
        />
        <SegmentedButtons
          options={BAND_ROW_2}
          value={band}
          onChange={(v) => { setBand(v as Band); setFrequency(""); }}
          tabIndex={-1}
        />
      </div>

      {/* Mode */}
      <div className="contact-entry__field">
        <label className="contact-entry__label">MODE</label>
        <SegmentedButtons
          options={[...MODES]}
          value={mode}
          onChange={(v) => handleModeChange(v as Mode)}
          tabIndex={frequency.trim() ? 3 : 4}
        />
      </div>

      {/* RST Row */}
      <div className="contact-entry__rst-row">
        <div className="contact-entry__field contact-entry__field--half">
          <label className="contact-entry__label">SENT RST</label>
          <input
            tabIndex={frequency.trim() ? 4 : 5}
            type="text"
            className="contact-entry__input font-mono"
            value={sentRst}
            onChange={(e) => setSentRst(e.target.value)}
            onKeyDown={handleFieldKeyDown}
            maxLength={3}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="contact-entry__field contact-entry__field--half">
          <label className="contact-entry__label">RCVD RST</label>
          <input
            tabIndex={frequency.trim() ? 5 : 6}
            type="text"
            className="contact-entry__input font-mono"
            value={rcvdRst}
            onChange={(e) => setRcvdRst(e.target.value)}
            onKeyDown={handleFieldKeyDown}
            maxLength={3}
            onFocus={(e) => e.target.select()}
          />
        </div>
      </div>

      {/* QTH */}
      <div className="contact-entry__field">
        <label className="contact-entry__label">THEIR STATE / COUNTRY</label>
        <input
          tabIndex={frequency.trim() ? 6 : 7}
          type="text"
          className="contact-entry__input font-mono"
          value={qth}
          onChange={(e) => setQth(e.target.value.toUpperCase())}
          onKeyDown={handleFieldKeyDown}
          placeholder="e.g. NY, ON, G"
        />
      </div>

      {/* Notes */}
      <div className="contact-entry__field">
        <label className="contact-entry__label">NOTES (optional)</label>
        <textarea
          tabIndex={frequency.trim() ? 7 : 8}
          className="contact-entry__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={handleNotesKeyDown}
          rows={2}
        />
      </div>

      {/* UTC Time */}
      <div className="contact-entry__utc">
        <MdAccessTime size={14} />
        {editingTime ? (
          <input
            type="text"
            className="contact-entry__utc-input font-mono"
            value={editTimeValue}
            onChange={(e) => setEditTimeValue(e.target.value)}
            onBlur={() => setEditingTime(false)}
            onKeyDown={(e) => { if (e.key === "Enter") setEditingTime(false); }}
            autoFocus
            placeholder="HH:MM:SS"
          />
        ) : (
          <span
            className="contact-entry__utc-display font-mono"
            onClick={() => {
              setEditingTime(true);
              setEditTimeValue(formatUtc(utcTime));
            }}
          >
            {formatUtc(utcTime)} UTC
          </span>
        )}
        <span className="contact-entry__utc-date">{formatUtcDate(utcTime)}</span>
        {editingTime && <span className="contact-entry__editing-hint">(editing)</span>}
      </div>

      {/* Log It Button */}
      <button
        tabIndex={9}
        className="contact-entry__log-btn font-display"
        onClick={handleLog}
        disabled={!callsign.trim()}
      >
        {logged ? "✓ LOGGED" : "LOG IT"}
      </button>

      {/* Undo window */}
      {undoCountdown !== null && undoCountdown > 0 && lastQso && (
        <button className="contact-entry__undo" onClick={undoLastContact}>
          Undo last entry ({lastQso.callsign} {lastQso.band} {lastQso.mode}) ← {undoCountdown}s
        </button>
      )}
    </div>
  );
}
