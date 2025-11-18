const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { cache, invalidateCache, healthCacheKey } = require('../middleware/cache');
const redisClient = require('../config/redis');
const User = require('../models/User');

const router = express.Router();

// Get user's health metrics with enhanced caching
router.get('/metrics', auth, cache(3600, healthCacheKey('metrics')), async (req, res) => {
  try {
    // 🎯 Try to get from Redis health data cache first
    const cachedHealthData = await redisClient.getHealthData(req.user._id);
    if (cachedHealthData) {
      console.log(`📊 Serving health data from Redis cache for user ${req.user._id}`);
      return res.json(cachedHealthData);
    }

    // Fallback to database
    const user = await User.findById(req.user._id);
    const healthMetrics = user.healthMetrics;

    // Calculate BMI and additional health insights
    let calculatedData = { ...healthMetrics };
    if (healthMetrics.height && healthMetrics.weight) {
      const heightInM = healthMetrics.height / 100;
      const bmi = healthMetrics.weight / (heightInM * heightInM);
      calculatedData.bmi = Math.round(bmi * 100) / 100;
      calculatedData.bmiCategory = getBMICategory(bmi);
    }

    // 🎯 Cache the calculated health data in Redis
    await redisClient.setHealthData(req.user._id, calculatedData, 1800); // 30 minutes

    res.json(calculatedData);
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    res.status(500).json({
      message: 'Failed to fetch health metrics'
    });
  }
});

// Update health metrics with cache invalidation
router.put('/metrics', auth, invalidateCache(['health', 'summary']), [
  body('height')
    .optional()
    .isFloat({ min: 50, max: 250 })
    .withMessage('Height must be between 50 and 250 cm'),
  body('weight')
    .optional()
    .isFloat({ min: 20, max: 300 })
    .withMessage('Weight must be between 20 and 300 kg'),
  body('bloodPressureSystolic')
    .optional()
    .isInt({ min: 70, max: 200 })
    .withMessage('Systolic pressure must be between 70 and 200 mmHg'),
  body('bloodPressureDiastolic')
    .optional()
    .isInt({ min: 40, max: 130 })
    .withMessage('Diastolic pressure must be between 40 and 130 mmHg'),
  body('bloodSugar')
    .optional()
    .isInt({ min: 50, max: 400 })
    .withMessage('Blood sugar must be between 50 and 400 mg/dL'),
  body('cholesterol')
    .optional()
    .isInt({ min: 100, max: 400 })
    .withMessage('Cholesterol must be between 100 and 400 mg/dL')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      height,
      weight,
      bloodPressureSystolic,
      bloodPressureDiastolic,
      bloodSugar,
      cholesterol
    } = req.body;

    const updateData = {
      lastUpdated: new Date()
    };

    // Only update provided fields
    if (height !== undefined) updateData.height = height;
    if (weight !== undefined) updateData.weight = weight;
    if (bloodPressureSystolic !== undefined) updateData.bloodPressureSystolic = bloodPressureSystolic;
    if (bloodPressureDiastolic !== undefined) updateData.bloodPressureDiastolic = bloodPressureDiastolic;
    if (bloodSugar !== undefined) updateData.bloodSugar = bloodSugar;
    if (cholesterol !== undefined) updateData.cholesterol = cholesterol;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { healthMetrics: updateData } },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Health metrics updated successfully',
      healthMetrics: user.healthMetrics
    });
  } catch (error) {
    console.error('Error updating health metrics:', error);
    res.status(500).json({
      message: 'Failed to update health metrics'
    });
  }
});

// Get user's diseases with caching
router.get('/diseases', auth, cache(3600, healthCacheKey('diseases')), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.diseases);
  } catch (error) {
    console.error('Error fetching diseases:', error);
    res.status(500).json({
      message: 'Failed to fetch diseases'
    });
  }
});

// Update diseases with cache invalidation
router.put('/diseases', auth, async (req, res) => {
  try {
    const { diseases } = req.body;
    
    console.log('🔍 PUT /diseases called by user:', req.user._id);
    console.log('📋 Request body:', JSON.stringify(req.body, null, 2));

    if (!Array.isArray(diseases)) {
      console.log('❌ Validation failed: diseases is not an array');
      return res.status(400).json({
        message: 'Diseases must be an array'
      });
    }

    console.log('📋 Diseases array is valid, length:', diseases.length);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { diseases } },
      { new: true, runValidators: true }
    );

    console.log('✅ User found and updated successfully');
    console.log('📋 Updated diseases count:', user.diseases.length);

    res.json({
      message: 'Diseases updated successfully',
      diseases: user.diseases
    });
  } catch (error) {
    console.error('❌ Error updating diseases:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to update diseases'
    });
  }
});

// Get user's medications
router.get('/medications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.medications);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({
      message: 'Failed to fetch medications'
    });
  }
});

// Add new medication
router.post('/medications', [
  auth,
  body('name')
    .notEmpty()
    .withMessage('Medication name is required'),
  body('dosage')
    .notEmpty()
    .withMessage('Dosage is required'),
  body('frequency')
    .notEmpty()
    .withMessage('Frequency is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, dosage, frequency, notes, endDate } = req.body;

    const medication = {
      name,
      dosage,
      frequency,
      notes,
      endDate: endDate ? new Date(endDate) : undefined,
      startDate: new Date(),
      active: true
    };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { medications: medication } },
      { new: true, runValidators: true }
    );

    res.status(201).json({
      message: 'Medication added successfully',
      medications: user.medications
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({
      message: 'Failed to add medication'
    });
  }
});

// Update medication
router.put('/medications/:medicationId', auth, async (req, res) => {
  try {
    const { medicationId } = req.params;
    const updates = req.body;

    const user = await User.findOneAndUpdate(
      { 
        _id: req.user._id, 
        'medications._id': medicationId 
      },
      { 
        $set: {
          'medications.$.name': updates.name,
          'medications.$.dosage': updates.dosage,
          'medications.$.frequency': updates.frequency,
          'medications.$.notes': updates.notes,
          'medications.$.endDate': updates.endDate ? new Date(updates.endDate) : undefined,
          'medications.$.active': updates.active !== undefined ? updates.active : true
        }
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: 'Medication not found'
      });
    }

    res.json({
      message: 'Medication updated successfully',
      medications: user.medications
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({
      message: 'Failed to update medication'
    });
  }
});

// Delete medication
router.delete('/medications/:medicationId', auth, async (req, res) => {
  try {
    const { medicationId } = req.params;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { medications: { _id: medicationId } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        message: 'Medication not found'
      });
    }

    res.json({
      message: 'Medication deleted successfully',
      medications: user.medications
    });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({
      message: 'Failed to delete medication'
    });
  }
});

// Get health summary
router.get('/summary', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const summary = user.getHealthSummary();
    
    res.json({
      ...summary,
      healthMetrics: user.healthMetrics,
      recentDiseases: user.diseases.filter(d => d.diagnosed).slice(-5),
      recentMedications: user.medications.filter(m => m.active).slice(-5)
    });
  } catch (error) {
    console.error('Error fetching health summary:', error);
    res.status(500).json({
      message: 'Failed to fetch health summary'
    });
  }
});

// 🎯 HELPER FUNCTIONS
function getBMICategory(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

module.exports = router;
