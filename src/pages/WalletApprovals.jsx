import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import axios from 'axios';

export default function WalletApprovals() {
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet_approvals`);
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Error fetching wallet approvals:', error);
    }
  };

  const approveRequest = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet_approvals/${id}/approve`);
      setPendingRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'success' } : req));
      alert(`Transaction ${id} Approved!`);
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const rejectRequest = async (id) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/wallet_approvals/${id}/reject`);
      setPendingRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Wallet Recharges (Manual Approval)</h1>
      
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px' }}>Transaction ID</th>
              <th style={{ padding: '12px' }}>User</th>
              <th style={{ padding: '12px' }}>UTR Number</th>
              <th style={{ padding: '12px' }}>Amount</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingRequests.map(req => (
              <tr key={req.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px' }}>{req.id}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 500 }}>{req.user}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{req.phone}</div>
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>{req.utr}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>₹{req.amount}</td>
                <td style={{ padding: '12px' }}>
                  {req.status === 'pending' && <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={14}/> Pending</span>}
                  {req.status === 'success' && <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={14}/> Approved</span>}
                  {req.status === 'rejected' && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '9999px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={14}/> Rejected</span>}
                </td>
                <td style={{ padding: '12px' }}>
                  {req.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => approveRequest(req.id)}
                        style={{ background: '#10b981', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                        Approve
                      </button>
                      <button 
                        onClick={() => rejectRequest(req.id)}
                        style={{ background: '#ef4444', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {pendingRequests.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No pending requests</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
