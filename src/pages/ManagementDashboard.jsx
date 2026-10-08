import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wrench, DollarSign, Calendar, CalendarPlus, CalendarCheck, Search, Plus, RefreshCw, 
  CheckCircle, Clock, Send, X, Check, ExternalLink, 
  Bike, AlertCircle, ArrowRight, RotateCcw, User, Phone, MapPin, Trash2, FileText, ShieldCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { handleOpenInvoiceWindow, getShortBookingId } from '../utils/invoice';

const SERVICE_PRESETS = [
  'General Periodic Service & Tuning',
  'Brake Shoes / Pads Replacement',
  'Tyre Tube Replacement / Puncture',
  'Battery Health & Electrical Inspection',
  'Mirror, Light & Indicator Repair',
  'Throttle & Acceleration Cable Fix',
  'Motor Hub & Greasing',
  'Body Panel Guard Repair'
];

// Helper to format local Date for datetime-local input
const getLocalDatetimeString = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
};

export default function ManagementDashboard() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const authToken = token || localStorage.getItem('token');
  const authHeaders = useMemo(() => ({
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }), [authToken]);

  // Main Quick Tab: 'service' | 'rent' | 'advance-bookings'
  const [activeTab, setActiveTab] = useState('service');

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [stands, setStands] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // TAB 1: SERVICE BILLING STATE & CATALOG
  // -------------------------------------------------------------
  const [catalogServices, setCatalogServices] = useState([]);
  const [catalogParts, setCatalogParts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);

  const [serviceSearchPlate, setServiceSearchPlate] = useState('');
  const [selectedServiceVehicle, setSelectedServiceVehicle] = useState(null);
  const [serviceVehicleFilter, setServiceVehicleFilter] = useState('assigned'); // 'assigned' | 'all' | 'maintenance'
  const [serviceVehicleSearch, setServiceVehicleSearch] = useState('');
  const [serviceForm, setServiceForm] = useState({
    vehicle_id: '',
    service_type: 'General Periodic Service & Tuning',
    issue_description: '',
    parts_replaced: '',
    cost: '350',
    status: 'in_progress', // 'in_progress' | 'completed'
    billed_to: 'company', // 'company' | 'rider'
    payment_status: 'paid'
  });
  const [submittingService, setSubmittingService] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: RENT & PAYMENTS STATE
  // -------------------------------------------------------------
  const [rentFilter, setRentFilter] = useState('all'); // 'all' | 'weekly' | 'monthly' | 'overdue' | 'due_soon'
  const [rentPaymentModalOpen, setRentPaymentModalOpen] = useState(false);
  const [selectedRentalForPayment, setSelectedRentalForPayment] = useState(null);
  const [rentPaymentForm, setRentPaymentForm] = useState({
    cycle_count: '1',
    remarks: ''
  });
  const [rentPaymentRows, setRentPaymentRows] = useState([
    { mode: 'cash', amount: '1600', remarks: '' }
  ]);
  const [submittingRentPayment, setSubmittingRentPayment] = useState(false);
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState(null);

  // -------------------------------------------------------------
  // TAB 3: ADVANCE BOOKINGS & ALLOCATION STATE
  // -------------------------------------------------------------
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all' | 'waiting' | 'assigned'
  const [assignSlotModalOpen, setAssignSlotModalOpen] = useState(false);
  const [assignSlotStep, setAssignSlotStep] = useState(1);
  const [assignSlotEvSearch, setAssignSlotEvSearch] = useState('');
  const [assignSlotOnlyUnassigned, setAssignSlotOnlyUnassigned] = useState(true);
  const [selectedBookingForSlot, setSelectedBookingForSlot] = useState(null);
  const [showMoreSlotOptions, setShowMoreSlotOptions] = useState(false);
  const [assignSlotForm, setAssignSlotForm] = useState({
    vehicle_id: '',
    remarks: '',
    assignment_date: getLocalDatetimeString()
  });
  const [assignSlotPaymentRows, setAssignSlotPaymentRows] = useState([
    { mode: 'cash', amount: '3600', remarks: '' }
  ]);
  const [submittingAssignSlot, setSubmittingAssignSlot] = useState(false);

  // Return Old Vehicle Modal
  const [returnVehicleModalOpen, setReturnVehicleModalOpen] = useState(false);
  const [selectedVehicleToReturn, setSelectedVehicleToReturn] = useState(null);
  const [returnVehicleForm, setReturnVehicleForm] = useState({
    stand_location: '',
    battery_level: '85',
    remarks: 'Vehicle returned by rider'
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Create Advance Booking Modal
  const [createBookingModalOpen, setCreateBookingModalOpen] = useState(false);
  const [createBookingForm, setCreateBookingForm] = useState({
    user_id: '',
    name: '',
    phone: '',
    email: '',
    kyc_status: 'verified',
    plan_id: '',
    booking_type: 'pre_booking',
    pre_booking_date: getLocalDatetimeString(),
    remarks: ''
  });
  const [createBookingPaymentRows, setCreateBookingPaymentRows] = useState([
    { mode: 'cash', amount: '1500', remarks: '' }
  ]);
  const [submittingCreateBooking, setSubmittingCreateBooking] = useState(false);

  // Fetch all operations data
  const fetchOperationsData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehRes, standsRes, bkgRes, usrRes, plnRes, mntRes, catSvcRes, catPrtRes] = await Promise.all([
        axios.get('/api/vehicles', authHeaders),
        axios.get('/api/stands', authHeaders),
        axios.get('/api/bookings/all', authHeaders),
        axios.get('/api/users', authHeaders),
        axios.get('/api/plans', authHeaders),
        axios.get('/api/maintenance', authHeaders),
        axios.get('/api/catalog/services', authHeaders).catch(() => ({ data: [] })),
        axios.get('/api/catalog/parts', authHeaders).catch(() => ({ data: [] }))
      ]);

      setVehicles(vehRes.data || []);
      setStands(standsRes.data || []);
      setBookings(bkgRes.data || []);
      setUsers(usrRes.data || []);
      setPlans(plnRes.data || []);
      setMaintenanceLogs(mntRes.data || []);
      setCatalogServices(catSvcRes.data || []);
      setCatalogParts(catPrtRes.data || []);

      if (usrRes.data?.length > 0) {
        setCreateBookingForm(prev => prev.user_id ? prev : ({ ...prev, user_id: String(usrRes.data[0].id) }));
      }
      if (plnRes.data?.length > 0) {
        setCreateBookingForm(prev => prev.plan_id ? prev : ({ ...prev, plan_id: String(plnRes.data[0].id) }));
      }
    } catch (err) {
      console.error('Error loading operations data:', err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchOperationsData();
  }, [fetchOperationsData]);

  // Available and Rented Vehicles (Robust status normalization)
  const availableVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const s = (v.status || 'available').toLowerCase().trim();
      const isRented = Boolean(v.renter) || s === 'rented' || s === 'in_use';
      const isMaintenance = s === 'maintenance';
      return !isRented && !isMaintenance;
    });
  }, [vehicles]);

  const rentedVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const s = (v.status || '').toLowerCase().trim();
      return Boolean(v.renter) || s === 'rented' || s === 'in_use';
    });
  }, [vehicles]);

  const assignedVehicles = rentedVehicles;

  // Helper: Source of truth vehicle code (preserves prefixes like TT001, LT025, EV01, etc.)
  const getVehicleCode = useCallback((v) => {
    if (!v) return '';
    if (typeof v === 'string') {
      const found = vehicles.find(item => item.id === v || item.model === v || item.registration_number === v);
      if (found) return getVehicleCode(found);
      const str = v.trim();
      // If pure legacy 1-3 digits like '001', format to LT001
      if (/^\d{1,3}$/.test(str)) {
        const num = parseInt(str, 10);
        return `LT${String(num).padStart(3, '0')}`;
      }
      return str.toUpperCase();
    }

    // If v is a vehicle object
    if (v.model && v.model.trim()) {
      return v.model.trim().toUpperCase();
    }
    if (v.id && String(v.id).trim()) {
      const idStr = String(v.id).trim();
      if (/^\d{1,3}$/.test(idStr)) {
        const num = parseInt(idStr, 10);
        return `LT${String(num).padStart(3, '0')}`;
      }
      return idStr.toUpperCase();
    }
    if (v.registration_number && v.registration_number.trim()) {
      return v.registration_number.trim().toUpperCase();
    }
    return '';
  }, [vehicles]);

  // Matching vehicles for Single Searchable Select Box (Strictly by LT code or Driver details)
  const matchingSearchVehicles = useMemo(() => {
    if (!vehicleSearchQuery || !vehicleSearchQuery.trim()) return vehicles.slice(0, 8);
    const q = vehicleSearchQuery.toLowerCase().trim();
    const rawDigits = q.replace(/\D/g, ''); // e.g. "005" or "5" -> "5"

    return vehicles.filter(v => {
      const code = getVehicleCode(v).toLowerCase(); // e.g. "lt005"
      const renterStr = (v.renter || '').toLowerCase();
      const phoneStr = (v.renter_phone || '');

      if (code.includes(q) || renterStr.includes(q) || phoneStr.includes(q)) {
        return true;
      }
      // If user typed numeric search like "5" or "005" or "05", match against LT005
      if (rawDigits && code.includes(rawDigits)) {
        return true;
      }
      return false;
    }).slice(0, 8);
  }, [vehicles, vehicleSearchQuery, getVehicleCode]);

  // Filtered vehicles for Service tab
  const filteredServiceVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const isAssigned = v.status === 'rented' || v.status === 'in_use' || Boolean(v.renter);
      if (serviceVehicleFilter === 'assigned' && !isAssigned) return false;
      if (serviceVehicleFilter === 'maintenance' && v.status !== 'maintenance') return false;

      if (!serviceVehicleSearch) return true;
      const q = serviceVehicleSearch.toLowerCase().trim();
      const code = getVehicleCode(v).toLowerCase();
      return (
        code.includes(q) ||
        (v.renter || '').toLowerCase().includes(q) ||
        (v.renter_phone || '').includes(q) ||
        (v.location || '').toLowerCase().includes(q)
      );
    });
  }, [vehicles, serviceVehicleFilter, serviceVehicleSearch, getVehicleCode]);

  // Handle vehicle selection for Service Billing
  const handleSelectServiceVehicle = (veh) => {
    const code = getVehicleCode(veh);
    setSelectedServiceVehicle(veh);
    setServiceSearchPlate(code);
    setVehicleSearchQuery(`${code} ${veh.renter ? `• ${veh.renter}` : ''} ${veh.renter_phone ? `(${veh.renter_phone})` : ''}`);
    setVehicleDropdownOpen(false);
    setServiceForm(prev => ({
      ...prev,
      vehicle_id: code,
      billed_to: veh.renter ? 'rider' : 'company'
    }));
  };

  const handleServicePlateInputChange = (val) => {
    setServiceSearchPlate(val);
    setVehicleSearchQuery(val);
    const valClean = val.trim().toLowerCase();
    const matched = vehicles.find(v => {
      const code = getVehicleCode(v).toLowerCase();
      return code === valClean || String(v.id).toLowerCase() === valClean || (v.model && v.model.toLowerCase() === valClean);
    });
    if (matched) {
      const code = getVehicleCode(matched);
      setSelectedServiceVehicle(matched);
      setServiceForm(prev => ({
        ...prev,
        vehicle_id: code,
        billed_to: matched.renter ? 'rider' : 'company'
      }));
    } else {
      setSelectedServiceVehicle(null);
      setServiceForm(prev => ({ ...prev, vehicle_id: val.trim().toUpperCase() }));
    }
  };

  // Recalculate bill cost based on catalog pricing & selected parts
  const recalculateServiceCost = (serviceName, currentSelectedParts) => {
    const sObj = catalogServices.find(s => s.name === serviceName);
    const servicePrice = sObj ? parseFloat(sObj.price || 0) : 0;
    const partsPrice = currentSelectedParts.reduce((sum, p) => sum + parseFloat(p.mrp || p.price || 0), 0);
    const totalCost = servicePrice + partsPrice;

    setServiceForm(prev => ({
      ...prev,
      service_type: serviceName,
      parts_replaced: currentSelectedParts.map(p => `${p.name} (₹${parseFloat(p.mrp || p.price || 0)})`).join(', '),
      cost: totalCost > 0 ? String(totalCost) : prev.cost
    }));
  };

  const handleServiceTypeChange = (val) => {
    recalculateServiceCost(val, selectedParts);
  };

  const togglePartSelection = (part) => {
    let updated = [];
    if (selectedParts.some(p => p.id === part.id)) {
      updated = selectedParts.filter(p => p.id !== part.id);
    } else {
      updated = [...selectedParts, part];
    }
    setSelectedParts(updated);
    recalculateServiceCost(serviceForm.service_type, updated);
  };

  // Open Official Service & Parts Invoice
  const handleOpenServiceInvoice = (log) => {
    const vCode = getVehicleCode(log.vehicle_id);
    const vObj = vehicles.find(v => getVehicleCode(v) === vCode || String(v.id) === String(log.vehicle_id));
    const riderName = log.user_name || (vObj && vObj.renter) || 'Company Fleet Maintenance';
    const riderPhone = log.user_phone || (vObj && vObj.renter_phone) || '';

    handleOpenInvoiceWindow({
      id: log.id,
      user_name: riderName,
      user_phone: riderPhone,
      vehicle_id: vCode,
      service_type: log.service_type || 'General Periodic Service & Tuning',
      billed_to: log.billed_to || 'company',
      payment_status: log.payment_status || 'paid',
      cost: log.cost || 0,
      date_reported: log.date_reported || log.created_at || new Date().toISOString(),
      issue_description: log.issue_description || '',
      parts_replaced: log.parts_replaced || ''
    }, 'service_parts');
  };

  // Submit Service Record
  const handleSubmitServiceBilling = async (e) => {
    e.preventDefault();
    if (!serviceForm.vehicle_id || !serviceForm.issue_description) {
      alert('Please enter vehicle number and service description.');
      return;
    }

    setSubmittingService(true);
    try {
      let linkedUserId = null;
      if (selectedServiceVehicle?.renter) {
        const foundUser = users.find(u => u.name === selectedServiceVehicle.renter);
        if (foundUser) linkedUserId = foundUser.id;
      }

      const res = await axios.post('/api/maintenance', {
        ...serviceForm,
        user_id: linkedUserId
      }, authHeaders);

      const createdLog = res.data?.log || {
        id: Date.now(),
        vehicle_id: serviceForm.vehicle_id,
        service_type: serviceForm.service_type,
        issue_description: serviceForm.issue_description,
        parts_replaced: serviceForm.parts_replaced,
        cost: serviceForm.cost,
        billed_to: serviceForm.billed_to,
        payment_status: serviceForm.payment_status,
        date_reported: new Date().toISOString()
      };

      // Automatically open downloadable & printable service invoice
      handleOpenServiceInvoice(createdLog);

      alert(`Service billing logged for EV ${serviceForm.vehicle_id}!\nStatus: ${serviceForm.status === 'in_progress' ? 'Under Service (Vehicle marked Maintenance)' : 'Completed (Ready)'}`);

      // Reset form
      setServiceForm({
        vehicle_id: '',
        service_type: 'General Periodic Service & Tuning',
        issue_description: '',
        parts_replaced: '',
        cost: '',
        status: 'in_progress',
        billed_to: 'company',
        payment_status: 'paid'
      });
      setSelectedParts([]);
      setSelectedServiceVehicle(null);
      setServiceSearchPlate('');
      fetchOperationsData();
    } catch (err) {
      alert('Failed to log service: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingService(false);
    }
  };

  // Mark existing service ticket as completed
  const handleMarkServiceCompleted = async (logId, vehicleId) => {
    if (!window.confirm(`Mark service on EV ${vehicleId} as completed? This will set the vehicle back to Available.`)) return;
    try {
      await axios.put(`/api/maintenance/${logId}`, {
        status: 'completed',
        vehicle_id: vehicleId
      }, authHeaders);
      
      // Update vehicle to available if not currently rented
      await axios.put(`/api/vehicles/${vehicleId}`, {
        status: 'available'
      }, authHeaders);

      fetchOperationsData();
    } catch (err) {
      alert('Failed to update service: ' + (err.response?.data?.error || err.message));
    }
  };

  // -------------------------------------------------------------
  // TAB 2: RENT & PAYMENTS CALCULATIONS
  // -------------------------------------------------------------
  const activeRentalsList = useMemo(() => {
    return bookings.filter(b => {
      return b.status === 'active' || (b.vehicle_id && b.status !== 'completed' && b.status !== 'cancelled');
    }).map(b => {
      const paid = parseFloat(b.total_cost || b.collected_amount || 0);
      const planPrice = parseFloat(b.plan_price || 1600);
      const planType = (b.plan_type || '').toLowerCase();
      const isMonthly = planType.includes('monthly');
      const cycleDays = isMonthly ? 30 : 7;

      const now = new Date();
      let isOverdue = false;
      let daysOverdue = 0;
      let daysRemaining = cycleDays;
      let calculatedDue = 0;

      if (b.next_payment_date) {
        const nextDue = new Date(b.next_payment_date);
        const diffMs = nextDue.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        if (diffDays <= 0) {
          isOverdue = true;
          daysOverdue = Math.abs(diffDays);
          const cyclesLate = Math.max(1, Math.ceil(daysOverdue / cycleDays));
          calculatedDue = cyclesLate * planPrice;
        } else {
          daysRemaining = diffDays;
        }
      } else {
        const start = new Date(b.start_time || b.pre_booking_date || now);
        const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        if (daysElapsed > cycleDays) {
          isOverdue = true;
          daysOverdue = daysElapsed - cycleDays;
          calculatedDue = planPrice;
        }
      }

      return {
        ...b,
        isRentOverdue: isOverdue,
        rentDaysOverdue: daysOverdue,
        rentDaysRemaining: daysRemaining,
        currentRentDue: calculatedDue > 0 ? calculatedDue : (isOverdue ? planPrice : 0),
        planRate: planPrice,
        isMonthlyPlan: isMonthly
      };
    });
  }, [bookings]);

  const filteredRentals = useMemo(() => {
    return activeRentalsList.filter(r => {
      const q = searchQuery.toLowerCase().trim();
      const matches = !q || (
        (r.user_name || '').toLowerCase().includes(q) ||
        (r.user_phone || '').includes(q) ||
        (r.vehicle_id || '').toLowerCase().includes(q)
      );
      if (!matches) return false;

      if (rentFilter === 'weekly') return !r.isMonthlyPlan;
      if (rentFilter === 'monthly') return r.isMonthlyPlan;
      if (rentFilter === 'overdue') return r.isRentOverdue;
      if (rentFilter === 'due_soon') return !r.isRentOverdue && r.rentDaysRemaining <= 2;

      return true;
    });
  }, [activeRentalsList, searchQuery, rentFilter]);

  const overdueRentals = activeRentalsList.filter(r => r.isRentOverdue);
  const totalRentDues = overdueRentals.reduce((sum, r) => sum + (r.currentRentDue || 1600), 0);

  // Open Rent Payment Modal
  const handleOpenRentPaymentModal = (rental) => {
    setSelectedRentalForPayment(rental);
    const standardRate = String(rental.planRate || 1600);
    setRentPaymentForm({
      amount: standardRate,
      cycle_count: '1',
      payment_mode: 'cash',
      remarks: '',
      utr_ref: ''
    });
    setRentPaymentModalOpen(true);
  };

  const handleSubmitRentPayment = async (e) => {
    e.preventDefault();
    if (!selectedRentalForPayment) return;

    const totalPaidAmt = rentPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    if (totalPaidAmt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setSubmittingRentPayment(true);
    try {
      const breakdownStr = rentPaymentRows.map(r => {
        const modeLabel = r.mode === 'cash' ? 'Cash' : r.mode === 'upi' ? 'UPI' : r.mode === 'credit' ? 'Credit' : 'Deposit';
        const rem = r.remarks ? ` (${r.remarks})` : '';
        return `${modeLabel}: ₹${r.amount || 0}${rem}`;
      }).join(' + ');

      const combinedRemarks = [rentPaymentForm.remarks, breakdownStr].filter(Boolean).join(' | ');
      const primaryMode = rentPaymentRows.length === 1 ? rentPaymentRows[0].mode : 'mixed';

      const isOnlyDeposit = rentPaymentRows.length === 1 && rentPaymentRows[0].mode === 'deposit';
      if (isOnlyDeposit) {
        const depositBal = parseFloat(selectedRentalForPayment.security_deposit_balance || 0);
        if (depositBal < totalPaidAmt) {
          alert(`Insufficient security deposit (Available: ₹${depositBal}, Required: ₹${totalPaidAmt}).`);
          setSubmittingRentPayment(false);
          return;
        }

        const res = await axios.post(
          `/api/bookings/${selectedRentalForPayment.id}/deduct-deposit`,
          {
            amount: totalPaidAmt,
            remarks: combinedRemarks
          },
          authHeaders
        );

        setPaymentSuccessReceipt({
          riderName: selectedRentalForPayment.user_name,
          phone: selectedRentalForPayment.user_phone,
          vehicleId: getVehicleCode(selectedRentalForPayment.vehicle_id),
          amount: totalPaidAmt,
          mode: 'Deposit Deduction',
          nextDueDate: res.data.newNextDue || new Date(Date.now() + 7 * 86400000).toISOString(),
          bookingId: selectedRentalForPayment.id
        });
        setRentPaymentModalOpen(false);
      } else {
        const res = await axios.post(
          `/api/bookings/${selectedRentalForPayment.id}/collect-payment`,
          {
            amount: totalPaidAmt,
            payment_mode: primaryMode,
            weeks_count: rentPaymentForm.cycle_count,
            remarks: combinedRemarks
          },
          authHeaders
        );

        setPaymentSuccessReceipt({
          riderName: selectedRentalForPayment.user_name,
          phone: selectedRentalForPayment.user_phone,
          vehicleId: getVehicleCode(selectedRentalForPayment.vehicle_id),
          amount: totalPaidAmt,
          mode: breakdownStr,
          nextDueDate: res.data.newNextDue || new Date(Date.now() + 7 * 86400000).toISOString(),
          bookingId: selectedRentalForPayment.id
        });
        setRentPaymentModalOpen(false);
      }

      fetchOperationsData();
    } catch (err) {
      alert('Failed to record payment: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingRentPayment(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: ADVANCE BOOKINGS & SLOT ALLOCATION
  // -------------------------------------------------------------
  const advanceBookingsQueue = useMemo(() => {
    return bookings.filter(b => b.status === 'pre_booking' || !b.vehicle_id);
  }, [bookings]);

  const waitingBookingsCount = useMemo(() => {
    return advanceBookingsQueue.length;
  }, [advanceBookingsQueue]);

  const assignedBookingsCount = useMemo(() => {
    return bookings.filter(b => b.vehicle_id && b.status !== 'pre_booking').length;
  }, [bookings]);

  const filteredAdvanceBookings = useMemo(() => {
    return bookings.filter(b => {
      const isAssigned = Boolean(b.vehicle_id && b.status !== 'pre_booking');
      const isWaiting = b.status === 'pre_booking' || !b.vehicle_id;

      if (bookingFilter === 'waiting' && !isWaiting) return false;
      if (bookingFilter === 'assigned' && !isAssigned) return false;

      const q = searchQuery.toLowerCase().trim();
      const matches = !q || (
        (b.user_name || '').toLowerCase().includes(q) ||
        (b.user_phone || '').includes(q) ||
        (b.id || '').toLowerCase().includes(q) ||
        (b.vehicle_id || '').toLowerCase().includes(q)
      );
      return matches;
    });
  }, [bookings, searchQuery, bookingFilter]);

  // Open Vehicle Handover Receipt (RNT)
  const handleOpenHandoverReceipt = (bkgOrRental) => {
    const vCode = getVehicleCode(bkgOrRental.vehicle_id);
    const vObj = vehicles.find(v => getVehicleCode(v) === vCode || String(v.id) === String(bkgOrRental.vehicle_id));
    const paid = parseFloat(bkgOrRental.total_cost || bkgOrRental.collected_amount || 0);
    const advPaid = bkgOrRental.advance_paid !== null && bkgOrRental.advance_paid !== undefined ? parseFloat(bkgOrRental.advance_paid) : (paid <= 2500 ? paid : 1500);
    const hndCollected = bkgOrRental.handover_amount !== null && bkgOrRental.handover_amount !== undefined ? parseFloat(bkgOrRental.handover_amount) : Math.max(0, paid - advPaid);

    handleOpenInvoiceWindow({
      ...bkgOrRental,
      id: bkgOrRental.id,
      user_name: bkgOrRental.user_name || (vObj && vObj.renter) || 'Rider',
      user_phone: bkgOrRental.user_phone || (vObj && vObj.renter_phone) || '',
      vehicle_id: vCode,
      vehicle_name: vCode,
      vehicle_model: (vObj && vObj.model) || bkgOrRental.vehicle_model || 'LT Commercial EV',
      location: (vObj && vObj.location) || bkgOrRental.location || 'Khajpura Stand',
      total_cost: paid || 5100,
      advance_paid: advPaid,
      handover_amount: hndCollected,
      advance_payment_mode: bkgOrRental.advance_payment_mode || (bkgOrRental.status === 'pre_booking' ? bkgOrRental.payment_mode : 'cash'),
      handover_payment_mode: bkgOrRental.handover_payment_mode || bkgOrRental.payment_mode || 'cash',
      advance_remarks: bkgOrRental.advance_remarks || '',
      handover_remarks: bkgOrRental.handover_remarks || '',
      pre_booking_date: bkgOrRental.pre_booking_date,
      assignment_date: bkgOrRental.assignment_date || bkgOrRental.start_time || new Date().toISOString(),
      advance_booking_id: bkgOrRental.advance_booking_id || bkgOrRental.id,
      handover_id: bkgOrRental.handover_id || (`HND-${(bkgOrRental.id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`)
    }, 'booking_confirm');
  };

  // Open Advance Booking Receipt (BKG)
  const handleOpenAdvanceReceipt = (bkg) => {
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
  };

  // Open Assign Slot Modal
  const handleOpenAssignSlotModal = (booking) => {
    setSelectedBookingForSlot(booking);
    setAssignSlotStep(1);
    setAssignSlotEvSearch('');
    setAssignSlotOnlyUnassigned(true);
    setShowMoreSlotOptions(false);
    const paid = parseFloat(booking.total_cost || booking.collected_amount || 0);
    const due = Math.max(0, 5100 - paid);

    setAssignSlotForm({
      vehicle_id: availableVehicles[0]?.id || '',
      remarks: 'Handover balance collected',
      assignment_date: getLocalDatetimeString()
    });
    setAssignSlotPaymentRows([
      { mode: 'cash', amount: String(due), remarks: '' }
    ]);
    setAssignSlotModalOpen(true);

    // Refresh live vehicles list immediately
    if (token) {
      axios.get('/api/vehicles', authHeaders)
        .then(res => { if (res.data) setVehicles(res.data); })
        .catch(err => console.error('Error refreshing vehicles on slot modal open:', err));
    }
  };

  const handleSubmitAssignSlot = async (e) => {
    e.preventDefault();
    if (!selectedBookingForSlot || !assignSlotForm.vehicle_id) {
      alert('Please select an available vehicle.');
      return;
    }

    setSubmittingAssignSlot(true);
    try {
      const prevPaid = parseFloat(selectedBookingForSlot.advance_paid !== null && selectedBookingForSlot.advance_paid !== undefined ? selectedBookingForSlot.advance_paid : (selectedBookingForSlot.collected_amount || selectedBookingForSlot.total_cost || 0));
      const addedPaid = assignSlotPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const totalPaidNow = prevPaid + addedPaid;

      const breakdownStr = assignSlotPaymentRows.map(r => {
        const modeLabel = r.mode === 'cash' ? 'Cash' : r.mode === 'upi' ? 'UPI' : r.mode === 'credit' ? 'Credit' : 'Deposit';
        const rem = r.remarks ? ` (${r.remarks})` : '';
        return `${modeLabel}: ₹${r.amount || 0}${rem}`;
      }).join(' + ');

      const combinedRemarks = [assignSlotForm.remarks, breakdownStr].filter(Boolean).join(' | ');
      const primaryMode = assignSlotPaymentRows.length === 1 ? assignSlotPaymentRows[0].mode : 'mixed';

      await axios.put(
        `/api/bookings/${selectedBookingForSlot.id}`,
        {
          vehicle_id: assignSlotForm.vehicle_id,
          status: 'active',
          collected_amount: totalPaidNow,
          advance_paid: prevPaid,
          handover_amount: addedPaid,
          advance_payment_mode: selectedBookingForSlot.advance_payment_mode || selectedBookingForSlot.payment_mode || 'cash',
          handover_payment_mode: primaryMode,
          advance_remarks: selectedBookingForSlot.advance_remarks || selectedBookingForSlot.remarks || '',
          handover_remarks: combinedRemarks,
          payment_mode: primaryMode,
          remarks: combinedRemarks || selectedBookingForSlot.remarks,
          start_time: assignSlotForm.assignment_date,
          assignment_date: assignSlotForm.assignment_date,
          pre_booking_date: selectedBookingForSlot.pre_booking_date,
          deposit_amount: Math.min(3500, totalPaidNow),
          cycle_amount: Math.max(0, totalPaidNow - Math.min(3500, totalPaidNow))
        },
        authHeaders
      );

      const selectedVeh = vehicles.find(v => v.id === assignSlotForm.vehicle_id);
      const updatedBooking = {
        ...selectedBookingForSlot,
        vehicle_id: getVehicleCode(assignSlotForm.vehicle_id),
        vehicle_name: getVehicleCode(assignSlotForm.vehicle_id),
        vehicle_model: selectedVeh?.model || selectedBookingForSlot.vehicle_model || 'LT Commercial EV',
        status: 'active',
        total_cost: totalPaidNow,
        collected_amount: totalPaidNow,
        advance_paid: prevPaid,
        handover_amount: addedPaid,
        advance_payment_mode: selectedBookingForSlot.advance_payment_mode || selectedBookingForSlot.payment_mode || 'cash',
        handover_payment_mode: primaryMode,
        advance_remarks: selectedBookingForSlot.advance_remarks || selectedBookingForSlot.remarks || '',
        handover_remarks: combinedRemarks,
        location: selectedVeh?.location || 'Khajpura Stand',
        payment_mode: primaryMode,
        remarks: combinedRemarks || selectedBookingForSlot.remarks,
        start_time: assignSlotForm.assignment_date,
        assignment_date: assignSlotForm.assignment_date,
        pre_booking_date: selectedBookingForSlot.pre_booking_date || selectedBookingForSlot.created_at,
        advance_booking_id: selectedBookingForSlot.id,
        handover_id: selectedBookingForSlot.handover_id || (`HND-${(selectedBookingForSlot.id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`)
      };

      setAssignSlotModalOpen(false);
      fetchOperationsData();

      // Automatically download & view official handover receipt
      handleOpenInvoiceWindow(updatedBooking, 'booking_confirm');
    } catch (err) {
      alert('Failed to assign vehicle: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingAssignSlot(false);
    }
  };

  // Open Return Vehicle Modal (Frees up slot)
  const handleOpenReturnVehicleModal = (veh) => {
    setSelectedVehicleToReturn(veh);
    setReturnVehicleForm({
      stand_location: veh.location || stands[0]?.name || 'Rukanpura Stand',
      battery_level: '85',
      remarks: 'Vehicle returned by rider'
    });
    setReturnVehicleModalOpen(true);
  };

  const handleSubmitReturnVehicle = async (e) => {
    e.preventDefault();
    if (!selectedVehicleToReturn) return;

    setSubmittingReturn(true);
    try {
      // Unassign rider and complete rental
      await axios.post(`/api/vehicles/${selectedVehicleToReturn.id}/unassign-rider`, {}, authHeaders);
      
      if (returnVehicleForm.stand_location) {
        await axios.put(`/api/vehicles/${selectedVehicleToReturn.id}`, {
          location: returnVehicleForm.stand_location,
          status: 'available'
        }, authHeaders);
      }

      alert(`Vehicle ${selectedVehicleToReturn.id} returned to stand!\nSlot is now FREE and ready to assign to waiting advance bookings.`);
      setReturnVehicleModalOpen(false);
      fetchOperationsData();
    } catch (err) {
      alert('Failed to return vehicle: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Open Create Advance Booking Modal (starts fresh with no user selected)
  const handleOpenCreateBookingModal = () => {
    const defaultPlanId = plans.length > 0 ? String(plans[0].id) : '';
    setCreateBookingForm({
      user_id: '',
      name: '',
      phone: '',
      email: '',
      kyc_status: 'verified',
      plan_id: defaultPlanId,
      booking_type: 'pre_booking',
      pre_booking_date: getLocalDatetimeString(),
      remarks: ''
    });
    setCreateBookingPaymentRows([
      { mode: 'cash', amount: '1500', remarks: '' }
    ]);
    setCreateBookingModalOpen(true);
  };

  // Create Advance Booking
  const handleCreateAdvanceBookingSubmit = async (e) => {
    e.preventDefault();
    if ((!createBookingForm.user_id && (!createBookingForm.name || !createBookingForm.phone)) || !createBookingForm.plan_id) {
      alert('Please enter rider Full Name, Mobile Number and select a Subscription Plan.');
      return;
    }
    setSubmittingCreateBooking(true);
    try {
      const totalPaid = createBookingPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const breakdownStr = createBookingPaymentRows.map(r => {
        const modeLabel = r.mode === 'cash' ? 'Cash' : r.mode === 'upi' ? 'UPI' : r.mode === 'credit' ? 'Credit' : 'Deposit';
        const rem = r.remarks ? ` (${r.remarks})` : '';
        return `${modeLabel}: ₹${r.amount || 0}${rem}`;
      }).join(' + ');

      const primaryMode = createBookingPaymentRows.length === 1 ? createBookingPaymentRows[0].mode : 'mixed';
      const combinedRemarks = [createBookingForm.remarks, breakdownStr].filter(Boolean).join(' | ');

      const res = await axios.post('/api/bookings/create', {
        ...createBookingForm,
        user_name: createBookingForm.name,
        user_phone: createBookingForm.phone,
        collected_amount: String(totalPaid),
        deposit_amount: Math.min(3500, totalPaid),
        cycle_amount: Math.max(0, totalPaid - Math.min(3500, totalPaid)),
        payment_mode: primaryMode,
        remarks: combinedRemarks
      }, authHeaders);

      const createdBooking = res.data.booking || {
        id: `ADV-${Date.now().toString().slice(-4)}`,
        user_name: createBookingForm.name,
        user_phone: createBookingForm.phone,
        total_cost: totalPaid,
        collected_amount: totalPaid,
        pre_booking_date: createBookingForm.pre_booking_date,
        payment_mode: primaryMode,
        remarks: combinedRemarks
      };

      setCreateBookingModalOpen(false);
      fetchOperationsData();

      // Automatically open downloadable & printable receipt
      handleOpenInvoiceWindow({
        ...createdBooking,
        user_name: createBookingForm.name || createdBooking.user_name,
        user_phone: createBookingForm.phone || createdBooking.user_phone,
        total_cost: totalPaid,
        collected_amount: totalPaid,
        payment_mode: primaryMode,
        remarks: combinedRemarks,
        pre_booking_date: createBookingForm.pre_booking_date
      });
    } catch (err) {
      alert('Error creating booking: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmittingCreateBooking(false);
    }
  };

  const renderPaymentRowsBuilder = (rows, setRows, targetTotal = null) => {
    const totalEntered = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
    const hasUpi = rows.some(r => r.mode === 'upi');
    const totalUpiAmount = rows.filter(r => r.mode === 'upi').reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

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

        {/* Quick Add Bar for Adding Payment Methods Multiple Times */}
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

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  return (
    <div>
      {/* ============================================================ */}
      {/* 3 QUICK MAIN ACTION TABS */}
      {/* ============================================================ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' }}>
        <div style={{ display: 'flex', flex: 1, background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          
          {/* Tab 1: Service Billing */}
          <button
            onClick={() => handleTabSwitch('service')}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              borderBottom: activeTab === 'service' ? '3px solid #0284c7' : '3px solid transparent',
              background: activeTab === 'service' ? '#f0f9ff' : 'white',
              color: activeTab === 'service' ? '#0369a1' : '#475569',
              fontWeight: activeTab === 'service' ? '700' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Wrench size={16} color={activeTab === 'service' ? '#0284c7' : '#64748b'} />
            <span>1. Service Billing</span>
            <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
              {maintenanceLogs.filter(m => m.status === 'in_progress').length} In Service
            </span>
          </button>

          {/* Tab 2: Rent & Payments */}
          <button
            onClick={() => handleTabSwitch('rent')}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              borderLeft: '1px solid #e2e8f0',
              borderRight: '1px solid #e2e8f0',
              borderBottom: activeTab === 'rent' ? '3px solid #0284c7' : '3px solid transparent',
              background: activeTab === 'rent' ? '#f0f9ff' : 'white',
              color: activeTab === 'rent' ? '#0369a1' : '#475569',
              fontWeight: activeTab === 'rent' ? '700' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <DollarSign size={16} color={activeTab === 'rent' ? '#0284c7' : '#64748b'} />
            <span>2. Rent & Payments</span>
            {overdueRentals.length > 0 && (
              <span style={{ fontSize: '11px', background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                {overdueRentals.length} Due
              </span>
            )}
          </button>

          {/* Tab 3: Advance Bookings & Allocations */}
          <button
            onClick={() => handleTabSwitch('advance-bookings')}
            style={{
              flex: 1,
              padding: '14px 20px',
              border: 'none',
              borderBottom: activeTab === 'advance-bookings' ? '3px solid #0284c7' : '3px solid transparent',
              background: activeTab === 'advance-bookings' ? '#f0f9ff' : 'white',
              color: activeTab === 'advance-bookings' ? '#0369a1' : '#475569',
              fontWeight: activeTab === 'advance-bookings' ? '700' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Calendar size={16} color={activeTab === 'advance-bookings' ? '#0284c7' : '#64748b'} />
            <span>3. Advance Bookings & Slots</span>
            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
              {advanceBookingsQueue.length} Queued
            </span>
          </button>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchOperationsData}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '14px 16px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#475569',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <RefreshCw size={14} />
          <span>{loading ? 'Refreshing...' : 'Sync Fleet'}</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1 CONTENT: SERVICE BILLING */}
      {/* ============================================================ */}
      {activeTab === 'service' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          
          {/* Two-column layout: Form Left + Pricing Panel Right */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>

          {/* LEFT: Service & Billing Entry Form */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>
                  Service Billing & Time Estimation
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                  Search any vehicle number (e.g. LT001, LT005) or driver name to load rider details and generate bill.
                </p>
              </div>
              {selectedServiceVehicle && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedServiceVehicle(null);
                    setServiceSearchPlate('');
                    setServiceForm(prev => ({ ...prev, vehicle_id: '', billed_to: 'company' }));
                  }}
                  style={{
                    background: 'none',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Selected Vehicle & Driver Summary Banner */}
            {selectedServiceVehicle ? (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: '#0369a1' }}>{getVehicleCode(selectedServiceVehicle)}</span>
                    <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0284c7', padding: '1px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      EV Scooter
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: selectedServiceVehicle.status === 'maintenance' ? '#fef3c7' : '#dcfce7',
                    color: selectedServiceVehicle.status === 'maintenance' ? '#b45309' : '#16a34a'
                  }}>
                    {selectedServiceVehicle.status === 'maintenance' ? 'In Service' : 'On Road'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#334155', background: 'white', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e0f2fe' }}>
                  <div>Driver / Rider: <strong style={{ color: '#0f172a' }}>{selectedServiceVehicle.renter || 'Fleet (Unassigned)'}</strong></div>
                  <div>Driver Mobile: <strong style={{ color: '#0f172a' }}>{selectedServiceVehicle.renter_phone || 'N/A'}</strong></div>
                  <div>Station Location: <strong>{selectedServiceVehicle.location || 'Rukanpura Stand'}</strong></div>
                  <div>Vehicle Number: <strong>{getVehicleCode(selectedServiceVehicle)}</strong></div>
                </div>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                🔍 Type vehicle number (e.g. LT001, LT005) or driver name to load rider details.
              </div>
            )}

            <form onSubmit={handleSubmitServiceBilling}>
              
              {/* Single Searchable Vehicle Input with Dropdown */}
              <div style={{ position: 'relative', marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Search & Select Vehicle / Driver
                </label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Type vehicle number (e.g. LT001, LT005, Ajeet, 9128)..."
                    value={vehicleSearchQuery}
                    onFocus={() => setVehicleDropdownOpen(true)}
                    onChange={(e) => {
                      setVehicleSearchQuery(e.target.value);
                      handleServicePlateInputChange(e.target.value);
                      setVehicleDropdownOpen(true);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 30px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: '600',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                </div>

                {/* Floating Search Dropdown */}
                {vehicleDropdownOpen && matchingSearchVehicles.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    marginTop: '4px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 50,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}>
                    {matchingSearchVehicles.map(v => {
                      const vCode = getVehicleCode(v);
                      return (
                        <div
                          key={v.id}
                          onClick={() => handleSelectServiceVehicle(v)}
                          style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: selectedServiceVehicle?.id === v.id ? '#f0f9ff' : 'white'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '14px', color: '#0369a1' }}>
                              {vCode}
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                              Driver: <strong>{v.renter || 'Fleet (Unassigned)'}</strong> {v.renter_phone ? `• 📞 ${v.renter_phone}` : ''}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: v.renter ? '#dcfce7' : (v.status === 'maintenance' ? '#fef3c7' : '#f1f5f9'),
                            color: v.renter ? '#16a34a' : (v.status === 'maintenance' ? '#b45309' : '#475569')
                          }}>
                            {v.renter ? 'Assigned' : (v.status === 'maintenance' ? 'In Service' : 'Stand')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Service Type Dropdown from Catalog */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Service Type (From Catalog & Pricing)
                </label>
                <select
                  value={serviceForm.service_type}
                  onChange={(e) => handleServiceTypeChange(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  <option value="">Select Service Type</option>
                  {catalogServices.length > 0 ? (
                    catalogServices.map(s => (
                      <option key={s.id} value={s.name}>
                        {s.name} — ₹{parseFloat(s.price).toLocaleString('en-IN')}
                      </option>
                    ))
                  ) : (
                    SERVICE_PRESETS.map(preset => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))
                  )}
                </select>
              </div>

              {/* Spare Parts Replaced Multi-Select from Catalog */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Spare Parts Replaced (Auto-Calculates Bill)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '130px', overflowY: 'auto', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  {catalogParts.map(part => {
                    const isSelected = selectedParts.some(p => p.id === part.id);
                    const mrp = parseFloat(part.mrp || part.price || 0);
                    return (
                      <button
                        key={part.id}
                        type="button"
                        onClick={() => togglePartSelection(part)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                          background: isSelected ? '#f0f9ff' : 'white',
                          color: isSelected ? '#0369a1' : '#334155',
                          fontSize: '11px',
                          fontWeight: isSelected ? '700' : '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.15)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {part.image_url ? (
                          <img 
                            src={part.image_url.startsWith('http') || part.image_url.startsWith('/') ? part.image_url : `/${part.image_url}`} 
                            alt={part.name} 
                            style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                          />
                        ) : (
                          <span style={{ fontSize: '12px' }}>📦</span>
                        )}
                        <span>{isSelected ? '✓ ' : '+ '}{part.name}</span>
                        <span style={{ fontWeight: '700', color: isSelected ? '#0284c7' : '#059669', background: isSelected ? '#e0f2fe' : '#ecfdf5', padding: '1px 5px', borderRadius: '4px' }}>
                          ₹{mrp}
                        </span>
                        <span style={{ 
                          fontSize: '10px', 
                          color: part.stock_quantity <= 5 ? '#dc2626' : '#64748b', 
                          background: part.stock_quantity <= 5 ? '#fee2e2' : '#f1f5f9', 
                          padding: '1px 5px', 
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}>
                          {part.stock_quantity > 0 ? `${part.stock_quantity} left` : 'Out of stock'}
                        </span>
                      </button>
                    );
                  })}
                  {catalogParts.length === 0 && (
                    <div style={{ fontSize: '11px', color: '#64748b' }}>No spare parts in catalog.</div>
                  )}
                </div>
              </div>

              {/* Issue Description */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Work Details / Issue Description
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Replaced rear tyre tube and adjusted brake wire"
                  value={serviceForm.issue_description}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, issue_description: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  required
                />
              </div>

              {/* Cost & Billed To in Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Bill Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={serviceForm.cost}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, cost: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                    Billed To
                  </label>
                  <select
                    value={serviceForm.billed_to}
                    onChange={(e) => setServiceForm(prev => ({ ...prev, billed_to: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  >
                    <option value="company">Company (Fleet Expense)</option>
                    <option value="rider">Rider (Charge to Renter)</option>
                  </select>
                </div>
              </div>

              {/* Status Radio: In Progress vs Completed */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Service Status
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="serviceStatus"
                      checked={serviceForm.status === 'in_progress'}
                      onChange={() => setServiceForm(prev => ({ ...prev, status: 'in_progress' }))}
                    />
                    <span>In Progress (Marks EV as Maintenance)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="serviceStatus"
                      checked={serviceForm.status === 'completed'}
                      onChange={() => setServiceForm(prev => ({ ...prev, status: 'completed' }))}
                    />
                    <span>Completed (Ready)</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingService}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#0284c7',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {submittingService ? 'Saving...' : 'Save Service Bill & Update Vehicle'}
              </button>
            </form>
          </div>

          {/* RIGHT: Live Pricing Panel */}
          <div style={{ position: 'sticky', top: '20px' }}>
            {/* Summary Card */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '18px' }}>🧾</span>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'white', letterSpacing: '0.5px' }}>LIVE PRICE ESTIMATE</h3>
              </div>

              {/* Vehicle badge */}
              {selectedServiceVehicle ? (
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  marginBottom: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#7dd3fc' }}>{getVehicleCode(selectedServiceVehicle)}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{selectedServiceVehicle.renter || 'Fleet Vehicle'}</div>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px',
                    background: serviceForm.billed_to === 'rider' ? '#fbbf24' : '#34d399',
                    color: '#0f172a'
                  }}>
                    {serviceForm.billed_to === 'rider' ? 'RIDER BILLED' : 'COMPANY EXP.'}
                  </span>
                </div>
              ) : (
                <div style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  marginBottom: '14px',
                  fontSize: '12px',
                  color: '#64748b',
                  textAlign: 'center'
                }}>
                  Select a vehicle to begin
                </div>
              )}

              {/* Line items */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>

                {/* Service charge line */}
                {serviceForm.service_type && (() => {
                  const sObj = catalogServices.find(s => s.name === serviceForm.service_type);
                  const sPrice = sObj ? parseFloat(sObj.price || 0) : 0;
                  if (!sObj) return null;
                  return (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '500' }}>🔧 {serviceForm.service_type}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Service charge</div>
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#7dd3fc', whiteSpace: 'nowrap' }}>₹{sPrice.toLocaleString('en-IN')}</span>
                    </div>
                  );
                })()}

                {/* Parts line items */}
                {selectedParts.length > 0 && (
                  <>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '6px', marginTop: '4px' }}>PARTS REPLACED</div>
                    {selectedParts.map(part => {
                      const mrp = parseFloat(part.mrp || part.price || 0);
                      return (
                        <div key={part.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, paddingRight: '8px' }}>
                            {part.image_url ? (
                              <img src={part.image_url.startsWith('http') || part.image_url.startsWith('/') ? part.image_url : `/${part.image_url}`}
                                alt={part.name} style={{ width: '18px', height: '18px', borderRadius: '3px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                            ) : (
                              <span style={{ fontSize: '12px' }}>📦</span>
                            )}
                            <span style={{ fontSize: '11px', color: '#e2e8f0' }}>{part.name}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#34d399', whiteSpace: 'nowrap' }}>₹{mrp.toLocaleString('en-IN')}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Empty state */}
                {!serviceForm.service_type && selectedParts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '12px', color: '#475569' }}>
                    Select a service type or parts<br/>to see pricing
                  </div>
                )}
              </div>

              {/* Totals */}
              {(serviceForm.service_type || selectedParts.length > 0) && (() => {
                const sObj = catalogServices.find(s => s.name === serviceForm.service_type);
                const serviceCharge = sObj ? parseFloat(sObj.price || 0) : 0;
                const partsTotal = selectedParts.reduce((sum, p) => sum + parseFloat(p.mrp || p.price || 0), 0);
                const grandTotal = serviceCharge + partsTotal;

                return (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: '12px', paddingTop: '12px' }}>
                    {partsTotal > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Parts Subtotal</span>
                        <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600' }}>₹{partsTotal.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {serviceCharge > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Service Charge</span>
                        <span style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: '600' }}>₹{serviceCharge.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.15)' }}>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Grand Total</span>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: '#7dd3fc' }}>₹{grandTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Status Badge */}
            <div style={{
              background: serviceForm.status === 'in_progress' ? '#fef3c7' : '#dcfce7',
              border: `1px solid ${serviceForm.status === 'in_progress' ? '#fde68a' : '#bbf7d0'}`,
              borderRadius: '8px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: '600',
              color: serviceForm.status === 'in_progress' ? '#b45309' : '#15803d'
            }}>
              <span style={{ fontSize: '16px' }}>{serviceForm.status === 'in_progress' ? '🔧' : '✅'}</span>
              <div>
                <div>{serviceForm.status === 'in_progress' ? 'In Progress' : 'Completed'}</div>
                <div style={{ fontSize: '10px', fontWeight: '400', color: serviceForm.status === 'in_progress' ? '#92400e' : '#166534', marginTop: '2px' }}>
                  {serviceForm.status === 'in_progress' ? 'EV will be marked under maintenance' : 'EV will be marked ready'}
                </div>
              </div>
            </div>

            {/* Selected Parts Count Chip */}
            {selectedParts.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', width: '100%', marginBottom: '2px' }}>
                  {selectedParts.length} part{selectedParts.length > 1 ? 's' : ''} selected:
                </div>
                {selectedParts.map(p => (
                  <span key={p.id} style={{
                    fontSize: '11px', background: '#f0f9ff', color: '#0284c7',
                    border: '1px solid #bae6fd', borderRadius: '4px', padding: '2px 7px', fontWeight: '600'
                  }}>{p.name}</span>
                ))}
              </div>
            )}
          </div>

          </div>{/* end two-column grid */}

          {/* Bottom Table: Active / Recent Service Records */}
          <div style={{ gridColumn: '1 / -1', background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                Recent Service Records & Tickets
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Total: {maintenanceLogs.length}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
                  <th style={{ padding: '10px 16px' }}>Vehicle</th>
                  <th style={{ padding: '10px 16px' }}>Service Type</th>
                  <th style={{ padding: '10px 16px' }}>Cost</th>
                  <th style={{ padding: '10px 16px' }}>Billed To</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceLogs.slice(0, 10).map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontWeight: '800', color: '#0369a1' }}>
                      {getVehicleCode(log.vehicle_id)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div>{log.service_type || 'General Service'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{log.issue_description}</div>
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: '600' }}>
                      ₹{parseFloat(log.cost || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 16px', textTransform: 'capitalize' }}>
                      {log.billed_to}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {log.status === 'in_progress' ? (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          In Progress
                        </span>
                      ) : (
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          Completed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenServiceInvoice(log)}
                          style={{
                            background: '#f0f9ff',
                            color: '#0284c7',
                            border: '1px solid #bae6fd',
                            padding: '4px 9px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Download / Print Service Invoice"
                        >
                          <FileText size={12} />
                          <span>Invoice</span>
                        </button>
                        {log.status === 'in_progress' && (
                          <button
                            onClick={() => handleMarkServiceCompleted(log.id, log.vehicle_id)}
                            style={{ background: '#0f172a', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                          >
                            Mark Ready
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2 CONTENT: RENT & PAYMENTS (WEEKLY & MONTHLY) */}
      {/* ============================================================ */}
      {activeTab === 'rent' && (
        <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
          
          {/* Header & Sub-filters */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All Rentals (${activeRentalsList.length})` },
                { id: 'weekly', label: 'Weekly Plans' },
                { id: 'monthly', label: 'Monthly Plans' },
                { id: 'overdue', label: `Overdue Dues (${overdueRentals.length})` },
                { id: 'due_soon', label: 'Due Within 48h' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setRentFilter(f.id)}
                  style={{
                    background: rentFilter === f.id ? '#0f172a' : '#f8fafc',
                    color: rentFilter === f.id ? 'white' : '#475569',
                    border: '1px solid #e2e8f0',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search rider, phone, EV..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 10px 6px 30px',
                    fontSize: '12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Total Overdue: <strong style={{ color: '#dc2626' }}>₹{totalRentDues.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
                <th style={{ padding: '12px 16px' }}>Rider / Phone</th>
                <th style={{ padding: '12px 16px' }}>Assigned EV</th>
                <th style={{ padding: '12px 16px' }}>Plan Rate</th>
                <th style={{ padding: '12px 16px' }}>Next Due</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Deposit Bal</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRentals.map(rental => {
                const depositBal = parseFloat(rental.security_deposit_balance || 0);

                return (
                  <tr key={rental.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{rental.user_name || 'Rider'}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{rental.user_phone || 'No phone'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: '600', color: '#0284c7' }}>{rental.vehicle_id || 'Unassigned'}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: '600' }}>₹{rental.planRate.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{rental.isMonthlyPlan ? 'Monthly' : 'Weekly'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{rental.next_payment_date ? new Date(rental.next_payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Due'}</div>
                      <div style={{ fontSize: '11px', color: rental.isRentOverdue ? '#dc2626' : '#16a34a' }}>
                        {rental.isRentOverdue ? `${rental.rentDaysOverdue}d overdue` : `${rental.rentDaysRemaining}d left`}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {rental.isRentOverdue ? (
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          Due: ₹{rental.currentRentDue}
                        </span>
                      ) : (
                        <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                          Current
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      ₹{depositBal.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => handleOpenRentPaymentModal(rental)}
                          style={{
                            background: rental.isRentOverdue ? '#dc2626' : '#0284c7',
                            color: 'white',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Collect Rent
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3 CONTENT: ADVANCE BOOKINGS & SLOT ALLOCATION */}
      {/* ============================================================ */}
      {activeTab === 'advance-bookings' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
          
          {/* Column 1: Waiting Pre-Bookings Queue */}
          <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                  Advance Bookings & Handover Queue
                </h3>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {[
                    { id: 'waiting', label: `Waiting Queue (${waitingBookingsCount})` },
                    { id: 'assigned', label: `Handover Complete (${assignedBookingsCount})` },
                    { id: 'all', label: `All (${bookings.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setBookingFilter(tab.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: bookingFilter === tab.id ? '#0f172a' : '#f8fafc',
                        color: bookingFilter === tab.id ? 'white' : '#475569'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '180px' }}>
                  <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Search queue, phone, EV..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      padding: '5px 8px 5px 26px',
                      fontSize: '12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <button
                  onClick={handleOpenCreateBookingModal}
                  style={{ background: '#0284c7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  + New Booking
                </button>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>
                  <th style={{ padding: '10px 14px' }}>Rider</th>
                  <th style={{ padding: '10px 14px' }}>Plan / EV</th>
                  <th style={{ padding: '10px 14px' }}>Advance Paid</th>
                  <th style={{ padding: '10px 14px' }}>Balance Due</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvanceBookings.map(bkg => {
                  const paid = parseFloat(bkg.total_cost || bkg.collected_amount || 0);
                  const due = Math.max(0, 5100 - paid);

                  return (
                    <tr key={bkg.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{bkg.user_name || 'Rider'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>📞 {bkg.user_phone}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        <div>{bkg.plan_name || 'Weekly'}</div>
                        {bkg.vehicle_id && (
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', background: '#e0f2fe', padding: '1px 5px', borderRadius: '4px', display: 'inline-block', marginTop: '2px' }}>
                            🛵 {getVehicleCode(bkg.vehicle_id)}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: '600' }}>
                        ₹{paid.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: due > 0 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                          ₹{due.toLocaleString('en-IN')}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {bkg.vehicle_id ? (
                            <>
                              <button
                                onClick={() => handleOpenHandoverReceipt(bkg)}
                                title="Download Vehicle Handover Receipt (RNT)"
                                style={{
                                  background: '#ecfdf5',
                                  color: '#059669',
                                  border: '1px solid #a7f3d0',
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <FileText size={12} /> Handover
                              </button>
                              <button
                                onClick={() => handleOpenAdvanceReceipt(bkg)}
                                title="Download Advance Booking Receipt (RNT)"
                                style={{
                                  background: '#f0f9ff',
                                  color: '#0284c7',
                                  border: '1px solid #bae6fd',
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                Advance
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenAdvanceReceipt(bkg)}
                                title="Download Advance Booking Receipt (RNT)"
                                style={{
                                  background: '#f0f9ff',
                                  color: '#0284c7',
                                  border: '1px solid #bae6fd',
                                  padding: '5px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                Receipt
                              </button>
                              <button
                                onClick={() => handleOpenAssignSlotModal(bkg)}
                                style={{
                                  background: '#0284c7',
                                  color: 'white',
                                  border: 'none',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                Assign Slot
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredAdvanceBookings.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      {bookingFilter === 'assigned' ? 'No handed over bookings found.' : 'No waiting pre-bookings in the queue.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Column 2: Free EV Slots & Returns Dock */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Free Slots Box */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                  Available Free Slots ({availableVehicles.length})
                </h4>
                <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                  Ready to Deploy
                </span>
              </div>

              {availableVehicles.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableVehicles.map(veh => (
                    <div key={veh.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{veh.id}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {veh.location || 'Stand'}</div>
                      </div>
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>Available</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '12px', background: '#f8fafc', borderRadius: '6px' }}>
                  No free vehicles at the stand currently. Check in a returned vehicle below to free up a slot.
                </div>
              )}
            </div>

            {/* Old Rider Returns Dock (Free up slot) */}
            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                    Old Rider Vehicle Returns
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                    When an old rider returns their EV, check it in to free up a slot for the queue.
                  </p>
                </div>
              </div>

              <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rentedVehicles.map(veh => (
                  <div key={veh.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '13px' }}>{veh.id}</div>
                      <div style={{ fontSize: '11px', color: '#475569' }}>Rider: {veh.renter || 'Renter'}</div>
                    </div>
                    <button
                      onClick={() => handleOpenReturnVehicleModal(veh)}
                      style={{ background: '#0f172a', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Return EV
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: COLLECT RENT PAYMENT */}
      {/* ============================================================ */}
      {rentPaymentModalOpen && selectedRentalForPayment && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '440px', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  Collect Rent Payment
                </h3>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  {selectedRentalForPayment.user_name} • {selectedRentalForPayment.vehicle_id}
                </div>
              </div>
              <button onClick={() => setRentPaymentModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRentPayment} style={{ padding: '20px' }}>
              
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Select Rental Cycle Preset
                </label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                  {selectedRentalForPayment.isMonthlyPlan ? (
                    ['6500', '13000'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setRentPaymentForm(prev => ({ ...prev, cycle_count: String(parseInt(amt)/6500) }));
                          setRentPaymentRows([{ mode: 'cash', amount: amt, remarks: '' }]);
                        }}
                        style={{
                          flex: 1, padding: '7px', borderRadius: '4px',
                          border: rentPaymentRows[0]?.amount === amt ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: rentPaymentRows[0]?.amount === amt ? '#f0f9ff' : 'white',
                          fontWeight: '600', fontSize: '12px', cursor: 'pointer'
                        }}
                      >
                        ₹{amt} ({parseInt(amt)/6500} Mo)
                      </button>
                    ))
                  ) : (
                    ['1600', '3200', '4800'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setRentPaymentForm(prev => ({ ...prev, cycle_count: String(parseInt(amt)/1600) }));
                          setRentPaymentRows([{ mode: 'cash', amount: amt, remarks: '' }]);
                        }}
                        style={{
                          flex: 1, padding: '7px', borderRadius: '4px',
                          border: rentPaymentRows[0]?.amount === amt ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          background: rentPaymentRows[0]?.amount === amt ? '#f0f9ff' : 'white',
                          fontWeight: '600', fontSize: '12px', cursor: 'pointer'
                        }}
                      >
                        ₹{amt} ({parseInt(amt)/1600} Wk)
                      </button>
                    ))
                  )}
                </div>
              </div>

              {parseFloat(selectedRentalForPayment.security_deposit_balance || 0) > 0 && (
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '12px' }}>
                  Available Security Deposit: <strong>₹{parseFloat(selectedRentalForPayment.security_deposit_balance || 0).toLocaleString('en-IN')}</strong> (Select 'Deposit' mode below to deduct)
                </div>
              )}

              {renderPaymentRowsBuilder(rentPaymentRows, setRentPaymentRows, selectedRentalForPayment.currentRentDue)}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setRentPaymentModalOpen(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRentPayment}
                  style={{ flex: 2, padding: '9px', borderRadius: '6px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submittingRentPayment ? 'Saving...' : `Confirm ₹${rentPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0).toLocaleString('en-IN')}`}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ASSIGN SLOT TO ADVANCE BOOKING (2-STEP CARD DESIGN) */}
      {/* ============================================================ */}
      {assignSlotModalOpen && selectedBookingForSlot && (() => {
        const prevPaid = parseFloat(selectedBookingForSlot.total_cost || selectedBookingForSlot.collected_amount || 0);
        const prevDue = Math.max(0, 5100 - prevPaid);
        const currentAddedPayment = assignSlotPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const remainingDueAfter = Math.max(0, prevDue - currentAddedPayment);

        const filteredVehiclesForSlot = vehicles.filter(v => {
          const s = (v.status || 'available').toLowerCase().trim();
          const isRented = Boolean(v.renter) || s === 'rented' || s === 'in_use';
          const isMaintenance = s === 'maintenance';
          const isUnassigned = !isRented && !isMaintenance;
          const isCurrentVeh = selectedBookingForSlot && v.id === selectedBookingForSlot.vehicle_id;

          if (assignSlotOnlyUnassigned && !isUnassigned && !isCurrentVeh) return false;
          if (!assignSlotEvSearch) return true;

          const q = assignSlotEvSearch.toLowerCase().trim();
          const rawDigits = q.replace(/\D/g, '');
          const normQ = q.replace(/[^a-z0-9]/gi, '');

          const idStr = String(v.id || '').toLowerCase();
          const modelStr = String(v.model || '').toLowerCase();
          const renterStr = String(v.renter || '').toLowerCase();
          const codeStr = getVehicleCode(v).toLowerCase();
          const plateStr = String(v.registration_number || '').toLowerCase();
          const locStr = String(v.location || '').toLowerCase();

          const idNorm = idStr.replace(/[^a-z0-9]/gi, '');
          const codeNorm = codeStr.replace(/[^a-z0-9]/gi, '');
          const modelNorm = modelStr.replace(/[^a-z0-9]/gi, '');

          const stripZeros = s => (s || '').replace(/0+/g, '');
          const matchDirect = codeStr.includes(q) || idStr.includes(q) || modelStr.includes(q) || renterStr.includes(q) || plateStr.includes(q) || locStr.includes(q);
          const matchNorm = normQ && (idNorm.includes(normQ) || codeNorm.includes(normQ) || modelNorm.includes(normQ));
          const matchLoose = normQ && (stripZeros(codeNorm).includes(stripZeros(normQ)) || stripZeros(idNorm).includes(stripZeros(normQ)));
          const matchDigits = rawDigits && (codeStr.includes(rawDigits) || idStr.includes(rawDigits) || modelStr.includes(rawDigits));

          return matchDirect || matchNorm || matchLoose || matchDigits;
        });

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
            <div style={{ background: 'white', width: '100%', maxWidth: '560px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
              
              {/* Header */}
              <div style={{ padding: '18px 22px 14px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                    Assign EV Scooter — Booking #{selectedBookingForSlot.id?.slice(-6) || selectedBookingForSlot.id}
                  </h3>
                  <button onClick={() => setAssignSlotModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Step Navigation Tabs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setAssignSlotStep(1)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: assignSlotStep === 1 ? '#0284c7' : '#e2e8f0',
                      background: assignSlotStep === 1 ? '#f0f9ff' : '#ffffff',
                      color: assignSlotStep === 1 ? '#0284c7' : '#64748b',
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
                    onClick={() => setAssignSlotStep(2)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: assignSlotStep === 2 ? '#0284c7' : '#e2e8f0',
                      background: assignSlotStep === 2 ? '#f0f9ff' : '#ffffff',
                      color: assignSlotStep === 2 ? '#0284c7' : '#64748b',
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

              {/* Body */}
              <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>
                {assignSlotStep === 1 && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {/* Rider Info Strip */}
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', marginBottom: '12px' }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Rider Name</span>
                          <strong style={{ color: '#0f172a' }}>{selectedBookingForSlot.user_name}</strong>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase' }}>Mobile Number</span>
                          <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedBookingForSlot.user_phone || 'No Phone Recorded'}</strong>
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

                    {renderPaymentRowsBuilder(assignSlotPaymentRows, setAssignSlotPaymentRows, prevDue)}

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
                        onClick={() => setShowMoreSlotOptions(!showMoreSlotOptions)}
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
                          {showMoreSlotOptions ? '▲ Hide Options' : '▼ Show More Options'}
                        </span>
                      </button>

                      {showMoreSlotOptions && (
                        <div style={{ padding: '14px', display: 'grid', gap: '12px', borderTop: '1px solid #e2e8f0', background: '#ffffff' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569' }}>
                                Assignment & Billing Date & Time
                              </label>
                              <button
                                type="button"
                                onClick={() => setAssignSlotForm(prev => ({ ...prev, assignment_date: getLocalDatetimeString() }))}
                                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '11px', fontWeight: '600', cursor: 'pointer', padding: 0 }}
                              >
                                ↺ Reset to Current Time
                              </button>
                            </div>
                            <input
                              type="datetime-local"
                              value={assignSlotForm.assignment_date}
                              onChange={(e) => setAssignSlotForm(prev => ({ ...prev, assignment_date: e.target.value }))}
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
                              placeholder="e.g. Handover balance collected at stand"
                              value={assignSlotForm.remarks}
                              onChange={(e) => setAssignSlotForm(prev => ({ ...prev, remarks: e.target.value }))}
                              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {assignSlotStep === 2 && (
                  <div style={{ display: 'grid', gap: '14px' }}>
                    {/* Search & Filter Bar */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px 12px', flex: 1, minWidth: '220px' }}>
                        <Search size={16} color="#94a3b8" />
                        <input
                          type="text"
                          placeholder="Search EV by LT number (e.g. LT025, 025), model..."
                          value={assignSlotEvSearch}
                          onChange={(e) => setAssignSlotEvSearch(e.target.value)}
                          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer', userSelect: 'none', padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <input
                            type="checkbox"
                            checked={assignSlotOnlyUnassigned}
                            onChange={(e) => setAssignSlotOnlyUnassigned(e.target.checked)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                          />
                          Available Only ({availableVehicles.length})
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            if (token) {
                              axios.get('/api/vehicles', authHeaders)
                                .then(res => { if (res.data) setVehicles(res.data); })
                                .catch(err => console.error('Error refreshing vehicles:', err));
                            }
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                          title="Refresh Fleet List"
                        >
                          <RefreshCw size={13} /> Refresh Fleet
                        </button>
                      </div>
                    </div>

                    {/* EV Results Table */}
                    <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', maxHeight: '240px', overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 0, zIndex: 1 }}>
                          <tr style={{ color: '#475569', fontWeight: '700', textTransform: 'uppercase' }}>
                            <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>Select</th>
                            <th style={{ padding: '8px 10px' }}>EV Number</th>
                            <th style={{ padding: '8px 10px' }}>Location</th>
                            <th style={{ padding: '8px 10px' }}>Status</th>
                            <th style={{ padding: '8px 10px' }}>Assignment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredVehiclesForSlot.map(v => {
                            const isSelected = assignSlotForm.vehicle_id === v.id;
                            const isAssigned = Boolean(v.renter);
                            const vehCode = getVehicleCode(v);

                            return (
                              <tr
                                key={v.id}
                                onClick={() => setAssignSlotForm(prev => ({ ...prev, vehicle_id: v.id }))}
                                style={{
                                  borderBottom: '1px solid #f1f5f9',
                                  cursor: 'pointer',
                                  background: isSelected ? '#eff6ff' : 'transparent'
                                }}
                              >
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  <input
                                    type="radio"
                                    name="selected_slot_ev"
                                    checked={isSelected}
                                    onChange={() => setAssignSlotForm(prev => ({ ...prev, vehicle_id: v.id }))}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ padding: '8px 10px', fontWeight: '700', color: '#0284c7' }}>
                                  {vehCode}
                                </td>
                                <td style={{ padding: '8px 10px', color: '#475569' }}>
                                  📍 {v.location || 'Stand'}
                                </td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    background: isAssigned ? '#fef3c7' : '#dcfce7',
                                    color: isAssigned ? '#b45309' : '#15803d'
                                  }}>
                                    {isAssigned ? 'ASSIGNED' : 'AVAILABLE'}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', color: isAssigned ? '#b45309' : '#64748b' }}>
                                  {isAssigned ? `Assigned to: ${v.renter}` : 'Not Assigned (Free)'}
                                </td>
                              </tr>
                            );
                          })}

                          {filteredVehiclesForSlot.length === 0 && (
                            <tr>
                              <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                No EVs match the search. Uncheck <strong>"Not Assigned EV"</strong> to view all vehicles.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Selected EV Notice */}
                    {assignSlotForm.vehicle_id && (
                      <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}>
                        Selected EV: <strong style={{ color: '#0284c7' }}>{getVehicleCode(assignSlotForm.vehicle_id)}</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                {assignSlotStep === 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setAssignSlotModalOpen(false)}
                      style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignSlotStep(2)}
                      style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 20px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Next: Select EV Scooter →
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <button
                      type="button"
                      onClick={() => setAssignSlotStep(1)}
                      style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      ← Back to Payment
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={!assignSlotForm.vehicle_id}
                        onClick={() => {
                          const addedPaid = assignSlotPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                          const prevPaid = parseFloat(selectedBookingForSlot.advance_paid !== null && selectedBookingForSlot.advance_paid !== undefined ? selectedBookingForSlot.advance_paid : (selectedBookingForSlot.collected_amount || selectedBookingForSlot.total_cost || 0));
                          const selectedVeh = vehicles.find(v => v.id === assignSlotForm.vehicle_id);
                          handleOpenInvoiceWindow({
                            id: selectedBookingForSlot.id,
                            user_name: selectedBookingForSlot.user_name || selectedBookingForSlot.customer_name,
                            user_phone: selectedBookingForSlot.user_phone || selectedBookingForSlot.customer_phone || selectedBookingForSlot.phone,
                            user_email: selectedBookingForSlot.user_email || selectedBookingForSlot.email || '',
                            vehicle_id: getVehicleCode(assignSlotForm.vehicle_id),
                            vehicle_name: getVehicleCode(assignSlotForm.vehicle_id),
                            vehicle_model: selectedVeh?.model || selectedBookingForSlot.vehicle_model || 'LT Commercial EV',
                            location: selectedVeh?.location || 'Khajpura Stand, Patna',
                            plan_name: selectedBookingForSlot.plan_name || 'Weekly Commercial Rental',
                            total_cost: (prevPaid + addedPaid) || 5100,
                            advance_paid: prevPaid,
                            handover_amount: addedPaid,
                            advance_payment_mode: selectedBookingForSlot.advance_payment_mode || selectedBookingForSlot.payment_mode || 'cash',
                            handover_payment_mode: assignSlotPaymentRows.length === 1 ? assignSlotPaymentRows[0].mode : 'mixed',
                            advance_remarks: selectedBookingForSlot.advance_remarks || selectedBookingForSlot.remarks || '',
                            handover_remarks: assignSlotPaymentRows.map(r => `${r.mode}: ₹${r.amount}`).join(' + '),
                            payment_mode: assignSlotPaymentRows.length === 1 ? assignSlotPaymentRows[0].mode : 'mixed',
                            payment_status: 'paid',
                            pre_booking_date: selectedBookingForSlot.pre_booking_date || selectedBookingForSlot.created_at,
                            assignment_date: assignSlotForm.assignment_date,
                            advance_booking_id: selectedBookingForSlot.id,
                            handover_id: selectedBookingForSlot.handover_id || (`HND-${(selectedBookingForSlot.id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`),
                            remarks: assignSlotForm.remarks || ''
                          }, 'booking_confirm');
                        }}
                        style={{
                          background: assignSlotForm.vehicle_id ? '#f0f9ff' : '#f8fafc',
                          color: assignSlotForm.vehicle_id ? '#0284c7' : '#94a3b8',
                          border: `1px solid ${assignSlotForm.vehicle_id ? '#bae6fd' : '#cbd5e1'}`,
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: assignSlotForm.vehicle_id ? 'pointer' : 'not-allowed',
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
                        disabled={!assignSlotForm.vehicle_id || submittingAssignSlot}
                        onClick={handleSubmitAssignSlot}
                        style={{
                          background: assignSlotForm.vehicle_id ? '#0284c7' : '#94a3b8',
                          color: '#ffffff',
                          border: 'none',
                          padding: '8px 20px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          cursor: assignSlotForm.vehicle_id ? 'pointer' : 'not-allowed',
                          fontWeight: '600'
                        }}
                      >
                        {submittingAssignSlot ? 'Assigning EV...' : '✓ Confirm & Assign EV Scooter'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* MODAL: RETURN VEHICLE TO STAND */}
      {/* ============================================================ */}
      {returnVehicleModalOpen && selectedVehicleToReturn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '420px', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Return Vehicle & Free Slot</h3>
              <button onClick={() => setReturnVehicleModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitReturnVehicle} style={{ padding: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '13px' }}>
                <div>Vehicle: <strong>{selectedVehicleToReturn.id}</strong></div>
                <div style={{ color: '#64748b', marginTop: '2px' }}>Rider: <strong>{selectedVehicleToReturn.renter}</strong></div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                  Return to Stand
                </label>
                <select
                  value={returnVehicleForm.stand_location}
                  onChange={(e) => setReturnVehicleForm(prev => ({ ...prev, stand_location: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                >
                  {stands.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setReturnVehicleModalOpen(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  style={{ flex: 2, padding: '9px', borderRadius: '6px', border: 'none', background: '#0f172a', color: 'white', fontWeight: '600', cursor: 'pointer' }}
                >
                  {submittingReturn ? 'Checking in...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NEW ADVANCE BOOKING */}
      {/* ============================================================ */}
      {createBookingModalOpen && (() => {
        const totalPaid = createBookingPaymentRows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        const due = Math.max(0, 5100 - totalPaid);

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
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
                      Reserve an EV slot & collect advance token / deposit payment
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setCreateBookingModalOpen(false)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleCreateAdvanceBookingSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
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

                  {/* SECTION 1: RIDER DETAILS (NEW RIDER BY DEFAULT) */}
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
                          value={createBookingForm.name}
                          onChange={(e) => setCreateBookingForm(prev => ({ ...prev, name: e.target.value }))}
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
                          value={createBookingForm.phone}
                          onChange={(e) => setCreateBookingForm(prev => ({ ...prev, phone: e.target.value }))}
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
                          value={createBookingForm.email}
                          onChange={(e) => setCreateBookingForm(prev => ({ ...prev, email: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                          KYC Status
                        </label>
                        <select
                          value={createBookingForm.kyc_status}
                          onChange={(e) => setCreateBookingForm(prev => ({ ...prev, kyc_status: e.target.value }))}
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
                        value={createBookingForm.user_id}
                        onChange={(e) => {
                          const selId = e.target.value;
                          const foundUser = users.find(u => String(u.raw_id || u.user_id || u.id) === String(selId));
                          if (foundUser) {
                            setCreateBookingForm(prev => ({
                              ...prev,
                              user_id: String(foundUser.raw_id || foundUser.user_id || foundUser.id),
                              name: foundUser.name || '',
                              phone: foundUser.phone || '',
                              email: foundUser.email || '',
                              kyc_status: foundUser.kyc_status || 'verified'
                            }));
                          } else {
                            setCreateBookingForm(prev => ({ ...prev, user_id: '', name: '', phone: '', email: '' }));
                          }
                        }}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', background: '#f8fafc', color: '#334155', boxSizing: 'border-box' }}
                      >
                        <option value="">-- New Rider (Default - No user selected) --</option>
                        {users.map(u => (
                          <option key={u.id} value={u.raw_id || u.user_id || u.id}>
                            {u.name || 'Rider'} ({u.phone})
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
                          value={createBookingForm.plan_id}
                          onChange={(e) => setCreateBookingForm(prev => ({ ...prev, plan_id: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                          required
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
                          value={createBookingForm.pre_booking_date}
                          onChange={(e) => setCreateBookingForm(prev => ({ ...prev, pre_booking_date: e.target.value }))}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 3: PAYMENT COLLECTION */}
                  <div>
                    {renderPaymentRowsBuilder(createBookingPaymentRows, setCreateBookingPaymentRows, 5100)}

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
                      Notes / Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Booking taken by stand manager"
                      value={createBookingForm.remarks}
                      onChange={(e) => setCreateBookingForm(prev => ({ ...prev, remarks: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                </div>

                {/* Sticky Footer */}
                <div style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCreateBookingModalOpen(false)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingCreateBooking}
                    style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' }}
                  >
                    <CalendarCheck size={16} />
                    {submittingCreateBooking ? 'Creating...' : 'Create Booking & Invoice'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        );
      })()}

      {/* ============================================================ */}
      {/* MODAL: PAYMENT SUCCESS RECEIPT */}
      {/* ============================================================ */}
      {paymentSuccessReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '16px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '400px', borderRadius: '10px', padding: '24px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
              <CheckCircle size={24} />
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
              Payment Recorded
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
              ₹{paymentSuccessReceipt.amount} received from {paymentSuccessReceipt.riderName}.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => {
                  const phone = (paymentSuccessReceipt.phone || '').replace(/\D/g, '').slice(-10);
                  const dateFormatted = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  const nextDueFormatted = new Date(paymentSuccessReceipt.nextDueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  const text = encodeURIComponent(`*LT EV Payment Receipt*
Date: ${dateFormatted}
Rider: ${paymentSuccessReceipt.riderName}
Vehicle: ${paymentSuccessReceipt.vehicleId}
Amount: ₹${paymentSuccessReceipt.amount} (${paymentSuccessReceipt.mode})
Next Due: ${nextDueFormatted}
Helpline: +91 78705 7249`);
                  if (phone) window.open(`https://wa.me/91${phone}?text=${text}`, '_blank');
                  else window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
                }}
                style={{ width: '100%', padding: '9px', borderRadius: '6px', background: '#25D366', color: 'white', border: 'none', fontWeight: '600', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Send size={14} /> Send WhatsApp Receipt
              </button>

              <button
                onClick={() => setPaymentSuccessReceipt(null)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', border: 'none', fontSize: '12px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
