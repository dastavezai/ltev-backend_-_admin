import { useState, useEffect } from 'react';
import { Users, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import axios from 'axios';

export default function Dashboard() {
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    activeRides: 0,
    totalRevenue: 0,
    fleetHealth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`/api/dashboard/stats`);
        setStatsData(response.data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const stats = [
    { title: 'Total Users', value: loading ? '...' : statsData.totalUsers.toLocaleString(), change: '+12.5%', isPositive: true, icon: <Users size={28} />, color: '#3b82f6', bg: '#eff6ff' },
    { title: 'Active Rides', value: loading ? '...' : statsData.activeRides.toLocaleString(), change: '+5.2%', isPositive: true, icon: <Activity size={28} />, color: '#8b5cf6', bg: '#f5f3ff' },
    { title: "Total Revenue", value: loading ? '...' : `₹${statsData.totalRevenue.toLocaleString()}`, change: '+18.4%', isPositive: true, icon: <CreditCard size={28} />, color: '#10b981', bg: '#ecfdf5' },
    { title: 'Fleet Health', value: loading ? '...' : `${statsData.fleetHealth}%`, change: '+1.1%', isPositive: true, icon: <Zap size={28} />, color: '#f59e0b', bg: '#fffbeb' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', margin: '0 0 8px 0', background: 'linear-gradient(90deg, #0f172a, #334155)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Dashboard Overview
          </h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Welcome back, Admin. Here is the live status of the Localtoto platform.</p>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {stats.map((stat, i) => (
          <div key={i} className="hover-lift" style={{ background: 'white', padding: '28px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02), 0 4px 6px -2px rgba(0,0,0,0.01)', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ background: stat.bg, padding: '16px', borderRadius: '16px', color: stat.color, boxShadow: `0 8px 16px ${stat.bg}` }}>
                {stat.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '700', color: stat.isPositive ? '#059669' : '#dc2626', background: stat.isPositive ? '#d1fae5' : '#fee2e2', padding: '6px 12px', borderRadius: '30px' }}>
                {stat.isPositive ? <ArrowUpRight size={16} strokeWidth={3} /> : <ArrowDownRight size={16} strokeWidth={3} />}
                {stat.change}
              </div>
            </div>
            <div style={{ fontSize: '15px', color: '#64748b', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.title}</div>
            <div style={{ fontSize: '36px', fontWeight: '800', color: '#0f172a', letterSpacing: '-1px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', height: '450px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' }}>Revenue Overview</h3>
          <div style={{ flex: 1, border: '2px dashed #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <p style={{ color: '#94a3b8', fontWeight: '500' }}>Chart Component will render here</p>
          </div>
        </div>
        
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' }}>Recent Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {[
              { title: 'New driver approved', time: 'Just now', color: '#10b981' },
              { title: 'Payment received: ₹450', time: '10 min ago', color: '#3b82f6' },
              { title: 'Vehicle VH-002 maintenance', time: '1 hr ago', color: '#f59e0b' },
              { title: 'New user registered', time: '2 hrs ago', color: '#8b5cf6' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: item.color, marginTop: '6px', boxShadow: `0 0 0 4px ${item.color}33` }} />
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>{item.time}</div>
                </div>
              </div>
            ))}
          </div>
          <button style={{ width: '100%', padding: '12px', marginTop: '32px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.target.style.background='#e2e8f0'} onMouseLeave={e => e.target.style.background='#f1f5f9'}>
            View All Activity
          </button>
        </div>
      </div>
    </div>
  );
}
