import { useState, useEffect, useRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PieChart, Pie, Cell, LineChart, Line,
  Legend, AreaChart, Area
} from "recharts";

const CATEGORIES = ["Structure","HVAC","Piping","Machinery","Pressure Vessel","Lifting","Electrical","Civil"];
const CATEGORY_ICONS = {
  Structure:"🔩", HVAC:"💨", Piping:"🔧", Machinery:"⚙️",
  "Pressure Vessel":"🛢️", Lifting:"🏗️", Electrical:"⚡", Civil:"🏛️"
};
const STATUS_COLORS = {
  planning:"#378ADD", active:"#639922", review:"#BA7517", done:"#1D9E75", hold:"#888780"
};
const PRIORITY_COLORS = { High:"#D85A30", Medium:"#BA7517", Low:"#639922" };
const PHASE_COLORS = ["#185FA5","#1D9E75","#BA7517","#D85A30","#7F77DD","#0F6E56"];

const INITIAL_PROJECTS = [
  {
    id:1, name:"Structural Frame — Conveyor System", category:"Structure",
    status:"active", progress:65, engineer:"Budi Santoso", deadline:"2026-07-15",
    startDate:"2026-04-01", priority:"High", budget:850000000, spent:560000000,
    client:"PT Maju Jaya", drwNo:"STR-2026-001", revision:3,
    description:"Perancangan rangka struktural conveyor batubara kapasitas 500 tph",
    tasks:[
      {id:1,name:"Preliminary load calculation",done:true,priority:"High",assignee:"Budi S.",dueDate:"2026-04-10",phase:"Calculation"},
      {id:2,name:"FEA simulation (ANSYS)",done:true,priority:"High",assignee:"Budi S.",dueDate:"2026-04-25",phase:"Analysis"},
      {id:3,name:"2D drawing & BOM",done:false,priority:"High",assignee:"Andi R.",dueDate:"2026-06-20",phase:"Drawing"},
      {id:4,name:"3D model finalisasi (SolidWorks)",done:false,priority:"Medium",assignee:"Andi R.",dueDate:"2026-07-01",phase:"Drawing"},
      {id:5,name:"Material procurement list",done:false,priority:"Medium",assignee:"Dewi K.",dueDate:"2026-07-05",phase:"Procurement"},
      {id:6,name:"Internal review & approval",done:false,priority:"Low",assignee:"Manager",dueDate:"2026-07-12",phase:"Review"},
    ],
    milestones:[
      {name:"Kick-off",date:"2026-04-01",done:true},
      {name:"Calculation Approved",date:"2026-04-25",done:true},
      {name:"Drawing 50%",date:"2026-05-30",done:true},
      {name:"Drawing Complete",date:"2026-07-01",done:false},
      {name:"Client Submission",date:"2026-07-15",done:false},
    ],
    weeklyProgress:[30,40,52,60,65,65]
  },
  {
    id:2, name:"HVAC Duct Design — Building B", category:"HVAC",
    status:"review", progress:88, engineer:"Rina Pertiwi", deadline:"2026-06-20",
    startDate:"2026-03-15", priority:"Medium", budget:320000000, spent:290000000,
    client:"PT Gedung Properti", drwNo:"HVAC-2026-007", revision:5,
    description:"Desain sistem ducting HVAC gedung perkantoran 8 lantai, kapasitas 500 TR",
    tasks:[
      {id:1,name:"Air flow & psychrometric calc",done:true,priority:"High",assignee:"Rina P.",dueDate:"2026-03-25",phase:"Calculation"},
      {id:2,name:"Duct routing layout",done:true,priority:"High",assignee:"Rina P.",dueDate:"2026-04-10",phase:"Drawing"},
      {id:3,name:"Equipment selection & spec",done:true,priority:"High",assignee:"Sari M.",dueDate:"2026-04-20",phase:"Specification"},
      {id:4,name:"Isometric drawing",done:true,priority:"Medium",assignee:"Rina P.",dueDate:"2026-05-15",phase:"Drawing"},
      {id:5,name:"Client review meeting",done:false,priority:"Low",assignee:"Rina P.",dueDate:"2026-06-15",phase:"Review"},
    ],
    milestones:[
      {name:"Kick-off",date:"2026-03-15",done:true},
      {name:"Calculation Approved",date:"2026-03-28",done:true},
      {name:"Layout Complete",date:"2026-04-15",done:true},
      {name:"Drawing Issued",date:"2026-05-20",done:true},
      {name:"Client Approval",date:"2026-06-20",done:false},
    ],
    weeklyProgress:[20,45,60,75,82,88]
  },
  {
    id:3, name:"Pressure Vessel — Shell & Tube HE", category:"Pressure Vessel",
    status:"planning", progress:20, engineer:"Agus Wibowo", deadline:"2026-09-01",
    startDate:"2026-05-01", priority:"High", budget:1200000000, spent:180000000,
    client:"Pertamina RU IV", drwNo:"PV-2026-012", revision:1,
    description:"Heat exchanger shell & tube TEMA E-type, tekanan desain 15 bar, temp 200°C",
    tasks:[
      {id:1,name:"Process data sheet review",done:true,priority:"High",assignee:"Agus W.",dueDate:"2026-05-10",phase:"Specification"},
      {id:2,name:"ASME Sec VIII Div.1 calc",done:false,priority:"High",assignee:"Agus W.",dueDate:"2026-06-01",phase:"Calculation"},
      {id:3,name:"TEMA mechanical design",done:false,priority:"High",assignee:"Agus W.",dueDate:"2026-06-20",phase:"Calculation"},
      {id:4,name:"Nozzle & flange design",done:false,priority:"High",assignee:"Hendra T.",dueDate:"2026-07-10",phase:"Drawing"},
      {id:5,name:"Fabrication drawing set",done:false,priority:"Medium",assignee:"Hendra T.",dueDate:"2026-08-01",phase:"Drawing"},
      {id:6,name:"Material take-off (MTO)",done:false,priority:"Medium",assignee:"Dewi K.",dueDate:"2026-08-15",phase:"Procurement"},
      {id:7,name:"3rd party review (DNV GL)",done:false,priority:"Low",assignee:"Agus W.",dueDate:"2026-08-25",phase:"Review"},
    ],
    milestones:[
      {name:"Kick-off",date:"2026-05-01",done:true},
      {name:"PDS Approved",date:"2026-05-12",done:true},
      {name:"Calc Complete",date:"2026-06-25",done:false},
      {name:"Drawing IFR",date:"2026-08-01",done:false},
      {name:"Client Approval",date:"2026-09-01",done:false},
    ],
    weeklyProgress:[5,10,15,18,20,20]
  },
  {
    id:4, name:"Overhead Crane — 5T Single Girder", category:"Lifting",
    status:"done", progress:100, engineer:"Dewi Kusuma", deadline:"2026-05-30",
    startDate:"2026-02-01", priority:"Low", budget:450000000, spent:432000000,
    client:"PT Industri Baja", drwNo:"CR-2026-003", revision:2,
    description:"EOT crane 5 ton, span 15m, lifting height 6m, FEM Class M5",
    tasks:[
      {id:1,name:"Load & fatigue calculation",done:true,priority:"High",assignee:"Dewi K.",dueDate:"2026-02-15",phase:"Calculation"},
      {id:2,name:"Girder structural design",done:true,priority:"High",assignee:"Dewi K.",dueDate:"2026-03-01",phase:"Calculation"},
      {id:3,name:"Rail & end-carriage design",done:true,priority:"High",assignee:"Budi S.",dueDate:"2026-03-15",phase:"Drawing"},
      {id:4,name:"Electrical & hoist spec",done:true,priority:"Medium",assignee:"Rina P.",dueDate:"2026-04-01",phase:"Specification"},
      {id:5,name:"Full drawing set issued",done:true,priority:"Medium",assignee:"Dewi K.",dueDate:"2026-04-20",phase:"Drawing"},
      {id:6,name:"Factory acceptance test",done:true,priority:"Low",assignee:"Dewi K.",dueDate:"2026-05-25",phase:"Review"},
    ],
    milestones:[
      {name:"Kick-off",date:"2026-02-01",done:true},
      {name:"Calc Approved",date:"2026-03-05",done:true},
      {name:"Drawing IFA",date:"2026-04-22",done:true},
      {name:"FAT Passed",date:"2026-05-26",done:true},
      {name:"Project Closed",date:"2026-05-30",done:true},
    ],
    weeklyProgress:[15,35,55,72,88,100]
  },
  {
    id:5, name:"Piping Stress Analysis — Compressor Skid", category:"Piping",
    status:"active", progress:45, engineer:"Hendra Tan", deadline:"2026-08-15",
    startDate:"2026-04-20", priority:"High", budget:680000000, spent:295000000,
    client:"PT Gas Nusantara", drwNo:"PIP-2026-005", revision:2,
    description:"Caesar II stress analysis pipa 6\" Sch 80 carbon steel, design pressure 40 bar",
    tasks:[
      {id:1,name:"Isometric drawing review",done:true,priority:"High",assignee:"Hendra T.",dueDate:"2026-05-01",phase:"Specification"},
      {id:2,name:"Caesar II modeling",done:true,priority:"High",assignee:"Hendra T.",dueDate:"2026-05-20",phase:"Analysis"},
      {id:3,name:"Stress analysis — sustained",done:false,priority:"High",assignee:"Hendra T.",dueDate:"2026-06-15",phase:"Analysis"},
      {id:4,name:"Stress analysis — thermal",done:false,priority:"High",assignee:"Hendra T.",dueDate:"2026-06-30",phase:"Analysis"},
      {id:5,name:"Support design & drawing",done:false,priority:"Medium",assignee:"Andi R.",dueDate:"2026-07-20",phase:"Drawing"},
      {id:6,name:"Stress report compilation",done:false,priority:"Low",assignee:"Hendra T.",dueDate:"2026-08-10",phase:"Review"},
    ],
    milestones:[
      {name:"Kick-off",date:"2026-04-20",done:true},
      {name:"Model Complete",date:"2026-05-22",done:true},
      {name:"Analysis Done",date:"2026-07-01",done:false},
      {name:"Report IFR",date:"2026-08-10",done:false},
      {name:"Client Approval",date:"2026-08-15",done:false},
    ],
    weeklyProgress:[10,22,35,40,45,45]
  },
];

