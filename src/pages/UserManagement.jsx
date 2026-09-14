import { useState, useEffect } from 'react';
import { Search, UserPlus, Filter, ShieldCheck, ShieldAlert, Shield, X, Edit2, Ban, CheckCircle2, UserCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newUser, setNewUser] = useState({
    name: '', email: '', phone: '', status: 'active'
  });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`/api/users`, { ...newUser, role: 'rider' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', status: 'active' });
      fetchUsers(); // Refresh list
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
      fetchUsers(); // Refresh list
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
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update rider status: ' + (error.response?.data?.error || error.message));
    } finally {
      setUpdatingStatus(false);
    }
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
      (user.name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      (user.phone || '').toLowerCase().includes(q) ||
      (user.id || '').toLowerCase().includes(q)
    );

    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Riders Management</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Manage registered riders, monitor account statuses, KYC verifications, and suspension controls.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchUsers}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px 18px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
          >
            <UserPlus size={18} /> Add Rider
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        {/* Search & Filter bar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search riders by name, email or phone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 44px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', background: 'white' }} 
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Filter:</span>
            <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
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

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'white', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Rider Info</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Account Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>KYC Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Wallet Balance</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Joined Date</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No riders found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{user.name}</div>
                    {user.email ? (
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{user.email}</div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No email provided</div>
                    )}
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{user.phone}</div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
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
                  <td style={{ padding: '20px 24px' }}>{getKycBadge(user.kyc_status)}</td>
                  <td style={{ padding: '20px 24px', fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                    ₹{parseFloat(user.wallet_balance || 0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '20px 24px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    {user.joined}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      {/* Suspend / Activate Button */}
                      {user.status === 'suspended' ? (
                        <button 
                          onClick={() => {
                            setUserToToggle(user);
                            setShowSuspendModal(true);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#15803d', transition: 'all 0.2s' }}
                          title="Reactivate Rider"
                        >
                          <CheckCircle2 size={14} /> Activate
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            setUserToToggle(user);
                            setShowSuspendModal(true);
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff7ed', border: '1px solid #fed7aa', padding: '8px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', color: '#c2410c', transition: 'all 0.2s' }}
                          title="Suspend Rider"
                        >
                          <Ban size={14} /> Suspend
                        </button>
                      )}

                      <button 
                        onClick={() => {
                          setEditUser({
                            ...user,
                            email: user.email || ''
                          });
                          setShowEditModal(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }} 
                        onMouseEnter={(e) => {e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'}} 
                        onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'}}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Add New Rider</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" placeholder="e.g., Rajesh Kumar" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                  Email Address <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input type="email" placeholder="rajesh@example.com (optional)" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="tel" placeholder="+91 9999999999" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Account Status</label>
                <select value={newUser.status} onChange={e => setNewUser({...newUser, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', marginTop: '8px' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>Note: The rider will automatically be assigned an empty wallet. They can log in via their phone number.</p>
              </div>

              <button type="submit" style={{ marginTop: '8px', background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Create Rider
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Edit Rider</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Full Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="text" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                  Email Address <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input type="email" placeholder="Optional" value={editUser.email || ''} onChange={e => setEditUser({...editUser, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input required type="tel" value={editUser.phone} onChange={e => setEditUser({...editUser, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select value={editUser.status} onChange={e => setEditUser({...editUser, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>KYC Status</label>
                  <select value={editUser.kyc_status} onChange={e => setEditUser({...editUser, kyc_status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="failed">Failed</option>
                    <option value="verified">Verified (Digilocker)</option>
                  </select>
                </div>
              </div>

              <button type="submit" style={{ marginTop: '8px', background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Confirmation Modal */}
      {showSuspendModal && userToToggle && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 110 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ 
              width: '60px', height: '60px', 
              background: userToToggle.status === 'suspended' ? '#dcfce7' : '#ffedd5', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' 
            }}>
              {userToToggle.status === 'suspended' ? (
                <CheckCircle2 size={28} color="#16a34a" />
              ) : (
                <Ban size={28} color="#ea580c" />
              )}
            </div>
            
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>
              {userToToggle.status === 'suspended' ? 'Reactivate Rider Account?' : 'Suspend Rider Account?'}
            </h2>
            
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              {userToToggle.status === 'suspended' ? (
                <>Are you sure you want to reactivate rider <strong>{userToToggle.name}</strong> ({userToToggle.phone})? This will restore their access to active EV rentals and wallet features.</>
              ) : (
                <>Are you sure you want to suspend rider <strong>{userToToggle.name}</strong> ({userToToggle.phone})? This will prevent them from booking or receiving new vehicles until reactivated.</>
              )}
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={updatingStatus}
                onClick={() => {
                  setShowSuspendModal(false);
                  setUserToToggle(null);
                }} 
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
                  border: 'none', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' 
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
