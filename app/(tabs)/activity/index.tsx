import { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FormInput } from '@/components/ui/form-input';
import { AsambeButton } from '@/components/ui/asambe-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenState } from '@/components/ui/screen-state';
import { getErrorMessage, isConfigError } from '@/lib/errors';
import { useAuth } from '@/lib/auth-context';
import { createActivity } from '@/services/activities';
import { getCategories } from '@/services/profiles';
import type { Database } from '@/types/database';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_MAP: Record<string, string> = {
  Mon: 'monday',
  Tue: 'tuesday',
  Wed: 'wednesday',
  Thu: 'thursday',
  Fri: 'friday',
  Sat: 'saturday',
  Sun: 'sunday',
};
const COMPANION_COUNTS = [1, 2, 3, 4] as const;
const GENDER_PREFS = [
  { label: 'Any', value: 'any' },
  { label: 'Women only', value: 'women-only' },
  { label: 'No preference', value: 'no-preference' },
] as const;

type Category = Database['public']['Tables']['categories']['Row'];

export default function PostActivityScreen() {
  const { user, profile } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [companionCount, setCompanionCount] = useState<number>(1);
  const [genderPref, setGenderPref] = useState('any');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);

  const loadCategories = useCallback(async () => {
    setLoadError(null);

    try {
      const categoryData = await getCategories();
      const map: Record<string, string> = {};
      categoryData.forEach(category => {
        map[category.name] = category.id;
      });

      setCategories(categoryData);
      setCategoryMap(map);
    } catch (error) {
      setCategories([]);
      setCategoryMap({});
      setLoadError(error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setSelectedCategory('');
    setCustomCategory('');
    setTitle('');
    setDescription('');
    setNeighborhood('');
    setCompanionCount(1);
    setGenderPref('any');
    setIsRecurring(false);
    setSelectedDay('');
    setDate('');
    setTime('');
  };

  const handlePost = async () => {
    if (!selectedCategory) {
      Alert.alert('Missing category', 'Please select a category.');
      return;
    }
    if (selectedCategory === 'other' && !customCategory.trim()) {
      Alert.alert('Missing category', 'Please add a custom category label.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please give your activity a name.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing description', 'Please add a description.');
      return;
    }
    if (!neighborhood.trim()) {
      Alert.alert('Missing neighborhood', 'Please enter the neighborhood.');
      return;
    }
    if (!isRecurring && (!date.trim() || !time.trim())) {
      Alert.alert('Missing schedule', 'Please enter both a date and a time.');
      return;
    }
    if (isRecurring && !selectedDay) {
      Alert.alert('Missing day', 'Please select which day the activity recurs.');
      return;
    }

    if (!user || !profile) {
      Alert.alert('Not signed in', 'Please sign in to post an activity.');
      return;
    }

    setSubmitting(true);
    try {
      const categoryId = categoryMap[selectedCategory];
      if (!categoryId) {
        Alert.alert('Category error', 'Could not resolve category. Please try again.');
        setSubmitting(false);
        return;
      }

      await createActivity({
        user_id: user.id,
        category_id: categoryId,
        custom_category_label: selectedCategory === 'other' ? customCategory.trim() : null,
        title: title.trim(),
        description: description.trim(),
        date_time: !isRecurring ? new Date(`${date} ${time}`).toISOString() : null,
        recurrence_rule: isRecurring && selectedDay ? `weekly:${DAY_MAP[selectedDay]}` : null,
        neighborhood: neighborhood.trim(),
        coordinates: { lat: 0, lng: 0 },
        city: profile.city,
        country: profile.country,
        companion_count: companionCount,
      });

      Alert.alert('Activity posted!', 'Your activity is now live.', [
        {
          text: 'View feed',
          onPress: () => {
            resetForm();
            router.push('/(tabs)');
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Could not post activity.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCategories) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon={isConfigError(loadError) ? '🛠️' : '⚠️'}
          title={isConfigError(loadError) ? 'Finish Supabase setup' : 'Could not load categories'}
          description={getErrorMessage(
            loadError,
            'We could not load the activity categories needed to post right now.'
          )}
          actionLabel="Try again"
          onAction={() => {
            setLoadingCategories(true);
            void loadCategories();
          }}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  if (categories.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon="🗂️"
          title="No categories available"
          description="Activity categories need to exist in Supabase before you can post."
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 pt-4 pb-2">
          <Text className="font-serif text-3xl font-bold text-neutral-900">
            Post an activity
          </Text>
          <Text className="text-sm text-neutral-500 mt-1">
            Find a companion for something you want to do.
          </Text>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text className="text-sm font-medium text-neutral-700 mt-4 mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {categories.map(category => (
              <Pressable
                key={category.id}
                onPress={() => setSelectedCategory(category.name)}
                className={`flex-row items-center px-3.5 py-2.5 rounded-xl border ${
                  selectedCategory === category.name
                    ? 'bg-primary-100 border-primary-500'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Text className="text-lg mr-1.5">{category.icon}</Text>
                <Text
                  className={`text-sm font-medium capitalize ${
                    selectedCategory === category.name ? 'text-primary-800' : 'text-neutral-700'
                  }`}
                >
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectedCategory === 'other' ? (
            <FormInput
              label="Custom category"
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder="e.g. Board games, Yoga, Surfing"
            />
          ) : null}

          <FormInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Give your activity a name"
          />
          <FormInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What's the plan? Any details companions should know?"
            multiline
            numberOfLines={4}
            style={{ minHeight: 100, textAlignVertical: 'top' } as const}
          />

          <View className="flex-row items-center justify-between mb-4 bg-white rounded-xl border border-neutral-200 px-4 py-3">
            <View className="flex-row items-center">
              <IconSymbol name="clock" size={18} color="#78716c" />
              <Text className="text-base text-neutral-700 ml-2">Recurring activity</Text>
            </View>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: '#e7e5e4', true: '#e8572a' }}
              thumbColor="#fff"
            />
          </View>

          {isRecurring ? (
            <View className="mb-4">
              <Text className="text-sm font-medium text-neutral-700 mb-2">Repeat every</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {DAYS.map(day => (
                    <Pressable
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      className={`w-12 h-12 rounded-full items-center justify-center border ${
                        selectedDay === day
                          ? 'bg-accent border-accent'
                          : 'bg-white border-neutral-200'
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          selectedDay === day ? 'text-white' : 'text-neutral-600'
                        }`}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <FormInput
                  label="Date"
                  value={date}
                  onChangeText={setDate}
                  placeholder="Apr 6, 2026"
                />
              </View>
              <View className="flex-1">
                <FormInput
                  label="Time"
                  value={time}
                  onChangeText={setTime}
                  placeholder="2:00 PM"
                />
              </View>
            </View>
          )}

          <FormInput
            label="Neighborhood"
            value={neighborhood}
            onChangeText={setNeighborhood}
            placeholder="e.g. V&A Waterfront, Woodstock"
            hint="Only the neighborhood is shown — never the exact address."
          />

          <Text className="text-sm font-medium text-neutral-700 mb-2">How many companions?</Text>
          <View className="flex-row gap-2 mb-4">
            {COMPANION_COUNTS.map(count => (
              <Pressable
                key={count}
                onPress={() => setCompanionCount(count)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  companionCount === count
                    ? 'bg-primary-100 border-primary-500'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-lg font-semibold ${
                    companionCount === count ? 'text-primary-800' : 'text-neutral-500'
                  }`}
                >
                  {count}
                </Text>
                <Text
                  className={`text-xs mt-0.5 ${
                    companionCount === count ? 'text-primary-600' : 'text-neutral-400'
                  }`}
                >
                  {count === 1 ? '1-on-1' : 'Group'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text className="text-sm font-medium text-neutral-700 mb-2">Companion gender preference</Text>
          <View className="flex-row gap-2 mb-6">
            {GENDER_PREFS.map(pref => (
              <Pressable
                key={pref.value}
                onPress={() => setGenderPref(pref.value)}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  genderPref === pref.value
                    ? 'bg-primary-100 border-primary-500'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    genderPref === pref.value ? 'text-primary-800' : 'text-neutral-600'
                  }`}
                >
                  {pref.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View className="h-8" />
        </ScrollView>

        <View className="px-6 pb-4 pt-3 border-t border-neutral-100 bg-neutral-50">
          <AsambeButton
            title={submitting ? 'Posting...' : 'Post activity'}
            onPress={handlePost}
            fullWidth
            size="lg"
            disabled={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
