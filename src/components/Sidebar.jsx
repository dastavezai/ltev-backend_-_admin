import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, Wallet, ReceiptText, LogOut, Bike, FileText, Map, Tag, ClipboardList, ShieldAlert, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Updates Inbox', path: '/updates', icon: <Bell size={20} /> },
    { name: 'Vehicles', path: '/vehicles', icon: <Bike size={20} /> },
    { name: 'Stands', path: '/stands', icon: <Map size={20} /> },
    { name: 'Rentals', path: '/rentals', icon: <FileText size={20} /> },
    { name: 'Rental Requests', path: '/rental-requests', icon: <ClipboardList size={20} /> },
    { name: 'Users', path: '/users', icon: <Users size={20} /> },
    { name: 'Account Approvals', path: '/account-approvals', icon: <ShieldCheck size={20} /> },
    { name: 'Wallet Approvals', path: '/wallet-approvals', icon: <Wallet size={20} /> },
    { name: 'Security Deposits', path: '/security-deposits', icon: <ShieldAlert size={20} /> },
    { name: 'Transactions', path: '/transactions', icon: <ReceiptText size={20} /> },
    { name: 'Subscription Plans', path: '/plans', icon: <Tag size={20} /> },
  ];

  return (
    <div style={{ width: '280px', background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '32px 24px', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.1)', zIndex: 10 }}>
      <div style={{ padding: '0 12px', marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(56, 189, 248, 0.4)' }}>
          <span style={{ fontWeight: 'bold', fontSize: '20px', color: 'white' }}>L</span>
        </div>
        <h2 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>
          <span style={{ color: 'white' }}>Local</span><span style={{ color: '#38bdf8' }}>toto</span>
        </h2>
      </div>
      
      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto', paddingRight: '4px', margin: '0 -4px 0 0' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', paddingLeft: '12px', flexShrink: 0 }}>Menu</div>
        {navItems.map((item) => {
          const isActive = location.pathname.includes(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: isActive ? 'white' : '#94a3b8',
                textDecoration: 'none',
                padding: '14px 16px',
                background: isActive ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.15) 0%, transparent 100%)' : 'transparent',
                borderRadius: '12px',
                fontWeight: isActive ? '600' : '500',
                transition: 'all 0.2s ease',
                borderLeft: isActive ? '4px solid #38bdf8' : '4px solid transparent',
              }}
              onMouseEnter={(e) => {
                if(!isActive) {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if(!isActive) {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <div style={{ color: isActive ? '#38bdf8' : 'inherit', transition: 'color 0.2s' }}>{item.icon}</div>
              <span style={{ fontSize: '15px' }}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
        onClick={logout}
        style={{
          display: 'flex', alignItems: 'center', gap: '14px', width: '100%', 
          padding: '14px 16px', background: 'transparent', border: 'none', 
          color: '#f87171', fontWeight: '600', cursor: 'pointer', borderRadius: '12px', transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={20} />
          <span style={{ fontSize: '15px' }}>Logout Account</span>
        </button>
      </div>
    </div>
  );
}
