import { useState, useEffect } from 'react';
import { Search, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

export default function RentalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchAvailableVehicles();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/api/rentals/pending', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVehicles = async () => {
    try {
      const response = await axios.get('/api/vehicles', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
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
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowAssignModal(false);
      setSelectedRequest(null);
      setSelectedVehicleId('');
      fetchRequests();
      fetchAvailableVehicles(); // refresh available vehicles
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      alert('Failed to assign EV');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>EV Assignment Requests</h1>
      </div>

      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#fafafa', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Request ID</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>User</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Plan</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '20px 24px', fontWeight: '700', color: '#0f172a' }}>{req.id}</td>
                <td style={{ padding: '20px 24px', color: '#475569' }}>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>{req.user_name}</div>
                  <div style={{ fontSize: '12px' }}>{req.user_phone}</div>
                </td>
                <td style={{ padding: '20px 24px', color: '#475569' }}>
                  <div style={{ fontWeight: '600', color: '#0f172a' }}>{req.plan_name}</div>
                  <div style={{ fontSize: '12px' }}>{req.plan_type} • ₹{req.cost}</div>
                </td>
                <td style={{ padding: '20px 24px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#d97706', padding: '4px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' }}>
                    <Clock size={14} /> Pending
                  </span>
                </td>
                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleAssignClick(req)}
                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.2s' }}
                  >
                    Assign EV
                  </button>
                </td>
              </tr>
            ))}
            {requests.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No pending requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAssignModal && selectedRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a' }}>Assign EV to {selectedRequest.user_name}</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>Plan: {selectedRequest.plan_name}</p>
            </div>
            
            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Select Available EV</label>
                <select 
                  required 
                  value={selectedVehicleId} 
                  onChange={e => setSelectedVehicleId(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontSize: '15px' }}
                >
                  <option value="" disabled>-- Choose a vehicle --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name} ({v.type}) - Battery: {v.battery}%</option>
                  ))}
                </select>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <input 
                  type="checkbox" 
                  checked={paymentConfirmed} 
                  onChange={(e) => setPaymentConfirmed(e.target.checked)} 
                  style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                />
                <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: '500' }}>
                  I confirm that ₹{selectedRequest.cost} has been successfully received in our bank account.
                </span>
              </label>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAssignModal(false)}
                  style={{ flex: 1, background: '#f1f5f9', color: '#475569', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!paymentConfirmed || !selectedVehicleId}
                  style={{ flex: 1, background: paymentConfirmed && selectedVehicleId ? '#10b981' : '#94a3b8', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: paymentConfirmed && selectedVehicleId ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
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
