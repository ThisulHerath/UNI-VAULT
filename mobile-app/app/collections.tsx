import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Modal, TextInput, Switch, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { collectionService } from '../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';
import { SkeletonBlock } from '../components/ui/skeleton-block';

type CollectionPriority = 'low' | 'normal' | 'high';

const PRIORITY_OPTIONS: CollectionPriority[] = ['low', 'normal', 'high'];

const formatPriorityLabel = (priority?: string | null) => {
  if (!priority) return 'Normal';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

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

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewCourseCode('');
    setNewTargetDate('');
    setNewPriority('normal');
    setNewIsPrivate(true);
    setNewTags('');
  };

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
      Toast.show({ type: 'error', text1: 'Creation failed', text2: e.message });
    } finally {
      setCreating(false);
    }
  };

  const renderItem = ({ item }: any) => {
    const noteCount = Array.isArray(item?.notes) ? item.notes.length : 0;
    const fulfillmentCount = Array.isArray(item?.requestFulfillments) ? item.requestFulfillments.length : 0;
    const totalCount = noteCount + fulfillmentCount;

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item._id } })}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.isPrivate ? "lock-closed" : "earth"} size={24} color={Colors.primary} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
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
          data={collections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}
          ListHeaderComponent={
            <TouchableOpacity 
              style={styles.exploreBanner} 
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
  createBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#BFDBFE' },
  iconContainer: { backgroundColor: '#DBEAFE', borderRadius: Radius.sm, padding: Spacing.sm, marginRight: Spacing.md },
  infoContainer: { flex: 1 },
  title: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  meta: { fontSize: FontSizes.xs, color: Colors.primary },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
  
  exploreBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#DBEAFE', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: '#BFDBFE' },
  exploreBannerContent: { flexDirection: 'row', alignItems: 'center' },
  exploreTitle: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.primary },
  exploreDesc: { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 2, opacity: 0.8 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.md },
  modalContent: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.lg },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: '#F5F9FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: Radius.md, padding: Spacing.sm, fontSize: FontSizes.md, color: Colors.text, marginBottom: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, paddingVertical: 8 },
  switchLabel: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  switchDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md, backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
  modalBtnSave: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: Radius.md, backgroundColor: Colors.primary, minWidth: 80, alignItems: 'center' },
  modalBtnSaveText: { color: Colors.surface, fontWeight: '700', fontSize: FontSizes.sm },
});
