import { useContacts } from "../store/contacts";
import { STATIONS, BANDS, MODES } from "../data/stations";
import { ProgressBar } from "./ProgressBar";
import "./Statistics.css";

export function Statistics() {
  const contacts = useContacts((s) => s.contacts);

  // --- Basic counts ---
  const totalQsos = contacts.length;

  const workedCallsigns = new Set(contacts.map((c) => c.callsign));
  const colonyStations = STATIONS.filter((s) => s.type === "colony");
  const bonusStations = STATIONS.filter((s) => s.type === "bonus");

  const workedColonyCalls = colonyStations.filter((s) => workedCallsigns.has(s.callsign));
  const workedBonusCalls = bonusStations.filter((s) => workedCallsigns.has(s.callsign));

  const uniqueStations = workedCallsigns.size;
  const coloniesWorked = workedColonyCalls.length;
  const bonusWorked = workedBonusCalls.length;

  // --- Bands & Modes ---
  const workedBands = new Set(contacts.map((c) => c.band));
  const workedModes = new Set(contacts.map((c) => c.mode));
  const bandModeCombos = new Set(contacts.map((c) => `${c.band}|${c.mode}`));

  // --- Aggregations ---
  const bandCounts = new Map<string, number>();
  const modeCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  let earliest: Date | null = null;
  let latest: Date | null = null;

  for (const c of contacts) {
    bandCounts.set(c.band, (bandCounts.get(c.band) || 0) + 1);
    modeCounts.set(c.mode, (modeCounts.get(c.mode) || 0) + 1);

    const d = new Date(c.utcTime);
    const dayKey = d.toISOString().slice(0, 10);
    dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);

    if (!earliest || d < earliest) earliest = d;
    if (!latest || d > latest) latest = d;
  }

  const mostActiveBand = Array.from(bandCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const mostActiveMode = Array.from(modeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const bestDay = Array.from(dayCounts.entries()).sort((a, b) => b[1] - a[1])[0];

  // --- Rate calculations ---
  let rateText = "—";
  let activeHours = 0;
  if (earliest && latest && totalQsos > 1) {
    const diffMs = latest.getTime() - earliest.getTime();
    activeHours = diffMs / (1000 * 60 * 60);
    const rate = activeHours > 0 ? totalQsos / activeHours : 0;
    rateText = rate >= 1 ? `${rate.toFixed(1)}/hr` : `${(rate * 60).toFixed(1)}/min`;
  }

  // --- Helper for stat cards ---
  const StatCard = ({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: "gold" | "green" | "blue" }) => (
    <div className={`stats-card ${accent ? `stats-card--${accent}` : ""}`}>
      <span className="stats-card__value font-mono">{value}</span>
      <span className="stats-card__label">{label}</span>
      {sub && <span className="stats-card__sub">{sub}</span>}
    </div>
  );

  return (
    <div className="statistics">
      <div className="statistics__header">
        <h2 className="statistics__title font-display">Operating Statistics</h2>
      </div>

      {/* ── Summary cards ── */}
      <div className="statistics__grid">
        <StatCard label="Total QSOs" value={totalQsos} accent="gold" />
        <StatCard label="Unique Stations" value={uniqueStations} sub={`of ${STATIONS.length}`} accent="green" />
        <StatCard label="Colonies" value={coloniesWorked} sub={`of ${colonyStations.length}`} />
        <StatCard label="Bonus" value={bonusWorked} sub={`of ${bonusStations.length}`} />
        <StatCard label="Bands Used" value={workedBands.size} sub={`of ${BANDS.length}`} />
        <StatCard label="Modes Used" value={workedModes.size} sub={`of ${MODES.length}`} />
        <StatCard label="Band/Mode Combos" value={bandModeCombos.size} sub={`of ${BANDS.length * MODES.length}`} />
        <StatCard label="QSO Rate" value={rateText} sub={activeHours > 0 ? `${activeHours.toFixed(1)} hrs active` : undefined} />
      </div>

      {/* ── Activity breakdown ── */}
      <div className="statistics__section">
        <h3 className="statistics__section-title font-display">Activity Breakdown</h3>
        <div className="statistics__breakdown-grid">
          <div className="statistics__breakdown-card">
            <span className="statistics__breakdown-label">Most Active Band</span>
            <span className="statistics__breakdown-value font-mono">{mostActiveBand}</span>
            {bandCounts.get(mostActiveBand) && (
              <span className="statistics__breakdown-sub">{bandCounts.get(mostActiveBand)} QSOs</span>
            )}
          </div>
          <div className="statistics__breakdown-card">
            <span className="statistics__breakdown-label">Most Active Mode</span>
            <span className="statistics__breakdown-value font-mono">{mostActiveMode}</span>
            {modeCounts.get(mostActiveMode) && (
              <span className="statistics__breakdown-sub">{modeCounts.get(mostActiveMode)} QSOs</span>
            )}
          </div>
          <div className="statistics__breakdown-card">
            <span className="statistics__breakdown-label">Best Day</span>
            <span className="statistics__breakdown-value font-mono">{bestDay ? bestDay[0] : "—"}</span>
            {bestDay && <span className="statistics__breakdown-sub">{bestDay[1]} QSOs</span>}
          </div>
          <div className="statistics__breakdown-card">
            <span className="statistics__breakdown-label">Operating Span</span>
            <span className="statistics__breakdown-value font-mono">
              {earliest ? earliest.toISOString().slice(0, 10) : "—"}
            </span>
            {earliest && latest && earliest.toISOString().slice(0, 10) !== latest.toISOString().slice(0, 10) && (
              <span className="statistics__breakdown-sub">through {latest.toISOString().slice(0, 10)}</span>
            )}
            {earliest && latest && earliest.toISOString().slice(0, 10) === latest.toISOString().slice(0, 10) && (
              <span className="statistics__breakdown-sub">single day</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Award progress ── */}
      <div className="statistics__section">
        <h3 className="statistics__section-title font-display">Award Progress</h3>
        <div className="statistics__award-list">
          <div className="statistics__award-row">
            <span className="statistics__award-name">13 Colony Sweep</span>
            <ProgressBar value={coloniesWorked} max={13} variant="colony" />
            <span className="statistics__award-count font-mono">{coloniesWorked} / 13</span>
          </div>
          <div className="statistics__award-row">
            <span className="statistics__award-name">Bonus Sweep</span>
            <ProgressBar value={bonusWorked} max={3} variant="bonus" />
            <span className="statistics__award-count font-mono">{bonusWorked} / 3</span>
          </div>
          <div className="statistics__award-row">
            <span className="statistics__award-name">Full Sweep</span>
            <ProgressBar value={uniqueStations} max={STATIONS.length} variant="default" />
            <span className="statistics__award-count font-mono">{uniqueStations} / {STATIONS.length}</span>
          </div>
        </div>
      </div>

      {/* ── Needed stations ── */}
      {(coloniesWorked < 13 || bonusWorked < 3) && (
        <div className="statistics__section">
          <h3 className="statistics__section-title font-display">Still Needed</h3>
          <div className="statistics__needed-grid">
            {coloniesWorked < 13 && (
              <div className="statistics__needed-group">
                <div className="statistics__needed-label">Colonies</div>
                <div className="statistics__needed-tags">
                  {colonyStations
                    .filter((s) => !workedCallsigns.has(s.callsign))
                    .map((s) => (
                      <span key={s.callsign} className="statistics__needed-tag font-mono">
                        {s.callsign}
                      </span>
                    ))}
                </div>
              </div>
            )}
            {bonusWorked < 3 && (
              <div className="statistics__needed-group">
                <div className="statistics__needed-label">Bonus</div>
                <div className="statistics__needed-tags">
                  {bonusStations
                    .filter((s) => !workedCallsigns.has(s.callsign))
                    .map((s) => (
                      <span key={s.callsign} className="statistics__needed-tag font-mono statistics__needed-tag--bonus">
                        {s.callsign}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
