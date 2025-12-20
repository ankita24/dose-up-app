import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  getMedicineById,
  markMedicineAsTaken,
  Medicine,
  ParentData,
} from '../utils/firebase';

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
  warning: '#FF9800',
};

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MedicineDetail: { medicineId: string; adminId: string };
};

type MedicineDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MedicineDetail'
>;

type MedicineDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  'MedicineDetail'
>;

interface MedicineDetailScreenProps {
  navigation: MedicineDetailScreenNavigationProp;
  route: MedicineDetailScreenRouteProp;
}

// Demo medicines for testing
const DEMO_MEDICINES: Record<string, Medicine> = {
  'demo-1': {
    id: 'demo-1',
    name: 'Vitamin D',
    parentId: 'demo-parent',
    doseTimes: ['08:00'],
    dosage: '1000 IU',
    notes: 'Take with breakfast for better absorption. Vitamin D helps maintain healthy bones and immune function.',
  },
  'demo-2': {
    id: 'demo-2',
    name: 'Calcium',
    parentId: 'demo-parent',
    doseTimes: ['09:00', '21:00'],
    dosage: '500 mg',
    notes: 'Essential for bone health. Take with food.',
  },
  'demo-3': {
    id: 'demo-3',
    name: 'Multivitamin',
    parentId: 'demo-parent',
    doseTimes: ['12:00'],
    dosage: '1 tablet',
    notes: 'Complete daily nutrition supplement.',
  },
  'demo-4': {
    id: 'demo-4',
    name: 'Omega-3',
    parentId: 'demo-parent',
    doseTimes: ['18:00'],
    dosage: '1000 mg',
    notes: 'Take with dinner. Supports heart and brain health.',
  },
  'demo-5': {
    id: 'demo-5',
    name: 'Iron',
    parentId: 'demo-parent',
    doseTimes: ['20:00'],
    dosage: '65 mg',
    notes: 'Avoid taking with calcium or dairy products. Take with vitamin C for better absorption.',
  },
};

