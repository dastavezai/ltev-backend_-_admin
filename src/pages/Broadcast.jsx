import { useState, useEffect } from 'react';
import { 
  Megaphone, Calendar, Clock, AlertTriangle, Send, CheckCircle2, 
  Users, Bell, Search, RefreshCw, Sparkles, Filter, CreditCard, ShieldCheck, 
  Smartphone, UserCheck, Check, ArrowRight, Eye, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Broadcast() {
  const { token } = useAuth();
  const [activeMainTab, setActiveMainTab] = useState('compose'); // 'compose' | 'reminders' | 'history'
  
  const [dueStats, setDueStats] = useState({
    due3to4Days: { count: 0, users: [] },
    due1to2Days: { count: 0, users: [] },
    dueToday: { count: 0, users: [] }
  });
  const [usersList, setUsersList] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form State
  const [targetAudience, setTargetAudience] = useState('all'); // 'all' | specific user id
  const [category, setCategory] = useState('payment_reminder');
  const [title, setTitle] = useState('🚨 Payment Due Notice: Renew Your Pass');
  const [message, setMessage] = useState('Your LT.ev rental subscription is due. Please tap Pay Now on your homepage to maintain active vehicle access and avoid auto-lock.');
  const [enablePayNow, setEnablePayNow] = useState(true);

  // Active Tab for reminder lists preview
  const [previewTab, setPreviewTab] = useState(null); // '3d' | '1d' | 'today' | null

  useEffect(() => {
    if (token) {
      fetchDueStats();
      fetchUsers();
      fetchHistory();
    }
  }, [token]);

  const fetchDueStats = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/notifications/active-due-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDueStats(res.data);
    } catch (e) {
      console.error('Error fetching due stats:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/notifications/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  // Quick Preset Senders
  const sendPresetReminder = async (presetType, count) => {
    const titles = {
      payment_reminder_3d: '📅 Upcoming Due in 3-4 Days Reminder',
      payment_reminder_1d: '⏰ Urgent: Pass Due in 24-48 Hours Reminder',
      payment_reminder_today: '🚨 Critical: Payment Due Today Reminder'
    };

    if (!window.confirm(`Send "${titles[presetType]}" broadcast to all matching active riders?`)) return;

    setSending(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/notifications/broadcast`, {
        type: presetType
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Broadcast sent successfully!`);
      fetchHistory();
      fetchDueStats();
    } catch (e) {
      alert('Failed to send broadcast: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  };

  // Custom Notification Sender
  const handleSendCustom = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      alert('Please provide both title and message.');
      return;
    }

    setSending(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/notifications/broadcast`, {
        type: 'custom',
        user_id: targetAudience,
        title: title.trim(),
        message: message.trim(),
        category,
        action_type: enablePayNow ? 'pay_now' : 'none'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Broadcast notification sent successfully!');
      fetchHistory();
      setActiveMainTab('history');
    } catch (e) {
      alert('Failed to send custom notification: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  };

  // When admin selects a rider, option to pre-fill their exact due
  const handleSelectRider = (userId) => {
    setTargetAudience(userId);
    if (userId === 'all') return;
    const selected = usersList.find(u => u.id === userId || u.raw_id === userId);
    if (selected && selected.total_due > 0) {
      setTitle(`⚠️ Outstanding Due Alert: ₹${selected.total_due.toLocaleString('en-IN')}`);
      setMessage(`Dear ${selected.name}, you have a total pending due of ₹${selected.total_due.toLocaleString('en-IN')} on your LT.ev account. Please open your LT.ev app and tap Pay Now on your homepage to maintain vehicle access.`);
      setEnablePayNow(true);
      setCategory('payment_reminder');
    }
  };

  const selectedUserObj = usersList.find(u => u.id === targetAudience || u.raw_id === targetAudience);

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={28} color="#00a66c" /> Broadcast & Rider Notifications
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            Send instant in-app alerts, payment due reminders, and push notifications directly to riders' smartphones.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => { fetchDueStats(); fetchUsers(); fetchHistory(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '28px', background: 'white', padding: '6px 12px', borderRadius: '14px' }}>
        {[
          { id: 'compose', label: '📢 Compose Notification & Direct Notice', count: null },
          { id: 'reminders', label: '⏰ 1-Click Payment Due Triggers', count: (dueStats.dueToday?.count || 0) + (dueStats.due1to2Days?.count || 0) },
          { id: 'history', label: '📜 Sent Notifications History', count: history.length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveMainTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 18px',
              border: 'none',
              borderRadius: '10px',
              background: activeMainTab === tab.id ? '#00a66c' : 'transparent',
              color: activeMainTab === tab.id ? 'white' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span style={{ 
                background: activeMainTab === tab.id ? 'rgba(255,255,255,0.25)' : '#e2e8f0', 
                color: activeMainTab === tab.id ? 'white' : '#334155', 
                padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '800' 
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: COMPOSE NOTIFICATION WITH LIVE MOBILE PREVIEW     */}
      {/* ======================================================== */}
      {activeMainTab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px' }}>
          {/* Left: Compose Form */}
          <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #f1f5f9', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#00a66c" /> Compose New Alert or Notice
            </h2>

            <form onSubmit={handleSendCustom} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Target Audience */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Target Audience / Recipient <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={targetAudience}
                  onChange={(e) => handleSelectRider(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: 'white', color: '#0f172a', fontWeight: '500' }}
                >
                  <option value="all">📢 All Registered Riders ({usersList.length} total users)</option>
                  <optgroup label="Select Specific Rider (With Outstanding Dues)">
                    {usersList.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.phone}) — {u.total_due > 0 ? `⚠️ ₹${u.total_due} Due` : '✓ No Due'}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {selectedUserObj && targetAudience !== 'all' && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: selectedUserObj.total_due > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: selectedUserObj.total_due > 0 ? '#b91c1c' : '#15803d', fontWeight: '700' }}>
                      Rider: {selectedUserObj.name} • {selectedUserObj.assigned_vehicle || 'No EV'} • Pending Due: ₹{selectedUserObj.total_due || 0}
                    </div>
                    {selectedUserObj.total_due > 0 && (
                      <button
                        type="button"
                        onClick={() => handleSelectRider(selectedUserObj.id)}
                        style={{ background: '#dc2626', color: 'white', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Pre-fill Due Alert
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Notification Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'payment_reminder', label: '💳 Payment Due', color: '#dc2626' },
                    { id: 'maintenance', label: '🛵 EV Service / Swap', color: '#2563eb' },
                    { id: 'general', label: '📢 General Update', color: '#00a66c' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: category === cat.id ? `2px solid ${cat.color}` : '1px solid #cbd5e1',
                        background: category === cat.id ? '#f8fafc' : 'white',
                        fontWeight: '700',
                        fontSize: '12px',
                        color: category === cat.id ? cat.color : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Urgent: Account Due Reminder"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Message */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Message Content <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  rows="4"
                  placeholder="Write clear notification message for rider..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {/* Enable Pay Now Button */}
              <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Include Interactive "Pay Now" UPI Button</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Allows rider to instantly clear their dues with 1 tap from their notification list.</div>
                </div>
                <input
                  type="checkbox"
                  checked={enablePayNow}
                  onChange={(e) => setEnablePayNow(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={sending}
                style={{
                  background: '#00a66c',
                  color: 'white',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(0, 166, 108, 0.3)'
                }}
              >
                <Send size={18} /> {sending ? 'Dispatching Notification...' : 'Send Broadcast Notification Now'}
              </button>
            </form>
          </div>

          {/* Right: Live Mobile App Preview Mockup */}
          <div>
            <div style={{ background: '#0f172a', borderRadius: '32px', padding: '24px 20px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', border: '6px solid #1e293b', maxWidth: '380px', margin: '0 auto' }}>
              {/* Phone Speaker Notch */}
              <div style={{ width: '100px', height: '5px', background: '#334155', borderRadius: '4px', margin: '0 auto 16px auto' }} />

              <div style={{ color: 'white', fontSize: '12px', fontWeight: '700', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Smartphone size={14} color="#00a66c" /> Mobile In-App Preview</span>
                <span style={{ color: '#00a66c', fontSize: '10px' }}>LT.ev Live</span>
              </div>

              {/* Mock Notification Card */}
              <div style={{ background: 'white', borderRadius: '18px', padding: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: category === 'payment_reminder' ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {category === 'payment_reminder' ? <AlertTriangle size={15} color="#dc2626" /> : <Megaphone size={15} color="#00a66c" />}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {title || 'Notification Title'}
                    </span>
                  </div>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '600' }}>Just now</span>
                </div>

                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, marginBottom: '14px' }}>
                  {message || 'Your notification text message will appear here for the rider.'}
                </div>

                {enablePayNow && (
                  <div style={{ background: '#00a66c', color: 'white', padding: '9px', borderRadius: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <CreditCard size={13} /> Pay Now via UPI
                  </div>
                )}
              </div>

              {/* Device Hint */}
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '18px' }}>
                Dispatched via Expo Push to connected Android devices and saved in the rider's updates bell.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: 1-CLICK PAYMENT DUE SMART TRIGGERS                */}
      {/* ======================================================== */}
      {activeMainTab === 'reminders' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
            {/* Preset 1: 3-4 Days */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calendar size={22} color="#3b82f6" />
                  </div>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                    {dueStats.due3to4Days.count} Riders Due
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Due in 3–4 Days</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  Advance reminder for active subscribers whose pass renewal is 3–4 days away.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => sendPresetReminder('payment_reminder_3d', dueStats.due3to4Days.count)}
                  disabled={sending || dueStats.due3to4Days.count === 0}
                  style={{ flex: 1, background: dueStats.due3to4Days.count === 0 ? '#cbd5e1' : '#3b82f6', color: 'white', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: dueStats.due3to4Days.count === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Send size={15} /> 1-Click Reminder
                </button>
                {dueStats.due3to4Days.count > 0 && (
                  <button
                    onClick={() => setPreviewTab(previewTab === '3d' ? null : '3d')}
                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {previewTab === '3d' ? 'Hide' : 'View'}
                  </button>
                )}
              </div>
            </div>

            {/* Preset 2: 1-2 Days */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #fed7aa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={22} color="#ea580c" />
                  </div>
                  <span style={{ background: '#fff7ed', color: '#c2410c', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                    {dueStats.due1to2Days.count} Riders Due
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Due in 1–2 Days</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  Urgent renewal reminder with active Pay Now button for passes expiring within 48h.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => sendPresetReminder('payment_reminder_1d', dueStats.due1to2Days.count)}
                  disabled={sending || dueStats.due1to2Days.count === 0}
                  style={{ flex: 1, background: dueStats.due1to2Days.count === 0 ? '#cbd5e1' : '#ea580c', color: 'white', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: dueStats.due1to2Days.count === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Send size={15} /> 1-Click Urgent Alert
                </button>
                {dueStats.due1to2Days.count > 0 && (
                  <button
                    onClick={() => setPreviewTab(previewTab === '1d' ? null : '1d')}
                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {previewTab === '1d' ? 'Hide' : 'View'}
                  </button>
                )}
              </div>
            </div>

            {/* Preset 3: Due Today / Overdue */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={22} color="#dc2626" />
                  </div>
                  <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                    {dueStats.dueToday.count} Critical Riders
                  </span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Due Today / Overdue</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                  Immediate action alert warning of impending auto-lock and direct Pay Now trigger.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => sendPresetReminder('payment_reminder_today', dueStats.dueToday.count)}
                  disabled={sending || dueStats.dueToday.count === 0}
                  style={{ flex: 1, background: dueStats.dueToday.count === 0 ? '#cbd5e1' : '#dc2626', color: 'white', border: 'none', padding: '11px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: dueStats.dueToday.count === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Send size={15} /> 1-Click Immediate Alert
                </button>
                {dueStats.dueToday.count > 0 && (
                  <button
                    onClick={() => setPreviewTab(previewTab === 'today' ? null : 'today')}
                    style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                  >
                    {previewTab === 'today' ? 'Hide' : 'View'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Due Users Preview Section */}
          {previewTab && (
            <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {previewTab === '3d' ? 'Riders Due in 3-4 Days' : previewTab === '1d' ? 'Riders Due in 1-2 Days' : 'Riders Due Today / Overdue'}
                </h4>
                <button onClick={() => setPreviewTab(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '700' }}>Close Preview ✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {(previewTab === '3d' ? dueStats.due3to4Days.users : previewTab === '1d' ? dueStats.due1to2Days.users : dueStats.dueToday.users).map((u, i) => (
                  <div key={i} style={{ background: 'white', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '15px' }}>{u.user_name}</div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>📞 {u.user_phone}</div>
                    <div style={{ fontSize: '13px', color: '#00a66c', fontWeight: '700', marginTop: '6px' }}>
                      🛵 {u.vehicle} • Plan: ₹{u.price}
                    </div>
                    <div style={{ fontSize: '12px', color: '#dc2626', fontWeight: '700', marginTop: '2px' }}>
                      Due Date: {u.next_payment_date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: SENT NOTIFICATION HISTORY                         */}
      {/* ======================================================== */}
      {activeMainTab === 'history' && (
        <div style={{ background: 'white', borderRadius: '20px', border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Sent Broadcast Notifications History</h3>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Showing last 50 dispatches</span>
          </div>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
              <tr>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Notification Title & Message</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Target Audience</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Category</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Action Trigger</th>
                <th style={{ padding: '16px 24px', fontWeight: '700' }}>Sent Time</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No broadcast history records found.
                  </td>
                </tr>
              ) : (
                history.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px 24px', maxWidth: '340px' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{item.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>{item.message}</div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {item.targeted_user_name ? (
                        <div>
                          <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>👤 {item.targeted_user_name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{item.targeted_user_phone}</div>
                        </div>
                      ) : (
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '800' }}>
                          📢 Broadcast ({item.recipient_count || 'All'} riders)
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize' }}>
                        {item.category?.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      {item.action_type === 'pay_now' ? (
                        <span style={{ color: '#00a66c', fontWeight: '800', fontSize: '12px' }}>✓ Pay Now UPI</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>Standard</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '12px', color: '#64748b' }}>
                      {new Date(item.created_at).toLocaleString('en-GB')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
