import { useState, useEffect, useCallback } from 'react';
import {
  Text,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { NavIconButton } from '@/components/ui/nav-icon-button';
import { AsambeButton } from '@/components/ui/asambe-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getTrustedContacts,
  saveTrustedContact,
  removeTrustedContact,
  type TrustedContactView,
} from '@/services/safety';

const MAX_CONTACTS = 3;

export default function TrustedContactsScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { user } = useAuth();
  const handleBack = useBackNavigation({ fallbackHref: '/settings', returnTo });

  const [contacts, setContacts] = useState<TrustedContactView[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const loadContacts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getTrustedContacts(user.id);
      setContacts(data);
    } catch {
      Alert.alert('Error', 'Could not load your trusted contacts.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  const handleAdd = async () => {
    if (!user) return;

    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a name for this contact.');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      Alert.alert('Contact details required', 'Please enter a phone number or email address.');
      return;
    }

    setSaving(true);
    try {
      const contact = await saveTrustedContact(
        user.id,
        name.trim(),
        phone.trim() || undefined,
        email.trim() || undefined,
      );
      setContacts(prev => [...prev, contact]);
      setName('');
      setPhone('');
      setEmail('');
      setShowForm(false);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Could not save contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (contact: TrustedContactView) => {
    if (!user) return;

    Alert.alert(
      `Remove ${contact.name}?`,
      'They will no longer receive your activity check-ins.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTrustedContact(contact.id, user.id);
              setContacts(prev => prev.filter(c => c.id !== contact.id));
            } catch {
              Alert.alert('Error', 'Could not remove this contact. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50 items-center justify-center">
        <ActivityIndicator size="large" color="#e8572a" />
      </View>
    );
  }

  const canAddMore = contacts.length < MAX_CONTACTS;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="px-6 pt-2 pb-2">
          <NavIconButton icon="arrow.left" onPress={handleBack} variant="bordered" />
          <Text className="mt-4 font-serif text-3xl font-bold text-neutral-900">
            Trusted contacts
          </Text>
          <Text className="text-sm text-neutral-500 mt-1">
            Add up to {MAX_CONTACTS} people who can receive your activity check-ins via the SOS share button.
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {contacts.length === 0 && !showForm ? (
            <View className="items-center py-12">
              <View className="w-16 h-16 bg-neutral-100 rounded-full items-center justify-center mb-4">
                <IconSymbol name="person.2.fill" size={28} color="#a8a29e" />
              </View>
              <Text className="text-base font-semibold text-neutral-700 mb-1">No trusted contacts yet</Text>
              <Text className="text-sm text-neutral-400 text-center leading-5">
                Add people you trust so you can quickly share your activity plans with them in an emergency.
              </Text>
            </View>
          ) : null}

          {contacts.map(contact => (
            <View
              key={contact.id}
              className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3 flex-row items-center"
            >
              <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                <Text className="text-base font-bold text-primary-700">
                  {contact.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-neutral-900">{contact.name}</Text>
                {contact.phone ? (
                  <Text className="text-sm text-neutral-500">{contact.phone}</Text>
                ) : null}
                {contact.email ? (
                  <Text className="text-sm text-neutral-500">{contact.email}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => handleRemove(contact)}
                className="w-8 h-8 items-center justify-center"
                accessibilityLabel={`Remove ${contact.name}`}
              >
                <IconSymbol name="trash" size={18} color="#dc2626" />
              </Pressable>
            </View>
          ))}

          {showForm ? (
            <View className="bg-white rounded-2xl border border-neutral-100 p-4 mb-3">
              <Text className="text-sm font-semibold text-neutral-700 mb-3">New contact</Text>

              <View className="mb-3">
                <Text className="text-xs font-medium text-neutral-500 mb-1">Name *</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor="#a8a29e"
                  className="bg-neutral-50 rounded-xl px-4 py-3 text-base text-neutral-900 border border-neutral-200"
                />
              </View>

              <View className="mb-3">
                <Text className="text-xs font-medium text-neutral-500 mb-1">Phone number</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+27 83 000 0000"
                  placeholderTextColor="#a8a29e"
                  keyboardType="phone-pad"
                  className="bg-neutral-50 rounded-xl px-4 py-3 text-base text-neutral-900 border border-neutral-200"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-medium text-neutral-500 mb-1">Email address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor="#a8a29e"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="bg-neutral-50 rounded-xl px-4 py-3 text-base text-neutral-900 border border-neutral-200"
                />
              </View>

              <Text className="text-xs text-neutral-400 mb-4">
                At least a phone number or email is required.
              </Text>

              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setShowForm(false);
                    setName('');
                    setPhone('');
                    setEmail('');
                  }}
                  className="flex-1 border border-neutral-200 rounded-xl py-3 items-center bg-white"
                >
                  <Text className="text-base font-semibold text-neutral-600">Cancel</Text>
                </Pressable>
                <View className="flex-1">
                  <AsambeButton
                    title={saving ? 'Saving...' : 'Save contact'}
                    onPress={handleAdd}
                    disabled={saving}
                    fullWidth
                  />
                </View>
              </View>
            </View>
          ) : null}

          {canAddMore && !showForm ? (
            <Pressable
              onPress={() => setShowForm(true)}
              className="flex-row items-center justify-center border-2 border-dashed border-neutral-200 rounded-2xl py-4 mb-6"
            >
              <IconSymbol name="plus" size={18} color="#78716c" />
              <Text className="text-base font-medium text-neutral-600 ml-2">
                Add trusted contact ({contacts.length}/{MAX_CONTACTS})
              </Text>
            </Pressable>
          ) : null}

          {!canAddMore ? (
            <Text className="text-xs text-neutral-400 text-center mb-6">
              You have reached the maximum of {MAX_CONTACTS} trusted contacts.
            </Text>
          ) : null}

          <View className="h-8" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
