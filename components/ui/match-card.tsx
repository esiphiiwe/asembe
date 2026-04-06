import { Pressable, Share, Text, View } from 'react-native';
import { IconSymbol } from './icon-symbol';

type MatchCardVariant = 'pending' | 'confirmed' | 'completed' | 'sent';

interface MatchCardProps {
  activityTitle: string;
  categoryIcon: string;
  category: string;
  companionName: string;
  companionTrustScore: number;
  dateLabel: string;
  neighborhood: string;
  variant: MatchCardVariant;
  onAccept?: () => void;
  onDecline?: () => void;
  onChat?: () => void;
  onView?: () => void;
  onReview?: () => void;
  onComplete?: () => void;
  onShareCheckin?: () => void;
  reviewed?: boolean;
  requestStatus?: 'pending' | 'accepted' | 'declined';
}

export function MatchCard({
  activityTitle,
  categoryIcon,
  category,
  companionName,
  companionTrustScore,
  dateLabel,
  neighborhood,
  variant,
  onAccept,
  onDecline,
  onChat,
  onView,
  onReview,
  onComplete,
  onShareCheckin,
  reviewed = false,
  requestStatus,
}: MatchCardProps) {
  return (
    <View className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3">
      <View className="flex-row items-start">
        <View className="w-12 h-12 bg-neutral-100 rounded-xl items-center justify-center">
          <Text className="text-2xl">{categoryIcon}</Text>
        </View>
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-neutral-900" numberOfLines={1}>
            {activityTitle}
          </Text>
          <View className="flex-row items-center mt-1">
            <Text className="text-xs text-primary-600 font-medium capitalize">{category}</Text>
            <Text className="text-xs text-neutral-300 mx-1.5">|</Text>
            <IconSymbol name="mappin" size={11} color="#78716c" />
            <Text className="text-xs text-neutral-500 ml-0.5">{neighborhood}</Text>
          </View>
          <View className="flex-row items-center mt-1">
            <IconSymbol name="calendar" size={11} color="#78716c" />
            <Text className="text-xs text-neutral-500 ml-1">{dateLabel}</Text>
          </View>
        </View>
      </View>

      <View className="h-px bg-neutral-100 my-3" />

      <View className="flex-row items-center">
        <View className="w-8 h-8 bg-primary-200 rounded-full items-center justify-center">
          <Text className="text-xs font-bold text-primary-800">{companionName.charAt(0)}</Text>
        </View>
        <View className="ml-2 flex-1">
          <Text className="text-sm font-medium text-neutral-800">{companionName}</Text>
          <View className="flex-row items-center">
            <IconSymbol name="star.fill" size={11} color="#d17a47" />
            <Text className="text-xs text-neutral-500 ml-0.5">{companionTrustScore.toFixed(1)}</Text>
          </View>
        </View>

        {variant === 'pending' && (
          <View className="flex-row items-center gap-2">
            <Pressable onPress={onDecline} className="bg-neutral-100 rounded-xl px-4 py-2">
              <Text className="text-sm font-medium text-neutral-600">Decline</Text>
            </Pressable>
            <Pressable onPress={onAccept} className="bg-accent rounded-xl px-4 py-2">
              <Text className="text-sm font-medium text-white">Accept</Text>
            </Pressable>
          </View>
        )}

        {variant === 'confirmed' && (
          <View className="flex-row items-center gap-2">
            <Pressable onPress={onView} className="bg-neutral-100 rounded-xl px-3 py-2">
              <Text className="text-sm font-medium text-neutral-600">View</Text>
            </Pressable>
            <Pressable onPress={onChat} className="bg-accent rounded-xl px-4 py-2">
              <Text className="text-sm font-medium text-white">Chat</Text>
            </Pressable>
          </View>
        )}

        {variant === 'completed' && !reviewed && (
          <Pressable onPress={onReview} className="bg-primary-100 rounded-xl px-4 py-2">
            <Text className="text-sm font-medium text-primary-800">Leave review</Text>
          </Pressable>
        )}

        {variant === 'completed' && reviewed && (
          <View className="flex-row items-center bg-neutral-50 rounded-xl px-3 py-2">
            <IconSymbol name="checkmark.circle.fill" size={14} color="#16a34a" />
            <Text className="text-sm text-neutral-500 ml-1">Reviewed</Text>
          </View>
        )}

        {variant === 'sent' && requestStatus === 'pending' && (
          <View className="bg-neutral-100 rounded-xl px-3 py-2">
            <Text className="text-xs font-medium text-neutral-500">Pending</Text>
          </View>
        )}

        {variant === 'sent' && requestStatus === 'accepted' && (
          <View className="flex-row items-center bg-green-50 rounded-xl px-3 py-2">
            <IconSymbol name="checkmark.circle.fill" size={13} color="#16a34a" />
            <Text className="text-xs font-medium text-green-700 ml-1">Accepted</Text>
          </View>
        )}

        {variant === 'sent' && requestStatus === 'declined' && (
          <View className="bg-neutral-100 rounded-xl px-3 py-2">
            <Text className="text-xs font-medium text-neutral-400">Declined</Text>
          </View>
        )}
      </View>

      {variant === 'confirmed' && (
        <>
          <View className="h-px bg-neutral-100 mt-3" />
          <View className="flex-row items-center justify-between pt-3">
            <Pressable
              onPress={onShareCheckin}
              className="flex-row items-center"
              accessibilityLabel="Share check-in"
            >
              <IconSymbol name="person.badge.shield.checkmark.fill" size={13} color="#c3653c" />
              <Text className="text-xs font-medium text-primary-600 ml-1">Share check-in</Text>
            </Pressable>
            <Pressable onPress={onComplete}>
              <Text className="text-xs font-medium text-neutral-400">Mark as completed</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
