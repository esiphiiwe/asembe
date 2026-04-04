import { Pressable, Text } from 'react-native';

interface CategoryChipProps {
  icon: string;
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function CategoryChip({ icon, label, selected = false, onPress }: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 py-2.5 rounded-full mr-2 border ${
        selected
          ? 'bg-primary-100 border-primary-500'
          : 'bg-white border-neutral-200'
      }`}
    >
      <Text className="text-base mr-1.5">{icon}</Text>
      <Text
        className={`text-sm font-medium capitalize ${
          selected ? 'text-primary-800' : 'text-neutral-700'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
