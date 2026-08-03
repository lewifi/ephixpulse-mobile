import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { useWatchlist } from '../../hooks/useWatchlist';
import { getSyncState, pullSyncItems } from '../../lib/sync';
import { SyncModal } from '../../components/SyncModal';
import { TitleCard } from '../../components/TitleCard';
import { EmptyState, Loading } from '../../components/StateViews';
import { colors, fonts } from '../../theme/colors';

export default function MyList() {
  const insets = useSafeAreaInsets();
  const { list, loaded, toggle, refresh } = useWatchlist();
  const [syncState, setSyncStateLocal] = useState<{ code: string | null; updatedAt: string | null }>({ code: null, updatedAt: null });
  const [showSyncModal, setShowSyncModal] = useState(false);

  const pathname = usePathname();
  const isFocused = pathname === '/list';

  const refreshSync = useCallback(() => {
    getSyncState().then(setSyncStateLocal);
  }, []);

  useEffect(() => {
    refreshSync();
  }, [refreshSync, showSyncModal]);

  useEffect(() => {
    if (!syncState.code || !isFocused) return;

    let appState = 'active';
    const sub = AppState.addEventListener('change', (nextState) => {
      appState = nextState;
    });

    const interval = setInterval(async () => {
      if (appState !== 'active') return;
      try {
        const current = await getSyncState();
        if (!current.code) return;
        const res = await pullSyncItems(current.code);
        if (res.updatedAt !== current.updatedAt) {
          refresh();
        }
      } catch (e) {
        // ignore network glitches
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [syncState.code, isFocused, refresh]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <Text style={s.title}>My List</Text>
        <Pressable style={s.syncBadge} onPress={() => setShowSyncModal(true)}>
          <Ionicons name={syncState.code ? "sync-circle" : "sync-circle-outline"} size={16} color={syncState.code ? colors.good : colors.muted} />
          <Text style={s.syncBadgeText}>
            {syncState.code ? `Synced · ${syncState.code}` : 'Sync to other devices'}
          </Text>
        </Pressable>
      </View>

      {!loaded ? (
        <Loading label="Opening your list…" />
      ) : (
        <FlashList
          data={list}
          numColumns={3}
          keyExtractor={(item: any) => `${item.type}_${item.id}`}
          renderItem={({ item }: any) => <TitleCard item={item} />}
          contentContainerStyle={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={<EmptyState title="Nothing saved yet" sub="Tap “My List” on any title to add it here." />}
        />
      )}

      <SyncModal
        visible={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        list={list}
        onRefreshList={refresh}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, letterSpacing: 1 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  syncBadgeText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
});
