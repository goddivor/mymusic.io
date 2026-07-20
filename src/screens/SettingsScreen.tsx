import {
  ComputerIcon,
  EnergyIcon,
  GlobalIcon,
  InformationCircleIcon,
  MusicNote01Icon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import Ic from '../components/Ic';
import { buildSnapshot, WebServer } from '../lib/webServer';
import { useLibrary } from '../store/library';
import { theme } from '../theme';

type ServerInfo = { ip: string; port: number; pin: string | null };

export default function SettingsScreen() {
  const lib = useLibrary();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<ServerInfo | null>(null);

  useEffect(() => {
    if (!WebServer.available) return;
    WebServer.status().then(s => {
      setEnabled(s.running);
      if (s.running) setInfo({ ip: s.ip, port: s.port, pin: s.pin });
    });
  }, []);

  const toggle = async (next: boolean) => {
    if (!WebServer.available) {
      ToastAndroid.show('Module serveur indisponible (rebuild requis)', ToastAndroid.LONG);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const res = await WebServer.start();
        setInfo(res);
        setEnabled(true);
        // Seed the server with the current library immediately.
        WebServer.updateLibrary(buildSnapshot(lib));
      } else {
        await WebServer.stop();
        setInfo(null);
        setEnabled(false);
      }
    } catch (e: any) {
      ToastAndroid.show(e?.message ?? 'Erreur serveur', ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const openBatterySettings = () => {
    Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(
      () => Linking.openSettings().catch(() => {}),
    );
  };

  const url = info ? `http://${info.ip}:${info.port}` : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 28 }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Réglages</Text>
      </View>

      {/* --- Accès web --- */}
      <Text style={styles.sectionLabel}>ACCÈS WEB</Text>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <View style={styles.iconWrap}>
            <Ic icon={GlobalIcon} size={22} color={theme.accent} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              Écouter sur le web
            </Text>
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="tail">
              Diffuse ta musique sur le même Wi-Fi.
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggle}
            disabled={busy}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#fff"
          />
        </View>

        {enabled && info && (
          <View style={styles.connectBox}>
            <View style={styles.connectRow}>
              <Ic icon={ComputerIcon} size={18} color={theme.textDim} />
              <Text style={styles.connectLabel}>Adresse</Text>
              <Text style={styles.connectValue} selectable>
                {url}
              </Text>
            </View>
            <View style={styles.connectRow}>
              <Ic icon={GlobalIcon} size={18} color={theme.textDim} />
              <Text style={styles.connectLabel}>Code PIN</Text>
              <Text style={[styles.connectValue, styles.pin]} selectable>
                {info.pin}
              </Text>
            </View>
            <Text style={styles.hint}>
              Ouvre {url} dans un navigateur puis saisis le PIN.
            </Text>
          </View>
        )}
      </View>

      {enabled && (
        <TouchableOpacity style={styles.battery} onPress={openBatterySettings} activeOpacity={0.8}>
          <Ic icon={EnergyIcon} size={20} color={theme.accent} />
          <Text style={styles.batteryText} numberOfLines={1} ellipsizeMode="tail">
            Empêcher la mise en veille (batterie)
          </Text>
        </TouchableOpacity>
      )}

      {/* --- Qualité audio --- */}
      <Text style={styles.sectionLabel}>LECTURE</Text>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <View style={styles.iconWrap}>
            <Ic icon={MusicNote01Icon} size={22} color={theme.accent} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              Qualité audio
            </Text>
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="tail">
              Audio-only haute qualité, repli auto.
            </Text>
          </View>
        </View>
      </View>

      {/* --- À propos --- */}
      <Text style={styles.sectionLabel}>À PROPOS</Text>
      <View style={styles.card}>
        <View style={styles.rowTop}>
          <View style={styles.iconWrap}>
            <Ic icon={InformationCircleIcon} size={22} color={theme.accent} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              Ta musique, à toi.
            </Text>
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="tail">
              Local + YouTube · v1.0
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  headerTitle: { color: theme.text, fontSize: 26, fontWeight: '800' },
  sectionLabel: {
    color: theme.textDim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 8,
  },
  card: {
    backgroundColor: theme.surface,
    marginHorizontal: 14,
    borderRadius: 14,
    padding: 14,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: theme.text, fontSize: 15.5, fontWeight: '700' },
  rowSub: { color: theme.textDim, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  connectBox: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  connectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 10 },
  connectLabel: { color: theme.textDim, fontSize: 13, width: 64 },
  connectValue: { color: theme.text, fontSize: 14, fontWeight: '700', flex: 1 },
  pin: { color: theme.accent, letterSpacing: 3, fontSize: 18 },
  hint: { color: theme.textFaint, fontSize: 12, marginTop: 8, lineHeight: 17 },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: theme.surfaceHi,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  batteryText: { color: theme.text, fontSize: 13.5, fontWeight: '600', flex: 1 },
});
