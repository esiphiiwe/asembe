import { ComponentProps } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

type IconName = ComponentProps<typeof IconSymbol>['name'];
type NavIconButtonVariant = 'bordered' | 'overlay' | 'plain';

const VARIANT_CLASS_NAMES: Record<NavIconButtonVariant, string> = {
  bordered: 'bg-white border border-neutral-200',
  overlay: 'bg-white/90 shadow-sm',
  plain: '',
};

type NavIconButtonProps = Omit<PressableProps, 'style'> & {
  icon: IconName;
  iconColor?: string;
  iconSize?: number;
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: NavIconButtonVariant;
};

export function NavIconButton({
  icon,
  iconColor = '#1c1917',
  iconSize = 20,
  size = 40,
  style,
  variant = 'bordered',
  className,
  ...props
}: NavIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      className={`items-center justify-center rounded-full ${VARIANT_CLASS_NAMES[variant]} ${className ?? ''}`}
      style={[{ width: size, height: size }, style]}
      {...props}
    >
      <IconSymbol name={icon} size={iconSize} color={iconColor} />
    </Pressable>
  );
}
