// 鸣潮抽卡系统逻辑 (概率算子与保底机制)

const GACHA_ITEMS = {
  // 5星 UP 角色
  UP_5STAR_CHAR: {
    id: 'marx',
    name: '马克思',
    rarity: 5,
    type: 'character',
    element: '热熔',
    elementIcon: '🔥',
    isUp: true,
    img: '/public/images/marx_banner.jpg',
    stars: '★★★★★',
    quote: '全世界无产者，联合起来！'
  },
  // 5星 常驻角色
  STD_5STAR_CHARS: [
    { id: 'yinlin', name: '吟霖', rarity: 5, type: 'character', element: '导电', elementIcon: '⚡', isUp: false, img: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400', stars: '★★★★★' },
    { id: 'calcharo', name: '卡卡罗', rarity: 5, type: 'character', element: '导电', elementIcon: '⚡', isUp: false, img: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400', stars: '★★★★★' },
    { id: 'verina', name: '维里奈', rarity: 5, type: 'character', element: '衍射', elementIcon: '✨', isUp: false, img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400', stars: '★★★★★' },
    { id: 'jianxin', name: '鉴心', rarity: 5, type: 'character', element: '气动', elementIcon: '🌀', isUp: false, img: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400', stars: '★★★★★' },
    { id: 'lingyang', name: '凌阳', rarity: 5, type: 'character', element: '冷凝', elementIcon: '❄️', isUp: false, img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400', stars: '★★★★★' }
  ],
  // 4星 UP 角色
  UP_4STAR_CHARS: [
    { id: 'mortefi', name: '莫特斐', rarity: 4, type: 'character', element: '热熔', elementIcon: '🔥', isUp: true, img: '/public/images/mortefi.png', stars: '★★★★' },
    { id: 'sanhua', name: '散华', rarity: 4, type: 'character', element: '冷凝', elementIcon: '❄️', isUp: true, img: '/public/images/sanhua.png', stars: '★★★★' },
    { id: 'danjin', name: '丹瑾', rarity: 4, type: 'character', element: '湮灭', elementIcon: '🌑', isUp: true, img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', stars: '★★★★' }
  ],
  // 4星 常驻武器
  STD_4STAR_WEAPONS: [
    { id: 'w_sword_4', name: '永夜之长鸣', rarity: 4, type: 'weapon', stars: '★★★★', img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400' },
    { id: 'w_pistol_4', name: '奔雷迅抢', rarity: 4, type: 'weapon', stars: '★★★★', img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400' },
    { id: 'w_claymore_4', name: '重霄苍鳞刀', rarity: 4, type: 'weapon', stars: '★★★★', img: 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=400' }
  ],
  // 3星 武器
  STD_3STAR_WEAPONS: [
    { id: 'w_3_1', name: '穿云迅刀·三式', rarity: 3, type: 'weapon', stars: '★★★', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400' },
    { id: 'w_3_2', name: '守护者配枪', rarity: 3, type: 'weapon', stars: '★★★', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400' },
    { id: 'w_3_3', name: '训练用重剑', rarity: 3, type: 'weapon', stars: '★★★', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400' },
    { id: 'w_3_4', name: '音感佩佩仪', rarity: 3, type: 'weapon', stars: '★★★', img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400' }
  ]
};

class GachaEngine {
  constructor() {
    this.pity5Star = parseInt(localStorage.getItem('wuwa_pity_5') || '0', 10);
    this.pity4Star = parseInt(localStorage.getItem('wuwa_pity_4') || '0', 10);
    this.guaranteedUp5 = localStorage.getItem('wuwa_guaranteed_5') === 'true';
    this.tickets = parseInt(localStorage.getItem('wuwa_tickets') || '999', 10);
    this.history = JSON.parse(localStorage.getItem('wuwa_history') || '[]');
  }

  saveState() {
    localStorage.setItem('wuwa_pity_5', this.pity5Star);
    localStorage.setItem('wuwa_pity_4', this.pity4Star);
    localStorage.setItem('wuwa_guaranteed_5', this.guaranteedUp5);
    localStorage.setItem('wuwa_tickets', this.tickets);
    localStorage.setItem('wuwa_history', JSON.stringify(this.history));
  }

  // 增加抽卡道具
  addTickets(amount = 10) {
    this.tickets += amount;
    this.saveState();
    return this.tickets;
  }

  // 核心抽卡单次逻辑
  pullSingle(bannerType = 'jiyan') {
    if (this.tickets < 1) {
      return { error: 'INSUFFICIENT_TICKETS' };
    }

    this.tickets -= 1;
    this.pity5Star += 1;
    this.pity4Star += 1;

    let rarity = 3;
    let pulledItem = null;

    // 动态 5星 概率计算 (基础 0.8%, 70抽以后软保底概率递增, 80抽硬保底)
    let prob5 = 0.008;
    if (this.pity5Star > 70) {
      prob5 += (this.pity5Star - 70) * 0.1; // 70抽后大额概率提升
    }

    const rand = Math.random();

    // 判断 5星 判定
    if (rand < prob5 || this.pity5Star >= 80) {
      rarity = 5;
      this.pity5Star = 0; // 重置 5星 保底

      // 50/50 判定
      const isUpHit = this.guaranteedUp5 || Math.random() < 0.5;
      if (isUpHit) {
        pulledItem = { ...GACHA_ITEMS.UP_5STAR_CHAR };
        this.guaranteedUp5 = false; // 重置大保底
      } else {
        const randIndex = Math.floor(Math.random() * GACHA_ITEMS.STD_5STAR_CHARS.length);
        pulledItem = { ...GACHA_ITEMS.STD_5STAR_CHARS[randIndex] };
        this.guaranteedUp5 = true; // 下次必出 UP
      }
    } 
    // 判断 4星 判定 (基础 6.0%, 10抽硬保底)
    else if (Math.random() < 0.06 || this.pity4Star >= 10) {
      rarity = 4;
      this.pity4Star = 0; // 重置 4星 保底

      // 50% 概率为 UP 4星 角色
      if (Math.random() < 0.5) {
        const randIdx = Math.floor(Math.random() * GACHA_ITEMS.UP_4STAR_CHARS.length);
        pulledItem = { ...GACHA_ITEMS.UP_4STAR_CHARS[randIdx] };
      } else {
        const randIdx = Math.floor(Math.random() * GACHA_ITEMS.STD_4STAR_WEAPONS.length);
        pulledItem = { ...GACHA_ITEMS.STD_4STAR_WEAPONS[randIdx] };
      }
    } 
    // 3星 武器
    else {
      rarity = 3;
      const randIdx = Math.floor(Math.random() * GACHA_ITEMS.STD_3STAR_WEAPONS.length);
      pulledItem = { ...GACHA_ITEMS.STD_3STAR_WEAPONS[randIdx] };
    }

    // 保存记录
    const historyEntry = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleString(),
      name: pulledItem.name,
      rarity: pulledItem.rarity,
      type: pulledItem.type === 'character' ? '角色' : '武器',
      banner: '夜将寒色去'
    };
    this.history.unshift(historyEntry);

    this.saveState();

    return {
      success: true,
      item: pulledItem,
      rarity: pulledItem.rarity,
      pity5: this.pity5Star,
      pity4: this.pity4Star,
      tickets: this.tickets
    };
  }

  // 10连抽逻辑
  pullTen(bannerType = 'jiyan') {
    if (this.tickets < 10) {
      return { error: 'INSUFFICIENT_TICKETS' };
    }

    const results = [];
    let maxRarity = 3;

    for (let i = 0; i < 10; i++) {
      const res = this.pullSingle(bannerType);
      if (res.success) {
        results.push(res.item);
        if (res.item.rarity > maxRarity) {
          maxRarity = res.item.rarity;
        }
      }
    }

    return {
      success: true,
      items: results,
      maxRarity: maxRarity,
      pity5: this.pity5Star,
      pity4: this.pity4Star,
      tickets: this.tickets
    };
  }
}

window.gachaEngine = new GachaEngine();
