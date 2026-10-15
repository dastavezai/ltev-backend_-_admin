import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Clock, XCircle, RefreshCw, Wallet, ArrowRight, CreditCard, 
  ShieldAlert, Tag, Search, Bike, Check, AlertTriangle, Settings, X, FileText,
  Eye, ExternalLink, Image as ImageIcon, Camera, PlusCircle, QrCode, Upload
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';

export default function WalletApprovals() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [dueRenewals, setDueRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'due_renewals' | 'plan' | 'recharge' | 'refund' | 'pending'
  const [searchQuery, setSearchQuery] = useState('');
  const [previewProof, setPreviewProof] = useState(null);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);

  // Form states for inline renewal confirmations: { [rentalId]: { amount, next_payment_date, submitting } }
  const [renewalForms, setRenewalForms] = useState({});

  // UPI Payment Configuration State
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiId, setUpiId] = useState('9113750231@oksbi');
  const [upiName, setUpiName] = useState('LocalToto');
  const [upiQrImage, setUpiQrImage] = useState(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingUpi, setSavingUpi] = useState(false);

  // Manual Record Payment State
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [recordForm, setRecordForm] = useState({
    user_id: '',
    amount: '',
    payment_type: 'recharge',
    payment_mode: 'upi',
    utr: '',
    remarks: '',
    proof_image: '',
    auto_approve: true,
  });
  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [uploadingRecordProof, setUploadingRecordProof] = useState(false);

  useEffect(() => {
    fetchData();
    fetchUpiSettings();
  }, [token]);

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersList(res.data || []);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchUpiSettings = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/settings/payment`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.upi_id) {
        setUpiId(res.data.upi_id);
        setUpiName(res.data.upi_name || 'LocalToto');
        setUpiQrImage(res.data.upi_qr_image || null);
      }
    } catch (e) {
      console.error('Error fetching UPI settings:', e);
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingQr(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/upload/upi-qr`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.imageUrl) {
        setUpiQrImage(res.data.imageUrl);
        alert('QR Code image uploaded successfully!');
      }
    } catch (err) {
      alert('Error uploading QR code: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingQr(false);
    }
  };

  const handleRecordProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingRecordProof(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/upload/payment-proof`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      if (res.data?.imageUrl) {
        setRecordForm(prev => ({ ...prev, proof_image: res.data.imageUrl }));
      }
    } catch (err) {
      alert('Error uploading proof image: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploadingRecordProof(false);
    }
  };

  const handleSavePaymentRecord = async (e) => {
    e.preventDefault();
    if (!recordForm.user_id) {
      alert('Please select a rider / user');
      return;
    }
    if (!recordForm.amount || parseFloat(recordForm.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    setSubmittingRecord(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/manual-record`, {
        ...recordForm,
        amount: parseFloat(recordForm.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Payment record added successfully!');
      setShowRecordPaymentModal(false);
      setRecordForm({
        user_id: '',
        amount: '',
        payment_type: 'recharge',
        payment_mode: 'upi',
        utr: '',
        remarks: '',
        proof_image: '',
        auto_approve: true,
      });
      fetchData();
    } catch (err) {
      alert('Error recording payment: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingRecord(false);
    }
  };

  const handleSaveUpi = async (e) => {
    e.preventDefault();
    if (!upiId || !upiId.trim()) {
      alert('Please enter a valid UPI ID');
      return;
    }
    setSavingUpi(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || ''}/api/settings/payment`, {
        upi_id: upiId.trim(),
        upi_name: upiName.trim(),
        upi_qr_image: upiQrImage || ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('UPI Payment Settings updated successfully! All mobile apps will now use this UPI ID and QR code.');
      setShowUpiModal(false);
    } catch (err) {
      alert('Error updating UPI settings: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingUpi(false);
    }
  };

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [walletRes, renewalRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/rentals/due-renewals`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setRequests(walletRes.data);
      setDueRenewals(renewalRes.data);

      // Prepopulate renewal form values
      const initialForms = {};
      renewalRes.data.forEach(item => {
        initialForms[item.id] = {
          amount: item.plan_price || '230.00',
          next_payment_date: item.suggested_next_due || '',
          submitting: false
        };
      });
      setRenewalForms(initialForms);

    } catch (error) {
      console.error('Error fetching wallet approvals & renewals:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (id, purpose) => {
    if (!window.confirm(`Are you sure you want to approve this payment request #${id}?`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'success' } : req));
      alert(`Payment Request #${id} Approved Successfully!`);
      fetchData();
    } catch (error) {
      alert('Error approving request: ' + (error.response?.data?.error || error.message));
    }
  };

  const rejectRequest = async (id) => {
    if (!window.confirm(`Are you sure you want to reject payment request #${id}?`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(prev => prev.map(req => req.id === id ? { ...req, status: 'rejected' } : req));
      alert(`Payment Request #${id} Rejected.`);
      fetchData();
    } catch (error) {
      alert('Error rejecting request: ' + (error.response?.data?.error || error.message));
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
        `${import.meta.env.VITE_API_URL || ''}/api/rentals/${rentalId}/confirm-renewal-payment`,
        {
          amount: parseFloat(form.amount),
          next_payment_date: form.next_payment_date || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(res.data.message || 'Payment confirmed and plan extended successfully!');
      fetchData();
    } catch (error) {
      alert('Error confirming payment: ' + (error.response?.data?.error || error.message));
    } finally {
      setRenewalForms(prev => ({
        ...prev,
        [rentalId]: { ...prev[rentalId], submitting: false }
      }));
    }
  };

  const handleApproveReturn = async (rentalId) => {
    if (!window.confirm(`Confirm vehicle return for rental #${rentalId}? EV will be marked as available.`)) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/rentals/${rentalId}/confirm-return`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Return approved successfully! EV is now available for new bookings.');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve return');
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

  const handleOpenRenewalReceipt = (rental) => {
    const form = renewalForms[rental.id] || {};
    setSelectedReceiptData({
      receiptNumber: `REC-REN-${String(rental.id).replace(/[^a-zA-Z0-9]/g, '').slice(-5).toUpperCase()}`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      riderName: rental.user_name,
      riderPhone: rental.user_phone,
      riderEmail: rental.user_email || 'N/A',
      vehicleModel: rental.vehicle_model,
      vehicleId: rental.vehicle_id,
      planName: rental.plan_name,
      planType: 'Plan Renewal Extension',
      startDate: rental.expiry_date || 'Active',
      endDate: form.next_payment_date || rental.suggested_next_due || 'Extended',
      nextDueDate: form.next_payment_date || rental.suggested_next_due,
      amountPaid: form.amount || rental.plan_price || 230,
      paymentMode: 'Cash / UPI Admin Renewal',
      remarks: `Plan renewal payment verified for EV #${rental.vehicle_id || 'N/A'}`
    });
    setReceiptModalOpen(true);
  };

  const handleOpenWalletReceipt = (req) => {
    const utrStr = (req.utr || '').toUpperCase();
    const isPlan = utrStr.includes('PLAN_BOOKING') || utrStr.includes('PLAN_PAYMENT');
    const isRefund = utrStr.includes('DEPOSIT_REFUND') || utrStr.includes('REFUND');
    const isDue = utrStr.includes('DUE_PAYMENT') || utrStr.includes('PAY_DUE');

    setSelectedReceiptData({
      receiptNumber: `REC-${String(req.id).padStart(6, '0')}`,
      date: req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      riderName: req.user,
      riderPhone: req.phone,
      riderEmail: req.email || 'N/A',
      vehicleModel: 'LT EV Fleet',
      planName: isDue ? 'Rental Due / Security Deposit' : isPlan ? 'Plan Subscription' : isRefund ? 'Security Deposit Refund' : 'Wallet Recharge Top-Up',
      planType: isDue ? 'Due Payment' : isPlan ? 'Subscription' : isRefund ? 'Refund' : 'Top-Up',
      amountPaid: req.amount || 0,
      paymentMode: 'Online UPI / Bank Transfer',
      remarks: `Reference UTR: ${req.utr || 'N/A'} (Status: APPROVED)`
    });
    setReceiptModalOpen(true);
  };

  // Overdue count
  const overdueCount = dueRenewals.filter(r => r.is_overdue).length;
  const pendingApprovalsCount = requests.filter(r => r.status === 'pending').length;

  const filteredRequests = requests.filter(req => {
    const utrStr = (req.utr || '').toUpperCase();
    const isPlan = utrStr.includes('PLAN_BOOKING') || utrStr.includes('PLAN_PAYMENT');
    const isRefund = utrStr.includes('DEPOSIT_REFUND') || utrStr.includes('REFUND');
    const isDue = utrStr.includes('DUE_PAYMENT') || utrStr.includes('PAY_DUE');
    const isRecharge = !isPlan && !isRefund && !isDue;

    const matchesSearch = 
      (req.user || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.phone || '').includes(searchQuery) ||
      (req.utr || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(req.id).includes(searchQuery);

    if (!matchesSearch) return false;

    if (filterType === 'plan') return isPlan;
    if (filterType === 'recharge') return isRecharge;
    if (filterType === 'refund') return isRefund;
    if (filterType === 'due') return isDue;
    if (filterType === 'pending') return req.status === 'pending';

    return true;
  });

  const filteredDueRenewals = dueRenewals.filter(r => {
    const matchesSearch = 
      (r.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.user_phone || '').includes(searchQuery) ||
      (r.vehicle_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.vehicle_model || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.id).includes(searchQuery);
    return matchesSearch;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>Payments, Dues & Wallet Approvals</h1>
          <p style={{ color: '#64748b', margin: 0 }}>Review rider plan renewal payments, overdue dues, wallet topups, and deposit refunds.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => { fetchUsers(); setShowRecordPaymentModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '700', color: 'white', cursor: 'pointer', boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)' }}
          >
            <PlusCircle size={16} /> + Record User Payment
          </button>
          <button 
            onClick={() => { fetchUpiSettings(); setShowUpiModal(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#00a66c', border: 'none', padding: '10px 18px', borderRadius: '12px', fontWeight: '700', color: 'white', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0, 166, 108, 0.25)' }}
          >
            <Settings size={16} /> UPI & QR Settings: {upiId}
          </button>
          <button 
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div 
          onClick={() => setFilterType('due_renewals')}
          style={{ 
            background: filterType === 'due_renewals' ? '#fef3c7' : 'white', 
            padding: '18px 20px', 
            borderRadius: '16px', 
            border: overdueCount > 0 ? '1.5px solid #f59e0b' : '1px solid #f1f5f9', 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b45309', fontSize: '13px', fontWeight: '700' }}>
            <span>Plan Renewals Due</span>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#b45309', marginTop: '6px' }}>
            {dueRenewals.length} <span style={{ fontSize: '13px', fontWeight: '600' }}>({overdueCount} Overdue)</span>
          </div>
        </div>

        <div 
          onClick={() => setFilterType('pending')}
          style={{ 
            background: filterType === 'pending' ? '#ede9fe' : 'white', 
            padding: '18px 20px', 
            borderRadius: '16px', 
            border: '1px solid #f1f5f9', 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#6d28d9', fontSize: '13px', fontWeight: '700' }}>
            <span>Pending Wallet Approvals</span>
            <Wallet size={20} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#6d28d9', marginTop: '6px' }}>
            {pendingApprovalsCount} <span style={{ fontSize: '13px', fontWeight: '600' }}>Requests</span>
          </div>
        </div>

        <div 
          onClick={() => setFilterType('recharge')}
          style={{ 
            background: filterType === 'recharge' ? '#dbeafe' : 'white', 
            padding: '18px 20px', 
            borderRadius: '16px', 
            border: '1px solid #f1f5f9', 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#1e40af', fontSize: '13px', fontWeight: '700' }}>
            <span>Wallet Topups</span>
            <CreditCard size={20} color="#2563eb" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#1e40af', marginTop: '6px' }}>
            {requests.filter(r => !(r.utr || '').toUpperCase().includes('PLAN') && !(r.utr || '').toUpperCase().includes('REFUND')).length}
          </div>
        </div>

        <div 
          onClick={() => setFilterType('refund')}
          style={{ 
            background: filterType === 'refund' ? '#f3e8ff' : 'white', 
            padding: '18px 20px', 
            borderRadius: '16px', 
            border: '1px solid #f1f5f9', 
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#7e22ce', fontSize: '13px', fontWeight: '700' }}>
            <span>Deposit Refunds</span>
            <ShieldAlert size={20} color="#9333ea" />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#7e22ce', marginTop: '6px' }}>
            {requests.filter(r => (r.utr || '').toUpperCase().includes('REFUND')).length}
          </div>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', minWidth: '300px', flex: 1 }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by rider name, phone, EV ID, or reference UTR..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All (${requests.length + dueRenewals.length})` },
            { id: 'due_renewals', label: `⚡ Plan Renewals Due (${dueRenewals.length})` },
            { id: 'pending', label: `Pending Approvals (${pendingApprovalsCount})` },
            { id: 'due', label: 'Due Payments' },
            { id: 'recharge', label: 'Wallet Topups' },
            { id: 'plan', label: 'Plan Bookings' },
            { id: 'refund', label: 'Deposit Refunds' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                background: filterType === tab.id ? '#0f172a' : '#f1f5f9',
                color: filterType === tab.id ? '#ffffff' : '#64748b',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: Plan Renewals & Overdue Payment Confirmation Cards */}
      {(filterType === 'all' || filterType === 'due_renewals') && filteredDueRenewals.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={20} color="#d97706" /> Active Plan Renewals & Dues ({filteredDueRenewals.length})
            </h2>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Confirm payments received from riders to extend their plan period</span>
          </div>

          <div style={{ display: 'grid', gap: '14px' }}>
            {filteredDueRenewals.map(rental => {
              const form = renewalForms[rental.id] || { amount: rental.plan_price || '230.00', next_payment_date: rental.suggested_next_due || '', submitting: false };

              return (
                <div 
                  key={rental.id}
                  style={{
                    background: 'white',
                    borderRadius: '18px',
                    padding: '20px 24px',
                    border: rental.is_overdue ? '1.5px solid #fde68a' : '1px solid #f1f5f9',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(217, 119, 6, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bike size={22} color="#d97706" />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>{rental.user_name}</h3>
                          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>#{rental.id}</span>
                          <span style={{ 
                            background: rental.is_overdue ? '#fee2e2' : '#fef3c7', 
                            color: rental.is_overdue ? '#dc2626' : '#b45309', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '11px', 
                            fontWeight: '800', 
                            textTransform: 'uppercase' 
                          }}>
                            {rental.is_overdue ? 'Plan Expired / Due' : 'Active Plan'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px', fontWeight: '600' }}>
                          📞 {rental.user_phone} &bull; EV: <strong style={{ color: '#0f172a' }}>{rental.vehicle_model}</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>
                        Plan: <strong style={{ color: '#059669' }}>{rental.plan_name}</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: rental.is_overdue ? '#dc2626' : '#64748b', fontWeight: '700', marginTop: '2px' }}>
                        Expiry / Due Date: {rental.expiry_date}
                      </div>
                    </div>
                  </div>

                  {/* Inline Action Bar */}
                  <div style={{
                    padding: '14px 18px',
                    background: '#fffbeb',
                    borderRadius: '12px',
                    border: '1px solid #fef3c7',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px'
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#92400e', marginBottom: '3px', textTransform: 'uppercase' }}>
                          Amount Received (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={form.amount}
                          onChange={(e) => handleFormChange(rental.id, 'amount', e.target.value)}
                          style={{ width: '130px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: '700', color: '#0f172a', background: 'white', outline: 'none' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#92400e', marginBottom: '3px', textTransform: 'uppercase' }}>
                          Extend Until / Next Due Date
                        </label>
                        <input
                          type="date"
                          value={form.next_payment_date}
                          onChange={(e) => handleFormChange(rental.id, 'next_payment_date', e.target.value)}
                          style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', color: '#0f172a', background: 'white', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleConfirmRenewalPayment(rental.id)}
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
                        onClick={() => handleOpenRenewalReceipt(rental)}
                        title="Generate / Print / WhatsApp Receipt"
                        style={{
                          background: '#e0f2fe',
                          color: '#0284c7',
                          border: '1px solid #bae6fd',
                          padding: '9px 14px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileText size={14} /> Receipt
                      </button>

                      <button
                        onClick={() => handleApproveReturn(rental.id)}
                        style={{
                          background: 'white',
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
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Wallet Requests & Approvals Table */}
      {filterType !== 'due_renewals' && (
        <div style={{ background: 'white', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '0 4px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={20} color="#2563eb" /> Wallet Top-Ups & Approvals ({filteredRequests.length})
            </h2>
          </div>

          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <tr>
                <th style={{ padding: '14px 18px', fontWeight: '600', fontSize: '11px' }}>Req ID</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Driver Details</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Payment Type & Reference</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Proof</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Amount</th>
                <th style={{ padding: '14px 18px', fontWeight: '600' }}>Status</th>
                <th style={{ padding: '14px 18px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => {
                const utrStr = (req.utr || '').toUpperCase();
                const isPlan = utrStr.includes('PLAN_BOOKING') || utrStr.includes('PLAN_PAYMENT');
                const isRefund = utrStr.includes('DEPOSIT_REFUND') || utrStr.includes('REFUND');
                const isDue = utrStr.includes('DUE_PAYMENT') || utrStr.includes('PAY_DUE');
                const isRecharge = !isPlan && !isRefund && !isDue;

                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 18px', fontFamily: 'monospace', color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>#{req.id}</td>
                    <td style={{ padding: '16px 18px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{req.user || 'Anonymous Rider'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {req.phone || 'N/A'}</div>
                    </td>
                    <td style={{ padding: '16px 18px' }}>
                      {isDue && (
                        <div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>
                            <CreditCard size={12} /> DUE PAYMENT (CYCLE / DEPOSIT)
                          </span>
                          <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{req.utr}</div>
                        </div>
                      )}

                      {isPlan && (
                        <div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>
                            <Tag size={12} /> PLAN BOOKING PAYMENT
                          </span>
                          <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{req.utr}</div>
                        </div>
                      )}

                      {isRefund && (
                        <div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>
                            <ShieldAlert size={12} /> SECURITY DEPOSIT REFUND
                          </span>
                          <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{req.utr}</div>
                        </div>
                      )}

                      {isRecharge && (
                        <div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e0f2fe', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', marginBottom: '4px' }}>
                            <Wallet size={12} /> WALLET TOPUP
                          </span>
                          <div style={{ fontSize: '12px', color: '#64748b', fontFamily: 'monospace' }}>Ref: {req.utr || 'N/A'}</div>
                        </div>
                      )}
                    </td>

                    {/* Payment Screenshot / Proof */}
                    <td style={{ padding: '16px 18px' }}>
                      {req.proof_image ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div 
                            onClick={() => {
                              const fullUrl = req.proof_image.startsWith('http') ? req.proof_image : `${import.meta.env.VITE_API_URL || ''}${req.proof_image.startsWith('/') ? '' : '/'}${req.proof_image}`;
                              setPreviewProof({
                                url: fullUrl,
                                user: req.user,
                                phone: req.phone,
                                amount: req.amount,
                                utr: req.utr,
                                id: req.id,
                                status: req.status,
                                date: req.date
                              });
                            }}
                            style={{ 
                              width: '46px', 
                              height: '46px', 
                              borderRadius: '8px', 
                              overflow: 'hidden', 
                              cursor: 'pointer', 
                              border: '1px solid #cbd5e1', 
                              background: '#0f172a', 
                              flexShrink: 0,
                              position: 'relative'
                            }}
                          >
                            <img 
                              src={req.proof_image.startsWith('http') ? req.proof_image : `${import.meta.env.VITE_API_URL || ''}${req.proof_image.startsWith('/') ? '' : '/'}${req.proof_image}`} 
                              alt="Payment Proof" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                const fullUrl = req.proof_image.startsWith('http') ? req.proof_image : `${import.meta.env.VITE_API_URL || ''}${req.proof_image.startsWith('/') ? '' : '/'}${req.proof_image}`;
                                setPreviewProof({
                                  url: fullUrl,
                                  user: req.user,
                                  phone: req.phone,
                                  amount: req.amount,
                                  utr: req.utr,
                                  id: req.id,
                                  status: req.status,
                                  date: req.date
                                });
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              <Eye size={12} /> View Proof
                            </button>
                            <div style={{ fontSize: '10px', color: '#00a66c', marginTop: '2px', fontWeight: '700' }}>Cloudflare R2</div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          No screenshot (UTR only)
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '16px 18px', fontWeight: '800', color: '#00a66c', fontSize: '16px' }}>₹{parseFloat(req.amount).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '16px 18px' }}>
                      {req.status === 'pending' && <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={13}/> PENDING</span>}
                      {req.status === 'success' && <span style={{ background: '#d1fae5', color: '#059669', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle2 size={13}/> APPROVED</span>}
                      {req.status === 'rejected' && <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={13}/> REJECTED</span>}
                    </td>
                    <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                      {req.status === 'pending' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button 
                            onClick={() => approveRequest(req.id, isDue ? 'due' : isPlan ? 'plan' : isRefund ? 'refund' : 'recharge')}
                            title="Confirm Payment"
                            style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#00a66c', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer', padding: 0 }}>
                            <Check size={16} strokeWidth={2.5} />
                          </button>
                          <button 
                            onClick={() => rejectRequest(req.id)}
                            title="Cancel Payment"
                            style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', border: '1px solid #fca5a5', cursor: 'pointer', padding: 0 }}>
                            <X size={16} strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Verified</span>
                          {req.status === 'success' && (
                            <button
                              onClick={() => handleOpenWalletReceipt(req)}
                              title="Generate / Print / WhatsApp Receipt"
                              style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '5px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <FileText size={12} /> Receipt
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && !loading && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <Wallet size={36} color="#94a3b8" style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No Payment Requests Found</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>When riders pay for plans or recharge their wallets, approvals will appear here.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* UPI Payment Configuration Modal */}
      {showUpiModal && (
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
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <button 
              onClick={() => setShowUpiModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#ecfdf5', padding: '10px', borderRadius: '12px', color: '#00a66c' }}>
                <Wallet size={24} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>UPI Payment Settings</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>Configure the UPI ID where riders pay</p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
              ℹ️ Any changes here take effect <strong>immediately</strong> in the mobile app. Riders will receive this UPI ID when purchasing plans, paying dues, or recharging wallet.
            </div>

            <form onSubmit={handleSaveUpi}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Receiving UPI ID *
                </label>
                <input 
                  type="text" 
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. 9113750231@oksbi"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Payee Display Name
                </label>
                <input 
                  type="text" 
                  value={upiName}
                  onChange={(e) => setUpiName(e.target.value)}
                  placeholder="e.g. LocalToto"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '600',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Static UPI QR Code Image (For Scanning in Mobile App)
                </label>
                {upiQrImage ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '10px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <img 
                      src={upiQrImage.startsWith('http') ? upiQrImage : `${import.meta.env.VITE_API_URL || ''}${upiQrImage.startsWith('/') ? '' : '/'}${upiQrImage}`} 
                      alt="UPI QR Code" 
                      style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                    />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669' }}>✓ Custom QR Code Image Active</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Displayed to all riders in app</div>
                      <button
                        type="button"
                        onClick={() => setUpiQrImage(null)}
                        style={{ marginTop: '6px', fontSize: '11px', color: '#dc2626', background: '#fee2e2', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                      >
                        Remove Image
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                    No custom QR uploaded. Mobile app dynamically generates QR from UPI ID.
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleQrUpload}
                    disabled={uploadingQr}
                    style={{ fontSize: '12px', color: '#475569' }}
                  />
                  {uploadingQr && <span style={{ fontSize: '12px', color: '#00a66c' }}>Uploading QR...</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowUpiModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUpi}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#00a66c',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: savingUpi ? 'not-allowed' : 'pointer',
                    opacity: savingUpi ? 0.7 : 1
                  }}
                >
                  {savingUpi ? 'Saving...' : 'Save UPI Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual User Payment Record Modal */}
      {showRecordPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', width: '100%', maxWidth: '560px', padding: '28px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Record User Payment</h2>
                <p style={{ color: '#64748b', margin: 0, fontSize: '13px' }}>Manually upload/add a payment record for a rider (UPI / Cash / Bank).</p>
              </div>
              <button onClick={() => setShowRecordPaymentModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentRecord}>
              {/* User Select */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Select Rider / User *</label>
                <select
                  value={recordForm.user_id}
                  onChange={(e) => setRecordForm({ ...recordForm, user_id: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '600', outline: 'none' }}
                  required
                >
                  <option value="">-- Choose Rider ({usersList.length} users) --</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.name || 'Unnamed'} ({u.phone})</option>
                  ))}
                </select>
              </div>

              {/* Amount & Payment Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Amount (₹) *</label>
                  <input 
                    type="number"
                    step="any"
                    min="1"
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                    placeholder="e.g. 1500"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '700', outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Payment Purpose *</label>
                  <select
                    value={recordForm.payment_type}
                    onChange={(e) => setRecordForm({ ...recordForm, payment_type: e.target.value })}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '600', outline: 'none' }}
                  >
                    <option value="recharge">Wallet Top-Up</option>
                    <option value="due">Rental Due Payment</option>
                    <option value="deposit">Security Deposit</option>
                    <option value="plan">Plan Booking</option>
                  </select>
                </div>
              </div>

              {/* Payment Mode & UTR */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Payment Mode *</label>
                  <select
                    value={recordForm.payment_mode}
                    onChange={(e) => setRecordForm({ ...recordForm, payment_mode: e.target.value })}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '600', outline: 'none' }}
                  >
                    <option value="upi">UPI Transfer</option>
                    <option value="cash">Cash in Hand</option>
                    <option value="bank_transfer">Bank Transfer (IMPS/NEFT)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>UTR / Reference No.</label>
                  <input 
                    type="text"
                    value={recordForm.utr}
                    onChange={(e) => setRecordForm({ ...recordForm, utr: e.target.value })}
                    placeholder="e.g. 412345678901 / Cash Slip #"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Upload Receipt / Proof Screenshot */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Upload Receipt Slip / Screenshot (Optional)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleRecordProofUpload}
                    disabled={uploadingRecordProof}
                    style={{ fontSize: '12px', color: '#475569' }}
                  />
                  {uploadingRecordProof && <span style={{ fontSize: '12px', color: '#2563eb' }}>Uploading...</span>}
                  {recordForm.proof_image && (
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>✓ Attached</span>
                  )}
                </div>
              </div>

              {/* Remarks */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>Remarks / Note</label>
                <input 
                  type="text"
                  value={recordForm.remarks}
                  onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                  placeholder="e.g. Paid at stand / Verified on phone"
                  style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #cbd5e1', fontSize: '14px', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Auto-Approve Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <input 
                  type="checkbox"
                  id="autoApprove"
                  checked={recordForm.auto_approve}
                  onChange={(e) => setRecordForm({ ...recordForm, auto_approve: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="autoApprove" style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                  Auto-Approve & Settle Immediately (Credits wallet / clears dues instantly)
                </label>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRecord}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#2563eb', color: 'white', fontWeight: '700', fontSize: '14px', cursor: submittingRecord ? 'not-allowed' : 'pointer' }}
                >
                  {submittingRecord ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable / PDF Receipt & Invoice Modal */}
      <ReceiptModal 
        isOpen={receiptModalOpen} 
        onClose={() => setReceiptModalOpen(false)} 
        data={selectedReceiptData} 
      />

      {/* Payment Proof Screenshot Lightbox Modal */}
      {previewProof && (
        <div 
          onClick={() => setPreviewProof(null)}
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.85)', 
            backdropFilter: 'blur(6px)', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: '#0f172a', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              maxWidth: '90vw', 
              maxHeight: '92vh', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid #334155'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="#00a66c" /> Payment Proof Screenshot — Req #{previewProof.id}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Rider: <strong style={{ color: 'white' }}>{previewProof.user}</strong> ({previewProof.phone}) • Amount: <strong style={{ color: '#4ade80' }}>₹{parseFloat(previewProof.amount).toLocaleString('en-IN')}</strong> • UTR: {previewProof.utr || 'N/A'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {previewProof.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const id = previewProof.id;
                        setPreviewProof(null);
                        rejectRequest(id);
                      }}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const id = previewProof.id;
                        setPreviewProof(null);
                        approveRequest(id, 'payment');
                      }}
                      style={{ background: '#00a66c', color: 'white', border: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                    >
                      ✓ Approve Payment
                    </button>
                  </>
                )}
                <a
                  href={previewProof.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProof(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Image */}
            <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020617', maxHeight: 'calc(92vh - 80px)' }}>
              <img 
                src={previewProof.url} 
                alt="Payment proof screenshot" 
                style={{ maxWidth: '100%', maxHeight: 'calc(80vh)', objectFit: 'contain', borderRadius: '8px' }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
