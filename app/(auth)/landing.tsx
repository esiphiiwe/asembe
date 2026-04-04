import { CATEGORIES } from '@/lib/constants';
import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const FLOATING_ICONS = CATEGORIES.slice(0, 8);

export default function LandingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-1 px-6 justify-between pb-8">
        {/* Floating category icons as decorative background */}
        <View className="absolute inset-0 overflow-hidden opacity-[0.06]">
          {FLOATING_ICONS.map((cat, i) => {
            const positions = [
              { top: '8%', left: '10%' },
              { top: '12%', right: '15%' },
              { top: '28%', left: '70%' },
              { top: '35%', left: '5%' },
              { top: '50%', right: '8%' },
              { top: '60%', left: '20%' },
              { top: '72%', right: '25%' },
              { top: '80%', left: '60%' },
            ];
            const pos = positions[i];
            return (
              <Text
                key={cat.name}
                className="absolute text-6xl"
                style={pos as any}
              >
                {cat.icon}
              </Text>
            );
          })}
        </View>

        {/* Top spacer */}
        <View className="flex-1" />

        {/* Central wordmark and tagline */}
        <Animated.View entering={FadeIn.duration(800)} className="items-center">
          <Text className="font-serif text-5xl font-bold text-neutral-900 tracking-tight">
            Asambe
          </Text>
          <View className="w-12 h-0.5 bg-accent mt-4 mb-5 rounded-full" />
          <Text className="text-lg text-neutral-500 text-center leading-7 px-4">
            Let's go — find someone{'\n'}to do things with
          </Text>
        </Animated.View>

        {/* Bottom spacer */}
        <View className="flex-1" />

        {/* CTAs */}
        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Link href="/(auth)/signup" asChild>
            <Pressable className="w-full bg-accent rounded-2xl py-4.5 mb-3 shadow-sm">
              <Text className="text-white text-center text-lg font-semibold">
                Get started
              </Text>
            </Pressable>
          </Link>

          <Link href="/(auth)/login" asChild>
            <Pressable className="w-full border border-neutral-300 rounded-2xl py-4.5 bg-white">
              <Text className="text-neutral-900 text-center text-lg font-semibold">
                Log in
              </Text>
            </Pressable>
          </Link>

          <Text className="text-center text-sm text-neutral-400 mt-6 leading-5">
            No friendship pressure.{'\n'}Just show up together.
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
