import { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MatchCard } from '@/components/ui/match-card';
import { ScreenState } from '@/components/ui/screen-state';
import { useAuth } from '@/lib/auth-context';
import { getErrorMessage, isConfigError } from '@/lib/errors';
import {
  getUserMatches,
  getPendingRequestsForUser,
  getOutgoingRequests,
  respondToRequest,
  updateMatchStatus,
  type MatchListItemView,
  type OutgoingRequestView,
  type PendingMatchRequestView,
} from '@/services/matches';
import { getCompletedMatchesPendingReview } from '@/services/reviews';

type Tab = 'pending' | 'confirmed' | 'completed' | 'sent';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'sent', label: 'Sent' },
];

function EmptyState({ tab }: { tab: Tab }) {
  const config = {
    pending: {
      icon: '📬',
      title: 'No pending requests',
      subtitle: 'When someone requests to join your activity, they will appear here.',
    },
    confirmed: {
      icon: '🤝',
      title: 'No confirmed matches yet',
      subtitle: 'Accept a request to start a match and unlock chat.',
    },
    completed: {
      icon: '✨',
      title: 'No completed activities',
      subtitle: 'Your activity history will show up here after your first match.',
    },
    sent: {
      icon: '📤',
      title: 'No sent requests',
      subtitle: 'When you request to join an activity, it will appear here.',
    },
  };
  const content = config[tab];

  return (
    <View className="items-center justify-center py-20 px-8">
      <Text className="text-5xl mb-4">{content.icon}</Text>
      <Text className="text-lg font-semibold text-neutral-800 mb-2 text-center">{content.title}</Text>
      <Text className="text-sm text-neutral-400 text-center leading-5">{content.subtitle}</Text>
    </View>
  );
}

