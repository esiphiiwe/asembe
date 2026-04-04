import { Text, View } from 'react-native';

interface MessageBubbleProps {
  text: string;
  timestamp: string;
  isSent: boolean;
}

export function MessageBubble({ text, timestamp, isSent }: MessageBubbleProps) {
  return (
    <View className={`mb-2.5 max-w-[80%] ${isSent ? 'self-end' : 'self-start'}`}>
      <View
        className={`px-4 py-3 ${
          isSent
            ? 'bg-accent rounded-2xl rounded-br-md'
            : 'bg-neutral-100 rounded-2xl rounded-bl-md'
        }`}
      >
        <Text className={`text-base ${isSent ? 'text-white' : 'text-neutral-900'}`}>
          {text}
        </Text>
      </View>
      <Text
        className={`text-[10px] text-neutral-400 mt-1 ${isSent ? 'text-right' : 'text-left'}`}
      >
        {timestamp}
      </Text>
    </View>
  );
}
