import { useContacts } from "../store/contacts";
import { useSettings } from "../store/settings";
import { useCluster, getActiveSpots } from "../store/cluster";
import { STATIONS } from "../data/stations";
import { StationTile } from "./StationTile";
import "./StationGrid.css";

export function StationGrid() {
  const contacts = useContacts((s) => s.contacts);
  const spotWindowMins = useSettings((s) => s.spotWindowMins);
  const clusterEnabled = useSettings((s) => s.clusterEnabled);
  const spots = useCluster((s) => s.spots);

  const activeSpots = clusterEnabled ? getActiveSpots(spots, spotWindowMins) : new Map();

  const colonies = STATIONS.filter((s) => s.type === "colony");
  const bonus = STATIONS.filter((s) => s.type === "bonus");

  return (
    <div className="station-grid">
      <div className="panel-header">STATION GRID</div>
      <div className="station-grid__colonies" role="grid">
        {colonies.map((station) => (
          <StationTile
            key={station.callsign}
            station={station}
            contacts={contacts}
            activeSpot={activeSpots.get(station.callsign)}
          />
        ))}
      </div>
      <div className="panel-header" style={{ marginTop: "0.75rem" }}>BONUS STATIONS</div>
      <div className="station-grid__bonus" role="grid">
        {bonus.map((station) => (
          <StationTile
            key={station.callsign}
            station={station}
            contacts={contacts}
            activeSpot={activeSpots.get(station.callsign)}
          />
        ))}
      </div>
    </div>
  );
}
