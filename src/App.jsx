import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import Auth from "./Auth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, LineChart, Line,
  Legend, AreaChart, Area
} from "recharts";

const CATEGORIES = ["Dies","Jig","CF","Reverse Engineering","Other"];
const CATEGORY_ICONS = { Dies:"🔨",Jig:"📐",CF:"⚙️","Reverse Engineering":"🔍",Other:"📋" };
const STATUS_COLORS = { planning:"#378ADD",active:"#639922",review:"#BA7517",done:"#1D9E75",hold:"#888780" };
const PRIORITY_COLORS = { High:"#D85A30",Medium:"#BA7517",Low:"#639922" };
const PHASE_COLORS = ["#185FA5","#1D9E75","#BA7517","#D85A30","#7F77DD","#0F6E56"];
const CHART_COLORS = ["#185FA5","#1D9E75","#BA7517","#D85A30","#7F77DD","#0F6E56"];

function daysLeft(dl){
  const d=Math.ceil((new Date(dl)-new Date())/(864e5));
  if(d<0) return{label:`${Math.abs(d)}d overdue`,color:"#D85A30"};
  if(d===0) return{label:"Due today",color:"#BA7517"};
  return{label:`${d}d left`,color:"#888780"};
}
function pct(p){
  if(!p.tasks||!p.tasks.length) return p.progress||0;
  return Math.round(p.tasks.filter(t=>t.done).length/p.tasks.length*100);
}
function fmtDate(s){return s?new Date(s).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"—"}

