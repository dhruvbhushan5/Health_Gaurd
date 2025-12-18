import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import './Dashboard.css';

interface HealthData {
  height: number;
  weight: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  bloodSugar: number;
  cholesterol: number;
  lastUpdated: string;
}

const Dashboard: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/health/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
      }
    } catch (error) {
      console.error('Failed to fetch health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    if (!healthData || !healthData.height || !healthData.weight) return 0;
    const heightInMeters = healthData.height / 100;
    return (healthData.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Welcome back, {user?.name}!</h1>

      {!healthData ? (
        <div className="card">
          <h2>Get Started</h2>
          <p>Welcome to Health Guard Charushi! To get personalized health recommendations, please start by entering your health metrics.</p>
          <a href="/health-metrics" className="btn btn-primary">
            Enter Health Metrics
          </a>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="card">
            <h3>Health Overview</h3>
            <div className="health-stats">
              <div className="stat-item">
                <span className="stat-label">Height:</span>
                <span className="stat-value">{healthData.height} cm</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Weight:</span>
                <span className="stat-value">{healthData.weight} kg</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">BMI:</span>
                <span className="stat-value">
                  {calculateBMI()} - {getBMICategory(Number(calculateBMI()))}
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Vital Signs</h3>
            <div className="health-stats">
              <div className="stat-item">
                <span className="stat-label">Blood Pressure:</span>
                <span className="stat-value">
                  {healthData.bloodPressureSystolic}/{healthData.bloodPressureDiastolic} mmHg
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Blood Sugar:</span>
                <span className="stat-value">{healthData.bloodSugar} mg/dL</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Cholesterol:</span>
                <span className="stat-value">{healthData.cholesterol} mg/dL</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <a href="/health-metrics" className="btn btn-secondary">
                Update Health Metrics
              </a>
              <a href="/diseases" className="btn btn-secondary">
                Manage Diseases
              </a>
              <a href="/medications" className="btn btn-secondary">
                Track Medications
              </a>
              <a href="/calorie-recommendation" className="btn btn-primary">
                Get AI Recommendations
              </a>
            </div>
          </div>

          <div className="card">
            <h3>Recent Activity</h3>
            <p>Last health data update: {new Date(healthData.lastUpdated).toLocaleDateString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
