import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, RefreshCw, Wallet, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function WalletApprovals() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching wallet approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'success' } : req));
      alert(`Wallet Recharge #${id} Approved!`);
    } catch (error) {
      alert('Error approving request: ' + (error.response?.data?.error || error.message));
    }
  };

  const rejectRequest = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
      alert(`Wallet Recharge #${id} Rejected.`);
    } catch (error) {
      alert('Error rejecting request: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Wallet Approvals</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Review and approve driver UPI/cash wallet recharge requests.</p>
        </div>
        <button 
          onClick={fetchRequests}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Req ID</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>User</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>UTR / Ref</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '14px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '16px 18px', fontFamily: 'monospace', color: '#64748b', fontSize: '13px' }}>#{req.id}</td>
                <td style={{ padding: '16px 18px' }}>
                  <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.user || 'Driver'}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{req.phone || 'N/A'}</div>
                </td>
                <td style={{ padding: '16px 18px', fontFamily: 'monospace', color: '#0284c7', fontSize: '13px' }}>{req.utr || 'N/A'}</td>
                <td style={{ padding: '16px 18px', fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>₹{parseFloat(req.amount).toLocaleString('en-IN')}</td>
                <td style={{ padding: '16px 18px' }}>
                  {req.status === 'pending' && <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13}/> PENDING</span>}
                  {req.status === 'success' && <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13}/> APPROVED</span>}
                  {req.status === 'rejected' && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={13}/> REJECTED</span>}
                </td>
                <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        onClick={() => approveRequest(req.id)}
                        style={{ background: '#00a66c', color: 'white', padding: '7px 14px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                        Approve
                      </button>
                      <button 
                        onClick={() => rejectRequest(req.id)}
                        style={{ background: '#fee2e2', color: '#dc2626', padding: '7px 14px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Completed</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && !loading && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <Wallet size={36} color="#94a3b8" style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No Wallet Requests Found</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>New wallet recharge requests from drivers will appear here.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
