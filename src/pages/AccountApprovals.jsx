import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AccountApprovals() {
  const { token } = useAuth();
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    if (token) {
      fetchApplications();
    }
  }, [token]);

  const fetchApplications = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/account_approvals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching account approvals:', error);
    }
  };

  const approveApp = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/account_approvals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(applications.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    } catch (error) {
      console.error('Error approving app:', error);
    }
  };

  const rejectApp = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/account_approvals/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(applications.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
    } catch (error) {
      console.error('Error rejecting app:', error);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '24px', color: '#0f172a' }}>Account Approvals</h1>

      <div style={{ display: 'grid', gap: '20px' }}>
        {applications.map(app => (
          <div key={app.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0369a1', fontWeight: 'bold', fontSize: '20px' }}>
                {app.user.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{app.user}</h3>
                <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '8px' }}>{app.phone} • Applied {app.date}</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {app.docs.map(doc => (
                    <span key={doc} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', background: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px' }}>
                      <FileText size={12} /> {doc}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              {app.status === 'pending' ? (
                <>
                  <button onClick={() => rejectApp(app.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#dc2626', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                    <XCircle size={18} /> Reject
                  </button>
                  <button onClick={() => approveApp(app.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                    <CheckCircle size={18} /> Approve
                  </button>
                </>
              ) : (
                <span style={{ 
                  background: app.status === 'approved' ? '#d1fae5' : '#fee2e2', 
                  color: app.status === 'approved' ? '#059669' : '#dc2626',
                  padding: '8px 16px', borderRadius: '8px', fontWeight: '600'
                }}>
                  {app.status.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        ))}
        {applications.length === 0 && <p>No pending approvals.</p>}
      </div>
    </div>
  );
}
