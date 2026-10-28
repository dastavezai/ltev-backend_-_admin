import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bike, Package, MapPin, Wrench, Plus, RefreshCw } from 'lucide-react';
import Vehicles from './Vehicles';
import Parts from './Parts';
import Stands from './Stands';
import ServicesCatalog from './ServicesCatalog';

export default function Assets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'vehicles';
  const [refreshing, setRefreshing] = useState(false);

  const vehiclesRef = useRef(null);
  const partsRef = useRef(null);
  const standsRef = useRef(null);
  const servicesRef = useRef(null);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === 'vehicles') {
        await vehiclesRef.current?.refresh();
      } else if (activeTab === 'parts') {
        await partsRef.current?.refresh();
      } else if (activeTab === 'stands') {
        await standsRef.current?.refresh();
      } else if (activeTab === 'services') {
        await servicesRef.current?.refresh();
      }
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  const handleAdd = () => {
    if (activeTab === 'vehicles') {
      vehiclesRef.current?.openAddModal();
    } else if (activeTab === 'parts') {
      partsRef.current?.openAddModal();
    } else if (activeTab === 'stands') {
      standsRef.current?.openAddModal();
    } else if (activeTab === 'services') {
      servicesRef.current?.openAddModal();
    }
  };

  const tabs = [
    { id: 'vehicles', label: 'Vehicles', icon: <Bike size={15} /> },
    { id: 'parts', label: 'Spare Parts', icon: <Package size={15} /> },
    { id: 'stands', label: 'Stands', icon: <MapPin size={15} /> },
    { id: 'services', label: 'Services', icon: <Wrench size={15} /> },
  ];

  const getAddButtonText = () => {
    if (activeTab === 'vehicles') return 'Add Vehicle';
    if (activeTab === 'parts') return 'Add New Spare Part';
    if (activeTab === 'stands') return 'Add New Stand';
    if (activeTab === 'services') return 'Add New Service';
    return 'Add';
  };

  return (
    <div style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar matching Sidebar Color - Full Width with No Top Gap */}
      <header
        style={{
          width: '100%',
          height: '56px',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxSizing: 'border-box'
        }}
      >
        {/* Left Side: Asset Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontWeight: isActive ? '600' : '500',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Respective Action Buttons (Refresh & Add) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleRefresh}
            title="Refresh list"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#e2e8f0',
              fontWeight: '500',
              fontSize: '12.5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              e.currentTarget.style.color = '#e2e8f0';
            }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontWeight: '600',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
            }}
          >
            <Plus size={15} />
            <span>{getAddButtonText()}</span>
          </button>
        </div>
      </header>

      {/* Tab Content Display */}
      <main style={{ flex: 1, width: '100%', maxWidth: '1440px', margin: '0 auto', padding: '28px 36px 60px', boxSizing: 'border-box' }}>
        {activeTab === 'vehicles' && <Vehicles ref={vehiclesRef} />}
        {activeTab === 'parts' && <Parts ref={partsRef} />}
        {activeTab === 'stands' && <Stands ref={standsRef} />}
        {activeTab === 'services' && <ServicesCatalog ref={servicesRef} />}
      </main>
    </div>
  );
}
