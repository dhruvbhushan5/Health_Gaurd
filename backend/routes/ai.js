const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const redisClient = require('../config/redis');
const User = require('../models/User');

const router = express.Router();

// Helper function to generate AI prompt
const generateHealthPrompt = (user) => {
  const { healthMetrics, diseases, medications } = user;
  const activeDiseases = diseases.filter(d => d.diagnosed).map(d => d.name);
  const activeMedications = medications.filter(m => m.active);
  
  const bmi = user.calculateBMI();
  
  return `
    As a qualified nutritionist and health expert, please provide personalized calorie recommendations for this user:
    
    User Health Profile:
    - Height: ${healthMetrics.height || 'Not provided'} cm
    - Weight: ${healthMetrics.weight || 'Not provided'} kg
    - BMI: ${bmi ? bmi.toFixed(1) : 'Cannot calculate'}
    - Blood Pressure: ${healthMetrics.bloodPressureSystolic || 'Not provided'}/${healthMetrics.bloodPressureDiastolic || 'Not provided'} mmHg
    - Blood Sugar: ${healthMetrics.bloodSugar || 'Not provided'} mg/dL
    - Cholesterol: ${healthMetrics.cholesterol || 'Not provided'} mg/dL
    
    Current Health Conditions: ${activeDiseases.length > 0 ? activeDiseases.join(', ') : 'None reported'}
    
    Current Medications: ${activeMedications.length > 0 ? 
      activeMedications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join(', ') : 
      'None reported'}
    
    Please provide:
    1. Recommended daily calorie intake
    2. Specific dietary recommendations based on their health conditions
    3. Foods to avoid given their current medications and health conditions
    4. General health tips
    5. Any warnings or considerations
    
    Please be specific with calorie numbers and provide practical, actionable advice. Format your response in a clear, structured way.
  `;
};

// Get AI-powered calorie recommendations
router.post('/calorie-recommendation', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Check if user has basic health metrics
    if (!user.healthMetrics.height || !user.healthMetrics.weight) {
      return res.status(400).json({
        message: 'Please complete your health metrics (height and weight) before getting AI recommendations'
      });
    }

    // 🎯 CALORIE CALCULATION CACHING
    // Calculate BMI and get user diseases for cache key
    const bmi = user.calculateBMI();
    const activeDiseases = user.diseases.filter(d => d.diagnosed).map(d => d.name);
    
    // Try to get cached result first
    const cachedResult = await redisClient.getCaloricResult(bmi, activeDiseases);
    if (cachedResult) {
      console.log(`🧮 Serving calorie recommendation from cache (BMI: ${bmi}, Diseases: ${activeDiseases.join(',')})`);
      
      // Save cached recommendation to user's history
      const recommendation = {
        type: 'calorie',
        content: cachedResult.content,
        calories: cachedResult.calories,
        reasoning: cachedResult.reasoning + ' (Cached result)',
        createdAt: new Date()
      };

      user.aiRecommendations.push(recommendation);
      await user.save();

      return res.json({
        message: 'Calorie recommendation retrieved from cache',
        recommendation
      });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      // Fallback to rule-based recommendations
      const fallbackRecommendation = generateFallbackRecommendation(user);
      
      // 🎯 Cache the fallback recommendation
      await redisClient.setCaloricResult(bmi, activeDiseases, fallbackRecommendation, 7200); // 2 hours
      
      // Save recommendation
      const recommendation = {
        type: 'calorie',
        content: fallbackRecommendation.content,
        calories: fallbackRecommendation.calories,
        reasoning: fallbackRecommendation.reasoning,
        createdAt: new Date()
      };

      user.aiRecommendations.push(recommendation);
      await user.save();

      return res.json({
        message: 'Calorie recommendation generated successfully (using rule-based system)',
        recommendation
      });
    }

    // Generate AI recommendation using OpenAI
    const prompt = generateHealthPrompt(user);
    
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a qualified nutritionist and health expert. Provide accurate, safe, and personalized health advice. Always include specific calorie recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;
    
    // Extract calorie recommendation from AI response
    const calorieMatch = aiResponse.match(/(\d{1,4})\s*(?:to\s*(\d{1,4}))?\s*calories/i);
    const recommendedCalories = calorieMatch ? 
      (calorieMatch[2] ? Math.round((parseInt(calorieMatch[1]) + parseInt(calorieMatch[2])) / 2) : parseInt(calorieMatch[1])) :
      null;

    // Prepare recommendation data
    const recommendationData = {
      content: aiResponse,
      calories: recommendedCalories,
      reasoning: 'AI-generated recommendation based on health profile'
    };

    // 🎯 Cache the AI recommendation for similar users
    await redisClient.setCaloricResult(bmi, activeDiseases, recommendationData, 10800); // 3 hours

    // Save recommendation
    const recommendation = {
      type: 'calorie',
      ...recommendationData,
      createdAt: new Date()
    };

    user.aiRecommendations.push(recommendation);
    await user.save();

    res.json({
      message: 'AI calorie recommendation generated successfully',
      recommendation
    });

  } catch (error) {
    console.error('AI recommendation error:', error);
    
    // Fallback to rule-based recommendation on error
    try {
      const user = await User.findById(req.user._id);
      const fallbackRecommendation = generateFallbackRecommendation(user);
      
      const recommendation = {
        type: 'calorie',
        content: fallbackRecommendation.content,
        calories: fallbackRecommendation.calories,
        reasoning: fallbackRecommendation.reasoning,
        createdAt: new Date()
      };

      user.aiRecommendations.push(recommendation);
      await user.save();

      res.json({
        message: 'Fallback calorie recommendation generated',
        recommendation
      });
    } catch (fallbackError) {
      console.error('Fallback recommendation error:', fallbackError);
      res.status(500).json({
        message: 'Failed to generate calorie recommendation'
      });
    }
  }
});

