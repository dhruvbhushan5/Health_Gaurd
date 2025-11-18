const mongoose = require('mongoose');
const { hashPassword, comparePassword } = require('../utils/encryption');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  healthMetrics: {
    height: {
      type: Number,
      min: [50, 'Height must be at least 50 cm'],
      max: [250, 'Height cannot exceed 250 cm']
    },
    weight: {
      type: Number,
      min: [20, 'Weight must be at least 20 kg'],
      max: [300, 'Weight cannot exceed 300 kg']
    },
    bloodPressureSystolic: {
      type: Number,
      min: [70, 'Systolic pressure must be at least 70 mmHg'],
      max: [200, 'Systolic pressure cannot exceed 200 mmHg']
    },
    bloodPressureDiastolic: {
      type: Number,
      min: [40, 'Diastolic pressure must be at least 40 mmHg'],
      max: [130, 'Diastolic pressure cannot exceed 130 mmHg']
    },
    bloodSugar: {
      type: Number,
      min: [50, 'Blood sugar must be at least 50 mg/dL'],
      max: [400, 'Blood sugar cannot exceed 400 mg/dL']
    },
    cholesterol: {
      type: Number,
      min: [100, 'Cholesterol must be at least 100 mg/dL'],
      max: [400, 'Cholesterol cannot exceed 400 mg/dL']
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  diseases: [{
    name: {
      type: String,
      required: true
    },
    diagnosed: {
      type: Boolean,
      default: false
    },
    diagnosisDate: Date,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    }
  }],
  medications: [{
    name: {
      type: String,
      required: true
    },
    dosage: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: Date,
    notes: String,
    active: {
      type: Boolean,
      default: true
    }
  }],
  meals: [{
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      required: true
    },
    foods: [{
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      unit: {
        type: String,
        required: true,
        default: 'grams'
      },
      calories: {
        type: Number,
        required: true
      },
      protein: Number,
      carbs: Number,
      fat: Number,
      fiber: Number
    }],
    totalCalories: {
      type: Number,
      required: true
    },
    notes: String
  }],
  aiRecommendations: [{
    type: {
      type: String,
      enum: ['calorie', 'exercise', 'diet', 'general'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    calories: Number,
    reasoning: String
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await comparePassword(candidatePassword, this.password);
};

// Calculate BMI
userSchema.methods.calculateBMI = function() {
  if (!this.healthMetrics.height || !this.healthMetrics.weight) return null;
  const heightInMeters = this.healthMetrics.height / 100;
  return this.healthMetrics.weight / (heightInMeters * heightInMeters);
};

// Get health status summary
userSchema.methods.getHealthSummary = function() {
  const bmi = this.calculateBMI();
  const activeDiseases = this.diseases.filter(d => d.diagnosed);
  const activeMedications = this.medications.filter(m => m.active);
  
  return {
    bmi: bmi ? parseFloat(bmi.toFixed(1)) : null,
    activeDiseases: activeDiseases.length,
    activeMedications: activeMedications.length,
    lastHealthUpdate: this.healthMetrics.lastUpdated
  };
};

// Calculate daily calories consumed
userSchema.methods.getDailyCalories = function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const dayMeals = this.meals.filter(meal => 
    meal.date >= startOfDay && meal.date <= endOfDay
  );
  
  const totalCalories = dayMeals.reduce((total, meal) => total + meal.totalCalories, 0);
  
  const mealBreakdown = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0
  };
  
  dayMeals.forEach(meal => {
    mealBreakdown[meal.mealType] += meal.totalCalories;
  });
  
  return {
    totalCalories,
    mealBreakdown,
    mealCount: dayMeals.length,
    meals: dayMeals
  };
};

// Get weekly calorie summary
userSchema.methods.getWeeklyCalories = function(date = new Date()) {
  const weekData = [];
  
  for (let i = 6; i >= 0; i--) {
    const day = new Date(date);
    day.setDate(day.getDate() - i);
    
    const dayCalories = this.getDailyCalories(day);
    weekData.push({
      date: day.toISOString().split('T')[0],
      calories: dayCalories.totalCalories,
      mealBreakdown: dayCalories.mealBreakdown
    });
  }
  
  return weekData;
};

module.exports = mongoose.model('User', userSchema);
