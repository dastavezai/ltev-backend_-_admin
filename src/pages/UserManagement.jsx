import { useState, useEffect } from 'react';
import { 
  Search, UserPlus, Users, User, ShieldCheck, ShieldAlert, Shield, X, Edit2, Ban, 
  CheckCircle2, RefreshCw, CreditCard, AlertTriangle, Bike, Plus, Trash2, 
  Clock, Send, Calendar, DollarSign, Check, ChevronRight, FileText, Bell, Zap, AlertCircle
} from 'lucide-react';
import axios from 'axios';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [duesFilter, setDuesFilter] = useState('all'); // 'all' | 'with_dues' | 'no_dues'
  
  // Add & Edit Rider Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', phone: '', status: 'active' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // Suspend Toggle
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Rider Details & Due Management Modal
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderDetails, setRiderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('dues'); // 'dues' | 'vehicle' | 'wallet' | 'notice'

  // Add Extra Due Form State
  const [showAddDueForm, setShowAddDueForm] = useState(false);
  const [dueForm, setDueForm] = useState({
    title: '',
    amount: '',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    notes: '',
    send_notification: true
  });
  const [submittingDue, setSubmittingDue] = useState(false);

  // Edit Existing Due Modal State
  const [editingDue, setEditingDue] = useState(null);
  const [submittingEditDue, setSubmittingEditDue] = useState(false);

  // Direct Notice State
  const [directNotice, setDirectNotice] = useState({ title: '', message: '', sending: false });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchRiderDetails = async (riderId) => {
    setLoadingDetails(true);
    try {
      const rawId = typeof riderId === 'string' && riderId.startsWith('USR-')
        ? parseInt(riderId.replace('USR-', ''), 10)
        : riderId;
      const response = await axios.get(`/api/riders/${rawId}/details`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRiderDetails(response.data);
    } catch (error) {
      console.error('Error fetching rider details:', error);
      alert('Failed to load rider details: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenRiderDetails = (user) => {
    setSelectedRider(user);
    setActiveTab('dues');
    setShowAddDueForm(false);
    setEditingDue(null);
    fetchRiderDetails(user.id);
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/users`, { ...newUser, role: 'rider' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', status: 'active' });
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add rider: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/users/${editUser.id}`, { ...editUser, role: 'rider' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowEditModal(false);
      setEditUser(null);
      fetchUsers();
      if (selectedRider && selectedRider.id === editUser.id) {
        fetchRiderDetails(editUser.id);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update rider: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleToggleSuspend = async () => {
    if (!userToToggle) return;
    setUpdatingStatus(true);
    const newStatus = userToToggle.status === 'suspended' ? 'active' : 'suspended';
    try {
      await axios.patch(`/api/users/${userToToggle.id}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowSuspendModal(false);
      setUserToToggle(null);
      fetchUsers();
      if (selectedRider && selectedRider.id === userToToggle.id) {
        fetchRiderDetails(userToToggle.id);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update rider status: ' + (error.response?.data?.error || error.message));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Add Extra Due Handler
  const handleAddDue = async (e) => {
    e.preventDefault();
    if (!selectedRider) return;
    setSubmittingDue(true);
    try {
      const rawId = selectedRider.raw_id || selectedRider.user_id || selectedRider.id;
      await axios.post(`/api/riders/${rawId}/dues`, dueForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(`Extra due of ₹${dueForm.amount} added successfully!`);
      setDueForm({
        title: '',
        amount: '',
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        notes: '',
        send_notification: true
      });
      setShowAddDueForm(false);
      await fetchRiderDetails(rawId);
      await fetchUsers(); // Refresh main table
    } catch (error) {
      console.error('Error adding due:', error);
      alert('Failed to add due: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmittingDue(false);
    }
  };

  // Edit / Reduce Due Handler
  const handleUpdateDue = async (e) => {
    e.preventDefault();
    if (!editingDue) return;
    setSubmittingEditDue(true);
    try {
      await axios.put(`/api/riders/dues/${editingDue.id}`, editingDue, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Due updated successfully!');
      setEditingDue(null);
      const rawId = selectedRider.raw_id || selectedRider.user_id || selectedRider.id;
      await fetchRiderDetails(rawId);
      await fetchUsers();
    } catch (error) {
      console.error('Error updating due:', error);
      alert('Failed to update due: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmittingEditDue(false);
    }
  };

  // Mark Due Status (Paid or Waived)
  const handleUpdateDueStatus = async (dueId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this due as ${newStatus}?`)) return;
    try {
      await axios.patch(`/api/riders/dues/${dueId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const rawId = selectedRider.raw_id || selectedRider.user_id || selectedRider.id;
      await fetchRiderDetails(rawId);
      await fetchUsers();
    } catch (error) {
      console.error('Error updating due status:', error);
      alert('Failed to update status: ' + (error.response?.data?.error || error.message));
    }
  };

  // Delete Due Record
  const handleDeleteDue = async (dueId) => {
    if (!window.confirm('Are you sure you want to permanently delete this due record?')) return;
    try {
      await axios.delete(`/api/riders/dues/${dueId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const rawId = selectedRider.raw_id || selectedRider.user_id || selectedRider.id;
      await fetchRiderDetails(rawId);
      await fetchUsers();
    } catch (error) {
      console.error('Error deleting due:', error);
      alert('Failed to delete due: ' + (error.response?.data?.error || error.message));
    }
  };

  // Clear All Pending Dues for Rider
  const handleClearAllDues = async () => {
    if (!selectedRider) return;
    const confirmPrompt = window.prompt(
      `Type CLEAR to confirm clearing all pending dues for ${selectedRider.name}:`
    );
    if (confirmPrompt !== 'CLEAR') return;

    try {
      const rawId = selectedRider.raw_id || selectedRider.user_id || selectedRider.id;
      await axios.post(`/api/riders/${rawId}/dues/clear-all`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('All pending dues cleared successfully for this rider!');
      await fetchRiderDetails(rawId);
      await fetchUsers();
    } catch (error) {
      console.error('Error clearing dues:', error);
      alert('Failed to clear dues: ' + (error.response?.data?.error || error.message));
    }
  };

  // Send Direct In-App Notice to Selected Rider
  const handleSendDirectNotice = async (e) => {
    e.preventDefault();
    if (!directNotice.title.trim() || !directNotice.message.trim()) {
      alert('Please provide both title and message.');
      return;
    }
    setDirectNotice(prev => ({ ...prev, sending: true }));
    try {
      const rawId = selectedRider.raw_id || selectedRider.user_id || selectedRider.id;
      await axios.post(`/api/notifications/broadcast`, {
        type: 'custom',
        user_id: rawId,
        title: directNotice.title.trim(),
        message: directNotice.message.trim(),
        category: 'due_alert',
        action_type: 'pay_now'
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert('Notification sent directly to rider!');
      setDirectNotice({ title: '', message: '', sending: false });
      await fetchRiderDetails(rawId);
    } catch (error) {
      console.error('Error sending direct notice:', error);
      alert('Failed to send notice: ' + (error.response?.data?.error || error.message));
      setDirectNotice(prev => ({ ...prev, sending: false }));
    }
  };

  const prefillDueReminder = () => {
    if (!riderDetails) return;
    const totalDue = riderDetails.dues_summary?.total_due || 0;
    setDirectNotice({
      title: `🚨 Payment Notice: ₹${totalDue.toLocaleString('en-IN')} Due on your Account`,
      message: `Dear ${riderDetails.user.name}, you have a total outstanding due of ₹${totalDue.toLocaleString('en-IN')} on your LT.ev account. Please open your LT.ev app and tap Pay Now on your homepage to clear your dues immediately and maintain uninterrupted ride services.`,
      sending: false
    });
  };

  const getKycBadge = (kyc_status) => {
    switch (kyc_status) {
      case 'verified': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}><ShieldCheck size={14} /> Digilocker Verified</span>;
      case 'approved':
      case 'completed': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#d1fae5', color: '#059669', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}><ShieldCheck size={14} /> Approved</span>;
      case 'failed': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}><ShieldAlert size={14} /> KYC Failed</span>;
      default: return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', color: '#64748b', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}><Shield size={14} /> Pending</span>;
    }
  };

  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      String(user.name || '').toLowerCase().includes(q) ||
      String(user.email || '').toLowerCase().includes(q) ||
      String(user.phone || '').toLowerCase().includes(q) ||
      String(user.id || '').toLowerCase().includes(q) ||
      String(user.assigned_vehicle || '').toLowerCase().includes(q)
    );

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesDues = duesFilter === 'all' || 
      (duesFilter === 'with_dues' && parseFloat(user.total_due || 0) > 0) ||
      (duesFilter === 'no_dues' && parseFloat(user.total_due || 0) <= 0);

    return matchesSearch && matchesStatus && matchesDues;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '60px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bike size={28} color="#00a66c" /> Riders Management & Dues Portal
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            Manage registered riders, inspect EV assignment & billing cycles, add or adjust dues, and send direct notices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchUsers}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#00a66c', color: 'white', padding: '10px 20px', borderRadius: '12px', border: 'none', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 166, 108, 0.3)' }}
          >
            <UserPlus size={18} /> Add New Rider
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        {/* Search & Filter bar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search riders by name, phone, email, or vehicle..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 14px 12px 46px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', background: 'white' }} 
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Dues Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Dues:</span>
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'with_dues', label: '⚠️ Has Dues' },
                  { id: 'no_dues', label: '✓ Clean' }
                ].map(df => (
                  <button
                    key={df.id}
                    onClick={() => setDuesFilter(df.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      background: duesFilter === df.id ? 'white' : 'transparent',
                      color: duesFilter === df.id ? '#0f172a' : '#64748b',
                      boxShadow: duesFilter === df.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Status:</span>
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
                {['all', 'active', 'suspended', 'pending'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '700',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      background: statusFilter === st ? 'white' : 'transparent',
                      color: statusFilter === st ? '#0f172a' : '#64748b',
                      boxShadow: statusFilter === st ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Riders Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Rider Info</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Assigned EV & Plan</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Total Dues Status</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Wallet Balance</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>KYC Status</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Account Status</th>
                <th style={{ padding: '16px 24px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                    <Users size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#475569' }}>No riders found</div>
                    <div style={{ fontSize: '13px' }}>Try adjusting your search query or filters.</div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const numDue = parseFloat(user.total_due || 0);
                  const hasDue = numDue > 0;
                  return (
                    <tr 
                      key={user.id} 
                      onClick={() => handleOpenRiderDetails(user)}
                      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} 
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} 
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      {/* Rider Info */}
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: hasDue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0, 166, 108, 0.1)', color: hasDue ? '#dc2626' : '#00a66c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '15px' }}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'R'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>{user.name}</div>
                            <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>📞 {user.phone}</span>
                              <span style={{ color: '#cbd5e1' }}>•</span>
                              <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', color: '#475569' }}>{user.id}</span>
                            </div>
                            {user.email && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{user.email}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Assigned EV & Plan */}
                      <td style={{ padding: '18px 24px' }}>
                        {user.assigned_vehicle ? (
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Bike size={15} color="#00a66c" /> {user.assigned_vehicle}
                            </div>
                            {user.plan_name && (
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                Plan: <span style={{ fontWeight: '600', color: '#0f172a' }}>{user.plan_name} (₹{user.plan_price})</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>No EV Assigned</span>
                        )}
                      </td>

                      {/* Total Dues Status Badge */}
                      <td style={{ padding: '18px 24px' }}>
                        {hasDue ? (
                          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              padding: '6px 12px',
                              borderRadius: '10px',
                              fontSize: '13px',
                              fontWeight: '800'
                            }}>
                              <AlertTriangle size={15} /> ₹{numDue.toLocaleString('en-IN')} Due
                            </span>
                            <div style={{ fontSize: '11px', color: '#94a3b8', paddingLeft: '4px' }}>
                              {user.cycle_due > 0 && `Cycle: ₹${user.cycle_due} `}
                              {user.deposit_deficit > 0 && `• Deposit: ₹${user.deposit_deficit} `}
                              {user.extra_dues_total > 0 && `• Extra: ₹${user.extra_dues_total}`}
                            </div>
                          </div>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: '800'
                          }}>
                            <CheckCircle2 size={14} /> Clear (₹0)
                          </span>
                        )}
                      </td>

                      {/* Wallet Balance */}
                      <td style={{ padding: '18px 24px', fontWeight: '800', fontSize: '15px', color: '#0f172a' }}>
                        ₹{parseFloat(user.wallet_balance || 0).toLocaleString('en-IN')}
                      </td>

                      {/* KYC Status */}
                      <td style={{ padding: '18px 24px' }}>{getKycBadge(user.kyc_status)}</td>

                      {/* Account Status */}
                      <td style={{ padding: '18px 24px' }}>
                        <span style={{ 
                          display: 'inline-block', 
                          background: user.status === 'active' ? '#d1fae5' : user.status === 'pending' ? '#fef3c7' : '#fee2e2', 
                          color: user.status === 'active' ? '#059669' : user.status === 'pending' ? '#d97706' : '#dc2626', 
                          padding: '4px 10px', 
                          borderRadius: '8px', 
                          fontSize: '11px', 
                          fontWeight: '800', 
                          textTransform: 'uppercase' 
                        }}>
                          {user.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '18px 24px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleOpenRiderDetails(user)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#1d4ed8' }}
                            title="Manage Profile & Dues"
                          >
                            <CreditCard size={14} /> Manage & Dues
                          </button>

                          <button 
                            onClick={() => {
                              setEditUser({ ...user, email: user.email || '' });
                              setShowEditModal(true);
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', border: '1px solid #cbd5e1', padding: '8px 10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', color: '#475569' }} 
                            title="Edit Basic Info"
                          >
                            <Edit2 size={13} />
                          </button>

                          {user.status === 'suspended' ? (
                            <button 
                              onClick={() => {
                                setUserToToggle(user);
                                setShowSuspendModal(true);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#15803d' }}
                              title="Reactivate Rider"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                setUserToToggle(user);
                                setShowSuspendModal(true);
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff7ed', border: '1px solid #fed7aa', padding: '8px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#c2410c' }}
                              title="Suspend Rider"
                            >
                              <Ban size={14} />
                            </button>
                          )}
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

      {/* ======================================================== */}
      {/* COMPREHENSIVE RIDER DETAILS & DUE MANAGEMENT MODAL       */}
      {/* ======================================================== */}
      {selectedRider && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 120, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '1050px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '24px 32px', background: '#0f172a', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #00a66c 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' }}>
                  {selectedRider.name ? selectedRider.name.charAt(0).toUpperCase() : 'R'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: 'white' }}>{selectedRider.name}</h2>
                    <span style={{ background: 'rgba(255,255,255,0.15)', color: '#93c5fd', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
                      {selectedRider.id}
                    </span>
                    <span style={{ 
                      background: selectedRider.status === 'active' ? '#15803d' : '#b91c1c', 
                      color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' 
                    }}>
                      {selectedRider.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px', display: 'flex', gap: '14px' }}>
                    <span>📞 {selectedRider.phone}</span>
                    {selectedRider.email && <span>✉️ {selectedRider.email}</span>}
                    <span>📅 Joined: {selectedRider.joined || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => { setSelectedRider(null); setRiderDetails(null); }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics Bar */}
            {riderDetails && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', padding: '18px 32px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {/* 1. Total Due */}
                <div style={{ background: (riderDetails.dues_summary?.total_due || 0) > 0 ? '#fef2f2' : '#f0fdf4', padding: '14px 18px', borderRadius: '16px', border: `1px solid ${(riderDetails.dues_summary?.total_due || 0) > 0 ? '#fecaca' : '#bbf7d0'}` }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: (riderDetails.dues_summary?.total_due || 0) > 0 ? '#dc2626' : '#15803d', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={15} /> Total Pending Due
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: (riderDetails.dues_summary?.total_due || 0) > 0 ? '#dc2626' : '#15803d', marginTop: '4px' }}>
                    ₹{(riderDetails.dues_summary?.total_due || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {(riderDetails.dues_summary?.total_due || 0) > 0 ? 'Action required by rider' : 'All accounts settled'}
                  </div>
                </div>

                {/* 2. Assigned Vehicle */}
                <div style={{ background: 'white', padding: '14px 18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bike size={15} color="#00a66c" /> Assigned EV
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {riderDetails.active_rental ? `${riderDetails.active_rental.vehicle_model || 'LT.ev'} (${riderDetails.active_rental.vehicle_reg || 'Assigned'})` : 'No Vehicle Assigned'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    {riderDetails.active_rental ? `Status: ${riderDetails.active_rental.status}` : 'Available for booking'}
                  </div>
                </div>

                {/* 3. Subscription Cycle */}
                <div style={{ background: 'white', padding: '14px 18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={15} color="#eab308" /> Active Plan
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '6px' }}>
                    {riderDetails.active_rental?.plan_name ? `${riderDetails.active_rental.plan_name} (₹${riderDetails.active_rental.plan_price})` : 'No Active Plan'}
                  </div>
                  <div style={{ fontSize: '11px', color: riderDetails.dues_summary?.is_overdue ? '#dc2626' : '#64748b', marginTop: '2px', fontWeight: riderDetails.dues_summary?.is_overdue ? '700' : '500' }}>
                    {riderDetails.active_rental?.next_payment_date ? `Next Due: ${new Date(riderDetails.active_rental.next_payment_date).toLocaleDateString('en-GB')}` : 'Pay-per-ride'}
                  </div>
                </div>

                {/* 4. Wallet & Security Deposit */}
                <div style={{ background: 'white', padding: '14px 18px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={15} color="#1d4ed8" /> Wallet & Deposit
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>
                    ₹{parseFloat(riderDetails.user.wallet_balance || 0).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Min Deposit: ₹{riderDetails.dues_summary?.min_deposit || 2000} (Deficit: ₹{riderDetails.dues_summary?.deposit_deficit || 0})
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: 'white', padding: '0 32px' }}>
              {[
                { id: 'dues', label: '💳 Due Management & Extra Dues', icon: <CreditCard size={16} /> },
                { id: 'vehicle', label: '🛵 EV & Rental Cycle Info', icon: <Bike size={16} /> },
                { id: 'wallet', label: '💰 Wallet Transactions & Approvals', icon: <FileText size={16} /> },
                { id: 'notice', label: '📢 Send Direct Notice / Reminder', icon: <Bell size={16} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 20px',
                    border: 'none',
                    background: 'transparent',
                    borderBottom: activeTab === tab.id ? '3px solid #00a66c' : '3px solid transparent',
                    color: activeTab === tab.id ? '#00a66c' : '#64748b',
                    fontWeight: activeTab === tab.id ? '800' : '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body / Tab Content */}
            <div style={{ padding: '24px 32px', flex: 1, overflowY: 'auto', background: '#fafafa' }}>
              {loadingDetails ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
                  <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                  <div style={{ fontWeight: '700' }}>Loading rider profile & dues...</div>
                </div>
              ) : !riderDetails ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444' }}>
                  Failed to load details. Please close and try again.
                </div>
              ) : (
                <>
                  {/* TAB 1: DUE MANAGEMENT */}
                  {activeTab === 'dues' && (
                    <div>
                      {/* Dues Breakdown Header Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                        {/* 1. Cycle Overdue */}
                        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>1. Rental Cycle Due</div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: riderDetails.dues_summary?.cycle_due > 0 ? '#dc2626' : '#0f172a' }}>
                            ₹{(riderDetails.dues_summary?.cycle_due || 0).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {riderDetails.dues_summary?.cycle_due > 0 
                              ? `Overdue by ${riderDetails.dues_summary.overdue_days} day(s)` 
                              : 'Rental pass up to date'}
                          </div>
                        </div>

                        {/* 2. Deposit Deficit */}
                        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>2. Deposit Shortfall</div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: riderDetails.dues_summary?.deposit_deficit > 0 ? '#ea580c' : '#0f172a' }}>
                            ₹{(riderDetails.dues_summary?.deposit_deficit || 0).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            Min Required: ₹{riderDetails.dues_summary?.min_deposit || 2000} (Balance: ₹{riderDetails.user.wallet_balance || 0})
                          </div>
                        </div>

                        {/* 3. Extra / Admin Dues */}
                        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>3. Extra / Admin Added Dues</div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: riderDetails.dues_summary?.pending_extra_dues_total > 0 ? '#7c3aed' : '#0f172a' }}>
                            ₹{(riderDetails.dues_summary?.pending_extra_dues_total || 0).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {riderDetails.extra_dues?.filter(d => d.status === 'pending').length || 0} pending custom charges
                          </div>
                        </div>
                      </div>

                      {/* Action Bar for Dues */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', background: 'white', padding: '14px 20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Custom Extra Dues & Charges</h3>
                          <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                            Add penalties, challans, damages, or custom fees. Rider sees these in their app homepage due section.
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {(riderDetails.dues_summary?.pending_extra_dues_total > 0) && (
                            <button
                              onClick={handleClearAllDues}
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '9px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                            >
                              <CheckCircle2 size={15} /> Clear All Dues
                            </button>
                          )}
                          <button
                            onClick={() => setShowAddDueForm(prev => !prev)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: showAddDueForm ? '#64748b' : '#00a66c', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0, 166, 108, 0.25)' }}
                          >
                            {showAddDueForm ? <X size={15} /> : <Plus size={15} />}
                            {showAddDueForm ? 'Cancel Form' : 'Add Extra Due'}
                          </button>
                        </div>
                      </div>

                      {/* ADD EXTRA DUE FORM */}
                      {showAddDueForm && (
                        <div style={{ background: 'white', borderRadius: '18px', padding: '24px', border: '2px solid #00a66c', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 166, 108, 0.08)' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={18} color="#00a66c" /> Add New Extra Due to Rider
                          </h4>

                          {/* Quick Title Presets */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>Quick Presets:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {[
                                { title: 'Traffic Challan Fine', amt: '1000' },
                                { title: 'Helmet Lost / Replacement', amt: '800' },
                                { title: 'Late Return Overdue Fee', amt: '500' },
                                { title: 'Vehicle Scratch / Body Damage', amt: '1500' },
                                { title: 'Fastag Toll Recovery', amt: '250' },
                                { title: 'Battery Swap Penalty', amt: '300' }
                              ].map((preset, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setDueForm(prev => ({ ...prev, title: preset.title, amount: preset.amt }))}
                                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                                >
                                  + {preset.title} (₹{preset.amt})
                                </button>
                              ))}
                            </div>
                          </div>

                          <form onSubmit={handleAddDue} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Due Title / Reason <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <input 
                                required
                                type="text" 
                                placeholder="e.g. Helmet replacement, Traffic challan"
                                value={dueForm.title}
                                onChange={(e) => setDueForm({ ...dueForm, title: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Due Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <input 
                                required
                                type="number" 
                                min="1"
                                placeholder="e.g. 500"
                                value={dueForm.amount}
                                onChange={(e) => setDueForm({ ...dueForm, amount: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Due Date <span style={{ color: '#ef4444' }}>*</span>
                              </label>
                              <input 
                                required
                                type="date" 
                                value={dueForm.due_date}
                                onChange={(e) => setDueForm({ ...dueForm, due_date: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                              />
                            </div>

                            <div style={{ gridColumn: 'span 3' }}>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                                Additional Internal Notes / Description (Optional)
                              </label>
                              <input 
                                type="text"
                                placeholder="e.g. Challan issued near Connaught Place for driving without helmet"
                                value={dueForm.notes}
                                onChange={(e) => setDueForm({ ...dueForm, notes: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                              />
                            </div>

                            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#334155' }}>
                                <input 
                                  type="checkbox" 
                                  checked={dueForm.send_notification}
                                  onChange={(e) => setDueForm({ ...dueForm, send_notification: e.target.checked })}
                                  style={{ width: '16px', height: '16px' }}
                                />
                                📲 Send instant in-app update & push notification to rider
                              </label>

                              <button
                                type="submit"
                                disabled={submittingDue}
                                style={{ background: '#00a66c', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                              >
                                {submittingDue ? 'Adding Due...' : '✓ Add Due & Charge Rider'}
                              </button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* EDIT EXISTING DUE FORM MODAL */}
                      {editingDue && (
                        <div style={{ background: '#fffbeb', borderRadius: '18px', padding: '24px', border: '2px solid #f59e0b', marginBottom: '24px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#92400e' }}>
                              ✏️ Edit / Reduce Due Record #{editingDue.id}
                            </h4>
                            <button onClick={() => setEditingDue(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontWeight: '700' }}>Cancel ✕</button>
                          </div>

                          <form onSubmit={handleUpdateDue} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#78350f', marginBottom: '6px' }}>Title</label>
                              <input required type="text" value={editingDue.title} onChange={(e) => setEditingDue({ ...editingDue, title: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#78350f', marginBottom: '6px' }}>Amount (₹)</label>
                              <input required type="number" min="1" value={editingDue.amount} onChange={(e) => setEditingDue({ ...editingDue, amount: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#78350f', marginBottom: '6px' }}>Due Date</label>
                              <input required type="date" value={editingDue.due_date ? new Date(editingDue.due_date).toISOString().split('T')[0] : ''} onChange={(e) => setEditingDue({ ...editingDue, due_date: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }} />
                            </div>
                            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                              <button type="button" onClick={() => setEditingDue(null)} style={{ padding: '10px 16px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}>Cancel</button>
                              <button type="submit" disabled={submittingEditDue} style={{ padding: '10px 20px', background: '#d97706', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>Save Changes</button>
                            </div>
                          </form>
                        </div>
                      )}

                      {/* Extra Dues List */}
                      <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                          <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                            <tr>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Due Title / Reason</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Amount</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Due Date</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Added Date</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Status</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(!riderDetails.extra_dues || riderDetails.extra_dues.length === 0) ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                  No extra dues added for this rider. Click <strong>[+ Add Extra Due]</strong> above to charge penalties or custom fees.
                                </td>
                              </tr>
                            ) : (
                              riderDetails.extra_dues.map(due => (
                                <tr key={due.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '16px 20px' }}>
                                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{due.title}</div>
                                    {due.notes && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{due.notes}</div>}
                                  </td>
                                  <td style={{ padding: '16px 20px', fontWeight: '900', fontSize: '16px', color: due.status === 'pending' ? '#dc2626' : '#0f172a' }}>
                                    ₹{parseFloat(due.amount || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td style={{ padding: '16px 20px', fontSize: '13px', color: '#475569' }}>
                                    📅 {new Date(due.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td style={{ padding: '16px 20px', fontSize: '12px', color: '#64748b' }}>
                                    {new Date(due.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td style={{ padding: '16px 20px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      background: due.status === 'paid' ? '#dcfce7' : due.status === 'waived' ? '#f1f5f9' : '#fee2e2',
                                      color: due.status === 'paid' ? '#15803d' : due.status === 'waived' ? '#64748b' : '#dc2626'
                                    }}>
                                      {due.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                                      {due.status === 'pending' && (
                                        <>
                                          <button
                                            onClick={() => setEditingDue(due)}
                                            style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}
                                            title="Edit or Reduce Due"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => handleUpdateDueStatus(due.id, 'paid')}
                                            style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', color: '#16a34a' }}
                                            title="Mark as Paid"
                                          >
                                            Mark Paid
                                          </button>
                                          <button
                                            onClick={() => handleUpdateDueStatus(due.id, 'waived')}
                                            style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', color: '#64748b' }}
                                            title="Waive Due"
                                          >
                                            Waive
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => handleDeleteDue(due.id)}
                                        style={{ background: '#fee2e2', border: 'none', padding: '6px 8px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer' }}
                                        title="Delete Record"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: EV & RENTAL CYCLE */}
                  {activeTab === 'vehicle' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      {/* Active Vehicle Details */}
                      <div style={{ background: 'white', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Bike size={20} color="#00a66c" /> Assigned EV Details
                        </h4>
                        {riderDetails.active_rental ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Model:</span>
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>{riderDetails.active_rental.vehicle_model || 'LT.ev Scooter'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Registration No:</span>
                              <span style={{ fontWeight: '800', color: '#00a66c' }}>{riderDetails.active_rental.vehicle_reg || 'N/A'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Assigned Date:</span>
                              <span style={{ fontWeight: '600', color: '#0f172a' }}>{new Date(riderDetails.active_rental.start_time).toLocaleString('en-GB')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Rental ID:</span>
                              <span style={{ fontWeight: '600', color: '#64748b' }}>#{riderDetails.active_rental.id}</span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8' }}>
                            No vehicle currently assigned to this rider.
                          </div>
                        )}
                      </div>

                      {/* Active Plan & Cycle Details */}
                      <div style={{ background: 'white', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Zap size={20} color="#eab308" /> Subscription Plan & Renewal
                        </h4>
                        {riderDetails.active_rental ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Plan Name:</span>
                              <span style={{ fontWeight: '700', color: '#0f172a' }}>{riderDetails.active_rental.plan_name || 'Weekly Pass'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Plan Price:</span>
                              <span style={{ fontWeight: '800', color: '#0f172a' }}>₹{riderDetails.active_rental.plan_price}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Billing Cycle:</span>
                              <span style={{ fontWeight: '700', textTransform: 'capitalize', color: '#0f172a' }}>{riderDetails.active_rental.plan_type || 'Weekly'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Next Due / Renewal Date:</span>
                              <span style={{ fontWeight: '800', color: riderDetails.dues_summary?.is_overdue ? '#dc2626' : '#00a66c' }}>
                                {riderDetails.active_rental.next_payment_date ? new Date(riderDetails.active_rental.next_payment_date).toLocaleDateString('en-GB') : 'N/A'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b', fontSize: '14px' }}>Overdue Status:</span>
                              <span style={{ fontWeight: '800', color: riderDetails.dues_summary?.is_overdue ? '#dc2626' : '#15803d' }}>
                                {riderDetails.dues_summary?.is_overdue ? `Overdue by ${riderDetails.dues_summary?.overdue_days} days` : 'Active / Paid'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '30px 0', textAlign: 'center', color: '#94a3b8' }}>
                            No active subscription cycle found.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: WALLET & TRANSACTIONS */}
                  {activeTab === 'wallet' && (
                    <div>
                      <div style={{ background: 'white', borderRadius: '18px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Recent Wallet Transactions & Due Payments</h4>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#00a66c' }}>Current Balance: ₹{parseFloat(riderDetails.user.wallet_balance || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                          <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                            <tr>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Type</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Amount</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Description</th>
                              <th style={{ padding: '14px 20px', fontWeight: '700' }}>Date & Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(!riderDetails.wallet_transactions || riderDetails.wallet_transactions.length === 0) ? (
                              <tr>
                                <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                  No wallet transactions recorded yet.
                                </td>
                              </tr>
                            ) : (
                              riderDetails.wallet_transactions.map(txn => (
                                <tr key={txn.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '14px 20px' }}>
                                    <span style={{
                                      display: 'inline-block',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      textTransform: 'uppercase',
                                      background: txn.type === 'credit' ? '#dcfce7' : '#fee2e2',
                                      color: txn.type === 'credit' ? '#15803d' : '#dc2626'
                                    }}>
                                      {txn.type}
                                    </span>
                                  </td>
                                  <td style={{ padding: '14px 20px', fontWeight: '800', color: txn.type === 'credit' ? '#15803d' : '#dc2626' }}>
                                    {txn.type === 'credit' ? '+' : '-'}₹{parseFloat(txn.amount || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#0f172a' }}>
                                    {txn.description}
                                  </td>
                                  <td style={{ padding: '14px 20px', fontSize: '12px', color: '#64748b' }}>
                                    {new Date(txn.timestamp).toLocaleString('en-GB')}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: DIRECT NOTICE */}
                  {activeTab === 'notice' && (
                    <div style={{ background: 'white', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', maxWidth: '680px', margin: '0 auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>Send In-App & Push Notice to {riderDetails.user.name}</h4>
                          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Direct notification will pop up in the rider's updates box and notify their smartphone.</p>
                        </div>
                        {(riderDetails.dues_summary?.total_due > 0) && (
                          <button
                            type="button"
                            onClick={prefillDueReminder}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                          >
                            ⚡ Pre-fill Due Notice
                          </button>
                        )}
                      </div>

                      <form onSubmit={handleSendDirectNotice} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            Notice Title <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <input 
                            required
                            type="text" 
                            placeholder="e.g. Action Required: Please clear your pending due"
                            value={directNotice.title}
                            onChange={(e) => setDirectNotice({ ...directNotice, title: e.target.value })}
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                            Notice Message <span style={{ color: '#ef4444' }}>*</span>
                          </label>
                          <textarea 
                            required
                            rows="4"
                            placeholder="Write message to rider..."
                            value={directNotice.message}
                            onChange={(e) => setDirectNotice({ ...directNotice, message: e.target.value })}
                            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={directNotice.sending}
                          style={{ background: '#00a66c', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <Send size={16} /> {directNotice.sending ? 'Sending...' : 'Send Notice Now'}
                        </button>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 32px', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => { setSelectedRider(null); setRiderDetails(null); }}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Rider Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 130 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#0f172a' }}>Add New Rider</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" placeholder="e.g., Rajesh Kumar" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Email Address (Optional)</label>
                <input type="email" placeholder="rajesh@example.com (optional)" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="tel" placeholder="+91 9999999999" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Account Status</label>
                <select value={newUser.status} onChange={e => setNewUser({...newUser, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <button type="submit" style={{ marginTop: '8px', background: '#00a66c', color: 'white', padding: '14px', borderRadius: '10px', fontWeight: '800', border: 'none', cursor: 'pointer' }}>
                Create Rider
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Rider Basic Info Modal */}
      {showEditModal && editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 130 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#0f172a' }}>Edit Rider</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Email Address</label>
                <input type="email" value={editUser.email || ''} onChange={e => setEditUser({...editUser, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="tel" value={editUser.phone} onChange={e => setEditUser({...editUser, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select value={editUser.status} onChange={e => setEditUser({...editUser, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>KYC Status</label>
                  <select value={editUser.kyc_status} onChange={e => setEditUser({...editUser, kyc_status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="failed">Failed</option>
                    <option value="verified">Verified (Digilocker)</option>
                  </select>
                </div>
              </div>

              <button type="submit" style={{ marginTop: '8px', background: '#00a66c', color: 'white', padding: '14px', borderRadius: '10px', fontWeight: '800', border: 'none', cursor: 'pointer' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {showSuspendModal && userToToggle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 140 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ 
              width: '60px', height: '60px', 
              background: userToToggle.status === 'suspended' ? '#dcfce7' : '#ffedd5', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' 
            }}>
              {userToToggle.status === 'suspended' ? <CheckCircle2 size={28} color="#16a34a" /> : <Ban size={28} color="#ea580c" />}
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
              {userToToggle.status === 'suspended' ? 'Reactivate Rider Account?' : 'Suspend Rider Account?'}
            </h2>
            
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              {userToToggle.status === 'suspended' ? (
                <>Are you sure you want to reactivate rider <strong>{userToToggle.name}</strong> ({userToToggle.phone})?</>
              ) : (
                <>Are you sure you want to suspend rider <strong>{userToToggle.name}</strong> ({userToToggle.phone})? This will prevent them from booking or receiving new vehicles.</>
              )}
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={updatingStatus}
                onClick={() => { setShowSuspendModal(false); setUserToToggle(null); }} 
                style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                disabled={updatingStatus}
                onClick={handleToggleSuspend} 
                style={{ 
                  flex: 1, padding: '12px', 
                  background: userToToggle.status === 'suspended' ? '#16a34a' : '#ea580c', 
                  border: 'none', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                {updatingStatus ? 'Updating...' : (userToToggle.status === 'suspended' ? 'Yes, Reactivate' : 'Yes, Suspend Account')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
