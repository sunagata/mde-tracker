import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";

// ─── DATE HELPERS ───────────────────────────────────────────────────────────
function toISODate(d) { return d.toISOString().split("T")[0]; }
function startOfWeek(d) {
  // Senin sebagai awal minggu
  const dt = new Date(d);
  const day = dt.getDay(); // 0=Min, 1=Sen...
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function endOfWeek(d) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
function fmtDateID(d) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDayShort(d) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}
function addWeeks(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n * 7);
  return dt;
}

const PROJECT_ACCENTS = ["#2563eb", "#7c3aed", "#d97706", "#0d9488", "#db2777", "#65a30d"];

function status(p) {
  if (p >= 100) return { color: "#16a34a", bg: "#dcfce7", label: "Selesai" };
  if (p >= 60)  return { color: "#2563eb", bg: "#dbeafe", label: "On Track" };
  if (p >= 30)  return { color: "#d97706", bg: "#fef3c7", label: "Perhatian" };
  return { color: "#dc2626", bg: "#fee2e2", label: "Terlambat" };
}

export default function WeeklyReport({ projects }) {
  const [weekOffset, setWeekOffset] = useState(0); // 0 = minggu ini, -1 = minggu lalu, dst
  const [steps, setSteps] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekStart = useMemo(() => startOfWeek(addWeeks(new Date(), weekOffset)), [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(addWeeks(new Date(), weekOffset)), [weekOffset]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: stepsData } = await supabase.from("process_steps").select("*");
      const { data: historyData } = await supabase
        .from("progress_history")
        .select("*")
        .gte("changed_at", weekStart.toISOString())
        .lte("changed_at", weekEnd.toISOString())
        .order("changed_at", { ascending: true });
      setSteps(stepsData || []);
      setHistory(historyData || []);
      setLoading(false);
    }
    load();
  }, [weekOffset]);

  const projectById = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);
  const stepById = useMemo(() => Object.fromEntries(steps.map(s => [s.id, s])), [steps]);

  // ── Per-proses: progress awal minggu -> akhir minggu ──
  const perProcess = useMemo(() => {
    return steps.map(step => {
      const stepHistory = history.filter(h => h.step_id === step.id);
      let startProgress, endProgress;
      if (stepHistory.length > 0) {
        startProgress = stepHistory[0].old_progress;
        endProgress = stepHistory[stepHistory.length - 1].new_progress;
      } else {
        // tidak ada perubahan minggu ini — progress awal = akhir = progress saat ini
        startProgress = step.progress;
        endProgress = step.progress;
      }
      const proj = projectById[step.project_id];
      return {
        id: step.id, name: step.name, designer: step.designer,
        partNo: proj?.name || "—", client: proj?.client || "—",
        startProgress, endProgress, delta: endProgress - startProgress,
        updated: stepHistory.length > 0,
      };
    }).filter(p => p.updated || p.startProgress > 0); // hanya tampilkan yang relevan
  }, [steps, history, projectById]);

  // ── Per-designer ──
  const perDesigner = useMemo(() => {
    const byDesigner = {};
    perProcess.forEach(p => {
      if (!byDesigner[p.designer]) byDesigner[p.designer] = { designer: p.designer, processes: 0, totalDelta: 0, updated: 0 };
      byDesigner[p.designer].processes += 1;
      byDesigner[p.designer].totalDelta += p.delta;
      if (p.updated) byDesigner[p.designer].updated += 1;
    });
    return Object.values(byDesigner)
      .map(d => ({ ...d, avgDelta: d.processes ? Math.round(d.totalDelta / d.processes) : 0 }))
      .sort((a, b) => b.totalDelta - a.totalDelta);
  }, [perProcess]);

  // ── Tren harian (jumlah update per hari dalam minggu ini) ──
  const dailyTrend = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dayStr = toISODate(d);
      const dayHistory = history.filter(h => toISODate(new Date(h.changed_at)) === dayStr);
      const avgProgress = dayHistory.length
        ? Math.round(dayHistory.reduce((a, h) => a + h.new_progress, 0) / dayHistory.length)
        : null;
      days.push({ day: fmtDayShort(d), updates: dayHistory.length, avgProgress });
    }
    return days;
  }, [history, weekStart]);

  const totals = useMemo(() => ({
    totalDelta: perProcess.reduce((a, p) => a + p.delta, 0),
    processCount: perProcess.length,
    activeDesigners: perDesigner.length,
    completed: perProcess.filter(p => p.endProgress >= 100 && p.startProgress < 100).length,
  }), [perProcess, perDesigner]);

  // ── Export Excel ──
  function exportExcel() {
    const wb = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(perProcess.map(p => ({
      "Part No": p.partNo, "Client": p.client, "Proses": p.name, "Designer": p.designer,
      "Progress Awal (%)": p.startProgress, "Progress Akhir (%)": p.endProgress,
      "Kenaikan (%)": p.delta, "Status": p.endProgress >= 100 ? "Selesai" : p.endProgress >= 60 ? "On Track" : p.endProgress >= 30 ? "Perhatian" : "Terlambat",
    })));
    XLSX.utils.book_append_sheet(wb, summarySheet, "Per Proses");

    const designerSheet = XLSX.utils.json_to_sheet(perDesigner.map(d => ({
      "Designer": d.designer, "Jumlah Proses": d.processes,
      "Proses Diupdate": d.updated, "Total Kenaikan (%)": d.totalDelta, "Rata-rata Kenaikan (%)": d.avgDelta,
    })));
    XLSX.utils.book_append_sheet(wb, designerSheet, "Per Designer");

    const detailSheet = XLSX.utils.json_to_sheet(history.map(h => ({
      "Tanggal": new Date(h.changed_at).toLocaleString("id-ID"),
      "Proses": stepById[h.step_id]?.name || "—",
      "Part No": projectById[stepById[h.step_id]?.project_id]?.name || "—",
      "Progress Lama (%)": h.old_progress, "Progress Baru (%)": h.new_progress,
      "Diubah Oleh": h.changed_by,
    })));
    XLSX.utils.book_append_sheet(wb, detailSheet, "Detail Histori");

    XLSX.writeFile(wb, `Laporan_Mingguan_${toISODate(weekStart)}_${toISODate(weekEnd)}.xlsx`);
  }

  // ── Export PDF (via print dialog browser, paling ringan tanpa dependency baru) ──
  function exportPDF() {
    window.print();
  }

  if (loading) {
    return <div style={{ textAlign: "center", padding: "3rem", color: "#aaa" }}>Memuat laporan...</div>;
  }

  return (
    <div className="weekly-report-root" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .weekly-report-root, .weekly-report-root * { visibility: visible; }
          .weekly-report-root { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>Laporan Mingguan</div>
          <div style={{ fontSize: 12, color: "#888" }}>{fmtDateID(weekStart)} — {fmtDateID(weekEnd)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setWeekOffset(w => w - 1)} style={navBtnStyle}>← Minggu Lalu</button>
          <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, fontWeight: weekOffset === 0 ? 700 : 400 }}>Minggu Ini</button>
          <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0} style={{ ...navBtnStyle, opacity: weekOffset >= 0 ? .4 : 1 }}>Minggu Depan →</button>
          <div style={{ width: 1, height: 20, background: "#e5e7eb", margin: "0 4px" }} />
          <button onClick={exportExcel} style={exportBtnStyle("#16a34a")}>⬇ Excel</button>
          <button onClick={exportPDF} style={exportBtnStyle("#dc2626")}>⬇ PDF</button>
        </div>
      </div>

      {/* Print-only title */}
      <div style={{ display: "none" }} className="print-title">
        <h2>Laporan Mingguan Progress — {fmtDateID(weekStart)} s/d {fmtDateID(weekEnd)}</h2>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
        <StatCard label="Total Proses Diupdate" value={totals.processCount} color="#2563eb" />
        <StatCard label="Total Kenaikan Progress" value={`${totals.totalDelta}%`} color="#16a34a" />
        <StatCard label="Selesai Minggu Ini" value={totals.completed} color="#0d9488" />
        <StatCard label="Designer Aktif" value={totals.activeDesigners} color="#7c3aed" />
      </div>

      {/* Trend Chart */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: "16px 20px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 12 }}>Aktivitas Update per Hari</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="updates" name="Jumlah Update" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per Proses */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#111", borderBottom: "1px solid #eee" }}>Ringkasan per Proses</div>
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px 90px 90px 70px", padding: "8px 20px", background: "#fafafa", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
          <span>Part No</span><span>Proses</span><span>Designer</span><span>Awal</span><span>Akhir</span><span>Δ</span>
        </div>
        {perProcess.length === 0 && (
          <div style={{ padding: "30px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>Tidak ada aktivitas di minggu ini.</div>
        )}
        {perProcess.map((p, i) => (
          <div key={p.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 110px 90px 90px 70px", padding: "9px 20px", alignItems: "center", borderTop: i > 0 ? "1px solid #f8fafc" : "none" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{p.partNo}</span>
            <span style={{ fontSize: 13, color: "#334155" }}>{p.name}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{p.designer}</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{p.startProgress}%</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: status(p.endProgress).color }}>{p.endProgress}%</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.delta > 0 ? "#16a34a" : "#94a3b8" }}>{p.delta > 0 ? `+${p.delta}` : p.delta}</span>
          </div>
        ))}
      </div>

      {/* Per Designer + Trend */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", overflow: "hidden" }}>
          <div style={{ padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#111", borderBottom: "1px solid #eee" }}>Ringkasan per Designer</div>
          {perDesigner.length === 0 && (
            <div style={{ padding: "30px 20px", textAlign: "center", color: "#aaa", fontSize: 13 }}>Belum ada data.</div>
          )}
          {perDesigner.map((d, i) => (
            <div key={d.designer} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: i > 0 ? "1px solid #f8fafc" : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{d.designer}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.processes} proses · {d.updated} diupdate</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: d.totalDelta > 0 ? "#16a34a" : "#94a3b8" }}>
                {d.totalDelta > 0 ? `+${d.totalDelta}%` : `${d.totalDelta}%`}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #eee", padding: "16px 20px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 12 }}>Tren Rata-rata Progress</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="avgProgress" name="Rata-rata Progress (%)" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", boxShadow: "0 1px 4px rgba(0,0,0,.05)", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, color: "#888", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const navBtnStyle = {
  padding: "6px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff",
  fontSize: 12, cursor: "pointer", color: "#475569",
};
function exportBtnStyle(color) {
  return {
    padding: "6px 14px", borderRadius: 6, border: "none", background: color, color: "#fff",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
  };
}
