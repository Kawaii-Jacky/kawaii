import { PHILOSOPHERS } from '../data/philosophers';
import type { GachaPullResult, Philosopher, Rarity } from '../types/philosopher';

export interface BannerInfo {
  id: string;
  name: string;
  subtitle: string;
  featured5StarId: string;
  featured4StarId: string;
  bgGradient: string;
  themeColor: string;
}

export const BANNERS: BannerInfo[] = [
  {
    id: 'banner-kant',
    name: '理性的天穹与先验神典',
    subtitle: '概率UP 5★ [星空与道德律] 康德 · 4★ [绝对精神] 黑格尔',
    featured5StarId: 'kant',
    featured4StarId: 'hegel',
    bgGradient: 'radial-gradient(ellipse at top, #3b0764 0%, #1e1b4b 50%, #09090b 100%)',
    themeColor: '#a855f7'
  },
  {
    id: 'banner-nietzsche-marx',
    name: '狂飙意志与历史实践风暴',
    subtitle: '概率UP 5★ [超人意志] 尼采 & 5★ [实践变革] 马克思',
    featured5StarId: 'nietzsche',
    featured4StarId: 'sartre',
    bgGradient: 'radial-gradient(ellipse at top, #450a0a 0%, #290808 50%, #09090b 100%)',
    themeColor: '#ef4444'
  },
  {
    id: 'banner-plato-rousseau',
    name: '理念理想国与契约圣誓',
    subtitle: '概率UP 5★ [哲学王] 柏拉图 & 5★ [自由圣誓] 卢梭',
    featured5StarId: 'plato',
    featured4StarId: 'locke',
    bgGradient: 'radial-gradient(ellipse at top, #78350f 0%, #1e1b4b 50%, #09090b 100%)',
    themeColor: '#f59e0b'
  }
];

export function performSinglePull(
  bannerId: string,
  pity5Star: number,
  pity4Star: number,
  unlockedIds: Set<string>
): { result: GachaPullResult; newPity5Star: number; newPity4Star: number } {
  const currentBanner = BANNERS.find(b => b.id === bannerId) || BANNERS[0];
  
  // Calculate 5star probability (base 1.6%, soft pity starts at 75, hard pity at 90)
  let rate5Star = 0.016;
  if (pity5Star >= 74) {
    rate5Star += (pity5Star - 73) * 0.06; // linearly increase up to 100%
  }

  // Calculate 4star probability (base 13%, guaranteed at 10)
  let rate4Star = 0.13;
  if (pity4Star >= 9) {
    rate4Star = 1.0;
  }

  const roll = Math.random();
  let chosenRarity: Rarity = '3star';
  let isPity = false;

  if (roll < rate5Star || pity5Star >= 89) {
    chosenRarity = '5star';
    if (pity5Star >= 89) isPity = true;
  } else if (roll < rate5Star + rate4Star) {
    chosenRarity = '4star';
  } else {
    chosenRarity = '3star';
  }

  // Select philosopher of chosen rarity
  const candidates = PHILOSOPHERS.filter(p => p.rarity === chosenRarity);
  let selected: Philosopher;

  if (chosenRarity === '5star') {
    // 50% chance for featured 5star
    if (Math.random() < 0.5) {
      selected = candidates.find(p => p.id === currentBanner.featured5StarId) || candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      selected = candidates[Math.floor(Math.random() * candidates.length)];
    }
  } else if (chosenRarity === '4star') {
    if (Math.random() < 0.5) {
      selected = candidates.find(p => p.id === currentBanner.featured4StarId) || candidates[Math.floor(Math.random() * candidates.length)];
    } else {
      selected = candidates[Math.floor(Math.random() * candidates.length)];
    }
  } else {
    selected = candidates[Math.floor(Math.random() * candidates.length)];
  }

  const isNew = !unlockedIds.has(selected.id);

  // Update pity counters
  const newPity5Star = chosenRarity === '5star' ? 0 : pity5Star + 1;
  const newPity4Star = chosenRarity === '4star' || chosenRarity === '5star' ? 0 : pity4Star + 1;

  return {
    result: {
      philosopher: selected,
      isNew,
      isPity
    },
    newPity5Star,
    newPity4Star
  };
}

export function performTenPull(
  bannerId: string,
  pity5Star: number,
  pity4Star: number,
  unlockedIds: Set<string>
): { results: GachaPullResult[]; newPity5Star: number; newPity4Star: number } {
  const results: GachaPullResult[] = [];
  let curPity5 = pity5Star;
  let curPity4 = pity4Star;

  for (let i = 0; i < 10; i++) {
    const { result, newPity5Star, newPity4Star } = performSinglePull(bannerId, curPity5, curPity4, unlockedIds);
    results.push(result);
    curPity5 = newPity5Star;
    curPity4 = newPity4Star;
    // Update local set during 10 pull so duplicate detection works
    unlockedIds.add(result.philosopher.id);
  }

  return {
    results,
    newPity5Star: curPity5,
    newPity4Star: curPity4
  };
}
