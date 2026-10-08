import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bike } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [targetPortal, setTargetPortal] = useState('management'); // 'management' | 'admin'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result && result.success) {
      if (result.role === 'manager' || targetPortal === 'management') {
        navigate('/management');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result?.error || 'Invalid username or password');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'Inter, system-ui, -apple-system, sans-serif', padding: '16px' }}>
      <div style={{ background: '#ffffff', padding: '36px 32px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '380px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
            <Bike size={22} color="white" />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            LocalToto EV
          </h2>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Management & Operations Portal
          </p>
        </div>

        {/* Portal selector */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={() => setTargetPortal('management')}
            style={{
              flex: 1,
              padding: '7px',
              borderRadius: '6px',
              border: 'none',
              background: targetPortal === 'management' ? '#ffffff' : 'transparent',
              color: targetPortal === 'management' ? '#0f172a' : '#64748b',
              fontWeight: targetPortal === 'management' ? '600' : '500',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: targetPortal === 'management' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Management Portal
          </button>
          <button
            type="button"
            onClick={() => setTargetPortal('admin')}
            style={{
              flex: 1,
              padding: '7px',
              borderRadius: '6px',
              border: 'none',
              background: targetPortal === 'admin' ? '#ffffff' : 'transparent',
              color: targetPortal === 'admin' ? '#0f172a' : '#64748b',
              fontWeight: targetPortal === 'admin' ? '600' : '500',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: targetPortal === 'admin' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            Admin Panel
          </button>
        </div>

        {error && (
          <div style={{ color: '#dc2626', background: '#fee2e2', padding: '10px 12px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500', color: '#475569' }}>
              Username
            </label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              required 
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: '500', color: '#475569' }}>
              Password
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '10px', 
              background: '#0284c7', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: '600', 
              fontSize: '13px', 
              cursor: 'pointer'
            }}
          >
            {loading ? 'Logging in...' : (targetPortal === 'management' ? 'Open Management Portal' : 'Login to Admin Panel')}
          </button>
        </form>

        <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
          admin / admin123 • manager / manager123
        </div>

      </div>
    </div>
  );
}
