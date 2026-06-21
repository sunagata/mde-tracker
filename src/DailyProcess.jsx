import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";

// ─── HELPERS ────────────────────────────────────────────────────────────────
function fmtShort(dateStr) {
  if (!dateStr) return "—";
  const dt = new Date(dateStr + "T00:00:00");
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${dt.getDate()} ${months[dt.getMonth()]}`;
}
function todayStr() { return new Date().toISOString().split("T")[0]; }
function fmtDateLong(s) {
  return s ? new Date(s).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "—";
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function status(p) {
  if (p >= 100) return { color: "#16a34a", bg: "#dcfce7", label: "Selesai" };
  if (p >= 60)  return { color: "#2563eb", bg: "#dbeafe", label: "On Track" };
  if (p >= 30)  return { color: "#d97706", bg: "#fef3c7", label: "Perhatian" };
  return { color: "#dc2626", bg: "#fee2e2", label: "Terlambat" };
}

const PROJECT_ACCENTS = ["#2563eb", "#7c3aed", "#d97706", "#0d9488", "#db2777", "#65a30d"];

function ProgressPill({ value }) {
  const s = status(value);
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: s.color, background: s.bg,
      borderRadius: 5, padding: "2px 7px", whiteSpace: "nowrap"
    }}>
      {value}%
    </span>
  );
}

// ─── MODAL SHELL ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 14, padding: 24, width: 400,
        maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)"
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "#111" }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}
const inputStyle = {
  width: "100%", border: "1px solid #ddd", borderRadius: 8,
  padding: "8px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box"
};

// ─── ADD PROJECT MODAL ──────────────────────────────────────────────────────
// Menambahkan ke tabel "projects" yang sama dipakai Dashboard/Gantt/Analytics
function AddProjectModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { alert("Part No / Nama proyek tidak boleh kosong"); return; }
    setSaving(true);
    await onSave({ name: name.trim(), client: client.trim(), description: note.trim() });
    setSaving(false);
  }

  return (
    <Modal title="Tambah Project Baru" onClose={onClose}>
      <Field label="Part No / Nama Proyek *">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="cth: 66801" />
      </Field>
      <Field label="Client">
        <input value={client} onChange={e => setClient(e.target.value)} style={inputStyle} placeholder="cth: HYUNDAI" />
      </Field>
      <Field label="Catatan / Qty (opsional)">
        <input value={note} onChange={e => setNote(e.target.value)} style={inputStyle} placeholder="cth: Dies RHD 2 / LHD 2" />
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button onClick={save} disabled={saving} style={{ flex: 1, background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: saving ? .6 : 1 }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button onClick={onClose} style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>Batal</button>
      </div>
    </Modal>
  );
}

// ─── ADD PROCESS MODAL ──────────────────────────────────────────────────────
function AddProcessModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [designer, setDesigner] = useState("");
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [jamKerja, setJamKerja] = useState("");
  const [catatan, setCatatan] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !designer.trim()) { alert("Nama proses dan designer wajib diisi"); return; }
    setSaving(true);
    await onSave({
      name: name.trim(), designer: designer.trim(),
      start_date: startDate, end_date: endDate,
      progress: 0, jam_kerja: Number(jamKerja) || 0, catatan: catatan.trim(),
    });
    setSaving(false);
  }

  return (
    <Modal title="Tambah Proses" onClose={onClose}>
      <Field label="Nama Proses *">
        <input autoFocus value={name} onChange={e => setName(e.target.value)} style={inputStyle} placeholder="cth: Draw, Trim, Cutting" />
      </Field>
      <Field label="Designer *">
        <input value={designer} onChange={e => setDesigner(e.target.value)} style={inputStyle} placeholder="cth: Ari" />
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <Field label="Mulai">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </Field>
        </div>
        <div style={{ flex: 1 }}>
          <Field label="Target Selesai">
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </Field>
        </div>
      </div>
      <Field label="Jam Kerja (opsional)">
        <input type="number" value={jamKerja} onChange={e => setJamKerja(e.target.value)} style={inputStyle} placeholder="cth: 80" />
      </Field>
      <Field label="Catatan (opsional)">
        <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Revisi, kendala, perubahan mesin, dll" />
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <button onClick={save} disabled={saving} style={{ flex: 1, background: "#185FA5", color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: saving ? .6 : 1 }}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button onClick={onClose} style={{ flex: 1, background: "#f1f5f9", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, cursor: "pointer" }}>Batal</button>
      </div>
    </Modal>
  );
}

// ─── DETAIL PANEL (keterangan: structured + free text) ─────────────────────
function DetailPanel({ proc, onUpdate, onDelete }) {
  const [jamKerja, setJamKerja] = useState(proc.jam_kerja ?? "");
  const [catatan, setCatatan] = useState(proc.catatan ?? "");

  function saveJam() { onUpdate({ jam_kerja: Number(jamKerja) || 0 }); }
  function saveCatatan() { onUpdate({ catatan }); }

  return (
    <div style={{ padding: "10px 20px 16px 20px", background: "#fafafa", borderTop: "1px dashed #e5e7eb" }}>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600 }}>Jam Kerja</label>
        <input type="number" value={jamKerja} onChange={e => setJamKerja(e.target.value)} onBlur={saveJam}
          style={{ width: 90, border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 8px", fontSize: 12 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 3, fontWeight: 600 }}>Catatan</label>
        <textarea value={catatan} onChange={e => setCatatan(e.target.value)} onBlur={saveCatatan} rows={2}
          placeholder="Catatan bebas — revisi, kendala, perubahan mesin, dll"
          style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 6, padding: "7px 9px", fontSize: 12, fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
      </div>
      <button onClick={onDelete} style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
        🗑 Hapus proses ini
      </button>
    </div>
  );
}

// ─── TIMELINE (GANTT) VIEW ──────────────────────────────────────────────────
function TimelineView({ groups, todayIdx, timelineStart, timelineLen, onUpdateProgress, onUpdateDetail, onAddProcess, onDeleteProcess }) {
  const LABEL_W = 220;
  const todayPct = (todayIdx / timelineLen) * 100;
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);

  function dayIdx(dateStr) {
    if (!dateStr) return 0;
    return Math.max(0, daysBetween(timelineStart, dateStr));
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ minWidth: LABEL_W, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .4 }}>Proses</div>
        <div style={{ flex: 1, position: "relative", height: 16 }}>
          <span style={{ position: "absolute", left: 0, fontSize: 11, color: "#94a3b8" }}>{fmtShort(timelineStart)}</span>
          <span style={{ position: "absolute", left: `${todayPct}%`, transform: "translateX(-50%)", fontSize: 11, fontWeight: 700, color: "#dc2626", top: -1 }}>Hari ini</span>
        </div>
      </div>

      {groups.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>
          Belum ada project. Klik "+ Project Baru" untuk mulai.
        </div>
      )}

      {groups.map((proj, pi) => {
        const accent = PROJECT_ACCENTS[pi % PROJECT_ACCENTS.length];
        const procs = proj.process_steps || [];
        const avg = procs.length ? Math.round(procs.reduce((a, p) => a + p.progress, 0) / procs.length) : 0;

        return (
          <div key={proj.id} style={{ borderBottom: pi < groups.length - 1 ? "8px solid #f8fafc" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px 8px", background: "#fafafa" }}>
              <div style={{ width: 4, height: 18, borderRadius: 2, background: accent }} />
              <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{proj.name}</span>
              {proj.client && <span style={{ fontSize: 11, color: "#94a3b8" }}>{proj.client}</span>}
              {proj.description && <span style={{ fontSize: 11, color: "#94a3b8" }}>· {proj.description}</span>}
              {procs.length > 0 && <span style={{ marginLeft: "auto" }}><ProgressPill value={avg} /></span>}
            </div>

            {procs.map(proc => {
              const s = status(proc.progress);
              const start = dayIdx(proc.start_date);
              const end = dayIdx(proc.end_date);
              const left = (start / timelineLen) * 100;
              const width = Math.max(((end - start) / timelineLen) * 100, 1);
              const isLate = proc.progress < 100 && end <= todayIdx;

              return (
                <div key={proc.id}>
                  <div style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderTop: "1px solid #f8fafc" }}>
                    <div
                      onClick={() => setExpanded(expanded === proc.id ? null : proc.id)}
                      style={{ minWidth: LABEL_W, display: "flex", alignItems: "baseline", gap: 8, cursor: "pointer" }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", minWidth: 80 }}>
                        {proc.name}
                        {proc.catatan && <span title="Ada catatan" style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "#f59e0b", marginLeft: 5 }} />}
                      </span>
                      <span style={{ fontSize: 12, color: "#94a3b8" }}>{proc.designer}</span>
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ position: "relative", height: 10, display: "flex", alignItems: "center" }}>
                        <div style={{ position: "absolute", left: `${todayPct}%`, top: -2, bottom: -2, width: 1, background: "#fca5a5" }} />
                        <div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, height: 10, borderRadius: 5, background: "#f1f5f9" }}>
                          <div style={{ width: `${proc.progress}%`, height: "100%", borderRadius: 5, background: s.color }} />
                        </div>
                      </div>
                      <div style={{ position: "relative", height: 12 }}>
                        <span style={{ position: "absolute", left: `${left}%`, fontSize: 10, color: "#94a3b8" }}>{fmtShort(proc.start_date)}</span>
                        <span style={{ position: "absolute", left: `${left + width}%`, transform: "translateX(-100%)", fontSize: 10, fontWeight: isLate ? 700 : 400, color: isLate ? "#dc2626" : "#94a3b8" }}>
                          {fmtShort(proc.end_date)}
                        </span>
                      </div>
                    </div>

                    <div style={{ minWidth: 56, textAlign: "right", marginLeft: 12 }}>
                      {editing === proc.id ? (
                        <input
                          autoFocus type="number" min={0} max={100} defaultValue={proc.progress}
                          onBlur={e => { onUpdateProgress(proc.id, Math.min(100, Math.max(0, Number(e.target.value)))); setEditing(null); }}
                          onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                          style={{ width: 48, textAlign: "right", border: "1px solid #cbd5e1", borderRadius: 5, padding: "2px 5px", fontSize: 12 }}
                        />
                      ) : (
                        <span onClick={() => setEditing(proc.id)} style={{ cursor: "pointer" }}>
                          <ProgressPill value={proc.progress} />
                        </span>
                      )}
                    </div>
                  </div>

                  {expanded === proc.id && (
                    <DetailPanel
                      proc={proc}
                      onUpdate={patch => onUpdateDetail(proc.id, patch)}
                      onDelete={() => { onDeleteProcess(proc.id); setExpanded(null); }}
                    />
                  )}
                </div>
              );
            })}

            <div style={{ padding: "8px 20px 12px" }}>
              <button onClick={() => onAddProcess(proj.id)} style={{
                fontSize: 12, color: accent, background: "none", border: `1px dashed ${accent}88`,
                borderRadius: 6, padding: "4px 12px", cursor: "pointer"
              }}>+ Tambah Proses</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── TABLE VIEW ─────────────────────────────────────────────────────────────
function TableView({ groups, onUpdateProgress, onAddProcess }) {
  const [editing, setEditing] = useState(null);

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 130px 90px 110px", padding: "10px 20px", background: "#fafafa", borderBottom: "1px solid #eee" }}>
        {["Part No", "Proses", "Designer", "Jam", "Progress"].map(h => (
          <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: .4 }}>{h}</span>
        ))}
      </div>

      {groups.length === 0 && (
        <div style={{ padding: "40px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>Belum ada project.</div>
      )}

      {groups.map((proj, pi) => {
        const accent = PROJECT_ACCENTS[pi % PROJECT_ACCENTS.length];
        const procs = proj.process_steps || [];
        return (
          <div key={proj.id}>
            {procs.map((proc, idx) => (
              <div key={proc.id} style={{
                display: "grid", gridTemplateColumns: "100px 1fr 130px 90px 110px",
                padding: "10px 20px", alignItems: "center",
                borderTop: idx === 0 ? `2px solid ${accent}22` : "1px solid #f8fafc"
              }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: idx === 0 ? "#0f172a" : "#cbd5e1" }}>{idx === 0 ? proj.name : ""}</span>
                <span style={{ fontSize: 13, color: "#334155" }}>{proc.name}</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>{proc.designer}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{proc.jam_kerja ? `${proc.jam_kerja}j` : "—"}</span>
                {editing === proc.id ? (
                  <input
                    autoFocus type="number" min={0} max={100} defaultValue={proc.progress}
                    onBlur={e => { onUpdateProgress(proc.id, Math.min(100, Math.max(0, Number(e.target.value)))); setEditing(null); }}
                    onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
                    style={{ width: 56, border: "1px solid #cbd5e1", borderRadius: 5, padding: "2px 6px", fontSize: 12 }}
                  />
                ) : (
                  <span onClick={() => setEditing(proc.id)} style={{ cursor: "pointer", width: "fit-content" }}>
                    <ProgressPill value={proc.progress} />
                  </span>
                )}
              </div>
            ))}
            <div style={{ padding: "6px 20px 10px" }}>
              <button onClick={() => onAddProcess(proj.id)} style={{
                fontSize: 11, color: accent, background: "none", border: `1px dashed ${accent}88`,
                borderRadius: 5, padding: "3px 10px", cursor: "pointer"
              }}>+ Tambah Proses</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function DailyProcess({ session, projects }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("timeline");
  const [clientFilter, setClientFilter] = useState("Semua");
  const [showAddProject, setShowAddProject] = useState(false);
  const [addProcessTarget, setAddProcessTarget] = useState(null);

  const loadSteps = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("process_steps").select("*").order("start_date", { ascending: true });
    if (!error) setSteps(data || []);
    setLoading(false);
  };

  useEffect(() => { loadSteps(); }, []);

  // Group process_steps under each project
  const groups = useMemo(() => {
    const byProject = {};
    steps.forEach(s => {
      if (!byProject[s.project_id]) byProject[s.project_id] = [];
      byProject[s.project_id].push(s);
    });
    let list = projects.map(p => ({ ...p, process_steps: byProject[p.id] || [] }));
    if (clientFilter !== "Semua") list = list.filter(p => p.client === clientFilter);
    return list;
  }, [projects, steps, clientFilter]);

  const clients = ["Semua", ...Array.from(new Set(projects.map(p => p.client).filter(Boolean)))];

  // Timeline window: from earliest start_date to latest end_date (with padding)
  const { timelineStart, timelineLen, todayIdx } = useMemo(() => {
    const today = todayStr();
    if (steps.length === 0) {
      const start = new Date(); start.setDate(start.getDate() - 7);
      return { timelineStart: start.toISOString().split("T")[0], timelineLen: 45, todayIdx: 7 };
    }
    const allDates = steps.flatMap(s => [s.start_date, s.end_date]).filter(Boolean);
    const minDate = allDates.reduce((a, b) => a < b ? a : b);
    const maxDate = allDates.reduce((a, b) => a > b ? a : b);
    const len = Math.max(daysBetween(minDate, maxDate) + 10, daysBetween(minDate, today) + 10);
    return { timelineStart: minDate, timelineLen: len, todayIdx: Math.max(0, daysBetween(minDate, today)) };
  }, [steps]);

  const counts = useMemo(() => ({
    Selesai:    steps.filter(p => p.progress >= 100).length,
    "On Track": steps.filter(p => p.progress >= 60 && p.progress < 100).length,
    Perhatian:  steps.filter(p => p.progress >= 30 && p.progress < 60).length,
    Terlambat:  steps.filter(p => p.progress < 30).length,
  }), [steps]);

  // ── Actions ──
  async function handleAddProject(form) {
    const { error } = await supabase.from("projects").insert({
      name: form.name, client: form.client, description: form.description,
      category: "Other", status: "active", priority: "Medium",
      budget: 0, spent: 0, revision: 0, progress: 0, weekly_progress: [0,0,0,0,0,0],
    }).select().single();
    if (error) { alert("Gagal menyimpan project: " + error.message); return; }
    // Project baru perlu tampil di Dashboard/Gantt/dll juga — App.jsx yang memuat daftar projects,
    // jadi kita minta App.jsx me-reload datanya.
    window.dispatchEvent(new CustomEvent("mde:projects-changed"));
    setShowAddProject(false);
  }

  async function handleAddProcess(form) {
    const { error } = await supabase.from("process_steps").insert({
      project_id: addProcessTarget, ...form,
    });
    if (error) { alert("Gagal menyimpan proses: " + error.message); return; }
    setAddProcessTarget(null);
    loadSteps();
  }

  async function handleUpdateProgress(stepId, value) {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, progress: value } : s)); // optimistic update
    const { error } = await supabase.from("process_steps").update({ progress: value }).eq("id", stepId);
    if (error) loadSteps();
  }

  async function handleUpdateDetail(stepId, patch) {
    setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...patch } : s));
    const { error } = await supabase.from("process_steps").update(patch).eq("id", stepId);
    if (error) loadSteps();
  }

  async function handleDeleteProcess(stepId) {
    if (!confirm("Hapus proses ini?")) return;
    setSteps(prev => prev.filter(s => s.id !== stepId));
    await supabase.from("process_steps").delete().eq("id", stepId);
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "3rem", color: "#aaa" }}>Memuat data proses...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Daily Process</div>
          <div style={{ fontSize: 12, color: "#888" }}>📅 {fmtDateLong(todayStr())}</div>
        </div>
        <button onClick={() => setShowAddProject(true)} style={{
          padding: "8px 16px", background: "#185FA5", color: "#fff", border: "none",
          borderRadius: 8, fontSize: 13, cursor: "pointer", fontWeight: 600
        }}>+ Project Baru</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
        {Object.entries(counts).map(([label, count]) => {
          const s = status(label === "Selesai" ? 100 : label === "On Track" ? 60 : label === "Perhatian" ? 30 : 0);
          return (
            <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,.05)", borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 3 }}>
          {[["timeline", "Timeline"], ["table", "Tabel"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "6px 16px", borderRadius: 6, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              background: tab === key ? "#fff" : "transparent",
              color: tab === key ? "#0f172a" : "#94a3b8",
              boxShadow: tab === key ? "0 1px 2px rgba(0,0,0,.1)" : "none"
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {clients.map(c => (
            <button key={c} onClick={() => setClientFilter(c)} style={{
              padding: "5px 14px", borderRadius: 20, border: "1px solid",
              borderColor: clientFilter === c ? "#0f172a" : "#e2e8f0",
              background: clientFilter === c ? "#0f172a" : "#fff",
              color: clientFilter === c ? "#fff" : "#64748b",
              fontSize: 12, fontWeight: 600, cursor: "pointer"
            }}>{c}</button>
          ))}
        </div>
        <button onClick={loadSteps} title="Refresh" style={{ padding: "6px 10px", border: "1px solid #eee", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13 }}>🔄</button>
      </div>

      {/* View */}
      {tab === "timeline" ? (
        <TimelineView
          groups={groups} todayIdx={todayIdx} timelineStart={timelineStart} timelineLen={timelineLen}
          onUpdateProgress={handleUpdateProgress} onUpdateDetail={handleUpdateDetail}
          onAddProcess={setAddProcessTarget} onDeleteProcess={handleDeleteProcess}
        />
      ) : (
        <TableView groups={groups} onUpdateProgress={handleUpdateProgress} onAddProcess={setAddProcessTarget} />
      )}

      <div style={{ fontSize: 11, color: "#bbb", textAlign: "right" }}>
        {tab === "timeline" ? "Klik nama proses untuk catatan · klik angka progress untuk mengedit" : "Klik angka progress untuk mengedit"}
      </div>

      {showAddProject && <AddProjectModal onClose={() => setShowAddProject(false)} onSave={handleAddProject} />}
      {addProcessTarget !== null && <AddProcessModal onClose={() => setAddProcessTarget(null)} onSave={handleAddProcess} />}
    </div>
  );
}
