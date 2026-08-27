import { useState, useEffect } from 'react';
import { Search, MapPin, Bike, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Vehicle Form State
  const [newVehicle, setNewVehicle] = useState({
    model: '', type: 'Electric Scooter', status: 'available', 
    location: '', chassis_number: '', registration_number: ''
  });
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVehiclesAndStands = async () => {
      try {
        const [vehiclesRes, standsRes] = await Promise.all([
          axios.get('/api/vehicles', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get('/api/stands', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
        ]);
        setVehicles(vehiclesRes.data);
        setStands(standsRes.data);
        
        // Default location to the first stand if available
        if (standsRes.data.length > 0) {
          setNewVehicle(prev => ({ ...prev, location: standsRes.data[0].name }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVehiclesAndStands();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await axios.get('/api/vehicles', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setVehicles(response.data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/vehicles', newVehicle, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowAddModal(false);
      setNewVehicle({ model: '', type: 'Electric Scooter', status: 'available', location: '', chassis_number: '', registration_number: '' });
      fetchVehicles(); // Refresh list
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to add vehicle');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}><CheckCircle2 size={14}/> Available</span>;
      case 'rented': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0284c7', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}><Bike size={14}/> Rented</span>;
      case 'maintenance': return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}><AlertCircle size={14}/> Maintenance</span>;
      default: return null;
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>Vehicle Fleet Management</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px 16px', borderRadius: '8px', border: 'none', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.2s, boxShadow 0.2s' }}
        >
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '16px', background: '#fafafa' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by ID, Model, or Location..." 
              style={{ width: '100%', padding: '12px 12px 12px 44px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '15px', background: 'white' }} 
            />
          </div>
        </div>

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'white', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Vehicle</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Current Location</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Current Renter</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map(vehicle => (
              <tr 
                key={vehicle.id} 
                onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                style={{ borderTop: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>{vehicle.model}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>{vehicle.id}</div>
                </td>
                <td style={{ padding: '20px 24px' }}>{getStatusBadge(vehicle.status)}</td>
                <td style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                    <MapPin size={16} color="#94a3b8" /> {vehicle.location}
                  </div>
                </td>
                <td style={{ padding: '20px 24px', fontSize: '14px', color: '#475569', fontWeight: vehicle.renter ? '700' : '500' }}>
                  {vehicle.renter || <span style={{ color: '#94a3b8' }}>None</span>}
                </td>
                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/vehicles/${vehicle.id}`); }}
                    style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Add New Vehicle</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleAddVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Model</label>
                <input required type="text" placeholder="e.g., Ather 450X" value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Chassis Number</label>
                  <input required type="text" value={newVehicle.chassis_number} onChange={e => setNewVehicle({...newVehicle, chassis_number: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Registration Number</label>
                  <input required type="text" value={newVehicle.registration_number} onChange={e => setNewVehicle({...newVehicle, registration_number: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select value={newVehicle.status} onChange={e => setNewVehicle({...newVehicle, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Disbursed Stand</label>
                <select required value={newVehicle.location} onChange={e => setNewVehicle({...newVehicle, location: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  {stands.length === 0 && <option value="">No stands available</option>}
                  {stands.map(stand => (
                    <option key={stand.id} value={stand.name}>{stand.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" style={{ marginTop: '16px', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Add Vehicle
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
