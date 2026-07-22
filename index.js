/**
 * @format
 */

import React, { useEffect, useState } from 'react';
import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { name as appName } from './app.json';
import { loadSettings } from './src/store/settings';

/**
 * Loads the preferences (language, theme) BEFORE importing the app: screen
 * StyleSheets freeze the palette at require time, so the chosen theme must
 * be applied first.
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
