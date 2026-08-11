export type Rarity = '5star' | '4star' | '3star';

export type FactionId = 'liberalism' | 'classical' | 'materialism' | 'existentialism' | 'utilitarianism' | 'ancient';

export interface Faction {
  id: FactionId;
  name: string;
  enName: string;
  color: string;
  bgGradient: string;
  description: string;
  icon: string;
}

export interface IdeologyRadar {
  rationality: number; // 理性/逻辑 (0-100)
  freedom: number;     // 自由/个体 (0-100)
  equality: number;    // 平等/集体 (0-100)
  tradition: number;   // 秩序/传统 (0-100)
  revolution: number;  // 变革/批判 (0-100)
}

export interface Philosopher {
  id: string;
  name: string;
  enName: string;
  title: string;
  rarity: Rarity;
  factionId: FactionId;
  factionName: string;
  avatarBg: string;
  splashArt: string; // CSS gradient or SVG art placeholder
  portraitPattern: string; // Decorative pattern
  quote: string;
  quoteSource: string;
  biography: string;
  radar: IdeologyRadar;
  voiceLine: string;
  color: string;
  glowColor: string;
  unlocked?: boolean;
  unlockedAt?: string;
  count?: number;
}

export interface GachaPullResult {
  philosopher: Philosopher;
  isNew: boolean;
  isPity: boolean;
}

export interface GachaHistoryItem {
  timestamp: string;
  philosopherId: string;
  philosopherName: string;
  rarity: Rarity;
}

export interface DebateMessage {
  id: string;
  senderId: 'user' | string; // 'user' or philosopher id
  senderName: string;
  avatarColor: string;
  role: 'host' | 'debater_a' | 'debater_b';
  content: string;
  citation?: string;
  timestamp: string;
}

export interface PresetTopic {
  id: string;
  title: string;
  category: string;
  description: string;
  suggestedDebaters: [string, string];
}
