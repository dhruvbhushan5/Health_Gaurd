import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';
import './Health.css';

interface HealthMetricsData {
  height: number;
  weight: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  bloodSugar: number;
  cholesterol: number;
}

const HealthMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<HealthMetricsData>({
    height: 0,
    weight: 0,
    bloodPressureSystolic: 0,
    bloodPressureDiastolic: 0,
    bloodSugar: 0,
    cholesterol: 0,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/health/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/health/metrics`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(metrics),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Health metrics updated successfully!');
        // Update local state with returned data
        setMetrics(data.healthMetrics);
        // Reload metrics to ensure UI is in sync
        setTimeout(() => fetchMetrics(), 500);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to update health metrics');
      }
    } catch (error) {
      console.error('Error updating health metrics:', error);
      setMessage('Error updating health metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof HealthMetricsData, value: string) => {
    setMetrics(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  return (
    <div className="health-metrics">
      <h1>Health Metrics</h1>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input
                type="number"
                className="form-input"
                value={metrics.height || ''}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="Enter your height in cm"
                min="50"
                max="250"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input
                type="number"
                className="form-input"
                value={metrics.weight || ''}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="Enter your weight in kg"
                min="20"
                max="300"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Blood Pressure - Systolic (mmHg)</label>
              <input
                type="number"
                className="form-input"
                value={metrics.bloodPressureSystolic || ''}
                onChange={(e) => handleInputChange('bloodPressureSystolic', e.target.value)}
                placeholder="e.g., 120"
                min="70"
                max="200"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Blood Pressure - Diastolic (mmHg)</label>
              <input
                type="number"
                className="form-input"
                value={metrics.bloodPressureDiastolic || ''}
                onChange={(e) => handleInputChange('bloodPressureDiastolic', e.target.value)}
                placeholder="e.g., 80"
                min="40"
                max="130"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Blood Sugar (mg/dL)</label>
              <input
                type="number"
                className="form-input"
                value={metrics.bloodSugar || ''}
                onChange={(e) => handleInputChange('bloodSugar', e.target.value)}
                placeholder="e.g., 90"
                min="50"
                max="400"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Cholesterol (mg/dL)</label>
              <input
                type="number"
                className="form-input"
                value={metrics.cholesterol || ''}
                onChange={(e) => handleInputChange('cholesterol', e.target.value)}
                placeholder="e.g., 200"
                min="100"
                max="400"
                required
              />
            </div>
          </div>

          {message && (
            <div className={message.includes('success') ? 'success' : 'error'}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Health Metrics'}
          </button>
        </form>
      </div>

      <div className="card">
        <h3>Health Guidelines</h3>
        <div className="guidelines">
          <div className="guideline-item">
            <strong>Blood Pressure:</strong> Normal: &lt;120/80 mmHg
          </div>
          <div className="guideline-item">
            <strong>Blood Sugar:</strong> Normal fasting: 70-100 mg/dL
          </div>
          <div className="guideline-item">
            <strong>Cholesterol:</strong> Desirable: &lt;200 mg/dL
          </div>
          <div className="guideline-item">
            <strong>BMI:</strong> Normal: 18.5-24.9 kg/m²
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMetrics;
