import { useState, useEffect } from 'react';
import { CheckCircle2, Clock, XCircle, RefreshCw, Wallet, ArrowRight, CreditCard, ShieldAlert, Tag, Search } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function WalletApprovals() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'plan' | 'recharge' | 'refund' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');

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

  const approveRequest = async (id, purpose) => {
    if (!window.confirm(`Are you sure you want to approve this payment request #${id}?`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'success' } : req));
      alert(`Payment Request #${id} Approved Successfully!`);
      fetchRequests();
    } catch (error) {
      alert('Error approving request: ' + (error.response?.data?.error || error.message));
    }
  };

  const rejectRequest = async (id) => {
    if (!window.confirm(`Are you sure you want to reject payment request #${id}?`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
      alert(`Payment Request #${id} Rejected.`);
      fetchRequests();
    } catch (error) {
      alert('Error rejecting request: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredRequests = requests.filter(req => {
    const utrStr = (req.utr || '').toUpperCase();
    const isPlan = utrStr.includes('PLAN_BOOKING') || utrStr.includes('PLAN_PAYMENT');
    const isRefund = utrStr.includes('DEPOSIT_REFUND') || utrStr.includes('REFUND');
    const isRecharge = !isPlan && !isRefund;

    const matchesSearch = 
      (req.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.phone || '').includes(searchQuery) ||
      (req.utr || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(req.id).includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterType === 'plan') return isPlan;
    if (filterType === 'recharge') return isRecharge;
    if (filterType === 'refund') return isRefund;
    if (filterType === 'pending') return req.status === 'pending';

    return true;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Payment & Wallet Approvals</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Review and verify driver plan booking payments, wallet topups, and security deposit refund requests.</p>
        </div>
        <button 
          onClick={fetchRequests}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Search & Filter Tabs */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', minWidth: '300px', flex: 1 }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by driver name, phone, or reference UTR..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${requests.length})` },
            { id: 'pending', label: `Pending (${requests.filter(r => r.status === 'pending').length})` },
            { id: 'plan', label: 'Plan Payments' },
            { id: 'recharge', label: 'Wallet Topups' },
            { id: 'refund', label: 'Deposit Refunds' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                background: filterType === tab.id ? '#0f172a' : '#f1f5f9',
                color: filterType === tab.id ? '#ffffff' : '#64748b',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Req ID</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Driver Details</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Payment Type & Reference</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Amount</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '14px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map(req => {
              const utrStr = (req.utr || '').toUpperCase();
              const isPlan = utrStr.includes('PLAN_BOOKING') || utrStr.includes('PLAN_PAYMENT');
              const isRefund = utrStr.includes('DEPOSIT_REFUND') || utrStr.includes('REFUND');
              const isRecharge = !isPlan && !isRefund;

              return (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 18px', fontFamily: 'monospace', color: '#64748b', fontSize: '13px', fontWeight: '700' }}>#{req.id}</td>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.user || 'Anonymous Rider'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {req.phone || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    {isPlan && (
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>
                          <Tag size={12} /> PLAN BOOKING PAYMENT
                        </span>
                        <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{req.utr}</div>
                      </div>
                    )}

                    {isRefund && (
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>
                          <ShieldAlert size={12} /> SECURITY DEPOSIT REFUND
                        </span>
                        <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{req.utr}</div>
                      </div>
                    )}

                    {isRecharge && (
                      <div>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>
                          <Wallet size={12} /> WALLET TOPUP
                        </span>
                        <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>Ref: {req.utr || 'N/A'}</div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 18px', fontWeight: '800', color: '#00a66c', fontSize: '16px' }}>₹{parseFloat(req.amount).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '16px 18px' }}>
                    {req.status === 'pending' && <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13}/> PENDING</span>}
                    {req.status === 'success' && <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13}/> APPROVED</span>}
                    {req.status === 'rejected' && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={13}/> REJECTED</span>}
                  </td>
                  <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                    {req.status === 'pending' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => approveRequest(req.id, isPlan ? 'plan' : isRefund ? 'refund' : 'recharge')}
                          style={{ background: '#00a66c', color: 'white', padding: '7px 14px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                          ✓ Approve Payment
                        </button>
                        <button 
                          onClick={() => rejectRequest(req.id)}
                          style={{ background: '#fee2e2', color: '#dc2626', padding: '7px 14px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Verified</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredRequests.length === 0 && !loading && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <Wallet size={36} color="#94a3b8" style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No Payment Requests Found</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>When riders pay for plans or recharge their wallets, approvals will appear here.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
