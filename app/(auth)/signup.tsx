import { useState } from 'react';
import { Text, View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { FormInput } from '@/components/ui/form-input';
import { AsambeButton } from '@/components/ui/asambe-button';
import { CategoryChip } from '@/components/ui/category-chip';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CATEGORIES, BIO_MAX_LENGTH } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { getCategories, upsertPreference } from '@/services/profiles';
import type { Gender } from '@/types';

const GENDERS = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
] as const;

export default function SignUpScreen() {
  const { signUp, createProfile, user } = useAuth();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleStep1Next = () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords don\'t match.');
      return;
    }
    setStep(2);
  };

  const handleStep2Next = () => {
    if (!name || !gender || !age || !city) {
      Alert.alert('Missing fields', 'Please fill in all required fields.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 16 || ageNum > 120) {
      Alert.alert('Invalid age', 'Please enter a valid age (16-120).');
      return;
    }
    setStep(3);
  };

  const handleCreateAccount = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Pick at least one', 'Select at least one activity category.');
      return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        Alert.alert('Sign up failed', signUpError.message);
        setLoading(false);
        return;
      }

      const { error: profileError } = await createProfile({
        name,
        gender: gender as Gender,
        age: parseInt(age, 10),
        city,
        country: 'South Africa',
        bio: bio || null,
        phone: null,
        profile_photo: null,
      });

      if (profileError) {
        Alert.alert('Profile error', profileError.message);
        setLoading(false);
        return;
      }

      // Save category preferences using DB UUIDs
      try {
        const dbCategories = await getCategories();
        const catMap: Record<string, string> = {};
        dbCategories.forEach(c => { catMap[c.name] = c.id; });

        await Promise.all(
          selectedCategories
            .map(name => catMap[name])
            .filter(Boolean)
            .map(categoryId =>
              upsertPreference({
                userId: user!.id,
                categoryId,
                skillLevel: 'beginner',
                preferredCompanionGender: 'any',
                preferredAgeRangeMin: 18,
                preferredAgeRangeMax: 65,
              })
            )
        );
      } catch {
        // Preferences are non-critical; proceed to app
      }

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <Pressable
            onPress={() => (step > 1 ? setStep(step - 1) : router.back())}
            className="w-10 h-10 items-center justify-center rounded-full bg-white border border-neutral-200"
          >
            <IconSymbol name="arrow.left" size={20} color="#1c1917" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-sm font-medium text-neutral-500">
              Step {step} of 3
            </Text>
          </View>
          <View className="w-10" />
        </View>

        {/* Progress bar */}
        <View className="px-6 mb-6">
          <View className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-accent rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </View>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
              <Text className="font-serif text-3xl font-bold text-neutral-900 mb-2">
                Create your account
              </Text>
              <Text className="text-base text-neutral-500 mb-8">
                We'll need a few details to get you started.
              </Text>

              <FormInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <FormInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                secureTextEntry
              />
              <FormInput
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Type it again"
                secureTextEntry
                error={confirmPassword.length > 0 && password !== confirmPassword ? 'Passwords don\'t match' : undefined}
              />
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
              <Text className="font-serif text-3xl font-bold text-neutral-900 mb-2">
                About you
              </Text>
              <Text className="text-base text-neutral-500 mb-8">
                This is how companions will see you.
              </Text>

              {/* Photo picker placeholder */}
              <View className="items-center mb-6">
                <Pressable className="w-28 h-28 bg-neutral-100 rounded-full border-2 border-dashed border-neutral-300 items-center justify-center">
                  <IconSymbol name="camera.fill" size={28} color="#a8a29e" />
                  <Text className="text-xs text-neutral-400 mt-1">Add photo</Text>
                </Pressable>
              </View>

              <FormInput
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your first name"
              />

              <Text className="text-sm font-medium text-neutral-700 mb-2">Gender</Text>
              <View className="flex-row flex-wrap mb-4 gap-2">
                {GENDERS.map(g => (
                  <Pressable
                    key={g.value}
                    onPress={() => setGender(g.value)}
                    className={`px-4 py-2.5 rounded-xl border ${
                      gender === g.value
                        ? 'bg-primary-100 border-primary-500'
                        : 'bg-white border-neutral-200'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        gender === g.value ? 'text-primary-800' : 'text-neutral-700'
                      }`}
                    >
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <FormInput
                label="Age"
                value={age}
                onChangeText={setAge}
                placeholder="25"
                keyboardType="number-pad"
              />
              <FormInput
                label="City"
                value={city}
                onChangeText={setCity}
                placeholder="Cape Town"
              />
              <FormInput
                label="Bio"
                value={bio}
                onChangeText={setBio}
                placeholder="A short intro — what brings you here?"
                multiline
                numberOfLines={3}
                charLimit={BIO_MAX_LENGTH}
                style={{ minHeight: 80, textAlignVertical: 'top' } as any}
              />
            </Animated.View>
          )}

          {step === 3 && (
            <Animated.View entering={FadeInRight.duration(300)} exiting={FadeOutLeft.duration(200)}>
              <Text className="font-serif text-3xl font-bold text-neutral-900 mb-2">
                What are you into?
              </Text>
              <Text className="text-base text-neutral-500 mb-8">
                Pick the activities you'd like to find companions for.
              </Text>

              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <CategoryChip
                    key={cat.name}
                    icon={cat.icon}
                    label={cat.name}
                    selected={selectedCategories.includes(cat.name)}
                    onPress={() => toggleCategory(cat.name)}
                  />
                ))}
              </View>

              <Text className="text-sm text-neutral-400 mt-4">
                You can change these anytime in your profile.
              </Text>
            </Animated.View>
          )}

          <View className="h-8" />
        </ScrollView>

        {/* Bottom CTA */}
        <View className="px-6 pb-4 pt-2 border-t border-neutral-100 bg-neutral-50">
          {step === 1 && (
            <>
              <AsambeButton
                title="Continue"
                onPress={handleStep1Next}
                fullWidth
                size="lg"
              />
              <Text className="text-center text-xs text-neutral-400 mt-4 leading-4">
                By continuing, you agree to Asambe's{' '}
                <Text className="text-neutral-600 underline">Terms of Service</Text>{' '}
                and{' '}
                <Text className="text-neutral-600 underline">Privacy Policy</Text>.
              </Text>
            </>
          )}
          {step === 2 && (
            <AsambeButton
              title="Continue"
              onPress={handleStep2Next}
              fullWidth
              size="lg"
            />
          )}
          {step === 3 && (
            <AsambeButton
              title={loading ? 'Creating account...' : 'Create account'}
              onPress={handleCreateAccount}
              fullWidth
              size="lg"
              disabled={loading}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
