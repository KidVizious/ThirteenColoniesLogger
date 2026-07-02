import { useContacts } from "../store/contacts";
import { STATIONS } from "../data/stations";
import { ProgressBar } from "./ProgressBar";
import "./SweepTracker.css";

export function SweepTracker() {
  const contacts = useContacts((s) => s.contacts);

  const workedCallsigns = new Set(contacts.map((c) => c.callsign));
  const colonies = STATIONS.filter((s) => s.type === "colony");
  const bonusStations = STATIONS.filter((s) => s.type === "bonus");

  const workedColonies = colonies.filter((s) => workedCallsigns.has(s.callsign));
  const workedBonus = bonusStations.filter((s) => workedCallsigns.has(s.callsign));

  const colonySweep = workedColonies.length === 13;
  const hasWM3PEN = workedCallsigns.has("WM3PEN");
  const fullSweep = colonySweep && workedBonus.length === 3;

  const neededColonies = colonies.filter((s) => !workedCallsigns.has(s.callsign));
  const neededBonus = bonusStations.filter((s) => !workedCallsigns.has(s.callsign));

  return (
    <div className="sweep-tracker">
      <div className="sweep-tracker__bars">
        <div className="sweep-tracker__bar-group">
          <span className="sweep-tracker__bar-label">COLONIES</span>
          <ProgressBar value={workedColonies.length} max={13} variant="colony" />
          <span className="sweep-tracker__bar-count">{workedColonies.length} / 13</span>
        </div>
        <div className="sweep-tracker__bar-group">
          <span className="sweep-tracker__bar-label">BONUS</span>
          <ProgressBar value={workedBonus.length} max={3} variant="bonus" />
          <span className="sweep-tracker__bar-count">{workedBonus.length} / 3</span>
        </div>
      </div>

      {/* Achievement badges */}
      <div className="sweep-tracker__achievements">
        <span className={`sweep-tracker__badge ${colonySweep ? "sweep-tracker__badge--achieved" : ""}`}>
          13 COLONIES SWEEP
        </span>
        <span className={`sweep-tracker__badge ${colonySweep && hasWM3PEN ? "sweep-tracker__badge--achieved" : ""}`}>
          + WM3PEN
        </span>
        <span className={`sweep-tracker__badge ${fullSweep ? "sweep-tracker__badge--achieved" : ""}`}>
          FULL SWEEP
        </span>
      </div>

      {/* Needed stations */}
      {(neededColonies.length > 0 || neededBonus.length > 0) ? (
        <div className="sweep-tracker__needed">
          Need for sweep:{" "}
          {[...neededColonies, ...neededBonus].map((s) => s.callsign).join(" · ")}
        </div>
      ) : (
        <div className="sweep-tracker__needed sweep-tracker__needed--complete">
          Full Sweep Achieved!
        </div>
      )}
    </div>
  );
}
