import { useState, useRef, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import {
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageBubble } from '@/components/ui/message-bubble';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { getMessages, sendMessage as sendChatMessage, subscribeToMessages } from '@/services/chat';
import { getMatchById } from '@/services/matches';
import { MOCK_CHAT_MESSAGES, MOCK_MATCHES } from '@/lib/mock-data';

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [companionName, setCompanionName] = useState('Companion');
  const [activityTitle, setActivityTitle] = useState('Activity');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
  }, [matchId]);

  useEffect(() => {
    if (useMock || !matchId) return;
    const unsubscribe = subscribeToMessages(matchId, (newMsg) => {
      setMessages(prev => [...prev, {
        id: newMsg.id,
        text: newMsg.text,
        timestamp: new Date(newMsg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        isSent: newMsg.sender_id === user?.id,
      }]);
    });
    return unsubscribe;
  }, [matchId, useMock, user?.id]);

  const loadMessages = async () => {
    try {
      const [msgs, matchData] = await Promise.all([
        getMessages(matchId!),
        user ? getMatchById(matchId!, user.id) : Promise.resolve(null),
      ]);
      setMessages(msgs.map(msg => ({
        id: msg.id,
        text: msg.text,
        timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        isSent: msg.sender_id === user?.id,
      })));
      if (matchData) {
        setCompanionName(matchData.companion_name);
        setActivityTitle(matchData.activity_title);
      }
      setUseMock(false);
    } catch {
      const match = MOCK_MATCHES.find(m => m.id === matchId) ?? MOCK_MATCHES[0];
      setCompanionName(match.companionName);
      setActivityTitle(match.activityTitle);
      setMessages(MOCK_CHAT_MESSAGES.map(m => ({
        ...m,
        timestamp: m.timestamp,
      })));
      setUseMock(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const messageText = text.trim();
    setText('');

    if (useMock) {
      setMessages(prev => [...prev, {
        id: `c${prev.length + 1}`,
        text: messageText,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        isSent: true,
      }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    setSending(true);
    try {
      await sendChatMessage(matchId!, user!.id, messageText);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setText(messageText);
    } finally {
      setSending(false);
    }
  };

  const displayCompanionName = companionName;
  const displayActivityTitle = activityTitle;

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-100">
        <Pressable
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full"
        >
          <IconSymbol name="arrow.left" size={20} color="#1c1917" />
        </Pressable>

        <View className="flex-row items-center flex-1 ml-2">
          <View className="w-9 h-9 bg-primary-200 rounded-full items-center justify-center">
            <Text className="text-xs font-bold text-primary-800">
              {displayCompanionName.charAt(0)}
            </Text>
          </View>
          <View className="ml-2.5">
            <Text className="text-base font-semibold text-neutral-900">
              {displayCompanionName}
            </Text>
            <Text className="text-xs text-neutral-400" numberOfLines={1}>
              {displayActivityTitle}
            </Text>
          </View>
        </View>

        <Pressable className="w-9 h-9 bg-red-50 rounded-full items-center justify-center mr-1">
          <IconSymbol name="exclamationmark.triangle" size={16} color="#dc2626" />
        </Pressable>
        <Pressable className="w-9 h-9 items-center justify-center rounded-full">
          <IconSymbol name="ellipsis" size={20} color="#44403c" />
        </Pressable>
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

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerClassName="px-4 pt-2 pb-4"
          showsVerticalScrollIndicator={false}
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
