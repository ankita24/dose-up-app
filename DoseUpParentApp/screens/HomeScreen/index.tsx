import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  subscribeMedicines,
  markMedicineAsTaken,
  signOut,
  Medicine,
  ParentData,
  fetchDoseLogsForToday,
  DoseLog,
} from "../../utils/firebase";
import {
  scheduleAllMedicineNotifications,
  cancelAllNotifications,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from "../../utils/notifications";
import MedicineCard from "../../components/MedicineCard";
import { styles, COLORS } from "./styles";
import { buildTodayDoseRows } from "@/utils/helper";
import { format } from "date-fns";

// Theme colors

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MedicineDetail: { medicineId: string; adminId: string };
};

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "Home"
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [parentData, setParentData] = useState<ParentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMedicineId, setLoadingMedicineId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const doseRows = buildTodayDoseRows(medicines);
  const [doseLogs, setDoseLogs] = useState<DoseLog[]>([]);

  useEffect(() => {
    if (parentData?.adminId && parentData.parentId) {
      const unsubscribe = fetchDoseLogsForToday(
        parentData?.adminId,
        parentData?.parentId,
        setDoseLogs
      );

      return () => unsubscribe();
    }
  }, [parentData]);

  // Load parent session and subscribe to medicines
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const loadSession = async () => {
      try {
        const sessionStr = await AsyncStorage.getItem("parentSession");

        if (!sessionStr) {
          navigation.replace("Login");
          return;
        }

        const session: ParentData = JSON.parse(sessionStr);
        setParentData(session);

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
            console.error("Medicines subscription error:", err);
            setError("Failed to load medicines. Pull down to retry.");
            setIsLoading(false);
            setIsRefreshing(false);
          }
        );
      } catch (err) {
        console.error("Session loading error:", err);
        setError("Session error. Please login again.");
        setIsLoading(false);
      }
    };

    loadSession();

    // Set up notification response listener
    const notificationSubscription = addNotificationResponseListener(
      (response) => {
        const medicineId =
          response.notification.request.content.data?.medicineId;
        if (medicineId && parentData) {
          navigation.navigate("MedicineDetail", {
            medicineId,
            adminId: parentData.adminId,
          });
        }
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      removeNotificationSubscription(notificationSubscription);
    };
  }, [navigation, fadeAnim]);

  const handleMarkAsTaken = async (medicineId: string, doseTime: string) => {
    if (!parentData) return;

    setLoadingMedicineId(medicineId);

    try {
      await markMedicineAsTaken({
        adminId: parentData.adminId,
        parentId: parentData.parentId,
        medicineId,
        doseTime,
      });
    } catch (err) {
      console.error("Error marking medicine as taken:", err);
      Alert.alert(
        "Error",
        "Failed to mark medicine as taken. Please try again."
      );
    } finally {
      setLoadingMedicineId(null);
    }
  };

  const handleMedicinePress = (medicine: Medicine) => {
    if (!parentData) return;

    navigation.navigate("MedicineDetail", {
      medicineId: medicine.id,
      adminId: parentData.adminId,
    });
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    // For demo mode, just simulate refresh
    if (parentData?.adminId === "demo-admin") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsRefreshing(false);
      return;
    }

    // Real mode will refresh through the subscription
  }, [parentData]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelAllNotifications();
            await AsyncStorage.removeItem("parentSession");
            await signOut();
            navigation.replace("Login");
          } catch (err) {
            console.error("Logout error:", err);
            // Even if Firebase signOut fails, clear local session
            await AsyncStorage.removeItem("parentSession");
            navigation.replace("Login");
          }
        },
      },
    ]);
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
      percentage:
        medicines.length > 0 ? (takenToday.length / medicines.length) * 100 : 0,
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
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
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
            style={[styles.progressBar, { width: `${progress.percentage}%` }]}
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
        Your medicines will appear here once they are added by your healthcare
        provider.
      </Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerSection}>
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Reminder Tips</Text>
        <Text style={styles.tipText}>
          • Take medicines at the same time daily
        </Text>
        <Text style={styles.tipText}>
          • Don't skip doses, even if you feel better
        </Text>
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
          <Image
                source={require("../../assets/logo.png")}
                style={{ width: 30, height: 30 }}
              />
          <View style={{marginLeft:8}}>
            <Text style={styles.headerTitle}>DoseUp</Text>
            <Text style={styles.headerSubtitle}>
              Hello, {parentData?.name || "Parent User"}
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
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.View style={[styles.listContainer, { opacity: fadeAnim }]}>
          <FlatList
            data={doseRows}
            keyExtractor={(item) => item.medicine.id}
            renderItem={({ item }) => {
              const todayKey = format(new Date(), "yyyy-MM-dd");
              const isTaken = doseLogs?.some(
                (log) =>
                  log.medicineId === item.medicine.id &&
                  log.doseTime === item.doseTime &&
                  log.date === todayKey
              );
              return (
                <MedicineCard
                  key={item.medicineId + item.doseTime}
                  medicine={item.medicine}
                  doseTime={item.doseTime}
                  onMarkAsTaken={handleMarkAsTaken}
                  isTaken={isTaken}
                  //isLoading={loadingMedicineId === item.medicine.id}
                />
              );
            }}
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

export default HomeScreen;