function daysLeft(dl){
  const d=Math.ceil((new Date(dl)-new Date())/(864e5));
  if(d<0) return{label:`${Math.abs(d)}d overdue`,color:"#D85A30",overdue:true};
  if(d===0) return{label:"Due today",color:"#BA7517",overdue:false};
  return{label:`${d}d left`,color:"#888780",overdue:false};
}
function pct(p){
  if(!p.tasks||!p.tasks.length) return p.progress||0;
  return Math.round(p.tasks.filter(t=>t.done).length/p.tasks.length*100);
}
function fmtIDR(n){return"Rp "+Number(n).toLocaleString("id-ID")}
function fmtDate(s){return s?new Date(s).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}):"—"}

function Badge({status}){
  const map={
    planning:{bg:"#E6F1FB",c:"#0C447C",t:"Planning"},
    active:{bg:"#EAF3DE",c:"#27500A",t:"Active"},
    review:{bg:"#FAEEDA",c:"#633806",t:"Review"},
    done:{bg:"#E1F5EE",c:"#085041",t:"Done"},
    hold:{bg:"#F1EFE8",c:"#444441",t:"On Hold"},
  };
  const s=map[status]||map.planning;
  return <span style={{fontSize:11,padding:"3px 10px",borderRadius:999,fontWeight:600,background:s.bg,color:s.c,letterSpacing:.3}}>{s.t}</span>;
}

