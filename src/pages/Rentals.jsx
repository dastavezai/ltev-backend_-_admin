import { useState, useEffect } from 'react';
import { Calendar, Clock, CreditCard, Filter, Search, Bike, User, ShieldCheck, CheckCircle2, RotateCcw, XCircle, RefreshCw, ChevronRight, Zap } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Rentals() {
  const { token } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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

  useEffect(() => {
    if (token) {
      fetchRentals();
    }
  }, [token]);

  const handleCancelRental = async (id) => {
    if (!window.confirm(`Are you sure you want to cancel / terminate rental #${id}? Any assigned EV will be set back to available.`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/rentals/${id}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Rental cancelled successfully.');
      fetchRentals();
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
    } catch (error) {
      alert('Error confirming return: ' + (error.response?.data?.error || error.message));
    }
  };

  const filteredRentals = rentals.filter(r => {
    const matchesSearch = 
      (r.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.user_phone || '').includes(searchQuery) ||
      (r.vehicle_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.vehicle_model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>All Rentals & Usage History</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Track which rider rented which EV, total duration, next payment date, and booking status.</p>
        </div>
        <button 
          onClick={fetchRentals}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', minWidth: '320px', flex: 1 }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by rider name, phone, EV ID, or rental #..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a' }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active Rides' },
            { id: 'pending_assignment', label: 'Pending Assign' },
            { id: 'pending_return', label: 'Return Pending' },
            { id: 'completed', label: 'Completed' },
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
          const isActive = rental.status === 'active';
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
                padding: '24px 28px', 
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', 
                border: '1px solid #f1f5f9',
                display: 'grid',
                gridTemplateColumns: '1.4fr 1.4fr 1.6fr 1fr auto',
                gap: '24px',
                alignItems: 'center'
              }}
            >
              {/* Column 1: Rider / Person Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: 'rgba(29, 122, 252, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} color="#1d7afc" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{rental.user_name}</h3>
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
                  <div style={{ width: '32px', height: '32px', borderRadius: '16px', background: rental.vehicle_id ? 'rgba(0, 166, 108, 0.1)' : 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bike size={16} color={rental.vehicle_id ? '#00a66c' : '#d97706'} />
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      {rental.vehicle_model}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                      EV ID: <span style={{ fontFamily: 'monospace', color: '#0f172a' }}>{rental.vehicle_id || 'Not Assigned'}</span>
                    </div>
                  </div>
                </div>
                {rental.vehicle_battery !== null && (
                  <div style={{ fontSize: '12px', color: '#00a66c', fontWeight: '700', marginLeft: '40px' }}>
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
                  padding: '6px 14px', borderRadius: '20px', fontWeight: '800', fontSize: '11px', textTransform: 'uppercase'
                }}>
                  {isActive ? '● Active Rental' : isPendingReturn ? 'Return Pending' : isPendingAssignment ? 'Pending Assign' : isCancelled ? 'Cancelled' : 'Completed'}
                </span>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {isPendingReturn && (
                    <button
                      onClick={() => handleConfirmReturn(rental.id)}
                      style={{ background: '#00a66c', color: 'white', border: 'none', padding: '7px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                    >
                      ✓ Confirm Return
                    </button>
                  )}
                  
                  {(isActive || isPendingAssignment || isPendingReturn) && (
                    <button
                      onClick={() => handleCancelRental(rental.id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Cancel Rental
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {filteredRentals.length === 0 && !loading && (
          <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '20px', color: '#64748b', border: '1px solid #f1f5f9' }}>
            <Bike size={44} color="#94a3b8" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>No Rental Records Found</h3>
            <p style={{ margin: 0, fontSize: '13px' }}>No rentals match your current search or status filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
