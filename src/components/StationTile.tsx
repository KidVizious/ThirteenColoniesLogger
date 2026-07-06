import { useState, useEffect, useCallback } from "react";
import type { Station } from "../data/stations";
import type { QSO } from "../store/types";
import type { DxSpot } from "../store/cluster";
import { MODES } from "../data/stations";
import "./StationTile.css";

/** Format a frequency in MHz, preserving full kHz precision and stripping trailing zeros. */
function formatFreq(mhz: number): string {
  return parseFloat(mhz.toFixed(5)).toString();
}

/** Age in minutes of a spot, as human-readable text */
function spotAgeText(spot: DxSpot): string {
  const min = Math.round((Date.now() - new Date(spot.utc_time).getTime()) / 60000);
  return min === 0 ? "<1m" : `${min}m`;
}

interface StationTileProps {
  station: Station;
  contacts: QSO[];
  activeSpots?: DxSpot[];
  onSpotClick?: (spot: DxSpot) => void;
}

export function StationTile({ station, contacts, activeSpots, onSpotClick }: StationTileProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [spotIndex, setSpotIndex] = useState(0);

  const stationContacts = contacts.filter((c) => c.callsign === station.callsign);
  const isWorked = stationContacts.length > 0;
  const isBonus = station.type === "bonus";

  const hasSpots = activeSpots && activeSpots.length > 0;
  const activeSpot = hasSpots ? activeSpots![spotIndex] : undefined;
  const spotCount = activeSpots?.length ?? 0;

  // Cycle through spots every 3 seconds if there are multiple
  useEffect(() => {
    if (!hasSpots || spotCount <= 1) return;
    setSpotIndex(0);
    const interval = setInterval(() => {
      setSpotIndex((i) => (i + 1) % spotCount);
    }, 3000);
    return () => clearInterval(interval);
  }, [hasSpots, spotCount]);

  // Whether the currently cycled spot is a new opportunity
  const spotIsNewBandMode = activeSpot
    ? !stationContacts.some((c) => c.band === activeSpot.band && c.mode === activeSpot.mode)
    : false;
  const spotIsNewStation = activeSpot ? !isWorked : false;

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

  // Click handler for a specific spot (used by both badge and tooltip list)
  const handleSpotClick = useCallback((e: React.MouseEvent, spot: DxSpot) => {
    e.stopPropagation();
    onSpotClick?.(spot);
  }, [onSpotClick]);

  return (
    <div
      className={tileClass}
      role="gridcell"
      aria-label={`${station.callsign} ${station.name}, ${isWorked ? "worked" : "not yet worked"}${hasSpots ? ", spotted" : ""}`}
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

      {/* Spot badge — cycles through active spots */}
      {activeSpot && (
        <div
          className={`station-tile__spot-badge station-tile__spot-badge--clickable ${spotIsNewStation ? "station-tile__spot-badge--new" : spotIsNewBandMode ? "station-tile__spot-badge--bandmode" : ""}`}
          onClick={(e) => handleSpotClick(e, activeSpot)}
          title="Click to prefill contact entry"
        >
          <span className="station-tile__spot-freq font-mono">{formatFreq(activeSpot.frequency)}</span>
          <span className="station-tile__spot-mode">{activeSpot.mode}</span>
          <span className="station-tile__spot-band">{activeSpot.band}</span>
          <span className="station-tile__spot-age">{spotAgeText(activeSpot)}</span>
          {spotCount > 1 && (
            <span className="station-tile__spot-cycle">{spotIndex + 1}/{spotCount}</span>
          )}
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

          {/* All active spots list */}
          {activeSpots && activeSpots.length > 0 && (
            <div className="station-tile__tooltip-spots">
              <div className="station-tile__tooltip-spots-header">
                📡 Active Spots ({activeSpots.length})
              </div>
              <ul className="station-tile__tooltip-spots-list">
                {activeSpots.map((spot, i) => {
                  const isThisNewBandMode = !stationContacts.some(
                    (c) => c.band === spot.band && c.mode === spot.mode
                  );
                  return (
                    <li
                      key={`${spot.spotter}-${spot.band}-${spot.mode}-${i}`}
                      className={`station-tile__tooltip-spots-item ${i === spotIndex && activeSpots.length > 1 ? "station-tile__tooltip-spots-item--current" : ""}`}
                      onClick={(e) => handleSpotClick(e, spot)}
                    >
                      <span className="station-tile__tooltip-spots-freq font-mono">{formatFreq(spot.frequency)}</span>
                      <span className="station-tile__tooltip-spots-band">{spot.band}</span>
                      <span className="station-tile__tooltip-spots-mode">{spot.mode}</span>
                      <span className="station-tile__tooltip-spots-age">{spotAgeText(spot)}</span>
                      {isThisNewBandMode && <span className="station-tile__tooltip-spots-badge">new</span>}
                    </li>
                  );
                })}
              </ul>
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
