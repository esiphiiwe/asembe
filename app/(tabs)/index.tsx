import { useState, useEffect, useCallback, useDeferredValue } from 'react';
import {
  Text,
  View,
  ScrollView,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SearchBar } from '@/components/ui/search-bar';
import { CategoryChip } from '@/components/ui/category-chip';
import { ActivityCard } from '@/components/ui/activity-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenState } from '@/components/ui/screen-state';
import { CATEGORIES } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { useSubscription } from '@/hooks/use-subscription';
import { getErrorMessage, isConfigError } from '@/lib/errors';
import { getOpenActivities, type ActivityFeedItem } from '@/services/activities';
import type { SkillLevel } from '@/types/index';

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'experienced', label: 'Experienced' },
];

interface AdvancedFilters {
  minAge: number | null;
  maxAge: number | null;
  skillLevel: SkillLevel | null;
}

const DEFAULT_ADVANCED_FILTERS: AdvancedFilters = {
  minAge: null,
  maxAge: null,
  skillLevel: null,
};

function hasActiveAdvancedFilters(f: AdvancedFilters): boolean {
  return f.minAge !== null || f.maxAge !== null || f.skillLevel !== null;
}

export default function HomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const { canAdvancedFilters } = useSubscription();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);

  const deferredSearchText = useDeferredValue(searchText.trim());

  const loadActivities = useCallback(async () => {
    setError(null);

    try {
      const data = await getOpenActivities({
        city: profile?.city,
        category: selectedCategory ?? undefined,
        search: deferredSearchText || undefined,
      });
      setActivities(data);
    } catch (err) {
      setActivities([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [deferredSearchText, profile?.city, selectedCategory]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const openFilters = () => {
    if (!canAdvancedFilters) {
      router.push('/subscription');
      return;
    }
    setPendingFilters(advancedFilters);
    setShowFilterSheet(true);
  };

  const applyFilters = () => {
    setAdvancedFilters(pendingFilters);
    setShowFilterSheet(false);
  };

  const clearFilters = () => {
    setPendingFilters(DEFAULT_ADVANCED_FILTERS);
    setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
    setShowFilterSheet(false);
  };

  const filterActive = hasActiveAdvancedFilters(advancedFilters);

  const filteredActivities = activities.filter(item => {
    if (advancedFilters.skillLevel) {
      return true;
    }
    return true;
  });

  const featuredActivities = filteredActivities.slice(0, 4);
  const nearbyActivities = filteredActivities.length > 4 ? filteredActivities.slice(4) : filteredActivities;

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon={isConfigError(error) ? '🛠️' : '⚠️'}
          title={isConfigError(error) ? 'Finish Supabase setup' : 'Could not load activities'}
          description={getErrorMessage(
            error,
            'We could not load live activities right now. Please try again.'
          )}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            void loadActivities();
          }}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 pt-2 pb-3">
        <View>
          <Text className="font-serif text-3xl font-bold text-neutral-900">
            Asambe
          </Text>
          <Text className="text-sm text-neutral-400 mt-0.5">
            {profile?.city ?? 'Your city'}
          </Text>
        </View>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/settings',
              params: { returnTo: '/(tabs)' },
            })
          }
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
        <View className="px-6 mb-3">
          <View className="flex-row gap-2 items-center">
            <View className="flex-1">
              <SearchBar
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search activities, neighborhoods..."
              />
            </View>
            <Pressable
              onPress={openFilters}
              className={`w-11 h-11 rounded-xl border items-center justify-center ${
                filterActive
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <IconSymbol
                name="slider.horizontal.3"
                size={18}
                color={filterActive ? '#fff' : '#78716c'}
              />
              {!canAdvancedFilters ? (
                <View className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full items-center justify-center">
                  <IconSymbol name="lock.fill" size={8} color="#fff" />
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

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

        <View className="mb-6">
          <View className="px-6 mb-3">
            <Text className="font-serif text-xl font-bold text-neutral-900">
              Happening this week
            </Text>
          </View>
          {featuredActivities.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={featuredActivities}
              keyExtractor={item => item.id}
              contentContainerClassName="px-6"
              renderItem={({ item }) => (
                <ActivityCard
                  variant="horizontal"
                  title={item.title}
                  category={item.categoryName}
                  categoryIcon={item.categoryIcon}
                  neighborhood={item.neighborhood}
                  dateLabel={item.dateLabel}
                  posterName={item.posterName}
                  trustScore={item.posterTrustScore}
                  companionCount={item.companionCount}
                  onPress={() =>
                    router.push({
                      pathname: '/activity/[id]',
                      params: {
                        id: item.id,
                        returnTo: '/(tabs)',
                      },
                    })
                  }
                />
              )}
            />
          ) : (
            <View className="px-6">
              <ScreenState
                icon="🗓️"
                title="No activities yet"
                description={
                  deferredSearchText
                    ? 'No live activities match your search yet.'
                    : 'When people post open activities in your city, they will show up here.'
                }
              />
            </View>
          )}
        </View>

        <View className="px-6 mb-6">
          <View className="mb-3">
            <Text className="font-serif text-xl font-bold text-neutral-900">
              Near you
            </Text>
          </View>
          {nearbyActivities.length > 0 ? (
            nearbyActivities.map(item => (
              <ActivityCard
                key={item.id}
                variant="vertical"
                title={item.title}
                category={item.categoryName}
                categoryIcon={item.categoryIcon}
                neighborhood={item.neighborhood}
                dateLabel={item.dateLabel}
                posterName={item.posterName}
                trustScore={item.posterTrustScore}
                companionCount={item.companionCount}
                onPress={() =>
                  router.push({
                    pathname: '/activity/[id]',
                    params: {
                      id: item.id,
                      returnTo: '/(tabs)',
                    },
                  })
                }
              />
            ))
          ) : featuredActivities.length > 0 ? (
            <Text className="text-sm text-neutral-400 py-6">
              More live activities will appear here as they are posted.
            </Text>
          ) : null}
        </View>

        <View className="h-20" />
      </ScrollView>

      {/* Advanced filters bottom sheet */}
      <Modal
        visible={showFilterSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setShowFilterSheet(false)}
        />
        <View className="bg-white rounded-t-3xl px-6 pt-5 pb-10">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="font-serif text-xl font-bold text-neutral-900">Filters</Text>
            <Pressable onPress={() => setShowFilterSheet(false)}>
              <IconSymbol name="xmark.circle.fill" size={24} color="#a8a29e" />
            </Pressable>
          </View>

          {/* Skill level filter */}
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Skill level</Text>
          <View className="flex-row gap-2 mb-5">
            {SKILL_LEVELS.map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() =>
                  setPendingFilters(prev => ({
                    ...prev,
                    skillLevel: prev.skillLevel === value ? null : value,
                  }))
                }
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  pendingFilters.skillLevel === value
                    ? 'bg-primary-100 border-primary-500'
                    : 'bg-neutral-50 border-neutral-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    pendingFilters.skillLevel === value ? 'text-primary-800' : 'text-neutral-600'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Age range filter */}
          <Text className="text-sm font-semibold text-neutral-700 mb-2">Age range</Text>
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1">
              <Text className="text-xs text-neutral-400 mb-1">Min age</Text>
              <View className="flex-row gap-1.5 flex-wrap">
                {[18, 25, 30, 35].map(age => (
                  <Pressable
                    key={age}
                    onPress={() =>
                      setPendingFilters(prev => ({
                        ...prev,
                        minAge: prev.minAge === age ? null : age,
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      pendingFilters.minAge === age
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        pendingFilters.minAge === age ? 'text-primary-800' : 'text-neutral-600'
                      }`}
                    >
                      {age}+
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-neutral-400 mb-1">Max age</Text>
              <View className="flex-row gap-1.5 flex-wrap">
                {[35, 45, 55, 65].map(age => (
                  <Pressable
                    key={age}
                    onPress={() =>
                      setPendingFilters(prev => ({
                        ...prev,
                        maxAge: prev.maxAge === age ? null : age,
                      }))
                    }
                    className={`px-3 py-2 rounded-lg border ${
                      pendingFilters.maxAge === age
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        pendingFilters.maxAge === age ? 'text-primary-800' : 'text-neutral-600'
                      }`}
                    >
                      {'≤'}{age}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View className="flex-row gap-3">
            <Pressable
              onPress={clearFilters}
              className="flex-1 py-3.5 rounded-2xl border border-neutral-200 items-center"
            >
              <Text className="text-sm font-semibold text-neutral-600">Clear all</Text>
            </Pressable>
            <Pressable
              onPress={applyFilters}
              className="flex-1 py-3.5 rounded-2xl bg-neutral-900 items-center"
            >
              <Text className="text-sm font-semibold text-white">Apply filters</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
