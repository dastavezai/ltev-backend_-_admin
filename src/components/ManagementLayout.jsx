import { useNavigate } from 'react-router-dom';
import { LogOut, ArrowUpRight, Bike } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ManagementLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = user?.role || localStorage.getItem('role') || 'admin';
  const username = user?.username || localStorage.getItem('username') || 'Operator';

  return (
    <div className="mgmt-layout-container">
      {/* Top Navbar */}
      <header className="mgmt-header">
        {/* Left: Brand & Portal Name & Station Operations Desk */}
        <div className="mgmt-header-left">
          <div 
            onClick={() => navigate('/management')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          >
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bike size={16} color="white" />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.3px' }}>
              LocalToto
            </div>
          </div>

          <div className="mgmt-header-divider" />

          <div style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1', background: '#e0f2fe', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
            Station Operations Desk
          </div>

          <div className="mgmt-header-divider" />

          <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
            Station: <strong style={{ color: '#0f172a' }}>Rukanpura Main Stand</strong>
          </div>
        </div>

        {/* Right: Actions, Role & User */}
        <div className="mgmt-header-right">
          {role === 'admin' && (
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <span>Admin Panel</span>
              <ArrowUpRight size={13} />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px' }}>
              {role}
            </span>
            <span style={{ fontWeight: '600', color: '#1e293b' }}>{username}</span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container - Full Width */}
      <main className="mgmt-main">
        {children}
      </main>
    </div>
  );
}
