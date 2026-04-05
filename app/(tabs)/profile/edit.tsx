import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AsambeButton } from '@/components/ui/asambe-button';
import { FormInput } from '@/components/ui/form-input';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { ScreenState } from '@/components/ui/screen-state';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useAuth } from '@/lib/auth-context';
import { BIO_MAX_LENGTH } from '@/lib/constants';
import { updateProfile, uploadProfilePhoto } from '@/services/profiles';
import type { Gender } from '@/types';

const MIN_AGE = 16;
const MAX_AGE = 120;

const GENDERS: { label: string; value: Gender }[] = [
  { label: 'Woman', value: 'woman' },
  { label: 'Man', value: 'man' },
  { label: 'Non-binary', value: 'non-binary' },
  { label: 'Prefer not to say', value: 'prefer-not-to-say' },
];

export default function EditProfileScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { user, profile, refreshProfile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const handleBack = useBackNavigation({
    fallbackHref: '/(tabs)/profile',
    returnTo,
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setName(profile.name);
    setPhone(profile.phone ?? '');
    setGender(profile.gender);
    setAge(String(profile.age));
    setCity(profile.city);
    setBio(profile.bio ?? '');
    setPhotoUri(profile.profile_photo ?? null);
  }, [profile]);

  const parsedAge = Number.parseInt(age, 10);
  const ageError = age.length > 0 && (Number.isNaN(parsedAge) || parsedAge < MIN_AGE || parsedAge > MAX_AGE)
    ? `Please enter a valid age (${MIN_AGE}-${MAX_AGE}).`
    : undefined;
  const bioError = bio.length > BIO_MAX_LENGTH
    ? `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`
    : undefined;

  const handlePickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to update your profile photo.');
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

  const handleSave = async () => {
    if (!user || !profile) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedCity = city.trim();
    const trimmedBio = bio.trim();

    if (!trimmedName || !gender || !age || !trimmedCity) {
      Alert.alert('Missing fields', 'Please fill in your name, gender, age, and city.');
      return;
    }

    if (ageError) {
      Alert.alert('Invalid age', ageError);
      return;
    }

    if (bioError) {
      Alert.alert('Bio too long', bioError);
      return;
    }

    setSaving(true);

    try {
      await updateProfile(user.id, {
        name: trimmedName,
        phone: trimmedPhone || null,
        gender,
        age: parsedAge,
        city: trimmedCity,
        bio: trimmedBio || null,
      });

      if (photoUri && photoUri !== profile.profile_photo) {
        await uploadProfilePhoto(user.id, photoUri);
      }

      await refreshProfile();
      handleBack();
    } catch (error) {
      Alert.alert(
        'Could not save profile',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  if (user && !profile) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon="👤"
          title="Complete your profile first"
          description="Finish creating your profile before you edit it."
          actionLabel="Finish profile"
          onAction={() => router.replace('/(auth)/signup')}
          fullScreen
        />
      </SafeAreaView>
    );
  }

  if (!user || !profile) {
    return (
      <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
        <ScreenState
          icon="👤"
          title="Profile unavailable"
          description="We could not load your profile to edit it right now."
          actionLabel="Back to profile"
          onAction={() => router.replace('/(tabs)/profile')}
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
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <NavIconButton
            icon="arrow.left"
            onPress={handleBack}
            variant="bordered"
          />
          <View className="flex-1 items-center">
            <Text className="font-serif text-2xl font-bold text-neutral-900">Edit Profile</Text>
          </View>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-8">
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
                <View className="items-center">
                  <IconSymbol name="camera.fill" size={28} color="#a8a29e" />
                  <Text className="text-xs text-neutral-400 mt-1">Add photo</Text>
                </View>
              )}
            </Pressable>
            <Text className="text-xs text-neutral-400 mt-3">
              {photoUri ? 'Tap to change photo' : 'Add a profile photo'}
            </Text>
          </View>

          <FormInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your first name"
          />

          <FormInput
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="+27 71 234 5678"
            keyboardType="phone-pad"
            autoCapitalize="none"
            hint="Optional"
          />

          <Text className="text-sm font-medium text-neutral-700 mb-2">Gender</Text>
          <View className="flex-row flex-wrap mb-4 gap-2">
            {GENDERS.map(option => (
              <Pressable
                key={option.value}
                onPress={() => setGender(option.value)}
                className={`px-4 py-2.5 rounded-xl border ${
                  gender === option.value
                    ? 'bg-primary-100 border-primary-500'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    gender === option.value ? 'text-primary-800' : 'text-neutral-700'
                  }`}
                >
                  {option.label}
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
            error={ageError}
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
            numberOfLines={4}
            charLimit={BIO_MAX_LENGTH}
            error={bioError}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />

          <View className="h-6" />

          <AsambeButton
            title="Save changes"
            onPress={handleSave}
            loading={saving}
            fullWidth
            size="lg"
          />

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
