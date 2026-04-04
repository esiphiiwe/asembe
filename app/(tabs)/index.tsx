import { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, FlatList, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SearchBar } from '@/components/ui/search-bar';
import { CategoryChip } from '@/components/ui/category-chip';
import { ActivityCard } from '@/components/ui/activity-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CATEGORIES } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { getOpenActivities, type ActivityWithPoster } from '@/services/activities';
import { MOCK_ACTIVITIES, formatActivityDate } from '@/lib/mock-data';

export default function HomeScreen() {
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityWithPoster[]>([]);
  const [useMock, setUseMock] = useState(false);

  const loadActivities = useCallback(async () => {
    try {
      const data = await getOpenActivities({
        city: profile?.city,
        category: selectedCategory ?? undefined,
      });
      setActivities(data);
      setUseMock(false);
    } catch {
      setUseMock(true);
    }
  }, [profile?.city, selectedCategory]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const displayActivities = useMock
    ? (selectedCategory
        ? MOCK_ACTIVITIES.filter(a => a.categoryName === selectedCategory)
        : MOCK_ACTIVITIES
      ).map(a => ({
        ...a,
        user_id: a.userId,
        category_id: a.categoryId,
        custom_category_label: null,
        date_time: a.dateTime?.toISOString() ?? null,
        recurrence_rule: a.recurrenceRule ?? null,
        recurrence_end_date: null,
        companion_count: a.companionCount,
        poster_name: a.posterName,
        poster_trust_score: a.posterTrustScore,
        category_name: a.categoryName,
        category_icon: a.categoryIcon,
        created_at: a.createdAt.toISOString(),
      } as unknown as ActivityWithPoster))
    : activities;

  const filtered = selectedCategory && !useMock
    ? displayActivities.filter(a => a.category_name === selectedCategory)
    : displayActivities;

  const thisWeek = filtered.slice(0, 4);
  const nearYou = filtered.slice(2);

  const formatDate = (a: ActivityWithPoster) => {
    if (!a.date_time) return 'Recurring';
    return formatActivityDate(new Date(a.date_time));
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <View>
          <Text className="font-serif text-3xl font-bold text-neutral-900">
            Asambe
          </Text>
          <Text className="text-sm text-neutral-400 mt-0.5">
            {profile?.city ?? 'Cape Town'}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          className="w-10 h-10 bg-white border border-neutral-200 rounded-full items-center justify-center"
        >
          <IconSymbol name="gearshape.fill" size={18} color="#44403c" />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e8572a" />
        }
      >
        {/* Search bar */}
        <View className="px-6 mb-4">
          <SearchBar placeholder="Search activities, neighborhoods..." />
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-6 pb-4"
        >
          <Pressable
            onPress={() => setSelectedCategory(null)}
            className={`px-4 py-2.5 rounded-full mr-2 border ${
              !selectedCategory
                ? 'bg-neutral-900 border-neutral-900'
                : 'bg-white border-neutral-200'
            }`}
          >
            <Text className={`text-sm font-medium ${!selectedCategory ? 'text-white' : 'text-neutral-700'}`}>
              All
            </Text>
          </Pressable>
          {CATEGORIES.map(cat => (
            <CategoryChip
              key={cat.name}
              icon={cat.icon}
              label={cat.name}
              selected={selectedCategory === cat.name}
              onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
            />
          ))}
        </ScrollView>

        {/* Happening this week - horizontal carousel */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between px-6 mb-3">
            <Text className="font-serif text-xl font-bold text-neutral-900">
              Happening this week
            </Text>
            <Pressable className="flex-row items-center">
              <Text className="text-sm font-medium text-primary-600 mr-0.5">See all</Text>
              <IconSymbol name="chevron.right" size={14} color="#c3653c" />
            </Pressable>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={thisWeek}
            keyExtractor={item => item.id}
            contentContainerClassName="px-6"
            renderItem={({ item }) => (
              <ActivityCard
                variant="horizontal"
                title={item.title}
                category={item.category_name}
                categoryIcon={item.category_icon}
                neighborhood={item.neighborhood}
                dateLabel={formatDate(item)}
                posterName={item.poster_name}
                trustScore={item.poster_trust_score}
                companionCount={item.companion_count}
                onPress={() => router.push(`/activity/${item.id}`)}
              />
            )}
          />
        </View>

        {/* Near you - vertical list */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-serif text-xl font-bold text-neutral-900">
              Near you
            </Text>
            <Pressable className="flex-row items-center">
              <Text className="text-sm font-medium text-primary-600 mr-0.5">See all</Text>
              <IconSymbol name="chevron.right" size={14} color="#c3653c" />
            </Pressable>
          </View>
          {nearYou.map(item => (
            <ActivityCard
              key={item.id}
              variant="vertical"
              title={item.title}
              category={item.category_name}
              categoryIcon={item.category_icon}
              neighborhood={item.neighborhood}
              dateLabel={formatDate(item)}
              posterName={item.poster_name}
              trustScore={item.poster_trust_score}
              companionCount={item.companion_count}
              onPress={() => router.push(`/activity/${item.id}`)}
            />
          ))}
        </View>

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
