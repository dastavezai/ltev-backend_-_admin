import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Package, Plus, Search, Filter, Edit3, Trash2, X, Check, RefreshCw, 
  Upload, Image as ImageIcon, AlertTriangle, ArrowUpDown, IndianRupee, 
  Layers, CheckCircle, Tag, Eye, SlidersHorizontal, LayoutGrid, List
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = [
  'All',
  'Brakes & Cables',
  'Tyres & Wheels',
  'Electrical & Lights',
  'Battery & Charger',
  'Body & Fiber Guards',
  'Motor & Suspension',
  'General & Consumables'
];

export default function Parts() {
  const { token } = useAuth();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Form State
  const [form, setForm] = useState({
    name: '',
    part_number: '',
    category: 'Brakes & Cables',
    mrp: '',
    price: '',
    stock_quantity: '50',
    image_url: '',
    description: '',
    status: 'active'
  });

  const fetchParts = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/catalog/parts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setParts(res.data || []);
    } catch (err) {
      console.error('Error loading parts catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParts();
  }, [token]);

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setForm({
      name: '',
      part_number: `PRT-${Math.floor(1000 + Math.random() * 9000)}`,
      category: 'Brakes & Cables',
      mrp: '',
      price: '',
      stock_quantity: '25',
      image_url: '',
      description: '',
      status: 'active'
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (part) => {
    setModalMode('edit');
    setEditingId(part.id);
    setForm({
      name: part.name || '',
      part_number: part.part_number || '',
      category: part.category || 'General & Consumables',
      mrp: part.mrp ? String(part.mrp) : (part.price ? String(part.price) : ''),
      price: part.price ? String(part.price) : '',
      stock_quantity: String(part.stock_quantity ?? 0),
      image_url: part.image_url || '',
      description: part.description || '',
      status: part.status || 'active'
    });
    setModalOpen(true);
  };

  // Image File Upload
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await axios.post('/api/upload/part-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.data?.imageUrl) {
        setForm(prev => ({ ...prev, image_url: res.data.imageUrl }));
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Form Submit (Create / Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter a part name.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        part_number: form.part_number.trim(),
        category: form.category,
        mrp: parseFloat(form.mrp) || parseFloat(form.price) || 0,
        price: parseFloat(form.price) || parseFloat(form.mrp) || 0,
        stock_quantity: parseInt(form.stock_quantity, 10) || 0,
        image_url: form.image_url,
        description: form.description.trim(),
        status: form.status
      };

      if (modalMode === 'create') {
        await axios.post('/api/catalog/parts', payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } else {
        await axios.put(`/api/catalog/parts/${editingId}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }

      setModalOpen(false);
      fetchParts();
    } catch (err) {
      console.error('Error saving part:', err);
      alert(`Error saving part: ${err.response?.data?.error || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Part
  const handleDeletePart = async (part) => {
    if (!window.confirm(`Are you sure you want to delete "${part.name}" from catalog?`)) return;
    try {
      await axios.delete(`/api/catalog/parts/${part.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchParts();
    } catch (err) {
      console.error('Error deleting part:', err);
      alert('Failed to delete part');
    }
  };

  // Quick Stock Adjustment
  const handleAdjustStock = async (partId, delta) => {
    try {
      await axios.patch(`/api/catalog/parts/${partId}/stock`, { delta }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setParts(prev => prev.map(p => {
        if (p.id === partId) {
          const newQty = Math.max(0, (p.stock_quantity || 0) + delta);
          return { ...p, stock_quantity: newQty };
        }
        return p;
      }));
    } catch (err) {
      console.error('Error adjusting stock:', err);
    }
  };

  // Filtered Parts
  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (p.name && p.name.toLowerCase().includes(q)) || 
        (p.part_number && p.part_number.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;

      let matchesStock = true;
      const qty = parseInt(p.stock_quantity, 10) || 0;
      if (stockFilter === 'in_stock') matchesStock = qty >= 10;
      else if (stockFilter === 'low_stock') matchesStock = qty > 0 && qty < 10;
      else if (stockFilter === 'out_of_stock') matchesStock = qty <= 0;

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [parts, searchQuery, selectedCategory, stockFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = parts.length;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let totalValuation = 0;

    parts.forEach(p => {
      const qty = parseInt(p.stock_quantity, 10) || 0;
      const mrp = parseFloat(p.mrp || p.price) || 0;
      totalStockUnits += qty;
      if (qty > 0 && qty < 10) lowStockCount += 1;
      totalValuation += qty * mrp;
    });

    return { totalCount, totalStockUnits, lowStockCount, totalValuation };
  }, [parts]);

  return (
    <div style={{ paddingBottom: '60px' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
              Inventory & Catalog
            </span>
            <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>
              {parts.length} Spare Parts
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Spare Parts Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '4px 0 0 0' }}>
            Manage replacement components, pricing, MRP, part images, and inventory stock levels.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchParts}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#0284c7', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)' }}
          >
            <Plus size={16} /> Add New Spare Part
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#eff6ff', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Catalog Items</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{metrics.totalCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Stock Units</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a' }}>{metrics.totalStockUnits}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Low Stock Alert (&lt;10)</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: metrics.lowStockCount > 0 ? '#d97706' : '#64748b' }}>{metrics.lowStockCount}</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IndianRupee size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Inventory Value</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>₹{metrics.totalValuation.toLocaleString('en-IN')}</div>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '14px' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by part name, SKU code (e.g. PRT-BRK-01), or category..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Stock Filter Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Stock:</span>
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#334155', fontWeight: '600' }}
            >
              <option value="all">All Stock Status</option>
              <option value="in_stock">In Stock (10+)</option>
              <option value="low_stock">Low Stock (1-9)</option>
              <option value="out_of_stock">Out of Stock (0)</option>
            </select>
          </div>

          {/* Grid vs Table View Switcher */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: viewMode === 'grid' ? '#0284c7' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: viewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <LayoutGrid size={15} /> Grid
            </button>

            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                color: viewMode === 'table' ? '#0284c7' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: '700',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <List size={15} /> Table
            </button>
          </div>

        </div>

        {/* Category Pill Filters */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: isSelected ? '#0284c7' : '#e2e8f0',
                  background: isSelected ? '#0284c7' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontSize: '12px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

      </div>

      {/* PARTS CONTENT */}
      {viewMode === 'grid' ? (
        
        /* GRID CARDS VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredParts.map(part => {
            const qty = parseInt(part.stock_quantity, 10) || 0;
            const mrp = parseFloat(part.mrp || part.price) || 0;
            const price = parseFloat(part.price) || mrp;
            const isLow = qty > 0 && qty < 10;
            const isOut = qty <= 0;

            return (
              <div 
                key={part.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Part Image Box */}
                <div style={{ height: '160px', background: '#f8fafc', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  {part.image_url ? (
                    <img
                      src={part.image_url}
                      alt={part.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  
                  {/* Fallback Icon when no image */}
                  <div style={{ display: part.image_url ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                    <Package size={40} strokeWidth={1.5} />
                    <span style={{ fontSize: '11px', marginTop: '4px' }}>No Image Uploaded</span>
                  </div>

                  {/* Stock Status Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: isOut ? '#fef2f2' : (isLow ? '#fffbeb' : '#f0fdf4'),
                    color: isOut ? '#dc2626' : (isLow ? '#d97706' : '#16a34a'),
                    border: `1px solid ${isOut ? '#fecaca' : (isLow ? '#fde68a' : '#bbf7d0')}`,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}>
                    {isOut ? 'Out of Stock' : (isLow ? `Low Stock (${qty})` : `${qty} in Stock`)}
                  </div>

                  {/* Category Pill */}
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {part.category || 'General'}
                  </div>
                </div>

                {/* Part Body */}
                <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    {part.part_number || 'NO-SKU'}
                  </div>

                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', margin: '0 0 8px 0', lineHeight: 1.3 }}>
                    {part.name}
                  </h3>

                  {part.description && (
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {part.description}
                    </p>
                  )}

                  {/* Pricing Box */}
                  <div style={{ marginTop: 'auto', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '600' }}>MRP</span>
                      <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>₹{mrp.toLocaleString('en-IN')}</span>
                    </div>

                    {price !== mrp && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: '600' }}>Billing Price</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#0284c7' }}>₹{price.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Stock Controls & Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    
                    {/* + / - stock buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                      <button
                        onClick={() => handleAdjustStock(part.id, -1)}
                        title="Decrease Stock by 1"
                        style={{ padding: '4px 8px', background: '#f8fafc', border: 'none', borderRight: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '800', color: '#475569', fontSize: '13px' }}
                      >
                        -
                      </button>
                      <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: '700', color: '#0f172a', minWidth: '24px', textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => handleAdjustStock(part.id, 1)}
                        title="Increase Stock by 1"
                        style={{ padding: '4px 8px', background: '#f8fafc', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '800', color: '#475569', fontSize: '13px' }}
                      >
                        +
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEditModal(part)}
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit3 size={13} /> Edit
                      </button>

                      <button
                        onClick={() => handleDeletePart(part)}
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: '6px', fontSize: '12px', color: '#dc2626', cursor: 'pointer' }}
                        title="Delete Part"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                  </div>

                </div>
              </div>
            );
          })}

          {filteredParts.length === 0 && (
            <div style={{ gridColumn: '1 / -1', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
              <Package size={48} strokeWidth={1} style={{ margin: '0 auto 12px auto', color: '#cbd5e1' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px 0' }}>No Spare Parts Found</h3>
              <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>Try adjusting your search query or category filters, or add a new part to the catalog.</p>
              <button
                onClick={handleOpenCreateModal}
                style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
              >
                + Add Spare Part
              </button>
            </div>
          )}
        </div>

      ) : (

        /* DETAILED TABLE VIEW */
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
              <tr style={{ color: '#475569', fontWeight: '700', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px', width: '60px' }}>Image</th>
                <th style={{ padding: '12px 16px' }}>Part Details & SKU</th>
                <th style={{ padding: '12px 16px' }}>Category</th>
                <th style={{ padding: '12px 16px' }}>MRP (₹)</th>
                <th style={{ padding: '12px 16px' }}>Stock Level</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map(part => {
                const qty = parseInt(part.stock_quantity, 10) || 0;
                const mrp = parseFloat(part.mrp || part.price) || 0;
                const isLow = qty > 0 && qty < 10;
                const isOut = qty <= 0;

                return (
                  <tr key={part.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    
                    {/* Thumbnail */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {part.image_url ? (
                          <img src={part.image_url} alt={part.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Package size={20} color="#94a3b8" />
                        )}
                      </div>
                    </td>

                    {/* Details */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a' }}>{part.name}</div>
                      <div style={{ fontSize: '11px', color: '#0284c7', fontFamily: 'monospace', fontWeight: '600' }}>
                        {part.part_number || 'NO-SKU'}
                      </div>
                    </td>

                    {/* Category */}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                        {part.category || 'General'}
                      </span>
                    </td>

                    {/* MRP */}
                    <td style={{ padding: '10px 16px', fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                      ₹{mrp.toLocaleString('en-IN')}
                    </td>

                    {/* Stock Level */}
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '700',
                          background: isOut ? '#fef2f2' : (isLow ? '#fffbeb' : '#f0fdf4'),
                          color: isOut ? '#dc2626' : (isLow ? '#d97706' : '#16a34a')
                        }}>
                          {qty} units
                        </span>

                        <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                          <button onClick={() => handleAdjustStock(part.id, -1)} style={{ padding: '2px 6px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: '700' }}>-</button>
                          <button onClick={() => handleAdjustStock(part.id, 1)} style={{ padding: '2px 6px', background: '#f8fafc', border: 'none', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', fontWeight: '700' }}>+</button>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditModal(part)}
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePart(part)}
                          style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: '6px', fontSize: '12px', color: '#dc2626', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}

              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>
                    No spare parts match the current criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD / EDIT SPARE PART MODAL */}
      {/* ============================================================ */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '540px', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Header */}
            <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={18} color="#0284c7" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                  {modalMode === 'create' ? 'Add New Spare Part' : 'Edit Spare Part'}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitForm} style={{ padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Image Upload Box */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  Part Image (Photo / Illustration)
                </label>
                
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '84px', height: '84px', borderRadius: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {form.image_url ? (
                      <img src={form.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <ImageIcon size={28} color="#94a3b8" />
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageFileChange}
                      style={{ display: 'none' }}
                    />
                    
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#334155',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        width: 'fit-content'
                      }}
                    >
                      <Upload size={14} /> {uploadingImage ? 'Uploading Image...' : 'Upload Image File'}
                    </button>

                    <input
                      type="text"
                      placeholder="Or enter Image URL (e.g. /uploads/parts/brake.png)"
                      value={form.image_url}
                      onChange={e => setForm({ ...form, image_url: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* Part Name */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Part Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front Disc Brake Shoe & Pad Set"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* SKU & Category Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    SKU / Part Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRT-BRK-01"
                    value={form.part_number}
                    onChange={e => setForm({ ...form, part_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', background: '#ffffff' }}
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing Grid (MRP, Selling Price, Stock) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    MRP (₹) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 350"
                    value={form.mrp}
                    onChange={e => setForm({ ...form, mrp: e.target.value, price: form.price ? form.price : e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Billing Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 350"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock_quantity}
                    onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Description & Vehicle Compatibility */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Description & Vehicle Compatibility
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Fits all standard LT Commercial EV models (Hero Optima, etc.). Genuine workshop grade material."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Modal Footer */}
              <div style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#ffffff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)' }}
                >
                  <Check size={16} />
                  {submitting ? 'Saving...' : (modalMode === 'create' ? 'Add Part' : 'Save Changes')}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
