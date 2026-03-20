import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { animalsAPI, installmentsAPI, vouchersAPI, breedingAPI, feedingAPI } from '../../utils/api';
import Spinner from '../../components/common/Spinner';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line
} from 'recharts';

const COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#d8f3dc'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats]             = useState({ animals: 0, installments: 0, vouchers: 0, breeding: 0 });
  const [recentAnimals, setRecentAnimals] = useState([]);
  const [speciesData,   setSpeciesData]   = useState([]);
  const [healthData,    setHealthData]    = useState([]);
  const [feedingData,   setFeedingData]   = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [animalsRes, instRes, vouchRes, breedRes, feedRes] = await Promise.all([
          animalsAPI.getAll(),
          installmentsAPI.getAll(),
          vouchersAPI.getAll(),
          breedingAPI.getAll(),
          feedingAPI.getAll(),
        ]);

        const animals  = animalsRes.data.animals  || [];
        const feeding  = feedRes.data.records     || [];

        setStats({
          animals:      animalsRes.data.count || animals.length,
          installments: instRes.data.installments?.length  || 0,
          vouchers:     vouchRes.data.vouchers?.length     || 0,
          breeding:     breedRes.data.records?.length      || 0,
        });

        setRecentAnimals(animals.slice(0, 5));

        // Species breakdown for Pie chart
        const speciesCount = {};
        animals.forEach(a => { speciesCount[a.species] = (speciesCount[a.species] || 0) + 1; });
        setSpeciesData(Object.entries(speciesCount).map(([name, value]) => ({ name, value })));

        // Health status for Bar chart
        const healthCount = { Healthy: 0, Sick: 0, Pregnant: 0, Sold: 0, Deceased: 0 };
        animals.forEach(a => { if (healthCount[a.status] !== undefined) healthCount[a.status]++; });
        setHealthData(Object.entries(healthCount).map(([name, value]) => ({ name, value })));

        // Monthly feeding cost for Line chart
        const monthlyMap = {};
        feeding.forEach(r => {
          const month = new Date(r.feedingDate).toLocaleString('default', { month: 'short', year: '2-digit' });
          monthlyMap[month] = (monthlyMap[month] || 0) + (r.cost || 0);
        });
        const sorted = Object.entries(monthlyMap)
          .map(([month, cost]) => ({ month, cost }))
          .slice(-6);
        setFeedingData(sorted);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const speciesBadge = (species) => {
    const map = { Cow: 'badge-green', Buffalo: 'badge-blue', Goat: 'badge-orange', Sheep: 'badge-purple', Bull: 'badge-red' };
    return map[species] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Good day, {user?.name?.split(' ')[0]} 👋</h2>
          <p>{user?.farmName ? `${user.farmName} • ` : ''}Your farm overview</p>
        </div>
        <Link to="/my-animals" className="btn btn-primary btn-sm">+ Add Animal</Link>
      </div>

      <div className="page-content">

        {/* Stats Cards */}
        <div className="stats-grid">
          {[
            { icon: '🐄', label: 'Total Animals',    value: stats.animals,      cls: 'green'  },
            { icon: '💳', label: 'Installment Plans', value: stats.installments, cls: 'orange' },
            { icon: '🧾', label: 'Vouchers',          value: stats.vouchers,     cls: 'blue'   },
            { icon: '🧬', label: 'Breeding Records',  value: stats.breeding,     cls: 'purple' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-info">
                <div className="value">{loading ? '—' : s.value}</div>
                <div className="label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          {/* Species Pie Chart */}
          <div className="card">
            <div className="card-header"><h3>🐄 Animals by Species</h3></div>
            <div className="card-body">
              {loading ? <Spinner text="Loading chart..." /> : speciesData.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <p>No animals to display</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={speciesData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {speciesData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Health Status Bar Chart */}
          <div className="card">
            <div className="card-header"><h3>💚 Animal Health Status</h3></div>
            <div className="card-body">
              {loading ? <Spinner text="Loading chart..." /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={healthData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Animals" radius={[4, 4, 0, 0]}>
                      {healthData.map((entry, i) => (
                        <Cell key={i} fill={
                          entry.name === 'Healthy'  ? '#52b788' :
                          entry.name === 'Sick'     ? '#e63946' :
                          entry.name === 'Pregnant' ? '#a855f7' :
                          entry.name === 'Sold'     ? '#94a3b8' : '#64748b'
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>

          {/* Monthly Feeding Cost Line Chart */}
          <div className="card">
            <div className="card-header"><h3>💰 Monthly Feeding Cost (PKR)</h3></div>
            <div className="card-body">
              {loading ? <Spinner text="Loading chart..." /> : feedingData.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <p>No feeding data yet</p>
                  <Link to="/feeding-records" className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>Add Feeding Records</Link>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={feedingData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`PKR ${v.toLocaleString()}`, 'Cost']} />
                    <Line type="monotone" dataKey="cost" stroke="#2d6a4f" strokeWidth={2.5} dot={{ fill: '#2d6a4f', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Animals */}
          <div className="card">
            <div className="card-header">
              <h3>Recent Animals</h3>
              <Link to="/my-animals" style={{ fontSize: '0.82rem', color: 'var(--primary)', textDecoration: 'none' }}>View all →</Link>
            </div>
            <div style={{ padding: 0 }}>
              {loading ? <Spinner text="Loading..." /> : recentAnimals.length === 0 ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <div className="icon">🐄</div>
                  <p>No animals added yet</p>
                  <Link to="/my-animals" className="btn btn-primary btn-sm">Add your first animal</Link>
                </div>
              ) : (
                <table>
                  <thead><tr><th>Animal</th><th>Species</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentAnimals.map(a => (
                      <tr key={a._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.name || a.tagId}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>#{a.tagId}</div>
                        </td>
                        <td><span className={`badge ${speciesBadge(a.species)}`}>{a.species}</span></td>
                        <td><span className={`badge ${a.status === 'Healthy' ? 'badge-green' : a.status === 'Sick' ? 'badge-red' : 'badge-orange'}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header"><h3>⚡ Quick Actions</h3></div>
          <div className="card-body" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
              {[
                { to: '/my-animals',       icon: '🐄', label: 'My Animals',    desc: 'Manage livestock' },
                { to: '/cattle',           icon: '🏪', label: 'Cattle Market', desc: 'Buy & sell' },
                { to: '/breeding-records', icon: '🧬', label: 'Breeding',      desc: 'Track pairs' },
                { to: '/feeding-records',  icon: '🌾', label: 'Feeding',       desc: 'Log feed' },
                { to: '/animal-progress',  icon: '📈', label: 'Progress',      desc: 'Track growth' },
                { to: '/installments',     icon: '💳', label: 'Installments',  desc: 'Payments' },
                { to: '/vouchers',         icon: '🧾', label: 'Vouchers',      desc: 'Finance' },
                { to: '/profile',          icon: '👤', label: 'Profile',       desc: 'Account' },
              ].map(link => (
                <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                  <div style={{ padding: '14px', borderRadius: '10px', border: '1.5px solid var(--border)', transition: 'all 0.2s', cursor: 'pointer', textAlign: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = '#f4faf5'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ fontSize: '1.6rem', marginBottom: '6px' }}>{link.icon}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{link.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{link.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}