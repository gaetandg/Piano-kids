// Démarrage de l'application.
import { starfield } from './ui.js';
import * as state from './state.js';
import { init, register, start } from './router.js';
import { setVolume, unlockAudio } from './audio.js';
import { setVoiceEnabled } from './speech.js';
import { VERSION } from './version.js';

import { profilesScreen, editProfileScreen } from './screens/profiles.js';
import { hubScreen, planetScreen } from './screens/hub.js';
import { gameScreen } from './screens/game.js';
import { freeScreen } from './screens/free.js';
import { songsScreen, albumScreen } from './screens/library.js';
import { parentsScreen, stickerGuideScreen } from './screens/parents.js';
import { calibrateScreen, applyMicSettings } from './screens/calibrate.js';

const s = state.settings();
setVolume(s.volume);
setVoiceEnabled(s.voice);
applyMicSettings();

starfield();
init(document.getElementById('app'));
register('profiles', profilesScreen);
register('editProfile', editProfileScreen);
register('hub', hubScreen);
register('planet', planetScreen);
register('game', gameScreen);
register('free', freeScreen);
register('songs', songsScreen);
register('album', albumScreen);
register('parents', parentsScreen);
register('stickerGuide', stickerGuideScreen);
register('calibrate', calibrateScreen);

// Le son ne peut démarrer qu'après un premier toucher de l'écran.
document.addEventListener('pointerdown', () => unlockAudio(), { capture: true });

if (!state.profiles().length) start('editProfile', { first: true });
else start('profiles');

document.documentElement.dataset.version = VERSION;

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