const MedicineDetailScreen: React.FC<MedicineDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { medicineId, adminId } = route.params;
  
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadMedicine();
  }, [medicineId, adminId]);

  const loadMedicine = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check for demo mode
      if (adminId === 'demo-admin') {
        const demoMedicine = DEMO_MEDICINES[medicineId];
        if (demoMedicine) {
          // Check if it was marked as taken in the session
          const sessionStr = await AsyncStorage.getItem('demoMedicineState');
          if (sessionStr) {
            const state = JSON.parse(sessionStr);
            if (state[medicineId]?.lastTakenAt) {
              demoMedicine.lastTakenAt = state[medicineId].lastTakenAt;
            }
          }
          setMedicine(demoMedicine);
        } else {
          setError('Medicine not found');
        }
        setIsLoading(false);
        
        // Start animation
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
        
        return;
      }

      const medicineData = await getMedicineById(adminId, medicineId);
      
      if (medicineData) {
        setMedicine(medicineData);
      } else {
        setError('Medicine not found');
      }
      
      // Start animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
      
    } catch (err) {
      console.error('Error loading medicine:', err);
      setError('Failed to load medicine details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsTaken = async () => {
    if (!medicine) return;

    setIsMarking(true);

    try {
      const newTimestamp = new Date().toISOString();
      
      if (adminId === 'demo-admin') {
        // Demo mode - update local state
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // Save to session storage
        const sessionStr = await AsyncStorage.getItem('demoMedicineState');
        const state = sessionStr ? JSON.parse(sessionStr) : {};
        state[medicineId] = { lastTakenAt: newTimestamp };
        await AsyncStorage.setItem('demoMedicineState', JSON.stringify(state));
        
        setMedicine({ ...medicine, lastTakenAt: newTimestamp });
        
        Alert.alert(
          'Success',
          `${medicine.name} marked as taken!`,
          [{ text: 'OK' }]
        );
      } else {
        // Real mode - update Firestore
        await markMedicineAsTaken(adminId, medicineId);
        setMedicine({ ...medicine, lastTakenAt: newTimestamp });
        
        Alert.alert(
          'Success',
          `${medicine.name} marked as taken!`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      console.error('Error marking medicine as taken:', err);
      Alert.alert('Error', 'Failed to mark medicine as taken. Please try again.');
    } finally {
      setIsMarking(false);
    }
  };

  // Check if medicine was taken today
  const isTakenToday = (): boolean => {
    if (!medicine?.lastTakenAt) return false;
    
    const lastTaken = new Date(medicine.lastTakenAt);
    const today = new Date();
    
    return (
      lastTaken.getDate() === today.getDate() &&
      lastTaken.getMonth() === today.getMonth() &&
      lastTaken.getFullYear() === today.getFullYear()
    );
  };

  // Format time for display
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get next dose time
  const getNextDoseInfo = (): { time: string; isToday: boolean } | null => {
    if (!medicine) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const time of medicine.doseTimes.sort()) {
      const [hours, minutes] = time.split(':').map(Number);
      const doseMinutes = hours * 60 + minutes;
      
      if (doseMinutes > currentMinutes) {
        return { time: formatTime(time), isToday: true };
      }
    }

    // All times passed, return first time for tomorrow
    if (medicine.doseTimes.length > 0) {
      return { time: formatTime(medicine.doseTimes[0]), isToday: false };
    }

    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading medicine details...</Text>
      </View>
    );
  }

  if (error || !medicine) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error || 'Medicine not found'}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const taken = isTakenToday();
  const nextDose = getNextDoseInfo();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medicine Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
          {/* Medicine Header Card */}
          <View style={styles.mainCard}>
            <View style={[styles.iconLarge, taken && styles.iconTaken]}>
              <Text style={styles.pillIconLarge}>💊</Text>
            </View>
            
            <Text style={styles.medicineName}>{medicine.name}</Text>
            
            {medicine.dosage && (
              <View style={styles.dosageBadge}>
                <Text style={styles.dosageText}>{medicine.dosage}</Text>
              </View>
            )}

            {/* Status Badge */}
            {taken ? (
              <View style={styles.statusBadge}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.statusText}>Taken Today</Text>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.pendingBadge]}>
                <Text style={styles.pendingIcon}>⏳</Text>
                <Text style={styles.pendingText}>Not Taken Yet</Text>
              </View>
            )}
          </View>

          {/* Schedule Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Schedule</Text>
            
            <View style={styles.scheduleList}>
              {medicine.doseTimes.map((time, index) => (
                <View key={index} style={styles.scheduleItem}>
                  <View style={styles.timeCircle}>
                    <Text style={styles.timeIcon}>🕐</Text>
                  </View>
                  <View style={styles.timeInfo}>
                    <Text style={styles.timeText}>{formatTime(time)}</Text>
                    <Text style={styles.timeLabel}>Daily</Text>
                  </View>
                </View>
              ))}
            </View>

            {nextDose && !taken && (
              <View style={styles.nextDoseContainer}>
                <Text style={styles.nextDoseLabel}>Next Dose:</Text>
                <Text style={styles.nextDoseTime}>
                  {nextDose.time} {!nextDose.isToday && '(tomorrow)'}
                </Text>
              </View>
            )}
          </View>

          {/* Notes Card */}
          {medicine.notes && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📝 Notes</Text>
              <Text style={styles.notesText}>{medicine.notes}</Text>
            </View>
          )}

          {/* History Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 History</Text>
            
            {medicine.lastTakenAt ? (
              <View style={styles.historyItem}>
                <View style={styles.historyDot} />
                <View style={styles.historyInfo}>
                  <Text style={styles.historyLabel}>Last taken</Text>
                  <Text style={styles.historyTime}>
                    {formatDate(medicine.lastTakenAt)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.noHistoryText}>
                No dose history recorded yet.
              </Text>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              taken && styles.actionButtonTaken,
              isMarking && styles.actionButtonDisabled,
            ]}
            onPress={handleMarkAsTaken}
            disabled={isMarking || taken}
          >
            {isMarking ? (
              <ActivityIndicator color={COLORS.background} />
            ) : taken ? (
              <>
                <Text style={styles.actionButtonIcon}>✓</Text>
                <Text style={styles.actionButtonText}>Already Taken Today</Text>
              </>
            ) : (
              <>
                <Text style={styles.actionButtonIcon}>✓</Text>
                <Text style={styles.actionButtonText}>Mark as Taken</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Info Text */}
          <Text style={styles.infoText}>
            {taken
              ? "Great job! You've taken this medicine today."
              : 'Tap the button above when you take this medicine.'}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    padding: 40,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  content: {},
  mainCard: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconTaken: {
    backgroundColor: `${COLORS.secondary}15`,
  },
  pillIconLarge: {
    fontSize: 40,
  },
  medicineName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  dosageBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  dosageText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.secondary}15`,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  checkIcon: {
    color: COLORS.secondary,
    fontSize: 16,
    marginRight: 8,
    fontWeight: 'bold',
  },
  statusText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: `${COLORS.warning}15`,
    borderColor: COLORS.warning,
  },
  pendingIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  pendingText: {
    color: COLORS.warning,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  scheduleList: {},
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timeIcon: {
    fontSize: 20,
  },
  timeInfo: {},
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  timeLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  nextDoseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  nextDoseLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginRight: 8,
  },
  nextDoseTime: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  notesText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 24,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  historyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.secondary,
    marginTop: 4,
    marginRight: 12,
  },
  historyInfo: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  historyTime: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  noHistoryText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonTaken: {
    backgroundColor: COLORS.secondary,
    shadowColor: COLORS.secondary,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonIcon: {
    color: COLORS.background,
    fontSize: 18,
    marginRight: 8,
    fontWeight: 'bold',
  },
  actionButtonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: '600',
  },
  infoText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 14,
    marginTop: 16,
  },
});

export default MedicineDetailScreen;
