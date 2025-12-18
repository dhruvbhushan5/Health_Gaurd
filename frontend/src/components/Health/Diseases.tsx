import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';
import './Health.css';

interface Disease {
  id: string;
  name: string;
  diagnosed: boolean;
  diagnosisDate?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

const commonDiseases = [
  'Diabetes Type 1',
  'Diabetes Type 2',
  'Hypertension',
  'Heart Disease',
  'Asthma',
  'Arthritis',
  'Depression',
  'Anxiety',
  'High Cholesterol',
  'Obesity',
  'Thyroid Disorders',
  'Kidney Disease'
];

const Diseases: React.FC = () => {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchDiseases();
  }, []);

  const fetchDiseases = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/health/diseases`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDiseases(data);
      }
    } catch (error) {
      console.error('Failed to fetch diseases:', error);
    }
  };

  const handleDiseaseToggle = (diseaseName: string, diagnosed: boolean) => {
    setDiseases(prev => {
      const existing = prev.find(d => d.name === diseaseName);
      if (existing) {
        return prev.map(d =>
          d.name === diseaseName
            ? { ...d, diagnosed }
            : d
        );
      } else {
        return [...prev, {
          id: Date.now().toString(),
          name: diseaseName,
          diagnosed,
          diagnosisDate: diagnosed ? new Date().toISOString().split('T')[0] : undefined
        }];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/health/diseases`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ diseases }),
      });

      if (response.ok) {
        setMessage('Disease information updated successfully!');
      } else {
        setMessage('Failed to update disease information');
      }
    } catch (error) {
      setMessage('Error updating disease information');
    } finally {
      setLoading(false);
    }
  };

  const isDiagnosed = (diseaseName: string) => {
    return diseases.find(d => d.name === diseaseName)?.diagnosed || false;
  };

  return (
    <div className="diseases">
      <h1>Disease Management</h1>

      <div className="card">
        <h3>Select your current conditions</h3>
        <p>Please check all conditions that apply to you. This information helps provide personalized health recommendations.</p>

        <form onSubmit={handleSubmit}>
          <div className="diseases-grid">
            {commonDiseases.map(disease => (
              <div key={disease} className="disease-item">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={isDiagnosed(disease)}
                    onChange={(e) => handleDiseaseToggle(disease, e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  {disease}
                </label>
              </div>
            ))}
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
            {loading ? 'Updating...' : 'Update Disease Information'}
          </button>
        </form>
      </div>

      {diseases.filter(d => d.diagnosed).length > 0 && (
        <div className="card">
          <h3>Your Current Conditions</h3>
          <div className="current-diseases">
            {diseases.filter(d => d.diagnosed).map(disease => (
              <div key={disease.id} className="current-disease-item">
                <span className="disease-name">{disease.name}</span>
                {disease.diagnosisDate && (
                  <span className="diagnosis-date">
                    Since: {new Date(disease.diagnosisDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Diseases;
