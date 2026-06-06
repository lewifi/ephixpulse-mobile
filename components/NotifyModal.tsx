import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { currentStatus, enablePush, disablePush, openNotificationSettings, PushStatus } from '../lib/push';
import { colors, fonts } from '../theme/colors';

export function NotifyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [status, setStatus] = useState<PushStatus>('unknown');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (visible) currentStatus().then(setStatus); }, [visible]);

  const enable = async () => {
    setBusy(true);
    setStatus(await enablePush());
    setBusy(false);
  };
  const turnOff = async () => { await disablePush(); setStatus('unknown'); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.iconWrap}><Ionicons name="notifications" size={28} color={colors.accent} /></View>
          <Text style={s.title}>New in the Top 25</Text>
          <Text style={s.body}>
            Get a heads-up the moment a fresh title breaks into the Top 25, so you never miss
            what's suddenly blowing up.
          </Text>

          {status === 'enabled' ? (
            <>
              <View style={s.enabledRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.good} />
                <Text style={s.enabledText}>Notifications are on</Text>
              </View>
              <Pressable style={s.ghost} onPress={turnOff}><Text style={s.ghostText}>Turn off</Text></Pressable>
            </>
          ) : status === 'denied' ? (
            <>
              <Text style={s.note}>
                Notifications are turned off for Ephix Pulse in your system settings.
              </Text>
              <Pressable style={s.cta} onPress={() => openNotificationSettings()}>
                <Text style={s.ctaText}>Open notification settings</Text>
              </Pressable>
            </>
          ) : status === 'unsupported' ? (
            <Text style={s.note}>
              Push needs the installed app — it doesn't run in Expo Go. It'll work once you build
              with EAS.
            </Text>
          ) : (
            <Pressable style={s.cta} onPress={enable} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.ctaText}>Enable notifications</Text>}
            </Pressable>
          )}

          <Pressable style={s.dismiss} onPress={onClose} hitSlop={8}>
            <Text style={s.dismissText}>{status === 'enabled' ? 'Done' : 'Not now'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  sheet: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 24, alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18, marginBottom: 8, textAlign: 'center' },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 18 },
  cta: { width: '100%', backgroundColor: colors.accent, paddingVertical: 13, alignItems: 'center' },
  ctaText: { color: '#fff', fontFamily: fonts.bold, fontSize: 15 },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 6 },
  enabledRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  enabledText: { color: colors.text, fontFamily: fonts.medium, fontSize: 14 },
  ghost: { paddingVertical: 8 },
  ghostText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13 },
  dismiss: { marginTop: 14, paddingVertical: 6 },
  dismissText: { color: colors.faint, fontFamily: fonts.medium, fontSize: 13 },
});
