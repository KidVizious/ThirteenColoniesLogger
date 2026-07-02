import { useState } from "react";
import type { Station } from "../data/stations";
import type { QSO } from "../store/types";
import { MODES } from "../data/stations";
import "./StationTile.css";

interface StationTileProps {
  station: Station;
  contacts: QSO[];
}

export function StationTile({ station, contacts }: StationTileProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const stationContacts = contacts.filter((c) => c.callsign === station.callsign);
  const isWorked = stationContacts.length > 0;
  const isBonus = station.type === "bonus";

  // Which modes have been worked
  const workedModes = new Set(stationContacts.map((c) => c.mode));

  // Build band×mode matrix for tooltip
  const bandModeMap = new Map<string, Set<string>>();
  for (const c of stationContacts) {
    if (!bandModeMap.has(c.band)) bandModeMap.set(c.band, new Set());
    bandModeMap.get(c.band)!.add(c.mode);
  }

  const tileClass = [
    "station-tile",
    isWorked ? (isBonus ? "station-tile--bonus-worked" : "station-tile--worked") : "",
    !isWorked && isBonus ? "station-tile--bonus-needed" : "",
  ].filter(Boolean).join(" ");

  const firstWorkedTime = stationContacts.length > 0
    ? new Date(stationContacts[stationContacts.length - 1].utcTime).toISOString().slice(11, 16)
    : null;

  return (
    <div
      className={tileClass}
      role="gridcell"
      aria-label={`${station.callsign} ${station.name}, ${isWorked ? "worked" : "not yet worked"}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="station-tile__header">
        <span className="station-tile__callsign font-mono">
          {isWorked && <span className="station-tile__check">✓</span>}
          {station.callsign}
        </span>
        <span className="station-tile__number">
          {isBonus ? station.country : `#${station.number}`}
        </span>
      </div>
      <span className="station-tile__name">{station.name}</span>
      <div className="station-tile__pips">
        {(["SSB", "CW", "RTTY", "FT8", "DIG"] as const).map((m) => (
          <span
            key={m}
            className={`station-tile__pip ${workedModes.has(m) ? "station-tile__pip--filled" : ""}`}
            title={m}
          />
        ))}
      </div>

      {/* Hover tooltip */}
      {showTooltip && isWorked && (
        <div className="station-tile__tooltip">
          <div className="station-tile__tooltip-header">
            {station.callsign} – {station.name}
          </div>
          <div className="station-tile__tooltip-meta">
            {station.type === "colony" ? `Colony #${station.number}` : "Bonus"} · First worked: {firstWorkedTime}
          </div>
          <table className="station-tile__tooltip-matrix">
            <thead>
              <tr>
                <th></th>
                {MODES.map((m) => <th key={m}>{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from(bandModeMap.entries()).map(([band, modes]) => (
                <tr key={band}>
                  <td>{band}</td>
                  {MODES.map((m) => (
                    <td key={m}>{modes.has(m) ? "●" : "○"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="station-tile__tooltip-count">
            {stationContacts.length} QSO{stationContacts.length !== 1 ? "s" : ""} total
          </div>
        </div>
      )}
    </div>
  );
}
