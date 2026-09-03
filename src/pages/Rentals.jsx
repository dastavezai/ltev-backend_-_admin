import { useState, useEffect } from 'react';
import { Calendar, Clock, CreditCard, Filter, XCircle, RotateCcw, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Rentals() {
  const { token } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

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
    if (!window.confirm(`Confirm EV return for rental #${id}? Vehicle will be marked as available for new bookings.`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/rentals/${id}/confirm-return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('EV return confirmed successfully!');
      fetchRentals();
    } catch (error) {
      alert('Error confirming return: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Rental Bookings History</h1>
          <p style={{ color: '#64748b', margin: 0 }}>View all active, pending, and completed scooter bookings with action controls.</p>
        </div>
        <button 
          onClick={fetchRentals}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 18px', borderRadius: '10px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {rentals.map(rental => {
          const isActive = rental.status === 'active';
          const isPendingReturn = rental.status === 'pending_return';
          const isPendingAssignment = rental.status === 'pending_assignment';
          const isCancelled = rental.status === 'cancelled';

          return (
            <div key={rental.id} style={{ background: 'white', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr auto', gap: '20px', alignItems: 'center' }}>
              
              {/* User & Vehicle */}
              <div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', marginBottom: '4px', fontFamily: 'monospace' }}>{rental.id}</div>
                <h3 style={{ fontSize: '17px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>{rental.user}</h3>
                <div style={{ color: '#475569', fontSize: '13px', fontWeight: '500' }}>{rental.vehicle}</div>
              </div>

              {/* Time */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px', marginBottom: '6px' }}>
                  <Calendar size={14} /> Start: {rental.startTime}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
                  <Clock size={14} /> End: {rental.endTime}
                </div>
              </div>

              {/* Financials */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00a66c', fontSize: '14px', fontWeight: '800', marginBottom: '4px' }}>
                  <CreditCard size={15} /> {rental.rentCollected}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Deposit: {rental.deposit}
                </div>
              </div>

              {/* Status & Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <span style={{ 
                  background: isActive ? '#dcfce7' : isPendingReturn ? '#e0f2fe' : isPendingAssignment ? '#fef3c7' : isCancelled ? '#fee2e2' : '#f1f5f9', 
                  color: isActive ? '#15803d' : isPendingReturn ? '#0284c7' : isPendingAssignment ? '#d97706' : isCancelled ? '#dc2626' : '#475569',
                  padding: '6px 14px', borderRadius: '20px', fontWeight: '800', fontSize: '12px', textTransform: 'uppercase'
                }}>
                  {isActive ? '● Active Rental' : isPendingReturn ? 'Return Pending' : isPendingAssignment ? 'Pending Assign' : isCancelled ? 'Cancelled' : 'Completed'}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {isPendingReturn && (
                    <button
                      onClick={() => handleConfirmReturn(rental.id)}
                      style={{ background: '#00a66c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                    >
                      ✓ Confirm Return
                    </button>
                  )}
                  
                  {(isActive || isPendingAssignment || isPendingReturn) && (
                    <button
                      onClick={() => handleCancelRental(rental.id)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Cancel Rental
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}

        {rentals.length === 0 && !loading && (
          <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '16px', color: '#64748b' }}>
            No rentals recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
