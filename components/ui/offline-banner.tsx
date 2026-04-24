import { Text, View } from 'react-native';
import { palette } from '@/constants/colors';
import { useNetwork } from '@/lib/network-context';
import { IconSymbol } from './icon-symbol';

export function OfflineBanner() {
  const { isConnected } = useNetwork();

  if (isConnected) return null;

  return (
    <View className="bg-neutral-800 px-4 py-2 flex-row items-center justify-center">
      <IconSymbol name="wifi.slash" size={14} color={palette.neutral[50]} />
      <Text className="text-xs font-medium text-neutral-100 ml-2">
        No internet connection
      </Text>
    </View>
  );
}
