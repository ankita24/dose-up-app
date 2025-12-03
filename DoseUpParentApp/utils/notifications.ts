import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Medicine } from './firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Required for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('medicine-reminders', {
        name: 'Medicine Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Parse time string (HH:MM) to hours and minutes
 */
const parseTime = (timeStr: string): { hours: number; minutes: number } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
};

/**
 * Schedule a notification for a specific time
 */
export const scheduleNotification = async (
  medicineId: string,
  medicineName: string,
  doseTime: string,
  dosage?: string
): Promise<string | null> => {
  try {
    const { hours, minutes } = parseTime(doseTime);

    // Create trigger for daily notification at specified time
    const trigger: Notifications.NotificationTriggerInput = {
      hour: hours,
      minute: minutes,
      repeats: true,
    };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '💊 Medicine Reminder',
        body: `Time to take ${medicineName}${dosage ? ` (${dosage})` : ''}`,
        data: { medicineId, doseTime },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    console.log(`Scheduled notification ${notificationId} for ${medicineName} at ${doseTime}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All scheduled notifications cancelled');
  } catch (error) {
    console.error('Error cancelling notifications:', error);
  }
};

/**
 * Cancel a specific notification by ID
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log(`Notification ${notificationId} cancelled`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
};

/**
 * Schedule notifications for all medicines
 */
export const scheduleAllMedicineNotifications = async (
  medicines: Medicine[]
): Promise<Map<string, string[]>> => {
  const notificationIds = new Map<string, string[]>();

  // First, cancel all existing notifications
  await cancelAllNotifications();

  // Schedule new notifications for each medicine
  for (const medicine of medicines) {
    const ids: string[] = [];

    for (const doseTime of medicine.doseTimes) {
      const notificationId = await scheduleNotification(
        medicine.id,
        medicine.name,
        doseTime,
        medicine.dosage
      );

      if (notificationId) {
        ids.push(notificationId);
      }
    }

    notificationIds.set(medicine.id, ids);
  }

  console.log('All medicine notifications scheduled');
  return notificationIds;
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

/**
 * Add notification response listener
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Remove notification subscription
 */
export const removeNotificationSubscription = (
  subscription: Notifications.Subscription
): void => {
  Notifications.removeNotificationSubscription(subscription);
};

/**
 * Schedule immediate test notification
 */
export const sendTestNotification = async (): Promise<void> => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Notification',
        body: 'DoseUp notifications are working!',
        sound: 'default',
      },
      trigger: {
        seconds: 2,
      },
    });
    console.log('Test notification scheduled');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};
