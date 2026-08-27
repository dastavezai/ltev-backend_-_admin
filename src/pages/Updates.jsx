import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Bell, CheckCircle2, ShieldCheck, Wallet, Bike, XCircle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Updates() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/updates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpdates(res.data);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReturn = async (id) => {
    try {
      await axios.post(`${API_URL}/api/rentals/${id}/approve-return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Return Approved successfully!');
      fetchUpdates();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve return');
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'return': return <Bike size={24} color="#3b82f6" />;
      case 'kyc': return <ShieldCheck size={24} color="#8b5cf6" />;
      case 'wallet': return <Wallet size={24} color="#10b981" />;
      default: return <Bell size={24} color="#64748b" />;
    }
  };

  const getIconBg = (type) => {
    switch(type) {
      case 'return': return '#dbeafe';
      case 'kyc': return '#ede9fe';
      case 'wallet': return '#d1fae5';
      default: return '#f1f5f9';
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Bell color="#0f172a" /> Updates & Inbox
        </h1>
        <p style={{ color: '#64748b', margin: 0 }}>Review all pending user requests, approvals, and system notifications in chronological order.</p>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading updates...</p>
      ) : updates.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 8px 0' }}>All caught up!</h3>
          <p style={{ color: '#64748b', margin: 0 }}>There are no pending approvals or new updates.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {updates.map((update, index) => (
            <div key={`${update.type}-${update.id}-${index}`} style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: getIconBg(update.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {getIcon(update.type)}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>{update.title}</h3>
                  <p style={{ color: '#475569', margin: '0 0 8px 0', fontSize: '15px' }}>{update.description}</p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                      {new Date(update.date).toLocaleString()}
                    </span>
                    <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {update.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ flexShrink: 0, marginLeft: '24px' }}>
                {update.type === 'return' && update.status === 'pending_return' && (
                  <button onClick={() => handleApproveReturn(update.id)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} /> Approve Return
                  </button>
                )}
                
                {update.type === 'kyc' && update.status === 'pending' && (
                  <button onClick={() => navigate('/account-approvals')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Review KYC <ArrowRight size={18} />
                  </button>
                )}
                
                {update.type === 'wallet' && update.status === 'pending' && (
                  <button onClick={() => navigate('/wallet-approvals')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Review Payment <ArrowRight size={18} />
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