function Badge({status}){
  const map={planning:{bg:"#E6F1FB",c:"#0C447C",t:"Planning"},active:{bg:"#949692",c:"#27500A",t:"Active"},review:{bg:"#FAEEDA",c:"#633806",t:"Review"},done:{bg:"#E1F5EE",c:"#085041",t:"Done"},hold:{bg:"#F1EFE8",c:"#444441",t:"On Hold"}};
  const s=map[status]||map.planning;
  return <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,fontWeight:600,background:s.bg,color:s.c}}>{s.t}</span>;
}
function PriorityBadge({p}){
  const c=PRIORITY_COLORS[p]||"#888";
  return <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,border:`1px solid ${c}44`,color:c,fontWeight:600}}>{p}</span>;
}
function ProgressRing({value,size=48,stroke=4,color="#1D9E75"}){
  const r=(size-stroke*2)/2,circ=2*Math.PI*r,offset=circ-(value/100)*circ;
  return(<svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s"}}/>
  </svg>);
}
function MiniSparkline({data,color}){
  if(!data||data.length<2) return null;
  const max=Math.max(...data),min=0,W=80,H=28,pad=2;
  const pts=data.map((v,i)=>{const x=pad+(i/(data.length-1))*(W-pad*2);const y=H-pad-(((v-min)/(max-min||1))*(H-pad*2));return`${x},${y}`;}).join(" ");
  return(<svg width={W} height={H} style={{display:"block"}}><polyline points={pts} fill="none" stroke={color||"#1D9E75"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/></svg>);
}
function Card({title,children}){
  return(<div style={{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1rem 1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
    <div style={{fontSize:13,fontWeight:600,color:"#222",marginBottom:12}}>{title}</div>
    {children}
  </div>);
}
const CTip=(props)=>{
  const{active,payload,label}=props;
  if(!active||!payload?.length) return null;
  return(<div style={{background:"#fff",border:"1px solid #eee",borderRadius:8,padding:"8px 12px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}>
    <div style={{fontWeight:600,marginBottom:4,color:"#333"}}>{label}</div>
    {payload.map((p,i)=>(<div key={i} style={{color:p.color||"#555",display:"flex",gap:8,alignItems:"center"}}>
      <div style={{width:8,height:8,borderRadius:2,background:p.color||"#555"}}/>{p.name}: <b>{p.value}</b>
    </div>))}
  </div>);
};

// ── LOADING ──
function Spinner(){
  return(<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",flexDirection:"column",gap:12}}>
    <div style={{width:40,height:40,border:"3px solid #eee",borderTop:"3px solid #185FA5",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
    <div style={{fontSize:13,color:"#888"}}>Memuat data...</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>);
}

// ── GANTT ──
function GanttBar({projects}){
  const today=new Date();
  const allDates=projects.flatMap(p=>[new Date(p.start_date||p.deadline),new Date(p.deadline)]);
  const minD=new Date(Math.min(...allDates)),maxD=new Date(Math.max(...allDates));
  const totalDays=Math.max((maxD-minD)/864e5,1);
  const months=[];const d=new Date(minD);d.setDate(1);
  while(d<=maxD){months.push(new Date(d));d.setMonth(d.getMonth()+1);}
  const pp=(date)=>Math.max(0,Math.min(100,(new Date(date)-minD)/864e5/totalDays*100));
  const todayPct=pp(today);
  return(<div style={{overflowX:"auto"}}><div style={{minWidth:600}}>
    <div style={{display:"flex",marginBottom:8,position:"relative",height:20,marginLeft:180}}>
      {months.map((m,i)=>{const lp=pp(m),nextM=months[i+1]||maxD,wp=pp(nextM)-lp;
        return <div key={i} style={{position:"absolute",left:`${lp}%`,width:`${wp}%`,fontSize:10,color:"#888",paddingLeft:4,whiteSpace:"nowrap",overflow:"hidden"}}>{m.toLocaleDateString("id-ID",{month:"short",year:"2-digit"})}</div>;})}
    </div>
    {projects.map((p)=>{
      const left=pp(p.start_date||p.deadline),width=pp(p.deadline)-left,prog=pct(p),barColor=STATUS_COLORS[p.status]||"#378ADD";
      return(<div key={p.id} style={{display:"flex",alignItems:"center",marginBottom:10,gap:0}}>
        <div style={{width:180,flexShrink:0,fontSize:12,color:"#444",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:500,paddingRight:12}}>{CATEGORY_ICONS[p.category]} {p.name.split("—")[0].trim()}</div>
        <div style={{flex:1,position:"relative",height:28}}>
          {months.map((m,i)=><div key={i} style={{position:"absolute",left:`${pp(m)}%`,top:0,bottom:0,borderLeft:"1px solid #f0f0f0"}}/>)}
          {todayPct>=0&&todayPct<=100&&<div style={{position:"absolute",left:`${todayPct}%`,top:-6,bottom:-6,borderLeft:"1.5px dashed #D85A30",zIndex:10}}/>}
          <div style={{position:"absolute",left:`${left}%`,width:`${Math.max(width,2)}%`,top:"50%",transform:"translateY(-50%)",height:18,background:`${barColor}20`,borderRadius:5,overflow:"hidden"}}>
            <div style={{width:`${prog}%`,height:"100%",background:barColor,borderRadius:5,opacity:.85}}/>
            {width>10&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:6,fontSize:10,color:"#fff",fontWeight:700}}>{prog}%</div>}
          </div>
          {(p.milestones||[]).map((m,mi)=>(<div key={mi} title={`${m.name}: ${fmtDate(m.date)}`} style={{position:"absolute",left:`${pp(m.date)}%`,top:"50%",transform:"translate(-50%,-50%)",width:9,height:9,borderRadius:2,background:m.done?"#1D9E75":"#fff",border:`1.5px solid ${m.done?"#1D9E75":"#888"}`,zIndex:5,cursor:"pointer"}}/>))}
        </div>
        <div style={{width:36,flexShrink:0,fontSize:11,color:"#888",textAlign:"right",paddingLeft:8}}>{prog}%</div>
      </div>);
    })}
  </div></div>);
}

// ── ANALYTICS ──
function AnalyticsPanel({projects}){
  const byStatus=Object.entries(projects.reduce((a,p)=>{a[p.status]=(a[p.status]||0)+1;return a},{})).map(([name,value])=>({name:name.charAt(0).toUpperCase()+name.slice(1),value,fill:STATUS_COLORS[name]}));
  const byCat=Object.entries(projects.reduce((a,p)=>{a[p.category]=(a[p.category]||0)+1;return a},{})).map(([name,value])=>({name,value}));
  const progressData=projects.map(p=>({name:p.name.split("—")[0].trim().slice(0,15),progress:pct(p),status:p.status}));
  const weeklyData=Array.from({length:6},(_,i)=>({week:`W${i+1}`,...Object.fromEntries(projects.map(p=>([p.name.split("—")[0].trim().slice(0,12),(p.weekly_progress||[])[i]||0])))}));
  const phaseCount=projects.flatMap(p=>p.tasks||[]).reduce((a,t)=>{a[t.phase]=(a[t.phase]||0)+1;return a},{});
  const phaseData=Object.entries(phaseCount).map(([name,value])=>({name,value}));
  return(<div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16}}>
      <Card title="Distribusi Status">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
            {byStatus.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie>
            <Tooltip content={CTip}/><Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/></PieChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Proyek per Kategori">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={byCat} layout="vertical" margin={{left:8,right:16,top:4,bottom:4}}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
            <XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/>
            <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={100}/>
            <Tooltip content={CTip}/>
            <Bar dataKey="value" name="Proyek" radius={[0,4,4,0]}>{byCat.map((e,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
    <Card title="Progress per Proyek (%)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={progressData} margin={{left:0,right:16,top:4,bottom:50}}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
          <XAxis dataKey="name" tick={{fontSize:9}} angle={-35} textAnchor="end" interval={0}/>
          <YAxis tick={{fontSize:10}} domain={[0,100]} tickFormatter={v=>`${v}%`}/>
          <Tooltip content={CTip} formatter={v=>`${v}%`}/>
          <Bar dataKey="progress" name="Progress" radius={[4,4,0,0]}>{progressData.map((e,i)=><Cell key={i} fill={STATUS_COLORS[e.status]||"#378ADD"}/>)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
      <Card title="Weekly Progress Trend (%)">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyData} margin={{left:0,right:8,top:4,bottom:4}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="week" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={[0,100]}/>
            <Tooltip content={CTip}/>
            {projects.map((p,i)=>(<Line key={p.id} type="monotone" dataKey={p.name.split("—")[0].trim().slice(0,12)} stroke={CHART_COLORS[i%CHART_COLORS.length]} strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Tasks per Phase">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={phaseData} dataKey="value" cx="50%" cy="50%" outerRadius={75}>{phaseData.map((e,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie>
            <Tooltip content={CTip}/><Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:10}}/>
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  </div>);
}

// ── TASK PANEL ──
function TaskPanel({project,onUpdate}){
  const [newTask,setNewTask]=useState("");
  const [newPrio,setNewPrio]=useState("Medium");
  const [newPhase,setNewPhase]=useState("Drawing");
  const [saving,setSaving]=useState(false);
  const phases=["Specification","Calculation","Analysis","Drawing","Procurement","Review"];

  const toggleTask=async(taskId,currentDone)=>{
    const{error}=await supabase.from("tasks").update({done:!currentDone}).eq("id",taskId);
    if(!error){
      const updatedTasks=project.tasks.map(t=>t.id===taskId?{...t,done:!currentDone}:t);
      const newProgress=Math.round(updatedTasks.filter(t=>t.done).length/updatedTasks.length*100);
      await supabase.from("projects").update({progress:newProgress}).eq("id",project.id);
      onUpdate({...project,tasks:updatedTasks,progress:newProgress});
    }
  };

  const addTask=async()=>{
    if(!newTask.trim()||saving) return;
    setSaving(true);
    const{data,error}=await supabase.from("tasks").insert({project_id:project.id,name:newTask.trim(),done:false,priority:newPrio,phase:newPhase}).select().single();
    if(!error){
      onUpdate({...project,tasks:[...project.tasks,data]});
      setNewTask("");
    }
    setSaving(false);
  };

  const byPhase=phases.reduce((acc,ph)=>{acc[ph]=project.tasks.filter(t=>t.phase===ph);return acc},{});

  return(<div>
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,padding:"10px 12px",background:"#f8f9fa",borderRadius:8}}>
      <ProgressRing value={pct(project)} color={STATUS_COLORS[project.status]}/>
      <div>
        <div style={{fontSize:18,fontWeight:700,color:"#111"}}>{pct(project)}%</div>
        <div style={{fontSize:12,color:"#666"}}>{project.tasks.filter(t=>t.done).length}/{project.tasks.length} tasks selesai</div>
      </div>
    </div>
    {phases.map(ph=>{
      const ts=byPhase[ph];if(!ts?.length) return null;
      const done=ts.filter(t=>t.done).length;
      return(<div key={ph} style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
          <div style={{fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:.8}}>{ph}</div>
          <div style={{flex:1,height:1,background:"#eee"}}/>
          <div style={{fontSize:11,color:"#888"}}>{done}/{ts.length}</div>
        </div>
        {ts.map(t=>(<div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#fff",border:"1px solid #f0f0f0",borderRadius:8,marginBottom:4}}>
          <div onClick={()=>toggleTask(t.id,t.done)} style={{width:18,height:18,borderRadius:5,cursor:"pointer",border:`2px solid ${t.done?"#1D9E75":"#ddd"}`,background:t.done?"#1D9E75":"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>{t.done?"✓":""}</div>
          <span style={{flex:1,fontSize:13,color:t.done?"#aaa":"#333",textDecoration:t.done?"line-through":"none"}}>{t.name}</span>
          <PriorityBadge p={t.priority}/>
          {t.assignee&&<span style={{fontSize:11,color:"#888"}}>{t.assignee}</span>}
        </div>))}
      </div>);
    })}
    <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
      <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Tambah task baru..."
        style={{flex:1,minWidth:140,padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none"}}/>
      <select value={newPhase} onChange={e=>setNewPhase(e.target.value)} style={{padding:"7px 8px",border:"1px solid #ddd",borderRadius:8,fontSize:12,outline:"none"}}>
        {phases.map(p=><option key={p}>{p}</option>)}
      </select>
      <select value={newPrio} onChange={e=>setNewPrio(e.target.value)} style={{padding:"7px 8px",border:"1px solid #ddd",borderRadius:8,fontSize:12,outline:"none"}}>
        {["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
      </select>
      <button onClick={addTask} disabled={saving} style={{padding:"7px 14px",background:"#185FA5",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:600,opacity:saving?.6:1}}>
        {saving?"...":"+ Add"}
      </button>
    </div>
  </div>);
}

// ── DETAIL DRAWER ──
function DetailDrawer({project,onClose,onUpdate}){
  const [tab,setTab]=useState("overview");
  const [savingStatus,setSavingStatus]=useState(false);
  const tabs=[{id:"overview",label:"Overview"},{id:"tasks",label:`Tasks (${project.tasks.length})`},{id:"milestones",label:"Milestones"},{id:"chart",label:"Analytics"}];
  const dl=daysLeft(project.deadline);

  const changeStatus=async(s)=>{
    setSavingStatus(true);
    const{error}=await supabase.from("projects").update({status:s}).eq("id",project.id);
    if(!error) onUpdate({...project,status:s});
    setSavingStatus(false);
  };

  return(<div style={{position:"fixed",inset:0,zIndex:150,display:"flex"}} onClick={onClose}>
    <div style={{flex:1,background:"rgba(0,0,0,.3)"}}/>
    <div style={{width:"min(580px,98vw)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,.12)"}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid #f0f0f0",background:`linear-gradient(135deg,${STATUS_COLORS[project.status]}11 0%,#fff 60%)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <div style={{fontSize:22}}>{CATEGORY_ICONS[project.category]}</div>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#888"}}>✕</button>
        </div>
        <div style={{fontSize:17,fontWeight:700,color:"#111",lineHeight:1.3,marginBottom:6}}>{project.name}</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Badge status={project.status}/><PriorityBadge p={project.priority}/>
          <span style={{fontSize:11,color:"#888",padding:"2px 8px",border:"1px solid #eee",borderRadius:6}}>Rev.{project.revision||0}</span>
          <span style={{fontSize:11,color:"#888"}}>{project.drw_no}</span>
        </div>
      </div>
      <div style={{display:"flex",borderBottom:"1px solid #f0f0f0",padding:"0 1.5rem"}}>
        {tabs.map(t=>(<button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?600:400,color:tab===t.id?"#185FA5":"#888",borderBottom:tab===t.id?"2px solid #185FA5":"2px solid transparent"}}>{t.label}</button>))}
      </div>
      <div style={{padding:"1.25rem 1.5rem"}}>
        {tab==="overview"&&(<div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{label:"Progress",val:`${pct(project)}%`,sub:"task completion",color:STATUS_COLORS[project.status]},{label:"Deadline",val:dl.label,sub:fmtDate(project.deadline),color:dl.color}]
              .map((k,i)=>(<div key={i} style={{background:"#f8f9fa",borderRadius:10,padding:12}}>
                <div style={{fontSize:11,color:"#888",marginBottom:4}}>{k.label}</div>
                <div style={{fontSize:18,fontWeight:700,color:k.color||"#111"}}>{k.val}</div>
                <div style={{fontSize:10,color:"#aaa"}}>{k.sub}</div>
              </div>))}
          </div>
          <div style={{background:"#f8f9fa",borderRadius:10,padding:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[{k:"Engineer",v:project.engineer||"—"},{k:"Client",v:project.client||"—"},{k:"Start Date",v:fmtDate(project.start_date)},{k:"Deadline",v:fmtDate(project.deadline)},{k:"Kategori",v:project.category},{k:"Drawing No.",v:project.drw_no||"—"}]
                .map(r=>(<div key={r.k}><div style={{fontSize:10,color:"#aaa",marginBottom:2}}>{r.k}</div><div style={{fontSize:13,fontWeight:500,color:"#222"}}>{r.v}</div></div>))}
            </div>
          </div>
          {project.description&&(<div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:4,textTransform:"uppercase",letterSpacing:.6}}>Deskripsi</div>
            <div style={{fontSize:13,color:"#444",lineHeight:1.6}}>{project.description}</div>
          </div>)}

          <div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:6,textTransform:"uppercase",letterSpacing:.6}}>Ubah Status</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {Object.entries(STATUS_COLORS).map(([s,c])=>(<button key={s} onClick={()=>changeStatus(s)} disabled={savingStatus}
                style={{padding:"6px 14px",borderRadius:999,border:`1.5px solid ${c}`,background:project.status===s?c:"transparent",color:project.status===s?"#fff":c,fontSize:12,cursor:"pointer",fontWeight:500,opacity:savingStatus?.6:1}}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>))}
            </div>
          </div>
        </div>)}
        {tab==="tasks"&&<TaskPanel project={project} onUpdate={onUpdate}/>}
        {tab==="milestones"&&(<div>
          {(project.milestones||[]).map((m,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{width:24,height:24,borderRadius:6,flexShrink:0,background:m.done?"#1D9E75":"#fff",border:`2px solid ${m.done?"#1D9E75":"#ddd"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}>{m.done?"✓":""}</div>
            <div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:m.done?"#666":"#222",textDecoration:m.done?"line-through":"none"}}>{m.name}</div><div style={{fontSize:11,color:"#aaa"}}>{fmtDate(m.date)}</div></div>
            <div style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:m.done?"#e1f5ee":"#f1efe8",color:m.done?"#085041":"#5f5e5a"}}>{m.done?"Selesai":"Pending"}</div>
          </div>))}
          {(!project.milestones||!project.milestones.length)&&<div style={{textAlign:"center",padding:"2rem",color:"#aaa",fontSize:13}}>Belum ada milestone</div>}
        </div>)}
        {tab==="chart"&&(<div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card title="Progress Radial">
            <div style={{display:"flex",justifyContent:"center",padding:"8px 0"}}>
              <RadialBarChart width={200} height={140} cx={100} cy={110} innerRadius={40} outerRadius={80} barSize={14}
                data={[{name:"Progress",value:pct(project),fill:STATUS_COLORS[project.status]}]} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" cornerRadius={6} background={{fill:"#f3f4f6"}}/>
                <text x={100} y={100} textAnchor="middle" fill="#111" fontSize={24} fontWeight={700}>{pct(project)}%</text>
                <text x={100} y={118} textAnchor="middle" fill="#888" fontSize={11}>{project.status}</text>
              </RadialBarChart>
            </div>
          </Card>
          {project.weekly_progress?.length>1&&(<Card title="Weekly Progress Trend">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={project.weekly_progress.map((v,i)=>({week:`W${i+1}`,progress:v}))} margin={{left:0,right:8,top:4,bottom:4}}>
                <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={STATUS_COLORS[project.status]} stopOpacity={.3}/>
                  <stop offset="100%" stopColor={STATUS_COLORS[project.status]} stopOpacity={0}/>
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="week" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}} domain={[0,100]}/>
                <Tooltip formatter={v=>`${v}%`}/>
                <Area type="monotone" dataKey="progress" stroke={STATUS_COLORS[project.status]} strokeWidth={2} fill="url(#pg)"/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>)}
        </div>)}
      </div>
    </div>
  </div>);
}

// ── MODAL TAMBAH PROYEK ──
function ProjectModal({onClose,onSave}){
  const [form,setForm]=useState({name:"",category:"Structure",status:"planning",engineer:"",deadline:"",start_date:"",priority:"High",client:"",drw_no:"",description:""});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const save=async()=>{
    if(!form.name.trim()){alert("Nama proyek tidak boleh kosong");return;}
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:16,padding:"1.5rem",width:"min(560px,96vw)",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
        <div style={{fontSize:18,fontWeight:600,color:"#111"}}>Tambah Proyek Baru</div>
        <button onClick={onClose} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"#888"}}>✕</button>
      </div>
      {[{label:"Nama Proyek *",key:"name",placeholder:"Contoh: Structural Frame Conveyor"},{label:"Nomor Drawing",key:"drw_no",placeholder:"STR-2026-001"},{label:"Engineer / PIC",key:"engineer",placeholder:"Nama engineer"},{label:"Client / Owner",key:"client",placeholder:"Nama client"}]
        .map(f=>(<div key={f.key} style={{marginBottom:12}}>
          <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
          <input value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder} style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>))}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {[{label:"Kategori",key:"category",opts:CATEGORIES},{label:"Prioritas",key:"priority",opts:["High","Medium","Low"]},{label:"Status",key:"status",opts:Object.keys(STATUS_COLORS)}]
          .map(f=>(<div key={f.key}><label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
            <select value={form[f.key]} onChange={e=>set(f.key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none"}}>
              {f.opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}</select></div>))}

      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        {[{label:"Start Date",key:"start_date"},{label:"Deadline",key:"deadline"}].map(f=>(<div key={f.key}>
          <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
          <input type="date" value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>))}
      </div>
      <div style={{marginBottom:16}}><label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>Deskripsi</label>
        <textarea value={form.description||""} onChange={e=>set("description",e.target.value)} rows={3} style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/></div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{padding:"8px 16px",border:"1px solid #ddd",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:13}}>Batal</button>
        <button onClick={save} disabled={saving} style={{padding:"8px 20px",border:"none",borderRadius:8,background:"#185FA5",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,opacity:saving?.6:1}}>{saving?"Menyimpan...":"Simpan Proyek"}</button>
      </div>
    </div>
  </div>);
}

// ── PROJECT CARD ──
function ProjectCard({p,onClick,onDelete,expanded}){
  const progress=pct(p),dl=daysLeft(p.deadline),barColor=STATUS_COLORS[p.status]||"#378ADD";
  return(<div onClick={onClick} style={{background:"#fff",borderRadius:12,border:"1px solid #eee",padding:"1rem 1.25rem",cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.04)",transition:"box-shadow .15s"}}
    onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"} onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)"}>
    <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
      <div style={{width:40,height:40,borderRadius:10,background:`${barColor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{CATEGORY_ICONS[p.category]||"📐"}</div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
          <div style={{fontSize:14,fontWeight:600,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:280}}>{p.name}</div>
          <Badge status={p.status}/><PriorityBadge p={p.priority}/>
        </div>
        <div style={{fontSize:12,color:"#888",marginBottom:8}}>👤 {p.engineer||"—"} &nbsp;·&nbsp; 🏢 {p.client||"—"} &nbsp;·&nbsp; 📄 {p.drw_no||"—"}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{flex:1,height:6,background:"#eee",borderRadius:3,overflow:"hidden"}}><div style={{width:`${progress}%`,height:"100%",background:barColor,borderRadius:3,transition:"width .5s"}}/></div>
          <span style={{fontSize:12,fontWeight:600,color:barColor,minWidth:34}}>{progress}%</span>
          <span style={{fontSize:11,color:dl.color,whiteSpace:"nowrap"}}>{dl.label}</span>
          <MiniSparkline data={p.weekly_progress} color={barColor}/>
        </div>
        {expanded&&(<div style={{marginTop:8,display:"flex",gap:16,flexWrap:"wrap",fontSize:11,color:"#aaa"}}>
          <span>📅 {fmtDate(p.start_date)} → {fmtDate(p.deadline)}</span>
          <span>✅ {p.tasks.filter(t=>t.done).length}/{p.tasks.length} tasks</span>
        </div>)}
      </div>
      <button onClick={e=>{e.stopPropagation();onDelete();}} style={{border:"none",background:"none",cursor:"pointer",color:"#ddd",fontSize:14,flexShrink:0,padding:4}}
        onMouseEnter={e=>e.currentTarget.style.color="#D85A30"} onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>🗑</button>
    </div>
  </div>);
}

// ── MAIN APP ──
export default function App(){
  const [session,setSession]=useState(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [projects,setProjects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [view,setView]=useState("dashboard");
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [sort,setSort]=useState("deadline");
  const [modal,setModal]=useState(false);
  const [detail,setDetail]=useState(null);

  // Load data dari Supabase
  const loadProjects=async()=>{
    setLoading(true);
    const{data:projectsData}=await supabase.from("projects").select("*").order("created_at",{ascending:false});
    if(projectsData){
      const withDetails=await Promise.all(projectsData.map(async(p)=>{
        const{data:tasks}=await supabase.from("tasks").select("*").eq("project_id",p.id).order("created_at");
        const{data:milestones}=await supabase.from("milestones").select("*").eq("project_id",p.id).order("date");
        return{...p,tasks:tasks||[],milestones:milestones||[]};
      }));
      setProjects(withDetails);
    }
    setLoading(false);
  };

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);setAuthLoading(false);
    });
    const{data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{
      setSession(session);setAuthLoading(false);
    });
    return()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{if(session)loadProjects();},[session]);

  const addProject=async(form)=>{
    const{data,error}=await supabase.from("projects").insert({
      name:form.name,category:form.category,status:form.status,engineer:form.engineer,
      deadline:form.deadline||null,start_date:form.start_date||null,priority:form.priority,
      budget:0,spent:0,client:form.client,drw_no:form.drw_no,
      description:form.description,progress:0,revision:0,weekly_progress:[0,0,0,0,0,0]
    }).select().single();
    if(!error){
      setProjects(ps=>[{...data,tasks:[],milestones:[]},...ps]);
      setModal(false);
    }
  };

  const updateProject=(updated)=>{
    setProjects(ps=>ps.map(p=>p.id===updated.id?updated:p));
    setDetail(updated);
  };

  const deleteProject=async(id)=>{
    if(!confirm("Hapus proyek ini? Semua tasks dan milestones akan ikut terhapus.")) return;
    await supabase.from("projects").delete().eq("id",id);
    setProjects(ps=>ps.filter(p=>p.id!==id));
    setDetail(null);
  };

  const filtered=useMemo(()=>{
    let ps=[...projects];
    if(filter!=="all") ps=ps.filter(p=>p.status===filter);
    if(search.trim()) ps=ps.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||(p.engineer||"").toLowerCase().includes(search.toLowerCase())||(p.client||"").toLowerCase().includes(search.toLowerCase()));
    ps.sort((a,b)=>{
      if(sort==="deadline") return new Date(a.deadline)-new Date(b.deadline);
      if(sort==="progress") return pct(b)-pct(a);
      if(sort==="priority"){const o={High:0,Medium:1,Low:2};return o[a.priority]-o[b.priority];}
      if(sort==="budget") return (b.budget||0)-(a.budget||0);
      return 0;
    });
    return ps;
  },[projects,filter,search,sort]);

  const stats=useMemo(()=>{
    const total=projects.length,active=projects.filter(p=>p.status==="active").length,done=projects.filter(p=>p.status==="done").length,review=projects.filter(p=>p.status==="review").length;
    const overdue=projects.filter(p=>p.status!=="done"&&new Date(p.deadline)<new Date()).length;
    const avgProg=total?Math.round(projects.reduce((a,p)=>a+pct(p),0)/total):0;
    const totalBudget=0,totalSpent=0;
    return{total,active,done,review,overdue,avgProg,totalBudget,totalSpent};
  },[projects]);

  const NAV=[{id:"dashboard",label:"Dashboard",icon:"📊"},{id:"projects",label:"Projects",icon:"📋"},{id:"gantt",label:"Gantt Chart",icon:"📅"},{id:"analytics",label:"Analytics",icon:"📈"}];

  if(authLoading) return <Spinner/>;
  if(!session) return <Auth/>;
  if(loading) return <Spinner/>;

  return(<div style={{minHeight:"100vh",background:"#f5f6f8",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex"}}>
    {/* Sidebar */}
    <div style={{width:210,background:"#111827",flexShrink:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
      <div style={{padding:"1.25rem 1rem 1rem",borderBottom:"1px solid #1f2937"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:.5}}>⚙️ MDE Tracker</div>
        <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>Mechanical Design Engineering</div>
      </div>
      <nav style={{padding:"0.5rem 0",flex:1}}>
        {NAV.map(n=>(<button key={n.id} onClick={()=>setView(n.id)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 1rem",border:"none",background:view===n.id?"#1f2937":"transparent",cursor:"pointer",textAlign:"left",borderLeft:view===n.id?"3px solid #378ADD":"3px solid transparent",transition:"all .12s"}}>
          <span style={{fontSize:14}}>{n.icon}</span>
          <span style={{fontSize:12,fontWeight:view===n.id?600:400,color:view===n.id?"#fff":"#9ca3af"}}>{n.label}</span>
        </button>))}
      </nav>
      <div style={{padding:"1rem",borderTop:"1px solid #1f2937"}}>
        <div style={{fontSize:10,color:"#9ca3af",marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          👤 {session?.user?.user_metadata?.full_name||session?.user?.email||"User"}
        </div>
        <div style={{fontSize:10,color:"#4b5563",lineHeight:1.7,marginBottom:8}}>
          <div>{projects.length} projects total</div>
          <div style={{color:stats.active?"#639922":"#4b5563"}}>{stats.active} active</div>
          {stats.overdue>0&&<div style={{color:"#D85A30"}}>{stats.overdue} overdue ⚠️</div>}
        </div>
        <button onClick={()=>supabase.auth.signOut()}
          style={{width:"100%",padding:"6px 0",background:"#374151",border:"none",borderRadius:6,color:"#9ca3af",fontSize:11,cursor:"pointer",fontWeight:500}}>
          🚪 Logout
        </button>
      </div>
    </div>

    {/* Main */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
      <div style={{background:"#fff",borderBottom:"1px solid #eee",padding:"10px 1.25rem",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <div style={{flex:1}}><div style={{fontSize:16,fontWeight:700,color:"#111"}}>{NAV.find(n=>n.id===view)?.label}</div></div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Cari proyek, engineer, client..." style={{padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",width:220,background:"#f9fafb"}}/>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,outline:"none",background:"#f9fafb"}}>
          <option value="deadline">Sort: Deadline</option><option value="progress">Sort: Progress</option>
          <option value="priority">Sort: Priority</option><option value="budget">Sort: Budget</option>
        </select>
        <button onClick={()=>setModal(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#185FA5",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>+ Tambah Proyek</button>
        <button onClick={loadProjects} title="Refresh data" style={{padding:"7px 10px",border:"1px solid #eee",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:14}}>🔄</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"1.25rem"}}>
        {view==="dashboard"&&(<div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
            {[{label:"Total Proyek",val:stats.total,sub:"semua status",color:"#185FA5"},{label:"Active",val:stats.active,sub:"berjalan",color:"#1D9E75"},{label:"In Review",val:stats.review,sub:"menunggu approval",color:"#BA7517"},{label:"Completed",val:stats.done,sub:"selesai",color:"#0F6E56"},{label:"Overdue",val:stats.overdue,sub:"lewat deadline",color:stats.overdue?"#D85A30":"#888"},{label:"Avg Progress",val:`${stats.avgProg}%`,sub:"semua proyek",color:"#378ADD"}]
              .map((k,i)=>(<div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.05)",borderLeft:`3px solid ${k.color}`}}>
                <div style={{fontSize:10,color:"#888",marginBottom:4}}>{k.label}</div>
                <div style={{fontSize:20,fontWeight:700,color:k.color}}>{k.val}</div>
                <div style={{fontSize:10,color:"#bbb",marginTop:2}}>{k.sub}</div>
              </div>))}
          </div>

          {!projects.length&&(<div style={{textAlign:"center",padding:"3rem",color:"#aaa"}}>
            <div style={{fontSize:40,marginBottom:8}}>📋</div>
            <div style={{fontSize:15,fontWeight:600,marginBottom:4}}>Belum ada proyek</div>
            <div style={{fontSize:13}}>Klik "+ Tambah Proyek" untuk memulai</div>
          </div>)}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.map(p=><ProjectCard key={p.id} p={p} onClick={()=>setDetail(p)} onDelete={()=>deleteProject(p.id)}/>)}</div>
        </div>)}

        {view==="projects"&&(<div>
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {["all","planning","active","review","done","hold"].map(f=>(<button key={f} onClick={()=>setFilter(f)}
              style={{padding:"5px 14px",borderRadius:999,fontSize:12,cursor:"pointer",border:`1px solid ${filter===f?"#185FA5":"#ddd"}`,background:filter===f?"#185FA5":"#fff",color:filter===f?"#fff":"#555",fontWeight:filter===f?600:400}}>
              {f==="all"?"Semua":f.charAt(0).toUpperCase()+f.slice(1)} ({f==="all"?projects.length:projects.filter(p=>p.status===f).length})
            </button>))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {filtered.map(p=><ProjectCard key={p.id} p={p} onClick={()=>setDetail(p)} onDelete={()=>deleteProject(p.id)} expanded/>)}
            {!filtered.length&&<div style={{textAlign:"center",padding:"3rem",color:"#aaa",fontSize:14}}>Tidak ada proyek ditemukan</div>}
          </div>
        </div>)}

        {view==="gantt"&&projects.length>0&&(<div style={{background:"#fff",borderRadius:12,padding:"1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
          <div style={{fontSize:14,fontWeight:600,color:"#222",marginBottom:16}}>Timeline Proyek — Gantt Chart</div>
          <GanttBar projects={projects}/>
        </div>)}

        {view==="analytics"&&projects.length>0&&<AnalyticsPanel projects={projects}/>}

        {(view==="gantt"||view==="analytics")&&!projects.length&&(
          <div style={{textAlign:"center",padding:"3rem",color:"#aaa"}}>
            <div style={{fontSize:40,marginBottom:8}}>📊</div>
            <div style={{fontSize:14}}>Tambah proyek dulu untuk melihat {view==="gantt"?"Gantt Chart":"Analytics"}</div>
          </div>
        )}
      </div>
    </div>

    {modal&&<ProjectModal onClose={()=>setModal(false)} onSave={addProject}/>}
    {detail&&<DetailDrawer project={detail} onClose={()=>setDetail(null)} onUpdate={updateProject}/>}
  </div>);
}