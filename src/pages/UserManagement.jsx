import { useState, useEffect } from 'react';
import { Search, UserPlus, Filter, ShieldCheck, ShieldAlert, Shield, X } from 'lucide-react';
import axios from 'axios';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newUser, setNewUser] = useState({
    name: '', email: '', phone: '', role: 'customer', status: 'active'
  });
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

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
      await axios.post(`/api/users`, newUser, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', phone: '', role: 'customer', status: 'active' });
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/users/${editUser.id}`, editUser, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowEditModal(false);
      setEditUser(null);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
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

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>User Management</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
            <Filter size={16} /> Filter
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
          >
            <UserPlus size={18} /> Add User
          </button>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search users by name, email or phone..." 
              style={{ width: '100%', padding: '12px 12px 12px 44px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px', background: 'white' }} 
            />
          </div>
        </div>

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'white', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>User Info</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Role / Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>KYC Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Wallet Balance</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Joined Date</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{user.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>{user.email}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{user.phone}</div>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <span style={{ display: 'inline-block', background: user.role === 'driver' ? '#f5f3ff' : '#eff6ff', color: user.role === 'driver' ? '#7c3aed' : '#2563eb', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize', marginBottom: '8px' }}>
                    {user.role}
                  </span>
                  <div>
                    <span style={{ display: 'inline-block', background: user.status === 'active' ? '#d1fae5' : user.status === 'pending' ? '#fef3c7' : '#fee2e2', color: user.status === 'active' ? '#059669' : user.status === 'pending' ? '#d97706' : '#dc2626', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                      {user.status}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '20px 24px' }}>{getKycBadge(user.kyc_status)}</td>
                <td style={{ padding: '20px 24px', fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                  ₹{user.wallet_balance}
                </td>
                <td style={{ padding: '20px 24px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                  {user.joined}
                </td>
                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                  <button 
                    onClick={() => {
                      setEditUser(user);
                      setShowEditModal(true);
                    }}
                    style={{ background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', color: '#475569', transition: 'all 0.2s' }} 
                    onMouseEnter={(e) => {e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'}} 
                    onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'}}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Add New User</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Full Name</label>
                <input required type="text" placeholder="e.g., Rajesh Kumar" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Email Address</label>
                <input required type="email" placeholder="rajesh@example.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Phone Number</label>
                <input required type="tel" placeholder="+91 9999999999" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="customer">Customer</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select value={newUser.status} onChange={e => setNewUser({...newUser, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div style={{ padding: '12px', background: '#eff6ff', borderRadius: '8px', marginTop: '8px' }}>
                <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>Note: The user will automatically be assigned an empty wallet. They can log in via their phone number or email (password feature disabled in phase 1).</p>
              </div>

              <button type="submit" style={{ marginTop: '8px', background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Create User
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Edit User</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Full Name</label>
                <input required type="text" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Email Address</label>
                <input required type="email" value={editUser.email} onChange={e => setEditUser({...editUser, email: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Phone Number</label>
                <input required type="tel" value={editUser.phone} onChange={e => setEditUser({...editUser, phone: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Role</label>
                  <select value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="customer">Customer</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select value={editUser.status} onChange={e => setEditUser({...editUser, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>KYC Status</label>
                <select value={editUser.kyc_status} onChange={e => setEditUser({...editUser, kyc_status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="failed">Failed</option>
                  <option value="verified">Verified (Digilocker)</option>
                </select>
              </div>

              <button type="submit" style={{ marginTop: '8px', background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
