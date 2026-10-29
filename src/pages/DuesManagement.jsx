import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  AlertTriangle, DollarSign, Users, Clock, ShieldAlert, Tag, Search, 
  Plus, CheckCircle2, ChevronRight, X, Edit2, Trash2, Send, MessageCircle, 
  FileText, RefreshCw, Bike, Calendar, CreditCard, ArrowRight, Ban, Check
} from 'lucide-react';
import ReceiptModal from '../components/ReceiptModal';

const DUE_PRESETS = [
  { title: 'Traffic Camera E-Challan (Signal Jump)', amount: '1000' },
  { title: 'Traffic E-Challan (Speed / Wrong Route)', amount: '500' },
  { title: 'Late Subscription Renewal Fine', amount: '150' },
  { title: 'Scooter Body Panel / Guard Damage', amount: '600' },
  { title: 'Battery Deep Discharge & Recovery Fee', amount: '400' },
  { title: 'Helmet Missing / Replacement Charge', amount: '350' },
  { title: 'Mirror / Indicator Assembly Replacement', amount: '250' },
  { title: 'Cleaning & Wash Surcharge', amount: '120' }
];

export default function DuesManagement() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Overview KPIs State
  const [overview, setOverview] = useState({
    total_due_amount: 0,
    total_riders_with_dues: 0,
    cycle_dues_total: 0,
    deposit_deficit_total: 0,
    extra_dues_total: 0,
    settled_last_30_days: 0,
    overdue_riders_count: 0
  });

  // Main Tabs: 'riders' | 'itemized' | 'overdue'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'riders');
  const [riderFilter, setRiderFilter] = useState('with_dues'); // 'with_dues' | 'overdue' | 'cycle_only' | 'deposit_deficit_only' | 'extra_dues_only' | 'cleared' | 'all'
  const [itemizedStatusFilter, setItemizedStatusFilter] = useState('all'); // 'all' | 'pending' | 'paid' | 'waived'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Data Lists
  const [riders, setRiders] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]); // for dropdown selection
  const [itemizedDues, setItemizedDues] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    user_id: '',
    title: '',
    amount: '',
    due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    notes: '',
    send_notification: true
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const [showCollectModal, setShowCollectModal] = useState(false);
  const [selectedRiderForCollect, setSelectedRiderForCollect] = useState(null);
  const [collectForm, setCollectForm] = useState({
    amount: '',
    payment_mode: 'cash',
    target_type: 'all', // 'all' | 'cycle_due' | 'deposit_deficit' | 'extra_dues'
    utr: '',
    remarks: ''
  });
  const [submittingCollect, setSubmittingCollect] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDue, setEditingDue] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    amount: '',
    due_date: '',
    notes: '',
    status: 'pending'
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Receipt / Demand Notice Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);

  // Load Overview Metrics
  const fetchOverview = async () => {
    try {
      const res = await axios.get('/api/dues/overview', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOverview(res.data);
    } catch (err) {
      console.error('Error loading dues overview:', err);
    }
  };

  // Load Riders Ledger
  const fetchRiders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/dues/riders?filter=${riderFilter}&search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRiders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading dues riders:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Itemized Extra Dues
  const fetchItemized = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/dues/records?status=${itemizedStatusFilter}&search=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItemizedDues(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error loading itemized dues:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load All Users for dropdown selection
  const fetchAllUsers = async () => {
    try {
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsersList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching users list:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchOverview();
      fetchAllUsers();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      if (activeTab === 'itemized') {
        fetchItemized();
      } else {
        fetchRiders();
      }
    }
  }, [token, activeTab, riderFilter, itemizedStatusFilter, searchTerm]);

  // Open Collect Modal
  const openCollectModal = (rider, targetType = 'all') => {
    setSelectedRiderForCollect(rider);
    let defaultAmt = rider.total_due;
    if (targetType === 'cycle_due') defaultAmt = rider.cycle_due;
    if (targetType === 'deposit_deficit') defaultAmt = rider.deposit_deficit;
    if (targetType === 'extra_dues') defaultAmt = rider.extra_dues_total;

    setCollectForm({
      amount: String(defaultAmt || 0),
      payment_mode: 'cash',
      target_type: targetType,
      utr: '',
      remarks: `Dues collection for ${rider.name}`
    });
    setShowCollectModal(true);
  };

  // Handle Collect Submit
  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRiderForCollect) return;

    setSubmittingCollect(true);
    try {
      const res = await axios.post('/api/dues/collect', {
        user_id: selectedRiderForCollect.raw_id || selectedRiderForCollect.id,
        amount: parseFloat(collectForm.amount),
        payment_mode: collectForm.payment_mode,
        target_type: collectForm.target_type,
        utr: collectForm.utr,
        remarks: collectForm.remarks
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(res.data?.message || 'Payment successfully collected!');
      setShowCollectModal(false);
      fetchOverview();
      fetchRiders();
      if (activeTab === 'itemized') fetchItemized();
    } catch (err) {
      alert('Error collecting payment: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingCollect(false);
    }
  };

  // Open Add Due Modal (prefilled if rider given)
  const openAddDueModal = (rider = null) => {
    setAddForm({
      user_id: rider ? String(rider.raw_id || rider.id) : '',
      title: '',
      amount: '',
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      notes: '',
      send_notification: true
    });
    setShowAddModal(true);
  };

  // Handle Add Due Submit
  const handleAddDueSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.user_id) {
      alert('Please select a rider.');
      return;
    }

    setSubmittingAdd(true);
    try {
      await axios.post(`/api/riders/${addForm.user_id}/dues`, {
        title: addForm.title,
        amount: parseFloat(addForm.amount),
        due_date: addForm.due_date,
        notes: addForm.notes,
        send_notification: addForm.send_notification
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Due successfully added and charged to rider!');
      setShowAddModal(false);
      fetchOverview();
      fetchRiders();
      if (activeTab === 'itemized') fetchItemized();
    } catch (err) {
      alert('Error adding due: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Edit Due Modal
  const openEditDueModal = (due) => {
    setEditingDue(due);
    setEditForm({
      title: due.title || '',
      amount: String(due.amount || ''),
      due_date: due.due_date ? new Date(due.due_date).toISOString().split('T')[0] : '',
      notes: due.notes || '',
      status: due.status || 'pending'
    });
    setShowEditModal(true);
  };

  // Handle Edit Due Submit
  const handleEditDueSubmit = async (e) => {
    e.preventDefault();
    if (!editingDue) return;

    setSubmittingEdit(true);
    try {
      await axios.put(`/api/riders/dues/${editingDue.id}`, {
        title: editForm.title,
        amount: parseFloat(editForm.amount),
        due_date: editForm.due_date,
        notes: editForm.notes,
        status: editForm.status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Due record updated successfully.');
      setShowEditModal(false);
      fetchOverview();
      if (activeTab === 'itemized') fetchItemized();
      fetchRiders();
    } catch (err) {
      alert('Error updating due: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 1-Click Update Due Status (e.g. Waive or Mark Paid)
  const handleQuickUpdateStatus = async (dueId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this due record as ${newStatus.toUpperCase()}?`)) return;
    try {
      await axios.patch(`/api/riders/dues/${dueId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOverview();
      if (activeTab === 'itemized') fetchItemized();
      fetchRiders();
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.error || err.message));
    }
  };

  // Delete Due Record
  const handleDeleteDue = async (dueId) => {
    if (!window.confirm('Are you sure you want to permanently delete this due record?')) return;
    try {
      await axios.delete(`/api/riders/dues/${dueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOverview();
      if (activeTab === 'itemized') fetchItemized();
      fetchRiders();
    } catch (err) {
      alert('Error deleting due: ' + (err.response?.data?.error || err.message));
    }
  };

  // 1-Click WhatsApp Reminder
  const handleSendWhatsAppReminder = (rider) => {
    const cleanPhone = (rider.phone || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    let breakdownText = '';
    if (rider.cycle_due > 0) breakdownText += `• Rental Cycle Renewal: ₹${rider.cycle_due.toLocaleString('en-IN')}\n`;
    if (rider.deposit_deficit > 0) breakdownText += `• Security Deposit Deficit: ₹${rider.deposit_deficit.toLocaleString('en-IN')}\n`;
    if (rider.extra_dues_total > 0) breakdownText += `• Extra Penalties / Challans: ₹${rider.extra_dues_total.toLocaleString('en-IN')}\n`;

    const text = encodeURIComponent(`*Localtoto EV - Outstanding Dues Reminder*\n\nHello ${rider.name},\n\nThis is an official payment reminder regarding pending dues on your LocalToto scooter account:\n\n*Total Due Amount:* ₹${parseFloat(rider.total_due || 0).toLocaleString('en-IN')}\n${breakdownText}\n🛵 Vehicle: ${rider.assigned_vehicle || 'Assigned EV'}\n\nPlease settle this payment online via the LocalToto App or UPI to avoid vehicle service suspension.\n\nHelpline: +91 78705 72429\nLocalToto Mobility`);
    window.open(`https://wa.me/${waPhone}?text=${text}`, '_blank');
  };

  // Send In-App & Push Reminder
  const handleSendPushReminder = async (rider) => {
    try {
      const res = await axios.post('/api/dues/send-reminder', {
        user_id: rider.raw_id || rider.id,
        amount: rider.total_due
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data?.message || 'Reminder sent to rider phone!');
    } catch (err) {
      alert('Failed to send reminder: ' + (err.response?.data?.error || err.message));
    }
  };

  // Generate / View Demand Notice
  const handleOpenDemandNotice = (rider) => {
    setSelectedReceiptData({
      receiptNumber: `DUE-NOT-${String(rider.raw_id || rider.id).padStart(5, '0')}`,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      riderName: rider.name,
      riderPhone: rider.phone,
      riderEmail: rider.email,
      riderId: rider.id,
      vehicleModel: rider.vehicle_model || 'LocalToto EV',
      vehicleId: rider.vehicle_reg || rider.vehicle_id || 'EV',
      planName: rider.plan_name || 'Standard Pass',
      planType: rider.plan_type || 'Weekly',
      amountPaid: rider.total_due,
      remarks: `Official Dues Statement. Cycle Due: ₹${rider.cycle_due || 0}, Deposit Shortfall: ₹${rider.deposit_deficit || 0}, Extra Dues: ₹${rider.extra_dues_total || 0}. Please clear immediately.`,
      nextDueDate: rider.next_payment_date ? new Date(rider.next_payment_date).toLocaleDateString('en-IN') : 'Immediate'
    });
    setReceiptModalOpen(true);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={30} color="#dc2626" /> Dues & Receivables Management
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
            Live tracking of subscription rental cycles, security deposit shortfalls, and extra penalty / challan dues.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => {
              fetchOverview();
              fetchRiders();
              if (activeTab === 'itemized') fetchItemized();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}
            title="Refresh Dues Data"
          >
            <RefreshCw size={15} /> Refresh
          </button>

          <button
            type="button"
            onClick={() => openAddDueModal()}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: '#0f172a', color: 'white', border: 'none',
              padding: '10px 18px', borderRadius: '10px', fontWeight: '800', fontSize: '13px',
              cursor: 'pointer', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.25)'
            }}
          >
            <Plus size={16} /> Add New Due / Fine
          </button>
        </div>
      </div>

      {/* 5-Metric Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '26px' }}>
        {/* Total Dues */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase' }}>Total Outstanding Dues</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={18} color="#dc2626" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#b91c1c' }}>
            ₹{overview.total_due_amount.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: '700' }}>
            Across {overview.total_riders_with_dues} active riders with dues
          </div>
        </div>

        {/* Riders with Dues */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Riders with Dues</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
            {overview.total_riders_with_dues}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {overview.overdue_riders_count} currently overdue on renewal
          </div>
        </div>

        {/* Cycle Dues */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Rental Cycle Dues</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={18} color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#d97706' }}>
            ₹{overview.cycle_dues_total.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Pending weekly & monthly plan renewals
          </div>
        </div>

        {/* Deposit Deficits */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Deposit Shortfalls</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={18} color="#7c3aed" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#7c3aed' }}>
            ₹{overview.deposit_deficit_total.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Below min ₹2,000 security deposit requirement
          </div>
        </div>

        {/* Extra Dues */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Extra Penalties / Challans</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag size={18} color="#15803d" />
            </div>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#15803d' }}>
            ₹{overview.extra_dues_total.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            ₹{overview.settled_last_30_days.toLocaleString('en-IN')} collected past 30 days
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '22px', borderBottom: '1px solid #e2e8f0', paddingBottom: '14px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('riders'); setSearchParams({ tab: 'riders' }); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '12px',
            border: activeTab === 'riders' ? '2px solid #dc2626' : '1px solid #cbd5e1',
            background: activeTab === 'riders' ? '#fef2f2' : 'white',
            color: activeTab === 'riders' ? '#b91c1c' : '#64748b',
            fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            boxShadow: activeTab === 'riders' ? '0 2px 6px rgba(220, 38, 38, 0.15)' : 'none'
          }}
        >
          <AlertTriangle size={16} /> Riders Dues Ledger ({riders.length})
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('itemized'); setSearchParams({ tab: 'itemized' }); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '12px',
            border: activeTab === 'itemized' ? '2px solid #0284c7' : '1px solid #cbd5e1',
            background: activeTab === 'itemized' ? '#f0f9ff' : 'white',
            color: activeTab === 'itemized' ? '#0369a1' : '#64748b',
            fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            boxShadow: activeTab === 'itemized' ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none'
          }}
        >
          <Tag size={16} /> Itemized Extra Dues & Fines
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('overdue'); setSearchParams({ tab: 'overdue' }); setRiderFilter('overdue'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 20px', borderRadius: '12px',
            border: activeTab === 'overdue' ? '2px solid #ea580c' : '1px solid #cbd5e1',
            background: activeTab === 'overdue' ? '#fff7ed' : 'white',
            color: activeTab === 'overdue' ? '#c2410c' : '#64748b',
            fontWeight: '800', fontSize: '13px', cursor: 'pointer',
            boxShadow: activeTab === 'overdue' ? '0 2px 6px rgba(234, 88, 12, 0.15)' : 'none'
          }}
        >
          <Clock size={16} /> Overdue Action Center ({overview.overdue_riders_count})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: RIDERS DUES LEDGER & TAB 3: OVERDUE ACTION CENTER */}
      {/* ======================================================== */}
      {(activeTab === 'riders' || activeTab === 'overdue') && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', border: '1px solid #f1f5f9' }}>
          {/* Controls Bar: Search & Sub-filters */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '14px' }} />
              <input
                type="text"
                placeholder="Search rider by name, phone, or scooter reg..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 46px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'with_dues', label: 'Riders with Dues' },
                { id: 'overdue', label: '⚠️ Overdue Only' },
                { id: 'cycle_only', label: 'Cycle Dues Only' },
                { id: 'deposit_deficit_only', label: 'Deposit Shortfalls' },
                { id: 'extra_dues_only', label: 'Extra Dues' },
                { id: 'all', label: 'All Riders' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setRiderFilter(f.id)}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                    border: riderFilter === f.id ? '2px solid #0f172a' : '1px solid #cbd5e1',
                    background: riderFilter === f.id ? '#0f172a' : 'white',
                    color: riderFilter === f.id ? 'white' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafafa', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Rider</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Assigned Scooter & Plan</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Due Breakdown</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Total Due</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Due Status / Timeline</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      Loading dues records...
                    </td>
                  </tr>
                ) : riders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px auto' }} />
                      <div style={{ fontWeight: '800', color: '#0f172a' }}>Zero Outstanding Dues!</div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>No riders currently match the selected filter.</div>
                    </td>
                  </tr>
                ) : (
                  riders.map(r => (
                    <tr key={r.raw_id || r.id} style={{ borderTop: '1px solid #f1f5f9', fontSize: '13px' }}>
                      {/* Rider */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: r.has_due ? '#fee2e2' : '#dcfce7', color: r.has_due ? '#dc2626' : '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                            {r.name ? r.name.charAt(0).toUpperCase() : 'R'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', color: '#0f172a' }}>{r.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {r.phone}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>ID: {r.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Scooter & Plan */}
                      <td style={{ padding: '16px 18px' }}>
                        {r.assigned_vehicle ? (
                          <div>
                            <div style={{ fontWeight: '700', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Bike size={14} /> {r.assigned_vehicle}
                            </div>
                            <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                              {r.plan_name ? `${r.plan_name} (₹${r.plan_price})` : 'Standard Plan'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>No EV Assigned</span>
                        )}
                      </td>

                      {/* Due Breakdown */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: r.cycle_due > 0 ? '#dc2626' : '#64748b' }}>
                            <span>Cycle Rent:</span>
                            <strong style={{ color: r.cycle_due > 0 ? '#dc2626' : '#0f172a' }}>₹{r.cycle_due.toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: r.deposit_deficit > 0 ? '#d97706' : '#64748b' }}>
                            <span>Deposit Deficit:</span>
                            <strong style={{ color: r.deposit_deficit > 0 ? '#d97706' : '#0f172a' }}>₹{r.deposit_deficit.toLocaleString('en-IN')}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: r.extra_dues_total > 0 ? '#b91c1c' : '#64748b' }}>
                            <span>Extra Fines ({r.extra_dues_count || 0}):</span>
                            <strong style={{ color: r.extra_dues_total > 0 ? '#b91c1c' : '#0f172a' }}>₹{r.extra_dues_total.toLocaleString('en-IN')}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Total Due */}
                      <td style={{ padding: '16px 18px' }}>
                        {r.has_due ? (
                          <div>
                            <div style={{ fontSize: '18px', fontWeight: '900', color: '#dc2626' }}>
                              ₹{r.total_due.toLocaleString('en-IN')}
                            </div>
                            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                              Pending
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#16a34a' }}>
                              ₹0
                            </div>
                            <span style={{ background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
                              All Clear
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Due Status / Timeline */}
                      <td style={{ padding: '16px 18px' }}>
                        {r.is_overdue || r.overdue_days > 0 ? (
                          <div>
                            <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={12} /> {r.overdue_days}d Overdue
                            </span>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                              Due since: {r.next_payment_date ? new Date(r.next_payment_date).toLocaleDateString('en-IN') : 'N/A'}
                            </div>
                          </div>
                        ) : r.has_due ? (
                          <div>
                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800' }}>
                              Due Pending
                            </span>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                              Next Renewal: {r.next_payment_date ? new Date(r.next_payment_date).toLocaleDateString('en-IN') : 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '700' }}>
                            Next Renewal: {r.next_payment_date ? new Date(r.next_payment_date).toLocaleDateString('en-IN') : 'N/A'}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {r.has_due && (
                            <button
                              type="button"
                              onClick={() => openCollectModal(r)}
                              style={{
                                background: '#16a34a', color: 'white', border: 'none',
                                padding: '6px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '800',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
                              }}
                              title="Collect Payment"
                            >
                              <DollarSign size={13} /> Collect
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openAddDueModal(r)}
                            style={{
                              background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1',
                              padding: '6px 9px', borderRadius: '7px', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                            title="Add Extra Due / Fine for this rider"
                          >
                            <Plus size={12} /> Due
                          </button>

                          {r.has_due && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppReminder(r)}
                                style={{
                                  background: '#25d366', color: 'white', border: 'none',
                                  padding: '6px 9px', borderRadius: '7px', fontSize: '12px', fontWeight: '700',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                title="Send WhatsApp Due Notice"
                              >
                                <MessageCircle size={13} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendPushReminder(r)}
                                style={{
                                  background: '#0284c7', color: 'white', border: 'none',
                                  padding: '6px 9px', borderRadius: '7px', fontSize: '12px', fontWeight: '700',
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                                }}
                                title="Send In-App Push Notification"
                              >
                                <Send size={12} />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDemandNotice(r)}
                            style={{
                              background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd',
                              padding: '6px 9px', borderRadius: '7px', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                            }}
                            title="Print / View Dues Demand Note"
                          >
                            <FileText size={13} /> Notice
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/users?riderId=${r.raw_id || r.id}&tab=dues`)}
                            style={{
                              background: 'white', color: '#475569', border: '1px solid #cbd5e1',
                              padding: '6px 9px', borderRadius: '7px', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer'
                            }}
                            title="Open Rider Profile"
                          >
                            <ChevronRight size={14} />
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
      {/* TAB 2: ITEMIZED EXTRA DUES LEDGER                        */}
      {/* ======================================================== */}
      {activeTab === 'itemized' && (
        <div style={{ background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', border: '1px solid #f1f5f9' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
            <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '14px' }} />
              <input
                type="text"
                placeholder="Search extra dues by title, rider name, or phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 16px 12px 46px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'All Due Records' },
                { id: 'pending', label: '⏳ Pending Only' },
                { id: 'paid', label: '✓ Paid / Settled' },
                { id: 'waived', label: '✕ Waived' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setItemizedStatusFilter(f.id)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
                    border: itemizedStatusFilter === f.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: itemizedStatusFilter === f.id ? '#f0f9ff' : 'white',
                    color: itemizedStatusFilter === f.id ? '#0369a1' : '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Itemized Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafafa', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Due ID & Date</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Rider</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Reason / Title</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Amount</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Due Date</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      Loading itemized dues...
                    </td>
                  </tr>
                ) : itemizedDues.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                      No due records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  itemizedDues.map(d => (
                    <tr key={d.id} style={{ borderTop: '1px solid #f1f5f9', fontSize: '13px' }}>
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a' }}>#DUE-{d.id}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(d.created_at).toLocaleDateString('en-IN')}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{d.user_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>📞 {d.user_phone}</div>
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{d.title}</div>
                        {d.notes && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{d.notes}</div>}
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: d.status === 'paid' ? '#15803d' : '#dc2626' }}>
                          ₹{parseFloat(d.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>

                      <td style={{ padding: '16px 18px', color: '#475569', fontSize: '12px' }}>
                        {d.due_date ? new Date(d.due_date).toLocaleDateString('en-IN') : 'N/A'}
                      </td>

                      <td style={{ padding: '16px 18px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase',
                          background: d.status === 'paid' ? '#dcfce7' : d.status === 'waived' ? '#f1f5f9' : '#fef3c7',
                          color: d.status === 'paid' ? '#15803d' : d.status === 'waived' ? '#64748b' : '#b45309'
                        }}>
                          {d.status}
                        </span>
                      </td>

                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {d.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickUpdateStatus(d.id, 'paid')}
                                style={{ background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                title="Mark Due as Paid"
                              >
                                Mark Paid
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickUpdateStatus(d.id, 'waived')}
                                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#64748b', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                title="Waive this Due"
                              >
                                Waive
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => openEditDueModal(d)}
                            style={{ background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0284c7', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer' }}
                            title="Edit Due Record"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDue(d.id)}
                            style={{ background: '#fee2e2', border: 'none', color: '#dc2626', padding: '6px 8px', borderRadius: '6px', cursor: 'pointer' }}
                            title="Delete Due Record"
                          >
                            <Trash2 size={13} />
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
      {/* MODAL 1: ADD NEW DUE / FINE                              */}
      {/* ======================================================== */}
      {showAddModal && (
        <div 
          onClick={() => setShowAddModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '20px' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: '520px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #cbd5e1' }}
          >
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Plus size={18} color="#dc2626" /> Add Due / Penalty Charge
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Assign custom fee, traffic e-challan, or penalty to a rider account.
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddDueSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Select Rider */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Select Rider *
                </label>
                <select
                  required
                  value={addForm.user_id}
                  onChange={e => setAddForm(prev => ({ ...prev, user_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white' }}
                >
                  <option value="">-- Choose Rider --</option>
                  {allUsersList.map(u => (
                    <option key={u.id} value={u.raw_id || u.id}>
                      {u.name} (📞 {u.phone}) • {u.assigned_vehicle || 'No EV'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Quick Preset Reasons:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {DUE_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAddForm(prev => ({ ...prev, title: p.title, amount: p.amount }))}
                      style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                    >
                      + {p.title.split(' ')[0]} (₹{p.amount})
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Amount Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Due Title / Reason *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Traffic Camera E-Challan"
                    value={addForm.title}
                    onChange={e => setAddForm(prev => ({ ...prev, title: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="500"
                    value={addForm.amount}
                    onChange={e => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', fontWeight: '800', color: '#dc2626' }}
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={addForm.due_date}
                  onChange={e => setAddForm(prev => ({ ...prev, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Internal Audit Notes / Reference
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Parivahan challan #UP14... on Bailey road signal"
                  value={addForm.notes}
                  onChange={e => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              {/* Send Notification Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={addForm.send_notification}
                  onChange={e => setAddForm(prev => ({ ...prev, send_notification: e.target.checked }))}
                />
                Send push notification and in-app alert to rider phone immediately
              </label>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  style={{ flex: 1.5, padding: '11px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: '800', fontSize: '13px', cursor: submittingAdd ? 'not-allowed' : 'pointer' }}
                >
                  {submittingAdd ? 'Adding Due...' : 'Confirm & Charge Due'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: COLLECT / SETTLE DUES PAYMENT                   */}
      {/* ======================================================== */}
      {showCollectModal && selectedRiderForCollect && (
        <div 
          onClick={() => setShowCollectModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '20px' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: '520px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #cbd5e1' }}
          >
            {/* Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={18} color="#16a34a" /> Collect Dues Payment
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Rider: <strong>{selectedRiderForCollect.name}</strong> (📞 {selectedRiderForCollect.phone})
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCollectModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCollectSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Due Summary Card */}
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#991b1b', textTransform: 'uppercase' }}>Current Outstanding Due</div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#dc2626', marginTop: '2px' }}>
                    ₹{selectedRiderForCollect.total_due.toLocaleString('en-IN')}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '11px', color: '#7f1d1d' }}>
                  <div>Cycle: ₹{selectedRiderForCollect.cycle_due || 0}</div>
                  <div>Deposit: ₹{selectedRiderForCollect.deposit_deficit || 0}</div>
                  <div>Extra: ₹{selectedRiderForCollect.extra_dues_total || 0}</div>
                </div>
              </div>

              {/* Target Type */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Settlement Allocation *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'all', label: 'All Dues (Full Clearance)' },
                    { id: 'cycle_due', label: 'Cycle Renewal Only' },
                    { id: 'deposit_deficit', label: 'Deposit Shortfall Only' },
                    { id: 'extra_dues', label: 'Extra Penalties Only' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setCollectForm(prev => ({
                          ...prev,
                          target_type: t.id,
                          amount: String(
                            t.id === 'cycle_due' ? (selectedRiderForCollect.cycle_due || 0) :
                            t.id === 'deposit_deficit' ? (selectedRiderForCollect.deposit_deficit || 0) :
                            t.id === 'extra_dues' ? (selectedRiderForCollect.extra_dues_total || 0) :
                            selectedRiderForCollect.total_due
                          )
                        }));
                      }}
                      style={{
                        padding: '8px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                        border: collectForm.target_type === t.id ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        background: collectForm.target_type === t.id ? '#f0fdf4' : 'white',
                        color: collectForm.target_type === t.id ? '#15803d' : '#475569',
                        cursor: 'pointer'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Collected & Payment Mode */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Amount Collected (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={collectForm.amount}
                    onChange={e => setCollectForm(prev => ({ ...prev, amount: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: '900', color: '#16a34a', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                    Payment Mode *
                  </label>
                  <select
                    value={collectForm.payment_mode}
                    onChange={e => setCollectForm(prev => ({ ...prev, payment_mode: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white' }}
                  >
                    <option value="cash">Cash Collection</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="wallet_deduct">Wallet Balance Deduction</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* UTR / Reference */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Bank UTR / Transaction Reference ID
                </label>
                <input
                  type="text"
                  placeholder="Optional for cash, required for UPI"
                  value={collectForm.utr}
                  onChange={e => setCollectForm(prev => ({ ...prev, utr: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', fontFamily: 'monospace' }}
                />
              </div>

              {/* Remarks */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px', textTransform: 'uppercase' }}>
                  Collection Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid at stand in cash"
                  value={collectForm.remarks}
                  onChange={e => setCollectForm(prev => ({ ...prev, remarks: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCollect}
                  style={{ flex: 1.6, padding: '11px', borderRadius: '8px', border: 'none', background: '#16a34a', color: 'white', fontWeight: '800', fontSize: '13px', cursor: submittingCollect ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <CheckCircle2 size={16} /> {submittingCollect ? 'Recording Collection...' : 'Confirm & Settle Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT DUE RECORD                                 */}
      {/* ======================================================== */}
      {showEditModal && editingDue && (
        <div 
          onClick={() => setShowEditModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 11000, padding: '20px' }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #cbd5e1' }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                Edit Due Record #{editingDue.id}
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleEditDueSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px' }}>Title</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px' }}>Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={editForm.amount}
                    onChange={e => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px' }}>Status</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', background: 'white' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="waived">Waived</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px' }}>Due Date</label>
                <input
                  type="date"
                  value={editForm.due_date}
                  onChange={e => setEditForm(prev => ({ ...prev, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '5px' }}>Notes</label>
                <textarea
                  rows="2"
                  value={editForm.notes}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', fontWeight: '700' }}>Cancel</button>
                <button type="submit" disabled={submittingEdit} style={{ flex: 1.5, padding: '10px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '800' }}>
                  {submittingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Printable / PDF Receipt & Demand Notice Modal */}
      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={selectedReceiptData}
      />
    </div>
  );
}
