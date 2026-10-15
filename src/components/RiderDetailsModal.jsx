import { useState } from 'react';
import { 
  X, Phone, Mail, Calendar, CreditCard, ShieldCheck, ShieldAlert, Shield, 
  Bike, Zap, DollarSign, Plus, Trash2, Clock, Send, Bell, CheckCircle2, 
  RefreshCw, Eye, ExternalLink, Edit2, Ban, Copy, Check, AlertTriangle, 
  FileText, Maximize2, Minimize2, MessageCircle, AlertCircle, History,
  ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import axios from 'axios';

export default function RiderDetailsModal({
  isOpen,
  onClose,
  rider,
  details,
  loading,
  onRefresh,
  activeTab,
  setActiveTab,
  onUpdateKycStatus,
  onEditRider,
  onToggleSuspend,
  onPreviewDoc
}) {
  if (!isOpen || !rider) return null;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  
  // Extra Due Form State
  const [showAddDueForm, setShowAddDueForm] = useState(false);
  const [dueForm, setDueForm] = useState({
    title: '',
    amount: '',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    notes: '',
    send_notification: true
  });
  const [submittingDue, setSubmittingDue] = useState(false);

  // Edit Due State
  const [editingDue, setEditingDue] = useState(null);
  const [submittingEditDue, setSubmittingEditDue] = useState(false);

  // Direct Notice State
  const [directNotice, setDirectNotice] = useState({ title: '', message: '', sending: false });

  // Payment Confirmation / Cancellation State
  const [processingApprovalId, setProcessingApprovalId] = useState(null);

  const rawId = rider.raw_id || rider.user_id || rider.id;
  const token = localStorage.getItem('token');

  const handleApprovePayment = async (approvalId) => {
    if (!window.confirm(`Confirm payment for request #${approvalId}? This will approve the payment and credit the rider's account.`)) return;
    setProcessingApprovalId(approvalId);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${approvalId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Payment Request #${approvalId} confirmed successfully!`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error approving payment request:', error);
      alert('Error confirming payment: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingApprovalId(null);
    }
  };

  const handleRejectPayment = async (approvalId) => {
    if (!window.confirm(`Are you sure you want to cancel payment request #${approvalId}?`)) return;
    setProcessingApprovalId(approvalId);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wallet_approvals/${approvalId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Payment Request #${approvalId} has been cancelled.`);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error rejecting payment request:', error);
      alert('Error cancelling payment: ' + (error.response?.data?.error || error.message));
    } finally {
      setProcessingApprovalId(null);
    }
  };

  // Format clean 10-digit phone for WhatsApp
  const rawPhone = (rider.phone || details?.user?.phone || '').replace(/\D/g, '');
  const cleanPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

  const handleCopyPhone = () => {
    if (rider.phone) {
      navigator.clipboard.writeText(rider.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const handleAddDue = async (e) => {
    e.preventDefault();
    if (!dueForm.title.trim() || !dueForm.amount) {
      alert('Please fill in title and amount');
      return;
    }
    setSubmittingDue(true);
    try {
      await axios.post(`/api/riders/${rawId}/dues`, dueForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Extra due of ₹${dueForm.amount} added successfully!`);
      setDueForm({
        title: '',
        amount: '',
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        notes: '',
        send_notification: true
      });
      setShowAddDueForm(false);
      onRefresh();
    } catch (err) {
      alert('Failed to add due: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingDue(false);
    }
  };

  const handleUpdateDue = async (e) => {
    e.preventDefault();
    if (!editingDue) return;
    setSubmittingEditDue(true);
    try {
      await axios.put(`/api/riders/dues/${editingDue.id}`, editingDue, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Due updated successfully!');
      setEditingDue(null);
      onRefresh();
    } catch (err) {
      alert('Failed to update due: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingEditDue(false);
    }
  };

  const handleUpdateDueStatus = async (dueId, status) => {
    if (!window.confirm(`Are you sure you want to mark this due as ${status}?`)) return;
    try {
      await axios.put(`/api/riders/dues/${dueId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteDue = async (dueId) => {
    if (!window.confirm('Delete this due record permanently?')) return;
    try {
      await axios.delete(`/api/riders/dues/${dueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onRefresh();
    } catch (err) {
      alert('Error deleting due: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleClearAllDues = async () => {
    const confirmPrompt = window.prompt(`Type CLEAR to wipe all pending extra dues for ${rider.name}:`);
    if (confirmPrompt !== 'CLEAR') return;
    try {
      await axios.post(`/api/riders/${rawId}/dues/clear-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('All pending extra dues cleared!');
      onRefresh();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSendNotice = async (e) => {
    e.preventDefault();
    if (!directNotice.title.trim() || !directNotice.message.trim()) return;
    setDirectNotice(prev => ({ ...prev, sending: true }));
    try {
      await axios.post('/api/notifications/broadcast', {
        type: 'custom',
        user_id: rawId,
        title: directNotice.title.trim(),
        message: directNotice.message.trim(),
        category: 'due_alert',
        action_type: 'pay_now'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`In-app & push notification sent to ${rider.name}!`);
      setDirectNotice({ title: '', message: '', sending: false });
      onRefresh();
    } catch (err) {
      alert('Failed to send notice: ' + (err.response?.data?.error || err.message));
      setDirectNotice(prev => ({ ...prev, sending: false }));
    }
  };

  const prefillDueNotice = () => {
    const totalDue = details?.dues_summary?.total_due || 0;
    setDirectNotice({
      title: `🚨 Payment Notice: ₹${totalDue.toLocaleString('en-IN')} Due on your Account`,
      message: `Dear ${rider.name}, you have a total outstanding due of ₹${totalDue.toLocaleString('en-IN')} on your LT.ev account. Please open your LT.ev app and tap Pay Now to clear your dues immediately and maintain uninterrupted ride services.`,
      sending: false
    });
  };

  const handleSendWhatsAppReminder = () => {
    const totalDue = details?.dues_summary?.total_due || 0;
    const upiId = '9113750231@oksbi';
    const upiIntentUrl = `upi://pay?pa=${upiId}&pn=LocalToto&am=${totalDue}&tn=LT_Due_${rawId}`;

    const text = `*⚡ LT.ev Mobility - Payment & Account Notice*
----------------------------------------
*👤 Rider:* ${rider.name} (${rider.id})
*📱 Contact:* ${rider.phone || 'N/A'}
*🛵 Vehicle:* ${details?.active_rental ? `${details.active_rental.vehicle_model} (${details.active_rental.vehicle_reg})` : (rider.assigned_vehicle || 'No EV Assigned')}
*💰 Outstanding Total Due:* ₹${totalDue.toLocaleString('en-IN')}

*📲 Pay Instantly via UPI Link:*
${upiIntentUrl}

*Or Pay to UPI ID:* ${upiId}
_After payment, please share screenshot or UTR number._
----------------------------------------
_Support: +91 9113750231 | https://ltev.in_`;

    if (cleanPhone) {
      window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const numDue = parseFloat(details?.dues_summary?.total_due || rider.total_due || 0);
  const hasDue = numDue > 0;
  const kycStatus = details?.user?.kyc_status || rider.kyc_status || 'pending';
  const minDeposit = details?.dues_summary?.min_deposit || 2000;
  const depositBalance = parseFloat(details?.user?.security_deposit_balance || rider.security_deposit_balance || 0);
  const walletBal = parseFloat(details?.user?.wallet_balance || rider.wallet_balance || 0);

  const pendingDuesCount = details?.extra_dues?.filter(d => d.status === 'pending').length || 0;
  const pendingApprovalsCount = details?.wallet_approvals?.filter(a => a.status === 'pending').length || 0;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(15, 23, 42, 0.78)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 120,
        padding: isFullscreen ? '0px' : '20px',
        transition: 'padding 0.2s ease'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: isFullscreen ? '0px' : '24px',
          width: isFullscreen ? '100vw' : '96vw',
          maxWidth: isFullscreen ? '100vw' : '1440px',
          height: isFullscreen ? '100vh' : '92vh',
          display: 'flex',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: isFullscreen ? 'none' : '1px solid #cbd5e1',
          transition: 'all 0.2s ease'
        }}
      >
        {/* ======================================================== */}
        {/* LEFT COLUMN: PERSISTENT RIDER PROFILE CARD              */}
        {/* ======================================================== */}
        <div style={{
          width: '350px',
          minWidth: '350px',
          background: '#f8fafc',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflowY: 'auto'
        }}>
          <div style={{ padding: '24px 22px' }}>
            {/* Identity Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '58px', height: '58px',
                borderRadius: '16px',
                background: hasDue ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'linear-gradient(135deg, #00a66c 0%, #047857 100%)',
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', fontWeight: '900',
                boxShadow: hasDue ? '0 4px 12px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(0, 166, 108, 0.3)'
              }}>
                {rider.name ? rider.name.charAt(0).toUpperCase() : 'R'}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {rider.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#334155', padding: '2px 7px', borderRadius: '5px', fontWeight: '800' }}>
                    {rider.id}
                  </span>
                  <span style={{
                    fontSize: '11px',
                    background: rider.status === 'suspended' ? '#fee2e2' : '#dcfce7',
                    color: rider.status === 'suspended' ? '#dc2626' : '#15803d',
                    padding: '2px 7px', borderRadius: '5px', fontWeight: '800',
                    textTransform: 'uppercase'
                  }}>
                    {rider.status === 'suspended' ? '● Suspended' : '● Active'}
                  </span>
                </div>
              </div>
            </div>

            {/* KYC Status Badge Bar */}
            <div style={{
              background: kycStatus === 'verified' || kycStatus === 'approved' ? '#ecfdf5' : kycStatus === 'failed' ? '#fef2f2' : '#fffbeb',
              border: `1px solid ${kycStatus === 'verified' || kycStatus === 'approved' ? '#a7f3d0' : kycStatus === 'failed' ? '#fecaca' : '#fde68a'}`,
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={16} color={kycStatus === 'verified' || kycStatus === 'approved' ? '#059669' : kycStatus === 'failed' ? '#dc2626' : '#d97706'} />
                <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'capitalize', color: kycStatus === 'verified' || kycStatus === 'approved' ? '#065f46' : kycStatus === 'failed' ? '#991b1b' : '#92400e' }}>
                  KYC: {kycStatus.toUpperCase()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('kyc')}
                style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: '800', cursor: 'pointer', padding: 0 }}
              >
                Inspect ➔
              </button>
            </div>

            {/* Contact Details Card */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                Contact & Account Details
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={13} /> Phone</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '700', color: '#0f172a' }}>{rider.phone || 'N/A'}</span>
                    <button 
                      onClick={handleCopyPhone} 
                      title="Copy phone"
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '4px', padding: '3px 5px', cursor: 'pointer', color: copiedPhone ? '#16a34a' : '#64748b' }}
                    >
                      {copiedPhone ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={13} /> Email</span>
                  <span style={{ fontWeight: '600', color: '#0f172a', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rider.email || 'N/A'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} /> Member Since</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>
                    {rider.joined || (details?.user?.created_at ? new Date(details.user.created_at).toLocaleDateString('en-GB') : 'Recent')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}><Bell size={13} /> App Push Token</span>
                  <span style={{ fontWeight: '700', fontSize: '11px', color: details?.user?.push_token ? '#15803d' : '#94a3b8' }}>
                    {details?.user?.push_token ? '● Connected' : '○ Not Linked'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Overview Card (Single Source of Financial Truth) */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px 16px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                Balances & Financial Status
              </div>

              {/* Total Due Highlight Card */}
              <div style={{
                background: hasDue ? '#fef2f2' : '#f0fdf4',
                border: `1px solid ${hasDue ? '#fecaca' : '#bbf7d0'}`,
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: hasDue ? '#dc2626' : '#15803d', textTransform: 'uppercase' }}>
                    {hasDue ? '⚠️ Total Dues Pending' : '✓ Dues Clear'}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: '900', color: hasDue ? '#dc2626' : '#15803d' }}>
                    ₹{numDue.toLocaleString('en-IN')}
                  </span>
                </div>
                {hasDue && (
                  <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '6px', lineHeight: '1.3' }}>
                    {details?.dues_summary?.cycle_due > 0 && `Pass: ₹${details.dues_summary.cycle_due} • `}
                    {details?.dues_summary?.deposit_deficit > 0 && `Deposit Deficit: ₹${details.dues_summary.deposit_deficit} • `}
                    {details?.dues_summary?.pending_extra_dues_total > 0 && `Extra: ₹${details.dues_summary.pending_extra_dues_total}`}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Wallet Balance:</span>
                  <strong style={{ color: '#0f172a' }}>
                    ₹{walletBal.toLocaleString('en-IN')}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Security Deposit Held:</span>
                  <strong style={{ color: '#0f172a' }}>
                    ₹{depositBalance.toLocaleString('en-IN')}
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}> / ₹{minDeposit}</span>
                  </strong>
                </div>
              </div>
            </div>

            {/* Current EV & Rental Pass Glance */}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Assigned EV & Plan
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('vehicle')}
                  style={{ background: 'transparent', border: 'none', color: '#0284c7', fontSize: '12px', fontWeight: '800', cursor: 'pointer', padding: 0 }}
                >
                  Details ➔
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Bike size={13} color="#00a66c" /> Bike</span>
                  <span style={{ fontWeight: '800', color: rider.assigned_vehicle || details?.active_rental?.vehicle_reg ? '#00a66c' : '#94a3b8' }}>
                    {details?.active_rental ? `${details.active_rental.vehicle_model || 'EV'} (${details.active_rental.vehicle_reg})` : (rider.assigned_vehicle || 'No EV Assigned')}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Zap size={13} color="#eab308" /> Plan</span>
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>
                    {details?.active_rental?.plan_name ? `${details.active_rental.plan_name} (₹${details.active_rental.plan_price})` : (rider.plan_name || 'No Plan')}
                  </span>
                </div>

                {details?.active_rental?.next_payment_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={13} /> Next Renewal</span>
                    <span style={{ fontWeight: '700', color: details.dues_summary?.is_overdue ? '#dc2626' : '#059669' }}>
                      {new Date(details.active_rental.next_payment_date).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Profile Actions Bar (Bottom of Left Column) */}
          <div style={{ padding: '16px 20px', background: '#f1f5f9', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSendWhatsAppReminder}
              style={{
                flex: 1, padding: '10px 8px',
                borderRadius: '8px', border: 'none',
                background: '#25d366', color: 'white',
                fontSize: '12px', fontWeight: '800',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
              }}
              title="Open WhatsApp chat with rider"
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => onEditRider(rider)}
              style={{
                flex: 1, padding: '10px 8px',
                borderRadius: '8px', border: '1px solid #cbd5e1',
                background: 'white', color: '#334155',
                fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => onToggleSuspend(rider)}
              style={{
                flex: 1, padding: '10px 8px',
                borderRadius: '8px', border: '1px solid #fca5a5',
                background: rider.status === 'suspended' ? '#dcfce7' : '#fee2e2',
                color: rider.status === 'suspended' ? '#15803d' : '#dc2626',
                fontSize: '12px', fontWeight: '700',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}
            >
              <Ban size={13} /> {rider.status === 'suspended' ? 'Activate' : 'Suspend'}
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: WORKSPACE WITH TABS ON THE RIGHT SIDE      */}
        {/* ======================================================== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'white' }}>
          {/* Top Bar with Navigation Tabs & Window Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            background: 'white',
            padding: '0 24px'
          }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'dues', label: 'Dues', badge: pendingDuesCount || null, badgeColor: '#ef4444' },
                { id: 'kyc', label: 'Document', badge: kycStatus === 'verified' ? '✓' : '!' },
                { id: 'vehicle', label: 'Rentals', badge: null },
                { id: 'wallet', label: 'Transcation', badge: pendingApprovalsCount || null, badgeColor: '#eab308' },
                { id: 'notice', label: 'Notification', badge: null }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '18px 16px',
                      border: 'none',
                      background: 'transparent',
                      borderBottom: isActive ? '3px solid #00a66c' : '3px solid transparent',
                      color: isActive ? '#00a66c' : '#64748b',
                      fontWeight: isActive ? '800' : '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {tab.label}
                    {tab.badge && (
                      <span style={{
                        fontSize: '10px',
                        background: isActive ? (tab.badgeColor ? tab.badgeColor : '#dcfce7') : '#f1f5f9',
                        color: isActive ? (tab.badgeColor ? 'white' : '#15803d') : '#64748b',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        fontWeight: '800'
                      }}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Window Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                title="Refresh Details"
                style={{
                  background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569',
                  width: '34px', height: '34px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setIsFullscreen(prev => !prev)}
                title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                style={{
                  background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569',
                  width: '34px', height: '34px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Close Modal"
                style={{
                  background: '#f1f5f9', border: 'none', color: '#475569',
                  width: '34px', height: '34px', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tab Content Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', background: '#fafafa' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '90px 0', color: '#64748b' }}>
                <RefreshCw size={34} color="#00a66c" className="animate-spin" style={{ margin: '0 auto 14px auto' }} />
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>Loading rider profile and records...</div>
              </div>
            ) : !details ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444' }}>
                <AlertCircle size={36} style={{ margin: '0 auto 10px auto' }} />
                <div style={{ fontWeight: '700' }}>Failed to load rider details. Please retry.</div>
                <button onClick={onRefresh} style={{ marginTop: '10px', background: '#00a66c', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer' }}>Retry</button>
              </div>
            ) : (
              <>
                {/* ======================================================== */}
                {/* TAB 1: EXTRA DUES & PENALTIES (NO REPETITIVE CARDS)     */}
                {/* ======================================================== */}
                {activeTab === 'dues' && (
                  <div>
                    {/* Action Header for Custom Dues */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '18px',
                      background: 'white',
                      padding: '16px 20px',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                          Custom Extra Dues & Penalties
                        </h3>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                          Add challans, damages, helmet fines, or manual charges. Synchronizes directly with the rider's mobile home screen.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {details.dues_summary?.pending_extra_dues_total > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllDues}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
                              padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer'
                            }}
                          >
                            <CheckCircle2 size={14} /> Clear All Dues
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowAddDueForm(prev => !prev)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: showAddDueForm ? '#64748b' : '#00a66c', color: 'white',
                            border: 'none', padding: '8px 16px', borderRadius: '8px',
                            fontWeight: '700', fontSize: '12px', cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0, 166, 108, 0.25)'
                          }}
                        >
                          {showAddDueForm ? <X size={14} /> : <Plus size={14} />}
                          {showAddDueForm ? 'Cancel Form' : 'Add Extra Due'}
                        </button>
                      </div>
                    </div>

                    {/* Add Extra Due Form */}
                    {showAddDueForm && (
                      <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '2px solid #00a66c',
                        marginBottom: '20px',
                        boxShadow: '0 4px 12px rgba(0, 166, 108, 0.08)'
                      }}>
                        <div style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Quick Reason Presets:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {[
                              { title: 'Traffic Challan Fine', amt: '1000' },
                              { title: 'Helmet Lost / Replacement', amt: '800' },
                              { title: 'Late Return Overdue Fee', amt: '500' },
                              { title: 'Body Scratch / Fiber Repair', amt: '1500' },
                              { title: 'Fastag Toll Recovery', amt: '250' }
                            ].map((preset, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setDueForm(prev => ({ ...prev, title: preset.title, amount: preset.amt }))}
                                style={{
                                  background: '#f1f5f9', border: '1px solid #cbd5e1',
                                  padding: '4px 10px', borderRadius: '6px',
                                  fontSize: '11px', fontWeight: '600', color: '#334155', cursor: 'pointer'
                                }}
                              >
                                + {preset.title} (₹{preset.amt})
                              </button>
                            ))}
                          </div>
                        </div>

                        <form onSubmit={handleAddDue} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                              Due Title / Reason *
                            </label>
                            <input
                              required
                              type="text"
                              placeholder="e.g. Traffic Challan Fine"
                              value={dueForm.title}
                              onChange={(e) => setDueForm({ ...dueForm, title: e.target.value })}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                              Amount (₹) *
                            </label>
                            <input
                              required
                              type="number"
                              step="0.01"
                              placeholder="500"
                              value={dueForm.amount}
                              onChange={(e) => setDueForm({ ...dueForm, amount: e.target.value })}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                              Due Date *
                            </label>
                            <input
                              required
                              type="date"
                              value={dueForm.due_date}
                              onChange={(e) => setDueForm({ ...dueForm, due_date: e.target.value })}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                            />
                          </div>

                          <div style={{ gridColumn: 'span 3' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                              Notes / Context (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Challan #MH02-1234 on Western Express Highway"
                              value={dueForm.notes}
                              onChange={(e) => setDueForm({ ...dueForm, notes: e.target.value })}
                              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                            />
                          </div>

                          <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setShowAddDueForm(false)}
                              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '600', fontSize: '12px', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={submittingDue}
                              style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#00a66c', color: 'white', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                            >
                              {submittingDue ? 'Adding...' : 'Confirm & Add Due'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Edit Due Modal/Form */}
                    {editingDue && (
                      <div style={{ background: '#fffbeb', borderRadius: '16px', padding: '20px', border: '2px solid #f59e0b', marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#b45309' }}>
                          Edit Due #{editingDue.id}: {editingDue.title}
                        </h4>
                        <form onSubmit={handleUpdateDue} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Title</label>
                            <input type="text" value={editingDue.title} onChange={e => setEditingDue({ ...editingDue, title: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Amount (₹)</label>
                            <input type="number" step="0.01" value={editingDue.amount} onChange={e => setEditingDue({ ...editingDue, amount: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Due Date</label>
                            <input type="date" value={editingDue.due_date ? String(editingDue.due_date).split('T')[0] : ''} onChange={e => setEditingDue({ ...editingDue, due_date: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                          </div>
                          <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" onClick={() => setEditingDue(null)} style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', fontSize: '12px' }}>Cancel</button>
                            <button type="submit" disabled={submittingEditDue} style={{ padding: '6px 18px', borderRadius: '6px', border: 'none', background: '#d97706', color: 'white', fontWeight: '700', fontSize: '12px' }}>{submittingEditDue ? 'Saving...' : 'Save Changes'}</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* Extra Dues Records Table */}
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                          <tr>
                            <th style={{ padding: '14px 18px', fontWeight: '700' }}>Reason / Title</th>
                            <th style={{ padding: '14px 18px', fontWeight: '700' }}>Amount</th>
                            <th style={{ padding: '14px 18px', fontWeight: '700' }}>Due Date</th>
                            <th style={{ padding: '14px 18px', fontWeight: '700' }}>Created</th>
                            <th style={{ padding: '14px 18px', fontWeight: '700' }}>Status</th>
                            <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!details.extra_dues || details.extra_dues.length === 0) ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                <CreditCard size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                                <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>No custom extra dues recorded</div>
                                <div style={{ fontSize: '12px' }}>Click "Add Extra Due" above to add a penalty or challan.</div>
                              </td>
                            </tr>
                          ) : (
                            details.extra_dues.map(due => (
                              <tr key={due.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '14px 18px' }}>
                                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '13px' }}>{due.title}</div>
                                  {due.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{due.notes}</div>}
                                </td>
                                <td style={{ padding: '14px 18px', fontWeight: '900', fontSize: '15px', color: due.status === 'pending' ? '#dc2626' : '#0f172a' }}>
                                  ₹{parseFloat(due.amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '14px 18px', fontSize: '12px', color: '#475569' }}>
                                  📅 {new Date(due.due_date).toLocaleDateString('en-GB')}
                                </td>
                                <td style={{ padding: '14px 18px', fontSize: '12px', color: '#64748b' }}>
                                  {new Date(due.created_at).toLocaleDateString('en-GB')}
                                </td>
                                <td style={{ padding: '14px 18px' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    background: due.status === 'paid' ? '#dcfce7' : due.status === 'waived' ? '#f1f5f9' : '#fee2e2',
                                    color: due.status === 'paid' ? '#15803d' : due.status === 'waived' ? '#64748b' : '#dc2626'
                                  }}>
                                    {due.status}
                                  </span>
                                </td>
                                <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: '6px' }}>
                                    {due.status === 'pending' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => setEditingDue(due)}
                                          style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', color: '#334155' }}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateDueStatus(due.id, 'paid')}
                                          style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', color: '#16a34a' }}
                                        >
                                          Mark Paid
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateDueStatus(due.id, 'waived')}
                                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '5px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', color: '#64748b' }}
                                        >
                                          Waive
                                        </button>
                                      </>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDue(due.id)}
                                      style={{ background: '#fee2e2', border: 'none', padding: '5px 7px', borderRadius: '6px', color: '#dc2626', cursor: 'pointer' }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2: KYC DOCUMENTS & VERIFICATION CENTER              */}
                {/* ======================================================== */}
                {activeTab === 'kyc' && (
                  <div>
                    {/* Header Banner */}
                    <div style={{ background: 'white', padding: '18px 22px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ShieldCheck color="#00a66c" /> Rider Document Verification (Cloudflare R2)
                        </h3>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                          Inspect high-resolution document photos and live selfie portrait.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => onUpdateKycStatus(rawId, 'failed')}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 14px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                        >
                          <ShieldAlert size={14} /> Reject KYC
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateKycStatus(rawId, 'verified')}
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#00a66c', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0, 166, 108, 0.25)' }}
                        >
                          <CheckCircle2 size={15} /> Verify & Approve KYC
                        </button>
                      </div>
                    </div>

                    {/* 4-Document Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      {[
                        { title: 'Aadhaar Card (Front)', key: 'aadhar_front_image', url: details.user.aadhar_front_image, desc: 'Government issued Aadhaar front view with photo, name & DOB' },
                        { title: 'Aadhaar Card (Back)', key: 'aadhar_back_image', url: details.user.aadhar_back_image, desc: 'Aadhaar back view with QR code & residential permanent address' },
                        { title: 'PAN Card', key: 'pan_image', url: details.user.pan_image, desc: 'Permanent Account Number card with official government signature' },
                        { title: 'Live Selfie / Portrait', key: 'selfie_image', url: details.user.selfie_image, desc: 'Real-time camera portrait captured during mobile onboarding' }
                      ].map((doc, i) => {
                        const fullUrl = doc.url ? (doc.url.startsWith('http') ? doc.url : `${import.meta.env.VITE_API_URL || ''}${doc.url}`) : null;
                        return (
                          <div key={i} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>{doc.title}</span>
                                {fullUrl ? (
                                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '800' }}>✓ READY</span>
                                ) : (
                                  <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '800' }}>PENDING</span>
                                )}
                              </div>
                              <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 12px 0', lineHeight: '1.4' }}>{doc.desc}</p>
                            </div>

                            {fullUrl ? (
                              <div>
                                <div 
                                  onClick={() => onPreviewDoc({ open: true, title: doc.title, url: fullUrl, riderName: rider.name })}
                                  style={{ width: '100%', height: '200px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', position: 'relative', background: '#0f172a' }}
                                >
                                  <img src={fullUrl} alt={doc.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                  <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,0.75)', color: 'white', padding: '3px 7px', borderRadius: '5px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Eye size={11} /> Click to Zoom
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                  <button
                                    type="button"
                                    onClick={() => onPreviewDoc({ open: true, title: doc.title, url: fullUrl, riderName: rider.name })}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '7px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    <Eye size={12} /> Inspect Fullscreen
                                  </button>
                                  <a
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '7px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '11px', textDecoration: 'none' }}
                                  >
                                    <ExternalLink size={12} /> Open Original
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div style={{ height: '200px', borderRadius: '10px', border: '2px dashed #cbd5e1', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '6px' }}>
                                <Shield size={28} color="#cbd5e1" />
                                <span style={{ fontSize: '12px', fontWeight: '600' }}>Document not yet submitted</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 3: EV & RENTAL DETAILS + HISTORY                    */}
                {/* ======================================================== */}
                {activeTab === 'vehicle' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {details.active_rental ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                        {/* Vehicle Card */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                          <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bike size={18} color="#00a66c" /> Assigned Vehicle Contract
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Model:</span>
                              <strong style={{ color: '#0f172a' }}>{details.active_rental.vehicle_model || 'LT.ev Scooter'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Registration Number:</span>
                              <strong style={{ color: '#00a66c', fontSize: '14px' }}>{details.active_rental.vehicle_reg || 'Assigned'}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Rental Start Date:</span>
                              <span style={{ fontWeight: '600', color: '#0f172a' }}>{new Date(details.active_rental.start_time).toLocaleString('en-GB')}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#64748b' }}>Rental Contract ID:</span>
                              <span style={{ fontWeight: '700', color: '#64748b' }}>#{details.active_rental.id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Subscription Card */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Zap size={18} color="#eab308" /> Subscription Plan & Renewal
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b' }}>Current Plan:</span>
                                <strong style={{ color: '#0f172a' }}>{details.active_rental.plan_name || 'Weekly Pass'}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b' }}>Plan Price:</span>
                                <strong style={{ color: '#0f172a' }}>₹{details.active_rental.plan_price}</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                                <span style={{ color: '#64748b' }}>Billing Cycle:</span>
                                <span style={{ fontWeight: '700', textTransform: 'capitalize', color: '#0f172a' }}>{details.active_rental.plan_type || 'Weekly'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Next Renewal Date:</span>
                                <strong style={{ color: details.dues_summary?.is_overdue ? '#dc2626' : '#059669' }}>
                                  {details.active_rental.next_payment_date ? new Date(details.active_rental.next_payment_date).toLocaleDateString('en-GB') : 'N/A'}
                                  {details.dues_summary?.is_overdue && ` (${details.dues_summary.overdue_days}d overdue)`}
                                </strong>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleSendWhatsAppReminder}
                            style={{
                              marginTop: '16px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                              background: '#25d366', color: 'white', border: 'none',
                              padding: '10px', borderRadius: '8px', fontWeight: '800', fontSize: '12px', cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)'
                            }}
                          >
                            <MessageCircle size={15} /> Send Renewal Reminder via WhatsApp
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'white', padding: '50px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <Bike size={44} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>No EV Assigned to this Rider</h4>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                          This rider does not have an active electric scooter assigned. They can book an available bike from the mobile app.
                        </p>
                      </div>
                    )}

                    {/* Rental History Table */}
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <History size={15} color="#00a66c" />
                        <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Rental & Contract History</span>
                      </div>
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                          <tr>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Contract ID</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Vehicle</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Plan Name</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Start Date</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>End Date</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!details.rental_history || details.rental_history.length === 0) ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                                No historical rentals recorded for this user.
                              </td>
                            </tr>
                          ) : (
                            details.rental_history.map(rh => (
                              <tr key={rh.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '12px' }}>
                                <td style={{ padding: '12px 18px', fontWeight: '700', color: '#64748b' }}>#{rh.id}</td>
                                <td style={{ padding: '12px 18px', fontWeight: '800', color: '#0f172a' }}>
                                  {rh.vehicle_model || 'EV'} ({rh.vehicle_reg || rh.vehicle_id})
                                </td>
                                <td style={{ padding: '12px 18px', color: '#334155' }}>
                                  {rh.plan_name ? `${rh.plan_name} (₹${rh.plan_price})` : 'Custom Plan'}
                                </td>
                                <td style={{ padding: '12px 18px', color: '#475569' }}>
                                  {rh.start_time ? new Date(rh.start_time).toLocaleDateString('en-GB') : 'N/A'}
                                </td>
                                <td style={{ padding: '12px 18px', color: '#64748b' }}>
                                  {rh.end_time ? new Date(rh.end_time).toLocaleDateString('en-GB') : 'Ongoing'}
                                </td>
                                <td style={{ padding: '12px 18px' }}>
                                  <span style={{
                                    padding: '2px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase',
                                    background: rh.status === 'active' || rh.status === 'in_use' ? '#dcfce7' : '#f1f5f9',
                                    color: rh.status === 'active' || rh.status === 'in_use' ? '#15803d' : '#64748b'
                                  }}>
                                    {rh.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 4: WALLET & PAYMENT APPROVALS                       */}
                {/* ======================================================== */}
                {activeTab === 'wallet' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Payment Requests & Proof Screenshots */}
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
                            Payment Confirmation Requests & Uploaded Proofs
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Proofs uploaded by rider when paying via UPI or QR code.
                          </div>
                        </div>
                        {pendingApprovalsCount > 0 && (
                          <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                            {pendingApprovalsCount} Action Required
                          </span>
                        )}
                      </div>
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                          <tr>
                            <th style={{ padding: '10px 18px', fontWeight: '700', fontSize: '11px' }}>Req ID</th>
                            <th style={{ padding: '10px 18px', fontWeight: '700' }}>Amount</th>
                            <th style={{ padding: '10px 18px', fontWeight: '700' }}>Proof</th>
                            <th style={{ padding: '10px 18px', fontWeight: '700' }}>Status</th>
                            <th style={{ padding: '10px 18px', fontWeight: '700' }}>Date</th>
                            <th style={{ padding: '10px 18px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!details.wallet_approvals || details.wallet_approvals.length === 0) ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '12px' }}>
                                No payment confirmation requests submitted yet.
                              </td>
                            </tr>
                          ) : (
                            details.wallet_approvals.map(app => {
                              const proofUrl = app.proof_image ? (app.proof_image.startsWith('http') ? app.proof_image : `${import.meta.env.VITE_API_URL || ''}${app.proof_image}`) : null;
                              const hasValidUtr = app.utr && typeof app.utr === 'string' && app.utr.trim() !== '' && app.utr.trim().toUpperCase() !== 'N/A' && app.utr.trim().toLowerCase() !== 'null';

                              return (
                                <tr key={app.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                  <td style={{ padding: '12px 18px', fontWeight: '600', color: '#94a3b8', fontSize: '11px' }}>#{app.id}</td>
                                  <td style={{ padding: '12px 18px', fontWeight: '800', color: '#00a66c' }}>₹{parseFloat(app.amount).toLocaleString('en-IN')}</td>
                                  <td style={{ padding: '12px 18px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {proofUrl && (
                                        <button
                                          type="button"
                                          onClick={() => onPreviewDoc({ open: true, title: `Payment Proof #${app.id}`, url: proofUrl, riderName: rider.name })}
                                          title="View Uploaded Image Proof"
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '6px',
                                            background: '#f1f5f9',
                                            border: '1px solid #cbd5e1',
                                            color: '#0284c7',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            padding: 0,
                                            flexShrink: 0,
                                            transition: 'all 0.15s ease'
                                          }}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#e0f2fe';
                                            e.currentTarget.style.borderColor = '#7dd3fc';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#f1f5f9';
                                            e.currentTarget.style.borderColor = '#cbd5e1';
                                          }}
                                        >
                                          <Eye size={14} />
                                        </button>
                                      )}
                                      {hasValidUtr && (
                                        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#334155', fontWeight: '600' }}>
                                          {app.utr}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px 18px' }}>
                                    <span style={{
                                      padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
                                      background: app.status === 'success' ? '#dcfce7' : app.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                      color: app.status === 'success' ? '#15803d' : app.status === 'rejected' ? '#dc2626' : '#d97706'
                                    }}>
                                      {app.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 18px', fontSize: '12px', color: '#64748b' }}>
                                    {new Date(app.date).toLocaleDateString('en-GB')}
                                  </td>
                                  <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                                    {app.status === 'pending' ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleApprovePayment(app.id)}
                                          disabled={processingApprovalId === app.id}
                                          title="Confirm Payment"
                                          style={{
                                            width: '30px',
                                            height: '30px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#dcfce7',
                                            color: '#15803d',
                                            border: '1px solid #86efac',
                                            borderRadius: '7px',
                                            padding: 0,
                                            cursor: processingApprovalId === app.id ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <Check size={15} strokeWidth={2.5} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRejectPayment(app.id)}
                                          disabled={processingApprovalId === app.id}
                                          title="Cancel Payment"
                                          style={{
                                            width: '30px',
                                            height: '30px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#fee2e2',
                                            color: '#dc2626',
                                            border: '1px solid #fca5a5',
                                            borderRadius: '7px',
                                            padding: 0,
                                            cursor: processingApprovalId === app.id ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <X size={15} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    ) : app.status === 'success' ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleRejectPayment(app.id)}
                                          disabled={processingApprovalId === app.id}
                                          title="Cancel Payment"
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#ffffff',
                                            color: '#dc2626',
                                            border: '1px solid #fecaca',
                                            borderRadius: '6px',
                                            padding: 0,
                                            cursor: processingApprovalId === app.id ? 'not-allowed' : 'pointer'
                                          }}
                                        >
                                          <X size={14} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    ) : (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleApprovePayment(app.id)}
                                          disabled={processingApprovalId === app.id}
                                          title="Confirm Payment"
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: '#ffffff',
                                            color: '#15803d',
                                            border: '1px solid #bbf7d0',
                                            borderRadius: '6px',
                                            padding: 0,
                                            cursor: processingApprovalId === app.id ? 'not-allowed' : 'pointer'
                                          }}
                                        >
                                          <Check size={14} strokeWidth={2.5} />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Wallet Ledger */}
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ padding: '14px 20px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>Wallet Transaction Ledger</span>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>
                          Recent transactions
                        </span>
                      </div>
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>
                          <tr>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Type</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Amount</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Description</th>
                            <th style={{ padding: '12px 18px', fontWeight: '700' }}>Date & Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(!details.wallet_transactions || details.wallet_transactions.length === 0) ? (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                                No wallet transactions recorded yet.
                              </td>
                            </tr>
                          ) : (
                            details.wallet_transactions.map(txn => (
                              <tr key={txn.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                                <td style={{ padding: '12px 18px' }}>
                                  <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                    padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
                                    background: txn.type === 'credit' ? '#dcfce7' : '#fee2e2',
                                    color: txn.type === 'credit' ? '#15803d' : '#dc2626'
                                  }}>
                                    {txn.type === 'credit' ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                                    {txn.type}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 18px', fontWeight: '800', color: txn.type === 'credit' ? '#15803d' : '#dc2626' }}>
                                  {txn.type === 'credit' ? '+' : '-'}₹{parseFloat(txn.amount || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '12px 18px', color: '#0f172a' }}>{txn.description}</td>
                                <td style={{ padding: '12px 18px', fontSize: '12px', color: '#64748b' }}>
                                  {new Date(txn.timestamp).toLocaleString('en-GB')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ======================================================== */}
                {/* TAB 5: DIRECT NOTICES                                    */}
                {/* ======================================================== */}
                {activeTab === 'notice' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                    {/* Notice Composer */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Send In-App & Push Notice</h4>
                          <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>Delivers directly to the rider's phone notification tray.</p>
                        </div>
                        {hasDue && (
                          <button
                            type="button"
                            onClick={prefillDueNotice}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 12px', borderRadius: '7px', fontWeight: '700', fontSize: '11px', cursor: 'pointer' }}
                          >
                            ⚡ Pre-fill Due Notice
                          </button>
                        )}
                      </div>

                      <form onSubmit={handleSendNotice} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Title *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Action Required: Please clear pending dues"
                            value={directNotice.title}
                            onChange={e => setDirectNotice({ ...directNotice, title: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Message *</label>
                          <textarea
                            required
                            rows="4"
                            placeholder="Type notice message..."
                            value={directNotice.message}
                            onChange={e => setDirectNotice({ ...directNotice, message: e.target.value })}
                            style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', resize: 'vertical' }}
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={directNotice.sending}
                          style={{ background: '#00a66c', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Send size={14} /> {directNotice.sending ? 'Sending...' : 'Send Notice Now'}
                        </button>
                      </form>
                    </div>

                    {/* Notice History */}
                    <div style={{ background: 'white', borderRadius: '16px', padding: '22px', border: '1px solid #e2e8f0', overflowY: 'auto', maxHeight: '450px' }}>
                      <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Recent Notices Sent</h4>
                      {(!details.notifications || details.notifications.length === 0) ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
                          No previous notifications recorded for this rider.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {details.notifications.map(n => (
                            <div key={n.id} style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: '800', fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>{n.title}</div>
                              <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>{n.message}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '6px' }}>{new Date(n.created_at).toLocaleString('en-GB')}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
