import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSyncState, createSyncCode, joinSyncCode, setSyncState, SyncState, pullSyncItems } from '../lib/sync';
import { WatchEntry } from '../lib/storage';
import { colors, fonts } from '../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  list: WatchEntry[];
  onRefreshList: () => void;
};

export function SyncModal({ visible, onClose, list, onRefreshList }: Props) {
  const [syncState, setSyncStateLocal] = useState<SyncState>({ code: null, updatedAt: null });
  const [mode, setMode] = useState<'view' | 'input'>('view');
  const [inputCode, setInputCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    if (visible) {
      getSyncState().then(setSyncStateLocal);
      setMode('view');
      setInputCode('');
      setMsg(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !syncState.code || msg?.text === 'Watchlist linked successfully!') return;

    let pollCount = 0;
    const initialUpdatedAt = syncState.updatedAt;

    const interval = setInterval(async () => {
      pollCount++;
      if (pollCount >= 6) { // 30 seconds (6 * 5s)
        clearInterval(interval);
        onClose();
        return;
      }
      try {
        const res = await pullSyncItems(syncState.code);
        if (res.updatedAt !== initialUpdatedAt) {
          clearInterval(interval);
          setSyncStateLocal({ code: syncState.code, updatedAt: res.updatedAt });
          onRefreshList();
          setMsg({ text: 'Watchlist linked successfully!', type: 'success' });
          setTimeout(() => onClose(), 5000);
        }
      } catch (e) {
        // ignore network glitches
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [visible, syncState.code, syncState.updatedAt, onRefreshList, onClose]);

  const handleCreateCode = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const code = await createSyncCode(list);
      setSyncStateLocal({ code, updatedAt: new Date().toISOString() });
      setMsg({ text: 'Sync code generated!', type: 'success' });
    } catch (e: any) {
      setMsg({ text: e?.message || 'Could not create sync code', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleJoinCode = async () => {
    const code = inputCode.trim().toUpperCase();
    if (!/^[2-9A-Z]{6}$/.test(code)) {
      setMsg({ text: 'Please enter a valid 6-character sync code.', type: 'error' });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const result = await joinSyncCode(code, list);
      if (result.status === 'approved') {
        setSyncStateLocal({ code, updatedAt: new Date().toISOString() });
        onRefreshList();
        setMsg({ text: 'Watchlist linked successfully!', type: 'success' });
        setTimeout(() => onClose(), 5000);
      } else {
        setMsg({ text: 'Approval request sent! Tap Approve on your other device.', type: 'info' });
      }
    } catch (e: any) {
      setMsg({ text: e?.message || 'Failed to join sync code', type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const handleUnlink = async () => {
    await setSyncState(null, null);
    setSyncStateLocal({ code: null, updatedAt: null });
    setMsg({ text: 'Device unlinked. Your local list remains intact.', type: 'info' });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.iconWrap}>
            <Ionicons name="sync" size={28} color={colors.accent} />
          </View>
          <Text style={s.title}>Cross-Device Sync</Text>
          <Text style={s.body}>
            Sync your watchlist across devices anonymously — no account, email, or sign-in required.
          </Text>

          {msg && (
            <Text style={[
              s.messageText,
              msg.type === 'success' && { color: colors.good },
              msg.type === 'error' && { color: colors.live },
              msg.type === 'info' && { color: colors.muted }
            ]}>
              {msg.text}
            </Text>
          )}

          {busy ? (
            <ActivityIndicator size="large" color={colors.accent} style={{ marginVertical: 20 }} />
          ) : syncState.code ? (
            <View style={s.section}>
              <Text style={s.subLabel}>Your Sync Code</Text>
              <Text style={s.codeDisplay} selectable>{syncState.code}</Text>
              <Text style={s.note}>
                Type this 6-character code into your other device to link watchlists.
              </Text>
              <Pressable style={s.ghost} onPress={handleUnlink}>
                <Text style={s.ghostText}>Unlink this device</Text>
              </Pressable>
            </View>
          ) : mode === 'input' ? (
            <View style={s.section}>
              <Text style={s.subLabel}>Enter 6-Character Sync Code</Text>
              <TextInput
                style={s.codeInput}
                value={inputCode}
                onChangeText={(t) => setInputCode(t.toUpperCase())}
                placeholder="e.g. 4F9K2Q"
                placeholderTextColor={colors.faint}
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Pressable style={s.cta} onPress={handleJoinCode}>
                <Text style={s.ctaText}>Link to this Code</Text>
              </Pressable>
              <Pressable style={s.ghost} onPress={() => setMode('view')}>
                <Text style={s.ghostText}>Back</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.section}>
              <Pressable style={s.cta} onPress={handleCreateCode}>
                <Text style={s.ctaText}>Start Syncing (Generate Code)</Text>
              </Pressable>
              <Pressable style={[s.ghost, { marginTop: 10 }]} onPress={() => setMode('input')}>
                <Text style={s.ghostText}>Enter Code from another device</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={s.dismiss} onPress={onClose} hitSlop={8}>
            <Text style={s.dismissText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 24, alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, marginBottom: 8, textAlign: 'center' },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, textAlign: 'center', marginBottom: 16 },
  section: { width: '100%', alignItems: 'center' },
  subLabel: { color: colors.faint, fontFamily: fonts.medium, fontSize: 12, marginBottom: 6, textTransform: 'uppercase' },
  codeDisplay: { color: colors.accent, fontFamily: fonts.bold, fontSize: 32, letterSpacing: 4, marginVertical: 8 },
  codeInput: { width: '100%', backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 24, textAlign: 'center', letterSpacing: 4, paddingVertical: 10, marginBottom: 14 },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, lineHeight: 16, textAlign: 'center', marginBottom: 12 },
  cta: { width: '100%', backgroundColor: colors.accent, paddingVertical: 13, alignItems: 'center' },
  ctaText: { color: '#fff', fontFamily: fonts.bold, fontSize: 14 },
  ghost: { paddingVertical: 8 },
  ghostText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  dismiss: { marginTop: 14, paddingVertical: 6 },
  dismissText: { color: colors.faint, fontFamily: fonts.medium, fontSize: 13 },
  messageText: { fontFamily: fonts.medium, fontSize: 13, textAlign: 'center', marginBottom: 14, paddingHorizontal: 10 },
});
