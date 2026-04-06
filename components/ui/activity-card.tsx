import { Pressable, Text, View } from 'react-native';
import { IconSymbol } from './icon-symbol';

interface ActivityCardProps {
  title: string;
  category: string;
  categoryIcon: string;
  neighborhood: string;
  dateLabel: string;
  posterName: string;
  trustScore: number;
  companionCount: number;
  womenOnly?: boolean;
  onPress?: () => void;
  variant?: 'horizontal' | 'vertical';
}

export function ActivityCard({
  title,
  category,
  categoryIcon,
  neighborhood,
  dateLabel,
  posterName,
  trustScore,
  companionCount,
  womenOnly = false,
  onPress,
  variant = 'vertical',
}: ActivityCardProps) {
  if (variant === 'horizontal') {
    return (
      <Pressable onPress={onPress} className="w-64 mr-4">
        <View className="bg-neutral-200 rounded-2xl h-40 overflow-hidden relative">
          <View className="absolute inset-0 items-center justify-center">
            <Text className="text-5xl">{categoryIcon}</Text>
          </View>
          <View className="absolute top-3 left-3 bg-white/90 rounded-full px-2.5 py-1 flex-row items-center">
            <Text className="text-xs">{categoryIcon}</Text>
            <Text className="text-xs font-medium text-neutral-700 ml-1 capitalize">{category}</Text>
          </View>
          {womenOnly ? (
            <View className="absolute bottom-3 left-3 bg-rose-100 rounded-full px-2.5 py-1 flex-row items-center">
              <Text className="text-xs font-medium text-rose-700">Women only</Text>
            </View>
          ) : null}
          <Pressable className="absolute top-3 right-3 bg-white/90 rounded-full w-8 h-8 items-center justify-center">
            <IconSymbol name="heart" size={16} color="#1c1917" />
          </Pressable>
        </View>
        <View className="mt-2.5">
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {title}
          </Text>
          <View className="flex-row items-center mt-1">
            <IconSymbol name="mappin" size={12} color="#78716c" />
            <Text className="text-sm text-neutral-500 ml-1">{neighborhood}</Text>
          </View>
          <View className="flex-row items-center justify-between mt-1.5">
            <View className="flex-row items-center">
              <IconSymbol name="calendar" size={12} color="#78716c" />
              <Text className="text-sm text-neutral-500 ml-1">{dateLabel}</Text>
            </View>
            <View className="flex-row items-center">
              <IconSymbol name="star.fill" size={12} color="#d17a47" />
              <Text className="text-sm text-neutral-600 ml-0.5">{trustScore.toFixed(1)}</Text>
            </View>
          </View>
          <View className="flex-row items-center mt-1.5">
            <View className="w-5 h-5 bg-primary-200 rounded-full items-center justify-center">
              <Text className="text-[10px] font-bold text-primary-800">
                {posterName.charAt(0)}
              </Text>
            </View>
            <Text className="text-xs text-neutral-500 ml-1.5">{posterName}</Text>
            <Text className="text-xs text-neutral-400 ml-1">
              · {companionCount === 1 ? '1 spot' : `${companionCount} spots`}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} className="flex-row bg-white rounded-2xl border border-neutral-100 p-3 mb-3">
      <View className="w-24 h-24 bg-neutral-200 rounded-xl items-center justify-center">
        <Text className="text-3xl">{categoryIcon}</Text>
      </View>
      <View className="flex-1 ml-3 justify-between">
        <View>
          <View className="flex-row items-center flex-wrap gap-1">
            <View className="bg-primary-50 rounded-full px-2 py-0.5">
              <Text className="text-xs font-medium text-primary-700 capitalize">{category}</Text>
            </View>
            {womenOnly ? (
              <View className="bg-rose-100 rounded-full px-2 py-0.5">
                <Text className="text-xs font-medium text-rose-700">Women only</Text>
              </View>
            ) : null}
            <Text className="text-xs text-neutral-400">{dateLabel}</Text>
          </View>
          <Text className="text-base font-semibold text-neutral-900 mt-1" numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <IconSymbol name="mappin" size={12} color="#78716c" />
            <Text className="text-sm text-neutral-500 ml-1">{neighborhood}</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-5 h-5 bg-primary-200 rounded-full items-center justify-center mr-1">
              <Text className="text-[10px] font-bold text-primary-800">
                {posterName.charAt(0)}
              </Text>
            </View>
            <IconSymbol name="star.fill" size={11} color="#d17a47" />
            <Text className="text-xs text-neutral-600 ml-0.5">{trustScore.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
