import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, ShieldAlert, CheckCircle2, History, MinusCircle, PlusCircle, X, Settings, ShieldCheck, DollarSign, Edit3, ArrowRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SecurityDeposits() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [minDeposit, setMinDeposit] = useState(2000);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSetModal, setShowSetModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [configAmount, setConfigAmount] = useState('2000');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (token) {
      fetchConfig();
      fetchUsers();
    }
  }, [token]);

  const fetchConfig = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/security-deposits/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.min_security_deposit) {
        setMinDeposit(res.data.min_security_deposit);
        setConfigAmount(res.data.min_security_deposit.toString());
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/security-deposits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        setUsers(res.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async (userId) => {
    try {
      const res = await axios.get(`${API_URL}/api/security-deposits/${userId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    const val = parseFloat(configAmount);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid amount');
      return;
    }
    try {
      await axios.put(`${API_URL}/api/security-deposits/config`, {
        min_security_deposit: val
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMinDeposit(val);
      setShowConfigModal(false);
      fetchUsers();
      alert(`Minimum security deposit set to ₹${val}`);
    } catch (error) {
      alert('Failed to update config');
    }
  };

  const handleAction = async (type) => {
    if (!amount || isNaN(amount) || parseFloat(amount) < 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    try {
      let endpoint = '/api/security-deposits/add';
      if (type === 'deduct') endpoint = '/api/security-deposits/deduct';
      if (type === 'set') endpoint = '/api/security-deposits/set';

      await axios.post(`${API_URL}${endpoint}`, {
        user_id: selectedUser.id,
        amount: parseFloat(amount),
        remarks: remarks || (type === 'set' ? `Admin set deposit to ₹${amount}` : type === 'deduct' ? 'Admin Deduction' : 'Admin Deposit Addition')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Successfully processed for ${selectedUser.name}!`);
      setShowDeductModal(false);
      setShowAddModal(false);
      setShowSetModal(false);
      setAmount('');
      setRemarks('');
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || `Error processing ${type}`);
    }
  };

  const openDeductModal = (user) => {
    setSelectedUser(user);
    setAmount('');
    setRemarks('');
    setShowDeductModal(true);
  };

  const openAddModal = (user) => {
    setSelectedUser(user);
    setAmount('');
    setRemarks('');
    setShowAddModal(true);
  };

  const openSetModal = (user) => {
    setSelectedUser(user);
    setAmount(user.security_deposit_balance ? user.security_deposit_balance.toString() : '2000');
    setRemarks('Security deposit verified & updated');
    setShowSetModal(true);
  };

  const openHistoryModal = (user) => {
    setSelectedUser(user);
    fetchHistory(user.id);
    setShowHistoryModal(true);
  };

  const totalDeposits = users.reduce((sum, u) => sum + parseFloat(u.security_deposit_balance || 0), 0);
  const paidCount = users.filter(u => u.security_deposit_paid || parseFloat(u.security_deposit_balance || 0) >= minDeposit).length;

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.phone || '').includes(searchTerm)
  );

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Security Money Management</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Track user security deposits, set thresholds, and manage balances for EV rentals.</p>
        </div>
        <button 
          onClick={() => { setConfigAmount(minDeposit.toString()); setShowConfigModal(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', color: '#0f172a', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
        >
          <Settings size={18} color="#00a66c" /> Manage Minimum Deposit (₹{minDeposit})
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div style={{ background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Min. Security Required</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0, 166, 108, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} color="#00a66c" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>₹{minDeposit.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Users with ≥ ₹{minDeposit} skip deposit on future bookings</div>
        </div>

        <div style={{ background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Deposit Money Held</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(29, 122, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} color="#1d7afc" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#00a66c' }}>₹{totalDeposits.toLocaleString('en-IN')}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Secured in company escrow wallet</div>
        </div>

        <div style={{ background: 'white', padding: '20px 24px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Eligible / Fully Paid Users</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#8b5cf6" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>{paidCount} / {users.length}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Active drivers with valid deposit status</div>
        </div>
      </div>

      {/* Main Table */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '14px' }} />
            <input 
              type="text" 
              placeholder="Search user by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 46px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#fafafa', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>User</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Contact</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Deposit Balance</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Rental Eligibility</th>
                <th style={{ padding: '14px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => {
                const bal = parseFloat(u.security_deposit_balance || 0);
                const isPaid = u.security_deposit_paid || bal >= minDeposit;

                return (
                  <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '19px', backgroundColor: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#0284c7' }}>
                          {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a' }}>{u.name || 'Unnamed'}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>ID: USR-{u.id}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '16px 18px', color: '#475569' }}>
                      <div style={{ fontWeight: '600' }}>{u.phone}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{u.email || 'No email'}</div>
                    </td>

                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: '800', color: bal >= minDeposit ? '#00a66c' : bal > 0 ? '#d97706' : '#64748b', fontSize: '16px' }}>
                        ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Req: ₹{minDeposit}</div>
                    </td>

                    <td style={{ padding: '16px 18px' }}>
                      {isPaid ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(0, 166, 108, 0.12)', color: '#00a66c', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                          ● DEPOSIT PAID
                        </span>
                      ) : bal > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                          ● SHORT (₹{minDeposit - bal} DUE)
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                          ● UNPAID
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button onClick={() => openSetModal(u)} style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Edit3 size={14} color="#1d7afc" /> Set Amount
                        </button>
                        <button onClick={() => openAddModal(u)} style={{ padding: '7px 11px', borderRadius: '8px', border: 'none', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <PlusCircle size={14} /> Add
                        </button>
                        <button onClick={() => openDeductModal(u)} style={{ padding: '7px 11px', borderRadius: '8px', border: 'none', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MinusCircle size={14} /> Deduct
                        </button>
                        <button onClick={() => openHistoryModal(u)} style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <History size={14} /> History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No user records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Config Minimum Deposit Modal */}
      {showConfigModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Settings size={20} color="#00a66c" /> Minimum Security Deposit
              </h2>
              <button onClick={() => setShowConfigModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '13px' }}>
              Set the required security deposit amount for users. When users have this balance or higher, their plans will display <strong>Deposit Paid</strong> and they will not be charged again on future rentals.
            </p>

            <form onSubmit={handleUpdateConfig}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Minimum Deposit Amount (₹)</label>
              <input 
                type="number" 
                value={configAmount} 
                onChange={e => setConfigAmount(e.target.value)} 
                placeholder="2000" 
                required 
                style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '16px', fontWeight: '700' }} 
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowConfigModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#00a66c', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Save Settings</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Amount Modal */}
      {showSetModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#1d7afc" /> Set Deposit Balance
              </h2>
              <button onClick={() => setShowSetModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '13px' }}>
              Directly set deposit balance for <strong>{selectedUser?.name}</strong> ({selectedUser?.phone}).<br/>
              Current Balance: <strong>₹{selectedUser?.security_deposit_balance}</strong>
            </p>

            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Target Deposit Balance (₹)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="e.g. 2000" 
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px', fontSize: '16px', fontWeight: '700' }} 
            />

            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Remarks / Reason</label>
            <input 
              type="text" 
              value={remarks} 
              onChange={e => setRemarks(e.target.value)} 
              placeholder="e.g. Initial security deposit paid in cash" 
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '14px' }} 
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => setShowSetModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleAction('set')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: '#1d7afc', color: 'white', fontWeight: '700', cursor: 'pointer' }}>Set Balance</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Deduct Modal */}
      {(showDeductModal || showAddModal) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {showDeductModal ? <MinusCircle size={20} color="#dc2626" /> : <PlusCircle size={20} color="#059669" />}
                {showDeductModal ? 'Deduct Security Deposit' : 'Add Security Deposit'}
              </h2>
              <button onClick={() => { setShowDeductModal(false); setShowAddModal(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            
            <p style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '13px' }}>
              Processing for <strong>{selectedUser?.name}</strong>.<br/>
              Current Balance: <strong>₹{selectedUser?.security_deposit_balance}</strong>
            </p>
            
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Amount (₹)</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              placeholder="e.g. 500" 
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '14px', fontSize: '16px', fontWeight: '700' }} 
            />
            
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Remarks / Reason</label>
            <input 
              type="text" 
              value={remarks} 
              onChange={e => setRemarks(e.target.value)} 
              placeholder={showDeductModal ? 'e.g. Scooter mirror damage deduction' : 'e.g. Security deposit top-up'} 
              style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', marginBottom: '20px', fontSize: '14px' }} 
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" onClick={() => { setShowDeductModal(false); setShowAddModal(false); }} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#64748b', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleAction(showDeductModal ? 'deduct' : 'add')} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: showDeductModal ? '#dc2626' : '#059669', color: 'white', fontWeight: '700', cursor: 'pointer' }}>
                Confirm {showDeductModal ? 'Deduction' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '580px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={20} color="#1d7afc" />
                Deposit History: {selectedUser?.name}
              </h2>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#64748b" /></button>
            </div>
            
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No deposit transactions found for this user.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {history.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '10px', backgroundColor: '#f8fafc', borderLeft: `4px solid ${item.type === 'deposit' ? '#059669' : '#dc2626'}` }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{item.remarks || 'Deposit Adjustment'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{new Date(item.date).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '16px', color: item.type === 'deposit' ? '#059669' : '#dc2626' }}>
                      {item.type === 'deposit' ? '+' : '-'}₹{parseFloat(item.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