// Rule-based fallback recommendation system
const generateFallbackRecommendation = (user) => {
  const { healthMetrics, diseases } = user;
  const bmi = user.calculateBMI();
  
  // Basic BMR calculation (Mifflin-St Jeor Equation)
  // Note: This is a simplified version, real implementation would need gender and age
  const estimatedAge = 30; // Default assumption
  const estimatedGender = 'mixed'; // Default assumption
  
  // Rough BMR calculation
  let baseBMR = 10 * healthMetrics.weight + 6.25 * healthMetrics.height - 5 * estimatedAge;
  let dailyCalories = Math.round(baseBMR * 1.5); // Light activity level
  
  // Adjust based on BMI
  if (bmi < 18.5) {
    dailyCalories += 200; // Increase for underweight
  } else if (bmi > 25) {
    dailyCalories -= 300; // Decrease for overweight
  }
  
  // Adjust based on health conditions
  const activeDiseases = diseases.filter(d => d.diagnosed);
  let adjustments = [];
  
  activeDiseases.forEach(disease => {
    switch (disease.name.toLowerCase()) {
      case 'diabetes type 1':
      case 'diabetes type 2':
        adjustments.push('Focus on complex carbohydrates and limit simple sugars');
        break;
      case 'hypertension':
        adjustments.push('Limit sodium intake to less than 2300mg per day');
        break;
      case 'heart disease':
        adjustments.push('Focus on heart-healthy fats and limit saturated fats');
        break;
      case 'high cholesterol':
        adjustments.push('Limit dietary cholesterol and increase fiber intake');
        break;
    }
  });
  
  const content = `
**Recommended Daily Calorie Intake: ${dailyCalories} calories**

**Your Health Profile Summary:**
- BMI: ${bmi ? bmi.toFixed(1) : 'Not available'} ${bmi ? getBMICategory(bmi) : ''}
- Blood Pressure: ${healthMetrics.bloodPressureSystolic || 'Not provided'}/${healthMetrics.bloodPressureDiastolic || 'Not provided'} mmHg
- Blood Sugar: ${healthMetrics.bloodSugar || 'Not provided'} mg/dL

**Dietary Recommendations:**
${adjustments.length > 0 ? adjustments.map(adj => `• ${adj}`).join('\n') : '• Follow a balanced diet with variety from all food groups'}
• Eat 5-6 small meals throughout the day
• Stay hydrated with at least 8 glasses of water daily
• Include lean proteins, whole grains, fruits, and vegetables

**General Health Tips:**
• Regular physical activity is recommended
• Monitor your health metrics regularly
• Consult with healthcare professionals for personalized advice
• This is a general recommendation - individual needs may vary

**Note:** This recommendation is based on general health guidelines. Please consult with a healthcare professional or registered dietitian for personalized advice.
  `;
  
  return {
    content: content.trim(),
    calories: dailyCalories,
    reasoning: 'Rule-based calculation using BMR and health profile adjustments'
  };
};

const getBMICategory = (bmi) => {
  if (bmi < 18.5) return '(Underweight)';
  if (bmi < 25) return '(Normal weight)';
  if (bmi < 30) return '(Overweight)';
  return '(Obese)';
};

// Get user's AI recommendations history
router.get('/recommendations', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const recommendations = user.aiRecommendations
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10); // Last 10 recommendations
    
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      message: 'Failed to fetch recommendations'
    });
  }
});

// Delete a recommendation
router.delete('/recommendations/:recommendationId', auth, async (req, res) => {
  try {
    const { recommendationId } = req.params;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { aiRecommendations: { _id: recommendationId } } },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({
        message: 'Recommendation not found'
      });
    }
    
    res.json({
      message: 'Recommendation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting recommendation:', error);
    res.status(500).json({
      message: 'Failed to delete recommendation'
    });
  }
});

module.exports = router;
