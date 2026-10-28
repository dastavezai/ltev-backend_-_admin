import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { 
  Search, ShieldAlert, CheckCircle2, History, MinusCircle, PlusCircle, X, 
  Settings, ShieldCheck, DollarSign, Edit3, ArrowRight, FileText, Clock, 
  RefreshCw, AlertCircle, ExternalLink, Bike, Shield
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';
import { openNOCInvoice } from '../utils/invoice';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SecurityDeposits() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [minDeposit, setMinDeposit] = useState(2000);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Tabs: 'balances' | 'noc_refunds'
  const [activeTab, setActiveTab] = useState('balances');
  const [nocList, setNocList] = useState([]);
  const [nocLoading, setNocLoading] = useState(false);
  const [nocFilter, setNocFilter] = useState('all'); // 'all' | 'under_cooling' | 'due_for_refund' | 'refund_processed'

  // Process Refund Modal
  const [processRefundModal, setProcessRefundModal] = useState({ open: false, noc: null });
  const [refundForm, setRefundForm] = useState({ payment_mode: 'upi', txn_id: '', remarks: '' });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSetModal, setShowSetModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);
  
  const [configAmount, setConfigAmount] = useState('2000');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (token) {
      fetchConfig();
      fetchUsers();
      fetchNocList();
    }
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'noc_refunds') {
      fetchNocList();
    }
  }, [token, activeTab, nocFilter, searchTerm]);

  const fetchNocList = async () => {
    if (!token) return;
    setNocLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/noc/list?status=${nocFilter}&search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNocList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching NOC list:', err);
    } finally {
      setNocLoading(false);
    }
  };

  const handleOpenProcessRefund = (noc) => {
    setRefundForm({
      payment_mode: noc.payout_mode || 'upi',
      txn_id: '',
      remarks: '30-45 Days Security Deposit Refund Settled'
    });
    setProcessRefundModal({ open: true, noc });
  };

  const handleProcessRefundSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!processRefundModal.noc) return;
    
    if (!window.confirm(`Confirm payment of ₹${processRefundModal.noc.net_refundable_amount} refund to ${processRefundModal.noc.user_name}?\nThis will mark the refund settled in the system.`)) {
      return;
    }

    setSubmittingRefund(true);
    try {
      await axios.put(`${API_URL}/api/noc/${processRefundModal.noc.id}/process-refund`, {
        refund_payment_mode: refundForm.payment_mode,
        refund_txn_id: refundForm.txn_id,
        refund_remarks: refundForm.remarks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Security deposit refund successfully processed!');
      setProcessRefundModal({ open: false, noc: null });
      fetchNocList();
      fetchUsers();
    } catch (err) {
      alert('Failed to process refund: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingRefund(false);
    }
  };

  const handleReopenRideAccount = async (nocId) => {
    if (!window.confirm("Reopen ride account for this rider?\nThis will set their account status back to Active so they can take new rentals.")) return;
    try {
      await axios.post(`${API_URL}/api/noc/${nocId}/reopen-account`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Ride account successfully reopened!');
      fetchNocList();
      fetchUsers();
    } catch (err) {
      alert('Error reopening account: ' + (err.response?.data?.error || err.message));
    }
  };

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

  const handleOpenDepositReceipt = (user) => {
    const bal = parseFloat(user.security_deposit_balance || 0);
    setSelectedReceiptData({
      receiptNumber: `REC-DEP-${String(user.id).padStart(5, '0')}`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      riderName: user.name,
      riderPhone: user.phone,
      riderEmail: user.email,
      riderId: user.id,
      vehicleModel: 'LT EV Mobility Fleet',
      planName: 'Refundable Security Deposit',
      planType: 'Security Deposit',
      amountPaid: bal,
      depositAmount: bal,
      paymentMode: 'Cash / UPI Admin Deposit',
      type: 'deposit',
      remarks: `Security deposit held on account for driver #${user.id}. Refundable upon return.`
    });
    setReceiptModalOpen(true);
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

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '22px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '12px',
            border: activeTab === 'balances' ? '2px solid #00a66c' : '1px solid #cbd5e1',
            background: activeTab === 'balances' ? '#f0fdf4' : 'white',
            color: activeTab === 'balances' ? '#15803d' : '#64748b',
            fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            boxShadow: activeTab === 'balances' ? '0 2px 6px rgba(0, 166, 108, 0.15)' : 'none'
          }}
        >
          <ShieldCheck size={17} /> Security Balances Escrow ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('noc_refunds')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '12px',
            border: activeTab === 'noc_refunds' ? '2px solid #0284c7' : '1px solid #cbd5e1',
            background: activeTab === 'noc_refunds' ? '#f0f9ff' : 'white',
            color: activeTab === 'noc_refunds' ? '#0369a1' : '#64748b',
            fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            boxShadow: activeTab === 'noc_refunds' ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none'
          }}
        >
          <Clock size={17} /> NOC & 30–45 Days Refunds Queue
          {nocList.filter(n => n.refund_status !== 'refund_processed').length > 0 && (
            <span style={{
              background: '#ef4444', color: 'white', fontSize: '11px', fontWeight: '900',
              padding: '2px 8px', borderRadius: '10px'
            }}>
              {nocList.filter(n => n.refund_status !== 'refund_processed').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: USER SECURITY BALANCES ESCROW */}
      {activeTab === 'balances' && (
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
                          {bal > 0 && (
                            <button 
                              onClick={() => handleOpenDepositReceipt(u)} 
                              title="Generate / Print / WhatsApp Deposit Receipt"
                              style={{ padding: '7px 11px', borderRadius: '8px', border: '1px solid #bae6fd', backgroundColor: '#e0f2fe', color: '#0284c7', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <FileText size={13} /> Receipt
                            </button>
                          )}
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
      )}

      {/* TAB 2: NOC & 30–45 DAYS REFUNDS QUEUE */}
      {activeTab === 'noc_refunds' && (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', border: '1px solid #f1f5f9' }}>
          {/* NOC Search & Status Filter Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '14px' }} />
              <input 
                type="text" 
                placeholder="Search by rider name, phone, or scooter reg..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 46px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All NOC Records' },
                { id: 'under_cooling', label: '⏳ 30–45d Cooling Active' },
                { id: 'due_for_refund', label: '⚡ Due for Refund' },
                { id: 'refund_processed', label: '✓ Settled & Refunded' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setNocFilter(f.id)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                    border: nocFilter === f.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: nocFilter === f.id ? '#f0f9ff' : 'white',
                    color: nocFilter === f.id ? '#0369a1' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* NOC Records Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafafa', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>NOC Certificate & Rider</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Surrendered Scooter</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Deposit & Deductions</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Net Refund Amount</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>30–45 Days Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Rider Payout Info</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nocLoading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      Loading NOC & refund records...
                    </td>
                  </tr>
                ) : nocList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No NOC records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  nocList.map(noc => {
                    const isSettled = noc.refund_status === 'refund_processed';
                    const expDate = new Date(noc.expected_refund_date);
                    const now = new Date();
                    const isDue = !isSettled && (now >= expDate);
                    const daysRemaining = Math.max(0, Math.ceil((expDate - now) / 86400000));
                    const deductions = Array.isArray(noc.deductions_breakdown) ? noc.deductions_breakdown : (typeof noc.deductions_breakdown === 'string' ? JSON.parse(noc.deductions_breakdown || '[]') : []);

                    return (
                      <tr key={noc.id} style={{ borderTop: '1px solid #f1f5f9', fontSize: '13px' }}>
                        {/* NOC & Rider */}
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{noc.user_name}</div>
                          <div style={{ fontSize: '12px', color: '#475569' }}>📞 {noc.user_phone}</div>
                          <div style={{ fontSize: '11px', color: '#0284c7', fontFamily: 'monospace', marginTop: '2px', fontWeight: '700' }}>
                            {noc.noc_number || `NOC-${noc.id}`}
                          </div>
                        </td>

                        {/* Surrendered Scooter */}
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ fontWeight: '700', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Bike size={14} /> {noc.vehicle_id || 'EV'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {noc.rental_duration_days || 0}d rented • {noc.return_stand || 'Stand'}
                          </div>
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                            Returned: {new Date(noc.surrender_date || noc.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </td>

                        {/* Deposit & Deductions */}
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ color: '#0f172a', fontWeight: '600' }}>
                            Deposit: <strong>₹{parseFloat(noc.initial_security_deposit || 0).toLocaleString('en-IN')}</strong>
                          </div>
                          {parseFloat(noc.deductions_amount || 0) > 0 ? (
                            <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: '700', marginTop: '2px' }}>
                              -₹{parseFloat(noc.deductions_amount || 0).toLocaleString('en-IN')} ({deductions.length} deductions)
                            </div>
                          ) : (
                            <div style={{ color: '#16a34a', fontSize: '11px', fontWeight: '700' }}>
                              Zero deductions
                            </div>
                          )}
                        </td>

                        {/* Net Refund Amount */}
                        <td style={{ padding: '16px 18px' }}>
                          <div style={{ fontSize: '16px', fontWeight: '900', color: '#166534' }}>
                            ₹{parseFloat(noc.net_refundable_amount || 0).toLocaleString('en-IN')}
                          </div>
                        </td>

                        {/* 30-45 Days Status */}
                        <td style={{ padding: '16px 18px' }}>
                          {isSettled ? (
                            <div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                <CheckCircle2 size={12} /> REFUND SETTLED
                              </span>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                                Paid {new Date(noc.refund_paid_date).toLocaleDateString('en-IN')} via {noc.refund_payment_mode?.toUpperCase()}
                              </div>
                            </div>
                          ) : isDue ? (
                            <div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                <AlertCircle size={12} /> ⚡ DUE FOR REFUND
                              </span>
                              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '3px', fontWeight: '700' }}>
                                Scheduled: {expDate.toLocaleDateString('en-IN')}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                                <Clock size={12} /> ⏳ {daysRemaining}d Cooling Left
                              </span>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                                Due on: {expDate.toLocaleDateString('en-IN')} ({noc.cooling_period_days || 30}d window)
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Rider Payout Info */}
                        <td style={{ padding: '16px 18px' }}>
                          {noc.payout_mode === 'bank' ? (
                            <div style={{ fontSize: '12px', color: '#334155' }}>
                              <div><strong>A/C:</strong> {noc.payout_account_number || 'N/A'}</div>
                              <div><strong>IFSC:</strong> {noc.payout_ifsc_code || 'N/A'}</div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>{noc.payout_account_holder || noc.user_name}</div>
                            </div>
                          ) : (
                            <div>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#0284c7', fontFamily: 'monospace' }}>
                                {noc.payout_upi_id || 'Not specified'}
                              </span>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>UPI Transfer</div>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => openNOCInvoice(noc)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7',
                                padding: '6px 10px', borderRadius: '7px', fontSize: '12px', fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Print Official NOC Certificate"
                            >
                              <FileText size={13} /> View NOC
                            </button>

                            {!isSettled && (
                              <button
                                type="button"
                                onClick={() => handleOpenProcessRefund(noc)}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                                  background: '#16a34a', border: 'none', color: 'white',
                                  padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '800',
                                  cursor: 'pointer', boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                                }}
                                title="Process and Record Security Deposit Refund"
                              >
                                <DollarSign size={13} /> Process Refund
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleReopenRideAccount(noc.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '3px',
                                background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569',
                                padding: '6px 8px', borderRadius: '7px', fontSize: '11px', fontWeight: '700',
                                cursor: 'pointer'
                              }}
                              title="Reopen Ride Account for this Rider"
                            >
                              <RefreshCw size={11} /> Reopen
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

      {/* Modal: Process NOC Security Deposit Refund */}
      {processRefundModal.open && processRefundModal.noc && (
        <div 
          onClick={() => setProcessRefundModal({ open: false, noc: null })}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              width: '100%',
              maxWidth: '520px',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #cbd5e1',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="#16a34a" /> Process Security Deposit Refund
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  NOC Ref: <strong style={{ color: '#0284c7', fontFamily: 'monospace' }}>{processRefundModal.noc.noc_number || processRefundModal.noc.id}</strong> • Rider: <strong>{processRefundModal.noc.user_name}</strong>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setProcessRefundModal({ open: false, noc: null })}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form 
              onSubmit={handleProcessRefundSubmit}
              style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Refund Summary Banner */}
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                padding: '16px 18px',
                borderRadius: '12px',
                border: '1px solid #86efac',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: '700' }}>Approved Net Refund Amount</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803d', marginTop: '2px' }}>
                    ₹{parseFloat(processRefundModal.noc.net_refundable_amount || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#166534' }}>
                  <div>Deposit: ₹{parseFloat(processRefundModal.noc.initial_security_deposit || 0).toLocaleString('en-IN')}</div>
                  <div>Deductions: -₹{parseFloat(processRefundModal.noc.deductions_amount || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Rider Destination Account Information */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Rider's Registered Payout Destination
                </div>
                {processRefundModal.noc.payout_mode === 'bank' ? (
                  <div style={{ fontSize: '13px', color: '#0f172a' }}>
                    <div><strong>A/C:</strong> <span style={{ fontFamily: 'monospace' }}>{processRefundModal.noc.payout_account_number || 'N/A'}</span></div>
                    <div><strong>IFSC:</strong> <span style={{ fontFamily: 'monospace' }}>{processRefundModal.noc.payout_ifsc_code || 'N/A'}</span></div>
                    <div><strong>Holder:</strong> {processRefundModal.noc.payout_account_holder || processRefundModal.noc.user_name}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: '14px', color: '#0284c7', fontWeight: '700', fontFamily: 'monospace' }}>
                    UPI: {processRefundModal.noc.payout_upi_id || 'Not specified'}
                  </div>
                )}
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Payment Method *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {['upi', 'bank_transfer', 'cash', 'other'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setRefundForm(prev => ({ ...prev, payment_mode: mode }))}
                      style={{
                        padding: '9px 6px',
                        borderRadius: '8px',
                        border: refundForm.payment_mode === mode ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: refundForm.payment_mode === mode ? '#f0fdf4' : 'white',
                        color: refundForm.payment_mode === mode ? '#15803d' : '#475569',
                        fontWeight: '800',
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        cursor: 'pointer'
                      }}
                    >
                      {mode.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* UTR / Reference ID */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Bank UTR / Transaction Reference ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 430129384729 or UPI/4301..."
                  value={refundForm.txn_id}
                  onChange={(e) => setRefundForm(prev => ({ ...prev, txn_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              {/* Remarks */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Settlement Remarks / Audit Notes
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks (e.g. 30 days cooling expired; no pending challans)"
                  value={refundForm.remarks}
                  onChange={(e) => setRefundForm(prev => ({ ...prev, remarks: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setProcessRefundModal({ open: false, noc: null })}
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRefund}
                  style={{
                    flex: 1.6, padding: '11px', borderRadius: '8px', border: 'none',
                    background: '#16a34a', color: 'white', fontWeight: '800', fontSize: '13px',
                    cursor: submittingRefund ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                  }}
                >
                  <CheckCircle2 size={16} /> {submittingRefund ? 'Processing Refund...' : 'Confirm Refund Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable / PDF Receipt & Invoice Modal */}
      <ReceiptModal 
        isOpen={receiptModalOpen} 
        onClose={() => setReceiptModalOpen(false)} 
        data={selectedReceiptData} 
      />
    </div>
  );
}
