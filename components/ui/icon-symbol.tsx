// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Partial<Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'plus.circle.fill': 'add-circle',
  'tray.fill': 'inbox',
  'person.fill': 'person',
  'gearshape.fill': 'settings',
  'magnifyingglass': 'search',
  'xmark': 'close',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'star.fill': 'star',
  'exclamationmark.triangle': 'warning',
  'arrow.left': 'arrow-back',
  'square.and.arrow.up': 'share',
  'ellipsis': 'more-horiz',
  'paperplane': 'send',
  'camera.fill': 'camera-alt',
  'checkmark.circle.fill': 'check-circle',
  'bell.fill': 'notifications',
  'lock.fill': 'lock',
  'phone.fill': 'phone',
  'envelope.fill': 'email',
  'trash.fill': 'delete',
  'flag.fill': 'flag',
  'hand.raised.fill': 'pan-tool',
  'person.2.fill': 'group',
  'calendar': 'event',
  'mappin': 'place',
  'clock': 'schedule',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
