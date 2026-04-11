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
  LineChart, Line, AreaChart, Area
} from 'recharts';

const SPECIES_COLORS  = ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2','#b7e4c7'];
const HEALTH_COLORS   = { Healthy:'#52b788', Sick:'#e63946', Pregnant:'#f4a261', Sold:'#74c69d', Deceased:'#adb5bd' };
const OUTCOME_COLORS  = { Pending:'#f4a261', Successful:'#52b788', Failed:'#e63946', 'In Progress':'#2196f3' };

/* ── tiny helper components ─────────────────────────────── */
const SectionHeader = ({ icon, title, to, linkLabel = 'View all →' }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
    <h3 style={{ fontSize:'1rem', fontWeight:700, color:'var(--primary-dark)', display:'flex', alignItems:'center', gap:6 }}>
      {icon} {title}
    </h3>
    {to && (
      <Link to={to} style={{ fontSize:'0.8rem', color:'var(--primary)', textDecoration:'none', fontWeight:500 }}>
        {linkLabel}
      </Link>
    )}
  </div>
);

const KpiCard = ({ icon, label, value, sub, color='var(--primary)', onClick }) => (
  <div onClick={onClick} style={{
    background:'white', borderRadius:'var(--radius)', padding:'16px',
    boxShadow:'var(--shadow)', borderTop:`3px solid ${color}`,
    cursor: onClick ? 'pointer' : 'default', transition:'transform 0.15s',
  }}
    onMouseEnter={e => onClick && (e.currentTarget.style.transform='translateY(-2px)')}
    onMouseLeave={e => onClick && (e.currentTarget.style.transform='translateY(0)')}
  >
    <div style={{ fontSize:'1.3rem', marginBottom:4 }}>{icon}</div>
    <div style={{ fontSize:'1.5rem', fontWeight:800, color, lineHeight:1 }}>{value}</div>
    {sub  && <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginTop:2 }}>{sub}</div>}
    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginTop:4 }}>{label}</div>
  </div>
);

const AlertBanner = ({ type, icon, message, to }) => {
  const bg   = type==='danger' ? '#fde8ea' : type==='warning' ? '#fff8e1' : '#e8f4fd';
  const col  = type==='danger' ? '#c62828' : type==='warning' ? '#e65100' : '#1565c0';
  const bdr  = type==='danger' ? '#ef9a9a' : type==='warning' ? '#ffcc80' : '#90caf9';
  return (
    <Link to={to} style={{ textDecoration:'none' }}>
      <div style={{
        display:'flex', alignItems:'center', gap:10,
        padding:'10px 16px', borderRadius:'var(--radius-sm)',
        background:bg, borderLeft:`3px solid ${bdr}`,
        fontSize:'0.84rem', fontWeight:500, color:col,
      }}>
        <span>{icon}</span><span style={{ flex:1 }}>{message}</span>
        <span style={{ opacity:0.5 }}>→</span>
      </div>
    </Link>
  );
};

const MiniTable = ({ cols, rows, empty }) => (
  rows.length === 0
    ? <div className="empty-state" style={{ padding:'24px' }}>{empty}</div>
    : <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.85rem' }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{ padding:'8px 12px', textAlign:'left', fontSize:'0.72rem',
                  fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase',
                  letterSpacing:'0.5px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding:'9px 12px', verticalAlign:'middle' }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
);

const ProgressBar = ({ pct, color='var(--primary)' }) => (
  <div style={{ background:'#e8f5e9', borderRadius:4, height:5, width:'100%', overflow:'hidden' }}>
    <div style={{ background:color, height:5, width:`${Math.min(100,pct)}%`, borderRadius:4, transition:'width 0.5s' }} />
  </div>
);

