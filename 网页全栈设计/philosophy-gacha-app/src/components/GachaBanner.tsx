import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Diamond,
  HelpCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import { BANNERS } from '../utils/gachaEngine';

interface GachaBannerProps {
  selectedBannerId: string;
  setSelectedBannerId: (id: string) => void;
  onPullSingle: () => void;
  onPullTen: () => void;
  pity5Star: number;
  pity4Star: number;
  currency: number;
  onShowDetails: () => void;
}

const PRESENTATION = [
  {
    id: 'banner-kant',
    eyebrow: 'LIMITED ARCHIVE / 01',
    title: '理性的天穹',
    subtitle: '特别寻访 · 限时概率提升',
    character: '康德',
    enName: 'IMMANUEL KANT',
    quote: '头顶的星空，与心中的道德律。',
    accent: '#f3c73f',
    filter: 'hue-rotate(32deg) saturate(.78)',
  },
  {
    id: 'banner-nietzsche-marx',
    eyebrow: 'LIMITED ARCHIVE / 02',
    title: '历史与实践',
    subtitle: '双重寻访 · 核心档案概率提升',
    character: '马克思',
    enName: 'KARL MARX',
    quote: '哲学家们只是解释世界，问题在于改变世界。',
    accent: '#e51925',
    filter: 'none',
  },
  {
    id: 'banner-plato-rousseau',
    eyebrow: 'STANDARD ARCHIVE / 03',
    title: '理想国与契约',
    subtitle: '常驻寻访 · 经典思想档案',
    character: '柏拉图',
    enName: 'PLATO',
    quote: '让灵魂转向光明，而不是只注视影子。',
    accent: '#50a6c6',
    filter: 'hue-rotate(164deg) saturate(.62)',
  },
] as const;

export const GachaBanner: React.FC<GachaBannerProps> = ({
  selectedBannerId,
  setSelectedBannerId,
  onPullSingle,
  onPullTen,
  pity5Star,
  pity4Star,
  currency,
  onShowDetails,
}) => {
  const currentIndex = Math.max(0, BANNERS.findIndex((banner) => banner.id === selectedBannerId));
  const current = PRESENTATION[currentIndex] ?? PRESENTATION[0];

  const moveBanner = (direction: -1 | 1) => {
    const nextIndex = (currentIndex + direction + BANNERS.length) % BANNERS.length;
    setSelectedBannerId(BANNERS[nextIndex].id);
  };

  return (
    <section className="arknights-gacha" style={{ '--pool-accent': current.accent } as React.CSSProperties}>
      <div className="gacha-artwork" aria-hidden="true">
        <img src="/marx-gacha-artwork.png" alt="" style={{ filter: current.filter }} />
      </div>
      <div className="gacha-vignette" aria-hidden="true" />
      <div className="gacha-noise" aria-hidden="true" />

      <div className="pool-tabs" aria-label="卡池选择">
        {PRESENTATION.map((banner, index) => (
          <button
            key={banner.id}
            className={banner.id === selectedBannerId ? 'pool-tab active' : 'pool-tab'}
            onClick={() => setSelectedBannerId(banner.id)}
          >
            <span className="pool-index">0{index + 1}</span>
            <span>
              <strong>{banner.title}</strong>
              <small>{index === 1 ? 'LIMITED' : 'ARCHIVE'}</small>
            </span>
          </button>
        ))}
      </div>

      <button className="pool-arrow pool-arrow-left" onClick={() => moveBanner(-1)} aria-label="上一个卡池">
        <ChevronLeft />
      </button>
      <button className="pool-arrow pool-arrow-right" onClick={() => moveBanner(1)} aria-label="下一个卡池">
        <ChevronRight />
      </button>

      <div className="pool-identity" aria-hidden="true">
        <span>{current.enName}</span>
        <strong>{current.character}</strong>
      </div>

      <article className="pool-copy-panel">
        <div className="pool-eyebrow">{current.eyebrow}</div>
        <div className="rarity-row" aria-label="五星档案">
          {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={14} fill="currentColor" />)}
        </div>
        <h1>{current.title}</h1>
        <p className="pool-subtitle">{current.subtitle}</p>
        <blockquote>“{current.quote}”</blockquote>

        <div className="featured-row">
          <span className="featured-label">概率提升</span>
          {['尼采', '黑格尔', '萨特'].map((name, index) => (
            <span className="featured-chip" key={name}>
              <b>{index === 0 ? '★★★★★' : '★★★★'}</b>{name}
            </span>
          ))}
          <button onClick={onShowDetails} className="details-icon" title="查看寻访详情" aria-label="查看寻访详情">
            <Search size={16} />
          </button>
        </div>
      </article>

      <div className="gacha-bottom-rail">
        <div className="pity-panel">
          <div className="pity-heading">
            <span><ShieldCheck size={15} /> 寻访进度</span>
            <strong>{pity5Star} / 90</strong>
          </div>
          <div className="pity-track"><span style={{ width: `${Math.min(100, (pity5Star / 90) * 100)}%` }} /></div>
          <p>距离五星档案至多 {Math.max(0, 90 - pity5Star)} 次 · 四星保底 {Math.max(1, 10 - pity4Star)} 次内</p>
          <button onClick={onShowDetails} className="rules-link"><HelpCircle size={13} /> 概率公示</button>
        </div>

        <div className="wish-actions">
          <button className="wish-button wish-one" onClick={onPullSingle} disabled={currency < 160}>
            <span className="wish-count">01</span>
            <span><strong>寻访一次</strong><small><Diamond size={12} fill="currentColor" /> 160</small></span>
          </button>
          <button className="wish-button wish-ten" onClick={onPullTen} disabled={currency < 1600}>
            <span className="wish-count">10</span>
            <span><strong>寻访十次</strong><small><Sparkles size={12} /> 1,600 · 必得四星</small></span>
          </button>
        </div>
      </div>
    </section>
  );
};
