export interface GameProcess {
  name: string;
  platform: string;
}

export interface GameSettings {
  pos: string;
  theme: string;
  accent: string;
  fontSize: number;
  height: number;
  showCover: boolean;
  showAppid: boolean;
  showPlatform: boolean;
  showTime: boolean;
  customGames: Record<string, GameProcess>;
}

export interface Game {
  running: boolean;
  platform: string;
  platformLabel: string;
  name: string;
  appid: number;
  cover: string;
  sessionSeconds: number;
  playtimeMinutes?: number;
  source: string;
}
