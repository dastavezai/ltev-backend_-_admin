import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  FileText, Printer, Download, Share2, ExternalLink, RefreshCw, 
  CheckCircle, User, Bike, Calendar, IndianRupee, Wrench, ShieldCheck, 
  Layers, Sliders, Eye, EyeOff, ArrowLeft, ChevronDown, ChevronUp, ZoomIn, ZoomOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getInvoiceHTML, handleOpenInvoiceWindow } from '../utils/invoice';

const SAMPLE_PRESETS = {
  advance_booking: {
    id: 'RNT-1012',
    user_name: 'ABHIJEET PRATAP SINGH',
    user_phone: '9835602315',
    email: 'abhijeet@gmail.com',
    plan_name: 'Weekly Commercial Pass',
    total_cost: '2100',
    advance_paid: '2100',
    paid_amount: '2100',
    due_amount: '3000',
    pre_booking_date: new Date().toISOString().slice(0, 16),
    payment_mode: 'UPI',
    remarks: '9835602315@ybl (UTR: 329847192834)',
    vehicle_id: 'Pending Handover',
    location: 'Khajpura Stand, Patna'
  },
  rent_payment: {
    id: 'RNT-8842',
    receipt_id: 'RNT-8842',
    user_name: 'Krishna Pandey',
    user_phone: '9122334455',
    vehicle_id: 'LT002',
    plan_name: 'Weekly Pass (7 Days)',
    weeks_count: 1,
    amount: '1600',
    paid_amount: '1600',
    deposit_balance: '3500',
    payment_mode: 'CASH',
    payment_date: new Date().toISOString().slice(0, 16),
    next_payment_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  },
  booking_confirm: {
    id: 'RNT-2026',
    advance_booking_id: 'RNT-1012',
    user_name: 'Salman Khan',
    user_phone: '9876543210',
    vehicle_id: 'TT001',
    vehicle_model: 'Hero Optima Electric',
    location: 'Khajpura Stand, Patna',
    plan_name: 'Weekly Commercial Rental',
    total_cost: '5100',
    advance_paid: '1500',
    handover_amount: '3600',
    paid_amount: '5100',
    payment_mode: 'CASH + UPI',
    assignment_date: new Date().toISOString().slice(0, 16),
    remarks: 'Cash: ₹2000 + UPI: ₹1600 (UTR 99281726)'
  },
  service_parts: {
    id: 'SER-3041',
    user_name: 'Ronik Raj',
    user_phone: '9835123456',
    vehicle_id: 'LT001',
    service_type: 'Brake System & Front Suspension Overhaul',
    billed_to: 'rider',
    payment_status: 'paid',
    cost: '650',
    date_reported: new Date().toISOString().slice(0, 10),
    issue_description: 'Front disc brake squeaking, lever loose, chain dry and slack.',
    parts_replaced: 'Front Disc Brake Pad Kit (₹350), Chain Lubricant (₹100), Workshop Tuning Labor (₹200)'
  }
};

