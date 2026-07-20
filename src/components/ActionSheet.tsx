import React, { createContext, useCallback, useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../theme';
import Ic from './Ic';
import SwipeableSheet from './SwipeableSheet';

export type SheetAction = {
  label: string;
  icon?: any;
  destructive?: boolean;
  onPress?: () => void;
};

export type SheetConfig = {
  title?: string;
  message?: string;
  actions: SheetAction[];
};

const Ctx = createContext<{ show: (c: SheetConfig) => void }>({ show: () => {} });

export function useActionSheet() {
  return useContext(Ctx);
}

export function ActionSheetProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SheetConfig | null>(null);
  const show = useCallback((c: SheetConfig) => setConfig(c), []);
  const close = useCallback(() => setConfig(null), []);

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <SwipeableSheet visible={!!config} onClose={close}>
        <View style={styles.body}>
          {!!config?.title && (
            <Text style={styles.title} numberOfLines={1}>
              {config.title}
            </Text>
          )}
          {!!config?.message && (
            <Text style={styles.message} numberOfLines={1}>
              {config.message}
            </Text>
          )}
          <View style={styles.actions}>
            {config?.actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.action}
                activeOpacity={0.6}
                onPress={() => {
                  close();
                  a.onPress?.();
                }}>
                {a.icon && (
                  <Ic
                    icon={a.icon}
                    size={22}
                    color={a.destructive ? '#ff6b6b' : theme.text}
                  />
                )}
                <Text
                  style={[
                    styles.actionLabel,
                    a.destructive && styles.destructive,
                    !a.icon && { marginLeft: 0 },
                  ]}>
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.cancel} onPress={close} activeOpacity={0.7}>
            <Text style={styles.cancelLabel}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </SwipeableSheet>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 18, paddingTop: 4 },
  title: { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  message: { color: theme.textDim, fontSize: 13, marginBottom: 6 },
  actions: { marginTop: 6 },
  action: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  actionLabel: { color: theme.text, fontSize: 16, fontWeight: '500', marginLeft: 16 },
  destructive: { color: '#ff6b6b' },
  cancel: {
    marginTop: 10,
    backgroundColor: theme.surfaceHi,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelLabel: { color: theme.text, fontSize: 15, fontWeight: '700' },
});
