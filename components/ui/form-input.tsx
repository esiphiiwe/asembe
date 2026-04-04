import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface FormInputProps extends Omit<TextInputProps, 'className'> {
  label: string;
  error?: string;
  hint?: string;
  charLimit?: number;
}

export function FormInput({
  label,
  error,
  hint,
  charLimit,
  value,
  onChangeText,
  secureTextEntry,
  ...rest
}: FormInputProps) {
  const [focused, setFocused] = useState(false);

  const borderClass = error
    ? 'border-red-500'
    : focused
      ? 'border-primary-500'
      : 'border-neutral-200';

  return (
    <View className="mb-4">
      <Text className="text-sm font-medium text-neutral-700 mb-1.5">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor="#a8a29e"
        className={`bg-white border ${borderClass} rounded-xl px-4 py-3.5 text-base text-neutral-900`}
        {...rest}
      />
      <View className="flex-row justify-between mt-1">
        {error ? (
          <Text className="text-sm text-red-500 flex-1">{error}</Text>
        ) : hint ? (
          <Text className="text-xs text-neutral-400 flex-1">{hint}</Text>
        ) : (
          <View className="flex-1" />
        )}
        {charLimit != null && (
          <Text className={`text-xs ${(value?.length ?? 0) > charLimit ? 'text-red-500' : 'text-neutral-400'}`}>
            {value?.length ?? 0}/{charLimit}
          </Text>
        )}
      </View>
    </View>
  );
}
