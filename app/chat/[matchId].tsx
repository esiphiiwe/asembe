import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageBubble } from '@/components/ui/message-bubble';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { ScreenState } from '@/components/ui/screen-state';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage, isConfigError } from '@/lib/errors';
import { getMessages, sendMessage as sendChatMessage, subscribeToMessages, type ChatMessageView } from '@/services/chat';
import { getMatchById, setKeepChatOpen, type MatchDetailView } from '@/services/matches';
import { blockUser, reportUser } from '@/services/safety';

const REPORT_REASONS = [
  'Inappropriate messages',
  'Harassment or abuse',
  'No-show',
  'Fake profile',
  'Other',
];

const HOURS_24 = 24 * 60 * 60 * 1000;

function formatExpiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return '';

  const msRemaining = new Date(expiresAt).getTime() - Date.now();

  if (msRemaining <= 0) return 'This chat has expired.';

  const totalMinutes = Math.floor(msRemaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Expires in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `Expires in ${hours}h ${minutes}m`;
  return `Expires in ${minutes}m`;
}

export default function ChatScreen() {
  const { matchId, returnTo } = useLocalSearchParams<{ matchId: string; returnTo?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [keepingOpen, setKeepingOpen] = useState(false);
  const [match, setMatch] = useState<MatchDetailView | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);
  const [now, setNow] = useState(Date.now());
  const flatListRef = useRef<FlatList>(null);

  const handleBack = useBackNavigation({
    fallbackHref: '/(tabs)/inbox',
    returnTo,
  });

  // Tick every minute so the expiry countdown stays current.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const loadMessages = useCallback(async () => {
    if (!user || !matchId) {
      setError(new Error('You need to be signed in to view this chat.'));
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const [messageData, matchData] = await Promise.all([
        getMessages(matchId, user.id),
        getMatchById(matchId, user.id),
      ]);

      setMessages(messageData);
      setMatch(matchData);
    } catch (err) {
      setMessages([]);
      setMatch(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [matchId, user]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!matchId || !user) return;

    const unsubscribe = subscribeToMessages(
      matchId,
      user.id,
      newMessage => {
        setMessages(prev =>
          prev.some(message => message.id === newMessage.id)
            ? prev
            : [...prev, newMessage]
        );
      },
      status => {
        const connected = status === 'SUBSCRIBED' || status === 'CLOSED';
        setIsRealtimeConnected(connected);

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void loadMessages();
        }
      }
    );

    return unsubscribe;
  }, [loadMessages, matchId, user]);

  // Derived expiry state.
  const chatExpiresAt = match?.chatExpiresAt ?? null;
  const expiryMs = chatExpiresAt ? new Date(chatExpiresAt).getTime() : null;
  const isExpired = expiryMs !== null && now >= expiryMs;
  const isNearExpiry = expiryMs !== null && !isExpired && expiryMs - now < HOURS_24;
  const bothKeptOpen = (match?.currentUserKeepOpen ?? false) && (match?.companionKeepOpen ?? false);
  const chatBlocked = isExpired && !bothKeptOpen;
  const showKeepOpenBanner = (isExpired || isNearExpiry) && !bothKeptOpen;
  const expiryLabel = formatExpiryLabel(chatExpiresAt);

  const handleSend = async () => {
    if (!text.trim() || !user || !matchId || chatBlocked) return;

    const messageText = text.trim();
    setText('');
    setSending(true);

    try {
      await sendChatMessage(matchId, user.id, messageText);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      setText(messageText);
      Alert.alert('Message failed', getErrorMessage(err, 'Could not send your message.'));
    } finally {
      setSending(false);
    }
  };

  const handleKeepOpen = async () => {
    if (!user || !matchId || !match || match.currentUserKeepOpen) return;

    setKeepingOpen(true);
    setMatch(prev => prev ? { ...prev, currentUserKeepOpen: true } : prev);

    try {
      await setKeepChatOpen(matchId, user.id);
      // Reload to get the companion's latest keep_open state as well.
      const updated = await getMatchById(matchId, user.id);
      setMatch(updated);
    } catch (err) {
      setMatch(prev => prev ? { ...prev, currentUserKeepOpen: false } : prev);
      Alert.alert('Error', getErrorMessage(err, 'Could not update your preference. Please try again.'));
    } finally {
      setKeepingOpen(false);
    }
  };

  const handleSOS = () => {
    if (!match) return;

    const shareMessage = `Safety check-in: I'm meeting ${match.companionName} for "${match.activityTitle}" in ${match.neighborhood} on ${match.dateLabel}. Please check in with me after.`;

    Alert.alert(
      'SOS — Are you safe?',
      'Choose an option below.',
      [
        {
          text: 'Call emergency services',
          style: 'destructive',
          onPress: () => void Linking.openURL('tel:112'),
        },
        {
          text: 'Share check-in message',
          onPress: () => void Share.share({ message: shareMessage }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleBlockReport = () => {
    if (!user || !match) return;

    Alert.alert(
      match.companionName,
      'What would you like to do?',
      [
        {
          text: `Report ${match.companionName}`,
          onPress: () => {
            Alert.alert(
              'Report',
              'Why are you reporting this person?',
              [
                ...REPORT_REASONS.map(reason => ({
                  text: reason,
                  onPress: async () => {
                    try {
                      await reportUser(user.id, match.companionId, reason, 'match', matchId!);
                      Alert.alert('Report submitted', 'Thank you. We will review this report.');
                    } catch {
                      Alert.alert('Error', 'Could not submit your report. Please try again.');
                    }
                  },
                })),
                { text: 'Cancel', style: 'cancel' },
              ]
            );
          },
        },
        {
          text: `Block ${match.companionName}`,
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              `Block ${match.companionName}?`,
              'They will not be able to see your activities or send you requests. You can unblock them in Settings.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await blockUser(user.id, match.companionId);
                      Alert.alert('Blocked', `${match.companionName} has been blocked.`, [
                        {
                          text: 'OK',
                          onPress: () => router.replace('/(tabs)/inbox'),
                        },
                      ]);
                    } catch {
                      Alert.alert('Error', 'Could not block this user. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  if (error || !match) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon={isConfigError(error) ? '🛠️' : '💬'}
          title={isConfigError(error) ? 'Finish Supabase setup' : 'Chat unavailable'}
          description={getErrorMessage(
            error,
            'We could not load this conversation from live data right now.'
          )}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            void loadMessages();
          }}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-100">
        <NavIconButton
          icon="arrow.left"
          onPress={handleBack}
          size={36}
          variant="plain"
        />

        <View className="flex-row items-center flex-1 ml-2">
          <View className="w-9 h-9 bg-primary-200 rounded-full items-center justify-center">
            <Text className="text-xs font-bold text-primary-800">
              {match.companionName.charAt(0)}
            </Text>
          </View>
          <View className="ml-2.5">
            <Text className="text-base font-semibold text-neutral-900">
              {match.companionName}
            </Text>
            <Text className="text-xs text-neutral-400" numberOfLines={1}>
              {match.activityTitle}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={handleSOS}
            className="w-9 h-9 rounded-full bg-red-100 items-center justify-center"
            accessibilityLabel="SOS emergency"
            accessibilityRole="button"
          >
            <IconSymbol name="exclamationmark.shield.fill" size={18} color="#dc2626" />
          </Pressable>
          <NavIconButton
            icon="ellipsis"
            onPress={handleBlockReport}
            size={36}
            variant="plain"
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Expiry status banner */}
        {chatExpiresAt ? (
          <View
            className={`mx-4 mt-3 mb-1 rounded-xl px-4 py-2.5 flex-row items-center ${
              isExpired ? 'bg-neutral-100' : 'bg-primary-50'
            }`}
          >
            <IconSymbol
              name="clock"
              size={14}
              color={isExpired ? '#78716c' : '#c3653c'}
            />
            <Text
              className={`text-xs ml-2 flex-1 ${
                isExpired ? 'text-neutral-500' : 'text-primary-700'
              }`}
            >
              {isExpired && !bothKeptOpen
                ? 'This chat has expired. Keep it open below to continue messaging.'
                : expiryLabel}
            </Text>
          </View>
        ) : null}

        {/* Keep chat open banner — visible when < 24h left or expired */}
        {showKeepOpenBanner ? (
          <View className="mx-4 mb-1 bg-white border border-neutral-200 rounded-xl px-4 py-3">
            {match.currentUserKeepOpen ? (
              <View className="flex-row items-center gap-2">
                <IconSymbol name="checkmark.circle.fill" size={16} color="#16a34a" />
                <Text className="text-xs text-neutral-600 flex-1">
                  You chose to keep this chat open. Waiting for {match.companionName} to do the same.
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-xs text-neutral-700 font-medium mb-2">
                  Keep this chat open?
                </Text>
                <Text className="text-xs text-neutral-500 mb-3 leading-4">
                  Both you and {match.companionName} need to opt in for messaging to continue.
                </Text>
                <Pressable
                  onPress={handleKeepOpen}
                  disabled={keepingOpen}
                  className="bg-accent rounded-xl py-2.5 items-center"
                >
                  {keepingOpen ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">Keep chat open</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        ) : null}

        {!isRealtimeConnected ? (
          <View className="mx-4 mt-2 mb-1 bg-neutral-100 rounded-xl px-4 py-2.5 flex-row items-center">
            <IconSymbol name="exclamationmark.triangle" size={14} color="#78716c" />
            <Text className="text-xs text-neutral-600 ml-2 flex-1">
              Live updates are reconnecting. New messages may appear after a refresh.
            </Text>
          </View>
        ) : null}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerClassName="px-4 pt-2 pb-4"
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-12">
              <Text className="text-sm text-neutral-400 text-center leading-5">
                No messages yet. Start the conversation when you are ready.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <MessageBubble
              text={item.text}
              timestamp={item.timestamp}
              isSent={item.isSent}
            />
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {chatBlocked ? (
          <View className="mx-4 mb-6 mt-2 bg-neutral-100 rounded-2xl px-4 py-4 items-center">
            <IconSymbol name="lock.fill" size={20} color="#a8a29e" />
            <Text className="text-sm font-medium text-neutral-600 mt-2 text-center">
              Messaging is closed
            </Text>
            <Text className="text-xs text-neutral-400 mt-1 text-center leading-4">
              This chat expired. Opt in above to re-open it with {match.companionName}.
            </Text>
          </View>
        ) : (
          <View className="flex-row items-end px-4 py-3 bg-white border-t border-neutral-100 pb-6">
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor="#a8a29e"
              multiline
              editable={!chatBlocked}
              className="flex-1 bg-neutral-50 rounded-2xl px-4 py-3 text-base text-neutral-900 max-h-24 mr-2"
            />
            <Pressable
              onPress={handleSend}
              disabled={sending || !text.trim() || chatBlocked}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                text.trim() && !chatBlocked ? 'bg-accent' : 'bg-neutral-200'
              }`}
            >
              <IconSymbol
                name="paperplane.fill"
                size={18}
                color={text.trim() && !chatBlocked ? '#fff' : '#a8a29e'}
              />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
