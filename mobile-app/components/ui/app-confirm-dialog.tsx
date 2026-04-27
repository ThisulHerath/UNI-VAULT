import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, FontSizes, Radius, Spacing } from '../../constants/theme';

export type AppDialogAction = {
  label: string;
  onPress?: () => void;
  role?: 'default' | 'cancel' | 'destructive';
  loading?: boolean;
};

type AppConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  actions: AppDialogAction[];
  onClose: () => void;
};

export function AppConfirmDialog({ visible, title, message, actions, onClose }: AppConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {actions.map((action) => {
              const isDestructive = action.role === 'destructive';
              const isCancel = action.role === 'cancel';
              const buttonStyle = isDestructive ? styles.destructiveBtn : isCancel ? styles.cancelBtn : styles.defaultBtn;
              const textStyle = isDestructive ? styles.destructiveText : isCancel ? styles.cancelText : styles.defaultText;

              return (
                <TouchableOpacity
                  key={action.label}
                  style={[styles.actionBtn, buttonStyle, action.loading && { opacity: 0.7 }]}
                  onPress={action.onPress}
                  disabled={action.loading}
                >
                  {action.loading ? (
                    <ActivityIndicator size="small" color={Colors.text} />
                  ) : (
                    <Text style={textStyle}>{action.label}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000AA',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  message: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  defaultBtn: {
    backgroundColor: Colors.primary,
  },
  cancelBtn: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  destructiveBtn: {
    backgroundColor: Colors.error,
  },
  defaultText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.sm,
  },
  cancelText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: FontSizes.sm,
  },
  destructiveText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.sm,
  },
});
