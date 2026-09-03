import { useState, useEffect } from 'react';
import { Megaphone, Calendar, Clock, AlertTriangle, Send, CheckCircle2, Users, Bell, Search, RefreshCw, Sparkles, Filter, CreditCard, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Broadcast() {
  const { token } = useAuth();
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
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
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
      setTitle('');
      setMessage('');
      fetchHistory();
    } catch (e) {
      alert('Failed to send custom notification: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Megaphone size={28} color="#00a66c" /> Broadcast Notifications
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>Automate payment due reminders and send custom announcements with instant Pay Now triggers.</p>
        </div>
        <button 
          onClick={() => { fetchDueStats(); fetchHistory(); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* SECTION 1: 3 SMART TRIGGER CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        
        {/* Preset 1: 3-4 Days */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Calendar size={22} color="#3b82f6" />
              </div>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                {dueStats.due3to4Days.count} Riders Due
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Due in 3–4 Days</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Gentle advance reminder for active subscribers whose renewal is 3–4 days away.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => sendPresetReminder('payment_reminder_3d', dueStats.due3to4Days.count)}
              disabled={sending}
              style={{ flex: 1, background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Send size={15} /> Send Reminder
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
        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #fed7aa', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              disabled={sending}
              style={{ flex: 1, background: '#ea580c', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Send size={15} /> Send Urgent Alert
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
        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <span style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '800' }}>
                {dueStats.dueToday.count} Critical Riders
              </span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>Due Today / Overdue</h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Immediate action alert warning of impending auto-lock and direct Pay Now activation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => sendPresetReminder('payment_reminder_today', dueStats.dueToday.count)}
              disabled={sending}
              style={{ flex: 1, background: '#dc2626', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Send size={15} /> Send Immediate Alert
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

      {/* Due Users Preview Modal / Section */}
      {previewTab && (
        <div style={{ background: '#f8fafc', borderRadius: '18px', padding: '20px', border: '1px solid #e2e8f0', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {previewTab === '3d' ? 'Riders Due in 3-4 Days' : previewTab === '1d' ? 'Riders Due in 1-2 Days' : 'Riders Due Today / Overdue'}
            </h4>
            <button onClick={() => setPreviewTab(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: '700' }}>Close Preview ✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
            {(previewTab === '3d' ? dueStats.due3to4Days.users : previewTab === '1d' ? dueStats.due1to2Days.users : dueStats.dueToday.users).map((u, i) => (
              <div key={i} style={{ background: 'white', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '14px' }}>{u.user_name}</div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {u.user_phone}</div>
                <div style={{ fontSize: '12px', color: '#00a66c', fontWeight: '700', marginTop: '4px' }}>
                  {u.vehicle} • Due: {u.next_payment_date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: CUSTOM NOTIFICATION BROADCASTER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '28px', marginBottom: '36px' }}>
        
        {/* Custom Broadcast Form */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#00a66c" /> Custom Broadcast
          </h2>

          <form onSubmit={handleSendCustom}>
            {/* Target Audience */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: 'white', color: '#0f172a' }}
              >
                <option value="all">📢 All Drivers & Users ({usersList.length} total)</option>
                <optgroup label="Select Specific Rider">
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.phone})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Category */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Notification Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', background: 'white', color: '#0f172a' }}
              >
                <option value="general">Announcement / General</option>
                <option value="payment_reminder">Payment Due Reminder</option>
                <option value="maintenance">Maintenance / Swap Hub Alert</option>
                <option value="offer">Special Discount / Cashback Offer</option>
              </select>
            </div>

            {/* Title */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Notification Title
              </label>
              <input
                type="text"
                placeholder="e.g. Special Discount: Renew your pass today!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                Message Content
              </label>
              <textarea
                rows="4"
                placeholder="Write your announcement or notice text here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              />
            </div>

            {/* Pay Now Button Activation Checkbox */}
            <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <input
                type="checkbox"
                id="enablePayNow"
                checked={enablePayNow}
                onChange={(e) => setEnablePayNow(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#00a66c', cursor: 'pointer' }}
              />
              <label htmlFor="enablePayNow" style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', cursor: 'pointer' }}>
                Activate "Pay Now" Flow on Click
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                  When rider taps notification in mobile app, open the payment checkout sheet directly.
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={sending}
              style={{ width: '100%', background: '#00a66c', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Send size={16} /> {sending ? 'Broadcasting...' : 'Broadcast Notification Now'}
            </button>
          </form>
        </div>

        {/* SECTION 3: BROADCAST HISTORY */}
        <div style={{ background: 'white', borderRadius: '20px', padding: '28px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: '0 0 18px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={20} color="#1d7afc" /> Sent Broadcast History
          </h2>

          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
            {history.map((n) => (
              <div key={n.id} style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 2px 0' }}>{n.title}</h4>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Audience: <span style={{ fontWeight: '700', color: '#0f172a' }}>{n.targeted_user_name ? `${n.targeted_user_name} (${n.targeted_user_phone})` : `All Users (${n.recipient_count})`}</span>
                    </div>
                  </div>
                  <span style={{ 
                    background: n.category?.includes('payment') ? '#fef3c7' : '#e0f2fe',
                    color: n.category?.includes('payment') ? '#d97706' : '#0284c7',
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase'
                  }}>
                    {n.category || 'General'}
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  {n.message}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                  <span>Sent: {new Date(n.created_at).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  {n.action_type === 'pay_now' && (
                    <span style={{ color: '#00a66c', fontWeight: '700' }}>⚡ Pay Now Action Enabled</span>
                  )}
                </div>
              </div>
            ))}

            {history.length === 0 && !loading && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b' }}>
                <Megaphone size={40} color="#94a3b8" style={{ marginBottom: '10px', opacity: 0.5 }} />
                <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>No Broadcasts Sent Yet</div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Sent notifications and payment reminders will appear here.</div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
