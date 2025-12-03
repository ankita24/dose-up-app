import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { findParentByPhone, ParentData } from '../utils/firebase';
import { requestNotificationPermissions } from '../utils/notifications';

// Theme colors
const COLORS = {
  primary: '#6C63FF',
  secondary: '#4CAF50',
  accent: '#F7F8FA',
  background: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  border: '#E0E0E0',
  error: '#F44336',
};

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MedicineDetail: { medicineId: string };
};

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Countdown timer for resend OTP
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhoneNumber = (text: string): string => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    
    // Format as +1 (234) 567-8900
    if (cleaned.length <= 1) return cleaned;
    if (cleaned.length <= 4) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1)}`;
    if (cleaned.length <= 7) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handlePhoneChange = (text: string) => {
    setError(null);
    setPhoneNumber(formatPhoneNumber(text));
  };

  const handleSendOTP = async () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanedPhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would use Firebase Phone Auth
      // For demo/testing purposes, we'll simulate OTP sending
      // and proceed directly to OTP verification
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStep('otp');
      setCountdown(60);
      
      // Focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
      
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    setError(null);
    
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      
      // Focus appropriate input
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In a real app, this would verify with Firebase
      // For demo purposes, we'll accept any 6-digit code
      // and look up the parent by phone number
      
      const cleanedPhone = phoneNumber.replace(/\D/g, '');
      
      // Find parent in Firestore
      const parentData = await findParentByPhone(cleanedPhone);
      
      if (!parentData) {
        // For demo, create a mock parent session
        const mockParent: ParentData = {
          parentId: 'demo-parent-' + cleanedPhone,
          phoneNumber: cleanedPhone,
          adminId: 'demo-admin',
          name: 'Parent User',
        };
        
        await AsyncStorage.setItem('parentSession', JSON.stringify(mockParent));
        
        // Request notification permissions
        await requestNotificationPermissions();
        
        navigation.replace('Home');
        return;
      }
      
      // Store parent session
      await AsyncStorage.setItem('parentSession', JSON.stringify(parentData));
      
      // Request notification permissions
      await requestNotificationPermissions();
      
      // Navigate to Home
      navigation.replace('Home');
      
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setIsLoading(true);
    setError(null);
    setOtp(['', '', '', '', '', '']);

    try {
      // Simulate resending OTP
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCountdown(60);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>💊</Text>
            </View>
            <Text style={styles.appName}>DoseUp</Text>
          </View>

          <Text style={styles.welcomeText}>Welcome to DoseUp</Text>
          <Text style={styles.subtitleText}>
            Keep your family's health on track
          </Text>

          {/* Form Card */}
          <View style={styles.card}>
            {step === 'phone' ? (
              <>
                <Text style={styles.cardTitle}>Sign In</Text>
                <Text style={styles.cardSubtitle}>
                  Enter your phone number to continue
                </Text>

                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputIcon}>📱</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+1 (234) 567-8900"
                    placeholderTextColor={COLORS.textLight}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    autoFocus
                    maxLength={17}
                  />
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Continue</Text>
                      <Text style={styles.buttonArrow}>→</Text>
                    </>
                  )}
                </TouchableOpacity>

                <Text style={styles.infoText}>
                  We'll send you a verification code
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.cardTitle}>Verify Your Phone</Text>
                <Text style={styles.cardSubtitle}>
                  We sent a code to{' '}
                  <Text style={styles.phoneHighlight}>{phoneNumber}</Text>
                </Text>

                <TouchableOpacity onPress={handleChangeNumber}>
                  <Text style={styles.changeNumberText}>Change number</Text>
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Enter OTP</Text>
                <View style={styles.otpContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => (otpInputRefs.current[index] = ref)}
                      style={[
                        styles.otpInput,
                        digit ? styles.otpInputFilled : null,
                      ]}
                      value={digit}
                      onChangeText={(value) => handleOtpChange(value, index)}
                      onKeyPress={({ nativeEvent }) =>
                        handleOtpKeyPress(nativeEvent.key, index)
                      }
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={COLORS.background} />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleResendOTP}
                  disabled={countdown > 0}
                  style={styles.resendContainer}
                >
                  <Text
                    style={[
                      styles.resendText,
                      countdown > 0 && styles.resendTextDisabled,
                    ]}
                  >
                    {countdown > 0
                      ? `Resend OTP in ${countdown}s`
                      : 'Resend OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={styles.footerText}>
            Secure and private health tracking for your family
          </Text>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 32,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  changeNumberText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    paddingVertical: 14,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.accent,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonArrow: {
    color: COLORS.background,
    fontSize: 18,
    marginLeft: 8,
  },
  infoText: {
    color: COLORS.textLight,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16,
  },
  resendContainer: {
    marginTop: 20,
    alignItems: 'flex-start',
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  resendTextDisabled: {
    color: COLORS.textLight,
  },
  footerText: {
    color: COLORS.textLight,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 32,
  },
});

export default LoginScreen;
