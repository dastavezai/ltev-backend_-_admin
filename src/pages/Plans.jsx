import { useState, useEffect, useRef } from 'react';
import { Plus, X, Tag, QrCode, Upload, Trash2, Check, RefreshCw, AlertCircle, Save } from 'lucide-react';
import axios from 'axios';

export default function Plans() {
  // Subscription Plans state
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '', type: 'Daily', price: '', security_deposit: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);

  // Payment Settings state (UPI ID & QR Code)
  const [upiSettings, setUpiSettings] = useState({
    upi_id: '',
    upi_name: '',
    upi_qr_image: ''
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [paymentSaveMsg, setPaymentSaveMsg] = useState(null);
  const fileInputRef = useRef(null);

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/api/plans', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPlans(response.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await axios.get('/api/settings/payment', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.data) {
        setUpiSettings({
          upi_id: res.data.upi_id || '',
          upi_name: res.data.upi_name || 'LocalToto',
          upi_qr_image: res.data.upi_qr_image || ''
        });
      }
    } catch (err) {
      console.error('Error fetching payment settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchPaymentSettings();
  }, []);

  const handleSavePaymentSettings = async (e) => {
    if (e) e.preventDefault();
    if (!upiSettings.upi_id || !upiSettings.upi_id.trim()) {
      alert('Please enter a valid UPI ID (e.g. 9113750231@oksbi)');
      return;
    }
    setSavingSettings(true);
    setPaymentSaveMsg(null);
    try {
      await axios.put('/api/settings/payment', {
        upi_id: upiSettings.upi_id.trim(),
        upi_name: (upiSettings.upi_name || 'LocalToto').trim(),
        upi_qr_image: upiSettings.upi_qr_image || ''
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPaymentSaveMsg({
        type: 'success',
        text: 'Payment settings saved successfully! Riders will now see these UPI and QR details in the mobile app.'
      });
      setTimeout(() => setPaymentSaveMsg(null), 5000);
    } catch (err) {
      console.error('Error saving payment settings:', err);
      setPaymentSaveMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save payment settings'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('qr', file);

    setUploadingQr(true);
    setPaymentSaveMsg(null);
    try {
      const res = await axios.post('/api/upload/upi-qr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.data?.imageUrl) {
        setUpiSettings(prev => ({ ...prev, upi_qr_image: res.data.imageUrl }));
        setPaymentSaveMsg({
          type: 'success',
          text: 'UPI QR code image uploaded successfully and activated for the mobile app!'
        });
      }
    } catch (err) {
      console.error('Error uploading QR code:', err);
      setPaymentSaveMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to upload QR code image'
      });
    } finally {
      setUploadingQr(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveQr = () => {
    setUpiSettings(prev => ({ ...prev, upi_qr_image: '' }));
    setPaymentSaveMsg({
      type: 'info',
      text: 'Custom QR code removed. Remember to click "Save Payment Settings" below to apply changes.'
    });
  };

  const handleAddPlan = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/plans', newPlan, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowAddModal(false);
      setNewPlan({ name: '', type: 'Daily', price: '', security_deposit: '' });
      fetchPlans();
    } catch (error) {
      console.error('Error adding plan:', error);
      alert('Failed to add plan');
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/plans/${editPlan.id}`, editPlan, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowEditModal(false);
      setEditPlan(null);
      fetchPlans();
    } catch (error) {
      console.error('Error updating plan:', error);
      alert('Failed to update plan');
    }
  };

  const handleDeletePlan = async (id) => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;
    try {
      await axios.delete(`/api/plans/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      alert('Failed to delete plan');
    }
  };

  // Helper for rendering QR preview image
  const resolvedQrUrl = upiSettings.upi_qr_image
    ? (upiSettings.upi_qr_image.startsWith('http')
        ? upiSettings.upi_qr_image
        : `${import.meta.env.VITE_API_URL || ''}${upiSettings.upi_qr_image.startsWith('/') ? '' : '/'}${upiSettings.upi_qr_image}`)
    : `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
        `upi://pay?pa=${upiSettings.upi_id || '9113750231@oksbi'}&pn=${encodeURIComponent(
          upiSettings.upi_name || 'LocalToto'
        )}&cu=INR`
      )}`;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 6px 0' }}>
          Payment Settings
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
          Configure UPI payment details, QR code, and manage subscription rental plans.
        </p>
      </div>

      {/* Payment Configuration Card (UPI ID & QR Code) */}
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03)',
          border: '1px solid #e2e8f0',
          padding: '28px',
          marginBottom: '36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#ecfdf5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #a7f3d0'
              }}
            >
              <QrCode size={22} color="#059669" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                UPI & QR Code Payment Configuration
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                These details are dynamically fetched and displayed to riders in the mobile app during checkout, dues payment, and wallet recharge.
              </p>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              background: '#ecfdf5',
              color: '#059669',
              fontSize: '12px',
              fontWeight: '700',
              border: '1px solid #bbf7d0'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
            Active in Mobile App
          </span>
        </div>

        {paymentSaveMsg && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '13px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: paymentSaveMsg.type === 'error' ? '#fee2e2' : (paymentSaveMsg.type === 'info' ? '#e0f2fe' : '#dcfce7'),
              color: paymentSaveMsg.type === 'error' ? '#dc2626' : (paymentSaveMsg.type === 'info' ? '#0369a1' : '#15803d'),
              border: `1px solid ${paymentSaveMsg.type === 'error' ? '#fecaca' : (paymentSaveMsg.type === 'info' ? '#bae6fd' : '#bbf7d0')}`
            }}
          >
            {paymentSaveMsg.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            <span>{paymentSaveMsg.text}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>
          {/* Left Column: Form Fields */}
          <form onSubmit={handleSavePaymentSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                UPI ID (VPA) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. 9113750231@oksbi"
                value={upiSettings.upi_id}
                onChange={(e) => setUpiSettings({ ...upiSettings, upi_id: e.target.value })}
                disabled={loadingSettings || savingSettings}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0f172a',
                  background: '#f8fafc',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Riders pay directly to this UPI address from PhonePe, Google Pay, Paytm, BHIM, etc.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Payee / Business Name
              </label>
              <input
                type="text"
                placeholder="e.g. LocalToto"
                value={upiSettings.upi_name}
                onChange={(e) => setUpiSettings({ ...upiSettings, upi_name: e.target.value })}
                disabled={loadingSettings || savingSettings}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0f172a',
                  background: '#f8fafc',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                Displayed as the recipient name in UPI apps and on the mobile app's payment modal.
              </span>
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                type="submit"
                disabled={savingSettings || loadingSettings}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#00a66c',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: (savingSettings || loadingSettings) ? 'not-allowed' : 'pointer',
                  opacity: (savingSettings || loadingSettings) ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(0, 166, 108, 0.25)',
                  transition: 'background 0.2s, transform 0.1s'
                }}
              >
                {savingSettings ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Saving Settings...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Payment Settings
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Column: QR Code Preview & Upload */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '14px' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Payment QR Code
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: upiSettings.upi_qr_image ? '#dbeafe' : '#f1f5f9',
                  color: upiSettings.upi_qr_image ? '#1d4ed8' : '#64748b'
                }}
              >
                {upiSettings.upi_qr_image ? 'Custom Standee QR' : 'Auto-Generated QR'}
              </span>
            </div>

            {/* QR Image Box */}
            <div
              style={{
                width: '180px',
                height: '180px',
                background: 'white',
                borderRadius: '14px',
                border: '1.5px solid #cbd5e1',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.04)',
                marginBottom: '16px',
                overflow: 'hidden'
              }}
            >
              <img
                src={resolvedQrUrl}
                alt="UPI Payment QR Code"
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                    `upi://pay?pa=${upiSettings.upi_id || '9113750231@oksbi'}&pn=${encodeURIComponent(
                      upiSettings.upi_name || 'LocalToto'
                    )}&cu=INR`
                  )}`;
                }}
              />
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '18px' }}>
              {upiSettings.upi_qr_image
                ? 'Your custom merchant QR standee is active. Riders will scan this image to pay.'
                : 'Using dynamic QR generated from your UPI ID. You can optionally upload your merchant standee QR image below.'}
            </p>

            {/* Hidden File Input for QR */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleQrUpload}
              style={{ display: 'none' }}
            />

            {/* Actions for QR */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingQr || savingSettings}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#0f172a',
                  color: 'white',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: uploadingQr ? 'not-allowed' : 'pointer',
                  opacity: uploadingQr ? 0.7 : 1,
                  boxShadow: '0 2px 6px rgba(15,23,42,0.15)'
                }}
              >
                {uploadingQr ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> {upiSettings.upi_qr_image ? 'Replace QR Image' : 'Upload Standee QR'}
                  </>
                )}
              </button>

              {upiSettings.upi_qr_image && (
                <button
                  type="button"
                  onClick={handleRemoveQr}
                  disabled={uploadingQr || savingSettings}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    padding: '9px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} /> Remove Custom QR
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Plans Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>
            Subscription Plans
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Create and manage rental packages available for rider subscriptions.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#3b82f6',
            color: 'white',
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s, boxShadow 0.2s',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
          }}
        >
          <Plus size={18} /> Add Plan
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '20px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#fafafa', color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Plan Name</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Type</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Price</th>
              <th style={{ padding: '16px 24px', fontWeight: '600' }}>Security Deposit</th>
              <th style={{ padding: '16px 24px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(plan => (
              <tr key={plan.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '20px 24px', fontWeight: '700', color: '#0f172a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={16} color="#94a3b8" /> {plan.name}
                  </div>
                </td>
                <td style={{ padding: '20px 24px', color: '#475569' }}>{plan.type}</td>
                <td style={{ padding: '20px 24px', color: '#0f172a', fontWeight: '600' }}>₹{plan.price}</td>
                <td style={{ padding: '20px 24px', color: '#0f172a', fontWeight: '600' }}>₹{plan.security_deposit}</td>
                <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                  <button 
                    onClick={() => {
                      setEditPlan(plan);
                      setShowEditModal(true);
                    }}
                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', marginRight: '8px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan.id)}
                    style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {plans.length === 0 && !loading && (
              <tr>
                <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No plans found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Plan Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Add New Plan</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleAddPlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Plan Name</label>
                <input required type="text" placeholder="e.g. Premium Monthly" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Type</label>
                <select value={newPlan.type} onChange={e => setNewPlan({...newPlan, type: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Price (₹)</label>
                  <input required type="number" placeholder="0" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Security Deposit (₹)</label>
                  <input required type="number" placeholder="0" value={newPlan.security_deposit} onChange={e => setNewPlan({...newPlan, security_deposit: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>

              <button type="submit" style={{ marginTop: '16px', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Create Plan
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {showEditModal && editPlan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Edit Plan</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleUpdatePlan} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Plan Name</label>
                <input required type="text" placeholder="e.g. Premium Monthly" value={editPlan.name} onChange={e => setEditPlan({...editPlan, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Type</label>
                <select value={editPlan.type} onChange={e => setEditPlan({...editPlan, type: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Price (₹)</label>
                  <input required type="number" placeholder="0" value={editPlan.price} onChange={e => setEditPlan({...editPlan, price: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Security Deposit (₹)</label>
                  <input required type="number" placeholder="0" value={editPlan.security_deposit} onChange={e => setEditPlan({...editPlan, security_deposit: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              </div>

              <button type="submit" style={{ marginTop: '16px', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
