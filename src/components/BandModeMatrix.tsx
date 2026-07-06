import { useContacts } from "../store/contacts";
import { BANDS, MODES, STATION_MAP, STATIONS } from "../data/stations";
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

  const colonyCount = STATIONS.filter(s => s.type === "colony").length;
  const bonusCount = STATIONS.filter(s => s.type === "bonus").length;
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
                const workedCallsigns = stationMatrix.get(key) || new Set();

                const worked = Array.from(workedCallsigns).sort();
                const workedColonies = worked.filter(call => STATION_MAP.get(call)?.type === "colony");
                const workedBonusList = worked.filter(call => STATION_MAP.get(call)?.type === "bonus");

                const coloniesWorked = workedColonies.length;
                const bonusWorked = workedBonusList.length;
                const totalWorked = coloniesWorked + bonusWorked;

                const cellClass = totalWorked === 0
                  ? "band-mode-matrix__cell--empty"
                  : totalWorked >= (colonyCount + bonusCount)
                    ? "band-mode-matrix__cell--full"
                    : "band-mode-matrix__cell--partial";

                return (
                  <td
                    key={mode}
                    className={`band-mode-matrix__cell ${cellClass}`}
                  >
                    {totalWorked === 0 ? (
                      <span className="font-mono">·</span>
                    ) : compact ? (
                      <span className="font-mono">{totalWorked}</span>
                    ) : (
                      <div className="band-mode-matrix__cell-stacks">
                        <span className={`font-mono ${coloniesWorked >= colonyCount ? "band-mode-matrix__cell-stack--achieved" : ""}`}>
                          {coloniesWorked}/{colonyCount}
                        </span>
                        <span className={`font-mono ${bonusWorked >= bonusCount ? "band-mode-matrix__cell-stack--achieved" : ""}`}>
                          {bonusWorked}/{bonusCount}
                        </span>
                      </div>
                    )}

                    {totalWorked > 0 && (
                      <div className="band-mode-matrix__tooltip" role="tooltip">
                        <div className="band-mode-matrix__tooltip-header">
                          {band} · {mode}
                        </div>
                        {workedColonies.length > 0 && (
                          <div className="band-mode-matrix__tooltip-section">
                            <div className="band-mode-matrix__tooltip-section-label">
                              Colonies <span className="band-mode-matrix__tooltip-count">{coloniesWorked}/{colonyCount}</span>
                            </div>
                            <ul className="band-mode-matrix__tooltip-list">
                              {workedColonies.map(call => (
                                <li key={call} className="font-mono">{call}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {workedBonusList.length > 0 && (
                          <div className="band-mode-matrix__tooltip-section">
                            <div className="band-mode-matrix__tooltip-section-label">
                              Bonus <span className="band-mode-matrix__tooltip-count">{bonusWorked}/{bonusCount}</span>
                            </div>
                            <ul className="band-mode-matrix__tooltip-list band-mode-matrix__tooltip-list--bonus">
                              {workedBonusList.map(call => (
                                <li key={call} className="font-mono">{call}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
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
