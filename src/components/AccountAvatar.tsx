import { UserCircleIcon } from '@hugeicons/core-free-icons';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';
import { getAccount, subscribeAccount } from '../lib/account';
import { useTheme, useThemedStyles } from '../store/theme';
import { Palette } from '../theme';
import Ic from './Ic';

type Props = {
  onPress: () => void;
  size?: number;
};

/**
 * The header button that opens the drawer, showing the signed-in photo when
 * there is one. It lives here rather than in each screen because every tab
 * header carries it and they must never disagree about who is signed in.
 */
export default function AccountAvatar({ onPress, size = 42 }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [account, setAccount] = useState(getAccount());

  useEffect(() => subscribeAccount(() => setAccount(getAccount())), []);

  const shape = { width: size, height: size, borderRadius: size / 2 };

  return (
    <TouchableOpacity style={[styles.avatar, shape]} activeOpacity={0.7} onPress={onPress}>
      {account?.photo ? (
        <Image source={{ uri: account.photo }} style={[styles.photo, shape]} />
      ) : (
        <Ic icon={UserCircleIcon} size={size * 0.62} color={theme.textDim} strokeWidth={1.7} />
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (theme: Palette) => StyleSheet.create({
  avatar: {
    backgroundColor: theme.surfaceHi,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { resizeMode: 'cover' },
});
