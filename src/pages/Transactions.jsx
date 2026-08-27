import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Filter, Download, Plus, X } from 'lucide-react';
import axios from 'axios';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  
  const [cashForm, setCashForm] = useState({ user_id: '', amount: '', reference: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/transactions`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchUsers();
  }, []);

  const handleCashSubmit = async (e) => {
    e.preventDefault();
    if (!cashForm.user_id || !cashForm.amount) return alert('User and Amount are required.');
    
    setIsSubmitting(true);
    try {
      // Parse user ID - removing USR- prefix if it exists in the fetched ID string
      const uid = cashForm.user_id.replace('USR-', '');
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/transactions/cash`, {
        user_id: parseInt(uid),
        amount: parseFloat(cashForm.amount),
        reference: cashForm.reference
      });
      setIsCashModalOpen(false);
      setCashForm({ user_id: '', amount: '', reference: '' });
      fetchTransactions(); // refresh list
    } catch (error) {
      alert('Error processing payment: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>Platform Transactions</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setIsCashModalOpen(true)}
            className="hover-lift"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
          >
            <Plus size={18} /> Log Cash Payment
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '500', cursor: 'pointer' }}>
            <Filter size={16} /> Filter
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '500', cursor: 'pointer' }}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Transaction ID</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>User</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Details</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Date & Time</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(txn => (
              <tr key={txn.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '20px 24px', fontFamily: 'monospace', color: '#64748b', fontSize: '13px' }}>{txn.id}</td>
                <td style={{ padding: '20px 24px', fontWeight: '700', color: '#0f172a' }}>{txn.user}</td>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: txn.type === 'credit' ? '#d1fae5' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: txn.type === 'credit' ? '#059669' : '#dc2626' }}>
                      {txn.type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>{txn.desc}</div>
                      <div style={{ fontSize: '13px', color: '#94a3b8', textTransform: 'capitalize', fontWeight: '500' }}>{txn.type}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px 24px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                  {txn.date} <span style={{ color: '#94a3b8', marginLeft: '6px' }}>{txn.time}</span>
                </td>
                <td style={{ padding: '20px 24px', textAlign: 'right', fontWeight: '800', fontSize: '18px', color: txn.type === 'credit' ? '#059669' : '#0f172a' }}>
                  {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cash Payment Modal */}
      {isCashModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: 'white', padding: '32px', borderRadius: '24px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Log Cash Payment</h2>
              <button onClick={() => setIsCashModalOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleCashSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Select User</label>
                <select 
                  required
                  value={cashForm.user_id}
                  onChange={(e) => setCashForm({...cashForm, user_id: e.target.value})}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none', background: 'white' }}
                >
                  <option value="">-- Choose a user --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Cash Amount (₹)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  step="0.01"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({...cashForm, amount: e.target.value})}
                  placeholder="Enter amount collected"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Reference / Receipt No. (Optional)</label>
                <input 
                  type="text" 
                  value={cashForm.reference}
                  onChange={(e) => setCashForm({...cashForm, reference: e.target.value})}
                  placeholder="e.g. RCPT-1024"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '15px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsCashModalOpen(false)} style={{ flex: 1, padding: '12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
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
