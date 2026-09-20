import { Alert02Icon, ArrowLeft01Icon, Login01Icon, UserCircleIcon } from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ic from '../components/Ic';
import SlideOverModal from '../components/SlideOverModal';
import { useI18n } from '../i18n';
import {
  Account,
  getAccount,
  isConfigured,
  signIn,
  signOut,
  subscribeAccount,
} from '../lib/account';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function AccountScreen({ visible, onClose }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useI18n();
  const [account, setAccount] = useState<Account | null>(getAccount());
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAccount(() => setAccount(getAccount())), []);

  const onSignIn = async () => {
    setBusy(true);
    const result = await signIn();
    setBusy(false);
    if (result === 'cancelled') ToastAndroid.show(t('signInCancelled'), ToastAndroid.SHORT);
    else if (result === 'no-play-services') ToastAndroid.show(t('noPlayServices'), ToastAndroid.LONG);
    else if (result === 'error') ToastAndroid.show(t('signInFailed'), ToastAndroid.SHORT);
  };

  const googleMark = (
    <View style={styles.gMark}>
      <Text style={styles.gLetter}>G</Text>
    </View>
  );

  return (
    <SlideOverModal visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.back} activeOpacity={0.7}>
            <Ic icon={ArrowLeft01Icon} size={24} color={theme.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('accountTitle')}</Text>
        </View>

        {account ? (
          <View style={styles.body}>
            {account.photo ? (
              <Image source={{ uri: account.photo }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.centred]}>
                <Ic icon={UserCircleIcon} size={52} color={theme.textDim} strokeWidth={1.5} />
              </View>
            )}
            <Text style={styles.name}>{account.name}</Text>
            <Text style={styles.email}>{account.email}</Text>
            <Text style={styles.hint}>{t('signedInHint')}</Text>
            <TouchableOpacity style={styles.secondary} onPress={signOut} activeOpacity={0.8}>
              <Text style={styles.secondaryLabel}>{t('signOut')}</Text>
            </TouchableOpacity>
          </View>
        ) : !isConfigured() ? (
          <View style={styles.body}>
            <View style={[styles.avatar, styles.centred]}>
              <Ic icon={Alert02Icon} size={48} color={theme.textFaint} strokeWidth={1.5} />
            </View>
            <Text style={styles.name}>{t('accountUnconfigured')}</Text>
            <Text style={styles.hint}>{t('accountUnconfiguredHint')}</Text>
          </View>
        ) : (
          <View style={styles.body}>
            <View style={[styles.avatar, styles.centred]}>
              <Ic icon={Login01Icon} size={48} color={theme.textDim} strokeWidth={1.5} />
            </View>
            <Text style={styles.hint}>{t('signedOutHint')}</Text>
            <TouchableOpacity
              style={[styles.google, busy && styles.dim]}
              onPress={onSignIn}
              disabled={busy}
              activeOpacity={0.85}>
              {googleMark}
              <Text style={styles.googleLabel}>{t('signInWithGoogle')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </SlideOverModal>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  back: { padding: 8 },
  headerTitle: { color: theme.text, fontSize: 19, fontWeight: '800', marginLeft: 6 },
  body: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 48 },
  centred: { alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: theme.surfaceHi,
  },
  name: { color: theme.text, fontSize: 22, fontWeight: '800', marginTop: 22, textAlign: 'center' },
  email: { color: theme.textDim, fontSize: 14.5, marginTop: 6 },
  hint: {
    color: theme.textDim,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 18,
    textAlign: 'center',
  },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    marginTop: 30,
    backgroundColor: '#FFFFFF',
  },
  dim: { opacity: 0.6 },
  gMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gLetter: { color: '#4285F4', fontSize: 16, fontWeight: '800' },
  googleLabel: { color: '#1F1F1F', fontSize: 16, fontWeight: '700' },
  secondary: {
    alignSelf: 'stretch',
    height: 50,
    borderRadius: 25,
    marginTop: 30,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { color: theme.text, fontSize: 15.5, fontWeight: '700' },
});
