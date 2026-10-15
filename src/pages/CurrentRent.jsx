import { useState, useEffect, useMemo } from 'react';
import { 
  CalendarDays, Calendar, Clock, Bike, User, ShieldCheck, 
  CheckCircle2, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, 
  Search, Filter, CreditCard, DollarSign, Send, ArrowRight,
  TrendingUp, Download, Eye, Layers, Sparkles, Building2, Globe,
  Check, Phone, MessageSquare, ArrowUpRight, Zap, AlertCircle, X
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import RiderDetailsModal from '../components/RiderDetailsModal';

// Helper: Get ISO Week Range (Monday 00:00:00 to Sunday 23:59:59)
const getWeekRange = (refDate = new Date()) => {
  const d = new Date(refDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
};

// Helper: Format Date for UI (e.g. "12 Oct 2026")
const formatDate = (dateObj) => {
  if (!dateObj) return 'N/A';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Helper: Format Month for UI (e.g. "October 2026")
const formatMonth = (dateObj) => {
  if (!dateObj) return 'N/A';
  const d = new Date(dateObj);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export default function CurrentRent() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rentalsData, setRentalsData] = useState([]);
  const [plans, setPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'paid' | 'due_soon' | 'overdue'
  const [methodFilter, setMethodFilter] = useState('all'); // 'all' | 'gateway' | 'office'

  // Top Tabs: 'weekly' | 'monthly'
  const [activeTab, setActiveTab] = useState('weekly');

  // Week Navigation State
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [isAllWeeks, setIsAllWeeks] = useState(false);
  const [selectedCustomDate, setSelectedCustomDate] = useState('');

  // Month Navigation State
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0); // 0 = current month, -1 = last month
  const [isAllMonths, setIsAllMonths] = useState(false);

  // Payment Collection Modal State
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null);
  const [collectForm, setCollectForm] = useState({
    amount: '1600',
    cycle_count: '1',
    payment_mode: 'cash', // 'cash' | 'upi' | 'online'
    remarks: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState(null);

  // Switch Plan Modal State (Weekly <-> Monthly)
  const [switchModalOpen, setSwitchModalOpen] = useState(false);
  const [switchingRental, setSwitchingRental] = useState(null);
  const [targetPlanId, setTargetPlanId] = useState('');
  const [submittingSwitch, setSubmittingSwitch] = useState(false);

  // Rider Details Modal State
  const [selectedRider, setSelectedRider] = useState(null);
  const [riderDetails, setRiderDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [riderModalTab, setRiderModalTab] = useState('overview');

  // Fetch Current Rent Data from API
  const fetchCurrentRent = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rentRes, plansRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/current-rent`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${import.meta.env.VITE_API_URL || ''}/api/plans`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setRentalsData(rentRes.data.records || []);
      setPlans(plansRes.data || []);
    } catch (err) {
      console.error('Error fetching current rent records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentRent();
  }, [token]);

  // Show Toast
  const showToast = (msg, type = 'success') => {
    setNotificationMsg({ text: msg, type });
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  // -----------------------------------------------------------------
  // CALCULATE ACTIVE WEEK RANGE
  // -----------------------------------------------------------------
  const activeWeekInfo = useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + (currentWeekOffset * 7));
    const { monday, sunday } = getWeekRange(targetDate);

    let label = 'Custom Week';
    if (currentWeekOffset === 0) label = 'Current Week';
    else if (currentWeekOffset === -1) label = 'Last Week';
    else if (currentWeekOffset < -1) label = `${Math.abs(currentWeekOffset)} Weeks Ago`;
    else if (currentWeekOffset === 1) label = 'Next Week';
    else if (currentWeekOffset > 1) label = `In ${currentWeekOffset} Weeks`;

    return {
      monday,
      sunday,
      offset: currentWeekOffset,
      label,
      dateRangeText: `${formatDate(monday)} – ${formatDate(sunday)}`
    };
  }, [currentWeekOffset]);

  // -----------------------------------------------------------------
  // CALCULATE ACTIVE MONTH RANGE
  // -----------------------------------------------------------------
  const activeMonthInfo = useMemo(() => {
    const today = new Date();
    const targetMonth = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1);
    const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    let label = 'Custom Month';
    if (currentMonthOffset === 0) label = 'Current Month';
    else if (currentMonthOffset === -1) label = 'Last Month';
    else if (currentMonthOffset < -1) label = `${Math.abs(currentMonthOffset)} Months Ago`;
    else if (currentMonthOffset === 1) label = 'Next Month';

    return {
      monthStart,
      monthEnd,
      offset: currentMonthOffset,
      label,
      monthText: formatMonth(monthStart)
    };
  }, [currentMonthOffset]);

  // -----------------------------------------------------------------
  // FILTER RENTALS BY TAB (WEEKLY vs MONTHLY) AND PERIOD
  // -----------------------------------------------------------------
  const tabRentals = useMemo(() => {
    if (activeTab === 'weekly') {
      return rentalsData.filter(r => !r.is_monthly);
    } else {
      return rentalsData.filter(r => r.is_monthly);
    }
  }, [rentalsData, activeTab]);

  // Filter rentals by the selected week or month period
  const periodFilteredRentals = useMemo(() => {
    if (activeTab === 'weekly') {
      if (isAllWeeks) return tabRentals;

      const { monday, sunday } = activeWeekInfo;
      return tabRentals.filter(r => {
        const start = r.start_time ? new Date(r.start_time) : new Date(0);
        const end = r.end_time ? new Date(r.end_time) : null;

        // Rental was active if it started before/during this week and hasn't ended before Monday
        const startedBeforeWeekEnd = start.getTime() <= sunday.getTime();
        const activeInWeek = !end || end.getTime() >= monday.getTime();
        return startedBeforeWeekEnd && activeInWeek;
      });
    } else {
      // Monthly tab
      if (isAllMonths) return tabRentals;

      const { monthStart, monthEnd } = activeMonthInfo;
      return tabRentals.filter(r => {
        const start = r.start_time ? new Date(r.start_time) : new Date(0);
        const end = r.end_time ? new Date(r.end_time) : null;

        const startedBeforeMonthEnd = start.getTime() <= monthEnd.getTime();
        const activeInMonth = !end || end.getTime() >= monthStart.getTime();
        return startedBeforeMonthEnd && activeInMonth;
      });
    }
  }, [tabRentals, activeTab, isAllWeeks, activeWeekInfo, isAllMonths, activeMonthInfo]);

  // Apply Search, Status & Method Filters
  const filteredRecords = useMemo(() => {
    return periodFilteredRentals.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (r.vehicle_number || '').toLowerCase().includes(q) ||
        (r.vehicle_model || '').toLowerCase().includes(q) ||
        (r.rider?.name || '').toLowerCase().includes(q) ||
        (r.rider?.phone || '').includes(q)
      );

      if (!matchesSearch) return false;

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'paid' && r.payment_status !== 'paid') return false;
        if (statusFilter === 'due_soon' && r.payment_status !== 'due_soon') return false;
        if (statusFilter === 'overdue' && r.payment_status !== 'overdue') return false;
      }

      // Method Filter
      if (methodFilter !== 'all') {
        if (methodFilter === 'gateway' && r.method_category !== 'gateway') return false;
        if (methodFilter === 'office' && r.method_category === 'gateway') return false;
      }

      return true;
    });
  }, [periodFilteredRentals, searchQuery, statusFilter, methodFilter]);

  // -----------------------------------------------------------------
  // SUMMARY METRICS FOR CURRENT FILTERED PERIOD
  // -----------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = periodFilteredRentals.length;
    const paid = periodFilteredRentals.filter(r => r.payment_status === 'paid');
    const dueSoon = periodFilteredRentals.filter(r => r.payment_status === 'due_soon');
    const overdue = periodFilteredRentals.filter(r => r.payment_status === 'overdue');
    const gateway = periodFilteredRentals.filter(r => r.method_category === 'gateway');
    const inOffice = periodFilteredRentals.filter(r => r.method_category !== 'gateway');

    const totalOverdueAmount = overdue.reduce((sum, r) => sum + (r.due_amount || r.plan?.price || 0), 0);
    const totalPaidAmount = paid.reduce((sum, r) => sum + (r.plan?.price || 0), 0);

    return {
      total,
      paidCount: paid.length,
      paidAmount: totalPaidAmount,
      dueSoonCount: dueSoon.length,
      overdueCount: overdue.length,
      overdueAmount: totalOverdueAmount,
      gatewayCount: gateway.length,
      officeCount: inOffice.length
    };
  }, [periodFilteredRentals]);

  // -----------------------------------------------------------------
  // ACTIONS: COLLECT PAYMENT
  // -----------------------------------------------------------------
  const openCollectPaymentModal = (rental) => {
    setSelectedRental(rental);
    const isMonthly = rental.is_monthly;
    const defaultPrice = String(rental.plan?.price || (isMonthly ? 6000 : 1600));
    setCollectForm({
      amount: defaultPrice,
      cycle_count: '1',
      payment_mode: rental.method_category === 'gateway' ? 'online' : 'cash',
      remarks: ''
    });
    setCollectModalOpen(true);
  };

  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRental) return;
    setSubmittingPayment(true);
    try {
      const payload = {
        amount: parseFloat(collectForm.amount),
        weeks_count: parseInt(collectForm.cycle_count, 10) || 1,
        payment_mode: collectForm.payment_mode,
        remarks: collectForm.remarks || `${collectForm.cycle_count} ${selectedRental.is_monthly ? 'month' : 'week'} renewal`
      };

      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/bookings/${selectedRental.id}/collect-payment`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`Payment of ₹${collectForm.amount} collected successfully via ${collectForm.payment_mode.toUpperCase()}! Next cycle extended.`, 'success');
      setCollectModalOpen(false);
      setSelectedRental(null);
      fetchCurrentRent();
    } catch (err) {
      console.error('Payment collection failed:', err);
      showToast('Payment recording failed: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // -----------------------------------------------------------------
  // ACTIONS: SWITCH PLAN (WEEKLY <-> MONTHLY)
  // -----------------------------------------------------------------
  const openSwitchPlanModal = (rental) => {
    setSwitchingRental(rental);
    const target = plans.find(p => rental.is_monthly ? p.type.toLowerCase().includes('weekly') : p.type.toLowerCase().includes('monthly'));
    setTargetPlanId(target ? String(target.id) : '');
    setSwitchModalOpen(true);
  };

  const handleSwitchPlanSubmit = async (e) => {
    e.preventDefault();
    if (!switchingRental || !targetPlanId) return;
    setSubmittingSwitch(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/rentals/${switchingRental.id}/switch-plan`, {
        plan_id: parseInt(targetPlanId, 10)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`Rental plan successfully switched!`, 'success');
      setSwitchModalOpen(false);
      setSwitchingRental(null);
      fetchCurrentRent();
    } catch (err) {
      console.error('Switch plan failed:', err);
      showToast('Failed to switch plan: ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setSubmittingSwitch(false);
    }
  };

  // -----------------------------------------------------------------
  // ACTIONS: WHATSAPP REMINDER
  // -----------------------------------------------------------------
  const handleSendWhatsAppReminder = (rental) => {
    const phone = (rental.rider?.phone || '').replace(/\D/g, '');
    const cleanPhone = phone.length > 10 ? phone.slice(-10) : phone;
    if (!cleanPhone || cleanPhone.length < 10) {
      alert('Valid phone number not available for this rider.');
      return;
    }

    const riderName = rental.rider?.name || 'Rider';
    const vehicleNum = rental.vehicle_number || 'EV';
    const cycleType = rental.is_monthly ? 'Monthly' : 'Weekly';
    const dueAmount = rental.due_amount || rental.plan?.price || (rental.is_monthly ? 6000 : 1600);
    const dueDate = formatDate(rental.cycle_end);

    const message = `Hello ${riderName},\n\nThis is a friendly reminder from LocalToto regarding your ${cycleType} rental for EV (${vehicleNum}).\n\n- Cycle Expiry: ${dueDate}\n- Current Due Amount: ₹${dueAmount.toLocaleString('en-IN')}\n\nPlease settle your rental payment at the nearest LocalToto office or via your online payment portal to keep your ride active without interruptions.\n\nThank you!`;

    window.open(`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // -----------------------------------------------------------------
  // ACTIONS: RIDER DETAILS MODAL
  // -----------------------------------------------------------------
  const openRiderProfile = async (riderUser) => {
    if (!riderUser?.id) return;
    setSelectedRider(riderUser);
    setLoadingDetails(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/riders/${riderUser.id}/details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRiderDetails(res.data);
    } catch (err) {
      console.error('Failed to fetch rider profile:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // -----------------------------------------------------------------
  // CSV EXPORT
  // -----------------------------------------------------------------
  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = ['Vehicle Number', 'Vehicle Model', 'Rider Name', 'Rider Phone', 'Plan Type', 'Plan Price', 'Cycle Day', 'Payment Status', 'Method', 'Due Date', 'Total Paid'];
    const rows = filteredRecords.map(r => [
      `"${r.vehicle_number}"`,
      `"${r.vehicle_model}"`,
      `"${r.rider?.name || 'N/A'}"`,
      `"${r.rider?.phone || 'N/A'}"`,
      `"${r.plan?.name || (r.is_monthly ? 'Monthly' : 'Weekly')}"`,
      `"${r.plan?.price || 0}"`,
      `"${r.cycle_day_text}"`,
      `"${r.payment_status_label}"`,
      `"${r.method_label}"`,
      `"${formatDate(r.cycle_end)}"`,
      `"${r.total_cost || 0}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LocalToto_Current_Rent_${activeTab}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      
      {/* Toast Notification */}
      {notificationMsg && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: notificationMsg.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '14px',
          animation: 'fadeIn 0.3s ease'
        }}>
          {notificationMsg.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* HEADER SECTION                                            */}
      {/* ========================================================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)'
            }}>
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
                Current Rent Management
              </h1>
              <p style={{ margin: '3px 0 0', color: '#64748b', fontSize: '14px' }}>
                Track weekly & monthly vehicle rent cycles, cycle progress, real-time payment statuses, and payment methods.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchCurrentRent}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#475569',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportToCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#0f172a',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
            }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TOP TABS: WEEKLY RENTALS vs MONTHLY RENTALS               */}
      {/* ========================================================= */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '0px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setActiveTab('weekly')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'weekly' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'weekly' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'weekly' ? '700' : '600',
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            <Calendar size={18} />
            <span>Weekly Rentals (Week-Wise)</span>
            <span style={{
              background: activeTab === 'weekly' ? '#e0f2fe' : '#f1f5f9',
              color: activeTab === 'weekly' ? '#0369a1' : '#64748b',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              {rentalsData.filter(r => !r.is_monthly).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('monthly')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 24px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'monthly' ? '3px solid #0284c7' : '3px solid transparent',
              color: activeTab === 'monthly' ? '#0284c7' : '#64748b',
              fontWeight: activeTab === 'monthly' ? '700' : '600',
              fontSize: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-2px'
            }}
          >
            <Clock size={18} />
            <span>Monthly Rentals (Month-Wise)</span>
            <span style={{
              background: activeTab === 'monthly' ? '#e0f2fe' : '#f1f5f9',
              color: activeTab === 'monthly' ? '#0369a1' : '#64748b',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '800'
            }}>
              {rentalsData.filter(r => r.is_monthly).length}
            </span>
          </button>
        </div>

        {/* Quick hint badge */}
        <div style={{ fontSize: '13px', color: '#64748b', paddingBottom: '8px' }}>
          {activeTab === 'weekly' ? (
            <span>⚡ Standard 7-Day Renewal Cycle (₹1,600 / wk)</span>
          ) : (
            <span>📅 Long-term 30-Day Commuter Cycle (₹6,000 / mo)</span>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* UNIFIED CONTROLS: WEEK/MONTH NAVIGATION + SEARCH & FILTERS */}
      {/* ========================================================= */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        {/* Left: Week or Month Navigation */}
        {activeTab === 'weekly' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setCurrentWeekOffset(prev => prev - 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                transition: 'background 0.2s'
              }}
              title="Previous Week"
            >
              <ChevronLeft size={20} />
            </button>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: '220px',
              padding: '6px 14px',
              background: '#f0f9ff',
              borderRadius: '10px',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  color: '#0284c7',
                  letterSpacing: '0.5px'
                }}>
                  {activeWeekInfo.label}
                </span>
                {currentWeekOffset === 0 && (
                  <span style={{
                    background: '#10b981',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: '800',
                    padding: '1px 6px',
                    borderRadius: '8px'
                  }}>LIVE</span>
                )}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                {activeWeekInfo.dateRangeText}
              </div>
            </div>

            <button
              onClick={() => setCurrentWeekOffset(prev => prev + 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155',
                transition: 'background 0.2s'
              }}
              title="Next Week"
            >
              <ChevronRight size={20} />
            </button>

            {currentWeekOffset !== 0 && (
              <button
                onClick={() => setCurrentWeekOffset(0)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#0284c7',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Current Week
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setCurrentMonthOffset(prev => prev - 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155'
              }}
              title="Previous Month"
            >
              <ChevronLeft size={20} />
            </button>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              minWidth: '200px',
              padding: '6px 14px',
              background: '#f0f9ff',
              borderRadius: '10px',
              border: '1px solid #bae6fd'
            }}>
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                color: '#0284c7'
              }}>
                {activeMonthInfo.label}
              </span>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                {activeMonthInfo.monthText}
              </span>
            </div>

            <button
              onClick={() => setCurrentMonthOffset(prev => prev + 1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#334155'
              }}
              title="Next Month"
            >
              <ChevronRight size={20} />
            </button>

            {currentMonthOffset !== 0 && (
              <button
                onClick={() => setCurrentMonthOffset(0)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#0284c7',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Current Month
              </button>
            )}
          </div>
        )}

        {/* Right: Search + Filters inside the same box */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search Vehicle No, Rider Name, Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#f8fafc'
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#334155',
                background: 'white',
                fontWeight: '600'
              }}
            >
              <option value="all">All Statuses ({periodFilteredRentals.length})</option>
              <option value="paid">Paid Only</option>
              <option value="due_soon">Due Soon (≤ 2d)</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {/* Method Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                color: '#334155',
                background: 'white',
                fontWeight: '600'
              }}
            >
              <option value="all">All Methods</option>
              <option value="gateway">🌐 Online Gateway</option>
              <option value="office">🏢 In-Office (Cash/UPI)</option>
            </select>
          </div>

          {/* Reset button if filtered */}
          {(searchQuery || statusFilter !== 'all' || methodFilter !== 'all') && (
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); setMethodFilter('all'); }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* CURRENT RENT TABLE                                        */}
      {/* ========================================================= */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Vehicle Number
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Current Rider
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Cycle Day
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Payment Status
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Method
                </th>
                <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <RefreshCw size={28} className="animate-spin" style={{ color: '#0284c7' }} />
                      <span style={{ fontWeight: '600', fontSize: '14px' }}>Loading fleet rental records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '56px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', maxWidth: '420px', margin: '0 auto' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        <Bike size={28} />
                      </div>
                      <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#1e293b' }}>
                        No Rentals Found for Selected Period
                      </h3>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                        {activeTab === 'monthly'
                          ? "There are currently no active rentals assigned to a Monthly Pass in this period. You can easily upgrade an active weekly rental to a Monthly Pass using the button below."
                          : "No weekly rental records matched your filters for this week. Try selecting 'Current Week' or 'All Weeks'."}
                      </p>
                      {activeTab === 'monthly' && rentalsData.some(r => !r.is_monthly) && (
                        <button
                          onClick={() => {
                            const firstWeekly = rentalsData.find(r => !r.is_monthly);
                            if (firstWeekly) openSwitchPlanModal(firstWeekly);
                          }}
                          style={{
                            marginTop: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 18px',
                            background: '#0284c7',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)'
                          }}
                        >
                          <Sparkles size={16} />
                          <span>Upgrade an Active Rider to Monthly Pass</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rental) => {
                  const isMonthly = rental.is_monthly;
                  const cycleTotal = isMonthly ? 30 : 7;
                  const cycleDayNum = Math.min(cycleTotal, Math.max(1, rental.cycle_day_number));
                  const progressPct = Math.min(100, (cycleDayNum / cycleTotal) * 100);

                  return (
                    <tr
                      key={rental.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                      {/* 1. VEHICLE NUMBER */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#0284c7',
                            flexShrink: 0
                          }}>
                            <Bike size={20} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontWeight: '800',
                                fontSize: '15px',
                                color: '#0f172a',
                                letterSpacing: '0.2px'
                              }}>
                                {rental.vehicle_number}
                              </span>
                              <span style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                EV
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              {rental.vehicle_model}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. CURRENT RIDER */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              onClick={() => openRiderProfile(rental.rider)}
                              style={{
                                fontWeight: '700',
                                fontSize: '14px',
                                color: '#0f172a',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                textDecorationColor: '#cbd5e1'
                              }}
                              title="Click to view rider profile"
                            >
                              {rental.rider?.name || 'Anonymous Rider'}
                            </span>
                            {rental.rider?.kyc_status === 'verified' ? (
                              <span style={{
                                background: '#ecfdf5',
                                color: '#059669',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <Check size={10} /> KYC
                              </span>
                            ) : (
                              <span style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '6px'
                              }}>
                                Pending
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                            <a
                              href={`tel:${rental.rider?.phone}`}
                              style={{
                                fontSize: '12px',
                                color: '#64748b',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Phone size={11} />
                              <span>{rental.rider?.phone || 'No phone'}</span>
                            </a>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                              ID: #{rental.rider?.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. CYCLE DAY */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div style={{ minWidth: '160px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '13px',
                              color: rental.is_overdue ? '#dc2626' : (rental.is_due_soon ? '#d97706' : '#0f172a')
                            }}>
                              {rental.cycle_day_text}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                              {rental.is_overdue ? 'EXPIRED' : `${cycleTotal - cycleDayNum}d left`}
                            </span>
                          </div>

                          {/* Progress Bar */}
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#e2e8f0',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${rental.is_overdue ? 100 : progressPct}%`,
                              height: '100%',
                              background: rental.is_overdue
                                ? '#dc2626'
                                : rental.is_due_soon
                                  ? '#d97706'
                                  : 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)',
                              borderRadius: '3px'
                            }} />
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            Due: <strong style={{ color: '#334155' }}>{formatDate(rental.cycle_end)}</strong>
                          </div>
                        </div>
                      </td>

                      {/* 4. PAYMENT STATUS */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div>
                          {rental.payment_status === 'paid' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <CheckCircle2 size={13} />
                              <span>Paid</span>
                            </span>
                          )}

                          {rental.payment_status === 'due_soon' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <Clock size={13} />
                              <span>{rental.payment_status_label}</span>
                            </span>
                          )}

                          {rental.payment_status === 'overdue' && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <AlertTriangle size={13} />
                              <span>{rental.payment_status_label}</span>
                            </span>
                          )}

                          <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600', marginTop: '4px' }}>
                            {rental.is_overdue ? (
                              <span style={{ color: '#dc2626' }}>Due: ₹{rental.due_amount.toLocaleString('en-IN')}</span>
                            ) : (
                              <span>Plan: ₹{rental.plan?.price?.toLocaleString('en-IN') || 1600}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. METHOD (Gateway / In office) */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                        <div>
                          {rental.method_category === 'gateway' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <Globe size={13} />
                              <span>Online Gateway</span>
                            </span>
                          ) : rental.method_category === 'office_upi' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#faf5ff',
                              color: '#7e22ce',
                              border: '1px solid #e9d5ff',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <Building2 size={13} />
                              <span>In Office (UPI)</span>
                            </span>
                          ) : rental.method_category === 'office_mixed' ? (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#fdf4ff',
                              color: '#a21caf',
                              border: '1px solid #f0abfc',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <Building2 size={13} />
                              <span>In Office (Mixed)</span>
                            </span>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #bbf7d0',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              <Building2 size={13} />
                              <span>In Office (Cash)</span>
                            </span>
                          )}

                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            {rental.raw_payment_mode ? `Mode: ${rental.raw_payment_mode.toUpperCase()}` : 'Office Desk'}
                          </div>
                        </div>
                      </td>

                      {/* 6. ACTIONS */}
                      <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {/* Collect / Renew Rent Button */}
                          <button
                            onClick={() => openCollectPaymentModal(rental)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              background: rental.is_overdue ? '#dc2626' : '#0284c7',
                              border: 'none',
                              borderRadius: '8px',
                              color: 'white',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                            }}
                          >
                            <DollarSign size={14} />
                            <span>{rental.is_overdue ? 'Collect Due' : 'Collect Rent'}</span>
                          </button>

                          {/* WhatsApp Reminder Button */}
                          <button
                            onClick={() => handleSendWhatsAppReminder(rental)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#25d366',
                              border: 'none',
                              color: 'white',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Send WhatsApp Payment Notice"
                          >
                            <MessageSquare size={15} />
                          </button>

                          {/* Switch Plan (Weekly <-> Monthly) */}
                          <button
                            onClick={() => openSwitchPlanModal(rental)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#475569',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title={rental.is_monthly ? 'Switch to Weekly Pass' : 'Upgrade to Monthly Pass'}
                          >
                            <Layers size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div style={{
          padding: '14px 24px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          color: '#64748b'
        }}>
          <div>
            Showing <strong>{filteredRecords.length}</strong> of <strong>{periodFilteredRentals.length}</strong> fleet records
          </div>
          <div>
            Active Plan: <strong>{activeTab === 'weekly' ? 'Weekly Subscription (7 Days)' : 'Monthly Commuter (30 Days)'}</strong>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: RECORD / COLLECT RENT PAYMENT                    */}
      {/* ========================================================= */}
      {collectModalOpen && selectedRental && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
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
            maxWidth: '520px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  Collect Rent & Extend Cycle
                </h3>
                <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  EV: {selectedRental.vehicle_number} • Rider: {selectedRental.rider?.name}
                </p>
              </div>
              <button
                onClick={() => setCollectModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCollectPaymentSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Summary details card */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Current Due Date</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                    {formatDate(selectedRental.cycle_end)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Plan Rate</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#0284c7', marginTop: '2px' }}>
                    ₹{selectedRental.plan?.price || (selectedRental.is_monthly ? 6000 : 1600)} / {selectedRental.is_monthly ? 'Month' : 'Week'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Current Status</div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: selectedRental.is_overdue ? '#dc2626' : '#059669', marginTop: '2px' }}>
                    {selectedRental.payment_status_label}
                  </div>
                </div>
              </div>

              {/* Number of Cycles Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Select Rental Duration / Renewal Cycles
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { count: '1', label: selectedRental.is_monthly ? '1 Month' : '1 Week', amt: selectedRental.is_monthly ? '6000' : '1600' },
                    { count: '2', label: selectedRental.is_monthly ? '2 Months' : '2 Weeks', amt: selectedRental.is_monthly ? '12000' : '3200' },
                    { count: '4', label: selectedRental.is_monthly ? '4 Months' : '4 Weeks', amt: selectedRental.is_monthly ? '24000' : '6400' },
                  ].map(preset => (
                    <button
                      key={preset.count}
                      type="button"
                      onClick={() => setCollectForm(prev => ({ ...prev, cycle_count: preset.count, amount: preset.amt }))}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        border: collectForm.cycle_count === preset.count ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: collectForm.cycle_count === preset.count ? '#e0f2fe' : 'white',
                        color: collectForm.cycle_count === preset.count ? '#0369a1' : '#334155',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div>{preset.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>₹{parseInt(preset.amt).toLocaleString('en-IN')}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  required
                  value={collectForm.amount}
                  onChange={(e) => setCollectForm(prev => ({ ...prev, amount: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '16px',
                    fontWeight: '800',
                    color: '#0f172a'
                  }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Payment Method
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'cash', label: 'In Office (Cash)', icon: <Building2 size={16} /> },
                    { id: 'upi', label: 'In Office (UPI)', icon: <Zap size={16} /> },
                    { id: 'online', label: 'Payment Gateway', icon: <Globe size={16} /> },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCollectForm(prev => ({ ...prev, payment_mode: m.id }))}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: collectForm.payment_mode === m.id ? '2px solid #0284c7' : '1px solid #cbd5e1',
                        background: collectForm.payment_mode === m.id ? '#e0f2fe' : 'white',
                        color: collectForm.payment_mode === m.id ? '#0369a1' : '#334155',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Remarks */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Payment Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Office desk cash received by admin"
                  value={collectForm.remarks}
                  onChange={(e) => setCollectForm(prev => ({ ...prev, remarks: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px'
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCollectModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingPayment}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0284c7',
                    color: 'white',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {submittingPayment ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Recording Payment...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm & Record Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: SWITCH PLAN MODAL (WEEKLY <-> MONTHLY)          */}
      {/* ========================================================= */}
      {switchModalOpen && switchingRental && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
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
            maxWidth: '480px',
            width: '100%',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              padding: '20px 24px',
              background: '#0f172a',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>
                  Switch Rental Plan
                </h3>
                <p style={{ margin: '3px 0 0', color: '#94a3b8', fontSize: '13px' }}>
                  EV: {switchingRental.vehicle_number} • Rider: {switchingRental.rider?.name}
                </p>
              </div>
              <button
                onClick={() => setSwitchModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSwitchPlanSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                You are updating the active rental billing tier for vehicle <strong>{switchingRental.vehicle_number}</strong>.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Select New Subscription Plan
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {plans.map(p => {
                    const isSelected = String(p.id) === String(targetPlanId);
                    return (
                      <div
                        key={p.id}
                        onClick={() => setTargetPlanId(String(p.id))}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          border: isSelected ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: isSelected ? '#f0f9ff' : 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: '800', fontSize: '14px', color: '#0f172a' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            Type: {p.type} • Security Deposit: ₹{parseFloat(p.security_deposit || 3500).toLocaleString('en-IN')}
                          </div>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '800', color: '#0284c7' }}>
                          ₹{parseFloat(p.price).toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSwitchModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    color: '#475569',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingSwitch || !targetPlanId}
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#0284c7',
                    color: 'white',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {submittingSwitch ? 'Updating...' : 'Confirm Plan Switch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* RIDER DETAILS MODAL                                       */}
      {/* ========================================================= */}
      <RiderDetailsModal
        isOpen={Boolean(selectedRider)}
        onClose={() => { setSelectedRider(null); setRiderDetails(null); }}
        rider={selectedRider}
        details={riderDetails}
        loading={loadingDetails}
        onRefresh={() => {
          if (selectedRider?.id) openRiderProfile(selectedRider);
        }}
        activeTab={riderModalTab}
        setActiveTab={setRiderModalTab}
      />

    </div>
  );
}
