import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MapPin, Clock, Activity, Settings, Wrench, CalendarDays, Bike, Info, Trash2, X } from 'lucide-react';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    model: '', type: '', status: '', location: '', chassis_number: ''
  });

  const fetchVehicleDetailsAndStands = async () => {
    try {
      const [vehicleRes, standsRes] = await Promise.all([
        axios.get(`/api/vehicles/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get('/api/stands', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setVehicle(vehicleRes.data);
      setStands(standsRes.data);
      setEditForm({
        model: vehicleRes.data.model,
        type: vehicleRes.data.type,
        status: vehicleRes.data.status,
        location: vehicleRes.data.location,
        chassis_number: vehicleRes.data.chassis_number || ''
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleDetails = async () => {
    try {
      const response = await axios.get(`/api/vehicles/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setVehicle(response.data);
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
    }
  };

  useEffect(() => {
    fetchVehicleDetailsAndStands();
  }, [id]);

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/vehicles/${id}`, editForm);
      setShowEditModal(false);
      fetchVehicleDetails();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle');
    }
  };

  const handleDeleteVehicle = async () => {
    try {
      await axios.delete(`/api/vehicles/${id}`);
      navigate('/vehicles');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading vehicle details...</div>;
  }

  if (!vehicle) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>Vehicle Not Found</h2>
        <button onClick={() => navigate('/vehicles')} style={{ marginTop: '16px', padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Back to Fleet</button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <button 
        onClick={() => navigate('/vehicles')}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={18} /> Back to Fleet
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {vehicle.model}
            <span style={{ fontSize: '14px', background: vehicle.status === 'rented' ? '#e0f2fe' : vehicle.status === 'available' ? '#d1fae5' : '#fee2e2', color: vehicle.status === 'rented' ? '#0284c7' : vehicle.status === 'available' ? '#059669' : '#dc2626', padding: '4px 12px', borderRadius: '20px', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
              {vehicle.status}
            </span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '16px', fontFamily: 'monospace', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px', display: 'inline-block' }}>{vehicle.id}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowEditModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Settings size={18} /> Configure
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f59e0b', border: 'none', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', color: 'white', boxShadow: '0 4px 12px rgba(245,158,11,0.2)' }}>
            <Wrench size={18} /> Send to Maintenance
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        {/* Core Identity */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color="#3b82f6" /> Registration Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Registration Number</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>{vehicle.registration_number || vehicle.id}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Chassis Number</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', fontFamily: 'monospace' }}>{vehicle.chassis_number || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#8b5cf6" /> Current Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Current Status</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', textTransform: 'capitalize' }}>{vehicle.status}</div>
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Disbursed Stand</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '15px', fontWeight: '600', color: '#334155', marginTop: '4px' }}>
                <MapPin size={18} color="#f43f5e" style={{ flexShrink: 0, marginTop: '2px' }} />
                {vehicle.location}
              </div>
            </div>
          </div>
        </div>

        {/* Current Renter (if any) */}
        <div style={{ background: vehicle.status === 'rented' ? '#eff6ff' : '#f8fafc', padding: '24px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: vehicle.status === 'rented' ? '1px solid #bfdbfe' : '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: vehicle.status === 'rented' ? '#1d4ed8' : '#64748b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bike size={18} /> Active Ride
          </h3>
          {vehicle.status === 'rented' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '600' }}>Current Renter</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e3a8a' }}>{vehicle.current_renter}</div>
              </div>
              <div>
                <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '600' }}>Ride Started</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} /> {new Date(vehicle.current_rental_start).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: '500' }}>
              Vehicle is not currently rented.
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Rental History */}
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={22} color="#8b5cf6" /> Rental History
          </h3>
          {vehicle.rental_history && vehicle.rental_history.length > 0 ? (
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                <tr>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderRadius: '8px 0 0 8px' }}>Rider</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Time</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Cost</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', borderRadius: '0 8px 8px 0', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicle.rental_history.map(rental => (
                  <tr key={rental.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>{rental.user_name}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#475569' }}>
                      <div style={{ fontWeight: '500', color: '#334155' }}>{new Date(rental.start_time).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</div>
                      <div style={{ fontSize: '12px' }}>{new Date(rental.start_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata'})} - {rental.end_time ? new Date(rental.end_time).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata'}) : 'Ongoing'}</div>
                    </td>
                    <td style={{ padding: '16px', fontWeight: '700', color: '#0f172a' }}>{rental.total_cost ? `₹${rental.total_cost}` : '-'}</td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <span style={{ background: rental.status === 'completed' ? '#f1f5f9' : '#e0f2fe', color: rental.status === 'completed' ? '#475569' : '#0284c7', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', textTransform: 'capitalize' }}>
                        {rental.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>No historical rentals found for this vehicle.</p>
          )}
        </div>

        {/* Maintenance Logs */}
        <div style={{ background: 'white', padding: '32px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={22} color="#f59e0b" /> Maintenance Logs
          </h3>
          {vehicle.maintenance_logs && vehicle.maintenance_logs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {vehicle.maintenance_logs.map(log => (
                <div key={log.id} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>{new Date(log.date_reported).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', background: log.status === 'resolved' ? '#d1fae5' : '#fee2e2', color: log.status === 'resolved' ? '#059669' : '#dc2626', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                      {log.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', lineHeight: '1.4' }}>{log.issue_description}</p>
                  {log.cost && <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Cost: ₹{log.cost}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>No maintenance records found.</p>
          )}
        </div>
      </div>
      
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowDeleteModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fee2e2', border: '1px solid #fecaca', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', color: '#dc2626', transition: 'all 0.2s' }}>
          <Trash2 size={18} /> Delete Vehicle
        </button>
      </div>

      {/* Configure Vehicle Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Configure Vehicle</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleEditVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Model</label>
                <input required type="text" value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Chassis Number</label>
                <input required type="text" value={editForm.chassis_number} onChange={e => setEditForm({...editForm, chassis_number: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Disbursed Stand</label>
                <select required value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  {stands.length === 0 && <option value="">No stands available</option>}
                  {stands.map(stand => (
                    <option key={stand.id} value={stand.name}>{stand.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginTop: '8px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Note: The Registration Number ({vehicle.id}) cannot be changed.</p>
              </div>

              <button type="submit" style={{ marginTop: '8px', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <Trash2 size={32} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Delete Vehicle?</h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to permanently delete <strong>{vehicle.model} ({vehicle.id})</strong>? This will also permanently destroy all its rental and maintenance history. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteVehicle} style={{ flex: 1, padding: '12px', background: '#dc2626', border: 'none', color: 'white', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Delete Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
