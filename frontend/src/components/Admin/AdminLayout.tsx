import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();

    return (
        <div>
            <nav className="navbar" style={{ background: '#1e3a8a' }}>
                <div className="navbar-content">
                    <span className="navbar-brand" style={{ cursor: 'default' }}>
                        Health Guard Admin
                    </span>
                    <div className="navbar-nav">
                        <span className="nav-link" style={{ color: '#fff' }}>Admin: {user?.name}</span>
                        <button onClick={logout} className="logout-btn">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>
            <main className="container">
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
