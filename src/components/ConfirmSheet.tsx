import React, { createContext, useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../i18n';
import { useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import SwipeableSheet from './SwipeableSheet';

export type ConfirmConfig = {
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

const Ctx = createContext<{ confirm: (c: ConfirmConfig) => void }>({ confirm: () => {} });

export function useConfirm() {
  return useContext(Ctx).confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  const confirm = useCallback((c: ConfirmConfig) => setConfig(c), []);
  const close = useCallback(() => setConfig(null), []);

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      <SwipeableSheet visible={!!config} onClose={close}>
        <View style={styles.body}>
          <Text style={styles.title}>{config?.title}</Text>
          {!!config?.message && <Text style={styles.message}>{config.message}</Text>}
          <TouchableOpacity
            style={[styles.confirm, config?.destructive && styles.confirmDestructive]}
            activeOpacity={0.8}
            onPress={() => {
              const fn = config?.onConfirm;
              close();
              fn?.();
            }}>
            <Text
              style={[
                styles.confirmLabel,
                config?.destructive && styles.confirmLabelDestructive,
              ]}>
              {config?.confirmLabel ?? t('confirm')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={close} activeOpacity={0.7}>
            <Text style={styles.cancelLabel}>{t('cancel')}</Text>
          </TouchableOpacity>
        </View>
      </SwipeableSheet>
    </Ctx.Provider>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
  title: { color: theme.text, fontSize: 17, fontWeight: '800', marginBottom: 6 },
  message: { color: theme.textDim, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  confirm: {
    backgroundColor: theme.accent,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmDestructive: { backgroundColor: '#ff6b6b' },
  confirmLabel: { color: '#1a1020', fontSize: 15, fontWeight: '800' },
  confirmLabelDestructive: { color: '#fff' },
  cancel: {
    marginTop: 10,
    backgroundColor: theme.surfaceHi,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelLabel: { color: theme.text, fontSize: 15, fontWeight: '700' },
});
