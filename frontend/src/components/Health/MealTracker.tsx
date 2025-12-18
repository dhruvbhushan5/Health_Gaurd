import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';
import WeeklyCalories from './WeeklyCalories';
import './MealTracker.css';

interface Food {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface Meal {
  _id?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foods: Food[];
  totalCalories: number;
  notes?: string;
  date: Date;
}

interface DailyCalories {
  totalCalories: number;
  mealBreakdown: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
  meals: Meal[];
}

interface FoodDatabase {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

const MealTracker: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyCalories, setDailyCalories] = useState<DailyCalories | null>(null);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [foodDatabase, setFoodDatabase] = useState<FoodDatabase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Add meal form state
  const [newMeal, setNewMeal] = useState<{
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    foods: Food[];
    notes: string;
  }>({
    mealType: 'breakfast',
    foods: [],
    notes: ''
  });

  const [currentFood, setCurrentFood] = useState<Food>({
    name: '',
    quantity: 1,
    unit: 'grams',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });

  useEffect(() => {
    fetchDailyCalories();
    fetchFoodDatabase();
  }, [selectedDate]);

  const fetchDailyCalories = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/meals/daily/${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDailyCalories(data);
      } else {
        setError('Failed to fetch daily calories');
      }
    } catch (error) {
      setError('Error fetching daily calories');
    } finally {
      setLoading(false);
    }
  };

  const fetchFoodDatabase = async () => {
    try {
      const response = await fetch(`/api/meals/food-database?search=${searchTerm}`);
      if (response.ok) {
        const data = await response.json();
        setFoodDatabase(data.foods);
      }
    } catch (error) {
      console.error('Error fetching food database:', error);
    }
  };

  const calculateTotalCalories = (foods: Food[]) => {
    return foods.reduce((total, food) => total + food.calories, 0);
  };

  const addFoodToMeal = () => {
    if (!currentFood.name || currentFood.calories <= 0) {
      setError('Please enter valid food details');
      return;
    }

    const updatedFoods = [...newMeal.foods, { ...currentFood }];
    setNewMeal({
      ...newMeal,
      foods: updatedFoods
    });

    // Reset current food
    setCurrentFood({
      name: '',
      quantity: 1,
      unit: 'grams',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
    setError('');
  };

  const removeFoodFromMeal = (index: number) => {
    const updatedFoods = newMeal.foods.filter((_, i) => i !== index);
    setNewMeal({
      ...newMeal,
      foods: updatedFoods
    });
  };

  const selectFoodFromDatabase = (food: FoodDatabase) => {
    setCurrentFood({
      name: food.name,
      quantity: 1,
      unit: food.unit,
      calories: Math.round(food.calories * (currentFood.quantity / 100)), // Adjust for quantity
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat
    });
    setSearchTerm('');
  };

  const updateFoodQuantity = (quantity: number) => {
    if (currentFood.name && foodDatabase.length > 0) {
      const baseFood = foodDatabase.find(f => f.name === currentFood.name);
      if (baseFood) {
        const multiplier = quantity / 100; // Assuming database values are per 100g/ml
        setCurrentFood({
          ...currentFood,
          quantity,
          calories: Math.round(baseFood.calories * multiplier),
          protein: Math.round((baseFood.protein || 0) * multiplier * 10) / 10,
          carbs: Math.round((baseFood.carbs || 0) * multiplier * 10) / 10,
          fat: Math.round((baseFood.fat || 0) * multiplier * 10) / 10
        });
      }
    } else {
      setCurrentFood({ ...currentFood, quantity });
    }
  };

  const saveMeal = async () => {
    if (newMeal.foods.length === 0) {
      setError('Please add at least one food item');
      return;
    }

    try {
      setLoading(true);
      const totalCalories = calculateTotalCalories(newMeal.foods);

      const response = await fetch(`${API_URL}/api/meals/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...newMeal,
          totalCalories,
          date: selectedDate
        })
      });

      if (response.ok) {
        setShowAddMeal(false);
        setNewMeal({
          mealType: 'breakfast',
          foods: [],
          notes: ''
        });
        await fetchDailyCalories();
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save meal');
      }
    } catch (error) {
      setError('Error saving meal');
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    if (!window.confirm('Are you sure you want to delete this meal?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/meals/${mealId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchDailyCalories();
      } else {
        setError('Failed to delete meal');
      }
    } catch (error) {
      setError('Error deleting meal');
    } finally {
      setLoading(false);
    }
  };

  const filteredFoodDatabase = foodDatabase.filter(food =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) {
    return <div className="meal-tracker">Please log in to track your meals.</div>;
  }

  return (
    <div className="meal-tracker">
      <div className="meal-tracker-header">
        <h2>🍽️ Meal Tracker</h2>
        <div className="date-selector">
          <label>Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Weekly Calories Overview */}
      <WeeklyCalories />

      {error && <div className="error-message">{error}</div>}

      {loading && <div className="loading">Loading...</div>}

      {dailyCalories && (
        <div className="daily-summary">
          <div className="total-calories">
            <h3>Daily Total: {dailyCalories.totalCalories} calories</h3>
            <div className="calorie-target">
              <small>Recommended: 2000-2500 calories/day (varies by individual)</small>
            </div>
          </div>

          <div className="meal-breakdown">
            <div className="meal-type">
              <span>🌅 Breakfast:</span>
              <span>{dailyCalories.mealBreakdown.breakfast} cal</span>
            </div>
            <div className="meal-type">
              <span>🌞 Lunch:</span>
              <span>{dailyCalories.mealBreakdown.lunch} cal</span>
            </div>
            <div className="meal-type">
              <span>🌙 Dinner:</span>
              <span>{dailyCalories.mealBreakdown.dinner} cal</span>
            </div>
            <div className="meal-type">
              <span>🍿 Snacks:</span>
              <span>{dailyCalories.mealBreakdown.snack} cal</span>
            </div>
          </div>

          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${Math.min((dailyCalories.totalCalories / 2200) * 100, 100)}%`,
                backgroundColor: dailyCalories.totalCalories > 2500 ? '#ff6b6b' : '#4ecdc4'
              }}
            ></div>
          </div>
        </div>
      )}

      <div className="meals-section">
        <div className="section-header">
          <h3>Today's Meals</h3>
          <button
            className="add-meal-btn"
            onClick={() => setShowAddMeal(true)}
          >
            + Add Meal
          </button>
        </div>

        {dailyCalories?.meals.map((meal, index) => (
          <div key={meal._id || index} className="meal-card">
            <div className="meal-header">
              <h4>
                {meal.mealType === 'breakfast' && '🌅'}
                {meal.mealType === 'lunch' && '🌞'}
                {meal.mealType === 'dinner' && '🌙'}
                {meal.mealType === 'snack' && '🍿'}
                {meal.mealType.charAt(0).toUpperCase() + meal.mealType.slice(1)}
              </h4>
              <div className="meal-actions">
                <span className="meal-calories">{meal.totalCalories} cal</span>
                {meal._id && (
                  <button
                    className="delete-btn"
                    onClick={() => deleteMeal(meal._id!)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            <div className="food-list">
              {meal.foods.map((food, foodIndex) => (
                <div key={foodIndex} className="food-item">
                  <span>{food.name}</span>
                  <span>{food.quantity}{food.unit}</span>
                  <span>{food.calories} cal</span>
                </div>
              ))}
            </div>
            {meal.notes && <div className="meal-notes">📝 {meal.notes}</div>}
          </div>
        ))}

        {dailyCalories?.meals.length === 0 && (
          <div className="no-meals">
            <p>No meals recorded for this date.</p>
            <p>Start by adding your first meal!</p>
          </div>
        )}
      </div>

      {showAddMeal && (
        <div className="modal-overlay">
          <div className="add-meal-modal">
            <div className="modal-header">
              <h3>Add New Meal</h3>
              <button
                className="close-btn"
                onClick={() => setShowAddMeal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="form-group">
                <label>Meal Type:</label>
                <select
                  value={newMeal.mealType}
                  onChange={(e) => setNewMeal({
                    ...newMeal,
                    mealType: e.target.value as 'breakfast' | 'lunch' | 'dinner' | 'snack'
                  })}
                >
                  <option value="breakfast">🌅 Breakfast</option>
                  <option value="lunch">🌞 Lunch</option>
                  <option value="dinner">🌙 Dinner</option>
                  <option value="snack">🍿 Snack</option>
                </select>
              </div>

              <div className="food-search">
                <label>Search Food Database:</label>
                <input
                  type="text"
                  placeholder="Search for food..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (e.target.value.length > 2) {
                      fetchFoodDatabase();
                    }
                  }}
                />

                {searchTerm && filteredFoodDatabase.length > 0 && (
                  <div className="food-suggestions">
                    {filteredFoodDatabase.slice(0, 5).map((food, index) => (
                      <div
                        key={index}
                        className="food-suggestion"
                        onClick={() => selectFoodFromDatabase(food)}
                      >
                        <span>{food.name}</span>
                        <span>{food.calories} cal per {food.unit}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="add-food-section">
                <h4>Add Food Item</h4>
                <div className="food-inputs">
                  <input
                    type="text"
                    placeholder="Food name"
                    value={currentFood.name}
                    onChange={(e) => setCurrentFood({ ...currentFood, name: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={currentFood.quantity}
                    onChange={(e) => updateFoodQuantity(parseFloat(e.target.value) || 0)}
                    min="0.1"
                    step="0.1"
                  />
                  <select
                    value={currentFood.unit}
                    onChange={(e) => setCurrentFood({ ...currentFood, unit: e.target.value })}
                  >
                    <option value="grams">grams</option>
                    <option value="ml">ml</option>
                    <option value="pieces">pieces</option>
                    <option value="cups">cups</option>
                    <option value="tbsp">tbsp</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Calories"
                    value={currentFood.calories}
                    onChange={(e) => setCurrentFood({ ...currentFood, calories: parseFloat(e.target.value) || 0 })}
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={addFoodToMeal}
                    className="add-food-btn"
                  >
                    Add
                  </button>
                </div>
              </div>

              {newMeal.foods.length > 0 && (
                <div className="meal-preview">
                  <h4>Meal Preview ({calculateTotalCalories(newMeal.foods)} calories)</h4>
                  <div className="food-list">
                    {newMeal.foods.map((food, index) => (
                      <div key={index} className="food-item">
                        <span>{food.name}</span>
                        <span>{food.quantity}{food.unit}</span>
                        <span>{food.calories} cal</span>
                        <button
                          type="button"
                          onClick={() => removeFoodFromMeal(index)}
                          className="remove-food-btn"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Notes (optional):</label>
                <textarea
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                  placeholder="Any additional notes about this meal..."
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowAddMeal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveMeal}
                  className="save-btn"
                  disabled={newMeal.foods.length === 0 || loading}
                >
                  {loading ? 'Saving...' : 'Save Meal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealTracker;
