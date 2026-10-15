import { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, FileText, Search, RefreshCw, Eye, ExternalLink, 
  ShieldCheck, ShieldAlert, Shield, User, Phone, Mail, Calendar, X,
  Maximize2, Check, AlertCircle, Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AccountApprovals() {
  const { token } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [actionLoading, setActionLoading] = useState(null); // id of item being approved/rejected

  // Lightbox Modal State
  const [lightbox, setLightbox] = useState({
    open: false,
    url: '',
    title: '',
    riderName: '',
    appId: null,
    status: ''
  });

  useEffect(() => {
    if (token) {
      fetchApplications();
    }
  }, [token]);

  const fetchApplications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/account_approvals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching account approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveApp = async (id) => {
    setActionLoading(id);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/account_approvals/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', kyc_status: 'verified' } : a));
      if (lightbox.open && lightbox.appId === id) {
        setLightbox(l => ({ ...l, status: 'approved' }));
      }
    } catch (error) {
      console.error('Error approving app:', error);
      alert('Failed to approve KYC: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(null);
    }
  };

  const rejectApp = async (id) => {
    if (!window.confirm('Are you sure you want to reject this KYC application? The rider will be asked to re-upload their documents.')) {
      return;
    }
    setActionLoading(id);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/account_approvals/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected', kyc_status: 'failed' } : a));
      if (lightbox.open && lightbox.appId === id) {
        setLightbox(l => ({ ...l, status: 'rejected' }));
      }
    } catch (error) {
      console.error('Error rejecting app:', error);
      alert('Failed to reject KYC: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(null);
    }
  };

  const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = import.meta.env.VITE_API_URL || '';
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const filteredApps = applications.filter(app => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      String(app.user || '').toLowerCase().includes(q) ||
      String(app.phone || '').toLowerCase().includes(q) ||
      String(app.email || '').toLowerCase().includes(q) ||
      String(app.id || '').toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck color="#00a66c" size={32} /> KYC Verification & Document Center
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Inspect uploaded Aadhaar, PAN card, and live selfie photos stored in Cloudflare R2 storage.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={fetchApplications}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'white',
              border: '1px solid #cbd5e1',
              color: '#475569',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh List
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'All Submissions', count: applications.length, color: '#0f172a', bg: '#f8fafc', icon: <FileText size={20} color="#64748b" /> },
          { label: 'Pending Review', count: pendingCount, color: '#b45309', bg: '#fef3c7', icon: <AlertCircle size={20} color="#d97706" /> },
          { label: 'Approved & Verified', count: approvedCount, color: '#15803d', bg: '#dcfce7', icon: <ShieldCheck size={20} color="#16a34a" /> },
          { label: 'Rejected / Failed', count: rejectedCount, color: '#b91c1c', bg: '#fee2e2', icon: <ShieldAlert size={20} color="#dc2626" /> },
        ].map((stat, idx) => (
          <div key={idx} style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: stat.color }}>{stat.count}</div>
            </div>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Tabs Filter Bar */}
      <div style={{ background: 'white', borderRadius: '18px', padding: '16px 20px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'pending', label: `Pending Review (${pendingCount})` },
            { id: 'all', label: `All (${applications.length})` },
            { id: 'approved', label: `Approved (${approvedCount})` },
            { id: 'rejected', label: `Rejected (${rejectedCount})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                background: statusFilter === tab.id ? 'white' : 'transparent',
                color: statusFilter === tab.id ? '#0f172a' : '#64748b',
                boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '320px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by rider name, phone, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '13px' }}
          />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
          <RefreshCw size={36} color="#00a66c" className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>Loading KYC submissions & images...</div>
        </div>
      ) : filteredApps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'white', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
          <ShieldCheck size={48} color="#cbd5e1" style={{ margin: '0 auto 12px auto' }} />
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#1e293b', marginBottom: '6px' }}>No KYC applications found</div>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            {statusFilter === 'pending' ? 'All pending KYC applications have been reviewed.' : 'Try adjusting your search query or tab filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredApps.map(app => {
            const docList = [
              { title: 'Aadhaar Front', path: app.aadhar_front_image },
              { title: 'Aadhaar Back', path: app.aadhar_back_image },
              { title: 'PAN Card', path: app.pan_image },
              { title: 'Live Selfie', path: app.selfie_image },
            ];
            const hasAnyPhoto = docList.some(d => d.path);

            return (
              <div 
                key={app.id} 
                style={{ 
                  background: 'white', 
                  borderRadius: '20px', 
                  border: '1px solid #e2e8f0', 
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px -2px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.2s'
                }}
              >
                {/* Rider Header Bar */}
                <div style={{ padding: '20px 24px', background: '#fafafa', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ 
                      width: '48px', height: '48px', 
                      borderRadius: '14px', 
                      background: app.status === 'approved' ? '#dcfce7' : app.status === 'rejected' ? '#fee2e2' : '#fef3c7', 
                      color: app.status === 'approved' ? '#16a34a' : app.status === 'rejected' ? '#dc2626' : '#d97706',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontWeight: '900', fontSize: '18px' 
                    }}>
                      {app.user ? app.user.charAt(0).toUpperCase() : 'R'}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>{app.user}</span>
                        <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                          ID: USR-{app.id}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={13} /> {app.phone}
                        </span>
                        {app.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Mail size={13} /> {app.email}
                          </span>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Calendar size={13} /> Applied: {app.date}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status & Quick Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: app.status === 'approved' ? '#dcfce7' : app.status === 'rejected' ? '#fee2e2' : '#fef3c7', 
                      color: app.status === 'approved' ? '#15803d' : app.status === 'rejected' ? '#b91c1c' : '#b45309',
                      padding: '6px 14px', 
                      borderRadius: '10px', 
                      fontWeight: '800',
                      fontSize: '12px',
                      textTransform: 'uppercase'
                    }}>
                      {app.status === 'approved' && <CheckCircle size={14} />}
                      {app.status === 'rejected' && <XCircle size={14} />}
                      {app.status === 'pending' && <AlertCircle size={14} />}
                      {app.status}
                    </span>

                    {app.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          disabled={actionLoading === app.id}
                          onClick={() => rejectApp(app.id)} 
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px', 
                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', 
                            padding: '8px 14px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', 
                            cursor: 'pointer', transition: 'all 0.15s ease' 
                          }}
                        >
                          <XCircle size={15} /> Reject
                        </button>
                        <button 
                          disabled={actionLoading === app.id}
                          onClick={() => approveApp(app.id)} 
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px', 
                            background: '#00a66c', color: 'white', border: 'none', 
                            padding: '8px 16px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', 
                            cursor: 'pointer', boxShadow: '0 2px 6px rgba(0, 166, 108, 0.25)',
                            transition: 'all 0.15s ease' 
                          }}
                        >
                          <CheckCircle size={15} /> {actionLoading === app.id ? 'Approving...' : 'Approve KYC'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Document Photos Grid */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Uploaded KYC Verification Documents (Cloudflare R2 Stored):</span>
                    {hasAnyPhoto && (
                      <span style={{ fontSize: '11px', color: '#00a66c', background: '#ecfdf5', padding: '3px 8px', borderRadius: '6px', fontWeight: '700' }}>
                        ⚡ High Speed Cloudflare CDN
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    {docList.map((doc, dIdx) => {
                      const fullUrl = resolveImageUrl(doc.path);
                      return (
                        <div 
                          key={dIdx}
                          style={{
                            background: '#f8fafc',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Photo Card Header */}
                          <div style={{ padding: '10px 14px', background: 'white', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>{doc.title}</span>
                            {fullUrl ? (
                              <span style={{ fontSize: '10px', fontWeight: '800', color: '#16a34a', background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                                READY
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                MISSING
                              </span>
                            )}
                          </div>

                          {/* Image Thumbnail / Placeholder */}
                          {fullUrl ? (
                            <div 
                              onClick={() => setLightbox({
                                open: true,
                                url: fullUrl,
                                title: doc.title,
                                riderName: app.user,
                                appId: app.id,
                                status: app.status
                              })}
                              style={{
                                height: '170px',
                                background: '#0f172a',
                                position: 'relative',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden'
                              }}
                            >
                              <img 
                                src={fullUrl} 
                                alt={doc.title} 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                loading="lazy"
                              />
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                right: '8px',
                                background: 'rgba(15, 23, 42, 0.75)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backdropFilter: 'blur(4px)'
                              }}>
                                <Maximize2 size={12} /> Inspect
                              </div>
                            </div>
                          ) : (
                            <div style={{ height: '170px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', gap: '8px' }}>
                              <ImageIcon size={32} />
                              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Not Uploaded</span>
                            </div>
                          )}

                          {/* Footer Action */}
                          {fullUrl && (
                            <div style={{ padding: '8px 12px', background: 'white', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => setLightbox({
                                  open: true,
                                  url: fullUrl,
                                  title: doc.title,
                                  riderName: app.user,
                                  appId: app.id,
                                  status: app.status
                                })}
                                style={{ flex: 1, padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                              >
                                <Eye size={12} /> Zoom
                              </button>
                              <a
                                href={fullUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                                title="Open full image in new tab"
                              >
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Zoom Modal */}
      {lightbox.open && (
        <div 
          onClick={() => setLightbox({ open: false, url: '', title: '', riderName: '', appId: null, status: '' })}
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: 'rgba(15, 23, 42, 0.88)', 
            backdropFilter: 'blur(8px)', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9999,
            padding: '24px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              background: '#0f172a', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              maxWidth: '92vw', 
              maxHeight: '92vh', 
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              border: '1px solid #334155'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={18} color="#00a66c" /> {lightbox.title}
                </div>
                {lightbox.riderName && (
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
                    Rider: <strong style={{ color: 'white' }}>{lightbox.riderName}</strong> • (ID: USR-{lightbox.appId})
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {lightbox.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={actionLoading === lightbox.appId}
                      onClick={() => rejectApp(lightbox.appId)}
                      style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <XCircle size={14} /> Reject
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading === lightbox.appId}
                      onClick={() => approveApp(lightbox.appId)}
                      style={{ background: '#00a66c', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <CheckCircle size={14} /> Approve KYC
                    </button>
                  </>
                )}

                <a
                  href={lightbox.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Open Full
                </a>
                <button
                  type="button"
                  onClick={() => setLightbox({ open: false, url: '', title: '', riderName: '', appId: null, status: '' })}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / Image */}
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020617', maxHeight: 'calc(92vh - 80px)' }}>
              <img 
                src={lightbox.url} 
                alt={lightbox.title} 
                style={{ maxWidth: '100%', maxHeight: 'calc(80vh)', objectFit: 'contain', borderRadius: '8px' }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
