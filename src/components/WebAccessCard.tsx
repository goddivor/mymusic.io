import { ComputerIcon, EnergyIcon, GlobalIcon } from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  StyleSheet,
  Switch,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../i18n';
import { buildSnapshot, WebServer } from '../lib/webServer';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import Ic from './Ic';

type ServerInfo = { ip: string; port: number; pin: string | null };

/** Partage Wi-Fi de la bibliothèque : toggle du serveur embarqué + infos de connexion. */
export default function WebAccessCard() {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
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
      ToastAndroid.show(t('webAccessUnavailable'), ToastAndroid.LONG);
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
      ToastAndroid.show(e?.message ?? t('webAccessError'), ToastAndroid.SHORT);
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
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View style={styles.iconWrap}>
          <Ic icon={GlobalIcon} size={20} color={theme.accent} strokeWidth={2.1} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {t('webAccessTitle')}
          </Text>
          <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="tail">
            {t('webAccessSub')}
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
            <Ic icon={ComputerIcon} size={16} color={theme.textDim} />
            <Text style={styles.connectValue} selectable numberOfLines={1}>
              {url}
            </Text>
          </View>
          <View style={styles.connectRow}>
            <Text style={styles.connectLabel}>PIN</Text>
            <Text style={[styles.connectValue, styles.pin]} selectable>
              {info.pin}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.battery}
            onPress={openBatterySettings}
            activeOpacity={0.8}>
            <Ic icon={EnergyIcon} size={16} color={theme.accent} />
            <Text style={styles.batteryText} numberOfLines={1} ellipsizeMode="tail">
              {t('preventSleep')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 12,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  rowSub: { color: theme.textDim, fontSize: 11.5, marginTop: 2 },
  connectBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 8,
  },
  connectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  connectLabel: { color: theme.textDim, fontSize: 12.5 },
  connectValue: { color: theme.text, fontSize: 13, fontWeight: '700', flex: 1 },
  pin: { color: theme.accent, letterSpacing: 3, fontSize: 16 },
  battery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: theme.surfaceHi,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  batteryText: { color: theme.text, fontSize: 12.5, fontWeight: '600', flex: 1 },
});
