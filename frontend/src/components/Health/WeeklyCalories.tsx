import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import './WeeklyCalories.css';

interface WeeklyData {
  date: string;
  calories: number;
  mealBreakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
}

interface WeeklyCaloriesResponse {
  weeklyData: WeeklyData[];
  totalWeeklyCalories: number;
  averageDailyCalories: number;
}

const WeeklyCalories: React.FC = () => {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<WeeklyCaloriesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      fetchWeeklyData();
    }
  }, [user]);

  const fetchWeeklyData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/meals/weekly`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWeeklyData(data);
      } else {
        setError('Failed to fetch weekly data');
      }
    } catch (error) {
      setError('Error fetching weekly data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCalorieBarHeight = (calories: number, maxCalories: number) => {
    return Math.max((calories / maxCalories) * 100, 2); // Minimum 2% for visibility
  };

  if (!user) {
    return <div>Please log in to view your weekly calorie data.</div>;
  }

  if (loading) {
    return <div className="loading">Loading weekly data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!weeklyData) {
    return <div>No data available</div>;
  }

  const maxCalories = Math.max(...weeklyData.weeklyData.map(day => day.calories), 2500);

  return (
    <div className="weekly-calories">
      <div className="weekly-header">
        <h3>📊 Weekly Calorie Summary</h3>
        <div className="weekly-stats">
          <div className="stat">
            <span className="stat-value">{weeklyData.totalWeeklyCalories}</span>
            <span className="stat-label">Total Weekly</span>
          </div>
          <div className="stat">
            <span className="stat-value">{weeklyData.averageDailyCalories}</span>
            <span className="stat-label">Daily Average</span>
          </div>
        </div>
      </div>

      <div className="weekly-chart">
        {weeklyData.weeklyData.map((day, index) => (
          <div key={index} className="day-bar">
            <div className="day-label">{formatDate(day.date)}</div>
            <div className="bar-container">
              <div
                className="calorie-bar"
                style={{
                  height: `${getCalorieBarHeight(day.calories, maxCalories)}%`,
                  backgroundColor: day.calories > 2500 ? '#e74c3c' :
                    day.calories > 2000 ? '#f39c12' : '#27ae60'
                }}
                title={`${day.calories} calories`}
              >
                <div className="bar-segments">
                  <div
                    className="bar-segment breakfast"
                    style={{
                      height: `${(day.mealBreakdown.breakfast / day.calories) * 100}%`
                    }}
                    title={`Breakfast: ${day.mealBreakdown.breakfast} cal`}
                  ></div>
                  <div
                    className="bar-segment lunch"
                    style={{
                      height: `${(day.mealBreakdown.lunch / day.calories) * 100}%`
                    }}
                    title={`Lunch: ${day.mealBreakdown.lunch} cal`}
                  ></div>
                  <div
                    className="bar-segment dinner"
                    style={{
                      height: `${(day.mealBreakdown.dinner / day.calories) * 100}%`
                    }}
                    title={`Dinner: ${day.mealBreakdown.dinner} cal`}
                  ></div>
                  <div
                    className="bar-segment snack"
                    style={{
                      height: `${(day.mealBreakdown.snack / day.calories) * 100}%`
                    }}
                    title={`Snacks: ${day.mealBreakdown.snack} cal`}
                  ></div>
                </div>
              </div>
            </div>
            <div className="day-calories">{day.calories}</div>
          </div>
        ))}
      </div>

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color breakfast"></span>
          <span>Breakfast</span>
        </div>
        <div className="legend-item">
          <span className="legend-color lunch"></span>
          <span>Lunch</span>
        </div>
        <div className="legend-item">
          <span className="legend-color dinner"></span>
          <span>Dinner</span>
        </div>
        <div className="legend-item">
          <span className="legend-color snack"></span>
          <span>Snacks</span>
        </div>
      </div>

      <div className="calorie-guidelines">
        <h4>Daily Calorie Guidelines</h4>
        <div className="guidelines-grid">
          <div className="guideline-item">
            <span className="guideline-color low"></span>
            <span>Under 2000: Below recommended</span>
          </div>
          <div className="guideline-item">
            <span className="guideline-color normal"></span>
            <span>2000-2500: Healthy range</span>
          </div>
          <div className="guideline-item">
            <span className="guideline-color high"></span>
            <span>Over 2500: Above recommended</span>
          </div>
        </div>
        <p className="guidelines-note">
          * These are general guidelines. Individual needs vary based on age, gender,
          activity level, and health goals. Consult a healthcare provider for personalized advice.
        </p>
      </div>
    </div>
  );
};

export default WeeklyCalories;
