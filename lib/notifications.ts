import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

// Show alerts and play sound when a notification arrives while the app is in the foreground.
export function configurePushHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(userId: string): Promise<void> {
  // Push tokens only work on physical devices
  if (!Device.isDevice) return;

  // Web platform uses a different notification path
  if (Platform.OS === 'web') return;

  if (!isSupabaseConfigured) return;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // On Android, a notification channel is required for foreground display
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      process.env.EXPO_PUBLIC_PROJECT_ID;

    if (!projectId) {
      console.warn('[notifications] No projectId found — push token skipped');
      return;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

    const supabase = getSupabaseClient();
    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform: Platform.OS,
      },
      { onConflict: 'user_id,token', ignoreDuplicates: true }
    );

    if (error) {
      console.warn('[notifications] Failed to store push token:', error.message);
    }
  } catch (err) {
    // Never let token registration crash the app
    console.warn('[notifications] Registration error:', err);
  }
}
