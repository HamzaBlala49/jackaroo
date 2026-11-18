import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BoardShape } from '@jackaroo/game-board';

export interface Settings {
  playerName: string;
  boardShape: BoardShape;
  sound: boolean;
  haptics: boolean;
}

const KEY = 'jackaroo:settings';

export const defaultSettings: Settings = {
  playerName: 'أنت',
  boardShape: 'circle',
  sound: true,
  haptics: true,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      playerName: typeof parsed.playerName === 'string' && parsed.playerName.length > 0
        ? parsed.playerName
        : defaultSettings.playerName,
      boardShape:
        parsed.boardShape === 'circle' ||
        parsed.boardShape === 'square' ||
        parsed.boardShape === 'hexagon' ||
        parsed.boardShape === 'oval'
          ? parsed.boardShape
          : defaultSettings.boardShape,
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : true,
      haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : true,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage is best-effort.
  }
}
