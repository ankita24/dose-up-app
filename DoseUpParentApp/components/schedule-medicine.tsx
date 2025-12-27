import { getNextTriggerDate } from "@/utils/helper";
import * as Notifications from 'expo-notifications';

export async function scheduleMedicineReminder({
    medicineId,
    medicineName,
    time,
  }: {
    medicineId: string;
    medicineName: string;
    time: string; // "08:00"
  }) {
    const triggerDate = getNextTriggerDate(time);
  
    return Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to take medicine 💊',
        body: `${medicineName} – ${time}`,
        sound: true,
      },
      trigger: {
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        repeats: true,
        channelId: 'medicine-reminders',
      },
    });
  }