import { useState, useRef, useCallback } from "react";
import { MdEdit, MdDelete, MdCheck, MdClose } from "react-icons/md";
import { useContacts } from "../store/contacts";
import { STATION_MAP } from "../data/stations";
import type { QSO } from "../store/types";
import "./LogList.css";

const DEFAULT_COL_WIDTHS = [40, 80, 60, 90, 120, 55, 70, 55, 45, 45, 50, 150, 60];

export function LogList() {
  const { contacts, deleteContact, editContact } = useContacts();
  const [sortNewest, setSortNewest] = useState(true);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<QSO>>({});
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_COL_WIDTHS);
  const colResizing = useRef<{ idx: number; startX: number; startW: number } | null>(null);
  // Separate raw strings for date and time editing to avoid crashes on intermediate input
  const [editTimeRaw, setEditTimeRaw] = useState("");
  const [editDateRaw, setEditDateRaw] = useState("");

  const handleColResizeStart = useCallback((e: React.MouseEvent, colIdx: number) => {
    e.preventDefault();
    colResizing.current = { idx: colIdx, startX: e.clientX, startW: colWidths[colIdx] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      if (!colResizing.current) return;
      const delta = ev.clientX - colResizing.current.startX;
      const newWidth = Math.max(30, colResizing.current.startW + delta);
      setColWidths((prev) => {
        const next = [...prev];
        next[colResizing.current!.idx] = newWidth;
        return next;
      });
    };

    const handleMouseUp = () => {
      colResizing.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [colWidths]);

  const sorted = sortNewest ? [...contacts] : [...contacts].reverse();
  const filtered = filter
    ? sorted.filter((c) => c.callsign.includes(filter.toUpperCase()))
    : sorted;

  const startEdit = (qso: QSO) => {
    setEditingId(qso.id);
    setEditValues({
      callsign: qso.callsign,
      qth: qso.qth,
      notes: qso.notes,
      sentRst: qso.sentRst,
      rcvdRst: qso.rcvdRst,
      utcTime: qso.utcTime,
    });
    // Initialize raw date/time strings for editing
    const d = new Date(qso.utcTime);
    if (!isNaN(d.getTime())) {
      setEditDateRaw(d.toISOString().slice(0, 10));       // YYYY-MM-DD
      setEditTimeRaw(d.toISOString().slice(11, 16));      // HH:MM
    } else {
      setEditDateRaw("");
      setEditTimeRaw("");
    }
  };

  const saveEdit = (id: string) => {
    // Recombine date + time raw strings back to ISO
    const combined = `${editDateRaw}T${editTimeRaw}:00.000Z`;
    const parsed = new Date(combined);
    const finalValues = {
      ...editValues,
      utcTime: isNaN(parsed.getTime()) ? editValues.utcTime : parsed.toISOString(),
    };
    editContact(id, finalValues);
    setEditingId(null);
    setEditValues({});
    setEditTimeRaw("");
    setEditDateRaw("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
    setEditTimeRaw("");
    setEditDateRaw("");
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toISOString().slice(0, 10); } catch { return ""; }
  };

  const formatTime = (iso: string) => {
    try { return new Date(iso).toISOString().slice(11, 16); } catch { return iso; }
  };

  return (
    <div className="log-list">
      <div className="log-list__header">
        <div className="log-list__header-left">
          <span className="panel-header" style={{ marginBottom: 0 }}>QSO LOG</span>
          <span className="log-list__count">({contacts.length} contacts)</span>
        </div>
        <div className="log-list__header-right">
          <input
            type="text"
            className="log-list__filter font-mono"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            className="log-list__sort-btn"
            onClick={() => setSortNewest(!sortNewest)}
          >
            ↑ {sortNewest ? "Newest First" : "Oldest First"}
          </button>
        </div>
      </div>

      <div className="log-list__table-wrap">
        <table className="log-list__table">
          <thead>
            <tr>
              {["#", "DATE (UTC)", "TIME (UTC)", "CALLSIGN", "COLONY / NAME", "BAND", "FREQ", "MODE", "SNT", "RCV", "QTH", "NOTES", ""].map((label, i) => (
                <th key={i} style={{ width: colWidths[i] }}>
                  {label}
                  {i < colWidths.length - 1 && (
                    <span
                      className="log-list__col-resize"
                      onMouseDown={(e) => handleColResizeStart(e, i)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((qso, idx) => {
              const station = STATION_MAP.get(qso.callsign);
              const rowNum = sortNewest ? contacts.length - idx : idx + 1;
              const isEditing = editingId === qso.id;
              const borderClass = station
                ? station.type === "colony"
                  ? "log-list__row--colony"
                  : "log-list__row--bonus"
                : "";

              // Check if this is the newest contact for gold flash
              const isNewest = contacts.length > 0 && qso.id === contacts[0].id;

              return (
                <tr
                  key={qso.id}
                  className={`log-list__row ${borderClass} ${isNewest && sortNewest && idx === 0 ? "log-list__row--new" : ""}`}
                >
                  <td className="log-list__cell-num">{rowNum}</td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input log-list__edit-input--date font-mono"
                        value={editDateRaw}
                        onChange={(e) => setEditDateRaw(e.target.value)}
                        placeholder="YYYY-MM-DD"
                      />
                    ) : (
                      formatDate(qso.utcTime)
                    )}
                  </td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input log-list__edit-input--time font-mono"
                        value={editTimeRaw}
                        onChange={(e) => setEditTimeRaw(e.target.value)}
                        placeholder="HH:MM"
                      />
                    ) : (
                      formatTime(qso.utcTime)
                    )}
                  </td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.callsign || ""}
                        onChange={(e) => setEditValues({ ...editValues, callsign: e.target.value.toUpperCase() })}
                      />
                    ) : (
                      qso.callsign
                    )}
                  </td>
                  <td>{qso.colonyName || station?.name || "—"}</td>
                  <td className="font-mono">{qso.band}</td>
                  <td className="font-mono">{qso.frequency || "—"}</td>
                  <td className="font-mono">{qso.mode}</td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.sentRst || ""}
                        onChange={(e) => setEditValues({ ...editValues, sentRst: e.target.value })}
                      />
                    ) : (
                      qso.sentRst
                    )}
                  </td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.rcvdRst || ""}
                        onChange={(e) => setEditValues({ ...editValues, rcvdRst: e.target.value })}
                      />
                    ) : (
                      qso.rcvdRst
                    )}
                  </td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.qth || ""}
                        onChange={(e) => setEditValues({ ...editValues, qth: e.target.value })}
                      />
                    ) : (
                      qso.qth
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        className="log-list__edit-input"
                        value={editValues.notes || ""}
                        onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(qso.id); if (e.key === "Escape") cancelEdit(); }}
                      />
                    ) : (
                      qso.notes
                    )}
                  </td>
                  <td className="log-list__actions">
                    {isEditing ? (
                      <>
                        <button className="log-list__action-btn" onClick={() => saveEdit(qso.id)} title="Save"><MdCheck size={14} /></button>
                        <button className="log-list__action-btn" onClick={cancelEdit} title="Cancel"><MdClose size={14} /></button>
                      </>
                    ) : deleteConfirm === qso.id ? (
                      <span className="log-list__delete-confirm">
                        Delete?{" "}
                        <button onClick={() => { deleteContact(qso.id); setDeleteConfirm(null); }}>Yes</button>
                        <button onClick={() => setDeleteConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <>
                        <button className="log-list__action-btn" onClick={() => startEdit(qso)} title="Edit"><MdEdit size={14} /></button>
                        <button className="log-list__action-btn" onClick={() => setDeleteConfirm(qso.id)} title="Delete"><MdDelete size={14} /></button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
