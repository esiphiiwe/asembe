import { useState, useEffect, useCallback } from 'react';
import { Text, View, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { MatchCard } from '@/components/ui/match-card';
import { useAuth } from '@/lib/auth-context';
import { getUserMatches, getPendingRequestsForUser, respondToRequest } from '@/services/matches';
import { getCompletedMatchesPendingReview } from '@/services/reviews';
import { MOCK_MATCHES, MOCK_MATCH_REQUESTS, MOCK_ACTIVITIES } from '@/lib/mock-data';
import { formatActivityDate } from '@/lib/mock-data';

type Tab = 'pending' | 'confirmed' | 'completed';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
];

function EmptyState({ tab }: { tab: Tab }) {
  const config = {
    pending: {
      icon: '📬',
      title: 'No pending requests',
      subtitle: 'When someone requests to join your activity, they\'ll appear here.',
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
  };
  const c = config[tab];
  return (
    <View className="items-center justify-center py-20 px-8">
      <Text className="text-5xl mb-4">{c.icon}</Text>
      <Text className="text-lg font-semibold text-neutral-800 mb-2 text-center">{c.title}</Text>
      <Text className="text-sm text-neutral-400 text-center leading-5">{c.subtitle}</Text>
    </View>
  );
}

export default function MatchInboxScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [pendingReviewMatchIds, setPendingReviewMatchIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [reqData, matchData, pendingReviewData] = await Promise.all([
        getPendingRequestsForUser(user.id),
        getUserMatches(user.id),
        getCompletedMatchesPendingReview(user.id),
      ]);
      setPendingRequests(reqData);
      setMatches(matchData);
      setPendingReviewMatchIds(new Set(pendingReviewData.map((m: any) => m.id)));
      setUseMock(false);
    } catch {
      setUseMock(true);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAccept = async (req: any) => {
    try {
      await respondToRequest(
        req.id,
        'accepted',
        req.activity_id,
        req.requester_id,
        user!.id
      );
      await loadData();
    } catch {}
  };

  const handleDecline = async (req: any) => {
    try {
      await respondToRequest(req.id, 'declined');
      await loadData();
    } catch {}
  };

  const mockPending = MOCK_MATCH_REQUESTS.filter(r => r.status === 'pending');
  const mockConfirmed = MOCK_MATCHES.filter(m => m.status === 'confirmed');
  const mockCompleted = MOCK_MATCHES.filter(m => m.status === 'completed');

  const displayPending = useMock ? mockPending : pendingRequests;
  const confirmedMatches = useMock
    ? mockConfirmed
    : matches.filter(m => m.status === 'confirmed');
  const completedMatches = useMock
    ? mockCompleted
    : matches.filter(m => m.status === 'completed');

  const badgeCount = displayPending.length;

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
              {tab.key === 'pending' && badgeCount > 0 && (
                <View className="bg-accent rounded-full w-5 h-5 items-center justify-center ml-1.5">
                  <Text className="text-[10px] font-bold text-white">{badgeCount}</Text>
                </View>
              )}
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
        {activeTab === 'pending' && (
          <>
            {displayPending.length === 0 ? (
              <EmptyState tab="pending" />
            ) : useMock ? (
              mockPending.map(req => {
                const activity = MOCK_ACTIVITIES.find(a => a.id === req.activityId);
                return (
                  <MatchCard
                    key={req.id}
                    variant="pending"
                    activityTitle={activity?.title ?? 'Activity'}
                    categoryIcon={activity?.categoryIcon ?? '✨'}
                    category={activity?.categoryName ?? 'other'}
                    companionName={req.requesterName}
                    companionTrustScore={req.requesterTrustScore}
                    dateLabel={activity?.dateTime ? 'Upcoming' : 'Recurring'}
                    neighborhood={activity?.neighborhood ?? ''}
                    onAccept={() => {}}
                    onDecline={() => {}}
                  />
                );
              })
            ) : (
              pendingRequests.map((req: any) => (
                <MatchCard
                  key={req.id}
                  variant="pending"
                  activityTitle={req.activities?.title ?? 'Activity'}
                  categoryIcon={req.activities?.categories?.icon ?? '✨'}
                  category={req.activities?.categories?.name ?? 'other'}
                  companionName={req.profiles?.name ?? 'Unknown'}
                  companionTrustScore={req.profiles?.trust_score ?? 0}
                  dateLabel={req.activities?.date_time ? 'Upcoming' : 'Recurring'}
                  neighborhood={req.activities?.neighborhood ?? ''}
                  onAccept={() => handleAccept(req)}
                  onDecline={() => handleDecline(req)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'confirmed' && (
          <>
            {confirmedMatches.length === 0 ? (
              <EmptyState tab="confirmed" />
            ) : (
              confirmedMatches.map((match: any) => (
                <MatchCard
                  key={match.id}
                  variant="confirmed"
                  activityTitle={useMock ? match.activityTitle : match.activity_title}
                  categoryIcon={useMock ? match.categoryIcon : match.category_icon}
                  category={useMock ? match.categoryName : match.category_name}
                  companionName={useMock ? match.companionName : match.companion_name}
                  companionTrustScore={useMock ? match.companionTrustScore : match.companion_trust_score}
                  dateLabel={useMock ? match.dateLabel : (match.date_time ? formatActivityDate(new Date(match.date_time)) : 'Recurring')}
                  neighborhood={match.neighborhood}
                  onChat={() => router.push(`/chat/${match.id}`)}
                  onView={() => router.push(`/activity/${useMock ? match.activityId : match.activity_id}`)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completedMatches.length === 0 ? (
              <EmptyState tab="completed" />
            ) : (
              completedMatches.map((match: any) => (
                <MatchCard
                  key={match.id}
                  variant="completed"
                  activityTitle={useMock ? match.activityTitle : match.activity_title}
                  categoryIcon={useMock ? match.categoryIcon : match.category_icon}
                  category={useMock ? match.categoryName : match.category_name}
                  companionName={useMock ? match.companionName : match.companion_name}
                  companionTrustScore={useMock ? match.companionTrustScore : match.companion_trust_score}
                  dateLabel={useMock ? match.dateLabel : (match.date_time ? formatActivityDate(new Date(match.date_time)) : 'Recurring')}
                  neighborhood={match.neighborhood}
                  onReview={() =>
                    router.push({
                      pathname: '/review/[matchId]',
                      params: {
                        matchId: match.id,
                        companionName: useMock ? match.companionName : match.companion_name,
                        companionId: useMock ? match.user2Id : (match.user1?.id === user?.id ? match.user2?.id : match.user1?.id),
                        activityTitle: useMock ? match.activityTitle : match.activity_title,
                        categoryIcon: useMock ? match.categoryIcon : match.category_icon,
                      },
                    })
                  }
                  reviewed={useMock ? false : !pendingReviewMatchIds.has(match.id)}
                />
              ))
            )}
          </>
        )}

        <View className="h-20" />
      </ScrollView>
    </SafeAreaView>
  );
}
