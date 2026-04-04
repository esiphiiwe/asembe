import { ActivityIndicator, Pressable, Text, type ViewStyle } from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface AsambeButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: 'bg-accent',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-primary-100',
    text: 'text-primary-800',
  },
  outline: {
    container: 'bg-transparent border border-neutral-300',
    text: 'text-neutral-900',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-neutral-700',
  },
  danger: {
    container: 'bg-red-600',
    text: 'text-white',
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'py-2 px-4 rounded-lg', text: 'text-sm' },
  md: { container: 'py-3.5 px-6 rounded-xl', text: 'text-base' },
  lg: { container: 'py-4 px-8 rounded-xl', text: 'text-lg' },
};

export function AsambeButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
}: AsambeButtonProps) {
  const v = variantClasses[variant];
  const s = sizeClasses[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`items-center justify-center ${v.container} ${s.container} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#1c1917'} />
      ) : (
        <Text className={`font-semibold text-center ${v.text} ${s.text}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
