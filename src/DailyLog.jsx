import { useState, useEffect } from "react";
import { supabase } from "./supabase";

function fmtDate(s){ return s?new Date(s).toLocaleDateString("id-ID",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):"—" }
function fmtTime(s){ return s?new Date(s).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}):"—" }
function today(){ return new Date().toISOString().split("T")[0] }

const STATUS_OPTS = [
  {val:"in_progress", label:"Sedang Dikerjakan", color:"#BA7517", bg:"#FAEEDA"},
  {val:"done", label:"Selesai", color:"#1D9E75", bg:"#E1F5EE"},
  {val:"blocked", label:"Terhambat", color:"#D85A30", bg:"#FAECE7"},
  {val:"review", label:"Menunggu Review", color:"#378ADD", bg:"#E6F1FB"},
];

function StatusBadge({status}){
  const s=STATUS_OPTS.find(x=>x.val===status)||STATUS_OPTS[0];
  return <span style={{fontSize:11,padding:"2px 10px",borderRadius:999,fontWeight:600,background:s.bg,color:s.color}}>{s.label}</span>;
}

export default function DailyLog({session,projects}){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selectedDate,setSelectedDate]=useState(today());
  const [filterProject,setFilterProject]=useState("all");
  const [showForm,setShowForm]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({
    project_id:"",activity:"",progress_pct:0,hours_spent:1,status:"in_progress"
  });
  const [tab,setTab]=useState("today"); // today | history | team

  const userName=session?.user?.user_metadata?.full_name||session?.user?.email?.split("@")[0]||"User";

  const loadLogs=async()=>{
    setLoading(true);
    let query=supabase.from("daily_logs").select("*, projects(name,category)").order("created_at",{ascending:false});
    if(tab==="today") query=query.eq("date",today());
    else if(tab==="history") query=query.eq("date",selectedDate);
    if(filterProject!=="all") query=query.eq("project_id",filterProject);
    const{data}=await query;
    setLogs(data||[]);
    setLoading(false);
  };

  useEffect(()=>{loadLogs();},[tab,selectedDate,filterProject]);

  const saveLog=async()=>{
    if(!form.project_id){alert("Pilih proyek dulu");return;}
    if(!form.activity.trim()){alert("Isi aktivitas yang dikerjakan");return;}
    setSaving(true);
    const{error}=await supabase.from("daily_logs").insert({
      project_id:form.project_id,
      user_id:session.user.id,
      user_name:userName,
      date:today(),
      activity:form.activity.trim(),
      progress_pct:form.progress_pct,
      hours_spent:form.hours_spent,
      status:form.status,
    });
    if(!error){
      setShowForm(false);
      setForm({project_id:"",activity:"",progress_pct:0,hours_spent:1,status:"in_progress"});
      loadLogs();
    }
    setSaving(false);
  };

  const deleteLog=async(id)=>{
    if(!confirm("Hapus log ini?")) return;
    await supabase.from("daily_logs").delete().eq("id",id);
    loadLogs();
  };

  // Stats for today
  const todayLogs=logs.filter(l=>l.date===today());
  const totalHours=logs.reduce((a,l)=>a+(parseFloat(l.hours_spent)||0),0);
  const doneCount=logs.filter(l=>l.status==="done").length;
  const blockedCount=logs.filter(l=>l.status==="blocked").length;

  // Group by user for team view
  const byUser=logs.reduce((acc,l)=>{
    const name=l.user_name||"Unknown";
    if(!acc[name]) acc[name]=[];
    acc[name].push(l);
    return acc;
  },{});

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:"#111"}}>Daily Activity Log</div>
          <div style={{fontSize:12,color:"#888"}}>📅 {fmtDate(today())}</div>
        </div>
        <button onClick={()=>setShowForm(true)}
          style={{padding:"8px 16px",background:"#185FA5",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:600}}>
          + Tambah Log Hari Ini
        </button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:10}}>
        {[
          {label:"Total Log",val:logs.length,color:"#185FA5"},
          {label:"Selesai",val:doneCount,color:"#1D9E75"},
          {label:"Terhambat",val:blockedCount,color:"#D85A30"},
          {label:"Total Jam",val:`${totalHours.toFixed(1)}h`,color:"#BA7517"},
        ].map((k,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.05)",borderLeft:`3px solid ${k.color}`}}>
            <div style={{fontSize:10,color:"#888",marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:20,fontWeight:700,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {[["today","Hari Ini"],["history","Pilih Tanggal"],["team","Monitor Tim"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"6px 14px",borderRadius:999,fontSize:12,cursor:"pointer",border:`1px solid ${tab===t?"#185FA5":"#ddd"}`,background:tab===t?"#185FA5":"#fff",color:tab===t?"#fff":"#555",fontWeight:tab===t?600:400}}>
            {l}
          </button>
        ))}
        {tab==="history"&&(
          <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
            style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12,outline:"none"}}/>
        )}
        <select value={filterProject} onChange={e=>setFilterProject(e.target.value)}
          style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:12,outline:"none",marginLeft:"auto"}}>
          <option value="all">Semua Proyek</option>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name.slice(0,30)}</option>)}
        </select>
        <button onClick={loadLogs} style={{padding:"6px 10px",border:"1px solid #eee",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:13}}>🔄</button>
      </div>

      {/* Team View */}
      {tab==="team"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {Object.keys(byUser).length===0&&!loading&&(
            <div style={{textAlign:"center",padding:"2rem",color:"#aaa"}}>
              <div style={{fontSize:32,marginBottom:8}}>👥</div>
              <div>Belum ada aktivitas hari ini</div>
            </div>
          )}
          {Object.entries(byUser).map(([name,userLogs])=>(
            <div key={name} style={{background:"#fff",borderRadius:12,border:"1px solid #eee",padding:"1rem",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{width:36,height:36,borderRadius:"50%",background:"#185FA520",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#185FA5"}}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111"}}>{name}</div>
                  <div style={{fontSize:11,color:"#888"}}>{userLogs.length} aktivitas · {userLogs.reduce((a,l)=>a+(parseFloat(l.hours_spent)||0),0).toFixed(1)} jam</div>
                </div>
                <div style={{marginLeft:"auto",display:"flex",gap:6}}>
                  <span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"#E1F5EE",color:"#1D9E75",fontWeight:600}}>
                    ✅ {userLogs.filter(l=>l.status==="done").length} selesai
                  </span>
                  {userLogs.filter(l=>l.status==="blocked").length>0&&(
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"#FAECE7",color:"#D85A30",fontWeight:600}}>
                      ⚠️ {userLogs.filter(l=>l.status==="blocked").length} terhambat
                    </span>
                  )}
                </div>
              </div>
              {userLogs.map(l=>(
                <div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 10px",background:"#f8f9fa",borderRadius:8,marginBottom:6}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:STATUS_OPTS.find(s=>s.val===l.status)?.color||"#888",marginTop:5,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,color:"#222",marginBottom:3}}>{l.activity}</div>
                    <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:11,color:"#888"}}>
                      <span>📁 {l.projects?.name?.slice(0,25)||"—"}</span>
                      <span>⏱️ {l.hours_spent}h</span>
                      {l.progress_pct>0&&<span>📊 {l.progress_pct}%</span>}
                      <span>🕐 {fmtTime(l.created_at)}</span>
                    </div>
                  </div>
                  <StatusBadge status={l.status}/>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Today / History View */}
      {(tab==="today"||tab==="history")&&(
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {loading&&<div style={{textAlign:"center",padding:"2rem",color:"#aaa"}}>Memuat...</div>}
          {!loading&&logs.length===0&&(
            <div style={{textAlign:"center",padding:"2rem",color:"#aaa",background:"#fff",borderRadius:12,border:"1px solid #eee"}}>
              <div style={{fontSize:32,marginBottom:8}}>📝</div>
              <div style={{fontWeight:600,marginBottom:4}}>Belum ada log {tab==="today"?"hari ini":"pada tanggal ini"}</div>
              <div style={{fontSize:13}}>Klik "+ Tambah Log Hari Ini" untuk mulai</div>
            </div>
          )}
          {logs.map(l=>(
            <div key={l.id} style={{background:"#fff",borderRadius:12,border:"1px solid #eee",padding:"1rem 1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{width:40,height:40,borderRadius:10,background:"#185FA515",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>📝</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#111"}}>{l.user_name||"Unknown"}</span>
                    <StatusBadge status={l.status}/>
                    {l.progress_pct>0&&(
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:999,background:"#f0f0f0",color:"#555"}}>📊 {l.progress_pct}%</span>
                    )}
                  </div>
                  <div style={{fontSize:13,color:"#333",marginBottom:6,lineHeight:1.5}}>{l.activity}</div>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11,color:"#888"}}>
                    <span>📁 {l.projects?.name?.slice(0,30)||"—"}</span>
                    <span>⏱️ {l.hours_spent} jam</span>
                    <span>🕐 {fmtTime(l.created_at)}</span>
                    <span>📅 {l.date}</span>
                  </div>
                </div>
                {l.user_id===session?.user?.id&&(
                  <button onClick={()=>deleteLog(l.id)}
                    style={{border:"none",background:"none",cursor:"pointer",color:"#ddd",fontSize:14,padding:4,flexShrink:0}}
                    onMouseEnter={e=>e.currentTarget.style.color="#D85A30"}
                    onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setShowForm(false)}>
          <div style={{background:"#fff",borderRadius:16,padding:"1.5rem",width:"min(520px,96vw)",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
              <div>
                <div style={{fontSize:18,fontWeight:600,color:"#111"}}>📝 Log Aktivitas Hari Ini</div>
                <div style={{fontSize:12,color:"#888",marginTop:2}}>👤 {userName} · 📅 {fmtDate(today())}</div>
              </div>
              <button onClick={()=>setShowForm(false)} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"#888"}}>✕</button>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>Proyek *</label>
              <select value={form.project_id} onChange={e=>setForm(f=>({...f,project_id:e.target.value}))}
                style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none"}}>
                <option value="">-- Pilih Proyek --</option>
                {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>Aktivitas yang Dikerjakan *</label>
              <textarea value={form.activity} onChange={e=>setForm(f=>({...f,activity:e.target.value}))}
                placeholder="Contoh: Membuat 2D drawing nozzle inlet, finishing toleransi dimensi..."
                rows={4} style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
                  style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none"}}>
                  {STATUS_OPTS.map(s=><option key={s.val} value={s.val}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>Jam Kerja</label>
                <input type="number" step="0.5" min="0.5" max="12" value={form.hours_spent}
                  onChange={e=>setForm(f=>({...f,hours_spent:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>
                Progress Hari Ini: <strong>{form.progress_pct}%</strong>
              </label>
              <input type="range" min="0" max="100" step="5" value={form.progress_pct}
                onChange={e=>setForm(f=>({...f,progress_pct:+e.target.value}))}
                style={{width:"100%",accentColor:"#185FA5"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#aaa"}}>
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",border:"1px solid #ddd",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:13}}>Batal</button>
              <button onClick={saveLog} disabled={saving}
                style={{padding:"8px 20px",border:"none",borderRadius:8,background:"#185FA5",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,opacity:saving?.6:1}}>
                {saving?"Menyimpan...":"Simpan Log"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
