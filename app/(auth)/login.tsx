import { useState } from 'react';
import { Text, View, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { FormInput } from '@/components/ui/form-input';
import { AsambeButton } from '@/components/ui/asambe-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert('Login failed', error.message);
        return;
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
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full bg-white border border-neutral-200"
          >
            <IconSymbol name="arrow.left" size={20} color="#1c1917" />
          </Pressable>
        </View>

        <View className="flex-1 px-6 justify-between">
          <View>
            <Text className="font-serif text-3xl font-bold text-neutral-900 mb-2">
              Welcome back
            </Text>
            <Text className="text-base text-neutral-500 mb-10">
              Log in to find your next activity companion.
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
              placeholder="Your password"
              secureTextEntry
            />

            <Pressable className="self-end mb-6">
              <Text className="text-sm font-medium text-primary-600">
                Forgot password?
              </Text>
            </Pressable>

            <AsambeButton
              title={loading ? 'Logging in...' : 'Log in'}
              onPress={handleLogin}
              fullWidth
              size="lg"
              disabled={loading}
            />
          </View>

          <View className="pb-6 items-center">
            <Text className="text-sm text-neutral-400">
              Don&apos;t have an account?{' '}
              <Link href="/(auth)/signup" asChild>
                <Text className="text-accent font-semibold">Sign up</Text>
              </Link>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
