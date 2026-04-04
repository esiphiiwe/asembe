import { useState } from 'react';
import { Text, View, ScrollView, Pressable, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AsambeButton } from '@/components/ui/asambe-button';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useAuth } from '@/lib/auth-context';
import { createReview } from '@/services/reviews';

const STAR_LABELS = ['', 'Not great', 'Could be better', 'Good', 'Great', 'Amazing'];

export default function ReviewScreen() {
  const { matchId, companionName, companionId, activityTitle, categoryIcon, returnTo } =
    useLocalSearchParams<{
      matchId: string;
      companionName: string;
      companionId: string;
      activityTitle: string;
      categoryIcon: string;
      returnTo?: string;
    }>();

  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const handleBack = useBackNavigation({
    fallbackHref: '/(tabs)/inbox',
    returnTo,
  });

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }

    if (flagged && !flagReason.trim()) {
      Alert.alert('Reason required', 'Please describe why you are flagging this activity.');
      return;
    }

    setSubmitting(true);
    try {
      if (user && companionId) {
        await createReview({
          matchId: matchId!,
          reviewerId: user.id,
          revieweeId: companionId,
          rating,
          comment: comment.trim() || undefined,
          flagged,
          flagReason: flagged ? flagReason.trim() : undefined,
        });
      }
      setSubmitted(true);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50">
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(500)} className="items-center">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
              <IconSymbol name="checkmark.circle.fill" size={40} color="#16a34a" />
            </View>
            <Text className="font-serif text-2xl font-bold text-neutral-900 text-center mb-2">
              Thanks for your review
            </Text>
            <Text className="text-base text-neutral-500 text-center leading-6 mb-8">
              Your feedback helps keep the Asambe community safe and trustworthy.
            </Text>
            <AsambeButton
              title="Back to matches"
              onPress={handleBack}
              fullWidth
              size="lg"
            />
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      {/* Header */}
      <View className="flex-row items-center px-6 pt-2 pb-4">
        <NavIconButton
          icon="xmark"
          iconSize={18}
          onPress={handleBack}
          variant="bordered"
        />
        <View className="flex-1 items-center">
          <Text className="text-sm font-medium text-neutral-500">Post-activity review</Text>
        </View>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInUp.duration(400)} className="px-6">
          {/* Activity reference */}
          <View className="items-center mb-8 pt-4">
            <View className="w-16 h-16 bg-neutral-100 rounded-2xl items-center justify-center mb-4">
              <Text className="text-3xl">{categoryIcon ?? '✨'}</Text>
            </View>
            <Text className="font-serif text-2xl font-bold text-neutral-900 text-center mb-1">
              How was the activity?
            </Text>
            <Text className="text-base text-neutral-500 text-center">
              {activityTitle ?? 'Activity'}
            </Text>
          </View>

          {/* Companion reference */}
          <View className="bg-white rounded-2xl border border-neutral-100 p-4 mb-6 flex-row items-center">
            <View className="w-12 h-12 bg-primary-200 rounded-full items-center justify-center">
              <Text className="text-base font-bold text-primary-800">
                {(companionName ?? 'U').charAt(0)}
              </Text>
            </View>
            <View className="ml-3">
              <Text className="text-sm text-neutral-500">Your companion</Text>
              <Text className="text-base font-semibold text-neutral-900">
                {companionName ?? 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Star rating */}
          <View className="items-center mb-2">
            <View className="flex-row items-center gap-3">
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable
                  key={star}
                  onPress={() => setRating(star)}
                  className="p-1"
                >
                  <IconSymbol
                    name="star.fill"
                    size={36}
                    color={star <= rating ? '#d17a47' : '#e7e5e4'}
                  />
                </Pressable>
              ))}
            </View>
            <Text className="text-sm text-neutral-500 mt-2 h-5">
              {STAR_LABELS[rating]}
            </Text>
          </View>

          {/* Comment */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-neutral-700 mb-2">
              Add a comment (optional)
            </Text>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="How was the experience? Would you recommend them as a companion?"
              placeholderTextColor="#a8a29e"
              multiline
              numberOfLines={4}
              className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-base text-neutral-900 min-h-[100px]"
              style={{ textAlignVertical: 'top' }}
            />
          </View>

          {/* Flag section */}
          <View className="bg-white rounded-2xl border border-neutral-100 p-4 mb-6">
            <Pressable
              onPress={() => setFlagged(!flagged)}
              className="flex-row items-center"
            >
              <View
                className={`w-5 h-5 rounded border items-center justify-center mr-3 ${
                  flagged ? 'bg-red-600 border-red-600' : 'border-neutral-300'
                }`}
              >
                {flagged && <IconSymbol name="checkmark" size={12} color="#fff" />}
              </View>
              <View className="flex-1">
                <Text className="text-base font-medium text-neutral-800">
                  Flag this activity
                </Text>
                <Text className="text-sm text-neutral-400 mt-0.5">
                  Report unsafe behaviour or a policy violation
                </Text>
              </View>
              <IconSymbol name="flag.fill" size={16} color={flagged ? '#dc2626' : '#a8a29e'} />
            </Pressable>

            {flagged && (
              <Animated.View entering={FadeIn.duration(200)} className="mt-3">
                <TextInput
                  value={flagReason}
                  onChangeText={setFlagReason}
                  placeholder="Please describe what happened..."
                  placeholderTextColor="#a8a29e"
                  multiline
                  numberOfLines={3}
                  className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-900 min-h-[80px]"
                  style={{ textAlignVertical: 'top' }}
                />
              </Animated.View>
            )}
          </View>

          <View className="h-4" />
        </Animated.View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-6 pb-4 pt-3 border-t border-neutral-100 bg-neutral-50">
        <AsambeButton
          title={submitting ? 'Submitting...' : 'Submit review'}
          onPress={handleSubmit}
          fullWidth
          size="lg"
          disabled={submitting || rating === 0}
        />
        <Pressable onPress={handleBack} className="mt-3 items-center py-2">
          <Text className="text-sm font-medium text-neutral-500">Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
