import { useState, useEffect } from 'react';
import { Users, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Zap, CalendarCheck, Clock, AlertTriangle, ChevronRight, Bike } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Dashboard() {
  const navigate = useNavigate();
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    activeRides: 0,
    totalRevenue: 0,
    fleetHealth: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, bkgRes] = await Promise.all([
          axios.get(`/api/dashboard/stats`),
          axios.get(`/api/bookings/all`)
        ]);
        setStatsData(statsRes.data);
        setRecentBookings(bkgRes.data || []);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const preBookingsList = recentBookings.filter(b => b.status === 'pre_booking');
  const overdueList = recentBookings.filter(b => b.is_overdue || b.payment_status === 'overdue');

  const stats = [
    { title: 'Total Users', value: loading ? '...' : statsData.totalUsers.toLocaleString(), change: '+12.5%', isPositive: true, icon: <Users size={20} />, color: '#3b82f6', bg: '#eff6ff', path: '/users' },
    { title: 'Active Rides', value: loading ? '...' : statsData.activeRides.toLocaleString(), change: '+5.2%', isPositive: true, icon: <Activity size={20} />, color: '#8b5cf6', bg: '#f5f3ff', path: '/rentals' },
    { title: 'Advance Bookings', value: loading ? '...' : preBookingsList.length.toLocaleString(), change: `${preBookingsList.length} Active`, isPositive: true, icon: <CalendarCheck size={20} />, color: '#0284c7', bg: '#e0f2fe', path: '/bookings' },
    { title: "Total Revenue", value: loading ? '...' : `₹${statsData.totalRevenue.toLocaleString()}`, change: '+18.4%', isPositive: true, icon: <CreditCard size={20} />, color: '#10b981', bg: '#ecfdf5', path: '/plans' },
    { title: 'Fleet Health', value: loading ? '...' : `${statsData.fleetHealth}%`, change: '+1.1%', isPositive: true, icon: <Zap size={20} />, color: '#f59e0b', bg: '#fffbeb', path: '/fleet' },
  ];

  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', margin: '0 0 4px 0', color: '#0f172a' }}>
            Dashboard Overview
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Welcome back, Admin. Live status of the Localtoto platform.</p>
        </div>

        <button
          onClick={() => navigate('/management')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'white',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <span>Open Management Portal</span>
          <ChevronRight size={15} color="#64748b" />
        </button>
      </div>
      
      {/* Compact Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={() => stat.path && navigate(stat.path)}
            style={{ 
              background: 'white', 
              padding: '16px 18px', 
              borderRadius: '12px', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)', 
              border: '1px solid #e2e8f0',
              cursor: stat.path ? 'pointer' : 'default'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ background: stat.bg, padding: '8px', borderRadius: '8px', color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: '700', color: stat.isPositive ? '#059669' : '#dc2626', background: stat.isPositive ? '#d1fae5' : '#fee2e2', padding: '2px 8px', borderRadius: '12px' }}>
                {stat.isPositive ? <ArrowUpRight size={13} strokeWidth={2.5} /> : <ArrowDownRight size={13} strokeWidth={2.5} />}
                {stat.change}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{stat.title}</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Pre-Bookings & Subscription Dues Section */}
      <div style={{ background: 'white', padding: '28px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarCheck size={22} color="#0284c7" /> Live Pre-Bookings & Subscription Dues
            </h3>
            <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
              Recent scheduled pre-bookings and riders with pending subscription dues.
            </p>
          </div>

          <button 
            onClick={() => navigate('/bookings')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f172a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
          >
            Manage All Bookings <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {/* Scheduled Pre-Bookings Widget */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Scheduled Pre-Bookings ({preBookingsList.length})
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px' }}>
                UPCOMING
              </span>
            </div>

            {preBookingsList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {preBookingsList.slice(0, 3).map(b => {
                  const paid = parseFloat(b.total_cost || b.collected_amount || 0);
                  const due = Math.max(0, 5100 - paid);
                  return (
                    <div key={b.id} style={{ background: 'white', padding: '12px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                        <span>{b.user_name} (📞 {b.user_phone})</span>
                        <span style={{ color: '#0284c7' }}>{b.plan_name}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>📅 {new Date(b.pre_booking_date || Date.now()).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span style={{ fontWeight: '800', color: due > 0 ? '#dc2626' : '#16a34a', background: due > 0 ? '#fee2e2' : '#dcfce7', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>
                          Due: 5100 - {paid} = ₹{due}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#166534', fontStyle: 'italic', padding: '10px 0' }}>No pending pre-bookings scheduled today.</div>
            )}
          </div>

          {/* Overdue Subscription Dues Widget */}
          <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '16px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#9f1239', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} color="#e11d48" /> Overdue Dues ({overdueList.length})
              </div>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px' }}>
                DUE NOW
              </span>
            </div>

            {overdueList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {overdueList.slice(0, 3).map(b => (
                  <div key={b.id} style={{ background: 'white', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fecdd3' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px', color: '#0f172a' }}>
                      <span>{b.user_name} ({b.vehicle_id || 'EV'})</span>
                      <span style={{ color: '#dc2626' }}>₹{b.calculated_due}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#881337', marginTop: '2px' }}>
                      Overdue by {b.overdue_days || 1} days | Mode: {b.payment_mode || 'Cash'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: '#9f1239', fontStyle: 'italic', padding: '10px 0' }}>All subscription dues are clear!</div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', height: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#0f172a' }}>Revenue Overview</h3>
          <div style={{ flex: 1, border: '2px dashed #e2e8f0', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <p style={{ color: '#94a3b8', fontWeight: '500' }}>Live Financial Chart Active</p>
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