export default function InvoiceTestingCenter() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [activeTemplate, setActiveTemplate] = useState('advance_booking');
  const [formData, setFormData] = useState(SAMPLE_PRESETS.advance_booking);
  const [showControls, setShowControls] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  const handleSwitchTemplate = (templateKey) => {
    setActiveTemplate(templateKey);
    setFormData(SAMPLE_PRESETS[templateKey] || {});
  };

  const handleResetPreset = () => {
    setFormData(SAMPLE_PRESETS[activeTemplate] || {});
  };

  const invoiceHTML = useMemo(() => {
    return getInvoiceHTML(activeTemplate, formData);
  }, [activeTemplate, formData]);

  const handleOpenWindow = () => {
    handleOpenInvoiceWindow(formData, activeTemplate);
  };

  // Auto-resize iframe so there is ZERO internal scrollbar inside the frame!
  const resizeIframe = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        const doc = iframeRef.current.contentWindow.document;
        if (doc && doc.body) {
          const height = Math.max(
            doc.body.scrollHeight,
            doc.documentElement.scrollHeight,
            doc.body.offsetHeight,
            doc.documentElement.offsetHeight
          );
          if (height > 0) {
            iframeRef.current.style.height = `${height + 30}px`;
          }
        }
      } catch (err) {
        // Safe fallback
      }
    }
  };

  useEffect(() => {
    const timer1 = setTimeout(resizeIframe, 80);
    const timer2 = setTimeout(resizeIframe, 300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [invoiceHTML, activeTemplate, formData, zoomLevel]);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      
      {/* ============================================================ */}
      {/* TOP APP BAR: Template Switcher & Quick Tools */}
      {/* ============================================================ */}
      <header style={{
        background: '#0f172a',
        color: '#ffffff',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Left: Brand & Back */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#1e293b',
              color: '#94a3b8',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: 'white', fontSize: '14px' }}>
              L
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '-0.3px', margin: 0, lineHeight: 1.2 }}>
                Invoice <span style={{ color: '#38bdf8' }}>Design Lab</span>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Developer Testing Environment (No Inner Scroll)</div>
            </div>
          </div>
        </div>

        {/* Center: 4 Template Selector Pills */}
        <div style={{ display: 'flex', background: '#1e293b', padding: '4px', borderRadius: '8px', border: '1px solid #334155', gap: '4px' }}>
          {[
            { key: 'advance_booking', label: '1. Advance Booking', icon: '🎟️' },
            { key: 'rent_payment', label: '2. Rent Payment', icon: '💳' },
            { key: 'booking_confirm', label: '3. Handover Agreement', icon: '🛵' },
            { key: 'service_parts', label: '4. Service & Parts', icon: '🔧' }
          ].map(tab => {
            const isActive = activeTemplate === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleSwitchTemplate(tab.key)}
                style={{
                  background: isActive ? '#0284c7' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isActive ? '700' : '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: Controls Toggle, Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          
          {/* Zoom controls */}
          <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', padding: '2px 6px', gap: '4px' }}>
            <button
              onClick={() => setZoomLevel(prev => Math.max(60, prev - 10))}
              title="Zoom Out"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            >
              <ZoomOut size={13} />
            </button>
            <span style={{ fontSize: '11px', color: '#cbd5e1', minWidth: '34px', textAlign: 'center', fontWeight: '600' }}>
              {zoomLevel}%
            </span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(140, prev + 10))}
              title="Zoom In"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            onClick={() => setShowControls(prev => !prev)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: showControls ? '#334155' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {showControls ? <EyeOff size={14} /> : <Sliders size={14} />}
            {showControls ? 'Hide Inputs' : 'Show Inputs'}
          </button>

          <button
            onClick={handleResetPreset}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={13} /> Reset
          </button>

          <button
            onClick={handleOpenWindow}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.4)'
            }}
          >
            <ExternalLink size={14} /> Open in New Tab
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* COLLAPSIBLE CONFIGURATION PANEL (ABOVE THE INVOICE) */}
      {/* ============================================================ */}
      {showControls && (
        <div style={{
          background: '#ffffff',
          borderBottom: '2px solid #cbd5e1',
          padding: '16px 24px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={15} color="#0284c7" />
                <span>Configure Live Fields for: <strong style={{ color: '#0284c7' }}>{activeTemplate.replace('_', ' ').toUpperCase()}</strong></span>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                💡 Page scrolls naturally with zero inner scrollbars. Press F12 to inspect styles directly!
              </div>
            </div>

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Invoice / Ref ID
                </label>
                <input
                  type="text"
                  value={formData.id || ''}
                  onChange={e => setFormData({ ...formData, id: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.user_name || ''}
                  onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.user_phone || ''}
                  onChange={e => setFormData({ ...formData, user_phone: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Assigned EV / Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. TT001, LT002"
                  value={formData.vehicle_id || ''}
                  onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Template Specific Inputs */}
              {activeTemplate === 'advance_booking' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Advance Paid (₹)</label>
                    <input
                      type="number"
                      value={formData.total_cost || ''}
                      onChange={e => setFormData({ ...formData, total_cost: e.target.value, paid_amount: e.target.value, advance_paid: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Payment Mode</label>
                    <input
                      type="text"
                      value={formData.payment_mode || ''}
                      onChange={e => setFormData({ ...formData, payment_mode: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Stand Location</label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Remarks / Transaction</label>
                    <input
                      type="text"
                      value={formData.remarks || ''}
                      onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </>
              )}

              {activeTemplate === 'rent_payment' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Rent Collected (₹)</label>
                    <input
                      type="number"
                      value={formData.amount || ''}
                      onChange={e => setFormData({ ...formData, amount: e.target.value, paid_amount: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Cycle Count</label>
                    <input
                      type="number"
                      value={formData.weeks_count || 1}
                      onChange={e => setFormData({ ...formData, weeks_count: parseInt(e.target.value, 10) || 1 })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Next Due Date</label>
                    <input
                      type="date"
                      value={formData.next_payment_date || ''}
                      onChange={e => setFormData({ ...formData, next_payment_date: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Payment Mode</label>
                    <input
                      type="text"
                      value={formData.payment_mode || ''}
                      onChange={e => setFormData({ ...formData, payment_mode: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </>
              )}

              {activeTemplate === 'booking_confirm' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Advance Booking ID</label>
                    <input
                      type="text"
                      value={formData.advance_booking_id || 'RNT-1012'}
                      onChange={e => setFormData({ ...formData, advance_booking_id: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Advance Booking Amount (₹)</label>
                    <input
                      type="number"
                      value={formData.advance_paid || '1500'}
                      onChange={e => setFormData({ ...formData, advance_paid: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Handover Collected (₹)</label>
                    <input
                      type="number"
                      value={formData.handover_amount || '3600'}
                      onChange={e => setFormData({ ...formData, handover_amount: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Place</label>
                    <input
                      type="text"
                      value={formData.location || 'Khajpura Stand'}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </>
              )}

              {activeTemplate === 'service_parts' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Service Category</label>
                    <input
                      type="text"
                      value={formData.service_type || ''}
                      onChange={e => setFormData({ ...formData, service_type: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Total Cost (₹)</label>
                    <input
                      type="number"
                      value={formData.cost || ''}
                      onChange={e => setFormData({ ...formData, cost: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Billed To</label>
                    <select
                      value={formData.billed_to || 'rider'}
                      onChange={e => setFormData({ ...formData, billed_to: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box', background: 'white' }}
                    >
                      <option value="rider">Rider</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>Parts Replaced & Cost Breakdown</label>
                    <input
                      type="text"
                      value={formData.parts_replaced || ''}
                      onChange={e => setFormData({ ...formData, parts_replaced: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CENTERED FULL-PAGE LIVE INVOICE CANVAS (NATURAL PAGE SCROLL) */}
      {/* ============================================================ */}
      <main style={{
        flex: 1,
        padding: '24px 16px 80px 16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* Document Card Container */}
        <div style={{
          width: '100%',
          maxWidth: '860px',
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'top center',
          transition: 'transform 0.15s ease',
          boxShadow: '0 10px 30px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
          borderRadius: '8px',
          overflow: 'hidden',
          background: '#ffffff',
          marginBottom: '40px'
        }}>
          
          {/* Quick Document Action Ribbon */}
          <div style={{
            background: '#1e293b',
            color: '#cbd5e1',
            padding: '8px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <Eye size={14} color="#38bdf8" />
              <span>Full A4 Document View &bull; {activeTemplate.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleOpenWindow}
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Printer size={12} /> Print Document
              </button>
            </div>
          </div>

          {/* Seamless IFrame without any internal scrollbar */}
          <iframe
            ref={iframeRef}
            id="invoice-live-frame"
            title="Invoice Live Preview"
            srcDoc={invoiceHTML}
            scrolling="no"
            onLoad={resizeIframe}
            style={{
              width: '100%',
              minHeight: '1050px',
              border: 'none',
              background: '#ffffff',
              display: 'block',
              overflow: 'hidden'
            }}
          />
        </div>

      </main>

    </div>
  );
}
