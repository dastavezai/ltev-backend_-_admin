import React from 'react';
import { Printer, Share2, X, CheckCircle, ShieldCheck, Bike, CreditCard, Phone, Mail, MapPin, Globe } from 'lucide-react';

export default function ReceiptModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = (data.riderPhone || '').replace(/\D/g, '').slice(-10);
    const receiptText = `*🧾 LT EV MOBILITY - PAYMENT RECEIPT*
----------------------------------------
*Receipt No:* ${data.receiptNumber || 'REC-' + Math.floor(100000 + Math.random() * 900000)}
*Date:* ${data.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}

*👤 RIDER DETAILS:*
*Name:* ${data.riderName || 'Rider'}
*Phone:* ${data.riderPhone || 'N/A'}

*🛵 VEHICLE & PLAN:*
*EV Assigned:* ${data.vehicleModel || 'LT.ev Scooter'} (${data.vehicleId || 'EV'})
*Plan:* ${data.planName || 'Standard Rental'} ${data.planType ? `(${data.planType})` : ''}
*Coverage Period:* ${data.startDate || 'N/A'} to ${data.endDate || data.nextDueDate || 'Ongoing'}

*💰 PAYMENT SUMMARY:*
*Amount Paid:* ₹${parseFloat(data.amountPaid || 0).toLocaleString('en-IN')}
*Payment Status:* PAID & VERIFIED (✓)
${data.depositAmount ? `*Security Deposit Balance:* ₹${parseFloat(data.depositAmount).toLocaleString('en-IN')}` : ''}
${data.remarks ? `*Remarks:* ${data.remarks}` : ''}

----------------------------------------
_Thank you for choosing LT EV Mobility!_
_Support: +91 9113750231 | https://ltev.in_`;

    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(receiptText)}`;
    window.open(url, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print" style={{
          padding: '16px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>Official Rental & Payment Receipt</span>
            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>VERIFIED</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleWhatsAppShare}
              style={{
                background: '#25D366',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Share2 size={15} /> WhatsApp
            </button>

            <button
              onClick={handlePrint}
              style={{
                background: '#0f172a',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={15} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div id="printable-receipt" style={{ padding: '36px 40px', background: 'white', color: '#0f172a' }}>
          {/* Company Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '24px', borderBottom: '2px solid #0f172a', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{ background: '#00a66c', color: 'white', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '18px' }}>
                  LT
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>LT EV MOBILITY</h1>
              </div>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Smart Urban Electric Mobility Solutions</p>
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#475569', lineHeight: '1.5' }}>
                <div>📍 Bailey Road, Khajpura, Patna, Bihar - 800014</div>
                <div>📞 +91 9113750231 &bull; ✉ support@ltev.in &bull; 🌐 https://ltev.in</div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Receipt / Voucher No.</div>
                <div style={{ fontSize: '16px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a', marginTop: '2px' }}>
                  {data.receiptNumber || 'REC-' + Math.floor(100000 + Math.random() * 900000)}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  Date: <strong>{data.date || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Rider & Vehicle 2-Column Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                👤 Customer / Rider Details
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{data.riderName || 'Rider'}</div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>📞 Mobile: <strong>{data.riderPhone || 'N/A'}</strong></div>
              {data.riderEmail && data.riderEmail !== 'N/A' && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>✉ Email: {data.riderEmail}</div>
              )}
              {data.riderId && (
                <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', marginTop: '4px' }}>ID: {data.riderId}</div>
              )}
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>
                🛵 Vehicle & Subscription
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>{data.vehicleModel || 'LT.ev Scooter'}</div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                EV Registration / ID: <strong style={{ fontFamily: 'monospace', color: '#00a66c' }}>{data.vehicleId || 'Not Assigned'}</strong>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Plan: <strong>{data.planName || 'Standard Rental'}</strong> {data.planType ? `(${data.planType})` : ''}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Period: <strong>{data.startDate || 'N/A'}</strong> to <strong>{data.endDate || data.nextDueDate || 'Active'}</strong>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: '24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#0f172a', color: 'white' }}>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', borderRadius: '8px 0 0 8px' }}>Description</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', textAlign: 'center' }}>Plan / Type</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', textAlign: 'right', borderRadius: '0 8px 8px 0' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '14px', fontSize: '13px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>
                      {data.type === 'deposit' ? 'Security Deposit (Refundable)' : `${data.planName || 'Rental Booking'} - EV Subscription`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {data.type === 'deposit' ? 'Security deposit held in rider wallet as per terms.' : `Vehicle rental charges covering ${data.startDate || 'start'} to ${data.endDate || data.nextDueDate || 'period'}.`}
                    </div>
                  </td>
                  <td style={{ padding: '14px', fontSize: '13px', textAlign: 'center', color: '#475569' }}>
                    {data.planType || (data.type === 'deposit' ? 'Deposit' : 'Custom')}
                  </td>
                  <td style={{ padding: '14px', fontSize: '14px', fontWeight: '800', textAlign: 'right', color: '#0f172a' }}>
                    ₹{parseFloat(data.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>

                {data.depositAmount && data.type !== 'deposit' && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: '#475569' }}>
                      Security Deposit Recorded on Account
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', textAlign: 'center', color: '#64748b' }}>
                      Deposit
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '700', textAlign: 'right', color: '#64748b' }}>
                      ₹{parseFloat(data.depositAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Paid)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Total Box */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#f0fdf4', borderRadius: '12px', border: '1.5px solid #bbf7d0', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '13px', fontWeight: '800' }}>
                <CheckCircle size={16} /> PAYMENT STATUS: FULLY RECEIVED
              </div>
              <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                Payment Mode: <strong>{data.paymentMode || 'Cash / UPI Online'}</strong> &bull; Authorized by LT EV Admin
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase' }}>Total Amount Paid</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#15803d' }}>
                ₹{parseFloat(data.amountPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Terms & Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px', alignItems: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '10px', color: '#64748b', lineHeight: '1.5' }}>
              <strong>Terms & Conditions:</strong>
              <div>1. All rental subscriptions must be paid in advance.</div>
              <div>2. The rider is responsible for vehicle safety and adhering to traffic rules.</div>
              <div>3. Security deposits are 100% refundable upon vehicle return in good condition.</div>
              <div>4. This is a computer-generated receipt issued by LT EV Mobility.</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', border: '1.5px dashed #00a66c', padding: '8px 16px', borderRadius: '8px', background: 'rgba(0, 166, 108, 0.05)' }}>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#00a66c' }}>✓ DIGITALLY VERIFIED</div>
                <div style={{ fontSize: '10px', color: '#0f172a', fontWeight: '700' }}>LT EV MOBILITY PVT LTD</div>
                <div style={{ fontSize: '9px', color: '#64748b' }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
