import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  subscribeMedicines,
  markMedicineAsTaken,
  signOut,
  Medicine,
  ParentData,
} from '../utils/firebase';
import {
  scheduleAllMedicineNotifications,
  cancelAllNotifications,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from '../utils/notifications';
import MedicineCard from '../components/MedicineCard';

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
  MedicineDetail: { medicineId: string; adminId: string };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

// Demo medicines for testing when no Firestore data
const DEMO_MEDICINES: Medicine[] = [
  {
    id: 'demo-1',
    name: 'Vitamin D',
    parentId: 'demo-parent',
    doseTimes: ['08:00'],
    dosage: '1000 IU',
    notes: 'Take with breakfast',
  },
  {
    id: 'demo-2',
    name: 'Calcium',
    parentId: 'demo-parent',
    doseTimes: ['09:00', '21:00'],
    dosage: '500 mg',
  },
  {
    id: 'demo-3',
    name: 'Multivitamin',
    parentId: 'demo-parent',
    doseTimes: ['12:00'],
    dosage: '1 tablet',
  },
  {
    id: 'demo-4',
    name: 'Omega-3',
    parentId: 'demo-parent',
    doseTimes: ['18:00'],
    dosage: '1000 mg',
    notes: 'Take with dinner',
  },
  {
    id: 'demo-5',
    name: 'Iron',
    parentId: 'demo-parent',
    doseTimes: ['20:00'],
    dosage: '65 mg',
    notes: 'Avoid taking with calcium',
  },
];

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [parentData, setParentData] = useState<ParentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMedicineId, setLoadingMedicineId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Load parent session and subscribe to medicines
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadSession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem('parentSession');
        
        if (!sessionStr) {
          navigation.replace('Login');
          return;
        }

        const session: ParentData = JSON.parse(sessionStr);
        setParentData(session);

        // Check if this is a demo session
        if (session.adminId === 'demo-admin') {
          // Use demo medicines
          setMedicines(DEMO_MEDICINES);
          setIsLoading(false);
          
          // Schedule notifications for demo medicines
          await scheduleAllMedicineNotifications(DEMO_MEDICINES);
          
          // Start fade animation
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start();
          
          return;
        }

        // Subscribe to real-time Firestore updates
        unsubscribe = subscribeMedicines(
          session.adminId,
          session.parentId,
          async (updatedMedicines) => {
            setMedicines(updatedMedicines);
            setIsLoading(false);
            setIsRefreshing(false);
            setError(null);
            
            // Reschedule notifications when medicines update
            await scheduleAllMedicineNotifications(updatedMedicines);
            
            // Start fade animation
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();
          },
          (err) => {
            console.error('Medicines subscription error:', err);
            setError('Failed to load medicines. Pull down to retry.');
            setIsLoading(false);
            setIsRefreshing(false);
          }
        );
      } catch (err) {
        console.error('Session loading error:', err);
        setError('Session error. Please login again.');
        setIsLoading(false);
      }
    };

    loadSession();

    // Set up notification response listener
    const notificationSubscription = addNotificationResponseListener((response) => {
      const medicineId = response.notification.request.content.data?.medicineId;
      if (medicineId && parentData) {
        navigation.navigate('MedicineDetail', {
          medicineId,
          adminId: parentData.adminId,
        });
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      removeNotificationSubscription(notificationSubscription);
    };
  }, [navigation, fadeAnim]);

  const handleMarkAsTaken = async (medicineId: string) => {
    if (!parentData) return;

    setLoadingMedicineId(medicineId);

    try {
      if (parentData.adminId === 'demo-admin') {
        // Demo mode - update local state
        await new Promise((resolve) => setTimeout(resolve, 500));
        setMedicines((prev) =>
          prev.map((m) =>
            m.id === medicineId
              ? { ...m, lastTakenAt: new Date().toISOString() }
              : m
          )
        );
      } else {
        // Real mode - update Firestore
        await markMedicineAsTaken(parentData.adminId, medicineId);
      }
    } catch (err) {
      console.error('Error marking medicine as taken:', err);
      Alert.alert('Error', 'Failed to mark medicine as taken. Please try again.');
    } finally {
      setLoadingMedicineId(null);
    }
  };

  const handleMedicinePress = (medicine: Medicine) => {
    if (!parentData) return;
    
    navigation.navigate('MedicineDetail', {
      medicineId: medicine.id,
      adminId: parentData.adminId,
    });
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    
    // For demo mode, just simulate refresh
    if (parentData?.adminId === 'demo-admin') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsRefreshing(false);
      return;
    }
    
    // Real mode will refresh through the subscription
  }, [parentData]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAllNotifications();
              await AsyncStorage.removeItem('parentSession');
              await signOut();
              navigation.replace('Login');
            } catch (err) {
              console.error('Logout error:', err);
              // Even if Firebase signOut fails, clear local session
              await AsyncStorage.removeItem('parentSession');
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  // Calculate daily progress
  const getTodayProgress = () => {
    const today = new Date();
    const takenToday = medicines.filter((m) => {
      if (!m.lastTakenAt) return false;
      const lastTaken = new Date(m.lastTakenAt);
      return (
        lastTaken.getDate() === today.getDate() &&
        lastTaken.getMonth() === today.getMonth() &&
        lastTaken.getFullYear() === today.getFullYear()
      );
    });
    return {
      taken: takenToday.length,
      total: medicines.length,
      percentage: medicines.length > 0 
        ? (takenToday.length / medicines.length) * 100 
        : 0,
    };
  };

  const progress = getTodayProgress();

  const renderHeader = () => (
    <View style={styles.headerSection}>
      {/* Progress Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View style={styles.progressTitleRow}>
            <Text style={styles.calendarIcon}>📅</Text>
            <Text style={styles.progressTitle}>Today's Medicines</Text>
          </View>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressContent}>
          <Text style={styles.progressLabel}>Daily Progress</Text>
          <Text style={styles.progressCount}>
            {progress.taken}/{progress.total} taken
          </Text>
        </View>
        
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${progress.percentage}%` },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>💊</Text>
      <Text style={styles.emptyTitle}>No Medicines Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your medicines will appear here once they are added by your healthcare provider.
      </Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerSection}>
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Reminder Tips</Text>
        <Text style={styles.tipText}>• Take medicines at the same time daily</Text>
        <Text style={styles.tipText}>• Don't skip doses, even if you feel better</Text>
        <Text style={styles.tipText}>• Keep medicines in a visible spot</Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your medicines...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoMini}>
            <Text style={styles.logoMiniEmoji}>💊</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>DoseUp</Text>
            <Text style={styles.headerSubtitle}>
              Hello, {parentData?.name || 'Parent User'}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutIcon}>🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
          <FlatList
            data={medicines}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MedicineCard
                medicine={item}
                onMarkAsTaken={handleMarkAsTaken}
                onPress={handleMedicinePress}
                isLoading={loadingMedicineId === item.id}
              />
            )}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={medicines.length > 0 ? renderFooter : null}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoMini: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoMiniEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    fontSize: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
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
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  dateBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: '600',
  },
  progressContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  footerSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tipsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
