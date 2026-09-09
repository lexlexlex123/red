/** Built-in audio clips from /audio (mirrors audio/audio-list.js). */

export const AUDIO_LIBRARY = [
  { id: 'aud4', file: 'Аллелуя.mp3', name: 'Аллелуя', path: 'audio/Аллелуя.mp3' },
  { id: 'aud5', file: 'РЖД прибытие.mp3', name: 'РЖД прибытие', path: 'audio/РЖД прибытие.mp3' },
  {
    id: 'aud1',
    file: 'a-few-moments-later-sponge-bob-sfx-fun.mp3',
    name: 'a-few-moments-later-sponge-bob-sfx-fun',
    path: 'audio/a-few-moments-later-sponge-bob-sfx-fun.mp3',
  },
  {
    id: 'aud2',
    file: 'bob-esponja-fail-sound.mp3',
    name: 'bob-esponja-fail-sound',
    path: 'audio/bob-esponja-fail-sound.mp3',
  },
  {
    id: 'aud3',
    file: 'discord-call-sound.mp3',
    name: 'discord-call-sound',
    path: 'audio/discord-call-sound.mp3',
  },
];

export function getAudioLibrary() {
  if (typeof window !== 'undefined' && Array.isArray(window._AUDIO_LIBRARY) && window._AUDIO_LIBRARY.length) {
    return window._AUDIO_LIBRARY;
  }
  return AUDIO_LIBRARY;
}
