import { Pressable, TextInput, View } from 'react-native';
import { palette } from '@/constants/colors';
import { IconSymbol } from './icon-symbol';

interface SearchBarProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onPress?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search activities...',
  onPress,
}: SearchBarProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center bg-white border border-neutral-200 rounded-full px-4 py-3 shadow-sm"
      >
        <IconSymbol name="magnifyingglass" size={18} color={palette.neutral[400]} />
        <View className="ml-3">
          <TextInput
            editable={false}
            placeholder={placeholder}
            placeholderTextColor={palette.neutral[400]}
            className="text-base text-neutral-500"
          />
        </View>
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center bg-white border border-neutral-200 rounded-full px-4 py-3 shadow-sm">
      <IconSymbol name="magnifyingglass" size={18} color={palette.neutral[400]} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.neutral[400]}
        className="flex-1 ml-3 text-base text-neutral-900"
      />
    </View>
  );
}
