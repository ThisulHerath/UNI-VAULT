import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const ACCENT       = Colors.primary;          // #3B82F6
const ACCENT_DARK  = '#1D4ED8';
const ICON_MUTED   = Colors.textMuted;        // #64748B
const FIELD_BG     = '#F1F5F9';
const BORDER_IDLE  = '#E2E8F0';
const BORDER_FOCUS = '#3B82F6';

// Bear palette — warm caramel study-bear
const BEAR_BODY    = '#C4854A';
const BEAR_DARK    = '#A0672F';
const BEAR_FACE    = '#D9A06B';
const BEAR_SNOUT   = '#EED1A8';
const BEAR_NOSE    = '#7C4A2E';
const BEAR_EYE_BG  = '#FFFFFF';
const BEAR_IRIS    = '#334155';
const BEAR_PUPIL   = '#020617';

// ─── FloatingLabelInput ───────────────────────────────────────────────────────
interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  icon: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

function FloatingLabelInput({
  label, value, onChangeText, icon,
  secureTextEntry, onFocus, onBlur, ...props
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  };

  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    if (!value) {
      Animated.timing(labelAnim, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }
  };

  useEffect(() => {
    Animated.timing(labelAnim, {
      toValue: value ? 1 : (focused ? 1 : 0),
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, focused]);

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [BORDER_IDLE, BORDER_FOCUS] });
  const labelTop    = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 5] });
  const labelSize   = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor  = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [Colors.textMuted, ACCENT] });

  return (
    <Animated.View style={[inputStyles.wrapper, { borderColor }]}>
      <View style={inputStyles.iconCol}>
        <Ionicons name={icon as any} size={16} color={focused ? ACCENT : ICON_MUTED} />
      </View>
      <View style={inputStyles.fieldArea}>
        <Animated.Text style={[inputStyles.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
          {label}
        </Animated.Text>
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="transparent"
          secureTextEntry={secureTextEntry && !showPass}
          {...props}
        />
      </View>
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowPass(s => !s)} style={inputStyles.eyeBtn}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color={ICON_MUTED} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FIELD_BG,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: 12,
    minHeight: 58,
  },
  iconCol: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  fieldArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingTop: 18,
  },
  floatLabel: {
    position: 'absolute',
    left: 0,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 0,
    height: 24,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
});

// ─── StudyBear ────────────────────────────────────────────────────────────────
// A caramel bear sitting behind an open notebook.
// • Eyes track typing focus (email → look left-ish, password → look down/hide)
// • Blinks naturally every ~3 s
// • Paws cover eyes when password field is active
// • Pencil in paw wiggles while typing email
// • Bear floats gently up/down at all times
interface StudyBearProps {
  activeField: 'email' | 'password' | null;
  emailLength: number;
}

