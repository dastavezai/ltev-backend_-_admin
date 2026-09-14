import { useState, useEffect, useMemo } from 'react';
import { 
  Search, MapPin, Bike, Plus, AlertCircle, CheckCircle2, X, 
  ArrowUpDown, Filter, RefreshCw, ChevronDown, Check, ShieldCheck 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'available' | 'rented' | 'maintenance'
  const [locationFilter, setLocationFilter] = useState('all');
  const [sortBy, setSortBy] = useState('id-asc'); // 'id-asc' | 'id-desc' | 'model-asc' | 'status'

  // New Vehicle Form State
  const [newVehicle, setNewVehicle] = useState({
    model: '', type: 'Electric Scooter', status: 'available', 
    location: '', chassis_number: '', registration_number: ''
  });
  
  const navigate = useNavigate();

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

  useEffect(() => {
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
      setNewVehicle({ model: '', type: 'Electric Scooter', status: 'available', location: stands[0]?.name || '', chassis_number: '', registration_number: '' });
      fetchVehicles(); // Refresh list
    } catch (error) {
      console.error('Error adding vehicle:', error);
      alert('Failed to add vehicle: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusBadge = (status, renter) => {
    const isRented = status === 'rented' || status === 'in_use' || Boolean(renter);
    if (isRented) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
          <Bike size={14} /> Rented (In Use)
        </span>
      );
    }
    switch (status) {
      case 'available': 
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
            <CheckCircle2 size={14} /> Available
          </span>
        );
      case 'maintenance': 
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
            <AlertCircle size={14} /> Maintenance
          </span>
        );
      default: 
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
            {status}
          </span>
        );
    }
  };

  // Fleet Counts
  const fleetCounts = useMemo(() => {
    let available = 0;
    let rented = 0;
    let maintenance = 0;
    
    vehicles.forEach(v => {
      const isRented = v.status === 'rented' || v.status === 'in_use' || Boolean(v.renter);
      if (isRented) rented++;
      else if (v.status === 'maintenance') maintenance++;
      else available++;
    });

    return { total: vehicles.length, available, rented, maintenance };
  }, [vehicles]);

  // Filtered & Sorted Vehicles
  const filteredAndSortedVehicles = useMemo(() => {
    return vehicles
      .filter(v => {
        // Search query filter
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q || (
          (v.id || '').toLowerCase().includes(q) ||
          (v.model || '').toLowerCase().includes(q) ||
          (v.location || '').toLowerCase().includes(q) ||
          (v.chassis_number || '').toLowerCase().includes(q) ||
          (v.registration_number || '').toLowerCase().includes(q) ||
          (v.renter || '').toLowerCase().includes(q)
        );

        // Status filter
        const isRented = v.status === 'rented' || v.status === 'in_use' || Boolean(v.renter);
        let matchesStatus = true;
        if (statusFilter === 'available') {
          matchesStatus = v.status === 'available' && !v.renter;
        } else if (statusFilter === 'rented') {
          matchesStatus = isRented;
        } else if (statusFilter === 'maintenance') {
          matchesStatus = v.status === 'maintenance';
        }

        // Location filter
        const matchesLocation = locationFilter === 'all' || v.location === locationFilter;

        return matchesSearch && matchesStatus && matchesLocation;
      })
      .sort((a, b) => {
        if (sortBy === 'id-asc') {
          return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
        }
        if (sortBy === 'id-desc') {
          return (b.id || '').localeCompare(a.id || '', undefined, { numeric: true });
        }
        if (sortBy === 'model-asc') {
          return (a.model || '').localeCompare(b.model || '');
        }
        if (sortBy === 'status') {
          return (a.status || '').localeCompare(b.status || '');
        }
        if (sortBy === 'location') {
          return (a.location || '').localeCompare(b.location || '');
        }
        return 0;
      });
  }, [vehicles, searchQuery, statusFilter, locationFilter, sortBy]);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Vehicle Fleet Management</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Monitor live fleet availability, rider assignments, battery health, and maintenance.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchVehicles}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px 18px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
          >
            <Plus size={18} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Fleet Overview KPI Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div 
          onClick={() => setStatusFilter('all')}
          style={{ 
            background: statusFilter === 'all' ? '#0f172a' : 'white', 
            color: statusFilter === 'all' ? 'white' : '#0f172a',
            padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', 
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.8 }}>Total Vehicles</div>
          <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px' }}>{fleetCounts.total}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('available')}
          style={{ 
            background: statusFilter === 'available' ? '#0284c7' : 'white', 
            color: statusFilter === 'available' ? 'white' : '#0369a1',
            padding: '16px 20px', borderRadius: '16px', border: '1px solid #bae6fd', 
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>Available at Stand</div>
          <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px' }}>{fleetCounts.available}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('rented')}
          style={{ 
            background: statusFilter === 'rented' ? '#16a34a' : 'white', 
            color: statusFilter === 'rented' ? 'white' : '#15803d',
            padding: '16px 20px', borderRadius: '16px', border: '1px solid #bbf7d0', 
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>Live Rented / In-Use</div>
          <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px' }}>{fleetCounts.rented}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('maintenance')}
          style={{ 
            background: statusFilter === 'maintenance' ? '#d97706' : 'white', 
            color: statusFilter === 'maintenance' ? 'white' : '#b45309',
            padding: '16px 20px', borderRadius: '16px', border: '1px solid #fde68a', 
            cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', opacity: 0.9 }}>Under Maintenance</div>
          <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px' }}>{fleetCounts.maintenance}</div>
        </div>
      </div>

      {/* Main Table Card with Search, Filter & Sort Bar */}
      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        {/* Controls Bar */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search by ID, Model, Location, or Rider..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 12px 12px 44px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', background: 'white' }} 
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filter & Sort Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 12px' }}>
              <Filter size={14} color="#64748b" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Status:</span>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="all">All ({fleetCounts.total})</option>
                <option value="available">Available ({fleetCounts.available})</option>
                <option value="rented">Rented / In-Use ({fleetCounts.rented})</option>
                <option value="maintenance">Maintenance ({fleetCounts.maintenance})</option>
              </select>
            </div>

            {/* Stand / Location Filter */}
            {stands.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 12px' }}>
                <MapPin size={14} color="#64748b" />
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Stand:</span>
                <select 
                  value={locationFilter} 
                  onChange={(e) => setLocationFilter(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}
                >
                  <option value="all">All Stands</option>
                  {stands.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Option */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '6px 12px' }}>
              <ArrowUpDown size={14} color="#64748b" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Sort:</span>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}
              >
                <option value="id-asc">Reg ID (A to Z)</option>
                <option value="id-desc">Reg ID (Z to A)</option>
                <option value="model-asc">Model Name</option>
                <option value="status">Status</option>
                <option value="location">Stand Location</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vehicles Table */}
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: 'white', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Vehicle</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Live Status</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Current Stand</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Assigned Rider</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedVehicles.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                  <Bike size={36} style={{ margin: '0 auto 12px auto', opacity: 0.4, display: 'block' }} />
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#475569' }}>No vehicles match your criteria</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Try resetting your search query or status filter.</div>
                </td>
              </tr>
            ) : (
              filteredAndSortedVehicles.map(vehicle => (
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
                  <td style={{ padding: '20px 24px' }}>
                    {getStatusBadge(vehicle.status, vehicle.renter)}
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#475569', fontWeight: '500' }}>
                      <MapPin size={16} color="#94a3b8" /> {vehicle.location}
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    {vehicle.renter ? (
                      <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Bike size={15} /> {vehicle.renter}
                      </div>
                    ) : (
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>None (Idle)</span>
                    )}
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/vehicles/${vehicle.id}`); }}
                      style={{ background: '#f1f5f9', color: '#2563eb', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#e0f2fe'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
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
                  <input required type="text" placeholder="e.g., CHS-99210" value={newVehicle.chassis_number} onChange={e => setNewVehicle({...newVehicle, chassis_number: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Registration Number</label>
                  <input required type="text" placeholder="e.g., DL-01-AB-1234" value={newVehicle.registration_number} onChange={e => setNewVehicle({...newVehicle, registration_number: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
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
