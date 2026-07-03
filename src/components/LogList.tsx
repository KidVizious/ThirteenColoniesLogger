import { useState, useRef, useCallback } from "react";
import { MdEdit, MdDelete, MdCheck, MdClose } from "react-icons/md";
import { useContacts } from "../store/contacts";
import { STATION_MAP, BANDS, MODES } from "../data/stations";
import type { Band, Mode } from "../data/stations";
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
      band: qso.band,
      mode: qso.mode,
      frequency: qso.frequency,
      sentRst: qso.sentRst,
      rcvdRst: qso.rcvdRst,
      qth: qso.qth,
      notes: qso.notes,
      utcTime: qso.utcTime,
    });
    const d = new Date(qso.utcTime);
    if (!isNaN(d.getTime())) {
      setEditDateRaw(d.toISOString().slice(0, 10));
      setEditTimeRaw(d.toISOString().slice(11, 16));
    } else {
      setEditDateRaw("");
      setEditTimeRaw("");
    }
  };

  const saveEdit = (id: string) => {
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

  // Shared Enter/Escape key handler for all edit inputs
  const editKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") { e.preventDefault(); saveEdit(id); }
    if (e.key === "Escape") { e.preventDefault(); cancelEdit(); }
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
              const station = STATION_MAP.get(editValues.callsign?.toUpperCase() ?? qso.callsign)
                           ?? STATION_MAP.get(qso.callsign);
              const rowNum = sortNewest ? contacts.length - idx : idx + 1;
              const isEditing = editingId === qso.id;
              const borderClass = STATION_MAP.get(qso.callsign)
                ? STATION_MAP.get(qso.callsign)!.type === "colony"
                  ? "log-list__row--colony"
                  : "log-list__row--bonus"
                : "";
              const isNewest = contacts.length > 0 && qso.id === contacts[0].id;

              return (
                <tr
                  key={qso.id}
                  className={`log-list__row ${borderClass} ${isNewest && sortNewest && idx === 0 ? "log-list__row--new" : ""} ${isEditing ? "log-list__row--editing" : ""}`}
                >
                  {/* # */}
                  <td className="log-list__cell-num">{rowNum}</td>

                  {/* DATE */}
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input log-list__edit-input--date font-mono"
                        value={editDateRaw}
                        onChange={(e) => setEditDateRaw(e.target.value)}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                        placeholder="YYYY-MM-DD"
                      />
                    ) : formatDate(qso.utcTime)}
                  </td>

                  {/* TIME */}
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input log-list__edit-input--time font-mono"
                        value={editTimeRaw}
                        onChange={(e) => setEditTimeRaw(e.target.value)}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                        placeholder="HH:MM"
                      />
                    ) : formatTime(qso.utcTime)}
                  </td>

                  {/* CALLSIGN */}
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.callsign || ""}
                        onChange={(e) => setEditValues({ ...editValues, callsign: e.target.value.toUpperCase() })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                      />
                    ) : qso.callsign}
                  </td>

                  {/* COLONY / NAME — auto-derived, read-only */}
                  <td>
                    {station?.name || qso.colonyName || "—"}
                  </td>

                  {/* BAND */}
                  <td className="font-mono">
                    {isEditing ? (
                      <select
                        className="log-list__edit-select font-mono"
                        value={editValues.band || qso.band}
                        onChange={(e) => setEditValues({ ...editValues, band: e.target.value as Band })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                      >
                        {BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    ) : qso.band}
                  </td>

                  {/* FREQ */}
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.frequency ?? qso.frequency}
                        onChange={(e) => setEditValues({ ...editValues, frequency: e.target.value })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                        placeholder="MHz"
                      />
                    ) : (qso.frequency || "—")}
                  </td>

                  {/* MODE */}
                  <td className="font-mono">
                    {isEditing ? (
                      <select
                        className="log-list__edit-select font-mono"
                        value={editValues.mode || qso.mode}
                        onChange={(e) => setEditValues({ ...editValues, mode: e.target.value as Mode })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                      >
                        {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    ) : qso.mode}
                  </td>

                  {/* SNT RST */}
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.sentRst || ""}
                        onChange={(e) => setEditValues({ ...editValues, sentRst: e.target.value })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                        maxLength={3}
                      />
                    ) : qso.sentRst}
                  </td>

                  {/* RCV RST */}
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.rcvdRst || ""}
                        onChange={(e) => setEditValues({ ...editValues, rcvdRst: e.target.value })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                        maxLength={3}
                      />
                    ) : qso.rcvdRst}
                  </td>

                  {/* QTH */}
                  <td className="font-mono">
                    {isEditing ? (
                      <input
                        className="log-list__edit-input font-mono"
                        value={editValues.qth || ""}
                        onChange={(e) => setEditValues({ ...editValues, qth: e.target.value.toUpperCase() })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                      />
                    ) : qso.qth}
                  </td>

                  {/* NOTES */}
                  <td>
                    {isEditing ? (
                      <input
                        className="log-list__edit-input"
                        value={editValues.notes || ""}
                        onChange={(e) => setEditValues({ ...editValues, notes: e.target.value })}
                        onKeyDown={(e) => editKeyDown(e, qso.id)}
                      />
                    ) : qso.notes}
                  </td>

                  {/* ACTIONS */}
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