function StudyBear({ activeField, emailLength }: StudyBearProps) {
  // ── Shared looping animations ──
  const bearFloat   = useRef(new Animated.Value(0)).current;
  const blinkAnim   = useRef(new Animated.Value(0)).current;
  const pencilWiggle = useRef(new Animated.Value(0)).current;

  // ── Reactive animations ──
  const gazeX            = useRef(new Animated.Value(0)).current;
  const gazeY            = useRef(new Animated.Value(0)).current;
  const coverAnim        = useRef(new Animated.Value(0)).current;   // paws cover eyes
  const pencilOpacity    = useRef(new Animated.Value(0)).current;   // pencil visibility
  const notebookLineAnim = useRef(new Animated.Value(0)).current;   // writing line grows

  const isPassword = activeField === 'password';
  const isEmail    = activeField === 'email';

  // Float loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bearFloat, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bearFloat, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Blink loop — slower, natural cadence
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3200),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(200),
        Animated.timing(blinkAnim, { toValue: 1, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 0, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Pencil wiggle — runs while email active
  useEffect(() => {
    if (!isEmail) {
      pencilWiggle.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pencilWiggle, { toValue: 1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(pencilWiggle, { toValue: -1, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(pencilWiggle, { toValue: 0, duration: 80, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isEmail]);

  // Gaze tracking — email field: look toward the input area slightly
  useEffect(() => {
    const targetX = isPassword ? 0 : (isEmail ? -0.3 : 0);
    const targetY = isEmail ? 0.4 : 0.1;
    Animated.spring(gazeX, { toValue: targetX, friction: 7, tension: 80, useNativeDriver: true }).start();
    Animated.spring(gazeY, { toValue: targetY, friction: 8, tension: 70, useNativeDriver: true }).start();
  }, [activeField]);

  // Email typing makes gaze subtly track character position
  useEffect(() => {
    if (!isEmail) return;
    const shift = ((emailLength % 14) / 7) - 1; // oscillate -1 to 1
    const target = Math.max(-0.6, Math.min(0.6, shift * 0.5 - 0.3));
    Animated.spring(gazeX, { toValue: target, friction: 10, tension: 100, useNativeDriver: true }).start();
  }, [emailLength, isEmail]);

  // Paw cover + pencil appear/disappear
  useEffect(() => {
    Animated.timing(coverAnim, {
      toValue: isPassword ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    Animated.timing(pencilOpacity, {
      toValue: isEmail ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(notebookLineAnim, {
      toValue: isEmail ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // width animation
    }).start();
  }, [isPassword, isEmail]);

  // Derived interpolations
  const floatY = bearFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

  // Blink: eyelid slides down (natural blink)
  const blinkEyelid = blinkAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });
  // Cover: eyes also close behind the paws so they look fully shut
  const coverEyelid = coverAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });

  // Iris movement — only when not covered
  const irisX = gazeX.interpolate({ inputRange: [-1, 1], outputRange: [-2.8, 2.8] });
  const irisY = gazeY.interpolate({ inputRange: [0, 1], outputRange: [0, 2.0] });

  const pencilRot = pencilWiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });
  const writingLineWidth = notebookLineAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 36] });

  return (
    <Animated.View style={[bearStyles.root, { transform: [{ translateY: floatY }] }]}>

      {/* ── Notebook ── */}
      <View style={bearStyles.notebook}>
        <View style={bearStyles.notebookSpiral}>
          {[0,1,2,3,4,5].map(i => (
            <View key={i} style={bearStyles.spiralDot} />
          ))}
        </View>
        <View style={bearStyles.notebookPage}>
          <View style={bearStyles.ruledLine} />
          <View style={bearStyles.ruledLine} />
          <View style={[bearStyles.ruledLine, { opacity: 0.5 }]} />
          <Animated.View style={[bearStyles.writingLine, { width: writingLineWidth }]} />
          <View style={bearStyles.starDeco} />
        </View>
        <Animated.View style={[bearStyles.pencil, { opacity: pencilOpacity, transform: [{ rotate: pencilRot }] }]}>
          <View style={bearStyles.pencilEraser} />
          <View style={bearStyles.pencilBody} />
          <View style={bearStyles.pencilTip} />
        </Animated.View>
      </View>

      {/* ── Bear: head + arms all in one positioned container ── */}
      {/* IMPORTANT: overflow must be visible so paws can render outside head bounds */}
      <View style={bearStyles.bearContainer}>

        {/* Ears — rendered first so head sits on top */}
        <View style={[bearStyles.ear, bearStyles.earLeft]}>
          <View style={bearStyles.earInner} />
        </View>
        <View style={[bearStyles.ear, bearStyles.earRight]}>
          <View style={bearStyles.earInner} />
        </View>

        {/* Head — z:1 */}
        <View style={bearStyles.head}>
          {/* Face */}
          <View style={bearStyles.face}>

            {/* Left eye — eyeball + eyelid overlay inside overflow:hidden circle */}
            <View style={bearStyles.eyeOuter}>
              <Animated.View style={[bearStyles.iris, { transform: [{ translateX: irisX }, { translateY: irisY }] }]}>
                <View style={bearStyles.pupil} />
                <View style={bearStyles.eyeShine} />
              </Animated.View>
              {/* Natural blink eyelid */}
              <Animated.View style={[bearStyles.eyelid, { transform: [{ translateY: blinkEyelid }] }]} />
              {/* Password-cover eyelid — closes eyes so they're shut behind paws */}
              <Animated.View style={[bearStyles.eyelid, { transform: [{ translateY: coverEyelid }] }]} />
            </View>

            {/* Right eye */}
            <View style={bearStyles.eyeOuter}>
              <Animated.View style={[bearStyles.iris, { transform: [{ translateX: irisX }, { translateY: irisY }] }]}>
                <View style={bearStyles.pupil} />
                <View style={bearStyles.eyeShine} />
              </Animated.View>
              <Animated.View style={[bearStyles.eyelid, { transform: [{ translateY: blinkEyelid }] }]} />
              <Animated.View style={[bearStyles.eyelid, { transform: [{ translateY: coverEyelid }] }]} />
            </View>

            {/* Snout */}
            <View style={bearStyles.snout}>
              <View style={bearStyles.nose} />
              <View style={bearStyles.mouth} />
            </View>

            <View style={[bearStyles.cheek, bearStyles.cheekLeft]} />
            <View style={[bearStyles.cheek, bearStyles.cheekRight]} />
          </View>
        </View>

        {/* Resting arms — always visible, sit below head (z:0) */}
        <View style={bearStyles.restingArmLeft} />
        <View style={bearStyles.restingArmRight} />

        {/* Lower body — helps connect the bear to the form below */}
        <View style={bearStyles.torso}>
          <View style={bearStyles.bellyPatch} />
        </View>

        {/* Side hands — visible but not used for the password blink animation */}
        <View style={bearStyles.sideHandLeft} />
        <View style={bearStyles.sideHandRight} />

      </View>

      {/* "Peek-a-boo" label */}
      <Animated.Text style={[bearStyles.peekLabel, { opacity: coverAnim }]}>
        I won't peek! 🙈
      </Animated.Text>
    </Animated.View>
  );
}

const bearStyles = StyleSheet.create({
  root: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },

  // ── Notebook ──────────────────────────────────────────────────────
  notebook: {
    width: 130,
    height: 68,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    marginBottom: -18,    // bear overlaps top of notebook
    zIndex: 0,
    flexDirection: 'row',
    overflow: 'visible',
    shadowColor: '#1E3A8A',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  notebookSpiral: {
    width: 14,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 8,
    backgroundColor: '#DBEAFE',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  spiralDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#93C5FD',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  notebookPage: {
    flex: 1,
    padding: 8,
    paddingTop: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  ruledLine: {
    height: 1,
    backgroundColor: '#BFDBFE',
    marginBottom: 6,
    borderRadius: 1,
  },
  writingLine: {
    height: 1.5,
    backgroundColor: '#3B82F6',
    borderRadius: 1,
    marginBottom: 4,
    opacity: 0.7,
  },
  starDeco: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 6,
    height: 6,
    backgroundColor: '#FCD34D',
    borderRadius: 1,
    opacity: 0.8,
  },

  // ── Pencil ────────────────────────────────────────────────────────
  pencil: {
    position: 'absolute',
    right: -12,
    top: 4,
    alignItems: 'center',
    zIndex: 10,
  },
  pencilEraser: {
    width: 7,
    height: 6,
    backgroundColor: '#FCA5A5',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  pencilBody: {
    width: 7,
    height: 36,
    backgroundColor: '#FCD34D',
  },
  pencilTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#D97706',
  },

  // ── Bear container ────────────────────────────────────────────────
  // overflow: visible is CRITICAL — lets cover arms paint outside bounds
  bearContainer: {
    width: 110,
    height: 126,
    position: 'relative',
    alignItems: 'center',
    // NO overflow: hidden here
  },

  // Ears sit behind head (rendered first in tree = lower z)
  ear: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BEAR_DARK,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  earLeft:  { left: 8 },
  earRight: { right: 8 },
  earInner: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: BEAR_FACE,
    opacity: 0.65,
  },

  // Head — z:2, sits in front of ears
  head: {
    position: 'absolute',
    top: 10,
    width: 100,
    height: 80,
    borderRadius: 40,
    backgroundColor: BEAR_BODY,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: BEAR_DARK,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    // NO overflow: hidden — eyelids must work inside their own clipped eye circles
  },

  face: {
    width: 76,
    height: 54,
    borderRadius: 26,
    backgroundColor: BEAR_FACE,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 8,
    position: 'relative',
  },

  // Eye circle — overflow:hidden clips the sliding eyelid
  eyeOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BEAR_EYE_BG,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',   // ← clips eyelid slide
  },
  iris: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: BEAR_IRIS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pupil: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: BEAR_PUPIL,
  },
  eyeShine: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff',
    top: 1.5,
    right: 1.2,
  },
  // Eyelid — a filled rect that slides DOWN from above to close the eye
  // Starts at translateY: -17 (fully above/hidden), slides to 0 to cover
  eyelid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,           // same as eyeOuter height
    backgroundColor: BEAR_BODY,  // same color as bear head for seamless look
    borderRadius: 9,
    // default translateY set via animation
  },

  snout: {
    position: 'absolute',
    bottom: 4,
    width: 30,
    height: 18,
    borderRadius: 10,
    backgroundColor: BEAR_SNOUT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  nose: {
    width: 9,
    height: 6,
    borderRadius: 4,
    backgroundColor: BEAR_NOSE,
  },
  mouth: {
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#B07040',
    opacity: 0.7,
  },
  cheek: {
    position: 'absolute',
    width: 13,
    height: 8,
    borderRadius: 6,
    backgroundColor: '#F87171',
    opacity: 0.22,
    bottom: 10,
  },
  cheekLeft:  { left: 5 },
  cheekRight: { right: 5 },

  // ── Resting arms (always visible, z:3, sit just below notebook edge) ──
  restingArmLeft: {
    position: 'absolute',
    bottom: -1,
    left: 5,
    width: 24,
    height: 16,
    borderRadius: 12,
    backgroundColor: BEAR_BODY,
    zIndex: 3,
    transform: [{ rotate: '-16deg' }],
  },
  restingArmRight: {
    position: 'absolute',
    bottom: -1,
    right: 5,
    width: 24,
    height: 16,
    borderRadius: 12,
    backgroundColor: BEAR_BODY,
    zIndex: 3,
    transform: [{ rotate: '16deg' }],
  },

  // ── Cover arms — z:20, render AFTER head in JSX tree ──────────────
  // At rest they are pushed down (translateY: 32) so they hide behind notebook.
  // When password focused they translate UP (translateY: -2) to cover the eyes.
  coverArm: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 20,           // must be above head (z:2) and everything else
  },
  coverArmLeft: {
    left: 4,
    bottom: 6,            // anchor point — translateY moves it up from here
  },
  coverArmRight: {
    right: 4,
    bottom: 6,
  },
  coverArmUpper: {
    width: 16,
    height: 19,
    borderRadius: 12,
    backgroundColor: BEAR_BODY,
    shadowColor: BEAR_DARK,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  coverPaw: {
    width: 37,
    height: 20,
    borderRadius: 12,
    backgroundColor: BEAR_DARK,
    marginTop: -2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  pawToe: {
    width: 4,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BEAR_BODY,
    opacity: 0.85,
  },
  pawToeSmall: {
    width: 3.5,
    height: 4.5,
    opacity: 0.78,
    transform: [{ translateY: 1 }],
  },
  pawToeMid: {
    width: 4.5,
    height: 5.5,
    transform: [{ translateY: -1 }],
  },
  pawToeLarge: {
    width: 5,
    height: 6.5,
    opacity: 0.9,
    transform: [{ translateY: -2 }],
  },

  // ── Torso ────────────────────────────────────────────────────────
  torso: {
    position: 'absolute',
    bottom: -6,
    width: 72,
    height: 42,
    borderRadius: 21,
    backgroundColor: BEAR_BODY,
    zIndex: 1,
    shadowColor: BEAR_DARK,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  sideHandLeft: {
    position: 'absolute',
    bottom: 4,
    left: 2,
    width: 16,
    height: 12,
    borderRadius: 8,
    backgroundColor: BEAR_BODY,
    zIndex: 2,
    transform: [{ rotate: '-12deg' }],
  },
  sideHandRight: {
    position: 'absolute',
    bottom: 4,
    right: 2,
    width: 16,
    height: 12,
    borderRadius: 8,
    backgroundColor: BEAR_BODY,
    zIndex: 2,
    transform: [{ rotate: '12deg' }],
  },
  bellyPatch: {
    position: 'absolute',
    alignSelf: 'center',
    top: 10,
    width: 28,
    height: 18,
    borderRadius: 10,
    backgroundColor: BEAR_FACE,
    opacity: 0.6,
  },

  // ── Peek label ────────────────────────────────────────────────────
  peekLabel: {
    marginTop: 6,
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

// ─── LoginScreen ──────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [activeField, setActiveField] = useState<'email' | 'password' | null>(null);

  // Card entrance
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(30)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardAnim, { toValue: 1, duration: 500, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardRise, { toValue: 0, duration: 500, delay: 150, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Email and password are required.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Background orbs */}
        <View style={styles.orbTopRight} />
        <View style={styles.orbBottomLeft} />

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/welcome')}>
          <View style={styles.backBtnIcon}>
            <Ionicons name="arrow-back" size={14} color={Colors.textMuted} />
          </View>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: cardAnim }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="library" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.logoText}>UniVault</Text>
          </View>
          <Text style={styles.tagline}>Your collaborative study space</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[
          styles.card,
          { opacity: cardAnim, transform: [{ translateY: cardRise }] }
        ]}>
          {/* Top accent bar */}
          <View style={styles.cardAccentBar} />

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue learning</Text>

          {/* ── Study Bear — sits between subtitle and divider ── */}
          <StudyBear activeField={activeField} emailLength={email.length} />

          <View style={styles.divider} />

          <FloatingLabelInput
            label="Email Address"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setActiveField('email')}
            onBlur={() => setActiveField(null)}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <FloatingLabelInput
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setActiveField('password')}
            onBlur={() => setActiveField(null)}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          {/* Sign-in button */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              onPressIn={() =>
                Animated.spring(btnScale, { toValue: 0.97, friction: 5, tension: 200, useNativeDriver: true }).start()
              }
              onPressOut={() =>
                Animated.spring(btnScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start()
              }
              activeOpacity={1}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.btnInner}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Register</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </Animated.View>

        <Animated.Text style={[styles.bottomNote, { opacity: cardAnim }]}>
          Secure · Private · Built for students
        </Animated.Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  orbTopRight: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -80,
    right: -80,
    backgroundColor: `${Colors.primary}20`,
  },
  orbBottomLeft: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 40,
    left: -80,
    backgroundColor: '#DBEAFE',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  backBtnIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 26, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: Colors.textMuted, letterSpacing: 0.2 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 2,
    marginTop: 4,
  },
  subtitle: { fontSize: 13, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 14 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: FontSizes.md, letterSpacing: 0.2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  footerText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  link: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  bottomNote: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: Spacing.xl,
  },
});