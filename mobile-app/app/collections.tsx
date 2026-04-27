import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { collectionService } from '../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';
import { SkeletonBlock } from '../components/ui/skeleton-block';

type CollectionPriority = 'low' | 'normal' | 'high';
type SortOption = 'name' | 'date' | 'priority';
type FilterOption = 'all' | 'low' | 'normal' | 'high';

const PRIORITY_OPTIONS: CollectionPriority[] = ['low', 'normal', 'high'];

const formatPriorityLabel = (priority?: string | null): string => {
  if (!priority) return 'Normal';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

/**
 * Maps priority levels to their corresponding UI colors.
 */
const getPriorityColor = (priority?: string | null) => {
  switch (priority) {
    case 'high': return '#EF4444'; // Red
    case 'low': return '#10B981'; // Green
    case 'normal':
    default: return Colors.primary;
  }
};

/**
 * Formats the target date relative to the current date (e.g., 'Due today').
 */
const formatTargetDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysLeft = Math.ceil((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);

  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  if (daysLeft > 1) return `${daysLeft} days left`;
  return `${Math.abs(daysLeft)} days overdue`;
};

function CollectionsSkeletonList() {
  return (
    <View style={{ padding: Spacing.md, paddingBottom: 120 }}>
      {[0, 1, 2, 3].map((idx) => (
        <View key={idx} style={styles.card}>
          <SkeletonBlock width={40} height={40} borderRadius={Radius.sm} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="68%" height={14} borderRadius={8} />
            <SkeletonBlock width="42%" height={11} borderRadius={8} style={{ marginTop: 8 }} />
          </View>
          <SkeletonBlock width={18} height={18} borderRadius={9} />
        </View>
      ))}
    </View>
  );
}

export default function CollectionsScreen() {
  const [collections, setCollections] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date');
  const [filterPriority, setFilterPriority] = useState<FilterOption>('all');

  // Create Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [newPriority, setNewPriority] = useState<CollectionPriority>('normal');
  const [newIsPrivate, setNewIsPrivate] = useState(true);
  const [newTags, setNewTags] = useState('');

  // Resets the collection creation form to its default state
  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewCourseCode('');
    setNewTargetDate('');
    setNewPriority('normal');
    setNewIsPrivate(true);
    setNewTags('');
  };

  /**
   * Fetches the user's personal collections from the backend.
   */
  const load = async () => {
    try {
      const res = await collectionService.getMyCollections();
      setCollections(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visibleCollections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return collections;

    return collections.filter((collection) => {
      if (filterPriority !== 'all' && collection?.priority !== filterPriority) {
        return false;
      }
      const fields = [
        collection?.name,
        collection?.description,
        collection?.courseCode,
        collection?.priority,
      ];

      return fields.some((field) => String(field || '').toLowerCase().includes(query));
    }).sort((a, b) => {
      if (sortOption === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortOption === 'priority') {
        const pValues = { high: 3, normal: 2, low: 1 };
        const pA = pValues[a.priority as keyof typeof pValues] || 2;
        const pB = pValues[b.priority as keyof typeof pValues] || 2;
        return pB - pA;
      }
      } else if (sortOption === 'date') {
        const dA = a.targetDate ? new Date(a.targetDate).getTime() : 0;
        const dB = b.targetDate ? new Date(b.targetDate).getTime() : 0;
        return dB - dA;
      }
      return 0;
    });
  }, [collections, searchQuery, filterPriority, sortOption]);

  const handleCreateCollection = async () => {
    if (!newName.trim()) {
      Toast.show({ type: 'error', text1: 'Name required', text2: 'Please enter a collection name.' });
      return;
    }
    try {
      setCreating(true);
      const tagsArray = newTags.split(',').map((t) => t.trim()).filter((t) => t);
      await collectionService.createCollection({
        name: newName.trim(),
        description: newDescription.trim(),
        courseCode: newCourseCode.trim(),
        targetDate: newTargetDate.trim() || null,
        priority: newPriority,
        isPrivate: newIsPrivate,
        tags: tagsArray,
      });
      Toast.show({ type: 'success', text1: 'Collection created' });
      setCreateModalVisible(false);
      resetForm();
      load();
    } catch (e: any) {
      console.error('Collection creation error:', e);
      Toast.show({ type: 'error', text1: 'Creation failed', text2: e.message });
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: any) => {
    // Calculate the total number of notes in the collection
    const noteCount = Array.isArray(item?.notes) ? item.notes.length : 0;
    // Calculate the total number of fulfillments in the collection
    const fulfillmentCount = Array.isArray(item?.requestFulfillments) ? item.requestFulfillments.length : 0;
    const totalCount = noteCount + fulfillmentCount;
    const targetLabel = formatTargetDate(item?.targetDate);
    const borderColor = getPriorityColor(item.priority);

    return (
      <TouchableOpacity activeOpacity={0.7} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: borderColor }]} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item._id } })}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.isPrivate ? "lock-closed" : "earth"} size={24} color={Colors.primary} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <View style={styles.badgeRow}>
            {item.courseCode ? <Text style={styles.badge}>{item.courseCode}</Text> : null}
            <Text style={[styles.badge, { color: borderColor, backgroundColor: `${borderColor}15` }]}>{formatPriorityLabel(item.priority)}</Text>
            {targetLabel ? <Text style={styles.badge}>{targetLabel}</Text> : null}
          </View>
          <Text style={styles.meta}>{totalCount} Saved Items {item.isPrivate ? '' : '• Public'}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>My Collections</Text>
        </View>
        <TouchableOpacity onPress={() => setCreateModalVisible(true)} style={styles.createBtn}>
          <Ionicons name="add" size={24} color={Colors.surface} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <CollectionsSkeletonList />
      ) : (
        <FlatList
          data={visibleCollections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}
          ListHeaderComponent={
            <>
              <TouchableOpacity
                style={styles.exploreBanner}
                accessibilityHint="Navigates to the public collections explorer"
                onPress={() => router.push('/public-collections')}
              >
                <View style={styles.exploreBannerContent}>
                  <Ionicons name="search" size={24} color={Colors.primary} />
                  <View style={{ marginLeft: Spacing.sm }}>
                    <Text style={styles.exploreTitle}>Explore Public Collections</Text>
                    <Text style={styles.exploreDesc}>Find study materials shared by others</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search your collections"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={Colors.textMuted}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => { setSearchQuery(''); /* dismiss keyboard if needed */ }}>
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
                <View style={styles.filterGroup}>
                  {(['all', 'high', 'normal', 'low'] as FilterOption[]).map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterBtn, filterPriority === f && styles.filterBtnActive]}
                      onPress={() => setFilterPriority(f)}
                    >
                      <Text style={[styles.filterBtnText, filterPriority === f && styles.filterBtnTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.sortGroup}>
                  <TouchableOpacity style={[styles.sortBtn, sortOption === 'date' && styles.sortBtnActive]} onPress={() => setSortOption('date')}>
                    <Ionicons name="calendar-outline" size={14} color={sortOption === 'date' ? Colors.surface : Colors.text} />
                    <Text style={[styles.sortBtnText, sortOption === 'date' && styles.sortBtnTextActive]}>Date</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sortBtn, sortOption === 'name' && styles.sortBtnActive]} onPress={() => setSortOption('name')}>
                    <Ionicons name="text-outline" size={14} color={sortOption === 'name' ? Colors.surface : Colors.text} />
                    <Text style={[styles.sortBtnText, sortOption === 'name' && styles.sortBtnTextActive]}>Name</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sortBtn, sortOption === 'priority' && styles.sortBtnActive]} onPress={() => setSortOption('priority')}>
                    <Ionicons name="flag-outline" size={14} color={sortOption === 'priority' ? Colors.surface : Colors.text} />
                    <Text style={[styles.sortBtnText, sortOption === 'priority' && styles.sortBtnTextActive]}>Priority</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          }
          ListEmptyComponent={<Text style={styles.empty}>No collections yet. Save notes to create one!</Text>}
        />
      )}

      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Collection</Text>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Database Systems Fall 2026"
              value={newName}
              onChangeText={setNewName}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="What is this collection about?"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              textAlignVertical="top"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Course Code (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. IT2030"
              value={newCourseCode}
              onChangeText={setNewCourseCode}
              autoCapitalize="characters"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Target Date (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={newTargetDate}
              onChangeText={setNewTargetDate}
              keyboardType="numbers-and-punctuation"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((priority) => {
                const selected = newPriority === priority;
                return (
                  <TouchableOpacity
                    key={priority}
                    style={[styles.priorityOption, selected && styles.priorityOptionActive]}
                    onPress={() => setNewPriority(priority)}
                  >
                    <Text style={[styles.priorityOptionText, selected && styles.priorityOptionTextActive]}>
                      {formatPriorityLabel(priority)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Private Collection</Text>
                <Text style={styles.switchDesc}>Only you can see this collection</Text>
              </View>
              <Switch
                value={newIsPrivate}
                onValueChange={setNewIsPrivate}
                trackColor={{ false: '#DBEAFE', true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>

            {!newIsPrivate && (
              <>
                <Text style={styles.inputLabel}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. computer science, databases"
                  value={newTags}
                  onChangeText={setNewTags}
                  placeholderTextColor={Colors.textMuted}
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => {
                  setCreateModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={handleCreateCollection}
                disabled={creating}
              >
                {creating ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.modalBtnSaveText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.primary },
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#BFDBFE' },
  iconContainer: { backgroundColor: '#DBEAFE', borderRadius: Radius.sm, padding: Spacing.sm, marginRight: Spacing.md },
  infoContainer: { flex: 1 },
  title: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  badge: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary, backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  meta: { fontSize: FontSizes.xs, color: Colors.primary },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 60, fontSize: FontSizes.md }, // darker muted text
  
  exploreBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#DBEAFE', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#BFDBFE', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  exploreBannerContent: { flexDirection: 'row', alignItems: 'center' },
  exploreTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.primary },
  exploreDesc: { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 2, opacity: 0.8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: Spacing.md, height: 46, marginBottom: Spacing.md },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, paddingVertical: 8 },
  
  filterGroup: { flexDirection: 'row', gap: 6, marginRight: Spacing.md, borderRightWidth: 1, borderRightColor: '#BFDBFE', paddingRight: Spacing.md },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#BFDBFE' },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.primary },
  filterBtnTextActive: { color: Colors.surface },

  sortGroup: { flexDirection: 'row', gap: 6 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  sortBtnActive: { backgroundColor: Colors.text, borderColor: Colors.text },
  sortBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.text },
  sortBtnTextActive: { color: Colors.surface },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.md },
  modalContent: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.lg },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: '#F5F9FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: Radius.md, padding: Spacing.sm, fontSize: FontSizes.md, color: Colors.text, marginBottom: Spacing.md },
  priorityRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  priorityOption: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#F5F9FF' },
  priorityOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  priorityOptionText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  priorityOptionTextActive: { color: Colors.surface },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, paddingVertical: 8 },
  switchLabel: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  switchDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md, backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
  modalBtnSave: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: Radius.md, backgroundColor: Colors.primary, minWidth: 80, alignItems: 'center' },
  modalBtnSaveText: { color: Colors.surface, fontWeight: '700', fontSize: FontSizes.sm },
});
