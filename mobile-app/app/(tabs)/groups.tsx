import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  TextInput,
  ScrollView,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { groupService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function GroupsScreen() {
  const [publicGroups, setPublicGroups] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [code, setCode] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);

  const load = async () => {
    try {
      const [publicRes, myRes] = await Promise.all([groupService.getGroups(), groupService.getMyGroups()]);

      const myGroupList = Array.isArray(myRes.data) ? myRes.data : [];
      const myGroupIds = new Set(myGroupList.map((group: any) => String(group._id)));

      const publicGroupList = (Array.isArray(publicRes.data) ? publicRes.data : []).filter((group: any) => {
        return group?.privacy === 'public' && !myGroupIds.has(String(group._id));
      });

      const sortByNewest = (a: any, b: any) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      };

      setMyGroups([...myGroupList].sort(sortByNewest));
      setPublicGroups([...publicGroupList].sort(sortByNewest));
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const joinByCode = async () => {
    if (!code.trim()) {
      Toast.show({ type: 'error', text1: 'Enter invitation code' });
      return;
    }

    setJoiningByCode(true);
    try {
      const res = await groupService.joinGroupByCode(code.trim().toUpperCase());
      Toast.show({ type: 'success', text1: 'Joined', text2: res.message || 'Joined private group.' });
      setCode('');
      setJoinModalVisible(false);
      if (res.data?.groupId) {
        router.push(`/group/${res.data.groupId}`);
      } else {
        load();
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed', text2: e.message });
    } finally {
      setJoiningByCode(false);
    }
  };

  const matchesSearch = (group: any) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    return [group?.name, group?.description, group?.privacy, group?.joinMode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  };

  const visibleMyGroups = myGroups.filter(matchesSearch);
  const visiblePublicGroups = publicGroups.filter(matchesSearch);

  const renderItem = (item: any) => (
    <TouchableOpacity key={item._id} style={styles.card} onPress={() => router.push(`/group/${item._id}`)}>
      {item.coverImage ? (
        <Image source={{ uri: item.coverImage }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="people" size={28} color={Colors.primary} />
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.privacyBadge, { backgroundColor: item.privacy === 'private' ? Colors.error + '25' : Colors.success + '25' }]}>
            <Ionicons name={item.privacy === 'private' ? 'lock-closed' : 'earth'} size={10} color={item.privacy === 'private' ? Colors.error : Colors.success} />
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{item.description || 'No description'}</Text>
        {item.privacy === 'public' && (
          <Text style={styles.mode}>{item.joinMode === 'request' ? 'Request-based join' : 'Open join'}</Text>
        )}
        <Text style={styles.members}><Ionicons name="people-outline" size={11} /> {item.memberCount || 0} members</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, groups: any[], emptyText: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{groups.length}</Text>
      </View>
      {groups.length > 0 ? groups.map(renderItem) : <Text style={styles.empty}>{emptyText}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>👥 Groups</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setJoinModalVisible(true)}>
            <Ionicons name="key-outline" size={18} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/group/create')}>
            <Ionicons name="add" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search groups"
          placeholderTextColor={Colors.textMuted}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: Spacing.md, paddingTop: 4, paddingBottom: Spacing.lg }}
        >
          <View style={styles.joinByCodeCard}>
            <View style={styles.joinByCodeTextWrap}>
              <Text style={styles.joinByCodeTitle}>Join a private group</Text>
              <Text style={styles.joinByCodeSubtitle}>Enter an invitation code to join directly.</Text>
            </View>
            <TouchableOpacity style={styles.joinPrivateBtn} onPress={() => setJoinModalVisible(true)}>
              <Text style={styles.joinPrivateBtnText}>Join Private</Text>
            </TouchableOpacity>
          </View>

          {renderSection('My Groups', visibleMyGroups, 'You are not in any groups yet.')}
          {renderSection('Public Groups', visiblePublicGroups, 'No public groups match your search.')}
        </ScrollView>
      )}

      <Modal visible={joinModalVisible} transparent animationType="fade" onRequestClose={() => setJoinModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Private Group</Text>
            <Text style={styles.modalBody}>Enter the invitation code shared by the group owner.</Text>
            <TextInput
              style={styles.modalInput}
              value={code}
              onChangeText={setCode}
              placeholder="Invitation code"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setJoinModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalPrimaryButton]} onPress={joinByCode} disabled={joiningByCode}>
                {joiningByCode ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.modalPrimaryText}>Join</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text },
  fab: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  searchInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
  },
  joinByCodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  joinByCodeTextWrap: { flex: 1, paddingRight: Spacing.sm },
  joinByCodeTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  joinByCodeSubtitle: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  joinPrivateBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  joinPrivateBtnText: { color: Colors.text, fontWeight: '800' },
  section: { marginTop: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  sectionCount: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cover: { width: 80, height: 80 },
  coverPlaceholder: { backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, padding: Spacing.sm, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, flex: 1 },
  privacyBadge: { padding: 4, borderRadius: Radius.full },
  meta: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  mode: { fontSize: FontSizes.xs, color: Colors.warning, marginTop: 2, fontWeight: '600' },
  members: { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 10, marginBottom: Spacing.sm, fontSize: FontSizes.md },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  modalBody: { color: Colors.textMuted, fontSize: FontSizes.md, marginBottom: Spacing.md },
  modalInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 92,
  },
  modalCancelButton: { backgroundColor: Colors.surfaceAlt },
  modalPrimaryButton: { backgroundColor: Colors.primary, marginLeft: Spacing.sm },
  modalCancelText: { color: Colors.primary, fontWeight: '800' },
  modalPrimaryText: { color: Colors.text, fontWeight: '800' },
});