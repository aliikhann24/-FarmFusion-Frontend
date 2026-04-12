import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  animalsAPI, installmentsAPI, vouchersAPI, breedingAPI,
  feedingAPI, vaccinationAPI, progressAPI, cattleAPI, enquiryAPI
} from '../../utils/api';
import Spinner from '../../components/common/Spinner';
import QuickNav from '../../components/common/QuickNav';
import Animate from '../../components/common/Animate';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area
} from 'recharts';

/* ─── constants ─────────────────────────────────────────── */
const SPECIES_COLORS = ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#b7e4c7'];
const HEALTH_COLORS  = { Healthy:'#52b788', Sick:'#e63946', Pregnant:'#f4a261', Sold:'#74c69d', Deceased:'#adb5bd' };
const OUTCOME_COLORS = { Pending:'#f4a261', Successful:'#52b788', Failed:'#e63946', 'In Progress':'#2196f3', Miscarriage:'#9c27b0' };

/* ─── tiny helpers ───────────────────────────────────────── */
const SectionHeader = ({ icon, title, to, linkLabel = 'View all →' }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
    <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--primary-dark)', display:'flex', alignItems:'center', gap:6, margin:0 }}>
      {icon} {title}
    </h3>
    {to && (
      <Link to={to} style={{ fontSize:'0.78rem', color:'var(--primary)', textDecoration:'none', fontWeight:600, whiteSpace:'nowrap' }}>
        {linkLabel}
      </Link>
    )}
  </div>
);

const MiniStat = ({ value, label, bg, color }) => (
  <div style={{ flex:1, minWidth:60, background:bg, borderRadius:8, padding:'8px 6px', textAlign:'center' }}>
    <div style={{ fontSize:'1.15rem', fontWeight:800, color, lineHeight:1 }}>{value}</div>
    <div style={{ fontSize:'0.65rem', color, marginTop:3, fontWeight:600 }}>{label}</div>
  </div>
);

const AlertBanner = ({ type, icon, message, to }) => {
  const styles = {
    danger:  { bg:'#fde8ea', col:'#c62828', bdr:'#ef9a9a' },
    warning: { bg:'#fff8e1', col:'#e65100', bdr:'#ffcc80' },
    info:    { bg:'#e8f4fd', col:'#1565c0', bdr:'#90caf9' },
  }[type] || {};
  return (
    <Link to={to} style={{ textDecoration:'none' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'9px 14px', borderRadius:'var(--radius-sm)',
        background:styles.bg, borderLeft:`3px solid ${styles.bdr}`,
        fontSize:'0.82rem', fontWeight:500, color:styles.col,
      }}>
        <span>{icon}</span>
        <span style={{ flex:1 }}>{message}</span>
        <span style={{ opacity:0.5, fontSize:'0.9rem' }}>→</span>
      </div>
    </Link>
  );
};

const ProgressBar = ({ pct, color='var(--primary)' }) => (
  <div style={{ background:'#e8f5e9', borderRadius:4, height:5, overflow:'hidden' }}>
    <div style={{ background:color, height:5, width:`${Math.min(100,pct)}%`, borderRadius:4, transition:'width 0.5s' }} />
  </div>
);

const Badge = ({ label, color }) => {
  const map = {
    'badge-green' :'#e8f5e9|#2e7d32',
    'badge-red'   :'#fde8ea|#c62828',
    'badge-orange':'#fff3e0|#e65100',
    'badge-blue'  :'#e3f2fd|#1565c0',
    'badge-purple':'#f3e5f5|#6a1b9a',
    'badge-gray'  :'#f5f5f5|#616161',
  };
  const [bg, fg] = (map[color] || map['badge-gray']).split('|');
  return (
    <span style={{
      background:bg, color:fg, padding:'2px 8px', borderRadius:20,
      fontSize:'0.7rem', fontWeight:600, whiteSpace:'nowrap', display:'inline-block',
    }}>{label}</span>
  );
};

