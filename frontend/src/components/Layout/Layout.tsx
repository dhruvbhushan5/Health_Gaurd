import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            Health Guard
          </Link>
          <div className="navbar-nav">
            <Link to="/" className="nav-link">Dashboard</Link>
            <Link to="/health-metrics" className="nav-link">Health Metrics</Link>
            <Link to="/diseases" className="nav-link">Diseases</Link>
            <Link to="/medications" className="nav-link">Medications</Link>
            <Link to="/meal-tracker" className="nav-link">Meal Tracker</Link>
            <Link to="/calorie-recommendation" className="nav-link">AI Recommendations</Link>
            <span className="nav-link">Welcome, {user?.name}</span>
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

export default Layout;
