import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Bike, 
  Lock, 
  User, 
  KeyRound, 
  ArrowRight, 
  FileText, 
  Phone, 
  Mail, 
  MapPin, 
  ExternalLink, 
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Sparkles
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [targetPortal, setTargetPortal] = useState('management'); // 'management' | 'admin'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState(null); // 'terms' | 'privacy' | 'refund' | 'contact' | 'public_plans'

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (result && result.success) {
      if (result.role === 'manager' || targetPortal === 'management') {
        navigate('/management');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result?.error || 'Invalid username or password');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      background: '#ffffff',
      color: '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Top Header Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 36px',
        borderBottom: '1px solid #f1f5f9',
        background: '#ffffff',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: '#00a66c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0, 166, 108, 0.25)'
          }}>
            <Bike size={22} color="#ffffff" strokeWidth={2.4} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.4px', color: '#0f172a' }}>
                LT<span style={{ color: '#00a66c' }}>.ev</span>
              </span>
              <span style={{
                background: '#ecfdf5',
                color: '#059669',
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                Commercial Fleet
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              WheelyBuzz LocalToto Private Limited
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a
            href="https://ltev.in"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#0f172a',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: '600'
            }}
          >
            <span>Public Website</span>
            <ExternalLink size={14} color="#64748b" />
          </a>

          <button
            onClick={() => setActiveLegalModal('contact')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              border: 'none',
              color: '#334155',
              padding: '7px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Phone size={13} color="#00a66c" /> Contact Support
          </button>
        </div>
      </header>

      {/* Main Two-Column Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 36px',
        gap: '64px',
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        
        {/* LEFT COLUMN: Clean & Minimal Admin Login Form */}
        <div style={{
          flex: '1 1 420px',
          maxWidth: '430px',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.3px' }}>
              Operations Portal
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.45' }}>
              Sign in to manage fleet assets, rider KYC verification, and operations.
            </p>
          </div>

          {/* Minimal Portal Switcher Tabs */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              onClick={() => { setTargetPortal('management'); setUsername('manager'); setPassword('manager123'); }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '9px',
                border: 'none',
                background: targetPortal === 'management' ? '#ffffff' : 'transparent',
                color: targetPortal === 'management' ? '#0f172a' : '#64748b',
                fontWeight: targetPortal === 'management' ? '700' : '500',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: targetPortal === 'management' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Management Portal
            </button>
            <button
              type="button"
              onClick={() => { setTargetPortal('admin'); setUsername('admin'); setPassword('admin123'); }}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '9px',
                border: 'none',
                background: targetPortal === 'admin' ? '#ffffff' : 'transparent',
                color: targetPortal === 'admin' ? '#0f172a' : '#64748b',
                fontWeight: targetPortal === 'admin' ? '700' : '500',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: targetPortal === 'admin' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Admin Operations
            </button>
          </div>

          {error && (
            <div style={{
              color: '#dc2626',
              background: '#fef2f2',
              padding: '10px 14px',
              borderRadius: '10px',
              marginBottom: '18px',
              fontSize: '12.5px',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>
                Username / Staff ID
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or manager"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', fontWeight: '600', color: '#334155' }}>
                Password
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 42px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#f8fafc',
                    color: '#0f172a',
                    fontSize: '13.5px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '14px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: '#00a66c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 166, 108, 0.3)',
                transition: 'background 0.2s ease'
              }}
            >
              {loading ? 'Authenticating...' : (
                <>
                  <span>Sign In to {targetPortal === 'management' ? 'Management' : 'Admin'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Minimal Security Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #f1f5f9',
            fontSize: '11.5px',
            color: '#94a3b8'
          }}>
            <ShieldCheck size={14} color="#00a66c" />
            <span>256-Bit SSL Encrypted Enterprise Gateway</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean, Minimal Text & Redirect URL */}
        <div style={{
          flex: '1 1 450px',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#ecfdf5',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            color: '#059669',
            fontWeight: '700',
            width: 'fit-content',
            marginBottom: '16px'
          }}>
            <Zap size={14} /> Clean Commercial Mobility
          </div>

          <h1 style={{
            fontSize: '32px',
            fontWeight: '800',
            margin: '0 0 14px 0',
            lineHeight: '1.2',
            letterSpacing: '-0.5px',
            color: '#0f172a'
          }}>
            Smart Electric Fleet for Last-Mile Logistics
          </h1>

          <p style={{
            margin: '0 0 28px 0',
            fontSize: '14.5px',
            color: '#475569',
            lineHeight: '1.6'
          }}>
            LocalToto (LT.ev) provides high-efficiency electric two-wheelers and battery-swapping subscriptions for daily gig riders and delivery partners. Zero fuel expenses, verified digital KYC, and flexible plans.
          </p>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <a
              href="https://ltev.in"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#0f172a',
                color: '#ffffff',
                padding: '13px 24px',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '13.5px',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
                transition: 'opacity 0.2s ease'
              }}
            >
              <span>Visit Public Website (ltev.in)</span>
              <ExternalLink size={15} />
            </a>
          </div>
        </div>

      </main>

      {/* Fixed Bottom Footer with Mandatory Legal & Compliance Links */}
      <footer style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 36px',
        borderTop: '1px solid #f1f5f9',
        background: '#ffffff',
        fontSize: '12px',
        color: '#64748b',
        zIndex: 10,
        flexShrink: 0
      }}>
        <div>
          © 2026 <strong>WheelyBuzz LocalToto Private Limited</strong>. All rights reserved.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setActiveLegalModal('terms')}
            style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', padding: 0 }}
          >
            Terms & Conditions
          </button>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <button 
            onClick={() => setActiveLegalModal('privacy')}
            style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', padding: 0 }}
          >
            Privacy Policy
          </button>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <button 
            onClick={() => setActiveLegalModal('refund')}
            style={{ background: 'transparent', border: 'none', color: '#00a66c', fontWeight: '600', fontSize: '12px', cursor: 'pointer', padding: 0 }}
          >
            Refund & Cancellation Policy
          </button>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <button 
            onClick={() => setActiveLegalModal('contact')}
            style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '12px', cursor: 'pointer', padding: 0 }}
          >
            Contact Us
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* COMPLIANCE & LEGAL MODAL VIEWER (Clean Light Mode)       */}
      {/* ======================================================== */}
      {activeLegalModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '660px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'fadeIn 0.2s ease',
            color: '#0f172a'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#00a66c" />
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: '700', color: '#0f172a' }}>
                  {activeLegalModal === 'terms' && 'Terms and Conditions of Service'}
                  {activeLegalModal === 'privacy' && 'Customer Privacy & Data Protection Policy'}
                  {activeLegalModal === 'refund' && 'Refund and Cancellation Policy (Cashfree / UPI)'}
                  {activeLegalModal === 'contact' && 'Official Contact Details & Registered Address'}
                  {activeLegalModal === 'public_plans' && 'LT.ev Commercial Plans & Specifications'}
                </h3>
              </div>
              <button
                onClick={() => setActiveLegalModal(null)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={17} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px', overflowY: 'auto', fontSize: '13.5px', color: '#334155', lineHeight: '1.6' }}>
              
              {/* REFUND POLICY */}
              {activeLegalModal === 'refund' && (
                <div>
                  <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', color: '#059669', fontWeight: '600' }}>
                    ✅ Instant Wallet & Security Deposit Refund Guarantee
                  </div>
                  <h4 style={{ color: '#0f172a', margin: '14px 0 6px 0' }}>1. Security Deposit Refund</h4>
                  <p>
                    All security deposits collected (standard ₹2,000 to ₹2,500) are 100% refundable. Upon safe return of the electric vehicle at an authorized LT.ev Hub without unpaid rental dues or vehicle damage, riders can initiate deposit withdrawal via the mobile app. Refunds are processed through our automated banking gateway (Cashfree/UPI) within 2 to 5 business days directly to the rider's bank account.
                  </p>

                  <h4 style={{ color: '#0f172a', margin: '14px 0 6px 0' }}>2. Subscription Plan Cancellation</h4>
                  <p>
                    If a rider purchases an EV subscription plan (Daily, Weekly, or Monthly) and the vehicle has not yet been assigned or picked up from the hub, the subscription fee is eligible for a full 100% refund. Once vehicle handover is completed, pro-rata deductions apply based on operational days used.
                  </p>

                  <h4 style={{ color: '#0f172a', margin: '14px 0 6px 0' }}>3. Wallet Recharges</h4>
                  <p>
                    Unspent wallet balances added through Cashfree Payment Gateway or Direct UPI transfer can be refunded back to the originating UPI ID upon submitting a refund request under the Wallet tab of the rider app.
                  </p>

                  <h4 style={{ color: '#0f172a', margin: '14px 0 6px 0' }}>4. Grievance Contact</h4>
                  <p>
                    For refund disputes, riders may reach our dedicated finance desk at <strong>refunds@ltev.in</strong> or call <strong>+91 78705 72429</strong> with the Cashfree Order ID or transaction reference.
                  </p>
                </div>
              )}

              {/* TERMS & CONDITIONS */}
              {activeLegalModal === 'terms' && (
                <div>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0' }}>1. Vehicle Usage Agreement</h4>
                  <p>
                    All vehicles provided by WheelyBuzz LocalToto Private Limited are designated for commercial delivery and personal transit by registered riders holding a valid KYC profile and valid motor vehicle license.
                  </p>
                  <h4 style={{ color: '#0f172a', margin: '14px 0 6px 0' }}>2. Battery Swapping & Maintenance</h4>
                  <p>
                    Riders must only charge or swap batteries at authorized LT.ev Swap Stations. Any unauthorized repair or third-party electrical modification strictly voids insurance and deposit protection.
                  </p>
                  <h4 style={{ color: '#0f172a', margin: '14px 0 6px 0' }}>3. Telemetry & Tracking</h4>
                  <p>
                    All vehicles are outfitted with active GPS telemetry to ensure rider safety, geofenced hub access, and anti-theft security.
                  </p>
                </div>
              )}

              {/* PRIVACY POLICY */}
              {activeLegalModal === 'privacy' && (
                <div>
                  <h4 style={{ color: '#0f172a', margin: '0 0 6px 0' }}>1. Data Collection</h4>
                  <p>
                    We collect identification details (Name, Phone number, Aadhaar/Digilocker verification, Driving License), vehicle telemetry (speed, location), and transaction logs required to operate rental subscriptions safely.
                  </p>
                  <h4 style={{ color: '#0f172a', margin: '14px 0 6px 0' }}>2. Payment Data Security</h4>
                  <p>
                    Payment transactions are processed by RBI-licensed payment aggregators (Cashfree Payments India Pvt. Ltd.). We do not store card numbers, CVVs, or NetBanking credentials on our application servers.
                  </p>
                </div>
              )}

              {/* CONTACT DETAILS */}
              {activeLegalModal === 'contact' && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <MapPin size={18} color="#00a66c" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ color: '#0f172a' }}>Corporate & Registered Office:</strong>
                        <p style={{ margin: '4px 0 0 0', color: '#475569' }}>
                          WheelyBuzz LocalToto Private Limited<br />
                          Bengaluru & Delhi NCR Operations
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Phone size={18} color="#00a66c" style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: '#0f172a' }}>Customer Support Phone:</strong>
                        <span style={{ marginLeft: '8px', color: '#475569' }}>+91 91137 50231</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <Mail size={18} color="#00a66c" style={{ flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: '#0f172a' }}>Official Support Email:</strong>
                        <span style={{ marginLeft: '8px', color: '#475569' }}>support@ltev.in / care@localtoto.in</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PUBLIC FLEET & PLANS */}
              {activeLegalModal === 'public_plans' && (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '15px' }}>Daily Commuter Plan</strong>
                        <span style={{ color: '#00a66c', fontWeight: '800', fontSize: '16px' }}>₹230 / Day</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Ideal for daily delivery gig riders. Includes 1 battery swap per day and maintenance.
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '15px' }}>Weekly Commercial Plan</strong>
                        <span style={{ color: '#0284c7', fontWeight: '800', fontSize: '16px' }}>₹1,500 / 7 Days</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Unlimited battery swaps at hubs, GPS telemetry tracking, zero security deposit tier.
                      </p>
                    </div>

                    <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '15px' }}>Monthly Fleet Plan</strong>
                        <span style={{ color: '#7c3aed', fontWeight: '800', fontSize: '16px' }}>₹5,800 / 30 Days</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                        Best value for commercial delivery. Dedicated scooter allocation with doorstep servicing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveLegalModal(null)}
                style={{ background: '#00a66c', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
