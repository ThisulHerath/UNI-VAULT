import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.description}>
        The screen you are looking for does not exist.
      </Text>
      <Link href="/welcome" asChild>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Go to Welcome</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0703',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: Spacing.md,
  },
  description: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FontSizes.md,
  },
});
