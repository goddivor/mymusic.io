/**
 * @format
 */

import React, { useEffect, useState } from 'react';
import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { name as appName } from './app.json';
import { loadSettings } from './src/store/settings';

/**
 * Charge les préférences (langue, thème) AVANT d'importer l'app : les
 * StyleSheet des écrans figent la palette au moment du require, donc le
 * thème choisi doit être appliqué en premier.
 */
function Root() {
  const [App, setApp] = useState(null);
  useEffect(() => {
    loadSettings().then(() => setApp(() => require('./App').default));
  }, []);
  return App ? React.createElement(App) : null;
}

AppRegistry.registerComponent(appName, () => Root);
TrackPlayer.registerPlaybackService(() => require('./src/playbackService'));