/* Card wrapper — enforces equal height in flex/grid rows */
const DashCard = ({ children }) => (
  <div className="card" style={{ display:'flex', flexDirection:'column', height:'100%' }}>
    <div style={{ padding:'16px 18px', flex:1, display:'flex', flexDirection:'column' }}>
      {children}
    </div>
  </div>
);

const Divider = () => <div style={{ borderTop:'1px solid var(--border)', margin:'10px 0' }} />;

/* ─── main dashboard ─────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();

  const [animals,      setAnimals]      = useState([]);
  const [feeding,      setFeeding]      = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [breeding,     setBreeding]     = useState([]);
  const [vouchers,     setVouchers]     = useState([]);
  const [installments, setInstallments] = useState([]);
  const [progress,     setProgress]     = useState([]);
  const [cattle,       setCattle]       = useState([]);
  const [enquiries,    setEnquiries]    = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [aR,fR,vR,bR,voR,iR,prR,cR,eR] = await Promise.all([
          animalsAPI.getAll(),
          feedingAPI.getAll(),
          vaccinationAPI.getAll(),
          breedingAPI.getAll(),
          vouchersAPI.getAll(),
          installmentsAPI.getAll(),
          progressAPI.getAll(),
          cattleAPI.getAll(),
          enquiryAPI.received().catch(() => ({ data:{ enquiries:[] } })),
        ]);
        setAnimals     (aR.data.animals       || []);
        setFeeding     (fR.data.records       || []);
        setVaccinations(vR.data.records       || []);
        setBreeding    (bR.data.records       || []);
        setVouchers    (voR.data.vouchers     || []);
        setInstallments(iR.data.installments  || []);
        setProgress    (prR.data.records      || []);
        setCattle      (cR.data.cattle || cR.data.listings || []);
        setEnquiries   (eR.data.enquiries     || []);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  /* ── derived ────────────────────────────────────────────── */
  const speciesData = (() => {
    const m = {};
    animals.forEach(a => { m[a.species] = (m[a.species]||0)+1; });
    return Object.entries(m).map(([name,value]) => ({ name, value }));
  })();

  const healthData = (() => {
    const m = { Healthy:0, Sick:0, Pregnant:0, Sold:0, Deceased:0 };
    animals.forEach(a => { if (m[a.status]!==undefined) m[a.status]++; });
    return Object.entries(m).filter(([,v])=>v>0).map(([name,value]) => ({ name, value }));
  })();

  const feedingMonthly = (() => {
    const m = {};
    feeding.forEach(r => {
      const mo = new Date(r.feedingDate).toLocaleString('default',{month:'short',year:'2-digit'});
      m[mo] = (m[mo]||0)+(r.cost||0);
    });
    return Object.entries(m).map(([month,cost]) => ({ month, cost })).slice(-6);
  })();

  const voucherMonthly = (() => {
    const m = {};
    vouchers.forEach(v => {
      const mo = new Date(v.date).toLocaleString('default',{month:'short',year:'2-digit'});
      if (!m[mo]) m[mo] = { month:mo, income:0, expense:0 };
      if (['Sale','Income'].includes(v.type)) m[mo].income += v.amount;
      else m[mo].expense += v.amount;
    });
    return Object.values(m).slice(-6);
  })();

  const breedingOutcomes = (() => {
    const m = {};
    breeding.forEach(b => { m[b.outcome] = (m[b.outcome]||0)+1; });
    return Object.entries(m).map(([name,value]) => ({ name, value }));
  })();

  const totalFeedCost  = feeding.reduce((s,r) => s+(r.cost||0), 0);
  const totalIncome    = vouchers.filter(v=>['Sale','Income'].includes(v.type)).reduce((s,v)=>s+v.amount,0);
  const totalExpense   = vouchers.filter(v=>!['Sale','Income'].includes(v.type)).reduce((s,v)=>s+v.amount,0);
  const netBalance     = totalIncome - totalExpense;
  const totalRemaining = installments.reduce((s,i)=>s+Math.max(0,i.totalAmount-i.paidAmount),0);
  const pendingEnq     = enquiries.filter(e=>e.status==='Pending').length;

  const upcomingBreeding = breeding
    .filter(b=>b.expectedDelivery && b.outcome==='Pending')
    .sort((a,b)=>new Date(a.expectedDelivery)-new Date(b.expectedDelivery))
    .slice(0,3);

  const recentProgress = [...progress]
    .sort((a,b)=>new Date(b.date)-new Date(a.date))
    .slice(0,3);

  /* ── badge helpers ──────────────────────────────────────── */
  const speciesBadge = s => ({ Cow:'badge-green',Buffalo:'badge-blue',Goat:'badge-orange',Sheep:'badge-purple',Bull:'badge-red',Calf:'badge-gray' }[s]||'badge-gray');
  const vaccBadge    = s => ({ Given:'badge-green',Scheduled:'badge-orange',Overdue:'badge-red' }[s]||'badge-gray');
  const outcomeBadge = s => ({ Pending:'badge-orange',Successful:'badge-green',Failed:'badge-red','In Progress':'badge-blue',Miscarriage:'badge-purple' }[s]||'badge-gray');
  const instBadge    = s => ({ Active:'badge-blue',Completed:'badge-green',Overdue:'badge-red',Cancelled:'badge-gray' }[s]||'badge-gray');
  const fmtPKR       = n => n>=1000 ? `PKR ${(n/1000).toFixed(1)}k` : `PKR ${n}`;
  const daysLeft     = d => Math.ceil((new Date(d)-new Date())/86400000);
  const getGreeting  = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; };

  /* ── alerts ─────────────────────────────────────────────── */
  const alerts = [];
  const overdueVacc = vaccinations.filter(v=>v.status==='Overdue').length;
  if (overdueVacc)  alerts.push({ type:'danger',  icon:'💉', message:`${overdueVacc} vaccination${overdueVacc>1?'s':''} overdue`,                          to:'/vaccination-records' });
  const sickCount = animals.filter(a=>a.status==='Sick').length;
  if (sickCount)    alerts.push({ type:'danger',  icon:'🤒', message:`${sickCount} sick animal${sickCount>1?'s':''} need attention`,                        to:'/my-animals' });
  const overdueInst = installments.filter(i=>i.status==='Overdue').length;
  if (overdueInst)  alerts.push({ type:'danger',  icon:'💳', message:`${overdueInst} installment plan${overdueInst>1?'s':''} overdue`,                      to:'/installments' });
  const soonVacc = vaccinations.filter(v=>{ if(v.status!=='Scheduled') return false; const d=(new Date(v.date)-new Date())/86400000; return d>=0&&d<=7; }).length;
  if (soonVacc)     alerts.push({ type:'warning', icon:'📅', message:`${soonVacc} vaccination${soonVacc>1?'s':''} due within 7 days`,                       to:'/vaccination-records' });
  if (pendingEnq)   alerts.push({ type:'info',    icon:'📩', message:`${pendingEnq} market enquir${pendingEnq>1?'ies':'y'} waiting for response`,            to:'/cattle-market' });

  if (loading) return (
    <div className="page-dashboard">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh' }}>
        <Spinner text="Loading your farm..." />
      </div>
    </div>
  );

  return (
    <div className="page-dashboard">

      {/* ── Responsive styles ──────────────────────────── */}
      <style>{`
        .dash-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 14px;
        }
        @media (min-width: 640px) {
          .dash-kpi-grid { grid-template-columns: repeat(8, 1fr); }
        }
        @media (max-width: 400px) {
          .dash-kpi-grid { gap: 6px; }
          .page-content  { padding: 8px !important; }
        }

        /* Two-column rows */
        .dash-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 14px;
          align-items: stretch;
        }
        @media (max-width: 640px) {
          .dash-row { grid-template-columns: 1fr; }
        }

        /* Cattle listing cards */
        .dash-cattle-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        @media (max-width: 768px) {
          .dash-cattle-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 480px) {
          .dash-cattle-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Page header ─────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize:'1.4rem' }}>{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h2>
          <p>{user?.farmName ? `${user.farmName} • ` : ''}Your farm overview</p>
        </div>
        <Link to="/my-animals" className="btn btn-primary btn-sm">+ Add Animal</Link>
      </div>

      <div className="page-content">
        <QuickNav />

        {/* ── Alerts ─────────────────────────────────────── */}
        {alerts.length > 0 && (
          <Animate direction="down">
            <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:14 }}>
              {alerts.map((a,i) => <AlertBanner key={i} {...a} />)}
            </div>
          </Animate>
        )}

        {/* ── Top KPI bar ────────────────────────────────── */}
        <div className="dash-kpi-grid">
          {[
            { icon:'🐄', label:'Animals',   value:animals.length,      color:'#2d6a4f' },
            { icon:'💉', label:'Vaccines',  value:vaccinations.length, color:'#1565c0' },
            { icon:'🧬', label:'Breeding',  value:breeding.length,     color:'#6a1b9a' },
            { icon:'📈', label:'Progress',  value:progress.length,     color:'#00695c' },
            { icon:'🏪', label:'Market',    value:cattle.length,       color:'#e65100' },
            { icon:'💳', label:'Installm.', value:installments.length, color:'#c62828' },
            { icon:'🧾', label:'Vouchers',  value:vouchers.length,     color:'#1b5e20' },
            { icon:'💰', label:netBalance>=0?'Profit':'Loss',
              value:fmtPKR(Math.abs(netBalance)),
              color:netBalance>=0?'#2e7d32':'#c62828' },
          ].map((k,i) => (
            <Animate key={k.label} direction="up" delay={i*40}>
              <div style={{
                background:'white', borderRadius:'var(--radius)', padding:'12px 8px',
                boxShadow:'var(--shadow)', borderTop:`3px solid ${k.color}`, textAlign:'center',
              }}>
                <div style={{ fontSize:'1.1rem', marginBottom:2 }}>{k.icon}</div>
                <div style={{ fontSize:'1rem', fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
                <div style={{ fontSize:'0.62rem', color:'var(--text-muted)', marginTop:3 }}>{k.label}</div>
              </div>
            </Animate>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            ROW 1 — Species  |  Health + Animals
        ════════════════════════════════════════════════ */}
        <div className="dash-row">

          <Animate direction="left">
            <DashCard>
              <SectionHeader icon="🐄" title="Animals by Species" to="/my-animals" />
              {speciesData.length === 0
                ? <div className="empty-state" style={{padding:20}}><p>No animals yet</p></div>
                : <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={speciesData} cx="50%" cy="50%" innerRadius={42} outerRadius={72} dataKey="value" paddingAngle={3}>
                          {speciesData.map((_,i) => <Cell key={i} fill={SPECIES_COLORS[i%SPECIES_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={(v,n)=>[v,n]}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'5px 12px', justifyContent:'center', marginTop:6 }}>
                      {speciesData.map((e,i) => {
                        const tot = speciesData.reduce((s,d)=>s+d.value,0);
                        return (
                          <span key={e.name} style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.72rem', color:'var(--text-muted)' }}>
                            <span style={{ width:7, height:7, borderRadius:2, background:SPECIES_COLORS[i%SPECIES_COLORS.length], flexShrink:0 }}/>
                            {e.name}: {e.value} ({Math.round(e.value/tot*100)}%)
                          </span>
                        );
                      })}
                    </div>
                  </>
              }
            </DashCard>
          </Animate>

          <Animate direction="right">
            <DashCard>
              <SectionHeader icon="❤️" title="Health Status" to="/my-animals" />
              {healthData.length === 0
                ? <div className="empty-state" style={{padding:20}}><p>No health data</p></div>
                : <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={healthData} margin={{top:2,right:2,left:-28,bottom:2}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="name" tick={{fontSize:9}}/>
                      <YAxis tick={{fontSize:9}} allowDecimals={false}/>
                      <Tooltip/>
                      <Bar dataKey="value" radius={[4,4,0,0]}>
                        {healthData.map((e,i) => <Cell key={i} fill={HEALTH_COLORS[e.name]||'#74c69d'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
              <Divider />
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6 }}>Recent Animals</div>
              {animals.length === 0
                ? <p style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>No animals added yet</p>
                : animals.slice(0,3).map(a => (
                    <div key={a._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                      <div>
                        <span style={{ fontWeight:600, fontSize:'0.82rem' }}>{a.name||a.tagId}</span>
                        <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', marginLeft:5 }}>#{a.tagId}</span>
                      </div>
                      <div style={{ display:'flex', gap:4 }}>
                        <Badge label={a.species} color={speciesBadge(a.species)}/>
                        <Badge label={a.status}  color={a.status==='Healthy'?'badge-green':a.status==='Sick'?'badge-red':'badge-orange'}/>
                      </div>
                    </div>
                  ))
              }
            </DashCard>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 2 — Feeding  |  Finance
        ════════════════════════════════════════════════ */}
        <div className="dash-row">

          <Animate direction="left">
            <DashCard>
              <SectionHeader icon="🌾" title="Monthly Feeding Cost" to="/feeding-records" />
              <div style={{ display:'flex', gap:14, marginBottom:10 }}>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                  Total: <strong style={{ color:'var(--primary)' }}>{fmtPKR(totalFeedCost)}</strong>
                </div>
                <div style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                  Records: <strong>{feeding.length}</strong>
                </div>
              </div>
              {feedingMonthly.length === 0
                ? <div className="empty-state" style={{padding:20}}>
                    <p>No feeding records yet</p>
                    <Link to="/feeding-records" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Records</Link>
                  </div>
                : <ResponsiveContainer width="100%" height={185}>
                    <AreaChart data={feedingMonthly} margin={{top:4,right:4,left:-10,bottom:2}}>
                      <defs>
                        <linearGradient id="feedG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#2d6a4f" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="month" tick={{fontSize:9}}/>
                      <YAxis tick={{fontSize:9}}/>
                      <Tooltip formatter={v=>[`PKR ${v.toLocaleString()}`,'Cost']}/>
                      <Area type="monotone" dataKey="cost" stroke="#2d6a4f" strokeWidth={2.5} fill="url(#feedG)" dot={{fill:'#2d6a4f',r:3}} activeDot={{r:5}}/>
                    </AreaChart>
                  </ResponsiveContainer>
              }
            </DashCard>
          </Animate>

          <Animate direction="right">
            <DashCard>
              <SectionHeader icon="🧾" title="Income vs Expenses" to="/vouchers" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                {[
                  { label:'Income',   value:fmtPKR(totalIncome),             color:'#2e7d32' },
                  { label:'Expenses', value:fmtPKR(totalExpense),            color:'#c62828' },
                  { label:netBalance>=0?'Profit':'Loss', value:fmtPKR(Math.abs(netBalance)), color:netBalance>=0?'#2e7d32':'#c62828' },
                ].map(item => (
                  <div key={item.label} style={{ background:'#f8faf8', borderRadius:8, padding:'7px 6px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.65rem', color:'var(--text-muted)' }}>{item.label}</div>
                    <div style={{ fontWeight:700, fontSize:'0.82rem', color:item.color, marginTop:2 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {voucherMonthly.length === 0
                ? <div className="empty-state" style={{padding:20}}>
                    <p>No vouchers yet</p>
                    <Link to="/vouchers" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Voucher</Link>
                  </div>
                : <ResponsiveContainer width="100%" height={165}>
                    <BarChart data={voucherMonthly} margin={{top:4,right:4,left:-28,bottom:2}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="month" tick={{fontSize:9}}/>
                      <YAxis tick={{fontSize:9}}/>
                      <Tooltip formatter={(v,n)=>[`PKR ${v.toLocaleString()}`,n]}/>
                      <Bar dataKey="income"  fill="#52b788" radius={[3,3,0,0]} name="Income"/>
                      <Bar dataKey="expense" fill="#e63946" radius={[3,3,0,0]} name="Expense"/>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </DashCard>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 3 — Vaccinations  |  Breeding
        ════════════════════════════════════════════════ */}
        <div className="dash-row">

          <Animate direction="left" delay={60}>
            <DashCard>
              <SectionHeader icon="💉" title="Vaccinations" to="/vaccination-records" />
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                <MiniStat value={vaccinations.filter(v=>v.status==='Given').length}     label="Given"     bg="#e8f5e9" color="#2e7d32"/>
                <MiniStat value={vaccinations.filter(v=>v.status==='Scheduled').length} label="Scheduled" bg="#fff3e0" color="#e65100"/>
                <MiniStat value={vaccinations.filter(v=>v.status==='Overdue').length}   label="Overdue"   bg="#fde8ea" color="#c62828"/>
              </div>
              {vaccinations.length === 0
                ? <div className="empty-state" style={{padding:20}}>
                    <div className="icon">💉</div><p>No vaccinations yet</p>
                    <Link to="/vaccination-records" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Vaccination</Link>
                  </div>
                : vaccinations.slice(0,3).map(v => (
                    <div key={v._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', gap:6 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:'0.82rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.animal?.name||v.animal?.tagId||'—'}</div>
                        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.vaccineName}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                        <Badge label={v.status} color={vaccBadge(v.status)}/>
                        <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>{v.date ? new Date(v.date).toLocaleDateString() : '—'}</span>
                      </div>
                    </div>
                  ))
              }
            </DashCard>
          </Animate>

          <Animate direction="right" delay={60}>
            <DashCard>
              <SectionHeader icon="🧬" title="Breeding Records" to="/breeding-records" />
              {breedingOutcomes.length > 0 && (
                <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                  {breedingOutcomes.map(o => (
                    <MiniStat key={o.name} value={o.value} label={o.name}
                      color={OUTCOME_COLORS[o.name]||'#555'}
                      bg={o.name==='Successful'?'#e8f5e9':o.name==='Failed'?'#fde8ea':o.name==='Pending'?'#fff3e0':o.name==='Miscarriage'?'#f3e5f5':'#e3f2fd'}
                    />
                  ))}
                </div>
              )}
              <div style={{ fontSize:'0.68rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
                Upcoming Deliveries
              </div>
              {upcomingBreeding.length === 0
                ? <div style={{ color:'var(--text-muted)', fontSize:'0.82rem', padding:'8px 0' }}>
                    No pending deliveries
                    {breeding.length === 0 && (
                      <div style={{marginTop:8}}>
                        <Link to="/breeding-records" className="btn btn-primary btn-sm">Add Record</Link>
                      </div>
                    )}
                  </div>
                : upcomingBreeding.map(b => {
                    const dl = b.expectedDelivery ? daysLeft(b.expectedDelivery) : null;
                    return (
                      <div key={b._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', gap:6 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:'0.82rem' }}>{b.femaleAnimal?.name||b.femaleAnimal?.tagId||'—'}</div>
                          <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{b.femaleAnimal?.species}</div>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                          {dl !== null
                            ? <Badge label={dl<0?'Overdue':dl===0?'Today!':dl+'d left'} color={dl<0?'badge-red':dl<=7?'badge-orange':'badge-green'}/>
                            : '—'
                          }
                          <span style={{ fontSize:'0.68rem', color:'var(--text-muted)' }}>
                            {b.expectedDelivery ? new Date(b.expectedDelivery).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })
              }
            </DashCard>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 4 — Progress  |  Installments
        ════════════════════════════════════════════════ */}
        <div className="dash-row">

          <Animate direction="left" delay={80}>
            <DashCard>
              <SectionHeader icon="📈" title="Animal Progress" to="/animal-progress" />
              {progress.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:10 }}>
                  {[
                    { label:'Avg Weight', value:(() => { const w=progress.filter(r=>r.weight); return w.length?Math.round(w.reduce((s,r)=>s+r.weight,0)/w.length)+'kg':'—'; })() },
                    { label:'Avg Milk',   value:(() => { const m=progress.filter(r=>r.milkProduction); return m.length?(m.reduce((s,r)=>s+r.milkProduction,0)/m.length).toFixed(1)+'L':'—'; })() },
                    { label:'Excellent',  value:progress.filter(r=>r.healthStatus==='Excellent').length },
                  ].map(item => (
                    <div key={item.label} style={{ background:'#f4faf5', borderRadius:8, padding:'7px 6px', textAlign:'center' }}>
                      <div style={{ fontSize:'0.95rem', fontWeight:800, color:'var(--primary)' }}>{item.value}</div>
                      <div style={{ fontSize:'0.65rem', color:'var(--text-muted)', marginTop:2 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
              {recentProgress.length === 0
                ? <div className="empty-state" style={{padding:20}}>
                    <div className="icon">📈</div><p>No progress records yet</p>
                    <Link to="/animal-progress" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Progress</Link>
                  </div>
                : recentProgress.map(r => (
                    <div key={r._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', gap:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:'0.82rem' }}>{r.animal?.name||r.animal?.tagId||'—'}</div>
                        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{r.animal?.species} · {new Date(r.date).toLocaleDateString()}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3, flexShrink:0 }}>
                        <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                          {r.weight && (
                            <span style={{ fontSize:'0.7rem', background:'#e8f5e9', color:'#2e7d32', borderRadius:4, padding:'1px 5px', fontWeight:600 }}>
                              {r.weight}kg
                            </span>
                          )}
                          <Badge label={r.healthStatus||'—'} color={r.healthStatus==='Excellent'||r.healthStatus==='Good'?'badge-green':r.healthStatus==='Fair'?'badge-orange':'badge-red'}/>
                        </div>
                        {r.imageBase64 && (
                          <img src={`data:${r.imageMimeType};base64,${r.imageBase64}`} alt="p"
                            style={{ width:28, height:28, borderRadius:5, objectFit:'cover', border:'1px solid var(--border)' }}/>
                        )}
                      </div>
                    </div>
                  ))
              }
            </DashCard>
          </Animate>

          <Animate direction="right" delay={80}>
            <DashCard>
              <SectionHeader icon="💳" title="Installments" to="/installments" />
              <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                <MiniStat value={installments.filter(i=>i.status==='Active').length}    label="Active"    bg="#e3f2fd" color="#1565c0"/>
                <MiniStat value={installments.filter(i=>i.status==='Overdue').length}   label="Overdue"   bg="#fde8ea" color="#c62828"/>
                <MiniStat value={installments.filter(i=>i.status==='Completed').length} label="Completed" bg="#e8f5e9" color="#2e7d32"/>
                <div style={{ flex:2, minWidth:110, background:'#f3e5f5', borderRadius:8, padding:'8px 8px' }}>
                  <div style={{ fontSize:'0.65rem', color:'#6a1b9a', fontWeight:600 }}>Total Remaining</div>
                  <div style={{ fontSize:'0.88rem', fontWeight:800, color:'#6a1b9a' }}>{fmtPKR(totalRemaining)}</div>
                </div>
              </div>
              {installments.length === 0
                ? <div className="empty-state" style={{padding:20}}>
                    <div className="icon">💳</div><p>No installment plans</p>
                    <Link to="/installments" className="btn btn-primary btn-sm" style={{marginTop:8}}>Create Plan</Link>
                  </div>
                : installments.slice(0,3).map(inst => {
                    const pct = Math.min(100, Math.round(inst.paidAmount/inst.totalAmount*100));
                    const rem = Math.max(0, inst.totalAmount-inst.paidAmount);
                    return (
                      <div key={inst._id} style={{ marginBottom:10, paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontWeight:600, fontSize:'0.82rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'58%' }}>{inst.title}</span>
                          <Badge label={inst.status} color={instBadge(inst.status)}/>
                        </div>
                        <ProgressBar pct={pct} color={pct===100?'#52b788':inst.status==='Overdue'?'#e63946':'var(--primary)'}/>
                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:'0.68rem', color:'var(--text-muted)' }}>
                          <span>{pct}% paid</span>
                          <span style={{ color:rem>0?'var(--danger)':'var(--success)', fontWeight:600 }}>
                            {rem>0 ? `PKR ${rem.toLocaleString()} left` : 'Fully paid ✅'}
                          </span>
                        </div>
                      </div>
                    );
                  })
              }
            </DashCard>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 5 — Cattle Market (full width)
        ════════════════════════════════════════════════ */}
        <Animate direction="up" delay={60}>
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ padding:'16px 18px' }}>
              {/* ← /cattle-market route */}
              <SectionHeader icon="🏪" title="Cattle Market" to="/cattle"
                linkLabel={`View Market →${pendingEnq ? ` 🔴${pendingEnq}` : ''}`}
              />
              {/* summary pills */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginBottom:14 }}>
                {[
                  { label:'Active Listings',   value:cattle.filter(c=>c.status!=='Sold').length, bg:'#e8f5e9', col:'#2e7d32' },
                  { label:'Sold',              value:cattle.filter(c=>c.status==='Sold').length, bg:'#f3e5f5', col:'#6a1b9a' },
                  { label:'Pending Enquiries', value:pendingEnq,                                 bg:pendingEnq?'#fde8ea':'#f5f5f5', col:pendingEnq?'#c62828':'#616161' },
                  { label:'Total Listings',    value:cattle.length,                              bg:'#e3f2fd', col:'#1565c0' },
                ].map(s => (
                  <div key={s.label} style={{ background:s.bg, borderRadius:8, padding:'9px 8px', textAlign:'center' }}>
                    <div style={{ fontSize:'1.2rem', fontWeight:800, color:s.col }}>{s.value}</div>
                    <div style={{ fontSize:'0.62rem', color:s.col, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {cattle.length === 0
                ? <div className="empty-state" style={{padding:24}}>
                    <div className="icon">🏪</div><p>No listings yet</p>
                    <Link to="/cattle-market" className="btn btn-primary btn-sm" style={{marginTop:8}}>List an Animal</Link>
                  </div>
                : <div className="dash-cattle-grid">
                    {cattle.slice(0,3).map(c => (
                      <div key={c._id} style={{
                        border:'1px solid var(--border)', borderRadius:10, overflow:'hidden',
                        background:'white', transition:'box-shadow 0.2s',
                      }}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
                      >
                        {c.imageBase64
                          ? <img src={`data:${c.imageMimeType};base64,${c.imageBase64}`} alt={c.name}
                              style={{ width:'100%', height:120, objectFit:'cover', display:'block' }}/>
                          : <div style={{ width:'100%', height:120, background:'#f0f7f2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.5rem' }}>🐄</div>
                        }
                        <div style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontWeight:700, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{c.name||c.tagId}</span>
                            <Badge label={c.species} color={speciesBadge(c.species)}/>
                          </div>
                          <div style={{ fontSize:'0.85rem', color:'var(--primary)', fontWeight:700 }}>PKR {Number(c.price||0).toLocaleString()}</div>
                          <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>{c.location||'No location'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        </Animate>

      </div>
    </div>
  );
}
