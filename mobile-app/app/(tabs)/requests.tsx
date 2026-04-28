import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Animated, Easing } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { requestService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { SkeletonBlock } from '../../components/ui/skeleton-block';
import { AmbientBackground } from '../../components/ambient-background';

const STATUS_COLOR: any = { open: Colors.primary, fulfilled: Colors.success, closed: Colors.textMuted };
const FILTER_ACTIVE_STYLE: any = {
  open: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  fulfilled: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
  closed: { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' },
};

const FILTER_TEXT_ACTIVE_STYLE: any = {
  open: { color: Colors.text },
  fulfilled: { color: Colors.text },
  closed: { color: Colors.text },
};

const getStatusLabel = (item: any) => {
  if (item.status === 'closed' && item.closedReason) {
    return item.closedReason;
  }
  return item.status;
};

function RequestsSkeletonList() {
  return (
    <View style={styles.skeletonWrap}>
      {[0, 1, 2, 3, 4].map((idx) => (
        <View key={idx} style={styles.skeletonCard}>
          <View style={{ flex: 1 }}>
            <SkeletonBlock height={16} width="74%" borderRadius={8} />
            <SkeletonBlock height={12} width="58%" borderRadius={8} style={{ marginTop: 10 }} />
          </View>
          <SkeletonBlock height={24} width={76} borderRadius={Radius.full} />
        </View>
      ))}
    </View>
  );
}

export default function RequestsScreen() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState<'open' | 'fulfilled' | 'closed'>('open');
  const titleAnim = React.useRef(new Animated.Value(0)).current;
  const pageEntranceAnim = React.useRef(new Animated.Value(0)).current;
  const fabAnim = React.useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      pageEntranceAnim.setValue(0);
      Animated.timing(pageEntranceAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      titleAnim.setValue(0);
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      fabAnim.setValue(0);
      Animated.sequence([
        Animated.timing(fabAnim, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fabAnim, {
          toValue: 2,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, [fabAnim, pageEntranceAnim, titleAnim])
  );

  const load = useCallback(async (status = filter) => {
    try {
      const res = await requestService.getRequests({ status });
      setRequests(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally { setLoading(false); setRefreshing(false); }
  }, [filter]);

  useEffect(() => { 
    setLoading(true); 
    load(filter); 
  }, [filter, load]);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/request/${item._id}`)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.meta}>{item.requestedBy?.name} · {item.subject?.name || item.subjectLabel || 'Any Subject'}</Text>
        {item.status === 'closed' && item.closedReason && (
          <Text style={styles.closedMeta}>Closed as {item.closedReason}</Text>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '25' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{getStatusLabel(item)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AmbientBackground primary={Colors.primary} secondary={'#60A5FA'} />
      <Animated.View
        style={[
          styles.pageAnimatedWrap,
          {
            opacity: pageEntranceAnim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0, 0.6, 1],
            }),
            transform: [
              {
                translateY: pageEntranceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-28, 0],
                }),
              },
            ],
          },
        ]}
      >
      <View style={styles.header}>
        <Animated.Text
          style={[
            styles.pageTitle,
            {
              opacity: titleAnim.interpolate({
                inputRange: [0, 0.25, 1],
                outputRange: [0, 0.65, 1],
              }),
              transform: [
                {
                  translateX: titleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          Requests
        </Animated.Text>
        <Animated.View
          style={{
            transform: [
              {
                translateX: fabAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [28, 0, 0],
                }),
              },
              {
                scale: fabAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: [0.75, 1.08, 1],
                }),
              },
              {
                rotate: fabAnim.interpolate({
                  inputRange: [0, 1, 2],
                  outputRange: ['-180deg', '18deg', '0deg'],
                }),
              },
            ],
            opacity: fabAnim.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [0, 1, 1],
            }),
          }}
        >
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/request/create')}>
            <Ionicons name="add" size={22} color={Colors.surface} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['open', 'fulfilled', 'closed'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[
              styles.filterBtn,
              filter === s && FILTER_ACTIVE_STYLE[s],
            ]}
            onPress={() => setFilter(s)}
          >
            <Text style={[styles.filterText, filter === s && FILTER_TEXT_ACTIVE_STYLE[s]]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <RequestsSkeletonList />
        : <FlatList
            data={requests}
            keyExtractor={i => i._id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
            contentContainerStyle={{ padding: Spacing.md, paddingTop: 4, paddingBottom: 120 }}
            ListEmptyComponent={<Text style={styles.empty}>No {filter} requests.</Text>}
          />
      }
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  pageAnimatedWrap:{ flex: 1, zIndex: 1 },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm },
  pageTitle:       { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text },
  fab:             { width: 44, height: 44, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  filterRow:       { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: 8 },
  filterBtn:       { flex: 1, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surface, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  filterText:      { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600' },
  filterTextActive:{ color: Colors.text },
  card:            { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#BFDBFE' },
  title:           { fontSize: FontSizes.lg, fontWeight: '800', color: Colors.text },
  meta:            { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  closedMeta:      { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 4, fontStyle: 'italic' },
  statusBadge:     { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  statusText:      { fontSize: FontSizes.xs, fontWeight: '700', textTransform: 'capitalize' },
  empty:           { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
  skeletonWrap:    { paddingHorizontal: Spacing.md, paddingTop: 6 },
  skeletonCard:    {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: Spacing.sm,
  },
});
