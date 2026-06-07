import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { setError("Email dan password wajib diisi"); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Email atau password salah. Silakan coba lagi.");
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !name) { setError("Semua field wajib diisi"); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter"); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    });
    if (error) setError("Gagal daftar: " + error.message);
    else { setSuccess("Akun berhasil dibuat! Silakan login."); setMode("login"); setPassword(""); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#111827 0%,#1f2937 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,-apple-system,sans-serif", padding: 16 }}>
      <div style={{ width: "min(420px,100%)" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⚙️</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>MDE Tracker</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>Mechanical Design Engineering</div>
        </div>

        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
          {/* Tab */}
          <div style={{ display: "flex", marginBottom: 24, background: "#f3f4f6", borderRadius: 10, padding: 4 }}>
            {[["login", "Masuk"], ["register", "Daftar"]].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600,
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#111" : "#888",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                  transition: "all .15s" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Error / Success */}
          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13, color: "#dc2626" }}>⚠️ {error}</div>}
          {success && <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 13, color: "#16a34a" }}>✅ {success}</div>}

          {/* Form */}
          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Nama Lengkap</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Budi Santoso"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@perusahaan.com" onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Minimal 6 karakter" : "Masukkan password"}
              onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
              style={{ width: "100%", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>

          <button onClick={mode === "login" ? handleLogin : handleRegister} disabled={loading}
            style={{ width: "100%", padding: "12px 0", background: loading ? "#93c5fd" : "#185FA5", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", transition: "background .15s" }}>
            {loading ? "Memproses..." : mode === "login" ? "Masuk" : "Buat Akun"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "#888" }}>
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
              style={{ color: "#185FA5", cursor: "pointer", fontWeight: 600 }}>
              {mode === "login" ? "Daftar sekarang" : "Masuk"}
            </span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: "#4b5563" }}>
          © 2026 MDE Tracker — Mechanical Design Engineering
        </div>
      </div>
    </div>
  );
}
