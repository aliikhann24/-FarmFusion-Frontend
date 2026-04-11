import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { animalsAPI, installmentsAPI, vouchersAPI, breedingAPI, feedingAPI, vaccinationAPI } from '../../utils/api';
import Spinner from '../../components/common/Spinner';
import QuickNav from '../../components/common/QuickNav';
import Animate from '../../components/common/Animate';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';

const COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7'];
const HEALTH_COLORS = { Healthy: '#52b788', Sick: '#e63946', Pregnant: '#f4a261', Sold: '#74c69d', Deceased: '#adb5bd' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]                       = useState({ animals: 0, installments: 0, vouchers: 0, breeding: 0, vaccinations: 0 });
  const [recentAnimals, setRecentAnimals]       = useState([]);
  const [recentVaccinations, setRecentVaccinations] = useState([]);
  const [speciesData, setSpeciesData]           = useState([]);
  const [healthData,  setHealthData]            = useState([]);
  const [feedingData, setFeedingData]           = useState([]);
  const [alerts, setAlerts]                     = useState([]);
  const [upcomingBreeding, setUpcomingBreeding] = useState([]);
  const [totalFeedCost, setTotalFeedCost]       = useState(0);
  const [loading, setLoading]                   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [animalsRes, instRes, vouchRes, breedRes, feedRes, vaccRes] = await Promise.all([
          animalsAPI.getAll(),
          installmentsAPI.getAll(),
          vouchersAPI.getAll(),
          breedingAPI.getAll(),
          feedingAPI.getAll(),
          vaccinationAPI.getAll(),
        ]);

        const animals      = animalsRes.data.animals || [];
        const feeding      = feedRes.data.records    || [];
        const vaccinations = vaccRes.data.records    || [];
        const breeding     = breedRes.data.records   || [];

        setStats({
          animals:      animalsRes.data.count || animals.length,
          installments: instRes.data.installments?.length || 0,
          vouchers:     vouchRes.data.vouchers?.length    || 0,
          breeding:     breeding.length,
          vaccinations: vaccinations.length,
        });

        setRecentAnimals(animals.slice(0, 5));
        setRecentVaccinations(vaccinations.slice(0, 3));

        // Species breakdown
        const speciesCount = {};
        animals.forEach(a => { speciesCount[a.species] = (speciesCount[a.species] || 0) + 1; });
        setSpeciesData(Object.entries(speciesCount).map(([name, value]) => ({ name, value })));

        // Health status breakdown
        const healthCount = { Healthy: 0, Sick: 0, Pregnant: 0, Sold: 0, Deceased: 0 };
        animals.forEach(a => { if (healthCount[a.status] !== undefined) healthCount[a.status]++; });
        setHealthData(Object.entries(healthCount).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })));

        // Monthly feeding cost
        const monthlyMap = {};
        let total = 0;
        feeding.forEach(r => {
          const month = new Date(r.feedingDate).toLocaleString('default', { month: 'short', year: '2-digit' });
          monthlyMap[month] = (monthlyMap[month] || 0) + (r.cost || 0);
          total += (r.cost || 0);
        });
        setFeedingData(Object.entries(monthlyMap).map(([month, cost]) => ({ month, cost })).slice(-6));
        setTotalFeedCost(total);

        // ── Smart Alerts ──────────────────────────────────────
        const newAlerts = [];
        const today = new Date();

        // Overdue vaccinations
        const overdueVacc = vaccinations.filter(v => v.status === 'Overdue');
        if (overdueVacc.length > 0)
          newAlerts.push({ type: 'danger', icon: '💉', message: `${overdueVacc.length} vaccination${overdueVacc.length > 1 ? 's' : ''} overdue`, link: '/vaccination-records' });

        // Sick animals
        const sickAnimals = animals.filter(a => a.status === 'Sick');
        if (sickAnimals.length > 0)
          newAlerts.push({ type: 'danger', icon: '🤒', message: `${sickAnimals.length} sick animal${sickAnimals.length > 1 ? 's' : ''} need attention`, link: '/my-animals' });

        // Scheduled vaccinations in next 7 days
        const scheduledSoon = vaccinations.filter(v => {
          if (v.status !== 'Scheduled') return false;
          const diff = (new Date(v.date) - today) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= 7;
        });
        if (scheduledSoon.length > 0)
          newAlerts.push({ type: 'warning', icon: '📅', message: `${scheduledSoon.length} vaccination${scheduledSoon.length > 1 ? 's' : ''} due within 7 days`, link: '/vaccination-records' });

        // Pregnant animals — upcoming delivery
        const pregnantAnimals = animals.filter(a => a.status === 'Pregnant');
        if (pregnantAnimals.length > 0)
          newAlerts.push({ type: 'info', icon: '🤰', message: `${pregnantAnimals.length} pregnant animal${pregnantAnimals.length > 1 ? 's' : ''} — monitor closely`, link: '/my-animals' });

        setAlerts(newAlerts);

        // Upcoming breeding deliveries
        const upcoming = breeding
          .filter(b => b.expectedDelivery && b.outcome === 'Pending')
          .sort((a, b) => new Date(a.expectedDelivery) - new Date(b.expectedDelivery))
          .slice(0, 3);
        setUpcomingBreeding(upcoming);

      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const speciesBadge = (species) => {
    const map = { Cow: 'badge-green', Buffalo: 'badge-blue', Goat: 'badge-orange', Sheep: 'badge-purple', Bull: 'badge-red', Calf: 'badge-gray' };
    return map[species] || 'badge-gray';
  };

  const vaccStatusMap = { Given: 'badge-green', Scheduled: 'badge-orange', Overdue: 'badge-red' };

  const formatPKR = (n) => n >= 1000 ? `PKR ${(n / 1000).toFixed(1)}k` : `PKR ${n}`;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page-dashboard">
      <div className="page-header">
        <div>
          <h2>{getGreeting()}, {user?.name?.split(' ')[0]} 👋</h2>
          <p>{user?.farmName ? `${user.farmName} • ` : ''}Your farm overview</p>
        </div>
        <Link to="/my-animals" className="btn btn-primary btn-sm">+ Add Animal</Link>
      </div>

      <div className="page-content">

        <QuickNav />

        {/* ── Smart Alerts ── */}
        {!loading && alerts.length > 0 && (
          <Animate direction="down">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {alerts.map((alert, i) => (
                <Link key={i} to={alert.link} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                    background: alert.type === 'danger' ? '#fde8ea' : alert.type === 'warning' ? '#fff3e0' : '#e8f4fd',
                    borderLeft: `3px solid ${alert.type === 'danger' ? 'var(--danger)' : alert.type === 'warning' ? 'var(--warning)' : '#2196f3'}`,
                    fontSize: '0.85rem', fontWeight: 500,
                    color: alert.type === 'danger' ? '#c62828' : alert.type === 'warning' ? '#e65100' : '#1565c0',
                    cursor: 'pointer',
                  }}>
                    <span>{alert.icon}</span>
                    <span>{alert.message}</span>
                    <span style={{ marginLeft: 'auto', opacity: 0.6 }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          </Animate>
        )}

        {/* ── Stats Grid ── */}
        <div className="stats-grid">
          {[
            { icon: '🐄', label: 'Total Animals',    value: stats.animals,      cls: 'green'  },
            { icon: '💉', label: 'Vaccinations',     value: stats.vaccinations, cls: 'blue'   },
            { icon: '🧬', label: 'Breeding Records', value: stats.breeding,     cls: 'purple' },
            { icon: '💳', label: 'Installments',     value: stats.installments, cls: 'orange' },
          ].map((s, i) => (
            <Animate key={s.label} direction="up" delay={i * 80}>
              <div className="stat-card">
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div className="stat-info">
                  <div className="value">{loading ? '—' : s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              </div>
            </Animate>
          ))}
        </div>

        {/* ── Extra KPI row ── */}
        {!loading && (
          <Animate direction="up" delay={60}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px', marginBottom: '20px'
            }}>
              {[
                {
                  label: 'Healthy Animals',
                  value: healthData.find(h => h.name === 'Healthy')?.value || 0,
                  total: stats.animals,
                  color: '#52b788', icon: '✅'
                },
                {
                  label: 'Sick Animals',
                  value: healthData.find(h => h.name === 'Sick')?.value || 0,
                  total: stats.animals,
                  color: '#e63946', icon: '🤒'
                },
                {
                  label: 'Pregnant',
                  value: healthData.find(h => h.name === 'Pregnant')?.value || 0,
                  total: stats.animals,
                  color: '#f4a261', icon: '🤰'
                },
                {
                  label: 'Total Feed Spend',
                  value: formatPKR(totalFeedCost),
                  isText: true,
                  color: '#2d6a4f', icon: '🌾'
                },
              ].map((kpi, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: 'var(--radius)',
                  padding: '14px 16px', boxShadow: 'var(--shadow)',
                  borderTop: `3px solid ${kpi.color}`,
                }}>
                  <div style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{kpi.icon}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 700, color: kpi.color }}>
                    {kpi.isText ? kpi.value : kpi.value}
                    {!kpi.isText && kpi.total > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '4px' }}>
                        / {kpi.total}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{kpi.label}</div>
                </div>
              ))}
            </div>
          </Animate>
        )}

        {/* ── Charts Row 1: Species + Health Status ── */}
        <div className="charts-grid">
          <Animate direction="left">
            <div className="card">
              <div className="card-header"><h3>🐄 Animals by Species</h3></div>
              <div className="card-body">
                {loading ? <Spinner text="Loading chart..." /> : speciesData.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}><p>No animals to display</p></div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={speciesData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                          {speciesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center', marginTop: '8px' }}>
                      {speciesData.map((entry, i) => {
                        const total = speciesData.reduce((s, d) => s + d.value, 0);
                        return (
                          <span key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                            {entry.name}: {entry.value} ({Math.round((entry.value / total) * 100)}%)
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Animate>

          <Animate direction="right">
            <div className="card">
              <div className="card-header"><h3>❤️ Health Status</h3></div>
              <div className="card-body">
                {loading ? <Spinner text="Loading chart..." /> : healthData.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}><p>No health data</p></div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={healthData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {healthData.map((entry, i) => (
                          <Cell key={i} fill={HEALTH_COLORS[entry.name] || '#74c69d'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Animate>
        </div>

        {/* ── Charts Row 2: Feeding Cost + Recent Animals ── */}
        <div className="charts-grid">
          <Animate direction="left" delay={80}>
            <div className="card">
              <div className="card-header"><h3>💰 Monthly Feeding Cost (PKR)</h3></div>
              <div className="card-body">
                {loading ? <Spinner text="Loading chart..." /> : feedingData.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <p>No feeding data yet</p>
                    <Link to="/feeding-records" className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
                      Add Feeding Records
                    </Link>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={feedingData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => [`PKR ${v.toLocaleString()}`, 'Cost']} />
                      <Line type="monotone" dataKey="cost" stroke="#2d6a4f" strokeWidth={2.5}
                        dot={{ fill: '#2d6a4f', r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </Animate>

          <Animate direction="right" delay={80}>
            <div className="card">
              <div className="card-header">
                <h3>🐄 Recent Animals</h3>
                <Link to="/my-animals" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ padding: 0, overflowX: 'auto' }}>
                {loading ? <Spinner text="Loading..." /> : recentAnimals.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <div className="icon">🐄</div>
                    <p>No animals added yet</p>
                    <Link to="/my-animals" className="btn btn-primary btn-sm">Add your first animal</Link>
                  </div>
                ) : (
                  <table style={{ minWidth: '350px' }}>
                    <thead><tr><th>Animal</th><th>Species</th><th>Status</th></tr></thead>
                    <tbody>
                      {recentAnimals.map(a => (
                        <tr key={a._id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{a.name || a.tagId}</div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>#{a.tagId}</div>
                          </td>
                          <td><span className={`badge ${speciesBadge(a.species)}`}>{a.species}</span></td>
                          <td>
                            <span className={`badge ${a.status === 'Healthy' ? 'badge-green' : a.status === 'Sick' ? 'badge-red' : 'badge-orange'}`}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Animate>
        </div>

        {/* ── Row 3: Vaccinations + Upcoming Breeding ── */}
        <div className="charts-grid" style={{ marginBottom: '24px' }}>
          <Animate direction="up" delay={100}>
            <div className="card">
              <div className="card-header">
                <h3>💉 Recent Vaccinations</h3>
                <Link to="/vaccination-records" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ padding: 0, overflowX: 'auto' }}>
                {loading ? <Spinner text="Loading..." /> : recentVaccinations.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <div className="icon">💉</div>
                    <p>No vaccinations recorded yet</p>
                    <Link to="/vaccination-records" className="btn btn-primary btn-sm">Add Vaccination</Link>
                  </div>
                ) : (
                  <table style={{ minWidth: '400px' }}>
                    <thead>
                      <tr><th>Animal</th><th>Vaccine</th><th>Date</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {recentVaccinations.map(v => (
                        <tr key={v._id}>
                          <td>
                            <strong>{v.animal?.name || v.animal?.tagId || '—'}</strong>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{v.animal?.species}</div>
                          </td>
                          <td>{v.vaccineName}</td>
                          <td>{v.date ? new Date(v.date).toLocaleDateString() : '—'}</td>
                          <td><span className={`badge ${vaccStatusMap[v.status]}`}>{v.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Animate>

          <Animate direction="up" delay={120}>
            <div className="card">
              <div className="card-header">
                <h3>🧬 Upcoming Deliveries</h3>
                <Link to="/breeding-records" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
              </div>
              <div style={{ padding: 0, overflowX: 'auto' }}>
                {loading ? <Spinner text="Loading..." /> : upcomingBreeding.length === 0 ? (
                  <div className="empty-state" style={{ padding: '30px' }}>
                    <div className="icon">🧬</div>
                    <p>No pending deliveries</p>
                    <Link to="/breeding-records" className="btn btn-primary btn-sm">Add Breeding Record</Link>
                  </div>
                ) : (
                  <table style={{ minWidth: '350px' }}>
                    <thead>
                      <tr><th>Female</th><th>Expected Delivery</th><th>Days Left</th></tr>
                    </thead>
                    <tbody>
                      {upcomingBreeding.map(b => {
                        const daysLeft = b.expectedDelivery
                          ? Math.ceil((new Date(b.expectedDelivery) - new Date()) / (1000 * 60 * 60 * 24))
                          : null;
                        return (
                          <tr key={b._id}>
                            <td>
                              <strong>{b.femaleAnimal?.name || b.femaleAnimal?.tagId || '—'}</strong>
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{b.femaleAnimal?.species}</div>
                            </td>
                            <td>{b.expectedDelivery ? new Date(b.expectedDelivery).toLocaleDateString() : '—'}</td>
                            <td>
                              {daysLeft !== null ? (
                                <span className={`badge ${daysLeft < 0 ? 'badge-red' : daysLeft <= 7 ? 'badge-orange' : 'badge-green'}`}>
                                  {daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Today!' : `${daysLeft}d`}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </Animate>
        </div>

      </div>
    </div>
  );
}
