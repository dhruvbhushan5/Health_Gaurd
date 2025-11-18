# Health Guard - Personal Health Management Platform

A comprehensive full-stack health management application that allows users to track their health metrics, manage diseases and medications, and receive AI-powered personalized calorie recommendations.

## 🚀 Features

### User Authentication
- **Secure Registration & Login**: JWT-based authentication system
- **Password Protection**: Bcrypt hashing for secure password storage
- **Token Verification**: Automatic token validation and user session management

### Health Metrics Tracking
- **Physical Measurements**: Height, weight, BMI calculation
- **Vital Signs**: Blood pressure (systolic/diastolic), blood sugar, cholesterol levels
- **Data Validation**: Input validation with reasonable ranges for all health metrics
- **Progress Tracking**: Historical data with timestamps

### Disease Management
- **Common Conditions**: Pre-defined list of common diseases and conditions
- **Personal Health Profile**: Track diagnosed conditions with dates
- **Disease Impact**: Consider health conditions in AI recommendations

### Medication Tracking
- **Comprehensive Records**: Track medication names, dosages, frequencies
- **Medication Scheduling**: Start dates, end dates, and active status
- **Detailed Notes**: Additional information and special instructions
- **Easy Management**: Add, edit, delete, and deactivate medications

### AI-Powered Recommendations
- **Personalized Calorie Calculations**: AI analyzes health profile for custom recommendations
- **Dietary Guidance**: Specific food recommendations based on health conditions
- **Medical Awareness**: Considers current medications and health conditions
- **Fallback System**: Rule-based recommendations when AI is unavailable
- **Recommendation History**: Track previous AI suggestions and recommendations

### Modern User Interface
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Intuitive Navigation**: Clean, user-friendly interface with easy navigation
- **Real-time Updates**: Live data updates and instant feedback
- **Dashboard Overview**: Comprehensive health summary at a glance

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **React Router DOM** for client-side navigation
- **CSS3** with modern styling and responsive design
- **Axios** for API communication
- **Context API** for state management

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM for data persistence
- **JWT** for authentication and authorization
- **bcryptjs** for password hashing
- **express-validator** for input validation
- **helmet** for security headers
- **cors** for cross-origin resource sharing
- **rate-limiting** for API protection

### AI Integration
- **OpenAI GPT-3.5-turbo** for intelligent health recommendations
- **Fallback System** with rule-based recommendations
- **BMR Calculations** using Mifflin-St Jeor Equation
- **Health-aware Algorithms** that consider medical conditions

### Security Features
- **Input Validation**: Comprehensive validation on both client and server
- **Rate Limiting**: API protection against abuse
- **Security Headers**: Helmet.js for security best practices
- **CORS Configuration**: Controlled cross-origin access
- **JWT Security**: Secure token-based authentication

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MongoDB** (v5 or higher) - Local installation or MongoDB Atlas
- **OpenAI API Key** (optional, for AI recommendations)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd health-guard
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# Required variables:
# - MONGODB_URI: Your MongoDB connection string
# - JWT_SECRET: A secure random string for JWT signing
# - OPENAI_API_KEY: Your OpenAI API key (optional)
```

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

### 5. Database Setup
Make sure MongoDB is running on your system or configure MongoDB Atlas connection in your `.env` file.

## 🏃‍♂️ Running the Application

### Start the Backend Server
```bash
cd backend
npm run dev
# Server will start on http://localhost:5000
```

### Start the Frontend Application
```bash
cd frontend
npm start
# Application will open on http://localhost:3000
```

## 📁 Project Structure

```
health-guard/
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   └── src/
│       ├── components/
│       │   ├── Auth/          # Login and Registration
│       │   ├── Dashboard/     # Main dashboard
│       │   ├── Health/        # Health metrics, diseases, medications
│       │   ├── AI/           # AI recommendations
│       │   └── Layout/       # Navigation and layout
│       ├── contexts/
│       │   └── AuthContext.tsx
│       ├── App.tsx
│       └── index.tsx
├── backend/
│   ├── models/
│   │   └── User.js           # User data model
│   ├── routes/
│   │   ├── auth.js          # Authentication routes
│   │   ├── health.js        # Health data routes
│   │   └── ai.js           # AI recommendation routes
│   ├── middleware/
│   │   └── auth.js         # JWT authentication middleware
│   └── server.js           # Express server configuration
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Health Data
- `GET /api/health/metrics` - Get user's health metrics
- `PUT /api/health/metrics` - Update health metrics
- `GET /api/health/diseases` - Get user's diseases
- `PUT /api/health/diseases` - Update diseases
- `GET /api/health/medications` - Get medications
- `POST /api/health/medications` - Add new medication
- `PUT /api/health/medications/:id` - Update medication
- `DELETE /api/health/medications/:id` - Delete medication
- `GET /api/health/summary` - Get health summary

