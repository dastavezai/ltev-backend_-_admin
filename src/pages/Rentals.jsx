import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, CreditCard, Filter, Search, Bike, User, ShieldCheck, 
  CheckCircle2, RotateCcw, XCircle, RefreshCw, ChevronRight, Zap, 
  Plus, Edit3, Trash2, X, AlertCircle, Settings, Check
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Rentals() {
  const { token } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  // Modal State for Record / Edit Rental
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingRentalId, setEditingRentalId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    user_id: '',
    vehicle_id: '',
    plan_id: '1',
    start_time: '',
    end_time: '',
    total_cost: '230.00',
    next_payment_date: '',
    status: 'active'
  });

  const fetchRentals = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/rentals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRentals(response.data);
    } catch (error) {
      console.error('Error fetching rentals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    if (!token) return;
    try {
      const [vRes, uRes, pRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/vehicles`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/plans`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setVehicles(vRes.data);
      setUsers(uRes.data);
      setPlans(pRes.data);
    } catch (error) {
      console.error('Error fetching auxiliary data:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRentals();
      fetchAuxData();
    }
  }, [token]);

  // Format ISO date to datetime-local input string YYYY-MM-DDTHH:mm
  const formatForDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const minutes = pad(d.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Format ISO date to date input string YYYY-MM-DD
  const formatForDateLocal = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch {
      return '';
    }
  };

  // Open modal to record new rental
  const handleOpenCreateModal = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    // Default next payment in 7 days
    const nextPay = new Date();
    nextPay.setDate(nextPay.getDate() + 7);
    const nextPayStr = `${nextPay.getFullYear()}-${pad(nextPay.getMonth() + 1)}-${pad(nextPay.getDate())}`;

    setFormData({
      user_id: users.length > 0 ? String(users[0].raw_id || users[0].user_id || users[0].id) : '',
      vehicle_id: vehicles.length > 0 ? vehicles[0].id : '',
      plan_id: plans.length > 0 ? String(plans[0].id) : '1',
      start_time: nowStr,
      end_time: '',
      total_cost: plans.length > 0 ? plans[0].price : '230.00',
      next_payment_date: nextPayStr,
      status: 'active'
    });
    setModalMode('create');
    setEditingRentalId(null);
    setModalOpen(true);
  };

  // Open modal to edit existing rental
  const handleOpenEditModal = (rental) => {
    setFormData({
      user_id: rental.user_id ? String(rental.user_id) : '',
      vehicle_id: rental.vehicle_id || '',
      plan_id: rental.plan_id ? String(rental.plan_id) : '',
      start_time: formatForDateTimeLocal(rental.raw_start_time),
      end_time: formatForDateTimeLocal(rental.raw_end_time),
      total_cost: rental.raw_total_cost !== undefined ? String(rental.raw_total_cost) : '',
      next_payment_date: formatForDateLocal(rental.raw_next_payment_date),
      status: rental.status || 'active'
    });
    setModalMode('edit');
    setEditingRentalId(rental.id);
    setModalOpen(true);
  };

  // Plan selection helper
  const handlePlanChange = (planId) => {
    const selectedPlan = plans.find(p => String(p.id) === String(planId));
    setFormData(prev => ({
      ...prev,
      plan_id: planId,
      total_cost: selectedPlan ? selectedPlan.price : prev.total_cost
    }));
  };

  // Form Submission
  const handleSaveRental = async (e) => {
    e.preventDefault();
    if (!formData.user_id) {
      alert('Please select a rider / user.');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await axios.post(
          `${import.meta.env.VITE_API_URL || ''}/api/rentals/record`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Rental booking created and fleet database updated successfully!');
      } else {
        await axios.put(
          `${import.meta.env.VITE_API_URL || ''}/api/rentals/${editingRentalId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Rental record updated successfully!');
      }
      setModalOpen(false);
      fetchRentals();
      fetchAuxData();
    } catch (error) {
      alert('Error saving rental: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRental = async (id) => {
    if (!window.confirm(`Are you sure you want to cancel / terminate rental #${id}? Any assigned EV will be set back to available.`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/rentals/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Rental cancelled successfully.');
      fetchRentals();
      fetchAuxData();
    } catch (error) {
      alert('Error cancelling rental: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleConfirmReturn = async (id) => {
    if (!window.confirm(`Confirm that vehicle for rental #${id} has been received? It will be marked as available for new bookings.`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/rentals/${id}/confirm-return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('EV return confirmed! Vehicle is now available for new bookings.');
      fetchRentals();
      fetchAuxData();
    } catch (error) {
      alert('Error confirming return: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteRental = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete rental record #${id}? This will remove it from the system.`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/rentals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Rental record deleted.');
      fetchRentals();
      fetchAuxData();
    } catch (error) {
      alert('Error deleting rental: ' + (error.response?.data?.error || error.message));
    }
  };

  // Fleet summary stats
  const totalFleetCount = vehicles.length;
  const activeRentalsCount = rentals.filter(r => r.status === 'active' || r.status === 'in_use').length;
  const availableBikesCount = vehicles.filter(v => v.status === 'available').length;
  const totalRentCollectedSum = rentals
    .filter(r => r.status !== 'cancelled')
    .reduce((acc, r) => acc + (parseFloat(r.raw_total_cost) || 0), 0);

  // Filtering
  const filteredRentals = rentals.filter(r => {
    const matchesSearch = 
      (r.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.user_phone || '').includes(searchQuery) ||
      (r.vehicle_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.vehicle_model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && (r.status === 'active' || r.status === 'in_use')) ||
      (statusFilter === 'completed' && r.status === 'completed') ||
      (statusFilter === 'pending_return' && r.status === 'pending_return') ||
      (statusFilter === 'pending_assignment' && r.status === 'pending_assignment') ||
      (statusFilter === 'cancelled' && r.status === 'cancelled');

    const matchesVehicle = 
      vehicleFilter === 'all' || 
      r.vehicle_id === vehicleFilter;

    return matchesSearch && matchesStatus && matchesVehicle;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>All Rentals & Fleet History</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Manage live active rentals, past backdated bookings, and assign bikes to riders.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchRentals}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          
          <button 
            onClick={handleOpenCreateModal}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '10px', 
              fontWeight: '700', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <Plus size={18} /> Record / Assign Rental
          </button>
        </div>
      </div>

      {/* Fleet Summary Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            <span>Total Fleet Size</span>
            <Bike size={20} color="#6366f1" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '8px' }}>
            {totalFleetCount} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Bikes</span>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
            <span>Currently On Rent</span>
            <Zap size={20} color="#16a34a" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803d', marginTop: '8px' }}>
            {activeRentalsCount} <span style={{ fontSize: '14px', fontWeight: '600', color: '#16a34a' }}>Active Rides</span>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1e40af', fontSize: '13px', fontWeight: '700' }}>
            <span>Available in Hand</span>
            <CheckCircle2 size={20} color="#2563eb" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#1d4ed8', marginTop: '8px' }}>
            {availableBikesCount} <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>Ready to Rent</span>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            <span>Total Rent Volume</span>
            <CreditCard size={20} color="#059669" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '8px' }}>
            ₹{totalRentCollectedSum.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', minWidth: '280px', flex: 1 }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by rider name, phone, EV ID, or rental #..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a' }}
          />
        </div>

        {/* Vehicle Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bike size={16} color="#64748b" />
          <select 
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              background: '#f8fafc', 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#0f172a',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Vehicles (16 Bikes)</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.model || 'EV'} ({v.id}) - {v.status}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active Rides' },
            { id: 'completed', label: 'Completed / Past' },
            { id: 'pending_assignment', label: 'Pending Assign' },
            { id: 'pending_return', label: 'Return Pending' },
            { id: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                background: statusFilter === tab.id ? '#0f172a' : '#f1f5f9',
                color: statusFilter === tab.id ? '#ffffff' : '#64748b',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rentals List Cards */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredRentals.map(rental => {
          const isActive = rental.status === 'active' || rental.status === 'in_use';
          const isPendingReturn = rental.status === 'pending_return';
          const isPendingAssignment = rental.status === 'pending_assignment';
          const isCancelled = rental.status === 'cancelled';
          const isCompleted = rental.status === 'completed';

          return (
            <div 
              key={rental.id} 
              style={{ 
                background: 'white', 
                borderRadius: '18px', 
                padding: '22px 26px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', 
                border: '1px solid #f1f5f9',
                display: 'grid',
                gridTemplateColumns: '1.4fr 1.3fr 1.5fr 1fr auto',
                gap: '20px',
                alignItems: 'center'
              }}
            >
              {/* Column 1: Rider / Person Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '17px', background: 'rgba(29, 122, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} color="#1d7afc" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{rental.user_name}</h3>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>#{rental.id}</div>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#475569', fontWeight: '600' }}>📞 {rental.user_phone}</div>
                {rental.user_email && rental.user_email !== 'N/A' && (
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>✉ {rental.user_email}</div>
                )}
              </div>

              {/* Column 2: EV Information */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '17px', background: rental.vehicle_id ? 'rgba(0, 166, 108, 0.1)' : 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bike size={16} color={rental.vehicle_id ? '#00a66c' : '#d97706'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      {rental.vehicle_model}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      EV ID: <span style={{ fontFamily: 'monospace', color: '#0f172a', fontWeight: '700' }}>{rental.vehicle_id || 'Not Assigned'}</span>
                    </div>
                  </div>
                </div>
                {rental.vehicle_battery !== null && (
                  <div style={{ fontSize: '12px', color: '#00a66c', fontWeight: '700', marginLeft: '42px' }}>
                    ⚡ Battery: {rental.vehicle_battery}%
                  </div>
                )}
              </div>

              {/* Column 3: Plan & Time / Duration */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                  {rental.plan_name} <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'normal' }}>({rental.plan_type})</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', marginBottom: '3px' }}>
                  <Calendar size={13} color="#64748b" /> Start: <span style={{ fontWeight: '700', color: '#0f172a' }}>{rental.startTime}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', marginBottom: '3px' }}>
                  <Clock size={13} color="#64748b" /> Duration: <span style={{ fontWeight: '700', color: '#1d7afc' }}>{rental.duration}</span>
                </div>

                {rental.next_payment_date && (
                  <div style={{ fontSize: '11px', color: '#d97706', fontWeight: '700' }}>
                    🗓 Next Due: {rental.next_payment_date}
                  </div>
                )}
              </div>

              {/* Column 4: Financials */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00a66c', fontSize: '15px', fontWeight: '800', marginBottom: '4px' }}>
                  <CreditCard size={16} /> {rental.rentCollected}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Deposit: <span style={{ fontWeight: '700', color: '#0f172a' }}>{rental.deposit}</span>
                </div>
              </div>

              {/* Column 5: Status & Action Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', minWidth: '150px' }}>
                <span style={{ 
                  background: isActive ? '#dcfce7' : isPendingReturn ? '#e0f2fe' : isPendingAssignment ? '#fef3c7' : isCancelled ? '#fee2e2' : '#f1f5f9', 
                  color: isActive ? '#15803d' : isPendingReturn ? '#0284c7' : isPendingAssignment ? '#d97706' : isCancelled ? '#dc2626' : '#475569',
                  padding: '6px 12px', borderRadius: '20px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase'
                }}>
                  {isActive ? '● Active Rental' : isPendingReturn ? 'Return Pending' : isPendingAssignment ? 'Pending Assign' : isCancelled ? 'Cancelled' : 'Completed'}
                </span>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* Edit / Manage Button */}
                  <button
                    onClick={() => handleOpenEditModal(rental)}
                    title="Edit or Update Booking Details"
                    style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit3 size={13} /> Edit
                  </button>

                  {isPendingReturn && (
                    <button
                      onClick={() => handleConfirmReturn(rental.id)}
                      style={{ background: '#00a66c', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                    >
                      ✓ Return
                    </button>
                  )}
                  
                  {(isActive || isPendingAssignment || isPendingReturn) && (
                    <button
                      onClick={() => handleCancelRental(rental.id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteRental(rental.id)}
                    title="Delete Record"
                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {filteredRentals.length === 0 && !loading && (
          <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '20px', color: '#64748b', border: '1px solid #f1f5f9' }}>
            <Bike size={44} color="#94a3b8" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>No Rental Records Found</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>No rentals match your current search or status filter.</p>
            <button 
              onClick={handleOpenCreateModal}
              style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              + Record a Rental Booking
            </button>
          </div>
        )}
      </div>

      {/* Record / Edit Rental Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={22} color="#059669" />
                </div>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    {modalMode === 'create' ? 'Record / Assign Rental Booking' : `Edit Rental Record #${editingRentalId}`}
                  </h2>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    {modalMode === 'create' ? 'Assign a bike to a rider or backdate a previous rental.' : 'Update rider assignment, duration, price, or rental status.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRental} style={{ display: 'grid', gap: '18px' }}>
              {/* Rider Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Rider / Customer <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  required
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                >
                  <option value="">-- Select Rider --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.raw_id || u.user_id || u.id}>
                      {u.name} (📞 {u.phone}) {u.kyc_status === 'verified' ? '✓ Verified' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Vehicle / Bike Assignment (16 Bikes Available)
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                >
                  <option value="">-- No Vehicle Assigned (Pending) --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.model || 'EV'} (ID: {v.id}) — Status: {v.status.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Plan & Pricing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Rental Plan
                  </label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price} / {p.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Rent Collected / Total Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.total_cost}
                    onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Dates & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    End Date & Time (Optional for Active)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Next Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.next_payment_date}
                    onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Rental Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none', fontWeight: '700' }}
                  >
                    <option value="active">Active Rental (In-Use)</option>
                    <option value="completed">Completed (Past Booking)</option>
                    <option value="pending_return">Return Pending</option>
                    <option value="pending_assignment">Pending Assignment</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Status Note */}
              <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '12px', color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} color="#16a34a" />
                <span>
                  {formData.status === 'active' 
                    ? 'Setting this to "Active" will automatically mark the selected bike as Rented (Green) in the Vehicle Fleet and Calendar.' 
                    : 'Setting this to "Completed" stores the booking history and releases the vehicle back to Available.'}
                </span>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#0f172a', color: 'white', fontWeight: '700', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Create & Assign Booking' : 'Update Rental Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
