import { useSearchParams } from 'react-router-dom';
import { Bike, Package, MapPin } from 'lucide-react';
import Vehicles from './Vehicles';
import Parts from './Parts';
import Stands from './Stands';

export default function Assets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'vehicles';

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'vehicles', label: 'Vehicles', icon: <Bike size={16} /> },
    { id: 'parts', label: 'Spare Parts', icon: <Package size={16} /> },
    { id: 'stands', label: 'Stands', icon: <MapPin size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Navbar matching Sidebar Color */}
      <div style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '12px',
        padding: '6px 8px',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.12)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: '6px'
      }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 16px',
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

      {/* Tab Content Display */}
      <div style={{ width: '100%' }}>
        {activeTab === 'vehicles' && <Vehicles />}
        {activeTab === 'parts' && <Parts />}
        {activeTab === 'stands' && <Stands />}
      </div>
    </div>
  );
}