### AI Recommendations
- `POST /api/ai/calorie-recommendation` - Generate AI recommendation
- `GET /api/ai/recommendations` - Get recommendation history
- `DELETE /api/ai/recommendations/:id` - Delete recommendation

## 🤖 AI Features

### Intelligent Calorie Recommendations
The AI system analyzes multiple factors to provide personalized recommendations:

- **Physical Metrics**: Height, weight, BMI calculations
- **Health Conditions**: Considers diseases like diabetes, hypertension, heart disease
- **Medications**: Accounts for current medications and their effects
- **Lifestyle Factors**: Activity level assumptions and dietary restrictions

### Fallback System
When OpenAI API is unavailable, the system uses:
- **BMR Calculations**: Mifflin-St Jeor Equation for baseline metabolism
- **Condition-specific Adjustments**: Rule-based modifications for health conditions
- **Safe Recommendations**: Conservative, medically-aware suggestions

## 🔒 Security Considerations

- **Input Validation**: All user inputs are validated on both client and server
- **Rate Limiting**: API endpoints are protected against abuse
- **Secure Headers**: Helmet.js provides security headers
- **Password Security**: Bcrypt with salt rounds for password hashing
- **JWT Security**: Secure token generation and validation
- **CORS Protection**: Controlled cross-origin resource sharing

## 🎯 Usage Guide

### 1. Registration and Login
- Create an account with your email and password
- Log in to access your personal health dashboard

### 2. Health Metrics
- Enter your basic measurements (height, weight)
- Add vital signs (blood pressure, blood sugar, cholesterol)
- Update your metrics regularly for accurate recommendations

### 3. Disease Management
- Select any diagnosed health conditions from the comprehensive list
- The system will consider these conditions in AI recommendations

### 4. Medication Tracking
- Add all current medications with dosages and frequencies
- Include start/end dates and additional notes
- Mark medications as active or inactive

### 5. AI Recommendations
- Generate personalized calorie recommendations
- View detailed dietary guidance based on your health profile
- Access your recommendation history

## ⚠️ Important Disclaimers

- **Medical Advice**: This application provides informational content only and should not replace professional medical advice
- **Consultation**: Always consult healthcare professionals before making significant dietary or lifestyle changes
- **Accuracy**: While the AI provides evidence-based recommendations, individual needs may vary
- **Emergency**: This app is not intended for emergency medical situations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the existing issues in the repository
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs
4. Provide your environment details (Node.js version, OS, etc.)

## 🔮 Future Enhancements

- **Exercise Tracking**: Add workout and activity monitoring
- **Meal Planning**: AI-powered meal suggestions and planning
- **Integration**: Connect with health devices and wearables
- **Analytics**: Advanced health trend analysis and insights
- **Social Features**: Health community and support groups
- **Mobile App**: Native mobile applications for iOS and Android
- **Telemedicine**: Integration with healthcare providers

---

**Built with ❤️ for better health management**
