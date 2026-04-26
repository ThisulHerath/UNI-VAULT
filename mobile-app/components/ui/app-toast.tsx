import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast, { BaseToastProps, ToastConfig } from 'react-native-toast-message';

import { Colors, FontSizes, Radius, Spacing } from '../../constants/theme';

type ToastVariant = 'success' | 'error' | 'info';

const TOAST_VARIANTS: Record<ToastVariant, { icon: keyof typeof Ionicons.glyphMap; accent: string; title: string }> = {
  success: {
    icon: 'checkmark-circle',
    accent: Colors.success,
    title: 'Success',
  },
  error: {
    icon: 'close-circle',
    accent: Colors.error,
    title: 'Action failed',
  },
  info: {
    icon: 'information-circle',
    accent: Colors.warning,
    title: 'Heads up',
  },
};

type AppToastProps = BaseToastProps & {
  variant: ToastVariant;
};

function AppToastCard({ variant, text1, text2, onPress }: AppToastProps) {
  const variantConfig = TOAST_VARIANTS[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.toastCard, { borderColor: variantConfig.accent }]}
      onPress={() => {
        onPress?.();
        Toast.hide();
      }}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${variantConfig.accent}26` }]}>
        <Ionicons name={variantConfig.icon} size={20} color={variantConfig.accent} />
      </View>

      <View style={styles.textWrap}>
        <Text style={styles.titleText}>{text1 || variantConfig.title}</Text>
        {!!text2 && <Text style={styles.bodyText}>{text2}</Text>}
      </View>

      <Ionicons name="close" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export const appToastConfig: ToastConfig = {
  success: (props) => <AppToastCard {...props} variant="success" />,
  error: (props) => <AppToastCard {...props} variant="error" />,
  info: (props) => <AppToastCard {...props} variant="info" />,
};

const styles = StyleSheet.create({
  toastCard: {
    width: '92%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: Colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    gap: Spacing.sm,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  titleText: {
    color: Colors.text,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  bodyText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
});
