import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
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
import { getMatchById, type MatchDetailView } from '@/services/matches';

export default function ChatScreen() {
  const { matchId, returnTo } = useLocalSearchParams<{ matchId: string; returnTo?: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [match, setMatch] = useState<MatchDetailView | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const handleBack = useBackNavigation({
    fallbackHref: '/(tabs)/inbox',
    returnTo,
  });

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
    } catch (error) {
      setMessages([]);
      setMatch(null);
      setError(error);
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

  const handleSend = async () => {
    if (!text.trim() || !user || !matchId) return;

    const messageText = text.trim();
    setText('');
    setSending(true);

    try {
      await sendChatMessage(matchId, user.id, messageText);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setText(messageText);
      Alert.alert('Message failed', getErrorMessage(error, 'Could not send your message.'));
    } finally {
      setSending(false);
    }
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

      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        <View className="mx-4 mt-3 mb-1 bg-primary-50 rounded-xl px-4 py-2.5 flex-row items-center">
          <IconSymbol name="clock" size={14} color="#c3653c" />
          <Text className="text-xs text-primary-700 ml-2 flex-1">
            This conversation expires 48h after the activity unless you both choose to keep it open.
          </Text>
        </View>
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

        <View className="flex-row items-end px-4 py-3 bg-white border-t border-neutral-100 pb-6">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#a8a29e"
            multiline
            className="flex-1 bg-neutral-50 rounded-2xl px-4 py-3 text-base text-neutral-900 max-h-24 mr-2"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || !text.trim()}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              text.trim() ? 'bg-accent' : 'bg-neutral-200'
            }`}
          >
            <IconSymbol name="paperplane.fill" size={18} color={text.trim() ? '#fff' : '#a8a29e'} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
