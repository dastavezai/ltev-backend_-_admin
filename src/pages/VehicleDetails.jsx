import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, MapPin, Clock, Activity, Settings, Wrench, CalendarDays, 
  Bike, Info, Trash2, X, UserMinus, ChevronLeft, ChevronRight, 
  Calendar as CalendarIcon, ListFilter, CheckCircle2, AlertTriangle, 
  ShieldAlert, Phone, UserCheck, Zap, RefreshCw
} from 'lucide-react';

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  
  // History View Tab: 'calendar' | 'table'
  const [historyTab, setHistoryTab] = useState('calendar');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState(null);

  const [editForm, setEditForm] = useState({
    model: '', type: '', status: '', location: '', chassis_number: ''
  });

  const fetchVehicleDetailsAndStands = async () => {
    try {
      const [vehicleRes, standsRes] = await Promise.all([
        axios.get(`/api/vehicles/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        axios.get('/api/stands', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      setVehicle(vehicleRes.data);
      setStands(standsRes.data);
      setEditForm({
        model: vehicleRes.data.model,
        type: vehicleRes.data.type,
        status: vehicleRes.data.status,
        location: vehicleRes.data.location,
        chassis_number: vehicleRes.data.chassis_number || ''
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleDetails = async () => {
    try {
      const response = await axios.get(`/api/vehicles/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setVehicle(response.data);
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
    }
  };

  useEffect(() => {
    fetchVehicleDetailsAndStands();
  }, [id]);

  const handleEditVehicle = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/vehicles/${id}`, editForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowEditModal(false);
      fetchVehicleDetails();
    } catch (error) {
      console.error('Error updating vehicle:', error);
      alert('Failed to update vehicle');
    }
  };

  const handleDeleteVehicle = async () => {
    try {
      await axios.delete(`/api/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      navigate('/vehicles');
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      alert('Failed to delete vehicle');
    }
  };

  const handleUnassignRider = async () => {
    setUnassigning(true);
    try {
      await axios.post(`/api/vehicles/${id}/unassign-rider`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setShowUnassignModal(false);
      alert('Assigned rider has been removed and vehicle status is now Available!');
      fetchVehicleDetails();
    } catch (error) {
      console.error('Error unassigning rider:', error);
      alert('Failed to unassign rider: ' + (error.response?.data?.error || error.message));
    } finally {
      setUnassigning(false);
    }
  };

  // Calendar calculations & day status mapper
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Calendar days generation
  const { daysInMonthGrid, monthMetrics } = useMemo(() => {
    if (!vehicle) return { daysInMonthGrid: [], monthMetrics: { rented: 0, maintenance: 0, idle: 0, rate: 0 } };

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const rentals = vehicle.rental_history || [];
    const maintenanceLogs = vehicle.maintenance_logs || [];

    const grid = [];

    // Days from prev month (padding)
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      grid.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`,
        status: 'padding'
      });
    }

    let rentedCount = 0;
    let maintCount = 0;
    let idleCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // Current month days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Check if day matches any maintenance
      const maintItem = maintenanceLogs.find(m => {
        const mDate = m.date_reported ? new Date(m.date_reported).toISOString().split('T')[0] : null;
        return mDate === dateStr;
      });

      // Check if day falls within any rental span
      const rentalItem = rentals.find(r => {
        if (!r.start_time) return false;
        const rStart = new Date(r.start_time).toISOString().split('T')[0];
        const rEnd = r.end_time ? new Date(r.end_time).toISOString().split('T')[0] : (r.status === 'active' ? todayStr : rStart);
        return dateStr >= rStart && dateStr <= rEnd;
      });

      let status = 'idle'; // gray
      let details = null;

      if (maintItem) {
        status = 'maintenance'; // yellow
        details = {
          type: 'maintenance',
          issue: maintItem.issue_description,
          cost: maintItem.cost,
          status: maintItem.status,
          date: maintItem.date_reported
        };
        maintCount++;
      } else if (rentalItem) {
        status = 'rented'; // green
        details = {
          type: 'rental',
          rentalId: rentalItem.id,
          userName: rentalItem.user_name || 'Rider',
          userPhone: rentalItem.user_phone,
          planName: rentalItem.plan_name || 'Standard Plan',
          startTime: rentalItem.start_time,
          endTime: rentalItem.end_time,
          cost: rentalItem.total_cost || rentalItem.plan_price,
          status: rentalItem.status
        };
        rentedCount++;
      } else {
        idleCount++;
      }

      grid.push({
        day,
        isCurrentMonth: true,
        dateStr,
        isToday: dateStr === todayStr,
        status, // 'rented' | 'maintenance' | 'idle'
        details
      });
    }

    // Remaining padding to complete 35 or 42 grid boxes
    const totalFilled = grid.length;
    const remaining = totalFilled % 7 === 0 ? 0 : 7 - (totalFilled % 7);
    for (let i = 1; i <= remaining; i++) {
      grid.push({
        day: i,
        isCurrentMonth: false,
        dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        status: 'padding'
      });
    }

    const totalDays = totalDaysInMonth;
    const rate = totalDays > 0 ? Math.round((rentedCount / totalDays) * 100) : 0;

    return {
      daysInMonthGrid: grid,
      monthMetrics: {
        rented: rentedCount,
        maintenance: maintCount,
        idle: idleCount,
        rate
      }
    };
  }, [vehicle, year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayData(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayData(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDayData(null);
  };

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Loading vehicle details...</div>;
  }

  if (!vehicle) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>Vehicle Not Found</h2>
        <button onClick={() => navigate('/vehicles')} style={{ marginTop: '16px', padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Back to Fleet</button>
      </div>
    );
  }

  const isRented = vehicle.status === 'rented' || vehicle.status === 'in_use' || Boolean(vehicle.current_renter);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: '40px' }}>
      {/* Top Breadcrumb & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/vehicles')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#64748b', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
        >
          <ArrowLeft size={18} /> Back to Fleet
        </button>

        <button 
          onClick={fetchVehicleDetails}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e2e8f0', padding: '8px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer' }}
        >
          <RefreshCw size={14} /> Refresh Details
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {vehicle.model}
            <span style={{ 
              fontSize: '13px', 
              background: isRented ? '#dcfce7' : vehicle.status === 'maintenance' ? '#fef3c7' : '#e0f2fe', 
              color: isRented ? '#15803d' : vehicle.status === 'maintenance' ? '#b45309' : '#0369a1', 
              padding: '4px 14px', 
              borderRadius: '20px', 
              textTransform: 'uppercase', 
              fontWeight: '800', 
              letterSpacing: '0.5px' 
            }}>
              {isRented ? 'Rented (Active)' : vehicle.status}
            </span>
          </h1>
        </div>

        {/* Top Actions */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isRented && (
            <button 
              onClick={() => setShowUnassignModal(true)} 
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fee2e2', border: '1px solid #fca5a5', padding: '10px 16px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', color: '#dc2626', boxShadow: '0 2px 6px rgba(220,38,38,0.1)' }}
            >
              <UserMinus size={18} /> Remove Assigned Rider
            </button>
          )}
          <button onClick={() => setShowEditModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <Settings size={18} /> Configure
          </button>
        </div>
      </div>

      {/* Top 3 KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {/* Core Identity */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} color="#3b82f6" /> Vehicle & Location
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Vehicle Number</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{vehicle.model}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Disbursed Stand</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                <MapPin size={16} color="#f43f5e" /> {vehicle.location}
              </div>
            </div>
          </div>
        </div>

        {/* Current Status */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="#8b5cf6" /> Live Vehicle Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Availability</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: isRented ? '#16a34a' : vehicle.status === 'maintenance' ? '#d97706' : '#2563eb', textTransform: 'capitalize' }}>
                {isRented ? 'In Rental' : vehicle.status}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Vehicle Type</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{vehicle.type || 'Electric Scooter'}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Total Historical Rides</div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                {vehicle.rental_history ? vehicle.rental_history.length : 0} Rides
              </div>
            </div>
          </div>
        </div>

        {/* Active Ride & Remove Rider Option */}
        <div style={{ 
          background: isRented ? '#f0fdf4' : '#f8fafc', 
          padding: '24px', 
          borderRadius: '20px', 
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', 
          border: isRented ? '1px solid #bbf7d0' : '1px solid #e2e8f0' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: isRented ? '#166534' : '#64748b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bike size={18} /> Active Rider Assignment
            </h3>
            {isRented && (
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                Assigned
              </span>
            )}
          </div>

          {isRented ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>Assigned Rider</div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: '#14532d', marginTop: '2px' }}>
                  {vehicle.current_renter || 'Active Rider'}
                </div>
                {vehicle.current_renter_phone && (
                  <div style={{ fontSize: '13px', color: '#166534', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Phone size={13} /> {vehicle.current_renter_phone}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.7)', padding: '10px 12px', borderRadius: '10px', fontSize: '12px' }}>
                <div>
                  <div style={{ color: '#64748b', fontWeight: '600' }}>Ride Started</div>
                  <div style={{ color: '#0f172a', fontWeight: '700', marginTop: '2px' }}>
                    {vehicle.current_rental_start ? new Date(vehicle.current_rental_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : 'Today'}
                  </div>
                </div>
                {vehicle.current_plan_name && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#64748b', fontWeight: '600' }}>Active Plan</div>
                    <div style={{ color: '#166534', fontWeight: '700', marginTop: '2px' }}>{vehicle.current_plan_name}</div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowUnassignModal(true)}
                style={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px', 
                  background: '#fee2e2', 
                  border: '1px solid #fca5a5', 
                  color: '#dc2626', 
                  padding: '10px', 
                  borderRadius: '10px', 
                  fontWeight: '700', 
                  fontSize: '13px',
                  cursor: 'pointer',
                  marginTop: '4px',
                  transition: 'all 0.2s'
                }}
              >
                <UserMinus size={16} /> Remove / Unassign Rider
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '140px', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', gap: '8px' }}>
              <Bike size={28} style={{ opacity: 0.5 }} />
              <div style={{ fontSize: '14px', fontWeight: '500' }}>Vehicle is idle & available for assignment.</div>
            </div>
          )}
        </div>
      </div>

      {/* BIKE RENTAL CALENDAR & USAGE HISTORY SECTION */}
      <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', padding: '28px', marginBottom: '32px' }}>
        {/* Section Title & View Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarDays size={24} color="#3b82f6" /> Bike Rental Record & Calendar History
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>
              Track daily rental timeline, plan continuations, idle days, and maintenance records.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
            <button 
              onClick={() => setHistoryTab('calendar')} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                padding: '8px 16px', borderRadius: '8px', border: 'none', 
                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                background: historyTab === 'calendar' ? 'white' : 'transparent',
                color: historyTab === 'calendar' ? '#0f172a' : '#64748b',
                boxShadow: historyTab === 'calendar' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              <CalendarIcon size={16} /> Calendar View
            </button>
            <button 
              onClick={() => setHistoryTab('table')} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                padding: '8px 16px', borderRadius: '8px', border: 'none', 
                fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                background: historyTab === 'table' ? 'white' : 'transparent',
                color: historyTab === 'table' ? '#0f172a' : '#64748b',
                boxShadow: historyTab === 'table' ? '0 2px 4px rgba(0,0,0,0.04)' : 'none'
              }}
            >
              <ListFilter size={16} /> Table Records ({vehicle.rental_history?.length || 0})
            </button>
          </div>
        </div>

        {historyTab === 'calendar' ? (
          <div>
            {/* Calendar Controls & Legend */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px 20px', borderRadius: '16px' }}>
              {/* Month Navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={handlePrevMonth}
                  style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
                >
                  <ChevronLeft size={18} />
                </button>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', minWidth: '180px', textAlign: 'center' }}>
                  {monthNames[month]} {year}
                </div>
                <button 
                  onClick={handleNextMonth}
                  style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
                >
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={handleToday}
                  style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#0f172a' }}
                >
                  Today
                </button>
              </div>

              {/* Legend Badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#15803d' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#22c55e' }} />
                  <span>Rented / Plan Active (Green)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#b45309' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#eab308' }} />
                  <span>Maintenance (Yellow)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', color: '#64748b' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#94a3b8' }} />
                  <span>Idle / Available (Gray)</span>
                </div>
              </div>
            </div>

            {/* Monthly KPI Ribbon */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '14px 18px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Active Rented Days</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#15803d', marginTop: '4px' }}>{monthMetrics.rented} <span style={{ fontSize: '14px', fontWeight: '600' }}>Days</span></div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Idle Days</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#334155', marginTop: '4px' }}>{monthMetrics.idle} <span style={{ fontSize: '14px', fontWeight: '600' }}>Days</span></div>
              </div>

              <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '14px', padding: '14px 18px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase' }}>Maintenance Days</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#a16207', marginTop: '4px' }}>{monthMetrics.maintenance} <span style={{ fontSize: '14px', fontWeight: '600' }}>Days</span></div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '14px 18px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase' }}>Monthly Utilization</div>
                <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>{monthMetrics.rate}%</div>
              </div>
            </div>

            {/* Calendar Grid & Side Inspector */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedDayData ? '3fr 2fr' : '1fr', gap: '24px', transition: 'all 0.3s ease' }}>
              {/* Calendar Days Box Grid */}
              <div style={{ background: '#fafafa', padding: '16px', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                {/* Weekday Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px', textAlign: 'center' }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <div key={i} style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', padding: '6px' }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Day Boxes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {daysInMonthGrid.map((item, index) => {
                    if (!item.isCurrentMonth) {
                      return (
                        <div 
                          key={index} 
                          style={{ 
                            height: '74px', 
                            background: '#f8fafc', 
                            borderRadius: '10px', 
                            opacity: 0.35, 
                            padding: '8px', 
                            fontSize: '12px', 
                            color: '#94a3b8' 
                          }}
                        >
                          {item.day}
                        </div>
                      );
                    }

                    // Style depending on status
                    let boxBg = '#f1f5f9'; // idle gray
                    let boxBorder = '#e2e8f0';
                    let boxColor = '#475569';
                    let badgeText = 'Idle';
                    let badgeBg = '#e2e8f0';
                    let badgeColor = '#64748b';

                    if (item.status === 'rented') {
                      boxBg = '#dcfce7'; // green
                      boxBorder = '#86efac';
                      boxColor = '#14532d';
                      const riderFirstName = item.details?.userName ? item.details.userName.trim().split(' ')[0] : 'Rented';
                      badgeText = riderFirstName;
                      badgeBg = '#22c55e';
                      badgeColor = 'white';
                    } else if (item.status === 'maintenance') {
                      boxBg = '#fef9c3'; // yellow
                      boxBorder = '#fde047';
                      boxColor = '#713f12';
                      badgeText = 'Maint';
                      badgeBg = '#eab308';
                      badgeColor = '#713f12';
                    }

                    const isSelected = selectedDayData && selectedDayData.dateStr === item.dateStr;

                    return (
                      <div 
                        key={index}
                        onClick={() => setSelectedDayData(item)}
                        style={{
                          height: '76px',
                          background: boxBg,
                          border: isSelected ? '2px solid #0f172a' : `1px solid ${boxBorder}`,
                          borderRadius: '10px',
                          padding: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                          transform: isSelected ? 'scale(1.02)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: item.isToday ? '900' : '700', color: boxColor }}>
                            {item.day}
                          </span>
                          {item.isToday && (
                            <span style={{ fontSize: '9px', fontWeight: '800', background: '#0f172a', color: 'white', padding: '1px 5px', borderRadius: '4px' }}>
                              TODAY
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                          <span 
                            title={item.status === 'rented' && item.details?.userName ? `Rented by ${item.details.userName}` : badgeText}
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: '700', 
                              background: badgeBg, 
                              color: badgeColor, 
                              padding: '2px 6px', 
                              borderRadius: '6px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '85%'
                            }}
                          >
                            {badgeText}
                          </span>
                          {item.status === 'rented' && <Bike size={12} color="#15803d" style={{ flexShrink: 0 }} />}
                          {item.status === 'maintenance' && <Wrench size={12} color="#a16207" style={{ flexShrink: 0 }} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Inspector Drawer */}
              {selectedDayData && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '18px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Day Activity Inspector</div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0' }}>
                          {new Date(selectedDayData.dateStr).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </h3>
                      </div>
                      <button 
                        onClick={() => setSelectedDayData(null)}
                        style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
                      >
                        <X size={16} color="#64748b" />
                      </button>
                    </div>

                    {selectedDayData.status === 'rented' && selectedDayData.details && (
                      <div style={{ background: 'white', border: '1px solid #bbf7d0', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', fontWeight: '800', fontSize: '14px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                          Bike In-Use / Rented by Driver
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Rider Name</div>
                          <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{selectedDayData.details.userName}</div>
                          {selectedDayData.details.userPhone && (
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>Phone: {selectedDayData.details.userPhone}</div>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '12px', borderRadius: '10px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Plan Type</div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{selectedDayData.details.planName}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Rent / Revenue</div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#15803d' }}>
                              {selectedDayData.details.cost ? `₹${selectedDayData.details.cost}` : 'Plan Rate'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>Rental Period</div>
                          <div style={{ fontSize: '12px', color: '#334155', fontWeight: '500', marginTop: '2px' }}>
                            Started: {new Date(selectedDayData.details.startTime).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' })}
                          </div>
                          <div style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>
                            Ended: {selectedDayData.details.endTime ? new Date(selectedDayData.details.endTime).toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }) : 'Ongoing Active Plan'}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDayData.status === 'maintenance' && selectedDayData.details && (
                      <div style={{ background: 'white', border: '1px solid #fde047', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a16207', fontWeight: '800', fontSize: '14px' }}>
                          <Wrench size={16} color="#eab308" /> Maintenance Record
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Issue Description</div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginTop: '2px' }}>{selectedDayData.details.issue}</div>
                        </div>
                        {selectedDayData.details.cost && (
                          <div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Repair Cost</div>
                            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>₹{selectedDayData.details.cost}</div>
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          Status: <span style={{ fontWeight: '700', textTransform: 'uppercase', color: selectedDayData.details.status === 'resolved' ? '#15803d' : '#dc2626' }}>{selectedDayData.details.status}</span>
                        </div>
                      </div>
                    )}

                    {selectedDayData.status === 'idle' && (
                      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
                        <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto' }}>
                          <CheckCircle2 size={24} color="#64748b" />
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>Vehicle Idle & Available</h4>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: '1.4' }}>
                          No rental or maintenance occurred on this day. The vehicle was parked and available for booking at <strong>{vehicle.location}</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: '16px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                    Click on any day in the grid to view details.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Table Records View */
          <div>
            {vehicle.rental_history && vehicle.rental_history.length > 0 ? (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase' }}>
                  <tr>
                    <th style={{ padding: '14px 16px', fontWeight: '600', borderRadius: '8px 0 0 8px' }}>Rider</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Plan</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Duration & Time</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600' }}>Cost / Revenue</th>
                    <th style={{ padding: '14px 16px', fontWeight: '600', borderRadius: '0 8px 8px 0', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicle.rental_history.map(rental => (
                    <tr key={rental.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{rental.user_name}</div>
                        {rental.user_phone && <div style={{ fontSize: '12px', color: '#64748b' }}>{rental.user_phone}</div>}
                      </td>
                      <td style={{ padding: '16px', fontSize: '14px', color: '#334155', fontWeight: '600' }}>
                        {rental.plan_name || 'Standard Rental'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: '#475569' }}>
                        <div style={{ fontWeight: '600', color: '#334155' }}>
                          {new Date(rental.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(rental.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata' })} - {rental.end_time ? new Date(rental.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute:'2-digit', timeZone: 'Asia/Kolkata' }) : 'Ongoing'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontWeight: '800', color: '#15803d', fontSize: '15px' }}>
                        {rental.total_cost || rental.plan_price ? `₹${rental.total_cost || rental.plan_price}` : '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <span style={{ 
                          background: rental.status === 'completed' ? '#f1f5f9' : '#dcfce7', 
                          color: rental.status === 'completed' ? '#475569' : '#15803d', 
                          padding: '4px 10px', 
                          borderRadius: '20px', 
                          fontSize: '12px', 
                          fontWeight: '700', 
                          textTransform: 'capitalize' 
                        }}>
                          {rental.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>No historical rentals found for this vehicle.</p>
            )}
          </div>
        )}
      </div>

      {/* Maintenance Logs & Delete Vehicle */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Maintenance Logs */}
        <div style={{ background: 'white', padding: '28px', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={20} color="#f59e0b" /> Maintenance History
          </h3>
          {vehicle.maintenance_logs && vehicle.maintenance_logs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {vehicle.maintenance_logs.map(log => (
                <div key={log.id} style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#64748b' }}>
                      {new Date(log.date_reported).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', background: log.status === 'resolved' ? '#d1fae5' : '#fee2e2', color: log.status === 'resolved' ? '#059669' : '#dc2626', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                      {log.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', lineHeight: '1.4', margin: 0 }}>{log.issue_description}</p>
                  {log.cost && <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>Cost: ₹{log.cost}</div>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>No maintenance records found.</p>
          )}
        </div>

        {/* Danger Zone / Delete */}
        <div style={{ background: '#fff1f2', padding: '28px', borderRadius: '24px', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#9f1239', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trash2 size={20} color="#e11d48" /> Danger Zone
            </h3>
            <p style={{ color: '#881337', fontSize: '13px', lineHeight: '1.5' }}>
              Deleting this vehicle permanently removes it and cleans up its associated logs from the fleet database.
            </p>
          </div>
          <button 
            onClick={() => setShowDeleteModal(true)} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#e11d48', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', color: 'white', marginTop: '20px', boxShadow: '0 4px 10px rgba(225,29,72,0.2)' }}
          >
            <Trash2 size={16} /> Delete Vehicle
          </button>
        </div>
      </div>

      {/* UNASSIGN RIDER MODAL */}
      {showUnassignModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 110 }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ width: '60px', height: '60px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <UserMinus size={28} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>Remove Assigned Rider?</h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to unassign rider <strong>{vehicle.current_renter || 'the current rider'}</strong> from <strong>{vehicle.model} ({vehicle.id})</strong>?
              <br /><br />
              This will complete the active rental session and set the vehicle back to <strong>Available</strong> status for new bookings.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                disabled={unassigning}
                onClick={() => setShowUnassignModal(false)} 
                style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                disabled={unassigning}
                onClick={handleUnassignRider} 
                style={{ flex: 1, padding: '12px', background: '#dc2626', border: 'none', color: 'white', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {unassigning ? 'Unassigning...' : 'Yes, Remove Rider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Vehicle Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Configure Vehicle</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleEditVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Vehicle Number (e.g., LT002)</label>
                <input required type="text" value={editForm.model} onChange={e => setEditForm({...editForm, model: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                    <option value="available">Available</option>
                    <option value="rented">Rented</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Disbursed Stand</label>
                <select required value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                  {stands.length === 0 && <option value="">No stands available</option>}
                  {stands.map(stand => (
                    <option key={stand.id} value={stand.name}>{stand.name}</option>
                  ))}
                </select>
              </div>



              <button type="submit" style={{ marginTop: '8px', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Save Configuration
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <Trash2 size={32} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Delete Vehicle?</h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to permanently delete <strong>{vehicle.model} ({vehicle.id})</strong>? This will also permanently destroy all its rental and maintenance history. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteVehicle} style={{ flex: 1, padding: '12px', background: '#dc2626', border: 'none', color: 'white', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Delete Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
