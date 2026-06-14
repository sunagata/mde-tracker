import { useState } from "react";
import { supabase } from "./supabase";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reset = () => { setError(""); setSuccess(""); };

  const handleLogin = async () => {
    if (!email || !password) { setError("Email dan password wajib diisi"); return; }
    setLoading(true); reset();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes("Invalid login")) setError("Email atau password salah. Coba lagi atau klik Lupa Password.");
      else if (error.message.includes("Email not confirmed")) setError("Email belum diverifikasi. Cek inbox email Anda.");
      else setError("Gagal login: " + error.message);
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!email || !password || !name) { setError("Semua field wajib diisi"); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter"); return; }
    setLoading(true); reset();
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: name } }
    });
    if (error) {
      if (error.message.includes("already registered")) setError("Email ini sudah terdaftar. Silakan login atau gunakan email lain.");
      else setError("Gagal daftar: " + error.message);
    } else {
      setSuccess("✅ Akun berhasil dibuat! Silakan cek email Anda untuk verifikasi, lalu login.");
      setMode("login");
      setPassword("");
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) { setError("Masukkan email Anda terlebih dahulu"); return; }
    setLoading(true); reset();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://engineering-design-progress.vercel.app/reset-password",
    });
    if (error) setError("Gagal kirim email: " + error.message);
    else setSuccess("✅ Link reset password sudah dikirim ke " + email + ". Cek inbox (dan folder spam) Anda.");
    setLoading(false);
  };

  const switchMode = (m) => { setMode(m); reset(); };

  const titles = {
    login: "Masuk",
    register: "Daftar",
    forgot: "Lupa Password"
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#111827 0%,#1f2937 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,-apple-system,sans-serif", padding:16 }}>
      <div style={{ width:"min(420px,100%)" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:48, marginBottom:8 }}>⚙️</div>
          <div style={{ fontSize:24, fontWeight:700, color:"#fff", letterSpacing:.5 }}>MDE Tracker</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>Mechanical Design Engineering</div>
        </div>

        {/* Card */}
        <div style={{ background:"#fff", borderRadius:16, padding:"2rem", boxShadow:"0 20px 60px rgba(0,0,0,.4)" }}>

          {/* Tab — hanya tampil untuk login & register */}
          {mode !== "forgot" && (
            <div style={{ display:"flex", marginBottom:24, background:"#f3f4f6", borderRadius:10, padding:4 }}>
              {[["login","Masuk"],["register","Daftar"]].map(([m,l])=>(
                <button key={m} onClick={()=>switchMode(m)}
                  style={{ flex:1, padding:"8px 0", border:"none", borderRadius:8, cursor:"pointer", fontSize:14, fontWeight:600,
                    background:mode===m?"#fff":"transparent", color:mode===m?"#111":"#888",
                    boxShadow:mode===m?"0 1px 4px rgba(0,0,0,.1)":"none", transition:"all .15s" }}>
                  {l}
                </button>
              ))}
            </div>
          )}

          {/* Judul untuk mode forgot */}
          {mode === "forgot" && (
            <div style={{ marginBottom:20 }}>
              <button onClick={()=>switchMode("login")}
                style={{ border:"none", background:"none", cursor:"pointer", color:"#185FA5", fontSize:13, padding:0, marginBottom:12, display:"flex", alignItems:"center", gap:4 }}>
                ← Kembali ke Login
              </button>
              <div style={{ fontSize:18, fontWeight:700, color:"#111" }}>🔑 Lupa Password</div>
              <div style={{ fontSize:13, color:"#888", marginTop:4 }}>Masukkan email Anda dan kami akan kirimkan link untuk reset password.</div>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 12px", marginBottom:16, fontSize:13, color:"#dc2626" }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 12px", marginBottom:16, fontSize:13, color:"#16a34a" }}>
              {success}
            </div>
          )}

          {/* Field Nama — hanya saat register */}
          {mode === "register" && (
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Nama Lengkap *</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Budi Santoso"
                style={{ width:"100%", padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
          )}

          {/* Field Email */}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Email *</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
              placeholder="email@perusahaan.com"
              onKeyDown={e=>{ if(e.key==="Enter"){ if(mode==="login") handleLogin(); else if(mode==="register") handleRegister(); else handleForgotPassword(); }}}
              style={{ width:"100%", padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
          </div>

          {/* Field Password — tidak tampil saat forgot */}
          {mode !== "forgot" && (
            <div style={{ marginBottom:mode==="login"?8:24 }}>
              <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Password *</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder={mode==="register"?"Minimal 6 karakter":"Masukkan password"}
                onKeyDown={e=>e.key==="Enter"&&(mode==="login"?handleLogin():handleRegister())}
                style={{ width:"100%", padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
          )}

          {/* Link Lupa Password — hanya di mode login */}
          {mode === "login" && (
            <div style={{ textAlign:"right", marginBottom:20 }}>
              <span onClick={()=>switchMode("forgot")}
                style={{ fontSize:12, color:"#185FA5", cursor:"pointer", fontWeight:500 }}>
                Lupa password?
              </span>
            </div>
          )}

          {/* Tombol Aksi */}
          <button
            onClick={mode==="login"?handleLogin:mode==="register"?handleRegister:handleForgotPassword}
            disabled={loading}
            style={{ width:"100%", padding:"12px 0", background:loading?"#93c5fd":"#185FA5", color:"#fff", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:loading?"not-allowed":"pointer", transition:"background .15s", marginBottom:mode==="forgot"?0:16 }}>
            {loading ? "Memproses..." : mode==="login"?"Masuk":mode==="register"?"Buat Akun":"Kirim Link Reset Password"}
          </button>

          {/* Link switch mode */}
          {mode !== "forgot" && (
            <div style={{ textAlign:"center", fontSize:13, color:"#888" }}>
              {mode==="login"?"Belum punya akun? ":"Sudah punya akun? "}
              <span onClick={()=>switchMode(mode==="login"?"register":"login")}
                style={{ color:"#185FA5", cursor:"pointer", fontWeight:600 }}>
                {mode==="login"?"Daftar sekarang":"Masuk"}
              </span>
            </div>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:"#4b5563" }}>
          © 2026 MDE Tracker — Mechanical Design Engineering
        </div>
      </div>
    </div>
  );
}
