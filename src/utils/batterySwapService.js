/**
 * Battery Swap Management Service
 * Handles monthly free swaps limit, monthly total swaps limit,
 * per-vehicle manual swap tracking, assignment logs, and persistence.
 */

const SETTINGS_KEY = 'lt_battery_swap_settings';
const SWAP_EVENT_KEY = 'lt_battery_swaps_updated';
const SETTINGS_EVENT_KEY = 'lt_battery_swap_settings_changed';

export const DEFAULT_SWAP_SETTINGS = {
  monthly_free_swaps: 30,
  monthly_max_swaps: 60,
  extra_swap_charge: 50, // Rs per extra swap after free limit
  note: 'Standard monthly allocation includes 30 free battery swaps per active vehicle/rider.'
};

export const getCurrentMonthKey = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getMonthDisplayName = (monthKey = getCurrentMonthKey()) => {
  try {
    const [year, month] = monthKey.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  } catch {
    return monthKey;
  }
};

/**
 * Get configured swap settings
 */
export const getSwapSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SWAP_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      monthly_free_swaps: Number(parsed.monthly_free_swaps ?? DEFAULT_SWAP_SETTINGS.monthly_free_swaps),
      monthly_max_swaps: Number(parsed.monthly_max_swaps ?? DEFAULT_SWAP_SETTINGS.monthly_max_swaps),
      extra_swap_charge: Number(parsed.extra_swap_charge ?? DEFAULT_SWAP_SETTINGS.extra_swap_charge),
      note: parsed.note || DEFAULT_SWAP_SETTINGS.note
    };
  } catch (err) {
    console.error('Error reading battery swap settings:', err);
    return { ...DEFAULT_SWAP_SETTINGS };
  }
};

/**
 * Save swap settings
 */
export const saveSwapSettings = (newSettings) => {
  try {
    const updated = {
      monthly_free_swaps: Number(newSettings.monthly_free_swaps ?? DEFAULT_SWAP_SETTINGS.monthly_free_swaps),
      monthly_max_swaps: Number(newSettings.monthly_max_swaps ?? DEFAULT_SWAP_SETTINGS.monthly_max_swaps),
      extra_swap_charge: Number(newSettings.extra_swap_charge ?? DEFAULT_SWAP_SETTINGS.extra_swap_charge),
      note: newSettings.note || DEFAULT_SWAP_SETTINGS.note
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT_KEY, { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Error saving battery swap settings:', err);
    return null;
  }
};

/**
 * Get map of all vehicles for a month: { [vehicleId]: { count, vehicle_code, last_updated, rider_name, rider_phone, history } }
 */
export const getAllVehicleSwaps = (monthKey = getCurrentMonthKey()) => {
  try {
    const raw = localStorage.getItem(`lt_vehicle_swaps_${monthKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error(`Error loading vehicle swaps for ${monthKey}:`, err);
    return {};
  }
};

/**
 * Get swap data for a specific vehicle in a given month
 */
export const getVehicleSwapData = (vehicleId, monthKey = getCurrentMonthKey()) => {
  if (!vehicleId) return null;
  const all = getAllVehicleSwaps(monthKey);
  const vKey = String(vehicleId).trim();
  return all[vKey] || {
    count: 0,
    vehicle_id: vKey,
    last_updated: null,
    rider_name: '',
    rider_phone: '',
    history: []
  };
};

/**
 * Get just the integer count of battery swaps for a vehicle in current month
 */
export const getVehicleSwapCount = (vehicleId, monthKey = getCurrentMonthKey()) => {
  const data = getVehicleSwapData(vehicleId, monthKey);
  return data ? Number(data.count) || 0 : 0;
};

/**
 * Update or record battery swaps for a vehicle
 */
export const updateVehicleSwaps = (vehicleId, newCount, details = {}) => {
  if (!vehicleId) return null;
  const monthKey = details.monthKey || getCurrentMonthKey();
  const vKey = String(vehicleId).trim();
  const all = getAllVehicleSwaps(monthKey);

  const prevRecord = all[vKey] || {
    count: 0,
    vehicle_id: vKey,
    vehicle_code: details.vehicleCode || vKey,
    rider_name: '',
    rider_phone: '',
    history: []
  };

  const countNum = Math.max(0, parseInt(newCount, 10) || 0);
  const now = new Date().toISOString();

  const historyItem = {
    timestamp: now,
    count: countNum,
    prev_count: prevRecord.count || 0,
    change: countNum - (prevRecord.count || 0),
    rider_name: details.riderName || prevRecord.rider_name || '',
    rider_phone: details.riderPhone || prevRecord.rider_phone || '',
    action: details.action || 'manual_update',
    note: details.note || ''
  };

  const updatedRecord = {
    vehicle_id: vKey,
    vehicle_code: details.vehicleCode || prevRecord.vehicle_code || vKey,
    count: countNum,
    last_updated: now,
    rider_name: details.riderName !== undefined ? details.riderName : prevRecord.rider_name,
    rider_phone: details.riderPhone !== undefined ? details.riderPhone : prevRecord.rider_phone,
    history: [historyItem, ...(prevRecord.history || [])].slice(0, 50)
  };

  all[vKey] = updatedRecord;

  try {
    localStorage.setItem(`lt_vehicle_swaps_${monthKey}`, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(SWAP_EVENT_KEY, {
      detail: { vehicleId: vKey, monthKey, record: updatedRecord }
    }));
  } catch (err) {
    console.error('Error persisting vehicle swap record:', err);
  }

  return updatedRecord;
};

/**
 * Record swaps when assigning a vehicle to a rider
 */
export const recordAssignmentSwaps = ({
  vehicleId,
  vehicleCode,
  riderName,
  riderPhone,
  swapsCount = 0,
  note = 'Vehicle assigned to rider'
}) => {
  if (!vehicleId) return;
  return updateVehicleSwaps(vehicleId, swapsCount, {
    vehicleCode: vehicleCode || vehicleId,
    riderName: riderName || '',
    riderPhone: riderPhone || '',
    action: 'vehicle_assignment',
    note: note || `Assigned to ${riderName || 'rider'}`
  });
};

/**
 * Calculate metrics for badge & progress display
 */
export const calculateSwapMetrics = (swapsCount = 0, settings = getSwapSettings()) => {
  const free = Math.max(1, Number(settings?.monthly_free_swaps) || DEFAULT_SWAP_SETTINGS.monthly_free_swaps);
  const max = Math.max(free, Number(settings?.monthly_max_swaps) || DEFAULT_SWAP_SETTINGS.monthly_max_swaps);
  const used = Math.max(0, Number(swapsCount) || 0);

  const remainingFree = Math.max(0, free - used);
  const extraSwaps = Math.max(0, used - free);
  const extraCost = extraSwaps * (Number(settings?.extra_swap_charge) || 0);
  const isExceededMax = used > max;
  const percentageOfFree = Math.min(100, Math.round((used / free) * 100));

  return {
    free,
    max,
    used,
    remainingFree,
    extraSwaps,
    extraCost,
    isExceededMax,
    percentageOfFree,
    statusText: used <= free
      ? `${used} / ${free} Free Swaps used (${remainingFree} remaining)`
      : `${used} Swaps (${extraSwaps} extra beyond ${free} free • ₹${extraCost})`
  };
};
