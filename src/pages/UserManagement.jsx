import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, UserPlus, Users, User, ShieldCheck, ShieldAlert, Shield, X, Edit2, Ban, 
  CheckCircle2, RefreshCw, CreditCard, AlertTriangle, Bike, Plus, Trash2, 
  Clock, Send, Calendar, DollarSign, Check, ChevronRight, FileText, Bell, Zap, AlertCircle,
  Eye, ExternalLink, Camera
} from 'lucide-react';
import axios from 'axios';
import RiderDetailsModal from '../components/RiderDetailsModal';

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
  const [activeTab, setActiveTab] = useState('dues'); // 'dues' | 'kyc' | 'vehicle' | 'wallet' | 'notice'
  const [previewDocModal, setPreviewDocModal] = useState({ open: false, title: '', url: '', riderName: '' });

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

  const [searchParams] = useSearchParams();

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

  useEffect(() => {
    const riderIdParam = searchParams.get('riderId');
    const tabParam = searchParams.get('tab');
    if (riderIdParam && users.length > 0) {
      const foundUser = users.find(u => String(u.id) === String(riderIdParam));
      if (foundUser) {
        setSelectedRider(foundUser);
        setActiveTab(tabParam || 'noc');
        fetchRiderDetails(foundUser.id);
      }
    }
  }, [searchParams, users]);

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

  const handleOpenRiderKyc = (user) => {
    setSelectedRider(user);
    setActiveTab('kyc');
    setShowAddDueForm(false);
    setEditingDue(null);
    fetchRiderDetails(user.id);
  };

  const handleUpdateKycStatus = async (userId, newStatus) => {
    try {
      const endpoint = newStatus === 'verified' ? 'approve' : 'reject';
      await axios.post(`/api/account_approvals/${userId}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      alert(`KYC status successfully updated to ${newStatus.toUpperCase()}`);
      fetchUsers();
      fetchRiderDetails(userId);
    } catch (err) {
      alert('Error updating KYC status: ' + (err.response?.data?.error || err.message));
    }
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
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', fontSize: '11px' }}>
                              {user.last_payment_date && (
                                <span style={{ background: '#ecfdf5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                  Paid: {new Date(user.last_payment_date).toLocaleDateString('en-GB')}
                                </span>
                              )}
                              {user.next_payment_date && (
                                <span style={{ 
                                  background: user.is_overdue || user.cycle_due > 0 ? '#fee2e2' : '#f0f9ff', 
                                  color: user.is_overdue || user.cycle_due > 0 ? '#b91c1c' : '#0369a1', 
                                  padding: '2px 6px', borderRadius: '4px', fontWeight: '700' 
                                }}>
                                  Due: {new Date(user.next_payment_date).toLocaleDateString('en-GB')}
                                </span>
                              )}
                            </div>
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
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                          {getKycBadge(user.kyc_status)}
                          {(user.aadhar_front_image || user.pan_image || user.selfie_image) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRiderKyc(user);
                              }}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={12} /> View Photos
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* Account Status */}
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
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
                          {user.ride_account_status === 'ride_closed' && (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '3px',
                              background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0',
                              padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800',
                              textTransform: 'uppercase'
                            }}>
                              <ShieldCheck size={11} /> NOC Issued
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '18px 24px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleOpenRiderDetails(user)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#1d4ed8' }}
                            title="Manage Profile & Dues"
                          >
                            <CreditCard size={14} /> View & Manage
                          </button>

                          <button 
                            onClick={() => {
                              setSelectedRider(user);
                              setActiveTab('noc');
                              setShowAddDueForm(false);
                              setEditingDue(null);
                              fetchRiderDetails(user.id);
                            }}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: '5px',
                              background: user.ride_account_status === 'ride_closed' ? '#f0fdf4' : '#fafafa',
                              border: user.ride_account_status === 'ride_closed' ? '1px solid #86efac' : '1px solid #cbd5e1',
                              padding: '8px 11px', borderRadius: '8px', fontWeight: '700', fontSize: '12px',
                              cursor: 'pointer',
                              color: user.ride_account_status === 'ride_closed' ? '#15803d' : '#334155'
                            }}
                            title="No Objection Certificate (NOC) & Ride Settlement"
                          >
                            <ShieldCheck size={14} color={user.ride_account_status === 'ride_closed' ? '#16a34a' : '#64748b'} />
                            NOC
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
      <RiderDetailsModal
        isOpen={Boolean(selectedRider)}
        onClose={() => { setSelectedRider(null); setRiderDetails(null); }}
        rider={selectedRider}
        details={riderDetails}
        loading={loadingDetails}
        onRefresh={() => {
          if (selectedRider) {
            fetchRiderDetails(selectedRider.id);
            fetchUsers();
          }
        }}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onUpdateKycStatus={handleUpdateKycStatus}
        onEditRider={(u) => {
          setEditUser(u);
          setShowEditModal(true);
        }}
        onToggleSuspend={(u) => {
          setUserToToggle(u);
          setShowSuspendModal(true);
        }}
        onPreviewDoc={(doc) => setPreviewDocModal(doc)}
      />

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

      {/* KYC Document Lightbox Preview Modal */}
      {previewDocModal.open && (
        <div 
          onClick={() => setPreviewDocModal({ open: false, title: '', url: '', riderName: '' })}
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.85)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: '#0f172a', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              maxWidth: '90vw', 
              maxHeight: '92vh', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #334155'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{previewDocModal.title}</div>
                {previewDocModal.riderName && (
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Rider: {previewDocModal.riderName}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={previewDocModal.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocModal({ open: false, title: '', url: '', riderName: '' })}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Image */}
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020617', maxHeight: 'calc(92vh - 80px)' }}>
              <img 
                src={previewDocModal.url} 
                alt={previewDocModal.title} 
                style={{ maxWidth: '100%', maxHeight: 'calc(80vh)', objectFit: 'contain', borderRadius: '8px' }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
