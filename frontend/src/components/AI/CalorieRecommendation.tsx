import React, { useState, useEffect } from 'react';
import { API_URL } from '../../config/api';
import './AI.css';

interface Recommendation {
  _id: string;
  type: string;
  content: string;
  calories?: number;
  reasoning: string;
  createdAt: string;
}

const CalorieRecommendation: React.FC = () => {
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [previousRecommendations, setPreviousRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/ai/recommendations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreviousRecommendations(data);
        if (data.length > 0) {
          setRecommendation(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    }
  };

  const generateRecommendation = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/ai/calorie-recommendation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setRecommendation(data.recommendation);
        // Refresh the recommendations list
        fetchRecommendations();
      } else {
        setError(data.message || 'Failed to generate recommendation');
      }
    } catch (error) {
      setError('Error generating recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatRecommendationContent = (content: string) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .map(line => line.startsWith('<') ? line : `<p>${line}</p>`)
      .join('');
  };

  return (
    <div className="calorie-recommendation">
      <h1>AI-Powered Calorie Recommendations</h1>

      <div className="card">
        <h3>Get Personalized Nutrition Advice</h3>
        <p>
          Our AI analyzes your health metrics, medical conditions, and medications to provide
          personalized calorie and nutrition recommendations.
        </p>

        <button
          onClick={generateRecommendation}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? 'Generating Recommendation...' : 'Get New AI Recommendation'}
        </button>

        {error && <div className="error">{error}</div>}
      </div>

      {recommendation && (
        <div className="card recommendation-card">
          <div className="recommendation-header">
            <h3>Your Personalized Recommendation</h3>
            <div className="recommendation-meta">
              <span className="recommendation-date">
                Generated: {new Date(recommendation.createdAt).toLocaleDateString()}
              </span>
              {recommendation.calories && (
                <span className="calorie-badge">
                  {recommendation.calories} calories/day
                </span>
              )}
            </div>
          </div>

          <div
            className="recommendation-content"
            dangerouslySetInnerHTML={{
              __html: formatRecommendationContent(recommendation.content)
            }}
          />

          <div className="recommendation-footer">
            <small className="reasoning">
              <strong>Method:</strong> {recommendation.reasoning}
            </small>
          </div>
        </div>
      )}

      {previousRecommendations.length > 1 && (
        <div className="card">
          <h3>Previous Recommendations</h3>
          <div className="recommendations-history">
            {previousRecommendations.slice(1).map((rec) => (
              <div key={rec._id} className="history-item">
                <div className="history-header">
                  <span className="history-date">
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </span>
                  {rec.calories && (
                    <span className="history-calories">
                      {rec.calories} cal/day
                    </span>
                  )}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setRecommendation(rec)}
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card disclaimer">
        <h4>Important Disclaimer</h4>
        <p>
          <strong>This AI-generated advice is for informational purposes only and should not replace
            professional medical advice.</strong> Always consult with your healthcare provider, registered
          dietitian, or other qualified health professional before making significant changes to your
          diet or lifestyle, especially if you have medical conditions or take medications.
        </p>
        <p>
          The recommendations provided are based on general health guidelines and your input data.
          Individual nutritional needs can vary significantly based on factors like age, gender,
          activity level, metabolism, and specific health conditions.
        </p>
      </div>
    </div>
  );
};

export default CalorieRecommendation;
