import { useEffect, useState } from 'react';
import { Text, View, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { FormInput } from '@/components/ui/form-input';
import { AsambeButton } from '@/components/ui/asambe-button';
import { CategoryChip } from '@/components/ui/category-chip';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { CATEGORIES, BIO_MAX_LENGTH } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { getCategories, uploadProfilePhoto, upsertPreference } from '@/services/profiles';
import type { Gender } from '@/types';

const GENDERS = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
] as const;

export default function SignUpScreen() {
  const { signUp, createProfile, refreshProfile, user, profile } = useAuth();
  const router = useRouter();

  const isCompletingProfile = !!user && !profile;
  const minimumStep = isCompletingProfile ? 2 : 1;
  const totalSteps = isCompletingProfile ? 2 : 3;

  const [step, setStep] = useState(minimumStep);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const handleBack = useBackNavigation({ fallbackHref: '/(auth)/landing' });

  useEffect(() => {
    if (step < minimumStep) {
      setStep(minimumStep);
    }
  }, [minimumStep, step]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const displayedStep = step - minimumStep + 1;
  const progressPercent = (displayedStep / totalSteps) * 100;

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

  const handlePickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleCreateAccount = async () => {
    if (selectedCategories.length === 0) {
      Alert.alert('Pick at least one', 'Select at least one activity category.');
      return;
    }

    setLoading(true);
    try {
      let accountUser = user;
      let accountSession = null;

      if (!isCompletingProfile) {
        const { user: createdUser, session: createdSession, error: signUpError } = await signUp(email, password);
        if (signUpError) {
          Alert.alert('Sign up failed', signUpError.message);
          setLoading(false);
          return;
        }

        accountUser = createdUser;
        accountSession = createdSession;
      }

      if (!isCompletingProfile && accountUser && !accountSession) {
        Alert.alert(
          'Verify your email',
          'We created your account, but you need to confirm your email before finishing your profile. After verifying, log in to continue.'
        );
        router.replace('/(auth)/login');
        return;
      }

      if (!accountUser?.email) {
        Alert.alert('Account error', 'Could not establish your account session. Please try again.');
        setLoading(false);
        return;
      }

      const { error: profileError } = await createProfile({
        userId: accountUser.id,
        email: accountUser.email,
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

      if (photoUri) {
        try {
          await uploadProfilePhoto(accountUser.id, photoUri);
          await refreshProfile();
        } catch (photoError) {
          Alert.alert(
            'Profile saved',
            photoError instanceof Error
              ? `${photoError.message} You can add your photo later from your profile.`
              : 'Your profile was created, but the photo could not be uploaded. You can add it later.'
          );
        }
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
                userId: accountUser.id,
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
          <NavIconButton
            icon="arrow.left"
            onPress={() => {
              if (step > minimumStep) {
                setStep(step - 1);
              } else if (!isCompletingProfile) {
                handleBack();
              }
            }}
            variant="bordered"
          />
          <View className="flex-1 items-center">
            <Text className="text-sm font-medium text-neutral-500">
              Step {displayedStep} of {totalSteps}
            </Text>
          </View>
          <View className="w-10" />
        </View>

        {/* Progress bar */}
        <View className="px-6 mb-6">
          <View className="h-1 bg-neutral-200 rounded-full overflow-hidden">
            <View
              className="h-full bg-accent rounded-full"
              style={{ width: `${progressPercent}%` }}
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
                We&apos;ll need a few details to get you started.
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
                {isCompletingProfile ? 'Complete your profile' : 'About you'}
              </Text>
              <Text className="text-base text-neutral-500 mb-8">
                {isCompletingProfile
                  ? 'Finish setting up your profile so people can discover your activities.'
                  : 'This is how companions will see you.'}
              </Text>

              <View className="items-center mb-6">
                <Pressable
                  onPress={() => void handlePickProfilePhoto()}
                  className="w-28 h-28 bg-neutral-100 rounded-full border-2 border-dashed border-neutral-300 items-center justify-center overflow-hidden"
                >
                  {photoUri ? (
                    <Image
                      source={photoUri}
                      contentFit="cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <>
                      <IconSymbol name="camera.fill" size={28} color="#a8a29e" />
                      <Text className="text-xs text-neutral-400 mt-1">Add photo</Text>
                    </>
                  )}
                </Pressable>
                <Text className="text-xs text-neutral-400 mt-2">
                  {photoUri ? 'Tap to change photo' : 'Optional, but recommended'}
                </Text>
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
                Pick the activities you&apos;d like to find companions for.
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
                By continuing, you agree to Asambe&apos;s{' '}
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
              title={
                isCompletingProfile
                  ? (loading ? 'Saving profile...' : 'Finish profile')
                  : (loading ? 'Creating account...' : 'Create account')
              }
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
