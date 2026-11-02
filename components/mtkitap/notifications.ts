import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const REMINDER_CHANNEL = "reading-reminders";
export const REMINDER_SOUND_CHANNEL = "reading-reminders-sound";

export function configureNotifications() {
  if (Platform.OS === "web") return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleDailyReminder(hour: number, minute: number, soundEnabled = true) {
  if (Platform.OS === "web") return false;
  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;
  if (status !== "granted") {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== "granted") return false;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const channelId = soundEnabled ? REMINDER_SOUND_CHANNEL : REMINDER_CHANNEL;
  await Notifications.setNotificationChannelAsync(channelId, {
    name: soundEnabled ? "Okuma hatırlatıcıları · sesli" : "Okuma hatırlatıcıları",
    importance: soundEnabled ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: soundEnabled ? [0, 250, 120, 250] : [0, 200],
    sound: soundEnabled ? "default" : undefined,
  });
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Okuma zamanı",
      body: "Bugünkü sayfalarını okumayı unutma. mtkitap seni bekliyor.",
      data: { type: "reading-reminder" },
      sound: soundEnabled ? "default" : false,
      ...(Platform.OS === "android" ? { channelId } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === "android" ? { channelId } : {}),
    },
  });
  return true;
}

export async function cancelDailyReminder() {
  if (Platform.OS !== "web") await Notifications.cancelAllScheduledNotificationsAsync();
}
