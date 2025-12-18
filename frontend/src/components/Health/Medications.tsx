import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';
import './Health.css';

interface Medication {
  _id?: string;
  name: string;
  dosage: string;
  frequency: string;
  notes?: string;
  startDate: string;
  endDate?: string;
  active: boolean;
}

const Medications: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [formData, setFormData] = useState<Medication>({
    name: '',
    dosage: '',
    frequency: '',
    notes: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    active: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/health/medications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMedications(data);
      }
    } catch (error) {
      console.error('Failed to fetch medications:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const url = editingMedication
        ? `/api/health/medications/${editingMedication._id}`
        : '/api/health/medications';

      const method = editingMedication ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage(editingMedication ? 'Medication updated successfully!' : 'Medication added successfully!');
        resetForm();
        fetchMedications();
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to save medication');
      }
    } catch (error) {
      setMessage('Error saving medication');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (medication: Medication) => {
    setEditingMedication(medication);
    setFormData({
      ...medication,
      startDate: medication.startDate.split('T')[0],
      endDate: medication.endDate ? medication.endDate.split('T')[0] : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (medicationId: string) => {
    if (!window.confirm('Are you sure you want to delete this medication?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/health/medications/${medicationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMessage('Medication deleted successfully!');
        fetchMedications();
      } else {
        setMessage('Failed to delete medication');
      }
    } catch (error) {
      setMessage('Error deleting medication');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      dosage: '',
      frequency: '',
      notes: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      active: true
    });
    setEditingMedication(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof Medication, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="medications">
      <h1>Medication Management</h1>

      <div className="card">
        <div className="medications-header">
          <h3>Your Medications</h3>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            Add New Medication
          </button>
        </div>

        {medications.length === 0 ? (
          <p>No medications recorded. Click "Add New Medication" to get started.</p>
        ) : (
          <div className="medications-list">
            {medications.map(medication => (
              <div key={medication._id} className={`medication-item ${!medication.active ? 'inactive' : ''}`}>
                <div className="medication-main">
                  <h4>{medication.name}</h4>
                  <p><strong>Dosage:</strong> {medication.dosage}</p>
                  <p><strong>Frequency:</strong> {medication.frequency}</p>
                  {medication.notes && <p><strong>Notes:</strong> {medication.notes}</p>}
                </div>
                <div className="medication-meta">
                  <span className="start-date">
                    Started: {new Date(medication.startDate).toLocaleDateString()}
                  </span>
                  {medication.endDate && (
                    <span className="end-date">
                      Ends: {new Date(medication.endDate).toLocaleDateString()}
                    </span>
                  )}
                  <span className={`status ${medication.active ? 'active' : 'inactive'}`}>
                    {medication.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="medication-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(medication)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(medication._id!)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingMedication ? 'Edit Medication' : 'Add New Medication'}</h3>
              <button className="close-btn" onClick={resetForm}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Medication Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Metformin"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Dosage *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.dosage}
                  onChange={(e) => handleInputChange('dosage', e.target.value)}
                  placeholder="e.g., 500mg"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Frequency *</label>
                <select
                  className="form-input"
                  value={formData.frequency}
                  onChange={(e) => handleInputChange('frequency', e.target.value)}
                  required
                >
                  <option value="">Select frequency</option>
                  <option value="Once daily">Once daily</option>
                  <option value="Twice daily">Twice daily</option>
                  <option value="Three times daily">Three times daily</option>
                  <option value="Four times daily">Four times daily</option>
                  <option value="As needed">As needed</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date (if applicable)</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.endDate || ''}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Additional notes about this medication..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Currently taking this medication
                </label>
              </div>

              {message && (
                <div className={message.includes('success') ? 'success' : 'error'}>
                  {message}
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editingMedication ? 'Update Medication' : 'Add Medication'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medications;
