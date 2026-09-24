import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Bell, CheckCircle2, ShieldCheck, Wallet, Bike, XCircle, ArrowRight, CreditCard, RefreshCw, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function Updates() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for inline renewal confirmations: { [rentalId]: { amount, next_payment_date, submitting } }
  const [renewalForms, setRenewalForms] = useState({});

  useEffect(() => {
    if (token) {
      fetchUpdates();
    }
  }, [token]);

  const fetchUpdates = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/updates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUpdates(res.data);

      // Prepopulate renewal form values
      const initialForms = {};
      res.data.forEach(item => {
        if (item.type === 'payment_due') {
          initialForms[item.id] = {
            amount: item.plan_price || '230.00',
            next_payment_date: item.suggested_next_due || '',
            submitting: false
          };
        }
      });
      setRenewalForms(initialForms);
    } catch (error) {
      console.error('Error fetching updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReturn = async (id) => {
    if (!window.confirm(`Confirm vehicle return for rental #${id}? EV will be marked as available.`)) return;
    try {
      await axios.post(`${API_URL}/api/rentals/${id}/confirm-return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Return approved successfully! EV is now available for new bookings.');
      fetchUpdates();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve return');
    }
  };

  const handleConfirmRenewalPayment = async (rentalId) => {
    const form = renewalForms[rentalId];
    if (!form) return;

    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setRenewalForms(prev => ({
      ...prev,
      [rentalId]: { ...prev[rentalId], submitting: true }
    }));

    try {
      const res = await axios.post(
        `${API_URL}/api/rentals/${rentalId}/confirm-renewal-payment`,
        {
          amount: parseFloat(form.amount),
          next_payment_date: form.next_payment_date || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.message || 'Payment confirmed and plan extended successfully!');
      fetchUpdates();
    } catch (error) {
      alert('Error confirming payment: ' + (error.response?.data?.error || error.message));
    } finally {
      setRenewalForms(prev => ({
        ...prev,
        [rentalId]: { ...prev[rentalId], submitting: false }
      }));
    }
  };

  const handleFormChange = (rentalId, field, value) => {
    setRenewalForms(prev => ({
      ...prev,
      [rentalId]: {
        ...prev[rentalId],
        [field]: value
      }
    }));
  };

  const getIcon = (type) => {
    switch(type) {
      case 'booking': return <Bike size={24} color="#059669" />;
      case 'payment_due': return <CreditCard size={24} color="#d97706" />;
      case 'return': return <Bike size={24} color="#3b82f6" />;
      case 'kyc': return <ShieldCheck size={24} color="#8b5cf6" />;
      case 'wallet': return <Wallet size={24} color="#10b981" />;
      default: return <Bell size={24} color="#64748b" />;
    }
  };

  const getIconBg = (type) => {
    switch(type) {
      case 'booking': return '#d1fae5';
      case 'payment_due': return '#fef3c7';
      case 'return': return '#dbeafe';
      case 'kyc': return '#ede9fe';
      case 'wallet': return '#d1fae5';
      default: return '#f1f5f9';
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Bell color="#0f172a" /> Updates & Action Feed
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>Review pending rental renewal payments, wallet top-ups, KYC approvals, and vehicle return requests.</p>
        </div>
        <button 
          onClick={fetchUpdates}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading updates...</p>
      ) : updates.length === 0 ? (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '48px', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', border: '1px solid #f1f5f9' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0' }}>All Caught Up!</h3>
          <p style={{ color: '#64748b', margin: 0 }}>There are no overdue rental payments, pending approvals, or new notifications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {updates.map((update, index) => {
            const isPaymentDue = update.type === 'payment_due';
            const form = renewalForms[update.id] || { amount: update.plan_price || '230.00', next_payment_date: update.suggested_next_due || '', submitting: false };

            return (
              <div 
                key={`${update.type}-${update.id}-${index}`} 
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '18px', 
                  padding: '24px', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)', 
                  border: isPaymentDue ? '1px solid #fde68a' : '1px solid #f1f5f9',
                  display: 'flex', 
                  flexDirection: isPaymentDue ? 'column' : 'row',
                  justifyContent: 'space-between', 
                  alignItems: isPaymentDue ? 'stretch' : 'center',
                  gap: '20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '18px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: getIconBg(update.type), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {getIcon(update.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    {isPaymentDue ? (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                            {update.user_name || 'Rider'} ({update.user_phone || 'N/A'})
                          </h3>
                          {update.vehicle_model && (
                            <span style={{ 
                              background: '#f1f5f9', 
                              color: '#0f172a', 
                              padding: '2px 8px', 
                              borderRadius: '6px', 
                              fontSize: '12px', 
                              fontWeight: '700' 
                            }}>
                              {update.vehicle_model}
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                          <div>plan expired on {update.expiry_date || new Date(update.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}.</div>
                          <div>Did they make their payment of {update.plan_price}</div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{update.title}</h3>
                          <span style={{ 
                            background: update.status === 'pending' ? '#ede9fe' : '#e0f2fe', 
                            color: update.status === 'pending' ? '#6d28d9' : '#0369a1', 
                            padding: '3px 10px', 
                            borderRadius: '20px', 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            textTransform: 'uppercase' 
                          }}>
                            {update.status}
                          </span>
                        </div>
                        
                        <p style={{ color: '#475569', margin: '0 0 8px 0', fontSize: '14px', lineHeight: '1.5' }}>
                          {update.description}
                        </p>

                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px', color: '#94a3b8' }}>
                          <span>Due Date: <strong style={{ color: '#0f172a' }}>{new Date(update.date).toLocaleDateString()}</strong></span>
                          {update.plan_name && <span>Plan: <strong style={{ color: '#10b981' }}>{update.plan_name}</strong></span>}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Inline Action Form for Payment Due Confirmations */}
                {isPaymentDue && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '16px 20px', 
                    background: '#fffbeb', 
                    borderRadius: '14px', 
                    border: '1px solid #fef3c7',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#92400e', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Amount Received (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={form.amount}
                          onChange={(e) => handleFormChange(update.id, 'amount', e.target.value)}
                          style={{ width: '130px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#92400e', marginBottom: '4px', textTransform: 'uppercase' }}>
                          Extend Until / Next Due Date
                        </label>
                        <input
                          type="date"
                          value={form.next_payment_date}
                          onChange={(e) => handleFormChange(update.id, 'next_payment_date', e.target.value)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#0f172a', background: 'white', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleConfirmRenewalPayment(update.id)}
                        disabled={form.submitting}
                        style={{
                          background: '#059669',
                          color: 'white',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: form.submitting ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Check size={16} /> {form.submitting ? 'Confirming...' : 'Confirm Payment & Extend'}
                      </button>

                      <button
                        onClick={() => handleApproveReturn(update.id)}
                        style={{
                          background: '#white',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          padding: '9px 14px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer'
                        }}
                      >
                        Vehicle Returned
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard Actions for KYC, Wallet, Returns */}
                {!isPaymentDue && (
                  <div style={{ flexShrink: 0, marginLeft: '24px' }}>
                    {update.type === 'booking' && (
                      <button onClick={() => navigate('/rental-requests')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#059669', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Assign EV <ArrowRight size={18} />
                      </button>
                    )}
                    
                    {update.type === 'return' && update.status === 'pending_return' && (
                      <button onClick={() => handleApproveReturn(update.id)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CheckCircle2 size={18} /> Approve Return
                      </button>
                    )}
                    
                    {update.type === 'kyc' && update.status === 'pending' && (
                      <button onClick={() => navigate('/account-approvals')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Review KYC <ArrowRight size={18} />
                      </button>
                    )}
                    
                    {update.type === 'wallet' && update.status === 'pending' && (
                      <button onClick={() => navigate('/wallet-approvals')} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: 'white', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Review Payment <ArrowRight size={18} />
                      </button>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
