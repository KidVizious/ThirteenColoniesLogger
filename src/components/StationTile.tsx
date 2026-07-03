import { useState } from "react";
import type { Station } from "../data/stations";
import type { QSO } from "../store/types";
import type { DxSpot } from "../store/cluster";
import { MODES } from "../data/stations";
import "./StationTile.css";

/** Format a frequency in MHz, preserving full kHz precision and stripping trailing zeros.
 *  DX cluster kHz values have at most 1 decimal place (e.g. 14046.25 kHz → 14.04625 MHz),
 *  so we need up to 5 decimal places. */
function formatFreq(mhz: number): string {
  return parseFloat(mhz.toFixed(5)).toString();
}

interface StationTileProps {
  station: Station;
  contacts: QSO[];
  activeSpot?: DxSpot;
  onSpotClick?: (spot: DxSpot) => void;
}

export function StationTile({ station, contacts, activeSpot, onSpotClick }: StationTileProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const stationContacts = contacts.filter((c) => c.callsign === station.callsign);
  const isWorked = stationContacts.length > 0;
  const isBonus = station.type === "bonus";

  // Whether this spot is for a new band/mode opportunity
  const spotIsNewBandMode = activeSpot
    ? !stationContacts.some((c) => c.band === activeSpot.band && c.mode === activeSpot.mode)
    : false;
  const spotIsNewStation = activeSpot ? !isWorked : false;

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
    activeSpot ? (spotIsNewStation ? "station-tile--spot-new" : spotIsNewBandMode ? "station-tile--spot-bandmode" : "station-tile--spot") : "",
  ].filter(Boolean).join(" ");

  const firstWorkedTime = stationContacts.length > 0
    ? new Date(stationContacts[stationContacts.length - 1].utcTime).toISOString().slice(11, 16)
    : null;

  // How many minutes ago was the spot
  const spotAgeMin = activeSpot
    ? Math.round((Date.now() - new Date(activeSpot.utc_time).getTime()) / 60000)
    : null;

  return (
    <div
      className={tileClass}
      role="gridcell"
      aria-label={`${station.callsign} ${station.name}, ${isWorked ? "worked" : "not yet worked"}${activeSpot ? ", spotted" : ""}`}
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

      {/* Spot badge */}
      {activeSpot && (
        <div
          className={`station-tile__spot-badge station-tile__spot-badge--clickable ${spotIsNewStation ? "station-tile__spot-badge--new" : spotIsNewBandMode ? "station-tile__spot-badge--bandmode" : ""}`}
          onClick={(e) => { e.stopPropagation(); onSpotClick?.(activeSpot); }}
          title="Click to prefill contact entry"
        >
          <span className="station-tile__spot-freq font-mono">{formatFreq(activeSpot.frequency)}</span>
          <span className="station-tile__spot-mode">{activeSpot.mode}</span>
          <span className="station-tile__spot-age">{spotAgeMin === 0 ? "<1m" : `${spotAgeMin}m`}</span>
        </div>
      )}

      <div className="station-tile__pips">
        {MODES.map((m) => (
          <span
            key={m}
            className={`station-tile__pip ${workedModes.has(m) ? "station-tile__pip--filled" : ""}`}
            title={m}
          />
        ))}
      </div>

      {/* Hover tooltip */}
      {showTooltip && (
        <div className="station-tile__tooltip">
          <div className="station-tile__tooltip-header">
            {station.callsign} – {station.name}
          </div>
          <div className="station-tile__tooltip-meta">
            {station.type === "colony" ? `Colony #${station.number}` : "Bonus"}
            {firstWorkedTime && ` · First worked: ${firstWorkedTime}`}
          </div>
          {activeSpot && (
            <div className="station-tile__tooltip-spot">
              📡 Spotted: {formatFreq(activeSpot.frequency)} MHz · {activeSpot.mode}
              {spotIsNewStation && " · Not yet worked!"}
              {spotIsNewBandMode && ` · New ${activeSpot.band} ${activeSpot.mode}!`}
            </div>
          )}
          {isWorked && (
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
          )}
          {stationContacts.length > 0 && (
            <div className="station-tile__tooltip-count">
              {stationContacts.length} QSO{stationContacts.length !== 1 ? "s" : ""} total
            </div>
          )}
        </div>
      )}
    </div>
  );
}
