import {
  CheckmarkCircle02Icon,
  ComputerIcon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../i18n';
import { getOutput, setOutput, subscribeOutput } from '../lib/connect';
import { buildSnapshot, WebServer } from '../lib/webServer';
import { useLibrary } from '../store/library';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import Ic from './Ic';
import SwipeableSheet from './SwipeableSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type Info = { ip: string; port: number; pin: string | null } | null;

/**
 * Device picker in the spirit of Spotify Connect: starting the LAN server no
 * longer requires the settings toggle, and the browser can either take over
 * playback or stay a remote while the phone keeps the sound.
 */
export default function ConnectSheet({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const lib = useLibrary();
  const [info, setInfo] = useState<Info>(null);
  const [busy, setBusy] = useState(false);
  const [output, setOut] = useState(getOutput());

  useEffect(() => subscribeOutput(() => setOut(getOutput())), []);

  useEffect(() => {
    if (!visible || !WebServer.available) return;
    WebServer.status().then(s => {
      if (s.running) setInfo({ ip: s.ip, port: s.port, pin: s.pin });
    });
  }, [visible]);

  const ensureServer = async (): Promise<Info> => {
    if (info) return info;
    setBusy(true);
    try {
      const res = await WebServer.start();
      WebServer.updateLibrary(buildSnapshot(lib));
      setInfo(res);
      return res;
    } catch (e: any) {
      ToastAndroid.show(e?.message ?? t('webAccessError'), ToastAndroid.SHORT);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const pickPhone = () => {
    setOutput('phone');
    onClose();
  };

  const pickWeb = async () => {
    const res = await ensureServer();
    if (!res) return;
    setOutput('web');
  };

  const url = info ? `http://${info.ip}:${info.port}` : '';

  return (
    <SwipeableSheet visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={styles.title}>{t('connectTitle')}</Text>

        <TouchableOpacity
          style={[styles.row, output === 'phone' && styles.rowOn]}
          onPress={pickPhone}
          activeOpacity={0.75}>
          <Ic
            icon={SmartPhone01Icon}
            size={24}
            color={output === 'phone' ? theme.accent : theme.text}
          />
          <View style={styles.meta}>
            <Text style={styles.name}>{t('thisPhone')}</Text>
            <Text style={styles.sub}>{t('outputPhoneSub')}</Text>
          </View>
          {output === 'phone' && (
            <Ic icon={CheckmarkCircle02Icon} size={22} color={theme.accent} filled />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.row, output === 'web' && styles.rowOn]}
          onPress={pickWeb}
          activeOpacity={0.75}
          disabled={busy}>
          <Ic
            icon={ComputerIcon}
            size={24}
            color={output === 'web' ? theme.accent : theme.text}
          />
          <View style={styles.meta}>
            <Text style={styles.name}>{t('webPlayer')}</Text>
            <Text style={styles.sub}>
              {busy ? t('starting') : info ? url : t('outputWebSub')}
            </Text>
          </View>
          {output === 'web' && (
            <Ic icon={CheckmarkCircle02Icon} size={22} color={theme.accent} filled />
          )}
        </TouchableOpacity>

        {info?.pin ? (
          <Text style={styles.hint}>{t('connectPinHint', { pin: info.pin })}</Text>
        ) : (
          <Text style={styles.hint}>{t('connectHint')}</Text>
        )}
      </View>
    </SwipeableSheet>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 10 },
  title: { color: theme.text, fontSize: 20, fontWeight: '800', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.surface,
    marginBottom: 10,
  },
  rowOn: { backgroundColor: theme.surfaceHi },
  meta: { flex: 1 },
  name: { color: theme.text, fontSize: 15.5, fontWeight: '700' },
  sub: { color: theme.textDim, fontSize: 12.5, marginTop: 3 },
  hint: { color: theme.textFaint, fontSize: 12, marginTop: 6, lineHeight: 17 },
});
