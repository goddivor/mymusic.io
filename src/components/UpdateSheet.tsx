import { ArrowUp01Icon } from '@hugeicons/core-free-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useI18n } from '../i18n';
import {
  ApkDownload,
  createApkDownload,
  dismissUpdateVersion,
  installApk,
  markdownToText,
  UpdateInfo,
} from '../lib/updater';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import Ic from './Ic';
import SwipeableSheet from './SwipeableSheet';

type Props = {
  info: UpdateInfo | null;
  onClose: () => void;
};

type Phase = 'idle' | 'downloading' | 'installing' | 'error';

/**
 * Bottom sheet offering an in-app update: release notes, self-download of the
 * APK with progress, then hand-off to the Android package installer.
 */
export default function UpdateSheet({ info, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const dlRef = useRef<ApkDownload | null>(null);

  useEffect(() => {
    if (info) {
      setPhase('idle');
      setProgress(0);
    }
  }, [info]);

  const busy = phase === 'downloading' || phase === 'installing';

  const start = async () => {
    if (!info) return;
    if (!info.apkUrl) {
      Linking.openURL(info.pageUrl).catch(() => {});
      onClose();
      return;
    }
    setPhase('downloading');
    setProgress(0);
    const dl = createApkDownload(info.apkUrl, setProgress);
    dlRef.current = dl;
    try {
      const path = await dl.promise;
      dlRef.current = null;
      if (!path) {
        setPhase('idle');
        return;
      }
      setPhase('installing');
      const ok = await installApk(path);
      if (!ok) setPhase('error');
    } catch {
      dlRef.current = null;
      setPhase('error');
    }
  };

  const cancel = () => {
    dlRef.current?.cancel();
    dlRef.current = null;
    setPhase('idle');
    setProgress(0);
  };

  const later = () => {
    if (busy) return;
    if (info?.latest) dismissUpdateVersion(info.latest);
    onClose();
  };

  const pct = Math.round(progress * 100);

  return (
    <SwipeableSheet visible={info !== null} onClose={busy ? () => {} : later}>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ic icon={ArrowUp01Icon} size={20} color="#1a1020" strokeWidth={2.4} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {t('updateAvailable', { v: info?.latest ?? '' })}
          </Text>
        </View>

        <Text style={styles.notesLabel}>{t('updateNotes')}</Text>
        <ScrollView style={styles.notesBox} contentContainerStyle={styles.notesInner}>
          <Text style={styles.notesText}>
            {markdownToText(info?.notes ?? '') || '—'}
          </Text>
        </ScrollView>

        {phase === 'downloading' ? (
          <View style={styles.progressArea}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {t('updateDownloading', { pct })}
            </Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={cancel}>
              <Text style={styles.secondaryText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        ) : phase === 'installing' ? (
          <View style={styles.progressArea}>
            <ActivityIndicator color={theme.accent} />
            <Text style={styles.progressText}>{t('updateInstalling')}</Text>
          </View>
        ) : (
          <>
            {phase === 'error' && (
              <Text style={styles.error}>{t('updateError')}</Text>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={start}>
              <Text style={styles.primaryText}>{t('updateNow')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={later}>
              <Text style={styles.secondaryText}>{t('updateLater')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SwipeableSheet>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: theme.text, fontSize: 17, fontWeight: '800', flex: 1 },
  notesLabel: {
    color: theme.textDim,
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  notesBox: {
    maxHeight: 200,
    backgroundColor: theme.surfaceHi,
    borderRadius: 12,
  },
  notesInner: { padding: 12 },
  notesText: { color: theme.text, fontSize: 12.5, lineHeight: 19 },
  progressArea: { gap: 10, marginTop: 16, alignItems: 'stretch' },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.surfaceHi,
    overflow: 'hidden',
  },
  progressFill: { height: 6, backgroundColor: theme.accent },
  progressText: {
    color: theme.textDim,
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: { color: '#ff6b6b', fontSize: 13, textAlign: 'center', marginTop: 12 },
  primaryBtn: {
    backgroundColor: theme.accent,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryText: { color: '#1a1020', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: theme.surfaceHi,
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  secondaryText: { color: theme.text, fontSize: 15, fontWeight: '700' },
});
