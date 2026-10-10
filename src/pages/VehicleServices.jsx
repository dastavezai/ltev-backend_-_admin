import { useState, useEffect } from 'react';
import { 
  Wrench, Bike, User, DollarSign, Calendar, Clock, Plus, Search, 
  Filter, CheckCircle2, AlertTriangle, Share2, Printer, Edit3, 
  Trash2, X, ShieldAlert, Check, RefreshCw, Send, ArrowRight, FileText, Package,
  Eye, ExternalLink, Phone, MessageSquare, AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { handleOpenInvoiceWindow } from '../utils/invoice';
import ReceiptModal from '../components/ReceiptModal';

const SERVICE_PRESETS = [
  'General Periodic Service & Tuning',
  'Front/Rear Brake Shoes / Pads Replacement',
  'Tyre Tube Replacement / Puncture Fix',
  'Battery Health Inspection & Cell Balancing',
  'Side Mirror & Indicator Light Repair',
  'Throttle & Acceleration Cable Fix',
  'Motor Hub & Bearing Greasing',
  'Body Panel & Fiber Guard Replacement',
  'Key Switch & Ignition Lock Repair',
  'Custom Repair / Electrical Fix'
];

export default function VehicleServices() {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [catalogParts, setCatalogParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVehicle, setFilterVehicle] = useState('all');
  const [filterBilledTo, setFilterBilledTo] = useState('all'); // 'all' | 'issues' | 'rider' | 'company' | 'completed'
  const [filterStatus, setFilterStatus] = useState('all');

  // Problem Image Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptData, setSelectedReceiptData] = useState(null);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: '',
    service_type: 'General Periodic Service & Tuning',
    issue_description: '',
    parts_replaced: '',
    cost: '',
    status: 'completed',
    date_reported: new Date().toISOString().split('T')[0],
    user_id: '',
    billed_to: 'company', // 'company' | 'rider'
    payment_status: 'paid'
  });

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [srvRes, vehRes, usrRes, prtRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/maintenance`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/vehicles`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/catalog/parts`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);
      setServices(srvRes.data);
      setVehicles(vehRes.data);
      setUsers(usrRes.data);
      setCatalogParts(prtRes.data || []);
    } catch (err) {
      console.error('Error loading service data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Open Create Modal
  const handleOpenCreateModal = (preselectedVehicleId = '') => {
    const vId = preselectedVehicleId || (vehicles.length > 0 ? vehicles[0].id : '');
    
    // Find if vehicle is currently rented to link rider automatically
    const vObj = vehicles.find(v => v.id === vId);
    let linkedUserId = '';
    if (vObj && vObj.renter) {
      const uObj = users.find(u => u.name === vObj.renter);
      if (uObj) linkedUserId = String(uObj.raw_id || uObj.id);
    }

    setFormData({
      vehicle_id: vId,
      service_type: 'General Periodic Service & Tuning',
      issue_description: '',
      parts_replaced: '',
      cost: '',
      status: 'completed',
      date_reported: new Date().toISOString().split('T')[0],
      user_id: linkedUserId,
      billed_to: linkedUserId ? 'rider' : 'company',
      payment_status: linkedUserId ? 'pending' : 'paid'
    });
    setModalMode('create');
    setEditingId(null);
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (srv) => {
    setFormData({
      vehicle_id: srv.vehicle_id || '',
      service_type: srv.service_type || 'General Service',
      issue_description: srv.issue_description || '',
      parts_replaced: srv.parts_replaced || '',
      cost: srv.cost !== null && srv.cost !== undefined ? String(srv.cost) : '',
      status: srv.status || 'completed',
      date_reported: srv.date_reported ? new Date(srv.date_reported).toISOString().split('T')[0] : '',
      user_id: srv.user_id ? String(srv.user_id) : '',
      billed_to: srv.billed_to || 'company',
      payment_status: srv.payment_status || 'paid'
    });
    setModalMode('edit');
    setEditingId(srv.id);
    setModalOpen(true);
  };

  const handleVehicleChange = (vId) => {
    const vObj = vehicles.find(v => v.id === vId);
    let linkedUserId = formData.user_id;
    if (vObj && vObj.renter) {
      const uObj = users.find(u => u.name === vObj.renter);
      if (uObj) linkedUserId = String(uObj.raw_id || uObj.id);
    }
    setFormData(prev => ({
      ...prev,
      vehicle_id: vId,
      user_id: linkedUserId,
      billed_to: linkedUserId ? 'rider' : prev.billed_to
    }));
  };

  // Save Service Record
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_id || !formData.issue_description.trim()) {
      alert('Please select vehicle and enter service details');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await axios.post(
          `${import.meta.env.VITE_API_URL || ''}/api/maintenance`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Vehicle service / parts replacement record added successfully!');
      } else {
        await axios.put(
          `${import.meta.env.VITE_API_URL || ''}/api/maintenance/${editingId}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert('Service record updated successfully!');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Error saving service record: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Record
  const handleDelete = async (id) => {
    if (!window.confirm(`Delete service record #${id}?`)) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/maintenance/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Error deleting record: ' + (err.response?.data?.error || err.message));
    }
  };

  // Quick Status Updater for Reported Issues
  const handleUpdateStatus = async (id, newStatus, currentSrv) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || ''}/api/maintenance/${id}`, {
        ...currentSrv,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      alert('Error updating status: ' + (err.response?.data?.error || err.message));
    }
  };

  // Deduct from Rider Security Deposit
  const handleDeductFromDeposit = async (srv) => {
    if (!srv.user_id) {
      alert('No rider is assigned to this service bill.');
      return;
    }
    const cost = parseFloat(srv.cost || 0);
    const balance = parseFloat(srv.security_deposit_balance || 0);
    if (balance < cost) {
      alert(`Insufficient deposit balance (Deposit: ₹${balance}, Bill: ₹${cost}). Please request direct UPI payment.`);
      return;
    }

    if (!window.confirm(`Deduct ₹${cost} directly from ${srv.user_name}'s security deposit for "${srv.service_type}"?`)) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/maintenance/${srv.id}/deduct-deposit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message || 'Deducted successfully!');
      fetchData();
    } catch (err) {
      alert('Deduction failed: ' + (err.response?.data?.error || err.message));
    }
  };

  // Send WhatsApp Payment Reminder with UPI Payment Link
  const handleSendPaymentReminder = (srv) => {
    const phone = (srv.user_phone || '').replace(/\D/g, '').slice(-10);
    if (!phone) {
      alert('No valid phone number found for this rider.');
      return;
    }

    const upiId = '9113750231@oksbi';
    const amount = parseFloat(srv.cost || 0);
    const upiIntentUrl = `upi://pay?pa=${upiId}&pn=LocalToto&am=${amount}&tn=Service_${srv.vehicle_id}`;

    const message = `*🛠️ LT EV MOBILITY - VEHICLE SERVICE & REPAIR BILL*
----------------------------------------
*🛵 Vehicle:* ${srv.vehicle_id} (${srv.vehicle_model || 'LT.ev Scooter'})
*👤 Rider:* ${srv.user_name || 'Rider'}
*🔧 Service:* ${srv.service_type}
*📝 Details / Parts:* ${srv.issue_description}
${srv.parts_replaced ? `*🔩 Parts Replaced:* ${srv.parts_replaced}\n` : ''}*💰 Total Amount Due:* ₹${amount.toLocaleString('en-IN')}

*📲 Pay Instantly via UPI Link:*
${upiIntentUrl}

*Or Pay to UPI ID:* ${upiId}
_After payment, please share screenshot or UTR number._
----------------------------------------
_Support: +91 9113750231 | https://ltev.in_`;

    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Open Official Service & Parts Invoice in Standard Format
  const handleOpenReceipt = (srv) => {
    handleOpenInvoiceWindow({
      id: srv.id,
      user_name: srv.user_name || 'Company Fleet Maintenance',
      user_phone: srv.user_phone || '',
      vehicle_id: srv.vehicle_id,
      service_type: srv.service_type || 'General Periodic Service & Tuning',
      billed_to: srv.billed_to || 'company',
      payment_status: srv.payment_status || 'paid',
      cost: srv.cost || 0,
      date_reported: srv.date_reported || new Date().toISOString(),
      issue_description: srv.issue_description || '',
      parts_replaced: srv.parts_replaced || ''
    }, 'service_parts');
  };

  // Metrics
  const totalExpenditure = services.reduce((acc, s) => acc + (parseFloat(s.cost) || 0), 0);
  const pendingRiderBills = services.filter(s => s.billed_to === 'rider' && s.payment_status === 'pending');
  const totalPendingAmount = pendingRiderBills.reduce((acc, s) => acc + (parseFloat(s.cost) || 0), 0);
  const openRiderIssues = services.filter(s => s.status === 'reported' || s.status === 'in_progress');

  // Filtered Services
  const filteredServices = services.filter(s => {
    const matchesSearch = 
      (s.vehicle_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.service_type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.issue_description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.user_phone || '').includes(searchQuery);

    const matchesVehicle = filterVehicle === 'all' || s.vehicle_id === filterVehicle;
    const matchesBilledTo = 
      filterBilledTo === 'all' ? true :
      filterBilledTo === 'issues' ? (s.status === 'reported' || s.status === 'in_progress' || (s.user_id && s.status !== 'completed')) :
      filterBilledTo === 'completed' ? (s.status === 'completed') :
      s.billed_to === filterBilledTo;
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;

    return matchesSearch && matchesVehicle && matchesBilledTo && matchesStatus;
  });

  return (
    <div style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '40px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 4px 0' }}>
            Vehicle Service & Parts Replacement
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            Log bike maintenance, replace parts, view rider-reported issues & photos, bill damages, and generate itemized invoices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={fetchData}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '10px', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          
          <button 
            onClick={() => handleOpenCreateModal()}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', 
              color: 'white', 
              border: 'none', 
              padding: '10px 20px', 
              borderRadius: '10px', 
              fontWeight: '700', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
            }}
          >
            <Plus size={18} /> Record Vehicle Service
          </button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            <span>Total Services Logged</span>
            <Wrench size={20} color="#0284c7" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '8px' }}>
            {services.length} <span style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Records</span>
          </div>
        </div>

        <div 
          onClick={() => setFilterBilledTo('issues')}
          style={{ 
            background: openRiderIssues.length > 0 ? '#fffbeb' : 'white', 
            padding: '20px', 
            borderRadius: '16px', 
            border: openRiderIssues.length > 0 ? '1.5px solid #fde68a' : '1px solid #f1f5f9', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b45309', fontSize: '13px', fontWeight: '700' }}>
            <span>Rider Reported Issues</span>
            <AlertCircle size={20} color="#d97706" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginTop: '8px' }}>
            {openRiderIssues.length} <span style={{ fontSize: '13px', fontWeight: '700', color: openRiderIssues.length > 0 ? '#dc2626' : '#64748b' }}>({openRiderIssues.filter(s => s.status === 'reported').length} Open)</span>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#b45309', fontSize: '13px', fontWeight: '700' }}>
            <span>Pending Rider Bills</span>
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706', marginTop: '8px' }}>
            ₹{totalPendingAmount.toLocaleString('en-IN')} <span style={{ fontSize: '13px', fontWeight: '600' }}>({pendingRiderBills.length} Due)</span>
          </div>
        </div>

        <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#166534', fontSize: '13px', fontWeight: '700' }}>
            <span>Total Maintenance Spent</span>
            <DollarSign size={20} color="#16a34a" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#15803d', marginTop: '8px' }}>
            ₹{totalExpenditure.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ background: 'white', padding: '16px 20px', borderRadius: '16px', border: '1px solid #f1f5f9', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 16px', minWidth: '280px', flex: 1 }}>
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search by bike #, parts replaced, rider name, or service issue..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', color: '#0f172a' }}
          />
        </div>

        {/* Vehicle Filter */}
        <select 
          value={filterVehicle}
          onChange={(e) => setFilterVehicle(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: '600', color: '#0f172a', outline: 'none' }}
        >
          <option value="all">All Bikes ({vehicles.length} Fleet)</option>
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.id} - {v.model}</option>
          ))}
        </select>

        {/* Billed To & Status Filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Services (${services.length})` },
            { id: 'issues', label: `🚨 Rider Issues (${openRiderIssues.length})` },
            { id: 'rider', label: 'Billed to Rider' },
            { id: 'company', label: 'Company Expense' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterBilledTo(tab.id)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                background: filterBilledTo === tab.id ? (tab.id === 'issues' ? '#dc2626' : '#0f172a') : '#f1f5f9',
                color: filterBilledTo === tab.id ? '#ffffff' : '#64748b'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Services List Cards */}
      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredServices.map(srv => {
          const isBilledToRider = srv.billed_to === 'rider';
          const isPending = srv.payment_status === 'pending';
          const isDepositDeducted = srv.payment_status === 'deducted_from_deposit';
          const isReported = srv.status === 'reported';
          const isInProgress = srv.status === 'in_progress';
          const isCompleted = srv.status === 'completed';
          const isUrgent = (srv.issue_description || '').toUpperCase().includes('[URGENT') || (srv.issue_description || '').toLowerCase().includes('breakdown');
          const hasImage = Boolean(srv.image_url);
          const fullImgUrl = hasImage ? (srv.image_url.startsWith('http') ? srv.image_url : `${import.meta.env.VITE_API_URL || ''}${srv.image_url}`) : null;

          return (
            <div 
              key={srv.id}
              style={{
                background: 'white',
                borderRadius: '18px',
                padding: '22px 26px',
                border: isReported 
                  ? '2px solid #f59e0b' 
                  : (isBilledToRider && isPending ? '1.5px solid #fed7aa' : '1px solid #f1f5f9'),
                boxShadow: isReported ? '0 4px 12px rgba(245, 158, 11, 0.12)' : '0 4px 6px -1px rgba(0,0,0,0.02)',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1.8fr 1.1fr auto',
                gap: '20px',
                alignItems: 'center',
                position: 'relative'
              }}
            >
              {/* Col 1: Vehicle & Date */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: isReported ? '#fef3c7' : 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isReported ? <AlertCircle size={20} color="#d97706" /> : <Bike size={20} color="#0284c7" />}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      {srv.vehicle_id}
                    </h3>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{srv.vehicle_model || 'LT EV Scooter'}</div>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={13} /> {new Date(srv.date_reported).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {srv.user_name && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#334155', fontWeight: '600' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                      <User size={12} color="#0284c7" /> {srv.user_name}
                    </div>
                    {srv.user_phone && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontFamily: 'monospace' }}>
                        📞 {srv.user_phone}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Col 2: Service & Reported Problem Details */}
              <div>
                {/* Status and Urgency Badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{srv.service_type}</span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '3px 9px',
                    borderRadius: '12px',
                    background: isCompleted ? '#dcfce7' : isInProgress ? '#eff6ff' : '#fef3c7',
                    color: isCompleted ? '#15803d' : isInProgress ? '#2563eb' : '#b45309',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {isCompleted ? <CheckCircle2 size={11} /> : isInProgress ? <Clock size={11} /> : <AlertTriangle size={11} />}
                    {srv.status}
                  </span>

                  {isUrgent && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      letterSpacing: '0.3px'
                    }}>
                      ⚡ URGENT BREAKDOWN
                    </span>
                  )}

                  {isReported && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      background: '#fff7ed',
                      color: '#c2410c',
                      border: '1px solid #ffedd5'
                    }}>
                      🚨 RIDER REPORTED
                    </span>
                  )}
                </div>

                {/* Issue Description */}
                <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#334155', lineHeight: '1.45', background: isReported ? '#fffbeb' : 'transparent', padding: isReported ? '8px 10px' : '0', borderRadius: isReported ? '8px' : '0' }}>
                  {srv.issue_description || 'No description provided.'}
                </p>

                {/* Problem Photo Attached Preview */}
                {fullImgUrl && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      onClick={() => setPreviewImage(fullImgUrl)}
                      style={{ 
                        cursor: 'pointer',
                        position: 'relative',
                        display: 'inline-block'
                      }}
                    >
                      <img 
                        src={fullImgUrl} 
                        alt="Issue photo" 
                        style={{ 
                          width: '56px', 
                          height: '56px', 
                          borderRadius: '10px', 
                          objectFit: 'cover', 
                          border: '2px solid #0284c7',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }} 
                      />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setPreviewImage(fullImgUrl)}
                        style={{
                          background: '#f0f9ff',
                          color: '#0284c7',
                          border: '1px solid #bae6fd',
                          borderRadius: '8px',
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Eye size={13} /> View Problem Photo
                      </button>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Captured by rider via app
                      </div>
                    </div>
                  </div>
                )}

                {srv.parts_replaced && (
                  <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: '600', marginTop: '6px' }}>
                    🔩 Replaced: {srv.parts_replaced}
                  </div>
                )}
              </div>

              {/* Col 3: Financials & Billing Info */}
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>
                  ₹{parseFloat(srv.cost || 0).toLocaleString('en-IN')}
                </div>

                <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{
                    background: isBilledToRider ? '#fef3c7' : '#f1f5f9',
                    color: isBilledToRider ? '#b45309' : '#475569',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: '700'
                  }}>
                    {isBilledToRider ? '👤 Billable to Rider' : '🏢 Company Expense'}
                  </span>
                </div>

                {isDepositDeducted && (
                  <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700', marginTop: '2px' }}>
                    ✓ Settled from Security Deposit
                  </div>
                )}
              </div>

              {/* Col 4: Action Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', minWidth: '180px' }}>
                {/* Quick actions for reported issues */}
                {isReported && (
                  <div style={{ display: 'flex', gap: '6px', width: '100%', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleUpdateStatus(srv.id, 'in_progress', srv)}
                      title="Mark as In Progress and start attending bike"
                      style={{
                        background: '#0284c7',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Clock size={13} /> Start Repair
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(srv)}
                      title="Attend issue, record replaced parts and cost"
                      style={{
                        background: '#0f172a',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <Wrench size={13} /> Attend & Bill
                    </button>
                  </div>
                )}

                {isInProgress && (
                  <button
                    onClick={() => handleUpdateStatus(srv.id, 'completed', srv)}
                    title="Mark service as completed"
                    style={{
                      background: '#16a34a',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <CheckCircle2 size={13} /> Mark Resolved
                  </button>
                )}

                {isBilledToRider && isPending && (
                  <button
                    onClick={() => handleSendPaymentReminder(srv)}
                    title="Send WhatsApp Payment Link & Bill to Rider"
                    style={{
                      background: '#25D366',
                      color: 'white',
                      border: 'none',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <Send size={13} /> Payment Link (WhatsApp)
                  </button>
                )}

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {/* Itemized Service Invoice PDF / Download */}
                  <button
                    onClick={() => window.open(`${import.meta.env.VITE_API_URL || ''}/api/maintenance/${srv.id}/invoice`, '_blank')}
                    title="Open official itemized invoice with parts and charges breakdown"
                    style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '6px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <FileText size={13} /> Invoice (PDF)
                  </button>

                  <button
                    onClick={() => handleOpenReceipt(srv)}
                    title="Print Standard Service Receipt"
                    style={{ background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Printer size={13} /> Receipt
                  </button>

                  {isBilledToRider && isPending && parseFloat(srv.security_deposit_balance || 0) >= parseFloat(srv.cost || 0) && (
                    <button
                      onClick={() => handleDeductFromDeposit(srv)}
                      title="Deduct repair bill directly from Rider Security Deposit"
                      style={{ background: '#e0f2fe', color: '#0284c7', border: '1px solid #bae6fd', padding: '6px 10px', borderRadius: '8px', fontWeight: '700', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ShieldAlert size={13} /> Settle from Deposit
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEditModal(srv)}
                    title="Edit Service Record / Parts"
                    style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => handleDelete(srv.id)}
                    title="Delete Record"
                    style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {filteredServices.length === 0 && !loading && (
          <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '20px', color: '#64748b', border: '1px solid #f1f5f9' }}>
            <Wrench size={44} color="#94a3b8" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>No Service Records Found</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>Record vehicle maintenance or parts replacement for any bike.</p>
            <button 
              onClick={() => handleOpenCreateModal()}
              style={{ background: '#0f172a', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
            >
              + Record Vehicle Service
            </button>
          </div>
        )}
      </div>

      {/* Record Service Modal */}
      {modalOpen && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={20} color="#0284c7" />
                </div>
                <div>
                  <h2 style={{ fontSize: '19px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    {modalMode === 'create' ? 'Record Vehicle Service / Parts Fix' : `Edit Service Record #${editingId}`}
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    Enter repair details, replaced components, and assign bill to rider or company.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: '16px' }}>
              {/* Bike Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Vehicle / Bike Number *
                </label>
                <select
                  required
                  value={formData.vehicle_id}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                >
                  <option value="">-- Select Bike --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.id} — {v.model} ({v.renter ? `Rented to ${v.renter}` : v.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type Preset */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Service Category / Work Done *
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                >
                  {SERVICE_PRESETS.map(preset => (
                    <option key={preset} value={preset}>{preset}</option>
                  ))}
                </select>
              </div>

              {/* Service Description / Work Done */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                  Service Description & Issues Fixed *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Front brake shoe replaced, rear tyre puncture repaired, chain lubed and tested."
                  value={formData.issue_description}
                  onChange={(e) => setFormData({ ...formData, issue_description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Parts Replaced with Catalog Quick Picker */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#334155' }}>
                    Parts / Components Replaced
                  </label>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Select from catalog below to add</span>
                </div>

                {/* Quick Catalog Chips */}
                {catalogParts.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', maxHeight: '120px', overflowY: 'auto', padding: '8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {catalogParts.map(p => {
                      const mrp = parseFloat(p.mrp || p.price) || 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const partTag = `${p.name} (₹${mrp})`;
                            const currentParts = formData.parts_replaced ? formData.parts_replaced.split(', ').filter(Boolean) : [];
                            currentParts.push(partTag);
                            const updatedParts = currentParts.join(', ');
                            const newCost = (parseFloat(formData.cost) || 0) + mrp;
                            setFormData(prev => ({
                              ...prev,
                              parts_replaced: updatedParts,
                              cost: String(newCost)
                            }));
                          }}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {p.image_url ? (
                            <img 
                              src={p.image_url.startsWith('http') || p.image_url.startsWith('/') ? p.image_url : `/${p.image_url}`} 
                              alt={p.name} 
                              style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                            />
                          ) : (
                            <Package size={13} color="#0284c7" />
                          )}
                          <span>+ {p.name}</span>
                          <span style={{ fontWeight: '700', color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: '4px' }}>₹{mrp}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            color: p.stock_quantity <= 5 ? '#dc2626' : '#64748b', 
                            background: p.stock_quantity <= 5 ? '#fee2e2' : '#f1f5f9', 
                            padding: '1px 5px', 
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {p.stock_quantity > 0 ? `${p.stock_quantity} in stock` : 'Out of stock'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="e.g. Front Disc Brake Pad (₹350), Chain Lubricant (₹100)"
                  value={formData.parts_replaced}
                  onChange={(e) => setFormData({ ...formData, parts_replaced: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* Cost & Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Service / Parts Cost (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 450"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={formData.date_reported}
                    onChange={(e) => setFormData({ ...formData, date_reported: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Billing Mode & Rider Link */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Billing Responsibility
                  </label>
                  <select
                    value={formData.billed_to}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      billed_to: e.target.value,
                      payment_status: e.target.value === 'rider' ? 'pending' : 'paid'
                    })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none', fontWeight: '700' }}
                  >
                    <option value="company">🏢 Company Expense (Routine Maint.)</option>
                    <option value="rider">👤 Charge to Rider (Damage / Repair)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Linked Rider / Driver {formData.billed_to === 'rider' && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  >
                    <option value="">-- Select Rider --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.raw_id || u.user_id || u.id}>
                        {u.name} (📞 {u.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Work Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none' }}
                  >
                    <option value="completed">Completed (Vehicle Ready)</option>
                    <option value="in_progress">In Progress (Under Maintenance)</option>
                    <option value="pending">Pending Service</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                    Payment Status
                  </label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', background: '#f8fafc', color: '#0f172a', outline: 'none', fontWeight: '700' }}
                  >
                    <option value="paid">Paid & Settled</option>
                    <option value="pending">Payment Due / Pending</option>
                    <option value="deducted_from_deposit">Deducted from Security Deposit</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer' }}
                >
                  {submitting ? 'Saving...' : modalMode === 'create' ? 'Record Service Log' : 'Update Service Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <ReceiptModal 
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        data={selectedReceiptData}
      />

      {/* Problem Image Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                  Problem Photo Attached by Rider
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a 
                  href={previewImage} 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    background: '#f0f9ff', 
                    color: '#0284c7', 
                    padding: '6px 12px', 
                    borderRadius: '8px', 
                    textDecoration: 'none', 
                    fontSize: '12px', 
                    fontWeight: '700',
                    border: '1px solid #bae6fd'
                  }}
                >
                  <ExternalLink size={14} /> Open Full Size
                </a>
                <button 
                  onClick={() => setPreviewImage(null)}
                  style={{ 
                    background: '#f1f5f9', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '32px', 
                    height: '32px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  <X size={18} color="#64748b" />
                </button>
              </div>
            </div>
            <div style={{ padding: '20px', background: '#090d16', display: 'flex', justifyContent: 'center' }}>
              <img 
                src={previewImage} 
                alt="Reported Issue Problem" 
                style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: '8px' }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