function PriorityBadge({p}){
  const c=PRIORITY_COLORS[p]||"#888";
  return <span style={{fontSize:10,padding:"2px 8px",borderRadius:999,border:`1px solid ${c}44`,color:c,fontWeight:600,letterSpacing:.3}}>{p}</span>;
}

function ProgressRing({value,size=48,stroke=4,color="#1D9E75"}){
  const r=(size-stroke*2)/2,circ=2*Math.PI*r,offset=circ-(value/100)*circ;
  return(
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s"}}/>
    </svg>
  );
}

function MiniSparkline({data,color}){
  if(!data||data.length<2) return null;
  const max=Math.max(...data),min=0,W=80,H=28,pad=2;
  const pts=data.map((v,i)=>{
    const x=pad+(i/(data.length-1))*(W-pad*2);
    const y=H-pad-(((v-min)/(max-min||1))*(H-pad*2));
    return`${x},${y}`;
  }).join(" ");
  return(
    <svg width={W} height={H} style={{display:"block"}}>
      <polyline points={pts} fill="none" stroke={color||"#1D9E75"} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

function Card({title,children,action}){
  return(
    <div style={{background:"#fff",border:"1px solid #eee",borderRadius:12,padding:"1rem 1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:600,color:"#222"}}>{title}</div>
        {action}
      </div>
      {children}
    </div>
  );
}

const CHART_COLORS=["#185FA5","#1D9E75","#BA7517","#D85A30","#7F77DD","#0F6E56"];
const CTip=(props)=>{
  const{active,payload,label}=props;
  if(!active||!payload?.length) return null;
  return(
    <div style={{background:"#fff",border:"1px solid #eee",borderRadius:8,padding:"8px 12px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.08)"}}>
      <div style={{fontWeight:600,marginBottom:4,color:"#333"}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color||"#555",display:"flex",gap:8,alignItems:"center"}}>
          <div style={{width:8,height:8,borderRadius:2,background:p.color||"#555"}}/>
          {p.name}: <b>{p.value}</b>
        </div>
      ))}
    </div>
  );
};

