import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Filter, Download, Plus, X, RefreshCw, ReceiptText } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Transactions() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [cashForm, setCashForm] = useState({ user_id: '', amount: '', reference: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTransactions();
      fetchUsers();
    }
  }, [token]);

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    if (!cashForm.user_id || !cashForm.amount) return alert('User and Amount are required.');
    
    setIsSubmitting(true);
    try {
      const uid = cashForm.user_id.replace('USR-', '');
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/transactions/cash`, {
        user_id: parseInt(uid),
        amount: parseFloat(cashForm.amount),
        reference: cashForm.reference
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsCashModalOpen(false);
      setCashForm({ user_id: '', amount: '', reference: '' });
      fetchTransactions();
    } catch (error) {
      alert('Error processing payment: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Platform Transactions</h1>
          <p style={{ color: '#64748b', margin: 0 }}>View all platform bookings, cash deposits, and rental payments.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={fetchTransactions}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button 
            onClick={() => setIsCashModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#00a66c', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 166, 108, 0.2)' }}
          >
            <Plus size={18} /> Log Cash Payment
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Transaction ID</th>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>User</th>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Details</th>
              <th style={{ padding: '16px 20px', fontWeight: '600' }}>Date & Time</th>
              <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(txn => (
              <tr key={txn.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                <td style={{ padding: '18px 20px', fontFamily: 'monospace', color: '#64748b', fontSize: '13px' }}>{txn.id}</td>
                <td style={{ padding: '18px 20px', fontWeight: '700', color: '#0f172a' }}>{txn.user}</td>
                <td style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '18px', background: txn.type === 'credit' ? 'rgba(0, 166, 108, 0.12)' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: txn.type === 'credit' ? '#00a66c' : '#dc2626' }}>
                      {txn.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>{txn.desc || 'Payment Transaction'}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'capitalize', fontWeight: '500' }}>{txn.type}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '18px 20px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                  {txn.date} <span style={{ color: '#94a3b8', marginLeft: '6px' }}>{txn.time}</span>
                </td>
                <td style={{ padding: '18px 20px', textAlign: 'right', fontWeight: '800', fontSize: '16px', color: txn.type === 'credit' ? '#00a66c' : '#0f172a' }}>
                  {txn.type === 'credit' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                  <ReceiptText size={40} color="#94a3b8" style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div style={{ fontWeight: '700', fontSize: '16px', color: '#0f172a' }}>No Transactions Found</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>All booking and deposit transactions will appear here.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cash Payment Modal */}
      {isCashModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '28px', borderRadius: '20px', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Log Cash Payment</h2>
              <button onClick={() => setIsCashModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Select User</label>
                <select 
                  required
                  value={cashForm.user_id}
                  onChange={(e) => setCashForm({...cashForm, user_id: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: 'white' }}
                >
                  <option value="">-- Choose a user --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Cash Amount (₹)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="0.01"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({...cashForm, amount: e.target.value})}
                  placeholder="Enter amount collected"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Reference / Receipt No. (Optional)</label>
                <input 
                  type="text" 
                  value={cashForm.reference}
                  onChange={(e) => setCashForm({...cashForm, reference: e.target.value})}
                  placeholder="e.g. RCPT-1024"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsCashModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', background: '#00a66c', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
