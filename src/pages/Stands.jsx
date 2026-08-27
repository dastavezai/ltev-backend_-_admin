import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MapPin, Download, Plus, Map, Settings, Trash2, X } from 'lucide-react';
import axios from 'axios';

export default function Stands() {
  const [stands, setStands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const [newStand, setNewStand] = useState({ name: '', address: '', capacity: 10 });
  const [editStand, setEditStand] = useState(null);
  const [standToDelete, setStandToDelete] = useState(null);
  
  const fetchStands = async () => {
    try {
      const response = await axios.get('/api/stands');
      setStands(response.data);
    } catch (error) {
      console.error('Error fetching stands:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStands();
  }, []);

  const handleAddStand = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/stands', newStand);
      setShowAddModal(false);
      setNewStand({ name: '', address: '', capacity: 10 });
      fetchStands();
    } catch (error) {
      console.error('Error adding stand:', error);
      alert('Failed to add stand');
    }
  };

  const handleEditStand = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/stands/${editStand.id}`, editStand);
      setShowEditModal(false);
      setEditStand(null);
      fetchStands();
    } catch (error) {
      console.error('Error updating stand:', error);
      alert('Failed to update stand');
    }
  };

  const handleDeleteStand = async () => {
    if (!standToDelete) return;
    try {
      await axios.delete(`/api/stands/${standToDelete.id}`);
      setShowDeleteModal(false);
      setStandToDelete(null);
      fetchStands();
    } catch (error) {
      console.error('Error deleting stand:', error);
      alert('Failed to delete stand');
    }
  };

  const downloadQR = (id, name) => {
    const svg = document.getElementById(`qr-stand-${id}`);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 80;
      
      // Draw white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw QR Code
      ctx.drawImage(img, 20, 20);
      
      // Draw text
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(name, canvas.width / 2, canvas.height - 20);
      
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `Stand-QR-${name.replace(/\s+/g, '-')}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}>Fleet Stands & Hubs</h1>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Manage physical parking stands and generate QR codes for drop-offs.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', padding: '10px 16px', borderRadius: '12px', border: 'none', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
        >
          <Plus size={18} /> Add New Stand
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading stands...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {stands.length === 0 ? (
            <div style={{ padding: '60px', gridColumn: '1 / -1', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>No stands have been created yet.</p>
              <button onClick={() => setShowAddModal(true)} style={{ marginTop: '16px', background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Create your first Stand</button>
            </div>
          ) : stands.map(stand => {
            const qrPayload = JSON.stringify({ action: "end_ride", stand_id: stand.id, name: stand.name });
            return (
              <div key={stand.id} style={{ background: 'white', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '10px', borderRadius: '12px' }}>
                        <Map size={24} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px 0' }}>{stand.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: '#64748b', fontSize: '13px' }}>
                          <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{stand.address}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => { setEditStand(stand); setShowEditModal(true); }}
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <Settings size={16} />
                      </button>
                      <button 
                        onClick={() => { setStandToDelete(stand); setShowDeleteModal(true); }}
                        style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '20px', background: '#f8fafc', borderRadius: '16px' }}>
                    <QRCodeSVG 
                      id={`qr-stand-${stand.id}`}
                      value={qrPayload} 
                      size={150}
                      level={"H"}
                      includeMargin={true}
                    />
                  </div>
                </div>
                
                <div style={{ padding: '16px 24px', background: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>Vehicles: <span style={{ color: '#0f172a' }}>{stand.current_vehicles || 0} / {stand.capacity} scooters</span></div>
                  <button 
                    onClick={() => downloadQR(stand.id, stand.name)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                  >
                    <Download size={16} /> Print QR
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Stand Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Add New Stand</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleAddStand} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Stand Name</label>
                <input required type="text" placeholder="e.g., Indiranagar Hub" value={newStand.name} onChange={e => setNewStand({...newStand, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Address / Location details</label>
                <input required type="text" placeholder="e.g., 100ft Road, near Metro station" value={newStand.address} onChange={e => setNewStand({...newStand, address: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Parking Capacity</label>
                <input required type="number" min="1" value={newStand.capacity} onChange={e => setNewStand({...newStand, capacity: parseInt(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <button type="submit" style={{ marginTop: '8px', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Create Stand
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stand Modal */}
      {showEditModal && editStand && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Edit Stand</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
            </div>
            
            <form onSubmit={handleEditStand} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Stand Name</label>
                <input required type="text" value={editStand.name} onChange={e => setEditStand({...editStand, name: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Address / Location details</label>
                <input required type="text" value={editStand.address} onChange={e => setEditStand({...editStand, address: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>Parking Capacity</label>
                <input required type="number" min="1" value={editStand.capacity} onChange={e => setEditStand({...editStand, capacity: parseInt(e.target.value)})} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>
              <button type="submit" style={{ marginTop: '8px', background: '#0f172a', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && standToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
              <Trash2 size={32} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>Delete Stand?</h2>
            <p style={{ color: '#64748b', fontSize: '15px', lineHeight: '1.5', marginBottom: '24px' }}>
              Are you sure you want to permanently delete <strong>{standToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '12px', background: 'white', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDeleteStand} style={{ flex: 1, padding: '12px', background: '#dc2626', border: 'none', color: 'white', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                Delete Stand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
