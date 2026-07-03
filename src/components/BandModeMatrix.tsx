import { useContacts } from "../store/contacts";
import { BANDS, MODES, STATION_MAP } from "../data/stations";
import "./BandModeMatrix.css";

interface BandModeMatrixProps {
  compact?: boolean;
}

export function BandModeMatrix({ compact = false }: BandModeMatrixProps) {
  const contacts = useContacts((s) => s.contacts);

  // Count unique colony/bonus stations per band×mode
  const stationMatrix = new Map<string, Set<string>>();
  for (const c of contacts) {
    if (STATION_MAP.has(c.callsign)) {
      const key = `${c.band}|${c.mode}`;
      if (!stationMatrix.has(key)) stationMatrix.set(key, new Set());
      stationMatrix.get(key)!.add(c.callsign);
    }
  }

  const displayModes = MODES;

  return (
    <div className="band-mode-matrix">
      <div className="panel-header">BAND / MODE MATRIX</div>
      <table className="band-mode-matrix__table">
        <thead>
          <tr>
            <th></th>
            {displayModes.map((m) => (
              <th key={m}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BANDS.map((band) => (
            <tr key={band}>
              <td className="band-mode-matrix__band-label">{band}</td>
              {displayModes.map((mode) => {
                const key = `${band}|${mode}`;
                const count = stationMatrix.get(key)?.size || 0;
                const cellClass = count === 0
                  ? "band-mode-matrix__cell--empty"
                  : count >= 13
                    ? "band-mode-matrix__cell--full"
                    : "band-mode-matrix__cell--partial";
                return (
                  <td key={mode} className={`band-mode-matrix__cell ${cellClass}`}>
                    <span className="font-mono">
                      {count === 0 ? "·" : compact ? String(count) : `${count}/13`}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
