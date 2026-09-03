import { useState, useEffect } from 'react';
import { Calendar, Clock, CreditCard, Filter } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Rentals() {
  const { token } = useAuth();
  const [rentals, setRentals] = useState([]);

  useEffect(() => {
    const fetchRentals = async () => {
      if (!token) return;
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/rentals`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRentals(response.data);
      } catch (error) {
        console.error('Error fetching rentals:', error);
      }
    };
    if (token) {
      fetchRentals();
    }
  }, [token]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a' }}>Rental Bookings History</h1>
        <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: '500', cursor: 'pointer' }}>
          <Filter size={16} /> Filter
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {rentals.map(rental => (
          <div key={rental.id} style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '20px', alignItems: 'center' }}>
            
            {/* User & Vehicle */}
            <div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', marginBottom: '4px', fontFamily: 'monospace' }}>{rental.id}</div>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>{rental.user}</h3>
              <div style={{ color: '#475569', fontSize: '14px', fontWeight: '500' }}>{rental.vehicle}</div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                <CreditCard size={14} /> Rent: {rental.rentCollected}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Deposit: {rental.deposit}
              </div>
            </div>

            {/* Status */}
            <div style={{ textAlign: 'right' }}>
              <span style={{ 
                background: rental.status === 'active' ? '#e0f2fe' : '#f1f5f9', 
                color: rental.status === 'active' ? '#0284c7' : '#475569',
                padding: '8px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '13px'
              }}>
                {rental.status === 'active' ? '● Active Rental' : 'Completed'}
              </span>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
