import { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock, XCircle, Bike, RotateCcw, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function RentalRequests() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('assignment'); // 'assignment' | 'returns'
  const [requests, setRequests] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    if (token) {
      fetchRequests();
      fetchReturnRequests();
      fetchAvailableVehicles();
    }
  }, [token]);

  const fetchRequests = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get('/api/rentals/pending', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnRequests = async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/rentals/return-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReturnRequests(response.data);
    } catch (error) {
      console.error('Error fetching return requests:', error);
    }
  };

  const fetchAvailableVehicles = async () => {
    if (!token) return;
    try {
      const response = await axios.get('/api/vehicles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableVehicles(response.data.filter(v => v.status === 'available'));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleAssignClick = (request) => {
    setSelectedRequest(request);
    setPaymentConfirmed(false);
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!paymentConfirmed) return alert('Please confirm payment receipt.');
    if (!selectedVehicleId) return alert('Please select a vehicle');
    try {
      await axios.put(`/api/rentals/${selectedRequest.id}/assign`, {
        vehicle_id: selectedVehicleId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAssignModal(false);
      setSelectedRequest(null);
      setSelectedVehicleId('');
      alert('EV assigned successfully!');
      fetchRequests();
      fetchAvailableVehicles();
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      alert('Failed to assign EV: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleCancelRequest = async (id) => {
    if (!window.confirm('Are you sure you want to cancel / reject this rental request?')) return;
    try {
      await axios.post(`/api/rentals/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Rental request cancelled.');
      fetchRequests();
      fetchAvailableVehicles();
    } catch (error) {
      alert('Error cancelling request: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConfirmReturn = async (id) => {
    if (!window.confirm('Confirm that this vehicle has been submitted and returned? It will be marked as available.')) return;
    try {
      await axios.post(`/api/rentals/${id}/confirm-return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Vehicle return confirmed! EV is now available for new bookings.');
      fetchReturnRequests();
      fetchAvailableVehicles();
    } catch (error) {
      alert('Error confirming return: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Rental & EV Operations</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Manage EV allocation for new bookings and confirm completed EV returns.</p>
        </div>
        <button 
          onClick={() => { fetchRequests(); fetchReturnRequests(); fetchAvailableVehicles(); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('assignment')}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'assignment' ? '#00a66c' : '#f1f5f9',
            color: activeTab === 'assignment' ? '#ffffff' : '#64748b',
          }}
        >
          <Bike size={18} /> EV Assignment Requests ({requests.length})
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          style={{
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeTab === 'returns' ? '#1d7afc' : '#f1f5f9',
            color: activeTab === 'returns' ? '#ffffff' : '#64748b',
          }}
        >
          <RotateCcw size={18} /> EV Return Submissions ({returnRequests.length})
        </button>
      </div>

      {/* Assignment Tab */}
      {activeTab === 'assignment' && (
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <tr>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Request ID</th>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>User</th>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Plan Details</th>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '18px 20px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>{req.id}</td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.user_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{req.user_phone}</div>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.plan_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{req.plan_type} • ₹{req.cost}</div>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
                      <Clock size={13} /> PENDING ASSIGNMENT
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleAssignClick(req)}
                        style={{ background: '#00a66c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Assign EV
                      </button>
                      <button 
                        onClick={() => handleCancelRequest(req.id)}
                        style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <CheckCircle size={36} color="#00a66c" style={{ marginBottom: '8px', opacity: 0.6 }} />
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No Pending Assignment Requests</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>All driver bookings have been allocated vehicles.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Return Tab */}
      {activeTab === 'returns' && (
        <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <tr>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Rental ID</th>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>User</th>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Assigned EV</th>
                <th style={{ padding: '16px 20px', fontWeight: '600' }}>Plan Details</th>
                <th style={{ padding: '16px 20px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returnRequests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '18px 20px', fontFamily: 'monospace', fontWeight: '700', color: '#0f172a' }}>{req.id}</td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.user_name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{req.user_phone}</div>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.vehicle_model || 'LT.ev Scooter'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>Vehicle ID: {req.vehicle_id || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '18px 20px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.plan_name}</div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', marginTop: '4px' }}>
                      RETURN SUBMITTED
                    </span>
                  </td>
                  <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                    <button 
                      onClick={() => handleConfirmReturn(req.id)}
                      style={{ background: '#00a66c', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 166, 108, 0.2)' }}
                    >
                      ✓ Confirm EV Submitted
                    </button>
                  </td>
                </tr>
              ))}
              {returnRequests.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <RotateCcw size={36} color="#94a3b8" style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No Pending Return Submissions</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>When riders submit their vehicle return on the app, they will appear here.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign EV Modal */}
      {showAssignModal && selectedRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Assign EV to {selectedRequest.user_name}</h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Plan: {selectedRequest.plan_name} (₹{selectedRequest.cost})</p>
            </div>
            
            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>Select Available EV</label>
                <select 
                  required 
                  value={selectedVehicleId} 
                  onChange={e => setSelectedVehicleId(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '14px' }}
                >
                  <option value="" disabled>-- Choose an available vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.type}) - Battery: {v.battery}%</option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <input 
                  type="checkbox" 
                  checked={paymentConfirmed} 
                  onChange={(e) => setPaymentConfirmed(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: '#00a66c', marginTop: '2px' }}
                />
                <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: '600', lineHeight: '18px' }}>
                  I confirm that plan booking amount (₹{selectedRequest.cost}) has been verified.
                </span>
              </label>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '12px', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!paymentConfirmed || !selectedVehicleId}
                  style={{ flex: 1, background: paymentConfirmed && selectedVehicleId ? '#00a66c' : '#94a3b8', color: 'white', padding: '12px', borderRadius: '10px', fontWeight: '700', border: 'none', cursor: paymentConfirmed && selectedVehicleId ? 'pointer' : 'not-allowed' }}
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
