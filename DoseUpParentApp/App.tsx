import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import MedicineDetailScreen from './screens/MedicineDetailScreen';

// Utils
import { requestNotificationPermissions, scheduleAllMedicineNotifications } from './utils/notifications';
import { getMedicinesForParent, ParentData } from './utils/firebase';

// Theme colors
const COLORS = {
  primary: '#6C63FF',
  secondary: '#4CAF50',
  accent: '#F7F8FA',
  background: '#FFFFFF',
  text: '#333333',
};

// Define navigation param list
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MedicineDetail: { medicineId: string; adminId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Login');

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Check for existing session in AsyncStorage
      const sessionStr = await AsyncStorage.getItem('parentSession');
      
      if (sessionStr) {
        const session: ParentData = JSON.parse(sessionStr);
        
        // Verify session has required fields
        if (session.parentId && session.adminId) {
          setInitialRoute('Home');
          
          // Request notification permissions
          await requestNotificationPermissions();
          
          // Reschedule notifications for existing medicines
          if (session.adminId !== 'demo-admin') {
            try {
              const medicines = await getMedicinesForParent(session.adminId, session.parentId);
              await scheduleAllMedicineNotifications(medicines);
            } catch (err) {
              console.error('Error rescheduling notifications:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
      // Clear corrupted session
      await AsyncStorage.removeItem('parentSession');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
        <Image
                source={require("./assets/logo.png")}
                style={{ width: 100, height: 100 }}
              />
        </View>
        <Text style={styles.appName}>DoseUp</Text>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={styles.spinner}
        />
        <Text style={styles.loadingText}>Loading...</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: COLORS.accent },
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="MedicineDetail"
          component={MedicineDetailScreen}
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  logoContainer: {
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text,
    opacity: 0.6,
  },
});

export default App;
