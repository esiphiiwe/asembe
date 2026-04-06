import { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import {
  getOtherCategoryTrackerItems,
  getAllCategories,
  promoteToCategory,
  toggleCategoryActive,
  PROMOTION_THRESHOLD,
  type TrackerItem,
  type CategoryItem,
} from '@/services/admin';

type PromotingState = {
  trackerId: string;
  label: string;
  icon: string;
  saving: boolean;
};

export default function AdminCategoryScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const [trackerItems, setTrackerItems] = useState<TrackerItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<PromotingState | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [tracker, cats] = await Promise.all([
        getOtherCategoryTrackerItems(),
        getAllCategories(),
      ]);
      setTrackerItems(tracker);
      setCategories(cats);
    } catch {
      Alert.alert('Error', 'Could not load category data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!profile?.is_admin) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50 items-center justify-center px-6" edges={['top']}>
        <IconSymbol name="lock.fill" size={40} color="#a8a29e" />
        <Text className="mt-4 text-lg font-semibold text-neutral-700 text-center">
          Admin access only
        </Text>
        <Text className="mt-1 text-sm text-neutral-400 text-center">
          You don't have permission to view this screen.
        </Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 bg-neutral-100 rounded-xl px-6 py-3"
        >
          <Text className="text-sm font-semibold text-neutral-700">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  const handlePromote = async () => {
    if (!promoting) return;

    const icon = promoting.icon.trim();
    if (!icon) {
      Alert.alert('Icon required', 'Please enter an emoji to represent this category.');
      return;
    }

    setPromoting(prev => prev ? { ...prev, saving: true } : null);

    try {
      await promoteToCategory(promoting.trackerId, promoting.label, icon);
      setTrackerItems(prev =>
        prev.map(item =>
          item.id === promoting.trackerId ? { ...item, promoted: true } : item
        )
      );
      setCategories(prev => [
        ...prev,
        {
          id: promoting.trackerId,
          name: promoting.label.toLowerCase().trim(),
          icon,
          active: true,
        },
      ].sort((a, b) => a.name.localeCompare(b.name)));
      setPromoting(null);
    } catch {
      Alert.alert('Error', 'Could not promote this category. Please try again.');
      setPromoting(prev => prev ? { ...prev, saving: false } : null);
    }
  };

  const handleToggleActive = async (category: CategoryItem) => {
    setTogglingId(category.id);
    try {
      await toggleCategoryActive(category.id, !category.active);
      setCategories(prev =>
        prev.map(c => c.id === category.id ? { ...c, active: !c.active } : c)
      );
    } catch {
      Alert.alert('Error', 'Could not update category status. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const unpromoted = trackerItems.filter(item => !item.promoted);
  const promoted = trackerItems.filter(item => item.promoted);
  const flagged = unpromoted.filter(item => item.count >= PROMOTION_THRESHOLD);
  const unflagged = unpromoted.filter(item => item.count < PROMOTION_THRESHOLD);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Header */}
        <View className="px-6 pt-2 pb-2">
          <NavIconButton icon="arrow.left" onPress={() => router.back()} variant="bordered" />
          <Text className="mt-4 font-serif text-3xl font-bold text-neutral-900">
            Category management
          </Text>
          <Text className="text-sm text-neutral-500 mt-1">
            Review "other" labels and promote popular ones to standalone categories.
          </Text>
        </View>

        {/* Other labels tracker */}
        <View className="mt-6">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Other labels tracker
          </Text>

          {unpromoted.length === 0 ? (
            <View className="mx-4 bg-white rounded-2xl border border-neutral-100 p-6 items-center">
              <IconSymbol name="checkmark.circle.fill" size={28} color="#16a34a" />
              <Text className="mt-2 text-sm font-medium text-neutral-600 text-center">
                No unpromoted labels yet
              </Text>
            </View>
          ) : (
            <>
              {flagged.length > 0 && (
                <>
                  <Text className="px-6 text-xs font-medium text-amber-600 mb-2">
                    Ready to promote ({flagged.length})
                  </Text>
                  {flagged.map(item => (
                    <TrackerItemCard
                      key={item.id}
                      item={item}
                      promoting={promoting}
                      onStartPromote={() =>
                        setPromoting({ trackerId: item.id, label: item.label, icon: '', saving: false })
                      }
                      onCancelPromote={() => setPromoting(null)}
                      onChangeIcon={icon =>
                        setPromoting(prev => prev ? { ...prev, icon } : null)
                      }
                      onConfirmPromote={handlePromote}
                      flagged
                    />
                  ))}
                </>
              )}

              {unflagged.length > 0 && (
                <>
                  <Text className="px-6 text-xs font-medium text-neutral-400 mt-2 mb-2">
                    Tracking ({unflagged.length})
                  </Text>
                  {unflagged.map(item => (
                    <TrackerItemCard
                      key={item.id}
                      item={item}
                      promoting={promoting}
                      onStartPromote={() =>
                        setPromoting({ trackerId: item.id, label: item.label, icon: '', saving: false })
                      }
                      onCancelPromote={() => setPromoting(null)}
                      onChangeIcon={icon =>
                        setPromoting(prev => prev ? { ...prev, icon } : null)
                      }
                      onConfirmPromote={handlePromote}
                      flagged={false}
                    />
                  ))}
                </>
              )}

              {promoted.length > 0 && (
                <>
                  <Text className="px-6 text-xs font-medium text-neutral-300 mt-2 mb-2">
                    Already promoted ({promoted.length})
                  </Text>
                  {promoted.map(item => (
                    <View
                      key={item.id}
                      className="mx-4 bg-white rounded-2xl border border-neutral-100 px-4 py-3 mb-2 flex-row items-center"
                    >
                      <Text className="flex-1 text-sm text-neutral-400 capitalize">{item.label}</Text>
                      <View className="bg-green-50 rounded-lg px-2 py-1">
                        <Text className="text-xs font-semibold text-green-600">Promoted</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* Current categories */}
        <View className="mt-8">
          <Text className="px-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Categories ({categories.length})
          </Text>
          <View className="mx-4 bg-white rounded-2xl border border-neutral-100 overflow-hidden">
            {categories.map((cat, index) => (
              <View key={cat.id}>
                {index > 0 && <View className="h-px bg-neutral-50 mx-4" />}
                <View className="flex-row items-center px-4 py-3.5">
                  <Text className="text-xl mr-3">{cat.icon}</Text>
                  <Text className="flex-1 text-base font-medium text-neutral-900 capitalize">
                    {cat.name}
                  </Text>
                  {togglingId === cat.id ? (
                    <ActivityIndicator size="small" color="#e8572a" />
                  ) : (
                    <Switch
                      value={cat.active}
                      onValueChange={() => handleToggleActive(cat)}
                      trackColor={{ false: '#e7e5e4', true: '#fbd5c8' }}
                      thumbColor={cat.active ? '#e8572a' : '#a8a29e'}
                    />
                  )}
                </View>
              </View>
            ))}
          </View>
          <Text className="px-6 mt-2 text-xs text-neutral-400">
            Inactive categories are hidden from the activity posting flow.
          </Text>
        </View>

        <View className="h-12" />
      </ScrollView>
    </SafeAreaView>
  );
}

interface TrackerItemCardProps {
  item: TrackerItem;
  promoting: PromotingState | null;
  flagged: boolean;
  onStartPromote: () => void;
  onCancelPromote: () => void;
  onChangeIcon: (icon: string) => void;
  onConfirmPromote: () => void;
}

function TrackerItemCard({
  item,
  promoting,
  flagged,
  onStartPromote,
  onCancelPromote,
  onChangeIcon,
  onConfirmPromote,
}: TrackerItemCardProps) {
  const isThisOne = promoting?.trackerId === item.id;

  return (
    <View className={`mx-4 mb-2 bg-white rounded-2xl border overflow-hidden ${flagged ? 'border-amber-200' : 'border-neutral-100'}`}>
      <View className="flex-row items-center px-4 py-3.5">
        <View className={`w-8 h-8 rounded-full items-center justify-center mr-3 ${flagged ? 'bg-amber-50' : 'bg-neutral-100'}`}>
          <Text className={`text-sm font-bold ${flagged ? 'text-amber-600' : 'text-neutral-500'}`}>
            {item.count}
          </Text>
        </View>
        <Text className="flex-1 text-base font-medium text-neutral-900 capitalize">
          {item.label}
        </Text>
        {!isThisOne && (
          <Pressable
            onPress={onStartPromote}
            className={`rounded-xl px-3 py-2 ${flagged ? 'bg-accent' : 'bg-neutral-100'}`}
          >
            <Text className={`text-sm font-semibold ${flagged ? 'text-white' : 'text-neutral-600'}`}>
              Promote
            </Text>
          </Pressable>
        )}
      </View>

      {isThisOne && (
        <View className="px-4 pb-4 border-t border-neutral-50">
          <Text className="text-xs font-medium text-neutral-500 mt-3 mb-1.5">
            Choose an emoji icon for "{item.label}"
          </Text>
          <TextInput
            value={promoting?.icon ?? ''}
            onChangeText={onChangeIcon}
            placeholder="e.g. 🎭"
            placeholderTextColor="#a8a29e"
            className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-2xl text-center mb-3"
            autoFocus
            maxLength={4}
          />
          <View className="flex-row gap-2">
            <Pressable
              onPress={onCancelPromote}
              className="flex-1 bg-neutral-100 rounded-xl py-2.5 items-center"
              disabled={promoting?.saving}
            >
              <Text className="text-sm font-semibold text-neutral-600">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirmPromote}
              className="flex-1 bg-accent rounded-xl py-2.5 items-center"
              disabled={promoting?.saving}
            >
              {promoting?.saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Confirm promotion</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
