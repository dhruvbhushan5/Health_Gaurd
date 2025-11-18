const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { cache, invalidateCache, mealCacheKey } = require('../middleware/cache');

const router = express.Router();

// Get user's meals for a specific date with caching
router.get('/daily/:date?', auth, cache(1800, mealCacheKey('daily')), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const date = req.params.date ? new Date(req.params.date) : new Date();
    const dailyCalories = user.getDailyCalories(date);

    res.json({
      date: date.toISOString().split('T')[0],
      ...dailyCalories
    });
  } catch (error) {
    console.error('Error fetching daily meals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get weekly calorie summary with caching
router.get('/weekly/:date?', auth, cache(3600, mealCacheKey('weekly')), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const date = req.params.date ? new Date(req.params.date) : new Date();
    const weeklyData = user.getWeeklyCalories(date);

    res.json({
      weeklyData,
      totalWeeklyCalories: weeklyData.reduce((sum, day) => sum + day.calories, 0),
      averageDailyCalories: Math.round(weeklyData.reduce((sum, day) => sum + day.calories, 0) / 7)
    });
  } catch (error) {
    console.error('Error fetching weekly meals:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a new meal with cache invalidation
router.post('/add', [
  auth,
  invalidateCache(['meals', 'daily', 'weekly']),
  body('mealType')
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Meal type must be breakfast, lunch, dinner, or snack'),
  body('foods')
    .isArray({ min: 1 })
    .withMessage('At least one food item is required'),
  body('foods.*.name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Food name is required'),
  body('foods.*.quantity')
    .isNumeric()
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be a positive number'),
  body('foods.*.calories')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Calories must be a non-negative number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { mealType, foods, date, notes } = req.body;

    // Calculate total calories for the meal
    const totalCalories = foods.reduce((sum, food) => sum + food.calories, 0);

    // Create new meal
    const newMeal = {
      date: date ? new Date(date) : new Date(),
      mealType,
      foods,
      totalCalories,
      notes
    };

    user.meals.push(newMeal);
    await user.save();

    // Get updated daily calories
    const dailyCalories = user.getDailyCalories(newMeal.date);

    res.status(201).json({
      message: 'Meal added successfully',
      meal: newMeal,
      dailyCalories
    });
  } catch (error) {
    console.error('Error adding meal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a meal with cache invalidation
router.put('/:mealId', [
  auth,
  invalidateCache(['meals', 'daily', 'weekly']),
  body('mealType')
    .optional()
    .isIn(['breakfast', 'lunch', 'dinner', 'snack'])
    .withMessage('Meal type must be breakfast, lunch, dinner, or snack'),
  body('foods')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one food item is required'),
  body('foods.*.name')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Food name is required'),
  body('foods.*.quantity')
    .optional()
    .isNumeric()
    .isFloat({ min: 0.1 })
    .withMessage('Quantity must be a positive number'),
  body('foods.*.calories')
    .optional()
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Calories must be a non-negative number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const meal = user.meals.id(req.params.mealId);
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const { mealType, foods, notes } = req.body;

    if (mealType) meal.mealType = mealType;
    if (foods) {
      meal.foods = foods;
      meal.totalCalories = foods.reduce((sum, food) => sum + food.calories, 0);
    }
    if (notes !== undefined) meal.notes = notes;

    await user.save();

    // Get updated daily calories
    const dailyCalories = user.getDailyCalories(meal.date);

    res.json({
      message: 'Meal updated successfully',
      meal,
      dailyCalories
    });
  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a meal with cache invalidation
router.delete('/:mealId', auth, invalidateCache(['meals', 'daily', 'weekly']), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const meal = user.meals.id(req.params.mealId);
    if (!meal) {
      return res.status(404).json({ message: 'Meal not found' });
    }

    const mealDate = meal.date;
    meal.deleteOne();
    await user.save();

    // Get updated daily calories
    const dailyCalories = user.getDailyCalories(mealDate);

    res.json({
      message: 'Meal deleted successfully',
      dailyCalories
    });
  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get food database/suggestions with caching (cached for 24 hours since it rarely changes)
router.get('/food-database', cache(86400), async (req, res) => {
  try {
    const { search } = req.query;
    
    // Basic food database - in a real app, this would be a separate collection
    const foodDatabase = [
      // Grains & Cereals
      { name: 'Rice (cooked)', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: '100g' },
      { name: 'Wheat Bread', calories: 265, protein: 9, carbs: 49, fat: 3.2, unit: '100g' },
      { name: 'Oats', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, unit: '100g' },
      { name: 'Quinoa (cooked)', calories: 120, protein: 4.4, carbs: 22, fat: 1.9, unit: '100g' },
      
      // Proteins
      { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: '100g' },
      { name: 'Eggs', calories: 155, protein: 13, carbs: 1.1, fat: 11, unit: '100g' },
      { name: 'Salmon', calories: 208, protein: 20, carbs: 0, fat: 13, unit: '100g' },
      { name: 'Lentils (cooked)', calories: 116, protein: 9, carbs: 20, fat: 0.4, unit: '100g' },
      { name: 'Tofu', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, unit: '100g' },
      
      // Vegetables
      { name: 'Broccoli', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, unit: '100g' },
      { name: 'Spinach', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, unit: '100g' },
      { name: 'Tomato', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, unit: '100g' },
      { name: 'Carrots', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, unit: '100g' },
      { name: 'Potato', calories: 77, protein: 2, carbs: 17, fat: 0.1, unit: '100g' },
      
      // Fruits
      { name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, unit: '100g' },
      { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: '100g' },
      { name: 'Orange', calories: 47, protein: 0.9, carbs: 12, fat: 0.1, unit: '100g' },
      { name: 'Mango', calories: 60, protein: 0.8, carbs: 15, fat: 0.4, unit: '100g' },
      
      // Dairy
      { name: 'Milk (whole)', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, unit: '100ml' },
      { name: 'Greek Yogurt', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, unit: '100g' },
      { name: 'Cheese (cheddar)', calories: 403, protein: 25, carbs: 1.3, fat: 33, unit: '100g' },
      
      // Nuts & Seeds
      { name: 'Almonds', calories: 579, protein: 21, carbs: 22, fat: 50, unit: '100g' },
      { name: 'Walnuts', calories: 654, protein: 15, carbs: 14, fat: 65, unit: '100g' },
      { name: 'Peanuts', calories: 567, protein: 26, carbs: 16, fat: 49, unit: '100g' },
      
      // Oils & Fats
      { name: 'Olive Oil', calories: 884, protein: 0, carbs: 0, fat: 100, unit: '100ml' },
      { name: 'Butter', calories: 717, protein: 0.9, carbs: 0.1, fat: 81, unit: '100g' }
    ];
    
    let filteredFoods = foodDatabase;
    
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      filteredFoods = foodDatabase.filter(food => 
        food.name.toLowerCase().includes(searchTerm)
      );
    }
    
    res.json({
      foods: filteredFoods.slice(0, 20), // Limit to 20 results
      total: filteredFoods.length
    });
  } catch (error) {
    console.error('Error fetching food database:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
