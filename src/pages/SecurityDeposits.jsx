import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Search, ShieldAlert, CheckCircle2, History, MinusCircle, PlusCircle, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function SecurityDeposits() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/security-deposits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
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

  const handleAction = async (type) => {
    if (!amount || isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    try {
      const endpoint = type === 'deduct' ? '/api/security-deposits/deduct' : '/api/security-deposits/add';
      await axios.post(`${API_URL}${endpoint}`, {
        user_id: selectedUser.id,
        amount: parseFloat(amount),
        remarks: remarks || (type === 'deduct' ? 'Admin Deduction' : 'Admin Deposit')
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Successfully ${type === 'deduct' ? 'deducted' : 'added'} ₹${amount}`);
      setShowDeductModal(false);
      setShowAddModal(false);
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

  const openHistoryModal = (user) => {
    setSelectedUser(user);
    fetchHistory(user.id);
    setShowHistoryModal(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone.includes(searchTerm)
  );

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0' }}>Security Deposits</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Manage user security deposit balances, deductions, and refunds.</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '12px' }} />
            <input 
              type="text" 
              placeholder="Search by name or phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 48px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: '600', fontSize: '14px' }}>USER</th>
                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: '600', fontSize: '14px' }}>CONTACT</th>
                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b', fontWeight: '600', fontSize: '14px' }}>DEPOSIT BALANCE</th>
                <th style={{ textAlign: 'right', padding: '16px', color: '#64748b', fontWeight: '600', fontSize: '14px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '20px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#3b82f6' }}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>ID: USR-{user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>
                    <div>{user.phone}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: 'bold', color: parseFloat(user.security_deposit_balance) > 0 ? '#059669' : '#94a3b8', fontSize: '16px' }}>
                      ₹{parseFloat(user.security_deposit_balance).toFixed(2)}
                    </div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button onClick={() => openAddModal(user)} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PlusCircle size={16} /> Add
                      </button>
                      <button onClick={() => openDeductModal(user)} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#fef2f2', color: '#dc2626', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }} disabled={parseFloat(user.security_deposit_balance) <= 0}>
                        <MinusCircle size={16} /> Deduct
                      </button>
                      <button onClick={() => openHistoryModal(user)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#475569', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={16} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal (Add/Deduct) */}
      {(showDeductModal || showAddModal) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {showDeductModal ? <MinusCircle color="#dc2626" /> : <PlusCircle color="#059669" />}
                {showDeductModal ? 'Deduct Security Deposit' : 'Add Security Deposit'}
              </h2>
              <button onClick={() => { setShowDeductModal(false); setShowAddModal(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 16px 0', color: '#475569' }}>
                Processing for <strong>{selectedUser?.name}</strong>.<br/>
                Current Balance: <strong>₹{selectedUser?.security_deposit_balance}</strong>
              </p>
              
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Amount (₹)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 500" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }} />
              
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Remarks / Reason</label>
              <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Broken mirror deduction" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
            </div>

            <button onClick={() => handleAction(showDeductModal ? 'deduct' : 'add')} style={{ width: '100%', padding: '14px', borderRadius: '8px', border: 'none', backgroundColor: showDeductModal ? '#dc2626' : '#059669', color: 'white', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
              Confirm {showDeductModal ? 'Deduction' : 'Deposit'}
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History color="#3b82f6" />
                Deposit History: {selectedUser?.name}
              </h2>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            {history.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No transactions found for this user.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {history.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '8px', backgroundColor: '#f8fafc', borderLeft: `4px solid ${item.type === 'deposit' ? '#059669' : '#dc2626'}` }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{item.remarks}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(item.date).toLocaleString()}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px', color: item.type === 'deposit' ? '#059669' : '#dc2626' }}>
                      {item.type === 'deposit' ? '+' : '-'}₹{item.amount}
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
