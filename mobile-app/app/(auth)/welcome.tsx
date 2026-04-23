import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

// Avurudu Theme Colors
const AvuruduColors = {
  crimsonRed: '#C0392B',
  goldenYellow: '#F39C12',
  auspiciousGreen: '#27AE60',
  deepOrange: '#E67E22',
};

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      {/* Top half with Illustration */}
      <View style={styles.imageContainer}>
        <View style={styles.imageBackgroundWrapper}>
          <Image 
            source={require('../../assets/images/avurudu_welcome.png')} 
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Bottom half with Content */}
      <View style={styles.contentContainer}>
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>🎉 Happy Sinhala and Tamil New Year!</Text>
        </View>
        
        <Text style={styles.title}>Welcome to UniVault</Text>
        
        <Text style={styles.subtitle}>
          Step into a vibrant collaborative study space. Like the bright Avurudu Sun, Erabadu flowers, and the rhythm of the Rabana, let's bring new energy to your academic journey.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  imageContainer: {
    height: height * 0.55,
    width: '100%',
    position: 'relative',
  },
  imageBackgroundWrapper: {
    flex: 1,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    overflow: 'hidden',
    backgroundColor: AvuruduColors.crimsonRed,
  },
  image: {
    width: '100%',
    height: '100%',
    // Adding slight opacity to blend if needed, but 'cover' handles it well
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    backgroundColor: `${AvuruduColors.goldenYellow}20`, // 20% opacity
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: `${AvuruduColors.goldenYellow}50`,
  },
  badgeText: {
    color: AvuruduColors.goldenYellow,
    fontWeight: '700',
    fontSize: FontSizes.sm,
  },
  title: {
    fontSize: FontSizes.xxxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xxl,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.md,
  },
  button: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: AvuruduColors.crimsonRed,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  primaryButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.lg,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.lg,
  },
});
