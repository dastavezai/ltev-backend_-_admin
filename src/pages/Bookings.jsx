import { useState, useEffect } from 'react';
import { 
  CalendarCheck, CalendarPlus, Bike, User, DollarSign, Calendar, Clock, Plus, Search, 
  AlertTriangle, Send, Trash2, X, ShieldAlert, RefreshCw, Phone, Edit3, ArrowUpDown, ArrowUp, ArrowDown, Check, Download, FileText, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { handleOpenInvoiceWindow, getShortBookingId } from '../utils/invoice';

// Helper to format local Date for datetime-local input
const getLocalDatetimeString = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

export default function Bookings() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('pre_booking');

  // Sorting state: field: 'name' | 'mobile' | 'payment' | 'date' | 'due', direction: 'asc' | 'desc'
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    user_id: '',
    name: '',
    phone: '',
    email: '',
    kyc_status: 'verified',
    vehicle_id: '',
    plan_id: '',
    booking_type: 'pre_booking',
    pre_booking_date: getLocalDatetimeString(),
    payment_mode: 'cash',
    payment_status: 'paid',
    collected_amount: '1500',
    remarks: ''
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Modal State (Includes Delete inside Edit)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState({
    user_name: '',
    user_phone: '',
    collected_amount: '',
    pre_booking_date: '',
    remarks: '',
    payment_mode: 'cash',
    vehicle_id: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Assign EV Vehicle Modal State (2-Step: Payment Confirmation + EV Assignment)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignStep, setAssignStep] = useState(1);
  const [evSearchQuery, setEvSearchQuery] = useState('');
  const [onlyUnassignedEVs, setOnlyUnassignedEVs] = useState(true);
  const [assigningBooking, setAssigningBooking] = useState(null);
  const [showMoreAssignOptions, setShowMoreAssignOptions] = useState(false);
  const [assignForm, setAssignForm] = useState({
    vehicle_id: '',
    additional_payment: '',
    payment_mode: 'cash',
    remarks: '',
    assignment_date: getLocalDatetimeString()
  });
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Payment Rows States for Multi-Payment Entries
  const [createPaymentRows, setCreatePaymentRows] = useState([
    { mode: 'cash', amount: '1500', remarks: '' }
  ]);
  const [editPaymentRows, setEditPaymentRows] = useState([
    { mode: 'cash', amount: '1500', remarks: '' }
  ]);
  const [assignPaymentRows, setAssignPaymentRows] = useState([
    { mode: 'cash', amount: '3600', remarks: '' }
  ]);

  const renderPaymentRowsBuilder = (rows, setRows, targetTotal = null) => {
    const totalEntered = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

    const handleRowChange = (index, field, value) => {
      const updated = [...rows];
      updated[index] = { ...updated[index], [field]: value };
      setRows(updated);
    };

    const handleAddSpecificMode = (mode) => {
      let initialAmt = '';
      if (targetTotal && targetTotal > totalEntered) {
        initialAmt = String(targetTotal - totalEntered);
      }
      setRows([...rows, { mode, amount: initialAmt, remarks: '' }]);
    };

    const handleRemoveRow = (index) => {
      if (rows.length <= 1) return;
      setRows(rows.filter((_, i) => i !== index));
    };

    return (
      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>
            Payment Method Entries
          </label>
          {targetTotal !== null && targetTotal > 0 && (
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}>
              Target Due: <strong style={{ color: '#0f172a' }}>₹{targetTotal.toLocaleString('en-IN')}</strong>
            </span>
          )}
        </div>

        {/* Dynamic Payment Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
          {rows.map((row, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr auto', gap: '6px', alignItems: 'center' }}>
              {/* Payment Mode */}
              <select
                value={row.mode}
                onChange={(e) => handleRowChange(idx, 'mode', e.target.value)}
                style={{ padding: '7px 6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', background: 'white' }}
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI / QR</option>
                <option value="credit">Credit / Udhar</option>
              </select>

              {/* Amount */}
              <input
                type="number"
                placeholder="Amount ₹"
                value={row.amount}
                onChange={(e) => handleRowChange(idx, 'amount', e.target.value)}
                style={{ padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', background: 'white', boxSizing: 'border-box' }}
                required
              />

              {/* Remarks */}
              <input
                type="text"
                placeholder={row.mode === 'upi' ? 'UTR Ref No.' : row.mode === 'credit' ? 'Promise Date / Udhar note' : 'Remark (optional)'}
                value={row.remarks}
                onChange={(e) => handleRowChange(idx, 'remarks', e.target.value)}
                style={{ padding: '7px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', background: 'white', boxSizing: 'border-box' }}
              />

              {/* Trash icon button */}
              {rows.length > 1 ? (
                <button
                  type="button"
                  onClick={() => handleRemoveRow(idx)}
                  style={{ background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Remove Method"
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <div style={{ width: '28px' }} />
              )}
            </div>
          ))}
        </div>

        {/* Quick Add Bar */}
        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '8px', marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>
            + Click to Add Payment Method:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleAddSpecificMode('cash')}
              style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Plus size={12} /> Cash
            </button>
            <button
              type="button"
              onClick={() => handleAddSpecificMode('upi')}
              style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Plus size={12} /> UPI
            </button>
            <button
              type="button"
              onClick={() => handleAddSpecificMode('credit')}
              style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
            >
              <Plus size={12} /> Credit / Udhar
            </button>
          </div>
        </div>

        {/* Total Summary Counter */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: targetTotal !== null && targetTotal > 0 && totalEntered < targetTotal ? '#d97706' : '#16a34a' }}>
            Total Payment Added: ₹{totalEntered.toLocaleString('en-IN')}
          </div>
        </div>
      </div>
    );
  };

  const fetchData = async () => {
    const authToken = token || localStorage.getItem('token');
    setLoading(true);
    try {
      const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
      const [bkgRes, usrRes, vehRes, plnRes] = await Promise.all([
        axios.get('/api/bookings/all', { headers }),
        axios.get('/api/users', { headers }),
        axios.get('/api/vehicles', { headers }),
        axios.get('/api/plans', { headers })
      ]);

      setBookings(bkgRes.data || []);
      setUsers(usrRes.data || []);
      setVehicles(vehRes.data || []);
      setPlans(plnRes.data || []);
    } catch (err) {
      console.error('Error fetching bookings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Sort Toggle
  const handleSort = (field) => {
    let direction = 'asc';
    if (sortConfig.field === field && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ field, direction });
  };

  const getSortIcon = (field) => {
    if (sortConfig.field !== field) return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: '4px' }} />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp size={12} style={{ marginLeft: '4px', color: '#0284c7' }} /> : 
      <ArrowDown size={12} style={{ marginLeft: '4px', color: '#0284c7' }} />;
  };

  const handleOpenCreateModal = () => {
    const defaultPlanId = plans.length > 0 ? String(plans[0].id) : '';

    setCreateForm({
      user_id: '',
      name: '',
      phone: '',
      email: '',
      kyc_status: 'verified',
      vehicle_id: '',
      plan_id: defaultPlanId,
      booking_type: 'pre_booking',
      pre_booking_date: getLocalDatetimeString(),
      payment_mode: 'cash',
      payment_status: 'paid',
      collected_amount: '1500',
      remarks: ''
    });
    setCreatePaymentRows([
      { mode: 'cash', amount: '1500', remarks: '' }
    ]);
    setCreateModalOpen(true);
  };

  const handleSaveBooking = async (e) => {
    e.preventDefault();
    if ((!createForm.user_id && (!createForm.name || !createForm.phone)) || !createForm.plan_id) {
      alert('Please enter rider Full Name, Mobile Number and select a Subscription Plan.');
      return;
    }

    setSubmittingCreate(true);
    try {
      const totalPaid = createPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const breakdownStr = createPaymentRows.map(r => {
        const modeLabel = r.mode === 'cash' ? 'Cash' : r.mode === 'upi' ? 'UPI' : r.mode === 'credit' ? 'Credit' : 'Deposit';
        const rem = r.remarks ? ` (${r.remarks})` : '';
        return `${modeLabel}: ₹${r.amount || 0}${rem}`;
      }).join(' + ');

      const primaryMode = createPaymentRows.length === 1 ? createPaymentRows[0].mode : 'mixed';
      const combinedRemarks = [createForm.remarks, breakdownStr].filter(Boolean).join(' | ');

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL || ''}/api/bookings/create`,
        {
          ...createForm,
          user_name: createForm.name,
          user_phone: createForm.phone,
          collected_amount: String(totalPaid),
          deposit_amount: Math.min(3500, totalPaid),
          cycle_amount: Math.max(0, totalPaid - Math.min(3500, totalPaid)),
          payment_mode: primaryMode,
          remarks: combinedRemarks
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const createdBooking = res.data.booking || {
        id: `ADV-${Date.now().toString().slice(-4)}`,
        user_name: createForm.name,
        user_phone: createForm.phone,
        total_cost: totalPaid,
        collected_amount: totalPaid,
        pre_booking_date: createForm.pre_booking_date,
        payment_mode: primaryMode,
        remarks: combinedRemarks
      };

      setCreateModalOpen(false);
      fetchData();

      // Automatically open downloadable & printable receipt
      handleOpenInvoiceWindow({
        ...createdBooking,
        user_name: createForm.name || createdBooking.user_name,
        user_phone: createForm.phone || createdBooking.user_phone,
        total_cost: totalPaid,
        collected_amount: totalPaid,
        payment_mode: primaryMode,
        remarks: combinedRemarks,
        pre_booking_date: createForm.pre_booking_date
      });
    } catch (err) {
      alert('Error creating booking: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (booking) => {
    setEditingBooking(booking);
    const paid = parseFloat(booking.total_cost || booking.collected_amount || booking.plan_price || 0);
    const dateStr = booking.pre_booking_date || booking.start_time;
    let formattedDate = '';
    if (dateStr) {
      try {
        formattedDate = new Date(dateStr).toISOString().slice(0, 16);
      } catch (e) {}
    }

    const cleanReceipt = (booking.remarks && !booking.remarks.startsWith('ADV-BKG') && !booking.remarks.startsWith('BKG-') && !booking.remarks.toLowerCase().includes('advance booking deposit')) ? booking.remarks : '';

    setEditForm({
      user_name: booking.user_name || '',
      user_phone: booking.user_phone || '',
      collected_amount: String(paid || ''),
      pre_booking_date: formattedDate || new Date().toISOString().slice(0, 16),
      remarks: cleanReceipt,
      payment_mode: booking.payment_mode || 'cash',
      vehicle_id: booking.vehicle_id || ''
    });
    setEditPaymentRows([
      { mode: booking.payment_mode && booking.payment_mode !== 'mixed' ? booking.payment_mode : 'cash', amount: String(paid || 1500), remarks: '' }
    ]);
    setEditModalOpen(true);
  };

  // Submit Edit Form
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    setSubmittingEdit(true);
    try {
      const totalPaid = editPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const breakdownStr = editPaymentRows.map(r => {
        const modeLabel = r.mode === 'cash' ? 'Cash' : r.mode === 'upi' ? 'UPI' : r.mode === 'credit' ? 'Credit' : 'Deposit';
        const rem = r.remarks ? ` (${r.remarks})` : '';
        return `${modeLabel}: ₹${r.amount || 0}${rem}`;
      }).join(' + ');

      const primaryMode = editPaymentRows.length === 1 ? editPaymentRows[0].mode : 'mixed';
      const combinedRemarks = [editForm.remarks, breakdownStr].filter(Boolean).join(' | ');

      await axios.put(
        `/api/bookings/${editingBooking.id}`,
        {
          ...editForm,
          collected_amount: String(totalPaid),
          payment_mode: primaryMode,
          remarks: combinedRemarks
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Booking record updated successfully!');
      setEditModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Error updating record: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Assign EV Modal (2-step: Step 1 Payment confirmation, Step 2 Assign EV)
  const handleOpenAssignModal = (booking) => {
    setAssigningBooking(booking);
    setAssignStep(1);
    setEvSearchQuery('');
    setOnlyUnassignedEVs(true);
    setShowMoreAssignOptions(false);
    const paid = parseFloat(booking.total_cost || booking.collected_amount || booking.plan_price || 0);
    const due = Math.max(0, 5100 - paid);

    setAssignForm({
      vehicle_id: booking.vehicle_id || '',
      additional_payment: String(due),
      payment_mode: booking.payment_mode || 'cash',
      remarks: '',
      assignment_date: getLocalDatetimeString()
    });
    setAssignPaymentRows([
      { mode: 'cash', amount: String(due), remarks: '' }
    ]);
    setAssignModalOpen(true);

    // Refresh live vehicles list immediately so newly created vehicles appear instantly
    const authToken = token || localStorage.getItem('token');
    if (authToken) {
      axios.get('/api/vehicles', { headers: { Authorization: `Bearer ${authToken}` } })
        .then(res => { if (res.data) setVehicles(res.data); })
        .catch(err => console.error('Error refreshing vehicles on modal open:', err));
    }
  };

  // Submit Assign EV Vehicle
  const handleAssignVehicleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!assigningBooking || !assignForm.vehicle_id) {
      alert('Please select an EV scooter to assign.');
      return;
    }

    setSubmittingAssign(true);
    try {
      const prevPaid = parseFloat(assigningBooking.advance_paid !== null && assigningBooking.advance_paid !== undefined ? assigningBooking.advance_paid : (assigningBooking.collected_amount || assigningBooking.total_cost || 0));
      const addedPaid = assignPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const totalPaidNow = prevPaid + addedPaid;

      const breakdownStr = assignPaymentRows.map(r => {
        const modeLabel = r.mode === 'cash' ? 'Cash' : r.mode === 'upi' ? 'UPI' : r.mode === 'credit' ? 'Credit' : 'Deposit';
        const rem = r.remarks ? ` (${r.remarks})` : '';
        return `${modeLabel}: ₹${r.amount || 0}${rem}`;
      }).join(' + ');

      const primaryMode = assignPaymentRows.length === 1 ? assignPaymentRows[0].mode : 'mixed';
      const combinedRemarks = [assignForm.remarks, breakdownStr].filter(Boolean).join(' | ');

      await axios.put(
        `/api/bookings/${assigningBooking.id}`,
        {
          vehicle_id: assignForm.vehicle_id,
          status: 'active',
          collected_amount: totalPaidNow,
          advance_paid: prevPaid,
          handover_amount: addedPaid,
          advance_payment_mode: assigningBooking.advance_payment_mode || assigningBooking.payment_mode || 'cash',
          handover_payment_mode: primaryMode,
          advance_remarks: assigningBooking.advance_remarks || assigningBooking.remarks || '',
          handover_remarks: combinedRemarks,
          payment_mode: primaryMode,
          remarks: combinedRemarks || assigningBooking.remarks,
          start_time: assignForm.assignment_date,
          assignment_date: assignForm.assignment_date,
          pre_booking_date: assigningBooking.pre_booking_date,
          deposit_amount: Math.min(3500, totalPaidNow),
          cycle_amount: Math.max(0, totalPaidNow - Math.min(3500, totalPaidNow))
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const selectedVeh = vehicles.find(v => v.id === assignForm.vehicle_id);
      const updatedBooking = {
        ...assigningBooking,
        vehicle_id: selectedVeh?.vehicle_id || selectedVeh?.id || assignForm.vehicle_id,
        vehicle_name: selectedVeh?.vehicle_id || selectedVeh?.id || assignForm.vehicle_id,
        vehicle_model: selectedVeh?.model || assigningBooking.vehicle_model || 'LT Commercial EV',
        status: 'active',
        total_cost: totalPaidNow,
        collected_amount: totalPaidNow,
        advance_paid: prevPaid,
        handover_amount: addedPaid,
        advance_payment_mode: assigningBooking.advance_payment_mode || assigningBooking.payment_mode || 'cash',
        handover_payment_mode: primaryMode,
        advance_remarks: assigningBooking.advance_remarks || assigningBooking.remarks || '',
        handover_remarks: combinedRemarks,
        location: selectedVeh?.location || assigningBooking.location || 'Khajpura Stand',
        payment_mode: primaryMode,
        remarks: combinedRemarks || assigningBooking.remarks,
        start_time: assignForm.assignment_date,
        assignment_date: assignForm.assignment_date,
        pre_booking_date: assigningBooking.pre_booking_date || assigningBooking.created_at,
        advance_booking_id: assigningBooking.id,
        handover_id: assigningBooking.handover_id || (`HND-${(assigningBooking.id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`)
      };

      setAssignModalOpen(false);
      fetchData();

      // Automatically download & view official handover receipt
      handleOpenInvoiceWindow(updatedBooking, 'booking_confirm');
    } catch (err) {
      alert('Failed to assign EV: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Delete Booking
  const handleDeleteBooking = async (id) => {
    if (!window.confirm(`Delete Booking #${id}?`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Failed to delete booking: ' + (err.response?.data?.error || err.message));
    }
  };

  const totalBookings = bookings.length;
  const preBookings = bookings.filter(b => b.status === 'pre_booking');
  const activeSubscriptions = bookings.filter(b => b.status === 'active');
  const overdueBookings = bookings.filter(b => {
    const paid = parseFloat(b.total_cost || b.collected_amount || b.plan_price || 0);
    return (5100 - paid) > 0 || b.is_overdue || b.payment_status === 'overdue';
  });

  // Filter logic
  const filteredBookings = bookings.filter(b => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (b.user_name || '').toLowerCase().includes(query) ||
      (b.user_phone || '').includes(query) ||
      (b.vehicle_id || '').toLowerCase().includes(query) ||
      (b.plan_name || '').toLowerCase().includes(query) ||
      (b.id || '').toLowerCase().includes(query) ||
      (b.remarks || '').toLowerCase().includes(query);

    if (!matchesSearch) return false;

    if (filterTab === 'pre_booking') return b.status === 'pre_booking';
    if (filterTab === 'active') return b.status === 'active';
    if (filterTab === 'overdue') {
      const paid = parseFloat(b.total_cost || b.collected_amount || b.plan_price || 0);
      return (5100 - paid) > 0 || b.is_overdue;
    }

    return true;
  });

  // Sort logic
  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (!sortConfig.field) return 0;

    let aVal = '', bVal = '';
    if (sortConfig.field === 'name') {
      aVal = (a.user_name || '').toLowerCase();
      bVal = (b.user_name || '').toLowerCase();
    } else if (sortConfig.field === 'mobile') {
      aVal = (a.user_phone || '').toLowerCase();
      bVal = (b.user_phone || '').toLowerCase();
    } else if (sortConfig.field === 'payment') {
      aVal = parseFloat(a.total_cost || a.collected_amount || 0);
      bVal = parseFloat(b.total_cost || b.collected_amount || 0);
    } else if (sortConfig.field === 'date') {
      aVal = new Date(a.pre_booking_date || a.start_time || 0).getTime();
      bVal = new Date(b.pre_booking_date || b.start_time || 0).getTime();
    } else if (sortConfig.field === 'due') {
      aVal = Math.max(0, 5100 - parseFloat(a.total_cost || a.collected_amount || 0));
      bVal = Math.max(0, 5100 - parseFloat(b.total_cost || b.collected_amount || 0));
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Filter EVs for Assignment Step 2
  const filteredEVsForAssignment = useMemo(() => {
    return vehicles.filter(v => {
      const vStatus = (v.status || 'available').toLowerCase().trim();
      const isRented = Boolean(v.renter) || vStatus === 'rented' || vStatus === 'in_use';
      const isMaintenance = vStatus === 'maintenance';
      const isUnassigned = !isRented && !isMaintenance;
      const isCurrentBookingVeh = assigningBooking && v.id === assigningBooking.vehicle_id;

      // 1. Not Assigned EV checkbox filter (by default true)
      if (onlyUnassignedEVs && !isUnassigned && !isCurrentBookingVeh) {
        return false;
      }

      // 2. Search query filter (smart search by ID, model, registration, chassis, or current renter)
      if (evSearchQuery.trim()) {
        const q = evSearchQuery.toLowerCase().trim();
        const rawDigits = q.replace(/\D/g, '');
        const normQ = q.replace(/[^a-z0-9]/gi, '');

        const idStr = String(v.id || '').toLowerCase();
        const modelStr = String(v.model || '').toLowerCase();
        const renterStr = String(v.renter || '').toLowerCase();
        const plateStr = String(v.registration_number || '').toLowerCase();
        const chassisStr = String(v.chassis_number || '').toLowerCase();

        const idNorm = idStr.replace(/[^a-z0-9]/gi, '');
        const modelNorm = modelStr.replace(/[^a-z0-9]/gi, '');

        const stripZeros = s => (s || '').replace(/0+/g, '');
        const matchDirect = idStr.includes(q) || modelStr.includes(q) || renterStr.includes(q) || plateStr.includes(q) || chassisStr.includes(q);
        const matchNorm = normQ && (idNorm.includes(normQ) || modelNorm.includes(normQ));
        const matchLoose = normQ && (stripZeros(idNorm).includes(stripZeros(normQ)) || stripZeros(modelNorm).includes(stripZeros(normQ)));
        const matchDigits = rawDigits && (idStr.includes(rawDigits) || modelStr.includes(rawDigits) || plateStr.includes(rawDigits));

        if (!matchDirect && !matchNorm && !matchLoose && !matchDigits) return false;
      }

      return true;
    });
  }, [vehicles, onlyUnassignedEVs, assigningBooking, evSearchQuery]);

  const selectedVehicleObj = vehicles.find(v => v.id === assignForm.vehicle_id);
  const isEvCurrentlyAssignedToOther = selectedVehicleObj && selectedVehicleObj.renter && selectedVehicleObj.renter !== assigningBooking?.user_name;

  return (
    <div style={{ paddingBottom: '30px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
            Advance Booking Section
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
            Advance Booking Records (Due math: 5100 - payment amount)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          
          <button 
            onClick={handleOpenCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            <Plus size={16} /> New Advance Booking
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div style={{ background: '#ffffff', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', minWidth: '260px', flex: 1 }}>
          <Search size={16} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by name, mobile number, receipt info..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: '#0f172a' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {[
            { id: 'pre_booking', label: `Advance Bookings (${preBookings.length})` },
            { id: 'all', label: `All Bookings (${totalBookings})` },
            { id: 'active', label: `Active Rentals (${activeSubscriptions.length})` },
            { id: 'overdue', label: `Pending Dues (${overdueBookings.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer',
                background: filterTab === tab.id ? '#0f172a' : '#f1f5f9',
                color: filterTab === tab.id ? '#ffffff' : '#475569'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ADVANCE BOOKING TABLE VIEW */}
      <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', color: '#334155', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px', width: '60px' }}>
                  S.NO.
                </th>
                <th onClick={() => handleSort('name')} style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}>
                  NAME {getSortIcon('name')}
                </th>
                <th style={{ padding: '12px 14px' }}>
                  MOBILE NUMBER
                </th>
                <th onClick={() => handleSort('payment')} style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}>
                  PAYMENT {getSortIcon('payment')}
                </th>
                <th onClick={() => handleSort('date')} style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}>
                  DATE {getSortIcon('date')}
                </th>
                <th style={{ padding: '12px 14px' }}>
                  RECEIPT INFO
                </th>
                <th style={{ padding: '12px 14px' }}>
                  PAYMENT TYPE
                </th>
                <th onClick={() => handleSort('due')} style={{ padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}>
                  DUE {getSortIcon('due')}
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBookings.map((bkg, idx) => {
                const paidAmount = parseFloat(bkg.total_cost || bkg.collected_amount || bkg.plan_price || 0);
                const dueAmount = Math.max(0, 5100 - paidAmount);
                const bookingDate = bkg.pre_booking_date || bkg.start_time || Date.now();
                const cleanReceipt = (bkg.remarks && !bkg.remarks.startsWith('ADV-BKG') && !bkg.remarks.startsWith('BKG-') && !bkg.remarks.toLowerCase().includes('advance booking deposit')) ? bkg.remarks : '';
                const cleanPhone = (bkg.user_phone && bkg.user_phone !== '9000000000' && bkg.user_phone !== '0000000000') ? bkg.user_phone : '';

                return (
                  <tr key={bkg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* S.NO. */}
                    <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: '600' }}>
                      {idx + 1}
                    </td>

                    {/* NAME */}
                    <td style={{ padding: '12px 14px', fontWeight: '600', color: '#0f172a' }}>
                      {bkg.user_name}
                    </td>

                    {/* MOBILE NUMBER */}
                    <td style={{ padding: '12px 14px', color: '#334155', fontFamily: 'monospace' }}>
                      {cleanPhone}
                    </td>

                    {/* PAYMENT */}
                    <td style={{ padding: '12px 14px', fontWeight: '700', color: '#16a34a' }}>
                      ₹{paidAmount.toLocaleString('en-IN')}
                    </td>

                    {/* DATE */}
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {new Date(bookingDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>

                    {/* RECEIPT INFO (CLEAN) */}
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                      {cleanReceipt}
                    </td>

                    {/* PAYMENT TYPE */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        background: (bkg.payment_mode || '').toLowerCase() === 'cash' ? '#fef3c7' : '#e0f2fe',
                        color: (bkg.payment_mode || '').toLowerCase() === 'cash' ? '#b45309' : '#0369a1',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {(bkg.payment_mode || 'cash').toUpperCase()}
                      </span>
                    </td>

                    {/* DUE */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: '700', color: dueAmount > 0 ? '#dc2626' : '#16a34a', fontSize: '13px' }}>
                        ₹{dueAmount.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* ACTIONS: ONLY EDIT AND ASSIGN EV */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {bkg.vehicle_id ? (
                          <>
                            <button
                              onClick={() => {
                                const selectedVeh = vehicles.find(v => v.id === bkg.vehicle_id);
                                const paid = parseFloat(bkg.total_cost || bkg.collected_amount || 0);
                                const adv = bkg.advance_paid !== null && bkg.advance_paid !== undefined ? parseFloat(bkg.advance_paid) : (paid <= 2500 ? paid : 1500);
                                const hnd = bkg.handover_amount !== null && bkg.handover_amount !== undefined ? parseFloat(bkg.handover_amount) : Math.max(0, paid - adv);
                                handleOpenInvoiceWindow({
                                  ...bkg,
                                  vehicle_name: selectedVeh?.vehicle_id || selectedVeh?.id || bkg.vehicle_id,
                                  vehicle_model: selectedVeh?.model || bkg.vehicle_model || 'LT Commercial EV',
                                  total_cost: paid || 5100,
                                  advance_paid: adv,
                                  handover_amount: hnd,
                                  advance_payment_mode: bkg.advance_payment_mode || (bkg.status === 'pre_booking' ? bkg.payment_mode : 'cash'),
                                  handover_payment_mode: bkg.handover_payment_mode || bkg.payment_mode || 'cash',
                                  advance_remarks: bkg.advance_remarks || '',
                                  handover_remarks: bkg.handover_remarks || '',
                                  location: selectedVeh?.location || bkg.location || 'Khajpura Stand',
                                  assignment_date: bkg.assignment_date || bkg.start_time,
                                  pre_booking_date: bkg.pre_booking_date,
                                  advance_booking_id: bkg.advance_booking_id || bkg.id,
                                  handover_id: bkg.handover_id || (`HND-${(bkg.id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`)
                                }, 'booking_confirm');
                              }}
                              title="Download Vehicle Handover Receipt (RNT)"
                              style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '5px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <FileText size={12} /> Handover
                            </button>
                            <button
                              onClick={() => {
                                const adv = bkg.advance_paid !== null && bkg.advance_paid !== undefined ? parseFloat(bkg.advance_paid) : (parseFloat(bkg.total_cost || 0) <= 2500 ? parseFloat(bkg.total_cost) : 1500);
                                handleOpenInvoiceWindow({
                                  ...bkg,
                                  advance_paid: adv,
                                  total_cost: adv,
                                  collected_amount: adv,
                                  paid_amount: adv,
                                  payment_mode: bkg.advance_payment_mode || (bkg.status === 'pre_booking' ? bkg.payment_mode : 'cash'),
                                  remarks: bkg.advance_remarks || (bkg.remarks && !bkg.remarks.includes('Handover') ? bkg.remarks : ''),
                                  pre_booking_date: bkg.pre_booking_date
                                }, 'advance_booking');
                              }}
                              title="Download Advance Booking Receipt (BKG)"
                              style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd', padding: '5px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            >
                              <Download size={12} /> Advance
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              const adv = bkg.advance_paid !== null && bkg.advance_paid !== undefined ? parseFloat(bkg.advance_paid) : parseFloat(bkg.total_cost || bkg.collected_amount || 0);
                              handleOpenInvoiceWindow({
                                ...bkg,
                                advance_paid: adv,
                                total_cost: adv,
                                collected_amount: adv,
                                paid_amount: adv,
                                payment_mode: bkg.advance_payment_mode || bkg.payment_mode || 'cash',
                                remarks: bkg.advance_remarks || bkg.remarks || '',
                                pre_booking_date: bkg.pre_booking_date
                              }, 'advance_booking');
                            }}
                            title="Download / View Advance Booking Receipt"
                            style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Download size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenEditModal(bkg)}
                          title="Edit Record"
                          style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() => handleOpenAssignModal(bkg)}
                          title="Assign Free EV Scooter"
                          style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Bike size={14} /> {bkg.vehicle_id ? `EV ${bkg.vehicle_id}` : 'Assign EV'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedBookings.length === 0 && !loading && (
                <tr>
                  <td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No advance booking records found.
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      </div>

      {/* CREATE ADVANCE BOOKING MODAL */}
      {createModalOpen && (() => {
        const totalPaid = createPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const due = Math.max(0, 5100 - totalPaid);

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: '#ffffff', borderRadius: '10px', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}>
              
              {/* Modal Header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CalendarPlus size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                      New Advance Booking
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                      Reserve an EV slot & record advance token / security payment
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setCreateModalOpen(false)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveBooking} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Financial Math Summary Banner */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PACKAGE RATE</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>₹5,100</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>INITIAL ADVANCE</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>₹{totalPaid.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: '700', color: due > 0 ? '#dc2626' : '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BALANCE DUE AT HANDOVER</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: due > 0 ? '#dc2626' : '#16a34a', marginTop: '2px' }}>₹{due.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* SECTION 1: RIDER INFORMATION (NEW RIDER BY DEFAULT) */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={13} /> 1. Rider Information (New Rider)
                    </div>

                    {/* Direct Inputs: Name & Phone as Primary */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          Full Name <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar"
                          value={createForm.name}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          Mobile Number <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 9876543210"
                          value={createForm.phone}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          Email Address <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>(Optional)</span>
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. ramesh@gmail.com"
                          value={createForm.email}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          KYC Status
                        </label>
                        <select
                          value={createForm.kyc_status}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, kyc_status: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', background: '#ffffff' }}
                        >
                          <option value="verified">✓ Verified</option>
                          <option value="pending">⏳ Pending</option>
                        </select>
                      </div>
                    </div>

                    {/* Secondary Option: Autofill from existing registered riders */}
                    <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: '2px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#64748b', marginBottom: '4px' }}>
                        Or select from already registered riders (Optional):
                      </label>
                      <select
                        value={createForm.user_id}
                        onChange={(e) => {
                          const selId = e.target.value;
                          const foundUser = users.find(u => String(u.raw_id || u.user_id || u.id) === String(selId));
                          if (foundUser) {
                            setCreateForm(prev => ({
                              ...prev,
                              user_id: String(foundUser.raw_id || foundUser.user_id || foundUser.id),
                              name: foundUser.name || '',
                              phone: foundUser.phone || '',
                              email: foundUser.email || '',
                              kyc_status: foundUser.kyc_status || 'verified'
                            }));
                          } else {
                            setCreateForm(prev => ({ ...prev, user_id: '', name: '', phone: '', email: '' }));
                          }
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', background: '#f8fafc', color: '#334155', boxSizing: 'border-box' }}
                      >
                        <option value="">-- New Rider (Default - No user selected) --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.raw_id || u.user_id || u.id}>
                            {u.name} ({u.phone})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* SECTION 2: PLAN & SCHEDULE */}
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={13} /> 2. Plan & Target Schedule
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          Subscription Plan <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <select
                          required
                          value={createForm.plan_id}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, plan_id: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        >
                          {plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          Target Handover Date & Time <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={createForm.pre_booking_date}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, pre_booking_date: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PAYMENT COLLECTION */}
                  <div>
                    {renderPaymentRowsBuilder(createPaymentRows, setCreatePaymentRows, 5100)}

                    {/* Package Payment Distribution Breakdown */}
                    {(() => {
                      const allocatedDeposit = Math.min(3500, totalPaid);
                      const allocatedCycle = Math.max(0, totalPaid - 3500);

                      return (
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <ShieldCheck size={14} color="#00a66c" /> Package Payment Distribution
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Standard: ₹3,500 Deposit + ₹1,600 Cycle Rent
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {/* Security Deposit Allocation */}
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#00a66c' }}>🛡️ Security Deposit</span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Target: ₹3,500</span>
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                                ₹{allocatedDeposit.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '11px', color: allocatedDeposit >= 3500 ? '#16a34a' : '#d97706' }}>
                                {allocatedDeposit >= 3500 ? '✓ Full Deposit Covered' : `₹${(3500 - allocatedDeposit).toLocaleString('en-IN')} remaining due`}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                * Stored in rider's security deposit account
                              </div>
                            </div>

                            {/* 1st Cycle Pass Allocation */}
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7' }}>⚡ 1st Week Rental</span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Target: ₹1,600</span>
                              </div>
                              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                                ₹{allocatedCycle.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '11px', color: allocatedCycle >= 1600 ? '#16a34a' : '#d97706' }}>
                                {allocatedCycle >= 1600 ? '✓ 1st Week Pass Cleared' : `₹${(1600 - allocatedCycle).toLocaleString('en-IN')} due at handover`}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                                * Activates initial 7-day ride cycle
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* SECTION 4: NOTES */}
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                      Receipt / Remarks Notes
                    </label>
                    <input
                      type="text"
                      value={createForm.remarks}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="e.g. Advance token payment taken at counter"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                </div>

                {/* Sticky Footer */}
                <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreate}
                    style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' }}
                  >
                    <CalendarCheck size={16} />
                    {submittingCreate ? 'Saving...' : 'Save Advance Booking & Receipt'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* EDIT BOOKING MODAL WITH DELETE BUTTON INSIDE */}
      {editModalOpen && editingBooking && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#0f172a' }}>Edit Advance Booking</h3>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', color: '#334155' }}>
                <strong>DUE CALCULATION:</strong> 5100 - {editForm.collected_amount || '0'} = <strong style={{ color: '#dc2626' }}>₹{Math.max(0, 5100 - (parseFloat(editForm.collected_amount) || 0))}</strong>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>NAME *</label>
                <input
                  type="text"
                  required
                  value={editForm.user_name}
                  onChange={(e) => setEditForm({ ...editForm, user_name: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>MOBILE NUMBER</label>
                <input
                  type="text"
                  value={editForm.user_phone}
                  onChange={(e) => setEditForm({ ...editForm, user_phone: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {renderPaymentRowsBuilder(editPaymentRows, setEditPaymentRows)}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>DATE *</label>
                <input
                  type="datetime-local"
                  required
                  value={editForm.pre_booking_date}
                  onChange={(e) => setEditForm({ ...editForm, pre_booking_date: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>RECEIPT INFO</label>
                <input
                  type="text"
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  placeholder="e.g. 9835602315@ybl"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>

              {/* ACTION BUTTONS INSIDE EDIT: DELETE RECORD & SAVE CHANGES */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete ${editingBooking.user_name}'s booking record?`)) {
                      handleDeleteBooking(editingBooking.id);
                      setEditModalOpen(false);
                    }
                  }}
                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 14px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Trash2 size={14} /> Delete Record
                </button>

                <button
                  type="submit"
                  disabled={submittingEdit}
                  style={{ background: '#0284c7', color: '#ffffff', padding: '8px 18px', borderRadius: '6px', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
                >
                  {submittingEdit ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BIG 2-STEP ASSIGN EV DIALOG */}
      {assignModalOpen && assigningBooking && (() => {
        const prevPaid = parseFloat(assigningBooking.total_cost || assigningBooking.collected_amount || 0);
        const prevDue = Math.max(0, 5100 - prevPaid);
        const additionalPaid = parseFloat(assignForm.additional_payment || 0);
        const remainingDueAfter = Math.max(0, 5100 - (prevPaid + (isNaN(additionalPaid) ? 0 : additionalPaid)));

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
            <div style={{ background: '#ffffff', borderRadius: '8px', width: '100%', maxWidth: '680px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)' }}>
              
              {/* Modal Header & 2-Step Tabs */}
              <div style={{ padding: '18px 22px 14px 22px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#0f172a' }}>
                    Assign EV Scooter — {assigningBooking.user_name}
                  </h3>
                  <button 
                    onClick={() => setAssignModalOpen(false)} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Step Indicators */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAssignStep(1)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: assignStep === 1 ? '#0284c7' : '#e2e8f0',
                      background: assignStep === 1 ? '#f0f9ff' : '#ffffff',
                      color: assignStep === 1 ? '#0284c7' : '#64748b',
                      fontWeight: '700',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    Step 1: Payment Confirmation
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignStep(2)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: assignStep === 2 ? '#0284c7' : '#e2e8f0',
                      background: assignStep === 2 ? '#f0f9ff' : '#ffffff',
                      color: assignStep === 2 ? '#0284c7' : '#64748b',
                      fontWeight: '700',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    Step 2: Select & Assign EV
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
                
                {/* STEP 1: PAYMENT CONFIRMATION */}
                {assignStep === 1 && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {/* Rider Information Strip */}
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '12px' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Rider Name</span>
                          <strong style={{ color: '#0f172a' }}>{assigningBooking.user_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Mobile Number</span>
                          <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{assigningBooking.user_phone || 'No Phone Recorded'}</strong>
                        </div>
                      </div>

                      {/* Financial Math Overview */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>PACKAGE RATE</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>₹5,100</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>PREVIOUS ADVANCE</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#16a34a' }}>₹{prevPaid.toLocaleString('en-IN')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: '600' }}>CURRENT DUE</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#dc2626' }}>₹{prevDue.toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    </div>

                    {renderPaymentRowsBuilder(assignPaymentRows, setAssignPaymentRows, prevDue)}

                    {/* Remaining Due Preview */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f1f5f9', padding: '10px 14px', borderRadius: '6px', fontSize: '13px' }}>
                      <span style={{ color: '#475569' }}>Remaining Due After This Payment:</span>
                      <strong style={{ color: remainingDueAfter > 0 ? '#dc2626' : '#16a34a', fontSize: '15px' }}>
                        ₹{remainingDueAfter.toLocaleString('en-IN')}
                      </strong>
                    </div>

                    {/* Handover Payment Distribution Preview */}
                    {(() => {
                      const currentTotal = prevPaid + addedPaid;
                      const prevDeposit = Math.min(3500, prevPaid);
                      const targetDeposit = Math.min(3500, currentTotal);
                      const depositCreditNow = Math.max(0, targetDeposit - prevDeposit);
                      const cycleCreditNow = Math.max(0, currentTotal - targetDeposit);

                      return (
                        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <ShieldCheck size={14} color="#00a66c" /> Handover Payment Distribution
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              Package Target: ₹3,500 Deposit + ₹1,600 Cycle Rent
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#00a66c' }}>🛡️ Security Deposit</span>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>Prev: ₹{prevDeposit.toLocaleString('en-IN')}</span>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                                +₹{depositCreditNow.toLocaleString('en-IN')} <span style={{ fontSize: '11px', fontWeight: '600', color: '#16a34a' }}>(→ ₹{targetDeposit.toLocaleString('en-IN')})</span>
                              </div>
                              <div style={{ fontSize: '10px', color: targetDeposit >= 3500 ? '#16a34a' : '#d97706' }}>
                                {targetDeposit >= 3500 ? '✓ Reaches Full ₹3,500 Deposit' : `₹${(3500 - targetDeposit).toLocaleString('en-IN')} still remaining`}
                              </div>
                            </div>

                            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7' }}>⚡ 1st Week Rental Pass</span>
                                <span style={{ fontSize: '10px', color: '#64748b' }}>Target: ₹1,600</span>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: '4px 0 2px 0' }}>
                                +₹{cycleCreditNow.toLocaleString('en-IN')}
                              </div>
                              <div style={{ fontSize: '10px', color: cycleCreditNow >= 1600 ? '#16a34a' : '#d97706' }}>
                                {cycleCreditNow >= 1600 ? '✓ 1st Week Rental Pass Cleared' : `₹${(1600 - cycleCreditNow).toLocaleString('en-IN')} rent due`}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* MORE OPTIONS: ASSIGNMENT DATE & TIME + CUSTOM REMARKS */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setShowMoreAssignOptions(!showMoreAssignOptions)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          background: '#f8fafc',
                          border: 'none',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#334155'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={15} color="#0284c7" /> More Options (Date & Time, Custom Notes)
                        </span>
                        <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: '700' }}>
                          {showMoreAssignOptions ? '▲ Hide Options' : '▼ Show More Options'}
                        </span>
                      </button>

                      {showMoreAssignOptions && (
                        <div style={{ padding: '14px', display: 'grid', gap: '12px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                                Assignment & Billing Date & Time
                              </label>
                              <button
                                type="button"
                                onClick={() => setAssignForm(prev => ({ ...prev, assignment_date: getLocalDatetimeString() }))}
                                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                              >
                                ↺ Reset to Current Time
                              </button>
                            </div>
                            <input
                              type="datetime-local"
                              value={assignForm.assignment_date}
                              onChange={(e) => setAssignForm(prev => ({ ...prev, assignment_date: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                            <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0' }}>
                              Rental billing timestamp and 7-day payment cycle will start from this selected date & time.
                            </p>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                              Handover Remarks / Notes
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Scooter handed over at stand with helmet & charger"
                              value={assignForm.remarks}
                              onChange={(e) => setAssignForm(prev => ({ ...prev, remarks: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 2: ASSIGNING THE EV */}
                {assignStep === 2 && (() => {
                  const availableCount = vehicles.filter(v => {
                    const s = (v.status || 'available').toLowerCase().trim();
                    return !v.renter && s !== 'rented' && s !== 'in_use' && s !== 'maintenance';
                  }).length;

                  return (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {/* Search & Filter Bar */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', flex: 1, minWidth: '220px' }}>
                          <Search size={16} color="#94a3b8" />
                          <input
                            type="text"
                            placeholder="Search EV by number (e.g. 025, LT025), model, or stand..."
                            value={evSearchQuery}
                            onChange={(e) => setEvSearchQuery(e.target.value)}
                            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {/* Not Assigned EV Checkbox (Default: Checked) */}
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer', userSelect: 'none', padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <input
                              type="checkbox"
                              checked={onlyUnassignedEVs}
                              onChange={(e) => setOnlyUnassignedEVs(e.target.checked)}
                              style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                            />
                            Available Only ({availableCount})
                          </label>

                          <button
                            type="button"
                            onClick={async () => {
                              const authToken = token || localStorage.getItem('token');
                              if (authToken) {
                                try {
                                  const res = await axios.get('/api/vehicles', { headers: { Authorization: `Bearer ${authToken}` } });
                                  if (res.data) setVehicles(res.data);
                                } catch (e) {
                                  console.error(e);
                                }
                              }
                            }}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                            title="Refresh Fleet List"
                          >
                            <RefreshCw size={13} /> Refresh Fleet
                          </button>
                        </div>
                      </div>

                      {/* EV Results Table / List */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', maxHeight: '250px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 1 }}>
                            <tr style={{ color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>
                              <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Select</th>
                              <th style={{ padding: '8px 10px' }}>EV Number</th>
                              <th style={{ padding: '8px 10px' }}>Model / Stand</th>
                              <th style={{ padding: '8px 10px' }}>Status</th>
                              <th style={{ padding: '8px 10px' }}>Assignment</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEVsForAssignment.map(v => {
                              const isSelected = assignForm.vehicle_id === v.id;
                              const vStatus = (v.status || 'available').toLowerCase().trim();
                              const isAssigned = Boolean(v.renter) || vStatus === 'rented' || vStatus === 'in_use';
                              const isMaintenance = vStatus === 'maintenance';

                              const formattedId = v.id.toUpperCase().startsWith('LT') 
                                ? v.id.toUpperCase() 
                                : v.id.toUpperCase().startsWith('EV') ? v.id : `EV ${v.id}`;

                              return (
                                <tr 
                                  key={v.id} 
                                  onClick={() => setAssignForm({ ...assignForm, vehicle_id: v.id })}
                                  style={{ 
                                    borderBottom: '1px solid #f1f5f9', 
                                    cursor: 'pointer',
                                    background: isSelected ? '#eff6ff' : 'transparent'
                                  }}
                                >
                                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                    <input
                                      type="radio"
                                      name="selected_ev"
                                      checked={isSelected}
                                      onChange={() => setAssignForm({ ...assignForm, vehicle_id: v.id })}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </td>
                                  <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0284c7' }}>
                                    {formattedId}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#475569' }}>
                                    <div>{v.model}</div>
                                    {v.location && <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {v.location}</div>}
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: isAssigned ? '#fef3c7' : isMaintenance ? '#fee2e2' : '#dcfce7',
                                      color: isAssigned ? '#b45309' : isMaintenance ? '#dc2626' : '#15803d'
                                    }}>
                                      {isAssigned ? 'ASSIGNED' : isMaintenance ? 'MAINTENANCE' : 'AVAILABLE'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 10px', color: isAssigned ? '#b45309' : '#16a34a', fontWeight: '500' }}>
                                    {isAssigned ? `Assigned to: ${v.renter}` : '✓ Ready to Deploy'}
                                  </td>
                                </tr>
                              );
                            })}

                            {filteredEVsForAssignment.length === 0 && (
                              <tr>
                                <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                                  No EVs match the current search. ({vehicles.length} total EVs in fleet). Uncheck <strong>"Available Only"</strong> or click <strong>"Refresh Fleet"</strong>.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Selected EV Notice */}
                      {assignForm.vehicle_id && (
                        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                          Selected EV: <strong style={{ color: '#0284c7' }}>{selectedVehicleObj?.id?.toUpperCase().startsWith('LT') ? selectedVehicleObj.id : `EV ${assignForm.vehicle_id}`}</strong>
                          {selectedVehicleObj && (
                            <span style={{ color: '#64748b', marginLeft: '6px' }}>({selectedVehicleObj.model})</span>
                          )}
                        </div>
                      )}

                      {/* REASSIGNMENT NOTICE IF EV CURRENTLY ASSIGNED TO ANOTHER USER */}
                      {isEvCurrentlyAssignedToOther && (
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '12px 14px', fontSize: '12px', color: '#92400e', lineHeight: 1.5 }}>
                          <strong>⚠️ Reassignment Notice:</strong> EV <strong>{selectedVehicleObj.id}</strong> is currently assigned to <strong>{selectedVehicleObj.renter}</strong>.
                          <div style={{ marginTop: '4px' }}>
                            Assigning this EV to <strong>{assigningBooking.user_name}</strong> will transfer the vehicle, complete the previous rental cycle, and start the new payment cycle starting from today.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Modal Footer Actions */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
                {assignStep === 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAssignModalOpen(false)}
                      style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignStep(2)}
                      style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Next: Assign EV Scooter →
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setAssignStep(1)}
                      style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      ← Back to Payment
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={!assignForm.vehicle_id}
                        onClick={() => {
                          const addedPaid = assignPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                          const prevPaid = parseFloat(assigningBooking.advance_paid !== null && assigningBooking.advance_paid !== undefined ? assigningBooking.advance_paid : (assigningBooking.collected_amount || assigningBooking.total_cost || 0));
                          handleOpenInvoiceWindow({
                            id: assigningBooking.id,
                            user_name: assigningBooking.user_name || assigningBooking.customer_name,
                            user_phone: assigningBooking.user_phone || assigningBooking.customer_phone,
                            user_email: assigningBooking.user_email || '',
                            vehicle_id: selectedVehicleObj?.vehicle_id || selectedVehicleObj?.id || assignForm.vehicle_id,
                            vehicle_name: selectedVehicleObj?.vehicle_id || selectedVehicleObj?.id || assignForm.vehicle_id,
                            vehicle_model: selectedVehicleObj?.model || assigningBooking.vehicle_model || 'LT Commercial EV',
                            location: selectedVehicleObj?.location || assigningBooking.location || 'Khajpura Stand, Patna',
                            plan_name: assigningBooking.plan_name || 'Weekly Commercial Rental',
                            total_cost: (prevPaid + addedPaid) || 5100,
                            advance_paid: prevPaid,
                            handover_amount: addedPaid,
                            advance_payment_mode: assigningBooking.advance_payment_mode || assigningBooking.payment_mode || 'cash',
                            handover_payment_mode: assignPaymentRows.length === 1 ? assignPaymentRows[0].mode : 'mixed',
                            advance_remarks: assigningBooking.advance_remarks || assigningBooking.remarks || '',
                            handover_remarks: assignPaymentRows.map(r => `${r.mode}: ₹${r.amount}`).join(' + '),
                            payment_mode: assignPaymentRows.length === 1 ? assignPaymentRows[0].mode : 'mixed',
                            payment_status: 'paid',
                            pre_booking_date: assigningBooking.pre_booking_date || assigningBooking.created_at,
                            assignment_date: assignForm.assignment_date,
                            advance_booking_id: assigningBooking.id,
                            handover_id: assigningBooking.handover_id || (`HND-${(assigningBooking.id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`),
                            remarks: assignForm.remarks || ''
                          }, 'booking_confirm');
                        }}
                        style={{
                          background: assignForm.vehicle_id ? '#f0f9ff' : '#f8fafc',
                          color: assignForm.vehicle_id ? '#0284c7' : '#94a3b8',
                          border: `1px solid ${assignForm.vehicle_id ? '#bae6fd' : '#cbd5e1'}`,
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: assignForm.vehicle_id ? 'pointer' : 'not-allowed',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <FileText size={15} /> Preview Handover Receipt
                      </button>

                      <button
                        type="button"
                        disabled={!assignForm.vehicle_id || submittingAssign}
                        onClick={handleAssignVehicleSubmit}
                        style={{
                          background: assignForm.vehicle_id ? '#0284c7' : '#94a3b8',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 22px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: assignForm.vehicle_id ? 'pointer' : 'not-allowed',
                          fontWeight: '700'
                        }}
                      >
                        {submittingAssign ? 'Assigning...' : `Confirm & Assign ${assignForm.vehicle_id ? 'EV ' + assignForm.vehicle_id : 'EV'}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
