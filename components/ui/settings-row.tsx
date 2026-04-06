import type { ComponentProps, ReactNode } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { IconSymbol } from './icon-symbol';

type IconName = ComponentProps<typeof IconSymbol>['name'];

interface SettingsRowBaseProps {
  icon?: IconName;
  label: string;
  iconColor?: string;
  textColor?: string;
  /** Optional element rendered in place of (or alongside) the default right-side accessory. */
  rightAccessory?: ReactNode;
}

interface SettingsRowNavProps extends SettingsRowBaseProps {
  type?: 'nav';
  value?: string;
  onPress?: () => void;
}

interface SettingsRowToggleProps extends SettingsRowBaseProps {
  type: 'toggle';
  toggled: boolean;
  onToggle: (value: boolean) => void;
}

type SettingsRowProps = SettingsRowNavProps | SettingsRowToggleProps;

export function SettingsRow(props: SettingsRowProps) {
  const { icon, label, iconColor, textColor, rightAccessory } = props;

  const content = (
    <View className="flex-row items-center py-3.5 px-4">
      {icon && (
        <View className="w-8 h-8 bg-neutral-100 rounded-lg items-center justify-center mr-3">
          <IconSymbol name={icon} size={18} color={iconColor ?? '#44403c'} />
        </View>
      )}
      <Text className={`flex-1 text-base ${textColor ?? 'text-neutral-800'}`}>{label}</Text>
      {rightAccessory ?? (
        props.type === 'toggle' ? (
          <Switch
            value={props.toggled}
            onValueChange={props.onToggle}
            trackColor={{ false: '#e7e5e4', true: '#e8572a' }}
            thumbColor="#fff"
          />
        ) : (
          <View className="flex-row items-center">
            {props.value && (
              <Text className="text-sm text-neutral-400 mr-2">{props.value}</Text>
            )}
            {props.onPress ? (
              <IconSymbol name="chevron.right" size={16} color="#a8a29e" />
            ) : null}
          </View>
        )
      )}
    </View>
  );

  if (props.type === 'toggle') {
    return content;
  }

  return props.onPress ? <Pressable onPress={props.onPress}>{content}</Pressable> : content;
}
