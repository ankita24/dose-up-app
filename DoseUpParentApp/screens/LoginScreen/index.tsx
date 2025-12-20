import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  findParentByPhone,
  ParentData,
  sendOTP,
  verifyOTP,
} from "../../utils/firebase";
import { requestNotificationPermissions } from "../../utils/notifications";
import { styles } from "./styles";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { app } from "../../utils/firebase";

// Theme colors
const COLORS = {
  primary: "#6C63FF",
  secondary: "#4CAF50",
  accent: "#F7F8FA",
  background: "#FFFFFF",
  text: "#333333",
  textLight: "#666666",
  border: "#E0E0E0",
  error: "#F44336",
};

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MedicineDetail: { medicineId: string };
};

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Login"
>;

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const otpInputRefs = useRef<(TextInput | null)[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const recaptchaVerifier = useRef(null);

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

  const handlePhoneChange = (text: string) => {
    setError(null);
    setPhoneNumber(text);
  };

  const handleSendOTP = async () => {
    const cleanedPhone = phoneNumber.replace(/\D/g, "");

    if (cleanedPhone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // IMPORTANT: Indian numbers must have +91
      const fullPhone = `+91${cleanedPhone}`;
      if (recaptchaVerifier?.current) {
        const result = await sendOTP(fullPhone, recaptchaVerifier?.current);
        // save to state so we can confirm OTP later
        setStep("otp");
        setCountdown(60);

        // Focus first OTP
        setTimeout(() => otpInputRefs.current[0]?.focus(), 100);
      }
    } catch (err) {
      console.log("OTP Error", err);
      setError("Failed to send OTP. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    setError(null);

    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
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
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join("");

    if (otpCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Verify with Firebase
      const user = await verifyOTP(otpCode);

      // Find parent by phone number from Firestore
      const cleanedPhone = phoneNumber.replace(/\D/g, "");
      const parentData = await findParentByPhone(cleanedPhone);

      if (!parentData) {
        setError("No parent found for this number.");
        return;
      }

      await AsyncStorage.setItem("parentSession", JSON.stringify(parentData));

      await requestNotificationPermissions();

      navigation.replace("Home");
    } catch (err) {
      console.log("Verify error", err);
      setError("Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError(null);
    setOtp(["", "", "", "", "", ""]);

    try {
      // Simulate resending OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setCountdown(60);
      otpInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep("phone");
    setOtp(["", "", "", "", "", ""]);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={app.options}
        />
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
              <Image
                source={require("../../assets/logo.png")}
                style={{ width: 80, height: 80 }}
              />
            </View>
            <Text style={styles.appName}>DoseUp</Text>
          </View>

          <Text style={styles.welcomeText}>Welcome to Dose Up</Text>
          <Text style={styles.subtitleText}>
            Keep your family's health on track
          </Text>

          {/* Form Card */}
          <View style={styles.card}>
            {step === "phone" ? (
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
                    placeholder="9999999999"
                    placeholderTextColor={COLORS.textLight}
                    value={phoneNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    autoFocus
                    maxLength={10}
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
                  We sent a code to{" "}
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
                      : "Resend OTP"}
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

export default LoginScreen;