function GanttBar({projects}){
  const today=new Date();
  const allDates=projects.flatMap(p=>[new Date(p.startDate||p.deadline),new Date(p.deadline)]);
  const minD=new Date(Math.min(...allDates)),maxD=new Date(Math.max(...allDates));
  const totalDays=Math.max((maxD-minD)/864e5,1);
  const months=[];
  const d=new Date(minD);d.setDate(1);
  while(d<=maxD){months.push(new Date(d));d.setMonth(d.getMonth()+1);}
  const pp=(date)=>Math.max(0,Math.min(100,(new Date(date)-minD)/864e5/totalDays*100));
  const todayPct=pp(today);
  return(
    <div style={{overflowX:"auto"}}>
      <div style={{minWidth:600}}>
        <div style={{display:"flex",marginBottom:8,position:"relative",height:20,marginLeft:180}}>
          {months.map((m,i)=>{
            const lp=pp(m),nextM=months[i+1]||maxD,wp=pp(nextM)-lp;
            return <div key={i} style={{position:"absolute",left:`${lp}%`,width:`${wp}%`,fontSize:10,color:"#888",paddingLeft:4,whiteSpace:"nowrap",overflow:"hidden"}}>
              {m.toLocaleDateString("id-ID",{month:"short",year:"2-digit"})}
            </div>;
          })}
        </div>
        {projects.map((p)=>{
          const left=pp(p.startDate||p.deadline);
          const width=pp(p.deadline)-left;
          const prog=pct(p);
          const barColor=STATUS_COLORS[p.status]||"#378ADD";
          return(
            <div key={p.id} style={{display:"flex",alignItems:"center",marginBottom:10,gap:0}}>
              <div style={{width:180,flexShrink:0,fontSize:12,color:"#444",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:500,paddingRight:12}}>
                {CATEGORY_ICONS[p.category]} {p.name.split("—")[0].trim()}
              </div>
              <div style={{flex:1,position:"relative",height:28}}>
                {months.map((m,i)=><div key={i} style={{position:"absolute",left:`${pp(m)}%`,top:0,bottom:0,borderLeft:"1px solid #f0f0f0"}}/>)}
                {todayPct>=0&&todayPct<=100&&<div style={{position:"absolute",left:`${todayPct}%`,top:-6,bottom:-6,borderLeft:"1.5px dashed #D85A30",zIndex:10}}/>}
                <div style={{position:"absolute",left:`${left}%`,width:`${Math.max(width,2)}%`,top:"50%",transform:"translateY(-50%)",height:18,background:`${barColor}20`,borderRadius:5,overflow:"hidden"}}>
                  <div style={{width:`${prog}%`,height:"100%",background:barColor,borderRadius:5,opacity:.85}}/>
                  {width>10&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",paddingLeft:6,fontSize:10,color:"#fff",fontWeight:700}}>{prog}%</div>}
                </div>
                {p.milestones&&p.milestones.map((m,mi)=>(
                  <div key={mi} title={`${m.name}: ${fmtDate(m.date)}`}
                    style={{position:"absolute",left:`${pp(m.date)}%`,top:"50%",transform:"translate(-50%,-50%)",width:9,height:9,borderRadius:2,background:m.done?"#1D9E75":"#fff",border:`1.5px solid ${m.done?"#1D9E75":"#888"}`,zIndex:5,cursor:"pointer"}}/>
                ))}
              </div>
              <div style={{width:36,flexShrink:0,fontSize:11,color:"#888",textAlign:"right",paddingLeft:8}}>{prog}%</div>
            </div>
          );
        })}
        <div style={{display:"flex",gap:16,marginTop:12,flexWrap:"wrap",marginLeft:180}}>
          {[
            {c:"#1D9E75",border:"#1D9E75",label:"Milestone selesai"},
            {c:"#fff",border:"#888",label:"Milestone pending"},
          ].map((x,i)=>(
            <span key={i} style={{fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:9,height:9,borderRadius:2,background:x.c,border:`1.5px solid ${x.border}`}}/>
              {x.label}
            </span>
          ))}
          <span style={{fontSize:10,color:"#888",display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:14,height:1,borderTop:"1.5px dashed #D85A30"}}/>Hari ini
          </span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPanel({projects}){
  const byStatus=Object.entries(
    projects.reduce((a,p)=>{a[p.status]=(a[p.status]||0)+1;return a},{})
  ).map(([name,value])=>({name:name.charAt(0).toUpperCase()+name.slice(1),value,fill:STATUS_COLORS[name]}));

  const byCat=Object.entries(
    projects.reduce((a,p)=>{a[p.category]=(a[p.category]||0)+1;return a},{})
  ).map(([name,value])=>({name,value}));

  const progressData=projects.map(p=>({
    name:p.name.split("—")[0].trim().slice(0,15),
    progress:pct(p),status:p.status,
  }));

  const budgetData=projects.map(p=>({
    name:p.name.split("—")[0].trim().slice(0,13),
    budget:Math.round((p.budget||0)/1e6),
    spent:Math.round((p.spent||0)/1e6),
  }));

  const weeklyData=Array.from({length:6},(_,i)=>({
    week:`W${i+1}`,
    ...Object.fromEntries(projects.map(p=>([p.name.split("—")[0].trim().slice(0,12),(p.weeklyProgress||[])[i]||0])))
  }));

  const phaseCount=projects.flatMap(p=>p.tasks||[]).reduce((a,t)=>{a[t.phase]=(a[t.phase]||0)+1;return a},{});
  const phaseData=Object.entries(phaseCount).map(([name,value])=>({name,value}));

  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16}}>
        <Card title="Distribusi Status">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byStatus} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {byStatus.map((e,i)=><Cell key={i} fill={e.fill}/>)}
              </Pie>
              <Tooltip content={CTip}/>
              <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Proyek per Kategori">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCat} layout="vertical" margin={{left:8,right:16,top:4,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
              <XAxis type="number" tick={{fontSize:10}} allowDecimals={false}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={100}/>
              <Tooltip content={CTip}/>
              <Bar dataKey="value" name="Proyek" radius={[0,4,4,0]}>
                {byCat.map((e,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
              </Bar>
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
            <Bar dataKey="progress" name="Progress" radius={[4,4,0,0]}>
              {progressData.map((e,i)=><Cell key={i} fill={STATUS_COLORS[e.status]||"#378ADD"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Budget vs Realisasi Pengeluaran (Juta Rp)">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={budgetData} margin={{left:0,right:16,top:4,bottom:50}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
            <XAxis dataKey="name" tick={{fontSize:9}} angle={-35} textAnchor="end" interval={0}/>
            <YAxis tick={{fontSize:10}} tickFormatter={v=>`${v}M`}/>
            <Tooltip content={CTip} formatter={v=>`Rp ${v}M`}/>
            <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="budget" name="Budget" fill="#185FA5" radius={[4,4,0,0]} opacity={.45}/>
            <Bar dataKey="spent" name="Realisasi" fill="#D85A30" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <Card title="Tren Weekly Progress (%)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData} margin={{left:0,right:8,top:4,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="week" tick={{fontSize:10}}/>
              <YAxis tick={{fontSize:10}} domain={[0,100]}/>
              <Tooltip content={CTip}/>
              {projects.map((p,i)=>(
                <Line key={p.id} type="monotone"
                  dataKey={p.name.split("—")[0].trim().slice(0,12)}
                  stroke={CHART_COLORS[i%CHART_COLORS.length]}
                  strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Distribusi Tasks per Phase">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={phaseData} dataKey="value" cx="50%" cy="50%" outerRadius={75}
                label={({name,percent})=>`${name} ${Math.round(percent*100)}%`} labelLine={false}>
                {phaseData.map((e,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
              </Pie>
              <Tooltip content={CTip}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function TaskPanel({project,onUpdate}){
  const [newTask,setNewTask]=useState("");
  const [newPrio,setNewPrio]=useState("Medium");
  const [newPhase,setNewPhase]=useState("Drawing");
  const phases=["Specification","Calculation","Analysis","Drawing","Procurement","Review"];

  const addTask=()=>{
    if(!newTask.trim()) return;
    const t={id:Date.now(),name:newTask.trim(),done:false,priority:newPrio,assignee:"",dueDate:"",phase:newPhase};
    onUpdate({...project,tasks:[...project.tasks,t]});
    setNewTask("");
  };
  const toggleTask=(id)=>{
    const tasks=project.tasks.map(t=>t.id===id?{...t,done:!t.done}:t);
    onUpdate({...project,tasks,progress:Math.round(tasks.filter(t=>t.done).length/tasks.length*100)});
  };
  const byPhase=phases.reduce((acc,ph)=>{acc[ph]=project.tasks.filter(t=>t.phase===ph);return acc},{});

  return(
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,padding:"10px 12px",background:"#f8f9fa",borderRadius:8}}>
        <ProgressRing value={pct(project)} color={STATUS_COLORS[project.status]}/>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:"#111"}}>{pct(project)}%</div>
          <div style={{fontSize:12,color:"#666"}}>{project.tasks.filter(t=>t.done).length}/{project.tasks.length} tasks selesai</div>
        </div>
      </div>
      {phases.map(ph=>{
        const ts=byPhase[ph];
        if(!ts?.length) return null;
        const done=ts.filter(t=>t.done).length;
        return(
          <div key={ph} style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <div style={{fontSize:11,fontWeight:700,color:"#555",textTransform:"uppercase",letterSpacing:.8}}>{ph}</div>
              <div style={{flex:1,height:1,background:"#eee"}}/>
              <div style={{fontSize:11,color:"#888"}}>{done}/{ts.length}</div>
            </div>
            {ts.map(t=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"#fff",border:"1px solid #f0f0f0",borderRadius:8,marginBottom:4}}>
                <div onClick={()=>toggleTask(t.id)} style={{width:18,height:18,borderRadius:5,cursor:"pointer",border:`2px solid ${t.done?"#1D9E75":"#ddd"}`,background:t.done?"#1D9E75":"#fff",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#fff"}}>
                  {t.done?"✓":""}
                </div>
                <span style={{flex:1,fontSize:13,color:t.done?"#aaa":"#333",textDecoration:t.done?"line-through":"none"}}>{t.name}</span>
                <PriorityBadge p={t.priority}/>
                {t.assignee&&<span style={{fontSize:11,color:"#888"}}>{t.assignee}</span>}
              </div>
            ))}
          </div>
        );
      })}
      <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
        <input value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()}
          placeholder="Tambah task baru..." style={{flex:1,minWidth:140,padding:"7px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none"}}/>
        <select value={newPhase} onChange={e=>setNewPhase(e.target.value)} style={{padding:"7px 8px",border:"1px solid #ddd",borderRadius:8,fontSize:12,outline:"none"}}>
          {phases.map(p=><option key={p}>{p}</option>)}
        </select>
        <select value={newPrio} onChange={e=>setNewPrio(e.target.value)} style={{padding:"7px 8px",border:"1px solid #ddd",borderRadius:8,fontSize:12,outline:"none"}}>
          {["High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
        </select>
        <button onClick={addTask} style={{padding:"7px 14px",background:"#185FA5",color:"#fff",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",fontWeight:600}}>+ Add</button>
      </div>
    </div>
  );
}

function DetailDrawer({project,onClose,onUpdate}){
  const [tab,setTab]=useState("overview");
  const tabs=[{id:"overview",label:"Overview"},{id:"tasks",label:`Tasks (${project.tasks.length})`},{id:"milestones",label:"Milestones"},{id:"chart",label:"Analytics"}];
  const dl=daysLeft(project.deadline);
  const budgetPct=project.budget?Math.round((project.spent||0)/project.budget*100):0;

  return(
    <div style={{position:"fixed",inset:0,zIndex:150,display:"flex"}} onClick={onClose}>
      <div style={{flex:1,background:"rgba(0,0,0,.3)"}}/>
      <div style={{width:"min(580px,98vw)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-8px 0 40px rgba(0,0,0,.12)"}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:"1.25rem 1.5rem",borderBottom:"1px solid #f0f0f0",background:`linear-gradient(135deg,${STATUS_COLORS[project.status]}11 0%,#fff 60%)`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div style={{fontSize:22}}>{CATEGORY_ICONS[project.category]}</div>
            <button onClick={onClose} style={{border:"none",background:"none",fontSize:18,cursor:"pointer",color:"#888"}}>✕</button>
          </div>
          <div style={{fontSize:17,fontWeight:700,color:"#111",lineHeight:1.3,marginBottom:6}}>{project.name}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            <Badge status={project.status}/>
            <PriorityBadge p={project.priority}/>
            <span style={{fontSize:11,color:"#888",padding:"2px 8px",border:"1px solid #eee",borderRadius:6}}>Rev.{project.revision||0}</span>
            <span style={{fontSize:11,color:"#888"}}>{project.drwNo}</span>
          </div>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid #f0f0f0",padding:"0 1.5rem"}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 14px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?600:400,color:tab===t.id?"#185FA5":"#888",borderBottom:tab===t.id?"2px solid #185FA5":"2px solid transparent"}}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{padding:"1.25rem 1.5rem"}}>
          {tab==="overview"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                {[
                  {label:"Progress",val:`${pct(project)}%`,sub:"task completion",color:STATUS_COLORS[project.status]},
                  {label:"Deadline",val:dl.label,sub:fmtDate(project.deadline),color:dl.color},
                  {label:"Budget Used",val:`${budgetPct}%`,sub:"dari total budget",color:budgetPct>90?"#D85A30":budgetPct>75?"#BA7517":"#1D9E75"},
                ].map((k,i)=>(
                  <div key={i} style={{background:"#f8f9fa",borderRadius:10,padding:12}}>
                    <div style={{fontSize:11,color:"#888",marginBottom:4}}>{k.label}</div>
                    <div style={{fontSize:18,fontWeight:700,color:k.color||"#111"}}>{k.val}</div>
                    <div style={{fontSize:10,color:"#aaa"}}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#f8f9fa",borderRadius:10,padding:12}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    {k:"Engineer",v:project.engineer||"—"},{k:"Client",v:project.client||"—"},
                    {k:"Start Date",v:fmtDate(project.startDate)},{k:"Deadline",v:fmtDate(project.deadline)},
                    {k:"Budget",v:fmtIDR(project.budget||0)},{k:"Pengeluaran",v:fmtIDR(project.spent||0)},
                    {k:"Kategori",v:project.category},{k:"Drawing No.",v:project.drwNo||"—"},
                  ].map(r=>(
                    <div key={r.k}>
                      <div style={{fontSize:10,color:"#aaa",marginBottom:2}}>{r.k}</div>
                      <div style={{fontSize:13,fontWeight:500,color:"#222"}}>{r.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              {project.description&&(
                <div>
                  <div style={{fontSize:11,color:"#aaa",marginBottom:4,textTransform:"uppercase",letterSpacing:.6}}>Deskripsi</div>
                  <div style={{fontSize:13,color:"#444",lineHeight:1.6}}>{project.description}</div>
                </div>
              )}
              {project.weeklyProgress?.length>1&&(
                <div style={{display:"flex",alignItems:"center",gap:12,background:"#f0faf5",border:"1px solid #d4edda",borderRadius:10,padding:12}}>
                  <div>
                    <div style={{fontSize:11,color:"#666",marginBottom:2}}>Weekly trend</div>
                    <MiniSparkline data={project.weeklyProgress} color="#1D9E75"/>
                  </div>
                  <div style={{fontSize:20,fontWeight:700,color:"#1D9E75"}}>{project.weeklyProgress[project.weeklyProgress.length-1]}%</div>
                </div>
              )}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                  <span style={{color:"#666"}}>Budget utilisation</span>
                  <span style={{fontWeight:600,color:budgetPct>90?"#D85A30":"#333"}}>{budgetPct}%</span>
                </div>
                <div style={{height:8,background:"#eee",borderRadius:4,overflow:"hidden"}}>
                  <div style={{width:`${Math.min(budgetPct,100)}%`,height:"100%",borderRadius:4,background:budgetPct>90?"#D85A30":budgetPct>75?"#BA7517":"#1D9E75",transition:"width .5s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:11,color:"#aaa"}}>
                  <span>Spent: {fmtIDR(project.spent||0)}</span>
                  <span>Budget: {fmtIDR(project.budget||0)}</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:11,color:"#aaa",marginBottom:6,textTransform:"uppercase",letterSpacing:.6}}>Ubah Status</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {Object.entries(STATUS_COLORS).map(([s,c])=>(
                    <button key={s} onClick={()=>onUpdate({...project,status:s})}
                      style={{padding:"6px 14px",borderRadius:999,border:`1.5px solid ${c}`,background:project.status===s?c:"transparent",color:project.status===s?"#fff":c,fontSize:12,cursor:"pointer",fontWeight:500,transition:"all .15s"}}>
                      {s.charAt(0).toUpperCase()+s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab==="tasks"&&<TaskPanel project={project} onUpdate={onUpdate}/>}
          {tab==="milestones"&&(
            <div>
              {(project.milestones||[]).map((m,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                  <div style={{width:24,height:24,borderRadius:6,flexShrink:0,background:m.done?"#1D9E75":"#fff",border:`2px solid ${m.done?"#1D9E75":"#ddd"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}>
                    {m.done?"✓":""}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:m.done?"#666":"#222",textDecoration:m.done?"line-through":"none"}}>{m.name}</div>
                    <div style={{fontSize:11,color:"#aaa"}}>{fmtDate(m.date)}</div>
                  </div>
                  <div style={{fontSize:11,padding:"3px 10px",borderRadius:999,background:m.done?"#e1f5ee":"#f1efe8",color:m.done?"#085041":"#5f5e5a"}}>{m.done?"Selesai":"Pending"}</div>
                </div>
              ))}
            </div>
          )}
          {tab==="chart"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
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
              {project.weeklyProgress?.length>1&&(
                <Card title="Weekly Progress Trend">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={project.weeklyProgress.map((v,i)=>({week:`W${i+1}`,progress:v}))} margin={{left:0,right:8,top:4,bottom:4}}>
                      <defs>
                        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={STATUS_COLORS[project.status]} stopOpacity={.3}/>
                          <stop offset="100%" stopColor={STATUS_COLORS[project.status]} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="week" tick={{fontSize:10}}/>
                      <YAxis tick={{fontSize:10}} domain={[0,100]}/>
                      <Tooltip formatter={v=>`${v}%`}/>
                      <Area type="monotone" dataKey="progress" stroke={STATUS_COLORS[project.status]} strokeWidth={2} fill="url(#pg)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}
              <Card title="Tasks per Phase">
                {(() => {
                  const phData=[...new Set(project.tasks.map(t=>t.phase))].map((ph,i)=>({name:ph,value:project.tasks.filter(t=>t.phase===ph).length,fill:PHASE_COLORS[i%PHASE_COLORS.length]}));
                  return(
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={phData} dataKey="value" cx="50%" cy="50%" outerRadius={65}>
                          {phData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                        </Pie>
                        <Tooltip content={CTip}/>
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:10}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  );
                })()}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectModal({proj,onClose,onSave}){
  const isNew=!proj;
  const [form,setForm]=useState(proj||{name:"",category:"Structure",status:"planning",engineer:"",deadline:"",startDate:"",priority:"High",budget:0,client:"",drwNo:"",description:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,padding:"1.5rem",width:"min(560px,96vw)",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <div style={{fontSize:18,fontWeight:600,color:"#111"}}>{isNew?"Tambah Proyek Baru":"Edit Proyek"}</div>
          <button onClick={onClose} style={{border:"none",background:"none",fontSize:20,cursor:"pointer",color:"#888"}}>✕</button>
        </div>
        {[
          {label:"Nama Proyek *",key:"name",placeholder:"Contoh: Structural Frame Conveyor"},
          {label:"Nomor Drawing",key:"drwNo",placeholder:"STR-2026-001"},
          {label:"Engineer / PIC",key:"engineer",placeholder:"Nama engineer"},
          {label:"Client / Owner",key:"client",placeholder:"Nama client"},
        ].map(f=>(
          <div key={f.key} style={{marginBottom:12}}>
            <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
            <input value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)} placeholder={f.placeholder}
              style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          {[
            {label:"Kategori",key:"category",opts:CATEGORIES},
            {label:"Prioritas",key:"priority",opts:["High","Medium","Low"]},
            {label:"Status",key:"status",opts:Object.keys(STATUS_COLORS)},
          ].map(f=>(
            <div key={f.key}>
              <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
              <select value={form[f.key]} onChange={e=>set(f.key,e.target.value)}
                style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none"}}>
                {f.opts.map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>Budget (Rp)</label>
            <input type="number" value={form.budget||0} onChange={e=>set("budget",+e.target.value)}
              style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          {[{label:"Start Date",key:"startDate"},{label:"Deadline",key:"deadline"}].map(f=>(
            <div key={f.key}>
              <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>{f.label}</label>
              <input type="date" value={form[f.key]||""} onChange={e=>set(f.key,e.target.value)}
                style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
        </div>
        <div style={{marginBottom:16}}>
          <label style={{fontSize:12,color:"#666",display:"block",marginBottom:4}}>Deskripsi Proyek</label>
          <textarea value={form.description||""} onChange={e=>set("description",e.target.value)} rows={3}
            style={{width:"100%",padding:"8px 10px",border:"1px solid #ddd",borderRadius:8,fontSize:13,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 16px",border:"1px solid #ddd",borderRadius:8,background:"#fff",cursor:"pointer",fontSize:13}}>Batal</button>
          <button onClick={()=>onSave(form)} style={{padding:"8px 20px",border:"none",borderRadius:8,background:"#185FA5",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>{isNew?"Simpan Proyek":"Update"}</button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({p,onClick,onDelete,expanded}){
  const progress=pct(p);
  const dl=daysLeft(p.deadline);
  const barColor=STATUS_COLORS[p.status]||"#378ADD";
  return(
    <div onClick={onClick}
      style={{background:"#fff",borderRadius:12,border:"1px solid #eee",padding:"1rem 1.25rem",cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,.04)",transition:"box-shadow .15s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px rgba(0,0,0,.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.04)"}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{width:40,height:40,borderRadius:10,background:`${barColor}18`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
          {CATEGORY_ICONS[p.category]||"📐"}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
            <div style={{fontSize:14,fontWeight:600,color:"#111",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:280}}>{p.name}</div>
            <Badge status={p.status}/>
            <PriorityBadge p={p.priority}/>
          </div>
          <div style={{fontSize:12,color:"#888",marginBottom:8}}>
            👤 {p.engineer||"—"} &nbsp;·&nbsp; 🏢 {p.client||"—"} &nbsp;·&nbsp; 📄 {p.drwNo||"—"}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:6,background:"#eee",borderRadius:3,overflow:"hidden"}}>
              <div style={{width:`${progress}%`,height:"100%",background:barColor,borderRadius:3,transition:"width .5s"}}/>
            </div>
            <span style={{fontSize:12,fontWeight:600,color:barColor,minWidth:34}}>{progress}%</span>
            <span style={{fontSize:11,color:dl.color,whiteSpace:"nowrap"}}>{dl.label}</span>
            <MiniSparkline data={p.weeklyProgress} color={barColor}/>
          </div>
          {expanded&&(
            <div style={{marginTop:8,display:"flex",gap:16,flexWrap:"wrap",fontSize:11,color:"#aaa"}}>
              <span>📅 {fmtDate(p.startDate)} → {fmtDate(p.deadline)}</span>
              <span>✅ {p.tasks.filter(t=>t.done).length}/{p.tasks.length} tasks</span>
              <span>💰 {fmtIDR(p.budget||0)}</span>
            </div>
          )}
        </div>
        <button onClick={e=>{e.stopPropagation();onDelete();}}
          style={{border:"none",background:"none",cursor:"pointer",color:"#ddd",fontSize:14,flexShrink:0,padding:4}}
          onMouseEnter={e=>e.currentTarget.style.color="#D85A30"}
          onMouseLeave={e=>e.currentTarget.style.color="#ddd"}>🗑</button>
      </div>
    </div>
  );
}

export default function App(){
  const [projects,setProjects]=useState(INITIAL_PROJECTS);
  const [view,setView]=useState("dashboard");
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const [sort,setSort]=useState("deadline");
  const [modal,setModal]=useState(null);
  const [detail,setDetail]=useState(null);

  useEffect(()=>{try{const d=localStorage.getItem("mde_v2");if(d)setProjects(JSON.parse(d));}catch(e){}},[]);
  useEffect(()=>{try{localStorage.setItem("mde_v2",JSON.stringify(projects));}catch(e){}},[ projects]);

  const updateProject=(updated)=>{
    setProjects(ps=>ps.map(p=>p.id===updated.id?updated:p));
    setDetail(updated);
  };
  const addProject=(form)=>{
    const np={...form,id:Date.now(),progress:0,tasks:[],milestones:[],weeklyProgress:[0,0,0,0,0,0],spent:form.spent||0,revision:0};
    setProjects(ps=>[np,...ps]);
    setModal(null);
  };
  const deleteProject=(id)=>{
    if(!confirm("Hapus proyek ini?")) return;
    setProjects(ps=>ps.filter(p=>p.id!==id));
    setDetail(null);
  };

  const filtered=useMemo(()=>{
    let ps=[...projects];
    if(filter!=="all") ps=ps.filter(p=>p.status===filter);
    if(search.trim()) ps=ps.filter(p=>
      p.name.toLowerCase().includes(search.toLowerCase())||
      (p.engineer||"").toLowerCase().includes(search.toLowerCase())||
      (p.client||"").toLowerCase().includes(search.toLowerCase())
    );
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
    const total=projects.length;
    const active=projects.filter(p=>p.status==="active").length;
    const done=projects.filter(p=>p.status==="done").length;
    const review=projects.filter(p=>p.status==="review").length;
    const overdue=projects.filter(p=>p.status!=="done"&&new Date(p.deadline)<new Date()).length;
    const avgProg=total?Math.round(projects.reduce((a,p)=>a+pct(p),0)/total):0;
    const totalBudget=projects.reduce((a,p)=>a+(p.budget||0),0);
    const totalSpent=projects.reduce((a,p)=>a+(p.spent||0),0);
    return{total,active,done,review,overdue,avgProg,totalBudget,totalSpent};
  },[projects]);

  const NAV=[
    {id:"dashboard",label:"Dashboard",icon:"📊"},
    {id:"projects",label:"Projects",icon:"📋"},
    {id:"gantt",label:"Gantt Chart",icon:"📅"},
    {id:"analytics",label:"Analytics",icon:"📈"},
  ];

  return(
    <div style={{minHeight:"100vh",background:"#f5f6f8",fontFamily:"system-ui,-apple-system,sans-serif",display:"flex"}}>
      {/* Sidebar */}
      <div style={{width:210,background:"#111827",flexShrink:0,display:"flex",flexDirection:"column",minHeight:"100vh"}}>
        <div style={{padding:"1.25rem 1rem 1rem",borderBottom:"1px solid #1f2937"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:.5}}>⚙️ MDE Tracker</div>
          <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>Mechanical Design Engineering</div>
        </div>
        <nav style={{padding:"0.5rem 0",flex:1}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)}
              style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 1rem",border:"none",background:view===n.id?"#1f2937":"transparent",cursor:"pointer",textAlign:"left",borderLeft:view===n.id?"3px solid #378ADD":"3px solid transparent",transition:"all .12s"}}>
              <span style={{fontSize:14}}>{n.icon}</span>
              <span style={{fontSize:12,fontWeight:view===n.id?600:400,color:view===n.id?"#fff":"#9ca3af"}}>{n.label}</span>
            </button>
          ))}
        </nav>
        <div style={{padding:"1rem",borderTop:"1px solid #1f2937"}}>
          <div style={{fontSize:10,color:"#4b5563",lineHeight:1.7}}>
            <div>{projects.length} projects total</div>
            <div style={{color:stats.active?"#639922":"#4b5563"}}>{stats.active} active</div>
            {stats.overdue>0&&<div style={{color:"#D85A30"}}>{stats.overdue} overdue ⚠️</div>}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        <div style={{background:"#fff",borderBottom:"1px solid #eee",padding:"10px 1.25rem",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:700,color:"#111"}}>{NAV.find(n=>n.id===view)?.label}</div>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Cari proyek, engineer, client..."
            style={{padding:"6px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",width:220,background:"#f9fafb"}}/>
          <select value={sort} onChange={e=>setSort(e.target.value)}
            style={{padding:"6px 10px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,outline:"none",background:"#f9fafb"}}>
            <option value="deadline">Sort: Deadline</option>
            <option value="progress">Sort: Progress</option>
            <option value="priority">Sort: Priority</option>
            <option value="budget">Sort: Budget</option>
          </select>
          <button onClick={()=>setModal("new")}
            style={{display:"flex",alignItems:"center",gap:5,padding:"7px 14px",background:"#185FA5",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
            + Tambah Proyek
          </button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"1.25rem"}}>
          {view==="dashboard"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
                {[
                  {label:"Total Proyek",val:stats.total,sub:"semua status",color:"#185FA5"},
                  {label:"Active",val:stats.active,sub:"berjalan",color:"#1D9E75"},
                  {label:"In Review",val:stats.review,sub:"menunggu approval",color:"#BA7517"},
                  {label:"Completed",val:stats.done,sub:"selesai",color:"#0F6E56"},
                  {label:"Overdue",val:stats.overdue,sub:"lewat deadline",color:stats.overdue?"#D85A30":"#888"},
                  {label:"Avg Progress",val:`${stats.avgProg}%`,sub:"semua proyek",color:"#378ADD"},
                ].map((k,i)=>(
                  <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px 14px",boxShadow:"0 1px 4px rgba(0,0,0,.05)",borderLeft:`3px solid ${k.color}`}}>
                    <div style={{fontSize:10,color:"#888",marginBottom:4}}>{k.label}</div>
                    <div style={{fontSize:20,fontWeight:700,color:k.color}}>{k.val}</div>
                    <div style={{fontSize:10,color:"#bbb",marginTop:2}}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#222"}}>Portfolio Budget</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#111"}}>{fmtIDR(stats.totalBudget)}</div>
                </div>
                <div style={{height:8,background:"#eee",borderRadius:4,overflow:"hidden",marginBottom:5}}>
                  <div style={{width:`${Math.min(Math.round(stats.totalSpent/(stats.totalBudget||1)*100),100)}%`,height:"100%",background:"#185FA5",borderRadius:4}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa"}}>
                  <span>Realisasi: {fmtIDR(stats.totalSpent)} ({Math.round(stats.totalSpent/(stats.totalBudget||1)*100)}%)</span>
                  <span>Sisa: {fmtIDR(stats.totalBudget-stats.totalSpent)}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filtered.map(p=><ProjectCard key={p.id} p={p} onClick={()=>setDetail(p)} onDelete={()=>deleteProject(p.id)}/>)}
              </div>
            </div>
          )}

          {view==="projects"&&(
            <div>
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                {["all","planning","active","review","done","hold"].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)}
                    style={{padding:"5px 14px",borderRadius:999,fontSize:12,cursor:"pointer",border:`1px solid ${filter===f?"#185FA5":"#ddd"}`,background:filter===f?"#185FA5":"#fff",color:filter===f?"#fff":"#555",fontWeight:filter===f?600:400}}>
                    {f==="all"?"Semua":f.charAt(0).toUpperCase()+f.slice(1)} ({f==="all"?projects.length:projects.filter(p=>p.status===f).length})
                  </button>
                ))}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {filtered.map(p=><ProjectCard key={p.id} p={p} onClick={()=>setDetail(p)} onDelete={()=>deleteProject(p.id)} expanded/>)}
                {!filtered.length&&<div style={{textAlign:"center",padding:"3rem",color:"#aaa",fontSize:14}}>Tidak ada proyek ditemukan</div>}
              </div>
            </div>
          )}

          {view==="gantt"&&(
            <div style={{background:"#fff",borderRadius:12,padding:"1.25rem",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
              <div style={{fontSize:14,fontWeight:600,color:"#222",marginBottom:16}}>Timeline Proyek — Gantt Chart</div>
              <GanttBar projects={projects}/>
            </div>
          )}

          {view==="analytics"&&<AnalyticsPanel projects={projects}/>}
        </div>
      </div>

      {modal==="new"&&<ProjectModal onClose={()=>setModal(null)} onSave={addProject}/>}
      {detail&&<DetailDrawer project={detail} onClose={()=>setDetail(null)} onUpdate={updateProject}/>}
    </div>
  );
}