const Badge = ({ label, color }) => {
  const map = {
    'badge-green':'#e8f5e9|#2e7d32','badge-red':'#fde8ea|#c62828',
    'badge-orange':'#fff3e0|#e65100','badge-blue':'#e3f2fd|#1565c0',
    'badge-purple':'#f3e5f5|#6a1b9a','badge-gray':'#f5f5f5|#616161',
  };
  const [bg, fg] = (map[color] || map['badge-gray']).split('|');
  return (
    <span style={{
      background:bg, color:fg, padding:'2px 9px', borderRadius:20,
      fontSize:'0.72rem', fontWeight:600, whiteSpace:'nowrap',
    }}>{label}</span>
  );
};

/* ── main component ──────────────────────────────────────── */
export default function Dashboard() {
  const { user } = useAuth();

  /* raw data */
  const [animals,      setAnimals]      = useState([]);
  const [feeding,      setFeeding]      = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [breeding,     setBreeding]     = useState([]);
  const [vouchers,     setVouchers]     = useState([]);
  const [installments, setInstallments] = useState([]);
  const [progress,     setProgress]     = useState([]);
  const [cattle,       setCattle]       = useState([]);
  const [enquiries,    setEnquiries]    = useState([]);

  const [loading, setLoading] = useState(true);

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
        setAnimals(aR.data.animals || []);
        setFeeding(fR.data.records || []);
        setVaccinations(vR.data.records || []);
        setBreeding(bR.data.records || []);
        setVouchers(voR.data.vouchers || []);
        setInstallments(iR.data.installments || []);
        setProgress(prR.data.records || []);
        setCattle(cR.data.cattle || cR.data.listings || []);
        setEnquiries(eR.data.enquiries || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  /* ── derived ───────────────────────────────────────────── */
  const speciesData = (() => {
    const m = {};
    animals.forEach(a => { m[a.species]=(m[a.species]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value}));
  })();

  const healthData = (() => {
    const m = { Healthy:0, Sick:0, Pregnant:0, Sold:0, Deceased:0 };
    animals.forEach(a => { if(m[a.status]!==undefined) m[a.status]++; });
    return Object.entries(m).filter(([,v])=>v>0).map(([name,value])=>({name,value}));
  })();

  const feedingMonthly = (() => {
    const m = {};
    feeding.forEach(r => {
      const mo = new Date(r.feedingDate).toLocaleString('default',{month:'short',year:'2-digit'});
      m[mo] = (m[mo]||0)+(r.cost||0);
    });
    return Object.entries(m).map(([month,cost])=>({month,cost})).slice(-6);
  })();

  const totalFeedCost  = feeding.reduce((s,r)=>s+(r.cost||0),0);
  const totalIncome    = vouchers.filter(v=>['Sale','Income'].includes(v.type)).reduce((s,v)=>s+v.amount,0);
  const totalExpense   = vouchers.filter(v=>!['Sale','Income'].includes(v.type)).reduce((s,v)=>s+v.amount,0);
  const netBalance     = totalIncome - totalExpense;
  const totalRemaining = installments.reduce((s,i)=>s+Math.max(0,i.totalAmount-i.paidAmount),0);

  const breedingOutcomes = (() => {
    const m = {};
    breeding.forEach(b => { m[b.outcome]=(m[b.outcome]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value}));
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

  const pendingEnquiries = enquiries.filter(e=>e.status==='Pending').length;

  /* ── alerts ─────────────────────────────────────────────── */
  const alerts = [];
  const overdueVacc = vaccinations.filter(v=>v.status==='Overdue');
  if (overdueVacc.length) alerts.push({ type:'danger', icon:'💉', message:`${overdueVacc.length} vaccination${overdueVacc.length>1?'s':''} overdue`, to:'/vaccination-records' });
  const sickAnimals = animals.filter(a=>a.status==='Sick');
  if (sickAnimals.length) alerts.push({ type:'danger', icon:'🤒', message:`${sickAnimals.length} sick animal${sickAnimals.length>1?'s':''} need attention`, to:'/my-animals' });
  const overdueInst = installments.filter(i=>i.status==='Overdue');
  if (overdueInst.length) alerts.push({ type:'danger', icon:'💳', message:`${overdueInst.length} installment plan${overdueInst.length>1?'s':''} overdue`, to:'/installments' });
  const soonVacc = vaccinations.filter(v=>{ if(v.status!=='Scheduled') return false; const d=(new Date(v.date)-new Date())/(86400000); return d>=0&&d<=7; });
  if (soonVacc.length) alerts.push({ type:'warning', icon:'📅', message:`${soonVacc.length} vaccination${soonVacc.length>1?'s':''} due within 7 days`, to:'/vaccination-records' });
  if (pendingEnquiries) alerts.push({ type:'info', icon:'📩', message:`${pendingEnquiries} new market enquir${pendingEnquiries>1?'ies':'y'} waiting for response`, to:'/cattle-market' });

  const speciesBadge = s => ({ Cow:'badge-green',Buffalo:'badge-blue',Goat:'badge-orange',Sheep:'badge-purple',Bull:'badge-red',Calf:'badge-gray' }[s]||'badge-gray');
  const vaccBadge    = s => ({ Given:'badge-green',Scheduled:'badge-orange',Overdue:'badge-red' }[s]||'badge-gray');
  const outcomeBadge = s => ({ Pending:'badge-orange',Successful:'badge-green',Failed:'badge-red','In Progress':'badge-blue' }[s]||'badge-gray');
  const instBadge    = s => ({ Active:'badge-blue',Completed:'badge-green',Overdue:'badge-red',Cancelled:'badge-gray' }[s]||'badge-gray');
  const fmtPKR       = n => n >= 1000 ? `PKR ${(n/1000).toFixed(1)}k` : `PKR ${n}`;

  const getGreeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening'; };

  /* ── latest progress records ─────────────────────────────── */
  const recentProgress = [...progress].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,4);

  /* ── upcoming breeding deliveries ─────────────────────────── */
  const upcomingBreeding = breeding
    .filter(b=>b.expectedDelivery && b.outcome==='Pending')
    .sort((a,b)=>new Date(a.expectedDelivery)-new Date(b.expectedDelivery))
    .slice(0,4);

  const daysLeft = (d) => Math.ceil((new Date(d)-new Date())/86400000);

  if (loading) return (
    <div className="page-dashboard">
      <div className="page-content" style={{ display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh' }}>
        <Spinner text="Loading your farm..." />
      </div>
    </div>
  );

  return (
    <div className="page-dashboard">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize:'1.5rem' }}>{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h2>
          <p style={{ color:'var(--text-muted)', marginTop:2 }}>{user?.farmName ? `${user.farmName} • ` : ''}Your farm overview</p>
        </div>
        <Link to="/my-animals" className="btn btn-primary btn-sm">+ Add Animal</Link>
      </div>

      <div className="page-content">
        <QuickNav />

        {/* ── Alerts ────────────────────────────────────── */}
        {alerts.length > 0 && (
          <Animate direction="down">
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {alerts.map((a,i) => <AlertBanner key={i} {...a} />)}
            </div>
          </Animate>
        )}

        {/* ── Top KPIs ──────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { icon:'🐄', label:'Total Animals',    value:animals.length,      color:'#2d6a4f' },
            { icon:'💉', label:'Vaccinations',     value:vaccinations.length, color:'#1565c0' },
            { icon:'🧬', label:'Breeding Records', value:breeding.length,     color:'#6a1b9a' },
            { icon:'📈', label:'Progress Records', value:progress.length,     color:'#00695c' },
            { icon:'🏪', label:'Market Listings',  value:cattle.length,       color:'#e65100' },
            { icon:'💳', label:'Installments',     value:installments.length, color:'#c62828' },
            { icon:'🧾', label:'Vouchers',         value:vouchers.length,     color:'#1b5e20' },
            { icon:'💰', label:'Net Balance',      value:fmtPKR(Math.abs(netBalance)),
              sub: netBalance>=0?'Profit':'Loss',
              color: netBalance>=0?'#2e7d32':'#c62828' },
          ].map((k,i) => (
            <Animate key={k.label} direction="up" delay={i*50}>
              <KpiCard {...k} />
            </Animate>
          ))}
        </div>

        {/* ════════════════════════════════════════════════
            ROW 1 — Animals section
            ════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

          {/* Species breakdown */}
          <Animate direction="left">
            <div className="card" style={{ height:'100%' }}>
              <div className="card-body">
                <SectionHeader icon="🐄" title="Animals by Species" to="/my-animals" />
                {speciesData.length === 0
                  ? <div className="empty-state" style={{padding:24}}><p>No animals yet</p></div>
                  : <>
                      <ResponsiveContainer width="100%" height={190}>
                        <PieChart>
                          <Pie data={speciesData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} dataKey="value" paddingAngle={3}>
                            {speciesData.map((_,i)=><Cell key={i} fill={SPECIES_COLORS[i%SPECIES_COLORS.length]}/>)}
                          </Pie>
                          <Tooltip formatter={(v,n)=>[v,n]}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'6px 14px',justifyContent:'center',marginTop:6}}>
                        {speciesData.map((e,i)=>{
                          const tot=speciesData.reduce((s,d)=>s+d.value,0);
                          return (
                            <span key={e.name} style={{display:'flex',alignItems:'center',gap:5,fontSize:'0.75rem',color:'var(--text-muted)'}}>
                              <span style={{width:8,height:8,borderRadius:2,background:SPECIES_COLORS[i%SPECIES_COLORS.length],flexShrink:0}}/>
                              {e.name}: {e.value} ({Math.round(e.value/tot*100)}%)
                            </span>
                          );
                        })}
                      </div>
                    </>
                }
              </div>
            </div>
          </Animate>

          {/* Health status + recent animals */}
          <Animate direction="right">
            <div className="card" style={{ height:'100%' }}>
              <div className="card-body">
                <SectionHeader icon="❤️" title="Health Status" to="/my-animals" />
                {healthData.length === 0
                  ? <div className="empty-state" style={{padding:24}}><p>No health data</p></div>
                  : <ResponsiveContainer width="100%" height={190}>
                      <BarChart data={healthData} margin={{top:4,right:4,left:-24,bottom:4}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                        <XAxis dataKey="name" tick={{fontSize:10}}/>
                        <YAxis tick={{fontSize:10}} allowDecimals={false}/>
                        <Tooltip/>
                        <Bar dataKey="value" radius={[4,4,0,0]}>
                          {healthData.map((e,i)=><Cell key={i} fill={HEALTH_COLORS[e.name]||'#74c69d'}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
                {/* mini animal list */}
                <div style={{marginTop:12, borderTop:'1px solid var(--border)', paddingTop:10}}>
                  <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>Recent Animals</div>
                  {animals.slice(0,3).map(a=>(
                    <div key={a._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
                      <div>
                        <span style={{fontWeight:600,fontSize:'0.84rem'}}>{a.name||a.tagId}</span>
                        <span style={{fontSize:'0.72rem',color:'var(--text-muted)',marginLeft:6}}>#{a.tagId}</span>
                      </div>
                      <div style={{display:'flex',gap:5}}>
                        <Badge label={a.species} color={speciesBadge(a.species)}/>
                        <Badge label={a.status}  color={a.status==='Healthy'?'badge-green':a.status==='Sick'?'badge-red':'badge-orange'}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 2 — Feeding + Finance
            ════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

          {/* Monthly feeding cost */}
          <Animate direction="left">
            <div className="card">
              <div className="card-body">
                <SectionHeader icon="🌾" title="Monthly Feeding Cost (PKR)" to="/feeding-records" />
                <div style={{display:'flex',gap:16,marginBottom:12}}>
                  <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>
                    Total spend: <strong style={{color:'var(--primary)'}}>{fmtPKR(totalFeedCost)}</strong>
                  </div>
                  <div style={{fontSize:'0.8rem',color:'var(--text-muted)'}}>
                    Records: <strong>{feeding.length}</strong>
                  </div>
                </div>
                {feedingMonthly.length === 0
                  ? <div className="empty-state" style={{padding:24}}>
                      <p>No feeding records yet</p>
                      <Link to="/feeding-records" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Records</Link>
                    </div>
                  : <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={feedingMonthly} margin={{top:4,right:4,left:-10,bottom:4}}>
                        <defs>
                          <linearGradient id="feedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#2d6a4f" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                        <XAxis dataKey="month" tick={{fontSize:10}}/>
                        <YAxis tick={{fontSize:10}}/>
                        <Tooltip formatter={v=>[`PKR ${v.toLocaleString()}`,'Cost']}/>
                        <Area type="monotone" dataKey="cost" stroke="#2d6a4f" strokeWidth={2.5} fill="url(#feedGrad)" dot={{fill:'#2d6a4f',r:3}} activeDot={{r:5}}/>
                      </AreaChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>
          </Animate>

          {/* Vouchers / Finance */}
          <Animate direction="right">
            <div className="card">
              <div className="card-body">
                <SectionHeader icon="🧾" title="Income vs Expenses (PKR)" to="/vouchers" />
                {/* summary row */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                  {[
                    { label:'Income',   value:fmtPKR(totalIncome),  color:'#2e7d32' },
                    { label:'Expenses', value:fmtPKR(totalExpense), color:'#c62828' },
                    { label:netBalance>=0?'Profit':'Loss', value:fmtPKR(Math.abs(netBalance)), color:netBalance>=0?'#2e7d32':'#c62828' },
                  ].map(item=>(
                    <div key={item.label} style={{background:'#f8faf8',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                      <div style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>{item.label}</div>
                      <div style={{fontWeight:700,fontSize:'0.88rem',color:item.color,marginTop:2}}>{item.value}</div>
                    </div>
                  ))}
                </div>
                {voucherMonthly.length === 0
                  ? <div className="empty-state" style={{padding:24}}>
                      <p>No vouchers yet</p>
                      <Link to="/vouchers" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Voucher</Link>
                    </div>
                  : <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={voucherMonthly} margin={{top:4,right:4,left:-24,bottom:4}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                        <XAxis dataKey="month" tick={{fontSize:10}}/>
                        <YAxis tick={{fontSize:10}}/>
                        <Tooltip formatter={(v,n)=>[`PKR ${v.toLocaleString()}`,n]}/>
                        <Bar dataKey="income"  fill="#52b788" radius={[3,3,0,0]} name="Income"/>
                        <Bar dataKey="expense" fill="#e63946" radius={[3,3,0,0]} name="Expense"/>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 3 — Vaccinations + Breeding
            ════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

          {/* Vaccinations */}
          <Animate direction="left" delay={80}>
            <div className="card">
              <div className="card-body">
                <SectionHeader icon="💉" title="Vaccinations" to="/vaccination-records" />
                {/* status summary */}
                <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                  {['Given','Scheduled','Overdue'].map(s=>{
                    const cnt = vaccinations.filter(v=>v.status===s).length;
                    const col = s==='Given'?'#2e7d32':s==='Scheduled'?'#e65100':'#c62828';
                    const bg  = s==='Given'?'#e8f5e9':s==='Scheduled'?'#fff3e0':'#fde8ea';
                    return (
                      <div key={s} style={{flex:1,minWidth:70,background:bg,borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                        <div style={{fontSize:'1.2rem',fontWeight:800,color:col}}>{cnt}</div>
                        <div style={{fontSize:'0.7rem',color:col}}>{s}</div>
                      </div>
                    );
                  })}
                </div>
                <MiniTable
                  cols={['Animal','Vaccine','Date','Status']}
                  empty={<><div className="icon">💉</div><p>No vaccinations yet</p><Link to="/vaccination-records" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Vaccination</Link></>}
                  rows={vaccinations.slice(0,5).map(v=>[
                    <div>
                      <div style={{fontWeight:600,fontSize:'0.82rem'}}>{v.animal?.name||v.animal?.tagId||'—'}</div>
                      <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{v.animal?.species}</div>
                    </div>,
                    <span style={{fontSize:'0.82rem'}}>{v.vaccineName}</span>,
                    <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{v.date?new Date(v.date).toLocaleDateString():'—'}</span>,
                    <Badge label={v.status} color={vaccBadge(v.status)}/>,
                  ])}
                />
              </div>
            </div>
          </Animate>

          {/* Breeding */}
          <Animate direction="right" delay={80}>
            <div className="card">
              <div className="card-body">
                <SectionHeader icon="🧬" title="Breeding Records" to="/breeding-records" />
                {/* outcome chart + upcoming deliveries */}
                {breedingOutcomes.length > 0 && (
                  <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                    {breedingOutcomes.map(o=>(
                      <div key={o.name} style={{
                        flex:1,minWidth:60,borderRadius:8,padding:'7px 8px',textAlign:'center',
                        background: o.name==='Successful'?'#e8f5e9':o.name==='Failed'?'#fde8ea':o.name==='Pending'?'#fff3e0':'#e3f2fd',
                      }}>
                        <div style={{fontSize:'1.1rem',fontWeight:800,color:OUTCOME_COLORS[o.name]||'#555'}}>{o.value}</div>
                        <div style={{fontSize:'0.68rem',color:OUTCOME_COLORS[o.name]||'#555'}}>{o.name}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{fontSize:'0.75rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:8}}>
                  Upcoming Deliveries
                </div>
                <MiniTable
                  cols={['Female','Expected','Days Left','Outcome']}
                  empty={<><div className="icon">🧬</div><p>No pending deliveries</p><Link to="/breeding-records" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Record</Link></>}
                  rows={upcomingBreeding.length > 0
                    ? upcomingBreeding.map(b=>{
                        const dl = b.expectedDelivery ? daysLeft(b.expectedDelivery) : null;
                        return [
                          <div>
                            <div style={{fontWeight:600,fontSize:'0.82rem'}}>{b.femaleAnimal?.name||b.femaleAnimal?.tagId||'—'}</div>
                            <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{b.femaleAnimal?.species}</div>
                          </div>,
                          <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{b.expectedDelivery?new Date(b.expectedDelivery).toLocaleDateString():'—'}</span>,
                          dl!==null
                            ? <Badge label={dl<0?'Overdue':dl===0?'Today!':dl+'d'} color={dl<0?'badge-red':dl<=7?'badge-orange':'badge-green'}/>
                            : '—',
                          <Badge label={b.outcome} color={outcomeBadge(b.outcome)}/>,
                        ];
                      })
                    : breeding.slice(0,5).map(b=>[
                        <div>
                          <div style={{fontWeight:600,fontSize:'0.82rem'}}>{b.femaleAnimal?.name||b.femaleAnimal?.tagId||'—'}</div>
                          <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{b.femaleAnimal?.species}</div>
                        </div>,
                        <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{b.breedingDate?new Date(b.breedingDate).toLocaleDateString():'—'}</span>,
                        <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>—</span>,
                        <Badge label={b.outcome} color={outcomeBadge(b.outcome)}/>,
                      ])
                  }
                />
              </div>
            </div>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 4 — Animal Progress + Installments
            ════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

          {/* Animal Progress */}
          <Animate direction="left" delay={100}>
            <div className="card">
              <div className="card-body">
                <SectionHeader icon="📈" title="Animal Progress" to="/animal-progress" />
                {/* summary stats */}
                {progress.length > 0 && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
                    {[
                      { label:'Avg Weight', value: (() => { const w=progress.filter(r=>r.weight); return w.length?Math.round(w.reduce((s,r)=>s+r.weight,0)/w.length)+'kg':'—'; })() },
                      { label:'Avg Milk',   value: (() => { const m=progress.filter(r=>r.milkProduction); return m.length?(m.reduce((s,r)=>s+r.milkProduction,0)/m.length).toFixed(1)+'L':'—'; })() },
                      { label:'Excellent',  value: progress.filter(r=>r.healthStatus==='Excellent').length },
                    ].map(item=>(
                      <div key={item.label} style={{background:'#f4faf5',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
                        <div style={{fontSize:'1rem',fontWeight:800,color:'var(--primary)'}}>{item.value}</div>
                        <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                <MiniTable
                  cols={['Animal','Date','Weight','Health','Photo']}
                  empty={<><div className="icon">📈</div><p>No progress records yet</p><Link to="/animal-progress" className="btn btn-primary btn-sm" style={{marginTop:8}}>Add Progress</Link></>}
                  rows={recentProgress.map(r=>[
                    <div>
                      <div style={{fontWeight:600,fontSize:'0.82rem'}}>{r.animal?.name||r.animal?.tagId||'—'}</div>
                      <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{r.animal?.species}</div>
                    </div>,
                    <span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{new Date(r.date).toLocaleDateString()}</span>,
                    <span style={{fontSize:'0.82rem'}}>{r.weight?`${r.weight}kg`:'—'}</span>,
                    <Badge label={r.healthStatus||'—'} color={r.healthStatus==='Excellent'||r.healthStatus==='Good'?'badge-green':r.healthStatus==='Fair'?'badge-orange':'badge-red'}/>,
                    r.imageBase64
                      ? <img src={`data:${r.imageMimeType};base64,${r.imageBase64}`} alt="p"
                          style={{width:32,height:32,borderRadius:6,objectFit:'cover',border:'1px solid var(--border)'}}/>
                      : <span style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>—</span>,
                  ])}
                />
              </div>
            </div>
          </Animate>

          {/* Installments */}
          <Animate direction="right" delay={100}>
            <div className="card">
              <div className="card-body">
                <SectionHeader icon="💳" title="Installments" to="/installments" />
                {/* summary */}
                <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap'}}>
                  {[
                    { label:'Active',    value:installments.filter(i=>i.status==='Active').length,    bg:'#e3f2fd', color:'#1565c0' },
                    { label:'Overdue',   value:installments.filter(i=>i.status==='Overdue').length,   bg:'#fde8ea', color:'#c62828' },
                    { label:'Completed', value:installments.filter(i=>i.status==='Completed').length, bg:'#e8f5e9', color:'#2e7d32' },
                  ].map(s=>(
                    <div key={s.label} style={{flex:1,minWidth:60,background:s.bg,borderRadius:8,padding:'7px 8px',textAlign:'center'}}>
                      <div style={{fontSize:'1.1rem',fontWeight:800,color:s.color}}>{s.value}</div>
                      <div style={{fontSize:'0.7rem',color:s.color}}>{s.label}</div>
                    </div>
                  ))}
                  <div style={{flex:2,minWidth:120,background:'#f3e5f5',borderRadius:8,padding:'7px 10px'}}>
                    <div style={{fontSize:'0.7rem',color:'#6a1b9a'}}>Total Remaining</div>
                    <div style={{fontSize:'0.9rem',fontWeight:800,color:'#6a1b9a'}}>{fmtPKR(totalRemaining)}</div>
                  </div>
                </div>
                {installments.length === 0
                  ? <div className="empty-state" style={{padding:24}}>
                      <div className="icon">💳</div><p>No installment plans</p>
                      <Link to="/installments" className="btn btn-primary btn-sm" style={{marginTop:8}}>Create Plan</Link>
                    </div>
                  : installments.slice(0,4).map(inst=>{
                      const pct = Math.min(100,Math.round(inst.paidAmount/inst.totalAmount*100));
                      const rem = Math.max(0,inst.totalAmount-inst.paidAmount);
                      return (
                        <div key={inst._id} style={{marginBottom:12,paddingBottom:12,borderBottom:'1px solid var(--border)'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                            <span style={{fontWeight:600,fontSize:'0.84rem'}}>{inst.title}</span>
                            <Badge label={inst.status} color={instBadge(inst.status)}/>
                          </div>
                          <ProgressBar pct={pct} color={pct===100?'#52b788':inst.status==='Overdue'?'#e63946':'var(--primary)'}/>
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:4,fontSize:'0.72rem',color:'var(--text-muted)'}}>
                            <span>{pct}% paid</span>
                            <span style={{color:rem>0?'var(--danger)':'var(--success)',fontWeight:600}}>
                              {rem>0?`PKR ${rem.toLocaleString()} left`:'Fully paid ✅'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </Animate>
        </div>

        {/* ════════════════════════════════════════════════
            ROW 5 — Cattle Market
            ════════════════════════════════════════════════ */}
        <Animate direction="up" delay={80}>
          <div className="card" style={{ marginBottom:16 }}>
            <div className="card-body">
              <SectionHeader icon="🏪" title="Cattle Market" to="/cattle-market" linkLabel={`View Market →${pendingEnquiries?' 🔴'+pendingEnquiries:''}`}/>
              {/* market summary */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:8,marginBottom:16}}>
                {[
                  { label:'Active Listings', value:cattle.filter(c=>c.status!=='Sold').length, bg:'#e8f5e9', col:'#2e7d32' },
                  { label:'Sold',            value:cattle.filter(c=>c.status==='Sold').length, bg:'#f3e5f5', col:'#6a1b9a' },
                  { label:'Pending Enquiries', value:pendingEnquiries,                         bg:pendingEnquiries?'#fde8ea':'#f5f5f5', col:pendingEnquiries?'#c62828':'#616161' },
                  { label:'Total Listings',  value:cattle.length,                              bg:'#e3f2fd', col:'#1565c0' },
                ].map(s=>(
                  <div key={s.label} style={{background:s.bg,borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:'1.3rem',fontWeight:800,color:s.col}}>{s.value}</div>
                    <div style={{fontSize:'0.7rem',color:s.col,marginTop:2}}>{s.label}</div>
                  </div>
                ))}
              </div>
              {cattle.length === 0
                ? <div className="empty-state" style={{padding:24}}>
                    <div className="icon">🏪</div><p>No listings yet</p>
                    <Link to="/cattle-market" className="btn btn-primary btn-sm" style={{marginTop:8}}>List an Animal</Link>
                  </div>
                : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:10}}>
                    {cattle.slice(0,6).map(c=>(
                      <div key={c._id} style={{
                        border:'1px solid var(--border)', borderRadius:10, overflow:'hidden',
                        background:'white', transition:'box-shadow 0.2s',
                      }}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}
                      >
                        {c.imageBase64
                          ? <img src={`data:${c.imageMimeType};base64,${c.imageBase64}`} alt={c.name}
                              style={{width:'100%',height:110,objectFit:'cover'}}/>
                          : <div style={{width:'100%',height:110,background:'#f0f7f2',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'2.5rem'}}>🐄</div>
                        }
                        <div style={{padding:'10px 12px'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                            <span style={{fontWeight:700,fontSize:'0.88rem'}}>{c.name||c.tagId}</span>
                            <Badge label={c.species} color={speciesBadge(c.species)}/>
                          </div>
                          <div style={{fontSize:'0.82rem',color:'var(--primary)',fontWeight:700}}>PKR {Number(c.price||0).toLocaleString()}</div>
                          <div style={{fontSize:'0.72rem',color:'var(--text-muted)',marginTop:2}}>{c.location||'No location'}</div>
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