export default function MatchInboxScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [pendingRequests, setPendingRequests] = useState<PendingMatchRequestView[]>([]);
  const [matches, setMatches] = useState<MatchListItemView[]>([]);
  const [sentRequests, setSentRequests] = useState<OutgoingRequestView[]>([]);
  const [pendingReviewMatchIds, setPendingReviewMatchIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setError(null);

    try {
      const [requestData, matchData, pendingReviewData, sentData] = await Promise.all([
        getPendingRequestsForUser(user.id),
        getUserMatches(user.id),
        getCompletedMatchesPendingReview(user.id),
        getOutgoingRequests(user.id),
      ]);

      setPendingRequests(requestData);
      setMatches(matchData);
      setPendingReviewMatchIds(new Set(pendingReviewData.map(match => match.id)));
      setSentRequests(sentData);
    } catch (error) {
      setPendingRequests([]);
      setMatches([]);
      setSentRequests([]);
      setPendingReviewMatchIds(new Set());
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAccept = async (request: PendingMatchRequestView) => {
    try {
      await respondToRequest(
        request.id,
        'accepted',
        request.activityId,
        request.requesterId,
        user!.id
      );
      await loadData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Could not accept this request.'));
    }
  };

  const handleDecline = async (request: PendingMatchRequestView) => {
    try {
      await respondToRequest(request.id, 'declined');
      await loadData();
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error, 'Could not decline this request.'));
    }
  };

  const handleComplete = (matchId: string) => {
    Alert.alert(
      'Mark as completed?',
      'This will move the match to your completed history and allow both of you to leave a review.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as completed',
          style: 'default',
          onPress: async () => {
            try {
              await updateMatchStatus(matchId, 'completed');
              await loadData();
            } catch (error) {
              Alert.alert('Error', getErrorMessage(error, 'Could not mark this match as completed.'));
            }
          },
        },
      ]
    );
  };

  const handleShareCheckin = (match: MatchListItemView) => {
    const message = `Safety check-in: I'm meeting ${match.companionName} for "${match.activityTitle}" in ${match.neighborhood} on ${match.dateLabel}. Please check in with me after.`;
    void Share.share({ message });
  };

  const confirmedMatches = matches.filter(match => match.status === 'confirmed');
  const completedMatches = matches.filter(match => match.status === 'completed');
  const badgeCount = pendingRequests.length;

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
          title={isConfigError(error) ? 'Finish Supabase setup' : 'Could not load matches'}
          description={getErrorMessage(
            error,
            'We could not load your live match data right now. Please try again.'
          )}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            void loadData();
          }}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <View className="px-6 pt-4 pb-2">
        <Text className="font-serif text-3xl font-bold text-neutral-900">
          Matches
        </Text>
      </View>

      <View className="flex-row mx-6 mt-2 mb-4 bg-neutral-100 rounded-xl p-1">
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
              activeTab === tab.key ? 'bg-white shadow-sm' : ''
            }`}
          >
            <View className="flex-row items-center">
              <Text
                className={`text-sm font-medium ${
                  activeTab === tab.key ? 'text-neutral-900' : 'text-neutral-500'
                }`}
              >
                {tab.label}
              </Text>
              {tab.key === 'pending' && badgeCount > 0 ? (
                <View className="bg-accent rounded-full w-5 h-5 items-center justify-center ml-1.5">
                  <Text className="text-[10px] font-bold text-white">{badgeCount}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e8572a" />
        }
      >
        {activeTab === 'pending' ? (
          pendingRequests.length === 0 ? (
            <EmptyState tab="pending" />
          ) : (
            pendingRequests.map(request => (
              <MatchCard
                key={request.id}
                variant="pending"
                activityTitle={request.activityTitle}
                categoryIcon={request.categoryIcon}
                category={request.categoryName}
                companionName={request.companionName}
                companionTrustScore={request.companionTrustScore}
                dateLabel={request.dateLabel}
                neighborhood={request.neighborhood}
                score={request.score}
                onAccept={() => handleAccept(request)}
                onDecline={() => handleDecline(request)}
              />
            ))
          )
        ) : null}

        {activeTab === 'confirmed' ? (
          confirmedMatches.length === 0 ? (
            <EmptyState tab="confirmed" />
          ) : (
            confirmedMatches.map(match => (
              <MatchCard
                key={match.id}
                variant="confirmed"
                activityTitle={match.activityTitle}
                categoryIcon={match.categoryIcon}
                category={match.categoryName}
                companionName={match.companionName}
                companionTrustScore={match.companionTrustScore}
                dateLabel={match.dateLabel}
                neighborhood={match.neighborhood}
                onChat={() =>
                  router.push({
                    pathname: '/chat/[matchId]',
                    params: {
                      matchId: match.id,
                      returnTo: '/(tabs)/inbox',
                    },
                  })
                }
                onView={() =>
                  router.push({
                    pathname: '/activity/[id]',
                    params: {
                      id: match.activityId,
                      returnTo: '/(tabs)/inbox',
                    },
                  })
                }
                onComplete={() => handleComplete(match.id)}
                onShareCheckin={() => handleShareCheckin(match)}
              />
            ))
          )
        ) : null}

        {activeTab === 'completed' ? (
          completedMatches.length === 0 ? (
            <EmptyState tab="completed" />
          ) : (
            completedMatches.map(match => (
              <MatchCard
                key={match.id}
                variant="completed"
                activityTitle={match.activityTitle}
                categoryIcon={match.categoryIcon}
                category={match.categoryName}
                companionName={match.companionName}
                companionTrustScore={match.companionTrustScore}
                dateLabel={match.dateLabel}
                neighborhood={match.neighborhood}
                onReview={() =>
                  router.push({
                    pathname: '/review/[matchId]',
                    params: {
                      matchId: match.id,
                      companionName: match.companionName,
                      companionId: match.companionId,
                      activityTitle: match.activityTitle,
                      categoryIcon: match.categoryIcon,
                      returnTo: '/(tabs)/inbox',
                    },
                  })
                }
                reviewed={!pendingReviewMatchIds.has(match.id)}
              />
            ))
          )
        ) : null}

        {activeTab === 'sent' ? (
          sentRequests.length === 0 ? (
            <EmptyState tab="sent" />
          ) : (
            sentRequests.map(request => (
              <MatchCard
                key={request.id}
                variant="sent"
                activityTitle={request.activityTitle}
                categoryIcon={request.categoryIcon}
                category={request.categoryName}
                companionName={request.hostName}
                companionTrustScore={request.hostTrustScore}
                dateLabel={request.dateLabel}
                neighborhood={request.neighborhood}
                requestStatus={request.status}
              />
            ))
          )
        ) : null}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
