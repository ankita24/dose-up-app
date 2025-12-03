# DoseUp Parent App

A React Native Expo app for parents to track and manage their family's medicine schedules with real-time updates and notifications.

## Features

- 📱 **Phone Number Authentication** - Secure OTP-based login with Firebase Auth
- 💊 **Medicine Dashboard** - View all medicines assigned to you with real-time updates
- ✅ **Mark as Taken** - Track medicine intake with one tap
- 🔔 **Push Notifications** - Daily reminders for each medicine dose time
- 📊 **Progress Tracking** - See daily progress at a glance
- 📝 **Medicine Details** - View detailed information including notes and history

## Tech Stack

- **Framework**: React Native + Expo
- **Language**: TypeScript
- **Backend**: Firebase (Authentication + Firestore)
- **Notifications**: expo-notifications
- **Navigation**: React Navigation
- **Storage**: AsyncStorage

## Project Structure

```
DoseUpParentApp/
├── App.tsx                 # Main app entry with navigation
├── components/
│   └── MedicineCard.tsx    # Reusable medicine card component
├── screens/
│   ├── LoginScreen.tsx     # Phone authentication screen
│   ├── HomeScreen.tsx      # Medicine dashboard
│   └── MedicineDetailScreen.tsx  # Medicine details
├── utils/
│   ├── firebase.ts         # Firebase configuration and helpers
│   └── notifications.ts    # Notification scheduling logic
├── assets/                 # App icons and images
├── app.json               # Expo configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable **Phone Authentication** in Authentication > Sign-in method
4. Create a **Firestore Database**

### 2. Configure Firebase

Update `/utils/firebase.ts` with your Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 3. Firestore Structure

The app expects this Firestore structure:

```
users/
  └── {adminId}/
      ├── parents/
      │   └── {parentId}/
      │       ├── phoneNumber: string
      │       └── name: string
      └── medicines/
          └── {medicineId}/
              ├── name: string
              ├── parentId: string
              ├── doseTimes: string[]  # ["09:00", "14:00", "20:00"]
              ├── dosage: string (optional)
              ├── notes: string (optional)
              ├── reminderInterval: number (optional)
              └── lastTakenAt: string (optional)
```

## Installation

```bash
# Clone the repository
cd DoseUpParentApp

# Install dependencies
npm install

# Start the development server
npx expo start
```

## Running the App

### Expo Go (Development)
1. Install Expo Go on your iOS/Android device
2. Run `npx expo start`
3. Scan the QR code with Expo Go

### Demo Mode
The app includes a demo mode that works without Firebase configuration:
- Enter any phone number
- Enter any 6-digit OTP
- View sample medicines and test all features

### Production Build
```bash
# iOS
npx expo build:ios

# Android
npx expo build:android

# Or use EAS Build
npx eas build --platform all
```

## Notifications

The app schedules daily notifications for each medicine based on dose times. Notifications are:
- Rescheduled when medicines are updated
- Cleared and reset on app restart
- Configured with the app's primary color (#6C63FF)

### Testing Notifications

In the demo mode, notifications are scheduled for the sample medicines. You can test by:
1. Opening the app
2. Allowing notification permissions
3. Waiting for scheduled dose times

## Theme Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#6C63FF` | Buttons, accents, branding |
| Secondary | `#4CAF50` | Success states, taken indicators |
| Accent | `#F7F8FA` | Background, cards |
| Background | `#FFFFFF` | Main background |

## Key Dependencies

```json
{
  "@react-native-async-storage/async-storage": "^1.21.0",
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/native-stack": "^6.9.17",
  "expo": "~50.0.0",
  "expo-notifications": "~0.27.6",
  "firebase": "^10.7.1"
}
```

## Security Notes

- Phone numbers are verified through Firebase Auth
- Parent can only see medicines where `medicine.parentId === loggedInParentId`
- Session stored securely in AsyncStorage
- No sensitive data stored locally

## License

MIT License - See LICENSE file for details.
