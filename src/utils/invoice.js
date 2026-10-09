// Official Multi-Template Invoice & Receipt Generator for LT EV
// Supported Templates:
// 1. 'advance_booking' : Advance Reservation & Deposit Receipt
// 2. 'rent_payment'    : Weekly / Monthly Rent Renewal Payment Receipt
// 3. 'booking_confirm' : Booking Confirmation & Vehicle Handover Receipt (Assignment Receipt)
// 4. 'service_parts'   : Workshop Service & Parts Replacement Invoice

export const getShortBookingId = (id, prefix = 'BKG') => {
  if (!id) return `${prefix}-1001`;
  const str = String(id).trim();
  if (/^[A-Za-z]{3,4}-\d+$/i.test(str)) {
    if (prefix && prefix !== 'KEEP') {
      const numPart = str.split('-')[1];
      return `${prefix.toUpperCase()}-${numPart}`;
    }
    return str.toUpperCase();
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 4) {
    return `${prefix.toUpperCase()}-${digits.slice(-6)}`;
  }
  return `${prefix.toUpperCase()}-${str}`;
};

export const formatIndianDate = (dateVal) => {
  if (!dateVal) return 'Today';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatIndianTime = (dateVal) => {
  if (!dateVal) return '12:00';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '12:00';
  const timeParts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(d);
  const hourPart = parseInt(timeParts.find(p => p.type === 'hour')?.value || '0', 10);
  const minPart = parseInt(timeParts.find(p => p.type === 'minute')?.value || '0', 10);
  const isMidnight = (hourPart === 0 && minPart === 0) || (hourPart === 24 && minPart === 0);
  if (isMidnight) return '12:00';
  return d.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Generates Complete HTML for any of the 4 templates
export const getInvoiceHTML = (templateType = 'advance_booking', data = {}) => {
  const type = templateType || data.invoice_type || 'advance_booking';
  const logoUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/uploads/logo.png`;

  // Standard Company Meta
  const companyLegal = 'Wheely Buzz Localtoto Transport Solution Private Limited';
  const companyAddress = 'Rukanpura, Bailey Road, Patna - 800014 | Helpline: +91 78705 7249';
  const helplinePhone = '+91 78705 7249';

  // ============================================================
  // 1. ADVANCE BOOKING RECEIPT TEMPLATE (BKG)
  // ============================================================
  if (type === 'advance_booking') {
    // Resolve authentic advance payment (cannot exceed 5100, and if booking is active, must use advance_paid)
    let advancePaid = data.advance_paid !== undefined && data.advance_paid !== null ? parseFloat(data.advance_paid) : null;
    if (advancePaid === null) {
      const tc = parseFloat(data.total_cost || data.collected_amount || data.paid_amount || 0);
      if (tc <= 2500 && tc > 0) {
        advancePaid = tc;
      } else {
        const rem = data.remarks || '';
        const m = rem.match(/advance.*?₹\s*(\d+)/i) || rem.match(/₹\s*(\d+)/);
        advancePaid = m ? parseFloat(m[1]) : (tc > 2500 ? 1500 : tc);
      }
    }
    const paidAmount = advancePaid !== null ? advancePaid : 1500;
    const dueAmount = Math.max(0, 5100 - paidAmount);
    const bookingDate = data.pre_booking_date || data.advance_date || data.created_at || data.start_time || data.date || Date.now();
    const formattedDate = formatIndianDate(bookingDate);
    const billingTime = formatIndianTime(bookingDate);
    const shortBookingId = data.advance_booking_id || (data.id && data.id.startsWith('BKG-') ? data.id : getShortBookingId(data.id || data.booking_id, 'BKG'));
    const cleanPhone = (data.user_phone && data.user_phone !== '9000000000' && data.user_phone !== '0000000000') ? data.user_phone : (data.phone || '');
    const cleanReceipt = data.advance_remarks || (data.remarks && !data.remarks.includes('Handover') ? data.remarks : '') || data.receipt_notes || '';
    const paymentMode = (data.advance_payment_mode || (data.status === 'pre_booking' ? data.payment_mode : '') || data.payment_mode || 'cash').toUpperCase();

    const title = `Advance Booking Receipt — ${data.user_name || 'Rider'} (${shortBookingId})`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>${getCommonCSS()}</style>
</head>
<body>
  ${getActionBarHTML(shortBookingId, 'Advance Booking Receipt')}
  <div class="invoice-wrapper" id="printable-invoice">
    ${getBrandHeaderHTML(logoUrl, companyLegal, companyAddress, shortBookingId, formattedDate, billingTime)}
    
    <div class="meta-grid">
      <div class="meta-col">
        <h4>Billed To (Rider Details)</h4>
        <div class="meta-item">Name: <strong>${data.user_name || data.name || 'Rider'}</strong></div>
        <div class="meta-item">Mobile: <strong style="font-family: monospace;">${cleanPhone || 'N/A'}</strong></div>
        ${data.email ? `<div class="meta-item">Email: <strong>${data.email}</strong></div>` : ''}
        <div class="meta-item">Booking Ref: <strong style="font-family: monospace;">${shortBookingId}</strong></div>
      </div>
      <div class="meta-col">
        <h4>Reservation & EV Status</h4>
        <div class="meta-item">Service Type: <strong>EV Rental</strong></div>
        <div class="meta-item">Vehicle Status: <strong style="color: #0284c7;">Advance Booking</strong></div>
        <div class="meta-item">Primary Payment: <strong>${paymentMode}</strong></div>
        ${cleanReceipt ? `<div class="meta-item">Payment Breakdown / Ref: <strong>${cleanReceipt}</strong></div>` : ''}
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 70%;">Description</th>
            <th class="text-right" style="width: 30%;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a;">EV Rental Security Deposit</div>
              <div style="font-size: 11px; color: #64748b;">Refundable security deposit against vehicle handover and safety compliance.</div>
            </td>
            <td class="text-right" style="font-weight: 600;">₹3,500.00</td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a;">1st Week Rental Subscription Pass</div>
              <div style="font-size: 11px; color: #64748b;">Standard 7-day initial commercial rental period package.</div>
            </td>
            <td class="text-right" style="font-weight: 600;">₹1,600.00</td>
          </tr>
          <tr style="font-weight: 700; font-size: 15px; background: #f8fafc;">
            <td style="color: #0f172a;">Total Package Rate</td>
            <td class="text-right" style="color: #0f172a;">₹5,100.00</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-grid">
      <div class="payment-notes">
        <h5>Terms & Payment Notes:</h5>
        <ul>
          <li>This official receipt confirms advance booking reservation payment.</li>
          <li>Remaining balance due of <strong>₹${dueAmount.toLocaleString('en-IN')}.00</strong> is payable upon physical vehicle handover.</li>
          <li>Vehicle handover is subject to valid Aadhaar / Driving License KYC verification.</li>
          <li>For helpline support & assistance, contact <strong>${helplinePhone}</strong>.</li>
        </ul>
      </div>

      <div class="totals-box">
        <div class="totals-row" style="font-weight: 700;">
          <span>Package Total</span>
          <span>₹5,100.00</span>
        </div>
        <div class="totals-row highlight">
          <span style="color: #16a34a;">Advance Payment Received</span>
          <strong style="color: #16a34a;">₹${paidAmount.toLocaleString('en-IN')}.00</strong>
        </div>
        <div class="totals-row due">
          <span style="color: ${dueAmount > 0 ? '#dc2626' : '#16a34a'};">Handover Balance Due</span>
          <strong style="color: ${dueAmount > 0 ? '#dc2626' : '#16a34a'};">₹${dueAmount.toLocaleString('en-IN')}.00</strong>
        </div>
      </div>
    </div>

    ${getInvoiceFooterHTML(companyLegal)}
  </div>
  ${getInvoiceScriptHTML(shortBookingId, cleanPhone)}
</body>
</html>`;
  }

  // ============================================================
  // 2. WEEKLY / MONTHLY RENT PAYMENT RECEIPT TEMPLATE (RNT)
  // ============================================================
  if (type === 'rent_payment') {
    const paidAmount = parseFloat(data.amount || data.paid_amount || data.total_cost || 1600);
    const paymentDate = data.payment_date || data.date || Date.now();
    const formattedDate = formatIndianDate(paymentDate);
    const billingTime = formatIndianTime(paymentDate);
    const receiptId = getShortBookingId(data.receipt_id || data.id, 'RNT');
    const cleanPhone = data.user_phone || data.phone || '';
    const vehicleCode = data.vehicle_id || data.vehicleId || 'LT001';
    const planName = data.plan_name || (paidAmount >= 5000 ? 'Monthly Commuter Pass' : 'Weekly Pass (7 Days)');
    const weeksCount = data.weeks_count || data.cycle_count || 1;
    const nextDueDate = formatIndianDate(data.next_payment_date || data.nextDueDate || (new Date(Date.now() + 7 * 86400000)));
    const paymentMode = (data.payment_mode || data.mode || 'cash').toUpperCase();
    const depositBal = parseFloat(data.deposit_balance || data.security_deposit || 3500);

    const title = `Rent Payment Receipt — ${data.user_name || 'Rider'} (${receiptId})`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>${getCommonCSS()}</style>
</head>
<body>
  ${getActionBarHTML(receiptId, 'Rent Payment Receipt')}
  <div class="invoice-wrapper" id="printable-invoice">
    ${getBrandHeaderHTML(logoUrl, companyLegal, companyAddress, receiptId, formattedDate, billingTime)}
    
    <div class="meta-grid">
      <div class="meta-col">
        <h4>Rider Information</h4>
        <div class="meta-item">Rider Name: <strong>${data.user_name || data.name || 'Rider'}</strong></div>
        <div class="meta-item">Mobile: <strong style="font-family: monospace;">${cleanPhone || 'N/A'}</strong></div>
        <div class="meta-item">Assigned Vehicle: <strong style="color: #0284c7; font-size: 14px;">${vehicleCode}</strong></div>
      </div>
      <div class="meta-col">
        <h4>Subscription & Rental Cycle</h4>
        <div class="meta-item">Plan: <strong>${planName}</strong></div>
        <div class="meta-item">Payment Mode: <strong>${paymentMode}</strong></div>
        <div class="meta-item">Next Payment Due: <strong style="color: #16a34a; font-size: 14px;">${nextDueDate}</strong></div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 70%;">Billing Description</th>
            <th class="text-right" style="width: 30%;">Amount Collected (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${planName} — Cycle Renewal (${weeksCount} Cycle${weeksCount > 1 ? 's' : ''})</div>
              <div style="font-size: 11px; color: #64748b;">Vehicle rental subscription extension for EV Scooter ${vehicleCode}.</div>
            </td>
            <td class="text-right" style="font-weight: 600;">₹${paidAmount.toLocaleString('en-IN')}.00</td>
          </tr>
          <tr style="font-weight: 700; font-size: 15px; background: #f8fafc;">
            <td style="color: #0f172a;">Total Rent Collected</td>
            <td class="text-right" style="color: #16a34a; font-size: 16px;">₹${paidAmount.toLocaleString('en-IN')}.00</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-grid">
      <div class="payment-notes">
        <h5>Rental Policy & Due Dates:</h5>
        <ul>
          <li>Payment received and rental period extended up to <strong>${nextDueDate}</strong>.</li>
          <li>Active refundable security deposit balance on record: <strong>₹${depositBal.toLocaleString('en-IN')}.00</strong>.</li>
          <li>Timely weekly renewal avoids penalties and uninterrupted scooter usage.</li>
        </ul>
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Rental Cycle Fee</span>
          <span>₹${paidAmount.toLocaleString('en-IN')}.00</span>
        </div>
        <div class="totals-row highlight" style="background: #f0fdf4;">
          <span style="color: #16a34a;">Status</span>
          <strong style="color: #16a34a;">PAID & CONFIRMED</strong>
        </div>
        <div class="totals-row due">
          <span>Next Due Date</span>
          <strong style="color: #0284c7;">${nextDueDate}</strong>
        </div>
      </div>
    </div>

    ${getInvoiceFooterHTML(companyLegal)}
  </div>
  ${getInvoiceScriptHTML(receiptId, cleanPhone)}
</body>
</html>`;
  }

  // ============================================================
  // 3. BOOKING CONFIRM & VEHICLE HANDOVER RECEIPT TEMPLATE (RNT)
  // ============================================================
  if (type === 'booking_confirm') {
    const totalPackage = 5100;
    const paidAmount = parseFloat(data.total_cost || data.collected_amount || data.paid_amount || 0);

    // Accurately resolve advance_paid and handover_amount
    let advancePaid = data.advance_paid !== undefined && data.advance_paid !== null ? parseFloat(data.advance_paid) : null;
    let handoverCollected = data.handover_amount !== undefined && data.handover_amount !== null ? parseFloat(data.handover_amount) : null;

    if (advancePaid === null || handoverCollected === null) {
      const rem = data.remarks || '';
      const hMatch = rem.match(/Handover balance collected.*?₹\s*(\d+)/i);
      if (hMatch) {
        handoverCollected = parseFloat(hMatch[1]);
        if (advancePaid === null) advancePaid = Math.max(0, paidAmount - handoverCollected);
      } else if (data.status === 'pre_booking' || !data.vehicle_id) {
        advancePaid = paidAmount;
        handoverCollected = 0;
      } else if (paidAmount <= 2500) {
        advancePaid = paidAmount;
        handoverCollected = 0;
      } else {
        advancePaid = 1500;
        handoverCollected = Math.max(0, paidAmount - 1500);
      }
    }

    if (advancePaid === null) advancePaid = 1500;
    if (handoverCollected === null) handoverCollected = Math.max(0, paidAmount - advancePaid);
    const totalReceived = advancePaid + handoverCollected;
    const dueAmount = Math.max(0, totalPackage - totalReceived);

    const advanceDate = data.pre_booking_date || data.advance_date || data.created_at || data.start_time;
    const formattedAdvanceDate = advanceDate ? formatIndianDate(advanceDate) : 'Confirmed';
    const handoverDate = data.assignment_date || data.start_time || data.date || Date.now();
    const formattedHandoverDate = formatIndianDate(handoverDate);
    const handoverBillingTime = formatIndianTime(handoverDate);
    
    // Distinct IDs for Advance Booking (BKG-...) vs Vehicle Handover Agreement (HND-...)
    const advanceBookingId = data.advance_booking_id || data.booking_id || (data.id && data.id.startsWith('BKG-') ? data.id : `BKG-${(data.id || '').replace(/\D/g, '') || '1001'}`);
    const handoverId = data.handover_id || (data.id && data.id.startsWith('HND-') ? data.id : `HND-${(data.id || '').replace(/\D/g, '') || Date.now().toString().slice(-6)}`);
    
    const cleanPhone = data.user_phone || data.phone || '';
    const vehicleCode = data.vehicle_name || data.vehicle_id || data.vehicleId || 'LT025';
    const vehicleModel = data.vehicle_model || data.model || 'LT Commercial EV';
    const standLocation = data.location || data.stand || 'Khajpura Stand';
    const nextDueDate = formatIndianDate(new Date(new Date(handoverDate).getTime() + 7 * 86400000));
    
    // Payment mode & breakdown notes
    const advancePaymentMode = (data.advance_payment_mode || (data.status === 'pre_booking' ? data.payment_mode : '') || 'Cash').toUpperCase();
    const advanceNotes = data.advance_remarks || (data.remarks && !data.remarks.includes('Handover') ? data.remarks : '') || '';
    const handoverPaymentMode = (data.handover_payment_mode || data.payment_mode || 'Cash').toUpperCase();
    const handoverNotes = data.handover_remarks || (data.remarks && data.remarks.includes('Handover') ? data.remarks : '') || '';

    const title = `Vehicle Handover Agreement — ${data.user_name || 'Rider'} (${vehicleCode})`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>${getCommonCSS()}</style>
</head>
<body>
  ${getActionBarHTML(handoverId, 'Vehicle Handover Agreement')}
  <div class="invoice-wrapper" id="printable-invoice">
    ${getBrandHeaderHTML(logoUrl, companyLegal, companyAddress, handoverId, formattedHandoverDate, handoverBillingTime)}
    
    <div class="meta-grid">
      <div class="meta-col">
        <h4>Rider & Advance Reservation</h4>
        <div class="meta-item">Rider Name: <strong>${data.user_name || data.name || 'Rider'}</strong></div>
        <div class="meta-item">Mobile: <strong style="font-family: monospace;">${cleanPhone || 'N/A'}</strong></div>
        <div class="meta-item">Advance Booking ID: <strong style="font-family: monospace; color: #0284c7;">${advanceBookingId}</strong></div>
        <div class="meta-item">Advance Booking Date: <strong>${formattedAdvanceDate}</strong></div>
        <div class="meta-item">Advance Payment Mode: <strong>${advancePaymentMode}</strong></div>
        <div class="meta-item">Advance Amount Paid: <strong style="color: #0284c7; font-size: 14px;">₹${advancePaid.toLocaleString('en-IN')}.00</strong></div>
        ${advanceNotes ? `<div class="meta-item" style="font-size: 11px; color: #64748b; margin-top: 4px;">Advance Note: <em>${advanceNotes}</em></div>` : ''}
      </div>
      <div class="meta-col">
        <h4>Handover & Vehicle Allocation</h4>
        <div class="meta-item">Handover Agreement ID: <strong style="font-family: monospace; color: #16a34a;">${handoverId}</strong></div>
        <div class="meta-item">Assigned EV: <strong style="color: #0284c7; font-size: 15px;">${vehicleCode}</strong> <span style="font-size: 11px; color: #64748b;">(${vehicleModel})</span></div>
        <div class="meta-item">Handover Place: <strong>${standLocation}</strong></div>
        <div class="meta-item">Handover Date & Time: <strong>${formattedHandoverDate}, ${handoverBillingTime}</strong></div>
        <div class="meta-item">Handover Payment Mode: <strong>${handoverPaymentMode}</strong></div>
        <div class="meta-item">Handover Amount Paid: <strong style="color: #16a34a; font-size: 14px;">₹${handoverCollected.toLocaleString('en-IN')}.00</strong></div>
        <div class="meta-item">1st Rent Renewal Due: <strong style="color: #16a34a;">${nextDueDate}</strong></div>
        ${handoverNotes ? `<div class="meta-item" style="font-size: 11px; color: #64748b; margin-top: 4px;">Handover Note: <em>${handoverNotes}</em></div>` : ''}
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 70%;">Package & Settlement Item</th>
            <th class="text-right" style="width: 30%;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a;">EV Security Deposit (Refundable)</div>
              <div style="font-size: 11px; color: #64748b;">Allocated security deposit balance for ${vehicleCode}.</div>
            </td>
            <td class="text-right" style="font-weight: 600;">₹3,500.00</td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: 700; color: #0f172a;">1st Week Rental Subscription Pass</div>
              <div style="font-size: 11px; color: #64748b;">Initial 7-day ride package starting from ${formattedHandoverDate} valid till ${nextDueDate}.</div>
            </td>
            <td class="text-right" style="font-weight: 600;">₹1,600.00</td>
          </tr>
          <tr>
            <td>
              <div style="color: #0284c7; font-weight: 700;">(-) Advance Booking Amount Paid</div>
              <div style="font-size: 11px; color: #64748b;">Advance reservation deposit paid on ${formattedAdvanceDate} via ${advancePaymentMode} (Ref: ${advanceBookingId}).</div>
            </td>
            <td class="text-right" style="color: #0284c7; font-weight: 700;">-₹${advancePaid.toLocaleString('en-IN')}.00</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td>
              <div style="color: #16a34a; font-weight: 700;">(-) Handover Balance Payment Collected</div>
              <div style="font-size: 11px; color: #64748b;">Balance handover collection on EV allocation (${formattedHandoverDate} • ${handoverPaymentMode}).</div>
            </td>
            <td class="text-right" style="color: #16a34a; font-weight: 700;">-₹${handoverCollected.toLocaleString('en-IN')}.00</td>
          </tr>
          ${dueAmount > 0 ? `
          <tr style="font-weight: 700; font-size: 13px; border-top: 2px solid #e2e8f0; background: #fff7ed;">
            <td>
              <div style="color: #c2410c;">Remaining Balance Due</div>
              <div style="font-size: 11px; color: #64748b; font-weight: normal;">Pending package collection balance</div>
            </td>
            <td class="text-right" style="color: #c2410c; font-size: 14px;">₹${dueAmount.toLocaleString('en-IN')}.00</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    <div class="summary-grid">
      <div class="payment-notes">
        <h5>Rider Undertaking & Terms:</h5>
        <ul>
          <li>Rider acknowledges receipt of EV <strong>${vehicleCode}</strong> (${vehicleModel}) in sound working condition with helmet, charger, and key.</li>
          <li>Rider agrees to drive safely, follow traffic regulations, and pay weekly renewal on or before <strong>${nextDueDate}</strong>.</li>
          <li>Security deposit (₹3,500) remains held in the driver ledger and is 100% refundable upon vehicle return subject to inspection.</li>
          <li>For helpline support & assistance, contact <strong>${helplinePhone}</strong>.</li>
        </ul>
      </div>

      <div class="totals-box">
        <div class="totals-row">
          <span>Total Package Cost</span>
          <span>₹5,100.00</span>
        </div>
        <div class="totals-row">
          <span style="color: #0284c7;">Advance Paid (${formattedAdvanceDate})</span>
          <strong style="color: #0284c7;">₹${advancePaid.toLocaleString('en-IN')}.00</strong>
        </div>
        <div class="totals-row">
          <span style="color: #16a34a;">Handover Collected (${formattedHandoverDate})</span>
          <strong style="color: #16a34a;">₹${handoverCollected.toLocaleString('en-IN')}.00</strong>
        </div>
        <div class="totals-row highlight" style="background: #f0fdf4;">
          <span style="color: #16a34a;">Total Payment Received</span>
          <strong style="color: #16a34a;">₹${totalReceived.toLocaleString('en-IN')}.00</strong>
        </div>
        ${dueAmount > 0 ? `
        <div class="totals-row due">
          <span style="color: #dc2626;">Remaining Due</span>
          <strong style="color: #dc2626;">₹${dueAmount.toLocaleString('en-IN')}.00</strong>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="invoice-bottom-section">
      <div class="sign-section">
        <div style="text-align: left;">
          <div class="sign-line" style="margin-left: 0;"></div>
          <div class="sign-label">Rider Signature / Acknowledgement</div>
        </div>

        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-label">Authorized Dispatcher (LocalToto)</div>
        </div>
      </div>

      <div class="footer-note">
        ${companyLegal} • www.ltev.in • Helpline: ${helplinePhone}
      </div>
    </div>

  </div>
  ${getInvoiceScriptHTML(handoverId, cleanPhone)}
</body>
</html>`;
  }

  // ============================================================
  // 4. WORKSHOP SERVICE & PARTS REPLACEMENT INVOICE TEMPLATE (SER)
  // ============================================================
  if (type === 'service_parts') {
    const serviceCost = parseFloat(data.cost || data.total_cost || 0);
    const serviceDate = data.date_reported || data.service_date || data.date || Date.now();
    const formattedDate = formatIndianDate(serviceDate);
    const serviceId = getShortBookingId(data.id || data.service_id, 'SER');
    const vehicleCode = data.vehicle_id || data.vehicleId || 'LT014';
    const riderName = data.user_name || data.rider_name || data.name || 'Company Fleet Maintenance';
    const cleanPhone = data.user_phone || data.phone || '';
    const serviceType = data.service_type || 'General Periodic Service & Tuning';
    const issueDesc = data.issue_description || 'Front brake shoe replaced, chain adjustment & inspection.';
    const billedTo = (data.billed_to || 'rider').toUpperCase();
    const paymentStatus = (data.payment_status || 'paid').toUpperCase();
    const isRiderBilled = billedTo === 'RIDER';

    // Parse itemized parts and charges
    let items = [];
    if (Array.isArray(data.items_breakdown) && data.items_breakdown.length > 0) {
      items = data.items_breakdown.map((it, idx) => ({
        sno: idx + 1,
        name: it.name || it.item_name || 'Service Component',
        type: it.type || (it.is_labor ? 'Labor Charge' : 'Spare Part'),
        qty: parseInt(it.qty || it.quantity || 1, 10),
        rate: parseFloat(it.rate || it.price || it.amount || 0),
        amount: parseFloat(it.amount || ((it.qty || 1) * (it.rate || it.price || 0)))
      }));
    } else if (typeof data.items_breakdown === 'string') {
      try {
        const parsed = JSON.parse(data.items_breakdown);
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed.map((it, idx) => ({
            sno: idx + 1,
            name: it.name || it.item_name || 'Service Component',
            type: it.type || (it.is_labor ? 'Labor Charge' : 'Spare Part'),
            qty: parseInt(it.qty || it.quantity || 1, 10),
            rate: parseFloat(it.rate || it.price || it.amount || 0),
            amount: parseFloat(it.amount || ((it.qty || 1) * (it.rate || it.price || 0)))
          }));
        }
      } catch (e) {}
    }

    // Fallback: If no structured items_breakdown, parse from parts_replaced string
    if (items.length === 0 && data.parts_replaced) {
      const partsArr = String(data.parts_replaced).split(',').map(s => s.trim()).filter(Boolean);
      let calculatedSum = 0;
      partsArr.forEach((partStr, idx) => {
        let cleanName = partStr;
        let qty = 1;
        let amt = 0;

        const qtyMatch = cleanName.match(/^(\d+)\s*[xX*]?\s+(.+)$/);
        if (qtyMatch) {
          qty = parseInt(qtyMatch[1], 10) || 1;
          cleanName = qtyMatch[2].trim();
        }

        const amtMatch = cleanName.match(/₹\s*([\d,.]+)/);
        if (amtMatch) {
          amt = parseFloat(amtMatch[1].replace(/,/g, '')) || 0;
          cleanName = cleanName.replace(/\s*\(\s*₹\s*[\d,.]+\s*\)/gi, '').trim();
        }

        calculatedSum += amt;
        items.push({
          sno: idx + 1,
          name: cleanName || 'Spare Part',
          type: 'Spare Part',
          qty: qty,
          rate: amt > 0 ? (amt / qty) : 0,
          amount: amt
        });
      });

      const diff = serviceCost - calculatedSum;
      if (diff > 0) {
        items.push({
          sno: items.length + 1,
          name: `${serviceType} — Workshop Labor & Inspection Charge`,
          type: 'Labor & Service',
          qty: 1,
          rate: diff,
          amount: diff
        });
      }
    }

    if (items.length === 0) {
      items.push({
        sno: 1,
        name: serviceType,
        type: 'General Service',
        qty: 1,
        rate: serviceCost,
        amount: serviceCost
      });
    }

    const partsTotal = items.filter(it => it.type === 'Spare Part').reduce((a, b) => a + b.amount, 0);
    const laborTotal = items.filter(it => it.type !== 'Spare Part').reduce((a, b) => a + b.amount, 0);
    const totalAmount = items.reduce((a, b) => a + b.amount, 0) || serviceCost;

    const title = `Service Invoice — EV ${vehicleCode} (${serviceId})`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <style>${getCommonCSS()}</style>
</head>
<body>
  ${getActionBarHTML(serviceId, 'Service & Repair Invoice')}
  <div class="invoice-wrapper" id="printable-invoice">
    ${getBrandHeaderHTML(logoUrl, companyLegal, companyAddress, serviceId, formattedDate, '12:00')}
    
    <div class="meta-grid">
      <div class="meta-col">
        <h4>Vehicle & Customer Details</h4>
        <div class="meta-item">Billed To: <strong>${riderName}</strong></div>
        <div class="meta-item">Mobile: <strong style="font-family: monospace;">${cleanPhone || 'N/A'}</strong></div>
        <div class="meta-item">Vehicle Number: <strong style="color: #0284c7; font-size: 14px;">${vehicleCode}</strong></div>
        <div class="meta-item">Service Category: <strong>${serviceType}</strong></div>
      </div>
      <div class="meta-col">
        <h4>Job Card & Payment Status</h4>
        <div class="meta-item">Job Card ID: <strong style="font-family: monospace;">${serviceId}</strong></div>
        <div class="meta-item">Service Date: <strong>${formattedDate}</strong></div>
        <div class="meta-item">Billed To: <strong>${isRiderBilled ? 'Rider Account' : 'Company Fleet Expense'}</strong></div>
        <div class="meta-item">Payment Status: <strong style="color: ${paymentStatus === 'PAID' ? '#16a34a' : '#dc2626'};">${paymentStatus === 'PAID' ? 'PAID & SETTLED' : 'PENDING'}</strong></div>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th style="width: 8%;">#</th>
            <th style="width: 46%;">Replaced Components & Service Items</th>
            <th style="width: 18%;">Category / Type</th>
            <th class="text-center" style="width: 10%;">Qty</th>
            <th class="text-right" style="width: 18%;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
          <tr>
            <td style="color: #64748b; font-weight: 600;">${it.sno}</td>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${it.name}</div>
              <div style="font-size: 11px; color: #64748b;">Genuine replacement component / workshop maintenance labor.</div>
            </td>
            <td>
              <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: ${it.type === 'Spare Part' ? '#e0f2fe' : '#f1f5f9'}; color: ${it.type === 'Spare Part' ? '#0369a1' : '#475569'};">
                ${it.type}
              </span>
            </td>
            <td class="text-center" style="font-weight: 600; color: #0f172a;">${it.qty}</td>
            <td class="text-right" style="font-weight: 700; color: #0f172a;">₹${it.amount.toLocaleString('en-IN')}.00</td>
          </tr>
          `).join('')}
          <tr style="font-weight: 800; font-size: 15px; background: #f8fafc; border-top: 2px solid #e2e8f0;">
            <td colspan="4" style="color: #0f172a; text-align: right; padding-right: 16px;">Total Invoice Amount</td>
            <td class="text-right" style="color: #16a34a; font-size: 16px;">₹${totalAmount.toLocaleString('en-IN')}.00</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="summary-grid">
      <div class="payment-notes">
        <h5>Warranty & Maintenance Notes:</h5>
        <ul>
          <li>Fitted components carry a 7-day workshop service warranty against manufacturing defects.</li>
          <li>Service done for EV <strong>${vehicleCode}</strong>. Issue: <em>${issueDesc}</em></li>
          <li>For any performance queries, visit authorized LocalToto Stand Workshop.</li>
          <li>Helpline: <strong>${helplinePhone}</strong></li>
        </ul>
      </div>

      <div class="totals-box">
        ${partsTotal > 0 ? `
        <div class="totals-row">
          <span>Spare Parts Total</span>
          <span>₹${partsTotal.toLocaleString('en-IN')}.00</span>
        </div>` : ''}
        ${laborTotal > 0 ? `
        <div class="totals-row">
          <span>Labor & Workshop Charges</span>
          <span>₹${laborTotal.toLocaleString('en-IN')}.00</span>
        </div>` : ''}
        <div class="totals-row" style="border-top: 1px solid #e2e8f0; font-weight: 800; font-size: 15px;">
          <span>Grand Total</span>
          <span style="color: #16a34a;">₹${totalAmount.toLocaleString('en-IN')}.00</span>
        </div>
        <div class="totals-row highlight" style="background: ${paymentStatus === 'PAID' ? '#f0fdf4' : '#fff7ed'};">
          <span style="color: ${paymentStatus === 'PAID' ? '#16a34a' : '#ea580c'};">Status</span>
          <strong style="color: ${paymentStatus === 'PAID' ? '#16a34a' : '#ea580c'};">${paymentStatus === 'PAID' ? 'PAID & SETTLED' : 'PENDING'}</strong>
        </div>
      </div>
    </div>

    <div class="invoice-bottom-section">
      <div class="sign-section">
        <div class="company-stamp">
          <div><strong>Wheely Buzz Localtoto Transport Solution Private Limited</strong></div>
          <div>Authorized Workshop Maintenance Center • Patna</div>
        </div>

        <div class="sign-box">
          <div class="sign-line"></div>
          <div class="sign-label">Technician / Stand Manager Sign</div>
        </div>
      </div>

      <div class="footer-note">
        ${companyLegal} • www.ltev.in • Helpline: ${helplinePhone}
      </div>
    </div>

  </div>
  ${getInvoiceScriptHTML(serviceId, cleanPhone)}
</body>
</html>`;
  }

  // Default Fallback
  return `<!DOCTYPE html><html><body>Invalid Template</body></html>`;
};

// Common Brand Header Builder (WITHOUT the badge title text)
const getBrandHeaderHTML = (logoUrl, legalName, address, refCode, dateStr, timeStr) => `
  <div class="brand-header">
    <div class="brand-left">
      <div class="brand-logo-wrap">
        <img src="${logoUrl}" alt="LT Logo" class="brand-logo" onerror="this.style.display='none'" />
        <span class="brand-logo-ev">EV</span>
      </div>
      <div>
        <div class="brand-legal">${legalName}</div>
        <div class="brand-contact">${address}</div>
      </div>
    </div>
    <div class="invoice-badge-box">
      <div class="invoice-number">${refCode}</div>
      <div class="invoice-date">Date: ${dateStr}${timeStr ? `, ${timeStr}` : ''}</div>
    </div>
  </div>
`;

// Common Top Action Bar (WITHOUT emojis/icons)
const getActionBarHTML = (refId, label) => `
  <div class="action-bar">
    <div class="action-bar-title">
      <span>LT EV — ${label}</span>
      <span class="action-bar-badge">${refId}</span>
    </div>
    <div class="action-buttons">
      <button class="btn btn-pdf" onclick="downloadPDF()">
        Download PDF
      </button>
      <button class="btn btn-whatsapp" onclick="shareOnWhatsApp()">
        Share on WhatsApp
      </button>
      <button class="btn btn-print" onclick="window.print()">
        Print Receipt
      </button>
      <button class="btn btn-close" onclick="window.close()">
        Close
      </button>
    </div>
  </div>
`;

// Common Footer Notes
const getInvoiceFooterHTML = (companyLegal) => `
  <div class="invoice-bottom-section">
    <div class="sign-section">
      <div class="company-stamp">
        <div><strong>${companyLegal}</strong></div>
        <div>Brand: <strong>LT EV</strong> • Official Computer-Generated Document.</div>
      </div>

      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-label">Authorized Signatory</div>
      </div>
    </div>

    <div class="footer-note">
      ${companyLegal} • www.ltev.in • Helpline: +91 78705 7249
    </div>
  </div>
`;

// Common Script block for PDF & WhatsApp
const getInvoiceScriptHTML = (refId, targetPhone = '') => `
  <script>
    function downloadPDF() {
      const element = document.getElementById('printable-invoice');
      const opt = {
        margin: [10, 10, 10, 10],
        filename: 'LT_EV_${refId}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      if (window.html2pdf) {
        html2pdf().set(opt).from(element).save();
      } else {
        window.print();
      }
    }

    async function shareOnWhatsApp() {
      const targetPhone = "${targetPhone}";
      downloadPDF();

      let finalPhone = targetPhone;
      if (!finalPhone) {
        finalPhone = prompt('Enter customer WhatsApp number (10 digits):', '');
      }

      const msg = encodeURIComponent("Here is your official LT EV receipt / invoice (" + "${refId}" + "). Thank you for choosing LocalToto EV!");
      if (finalPhone) {
        const cleanNum = finalPhone.replace(/\\D/g, '').slice(-10);
        window.open('https://wa.me/91' + cleanNum + '?text=' + msg, '_blank');
      } else {
        window.open('https://api.whatsapp.com/send?text=' + msg, '_blank');
      }
    }
  </script>
`;

// Common CSS Rules
const getCommonCSS = () => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    line-height: 1.5;
    padding: 0;
  }
  .action-bar {
    position: sticky;
    top: 0;
    background: #0f172a;
    color: #ffffff;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 100;
  }
  .action-bar-title {
    font-size: 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .action-bar-badge {
    background: #0284c7;
    color: #ffffff;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 700;
  }
  .action-buttons {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    text-decoration: none;
    transition: all 0.15s ease;
  }
  .btn-pdf { background: #0284c7; color: #ffffff; }
  .btn-pdf:hover { background: #0369a1; }
  .btn-whatsapp { background: #22c55e; color: #ffffff; }
  .btn-whatsapp:hover { background: #16a34a; }
  .btn-print { background: #ffffff; color: #0f172a; }
  .btn-print:hover { background: #e2e8f0; }
  .btn-close { background: #334155; color: #ffffff; }
  .btn-close:hover { background: #475569; }

  .invoice-wrapper {
    max-width: 820px;
    min-height: 1040px;
    margin: 24px auto 40px auto;
    background: #ffffff;
    padding: 36px 42px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    border: 1px solid #cbd5e1;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .invoice-bottom-section {
    margin-top: auto;
    padding-top: 26px;
  }
  .brand-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .brand-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .brand-logo-wrap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .brand-logo {
    height: 48px;
    width: auto;
    object-fit: contain;
    display: block;
  }
  .brand-logo-ev {
    font-size: 44px;
    font-weight: 800;
    color: #16a34a;
    letter-spacing: -0.5px;
    line-height: 1;
    display: inline-block;
  }
  .brand-legal {
    font-size: 15px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.2px;
    line-height: 1.25;
  }
  .brand-contact {
    font-size: 12px;
    color: #475569;
    margin-top: 3px;
    font-weight: 500;
  }
  .invoice-badge-box {
    text-align: right;
    flex-shrink: 0;
  }
  .invoice-number {
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    font-family: monospace;
    letter-spacing: 0.5px;
  }
  .invoice-date {
    font-size: 11px;
    color: #64748b;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 14px 18px;
    margin-bottom: 16px;
  }
  .meta-col h4 {
    font-size: 11px;
    text-transform: uppercase;
    color: #64748b;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .meta-item {
    font-size: 13px;
    color: #1e293b;
    margin-bottom: 3px;
  }
  .table-container {
    margin-bottom: 20px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th {
    background: #f8fafc;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid #cbd5e1;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.3px;
  }
  td {
    padding: 11px 12px;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
  }
  .text-right { text-align: right; }
  .text-center { text-align: center; }

  .summary-grid {
    display: grid;
    grid-template-columns: 1.15fr 1fr;
    gap: 18px;
    margin-bottom: 22px;
  }
  .payment-notes {
    font-size: 12px;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 12px 14px;
  }
  .payment-notes h5 {
    font-size: 12px;
    color: #0f172a;
    margin-bottom: 4px;
    font-weight: 700;
  }
  .payment-notes ul {
    padding-left: 16px;
    line-height: 1.5;
  }
  .totals-box {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 9px 14px;
    font-size: 13px;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
  }
  .totals-row.highlight {
    font-weight: 700;
    font-size: 14px;
  }
  .totals-row.due {
    font-weight: 700;
    font-size: 14px;
    border-bottom: none;
  }
  .sign-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .company-stamp {
    font-size: 11px;
    color: #64748b;
  }
  .sign-box {
    text-align: right;
  }
  .sign-line {
    width: 180px;
    border-bottom: 1px solid #94a3b8;
    margin-bottom: 6px;
    margin-left: auto;
  }
  .sign-label {
    font-size: 12px;
    font-weight: 700;
    color: #334155;
  }
  .footer-note {
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 20px;
    border-top: 1px solid #f1f5f9;
    padding-top: 10px;
  }
  @media print {
    body { background: #ffffff !important; }
    .action-bar { display: none !important; }
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    .invoice-wrapper {
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      max-width: 100% !important;
      min-height: 270mm !important;
      display: flex !important;
      flex-direction: column !important;
    }
    .invoice-bottom-section {
      margin-top: auto !important;
      padding-top: 26px !important;
    }
  }
`;

// Universal Window Opener
export const handleOpenInvoiceWindow = (data, templateType = 'advance_booking') => {
  const htmlContent = getInvoiceHTML(templateType, data);
  const invoiceWin = window.open('', '_blank', 'width=900,height=980,menubar=no,toolbar=no,location=no,status=no');
  if (!invoiceWin) {
    alert('Pop-up blocked! Please allow pop-ups in your browser to view the receipt/invoice.');
    return;
  }
  invoiceWin.document.open();
  invoiceWin.document.write(htmlContent);
  invoiceWin.document.close();
};

export const openAdvanceBookingInvoice = (data) => handleOpenInvoiceWindow(data, 'advance_booking');
export const openRentPaymentInvoice = (data) => handleOpenInvoiceWindow(data, 'rent_payment');
export const openHandoverInvoice = (data) => handleOpenInvoiceWindow(data, 'booking_confirm');
export const openServiceInvoice = (data) => handleOpenInvoiceWindow(data, 'service_parts');
