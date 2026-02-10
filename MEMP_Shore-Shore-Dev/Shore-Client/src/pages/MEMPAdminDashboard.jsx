// client/src/pages/MEMPAdminDashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const MEMPAdminDashboard = () => {
    const navigate = useNavigate();
    const cards = [
        { title: 'User Management', route: '/app/memp/admin/users', icon: '側', color: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
        { title: 'Fleet Management', route: '/app/memp/admin/fleets', icon: '圓', color: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
        { title: 'Team Directory', route: '/app/memp/admin/team', icon: '則', color: 'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)' },
    ];

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ marginBottom: '20px', color: '#1a1a1a' }}>Admin Console</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                {cards.map((card) => (
                    <div
                        key={card.title}
                        onClick={() => navigate(card.route)}
                        style={{
                            background: card.color,
                            borderRadius: '12px',
                            padding: '30px',
                            color: 'white',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            transition: 'transform 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{card.icon}</div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: '600' }}>{card.title}</h2>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MEMPAdminDashboard;