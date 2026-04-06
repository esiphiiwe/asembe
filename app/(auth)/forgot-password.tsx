import { useState } from 'react';
import { Text, View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FormInput } from '@/components/ui/form-input';
import { AsambeButton } from '@/components/ui/asambe-button';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useAuth } from '@/lib/auth-context';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const handleBack = useBackNavigation({ fallbackHref: '/(auth)/login' });

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Email required', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        Alert.alert('Could not send reset link', error.message);
        return;
      }
      setSent(true);
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
        <View className="flex-row items-center px-6 pt-2 pb-4">
          <NavIconButton
            icon="arrow.left"
            onPress={handleBack}
            variant="bordered"
          />
        </View>

        <View className="flex-1 px-6 justify-between">
          {sent ? (
            <View className="flex-1 items-center justify-center px-4">
              <Text className="text-5xl mb-6">📬</Text>
              <Text className="font-serif text-2xl font-bold text-neutral-900 mb-3 text-center">
                Check your email
              </Text>
              <Text className="text-base text-neutral-500 text-center leading-6 mb-10">
                We sent a password reset link to{' '}
                <Text className="font-semibold text-neutral-700">{email}</Text>.
                {'\n\n'}Follow the link in the email to set a new password.
              </Text>
              <AsambeButton
                title="Back to login"
                onPress={() => router.replace('/(auth)/login')}
                fullWidth
                size="lg"
                variant="secondary"
              />
            </View>
          ) : (
            <View>
              <Text className="font-serif text-3xl font-bold text-neutral-900 mb-2">
                Reset password
              </Text>
              <Text className="text-base text-neutral-500 mb-10">
                Enter your account email and we'll send you a reset link.
              </Text>

              <FormInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <AsambeButton
                title={loading ? 'Sending...' : 'Send reset link'}
                onPress={handleSend}
                fullWidth
                size="lg"
                disabled={loading}
              />
            </View>
          )}

          <View className="pb-6" />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
