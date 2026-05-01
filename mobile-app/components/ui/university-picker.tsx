import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Radius, Spacing } from '../../constants/theme';
import { UNIVERSITY_CATALOG } from '../../constants/university-catalog';

interface UniversityPickerProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  optional?: boolean;
}

const normalize = (value: string) => value.trim().toLowerCase();

export function UniversityPicker({ label, value, onChangeText, placeholder, optional }: UniversityPickerProps) {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (blurTimer.current) {
        clearTimeout(blurTimer.current);
      }
    };
  }, []);

  const filteredUniversities = useMemo(() => {
    const query = normalize(value);
    if (!query) {
      return UNIVERSITY_CATALOG;
    }

    return UNIVERSITY_CATALOG.filter((university) => normalize(university).includes(query));
  }, [value]);

  const handleFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
    }
    setFocused(true);
    setOpen(true);
  };

  const handleBlur = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
    }

    blurTimer.current = setTimeout(() => {
      setFocused(false);
      setOpen(false);
    }, 120);
  };

  const selectUniversity = (university: string) => {
    onChangeText(university);
    setOpen(false);
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label}
        {optional && <Text style={styles.optionalLabel}> (optional)</Text>}
      </Text>

      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        <View style={[styles.inputIconWrap, focused && styles.inputIconFocused]}>
          <Ionicons name="business-outline" size={16} color={focused ? Colors.primary : Colors.textMuted} />
        </View>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            setOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoCorrect={false}
          autoCapitalize="words"
        />
        <TouchableOpacity onPress={() => setOpen((prev) => !prev)} style={styles.chevronBtn} activeOpacity={0.7}>
          <Ionicons name={open ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {open && (
        <View style={styles.dropdownList}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.dropdownScroll} contentContainerStyle={styles.dropdownScrollContent}>
            <Text style={styles.dropdownSectionTitle}>Suggested universities</Text>
            {filteredUniversities.slice(0, 12).map((university) => (
              <TouchableOpacity key={university} style={styles.dropdownItem} onPress={() => selectUniversity(university)} activeOpacity={0.8}>
                <Text style={styles.dropdownItemTitle}>{university}</Text>
              </TouchableOpacity>
            ))}
            {filteredUniversities.length === 0 && (
              <Text style={styles.noMatches}>No matches found. You can keep typing your university name.</Text>
            )}
            <Text style={styles.helperText}>If your university is not listed, type it manually.</Text>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  optionalLabel: { color: Colors.textMuted },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.input, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md },
  inputRowFocused: { borderColor: `${Colors.primary}80`, backgroundColor: Colors.surface },
  inputIconWrap: { width: 42, justifyContent: 'center', alignItems: 'center' },
  inputIconFocused: {},
  input: { flex: 1, paddingVertical: 14, paddingRight: 12, fontSize: FontSizes.md, color: Colors.text },
  chevronBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  dropdownList: { marginTop: Spacing.xs, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden' },
  dropdownScroll: { maxHeight: 320 },
  dropdownScrollContent: { padding: Spacing.sm },
  dropdownSectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '700', marginBottom: 6 },
  dropdownItem: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 8, marginBottom: 6, backgroundColor: Colors.surfaceAlt },
  dropdownItemTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  noMatches: { color: Colors.textMuted, fontSize: FontSizes.sm, paddingVertical: 6 },
  helperText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
});
