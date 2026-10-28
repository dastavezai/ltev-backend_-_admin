import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Wrench, Plus, Search, Edit3, Trash2, X, Check, Clock, IndianRupee, 
  Tag, Filter, CheckCircle, AlertCircle, Layers
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const SERVICE_CATEGORIES = [
  'All',
  'General',
  'Brakes',
  'Wheels',
  'Electrical',
  'Controls',
  'Motor',
  'Body'
];

const ServicesCatalog = forwardRef(function ServicesCatalog(props, ref) {
  const { token } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    category: 'General',
    price: '350',
    duration_minutes: '30',
    description: '',
    status: 'active'
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/catalog/services', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setServices(res.data || []);
    } catch (err) {
      console.error('Error loading workshop services catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: fetchServices,
    openAddModal: handleOpenCreateModal
  }));

  useEffect(() => {
    fetchServices();
  }, [token]);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setForm({
      name: '',
      category: 'General',
      price: '350',
      duration_minutes: '30',
      description: '',
      status: 'active'
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (svc) => {
    setModalMode('edit');
    setEditingId(svc.id);
    setForm({
      name: svc.name || '',
      category: svc.category || 'General',
      price: svc.price ? String(svc.price) : '0',
      duration_minutes: svc.duration_minutes ? String(svc.duration_minutes) : '30',
      description: svc.description || '',
      status: svc.status || 'active'
    });
    setModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter service name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category || 'General',
        price: parseFloat(form.price) >= 0 ? parseFloat(form.price) : 0,
        duration_minutes: parseInt(form.duration_minutes, 10) || 30,
        description: form.description ? form.description.trim() : '',
        status: form.status || 'active'
      };

      if (modalMode === 'create') {
        await axios.post('/api/catalog/services', payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } else {
        await axios.put(`/api/catalog/services/${editingId}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }

      setModalOpen(false);
      fetchServices();
    } catch (err) {
      alert(`Error saving service: ${err.response?.data?.error || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (svc) => {
    if (!window.confirm(`Are you sure you want to delete service "${svc.name}"?`)) return;
    try {
      await axios.delete(`/api/catalog/services/${svc.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchServices();
    } catch (err) {
      alert('Failed to delete service: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredServices = services.filter(s => {
    const matchesCategory = selectedCategory === 'All' || (s.category || '').toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      (s.name || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q)
    );
    return matchesCategory && matchesQuery;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      
      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>
            Workshop Services & Labor Catalog
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Manage periodic services, inspection rates, and standard workshop labor charges used in Service Billing.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
          }}
        >
          <Plus size={16} /> Add New Service
        </button>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Categories */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {SERVICE_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  background: isSelected ? '#0f172a' : '#f8fafc',
                  color: isSelected ? 'white' : '#475569',
                  border: isSelected ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search service by name or category..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 32px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredServices.map(svc => {
          const price = parseFloat(svc.price) || 0;
          return (
            <div
              key={svc.id}
              style={{
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {svc.category || 'General'}
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: '800', fontSize: '16px' }}>
                    <span>₹{price.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                  {svc.name}
                </h3>

                <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                  {svc.description || 'Standard workshop inspection & repair service.'}
                </p>
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#64748b' }}>
                  <Clock size={13} color="#94a3b8" />
                  <span>~{svc.duration_minutes || 30} mins</span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleOpenEditModal(svc)}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      color: '#0f172a',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    <Edit3 size={12} /> Edit
                  </button>

                  <button
                    onClick={() => handleDelete(svc)}
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      padding: '5px 8px',
                      color: '#dc2626',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && !loading && (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            <Wrench size={40} color="#94a3b8" style={{ marginBottom: '10px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>No Services Found</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>Add workshop repair services to populate billing presets.</p>
            <button
              onClick={handleOpenCreateModal}
              style={{ background: '#0f172a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
            >
              + Add Service
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wrench size={18} color="#0284c7" />
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  {modalMode === 'create' ? 'Add Workshop Service' : 'Edit Workshop Service'}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Service Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brake Caliper Servicing & Oil Bleed"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', background: 'white' }}
                  >
                    {SERVICE_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                    Standard Rate (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="350"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Estimated Time (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={form.duration_minutes}
                  onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Description <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '400' }}>(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional details regarding work performed and checklist items."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#64748b', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0284c7', color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={16} />
                  {submitting ? 'Saving...' : (modalMode === 'create' ? 'Add Service' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
});

export default ServicesCatalog;
