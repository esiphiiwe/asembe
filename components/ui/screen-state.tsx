import { Text, View } from 'react-native';
import { AsambeButton } from './asambe-button';

interface ScreenStateProps {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
}

export function ScreenState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  fullScreen = false,
}: ScreenStateProps) {
  return (
    <View className={`items-center justify-center px-8 py-12 ${fullScreen ? 'flex-1' : ''}`}>
      <Text className="text-5xl mb-4">{icon}</Text>
      <Text className="text-xl font-semibold text-neutral-900 text-center mb-2">{title}</Text>
      <Text className="text-sm text-neutral-500 text-center leading-6 mb-6">{description}</Text>
      {actionLabel && onAction ? (
        <AsambeButton
          title={actionLabel}
          onPress={onAction}
          variant="outline"
          size="md"
        />
      ) : null}
    </View>
  );
}
