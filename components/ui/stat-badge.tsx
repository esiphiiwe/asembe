import { Text, View } from 'react-native';
import { IconSymbol } from './icon-symbol';

interface StatBadgeProps {
  label: string;
  value: string | number;
  icon?: 'star.fill' | 'calendar' | 'person.2.fill' | 'shield.checkmark';
}

export function StatBadge({ label, value, icon }: StatBadgeProps) {
  return (
    <View className="items-center px-4 py-2">
      <View className="flex-row items-center">
        {icon && (
          <IconSymbol
            name={icon}
            size={16}
            color={icon === 'star.fill' ? '#d17a47' : '#78716c'}
          />
        )}
        <Text className={`text-xl font-bold text-neutral-900 ${icon ? 'ml-1' : ''}`}>
          {value}
        </Text>
      </View>
      <Text className="text-xs text-neutral-500 mt-0.5">{label}</Text>
    </View>
  );
}
