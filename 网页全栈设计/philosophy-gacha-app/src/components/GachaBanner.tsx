import React from 'react';
import { BANNERS } from '../utils/gachaEngine';
import { PHILOSOPHERS } from '../data/philosophers';
import { Sparkles, HelpCircle, ShieldAlert, Star } from 'lucide-react';

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

export const GachaBanner: React.FC<GachaBannerProps> = ({
  selectedBannerId,
  setSelectedBannerId,
  onPullSingle,
  onPullTen,
  pity5Star,
  pity4Star,
  currency,
  onShowDetails
}) => {
  const currentBanner = BANNERS.find(b => b.id === selectedBannerId) || BANNERS[0];
  const featured5Star = PHILOSOPHERS.find(p => p.id === currentBanner.featured5StarId) || PHILOSOPHERS[0];
  const featured4Star = PHILOSOPHERS.find(p => p.id === currentBanner.featured4StarId) || PHILOSOPHERS[7];

  return (
    <div className="gacha-stage-container">
      {/* Banner Selector Pills at Top */}
      <div className="banner-tabs-header">
        {BANNERS.map((banner) => {
          const isSelected = banner.id === selectedBannerId;
          return (
            <button
              key={banner.id}
              className={`banner-selector-pill ${isSelected ? 'active' : ''}`}
              onClick={() => setSelectedBannerId(banner.id)}
              style={{
                borderColor: isSelected ? banner.themeColor : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isSelected ? `0 0 15px ${banner.themeColor}66` : 'none'
              }}
            >
              <Sparkles size={14} style={{ color: banner.themeColor }} />
              <span>{banner.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Banner Card Area */}
      <div
        className="gacha-banner-card"
        style={{
          background: currentBanner.bgGradient,
          borderColor: currentBanner.themeColor
        }}
      >
        {/* Decorative Anime Background Overlay */}
        <div className="banner-bg-grid" />

        {/* Left Info Column */}
        <div className="banner-left-info">
          {/* Rate UP Tag */}
          <div className="rate-up-badge" style={{ backgroundColor: currentBanner.themeColor }}>
            <span>EVENT WISH · 概率大UP</span>
          </div>

          {/* Banner Title */}
          <h1 className="banner-title">{currentBanner.name}</h1>
          <p className="banner-subtitle">{currentBanner.subtitle}</p>

          {/* Featured 5-Star Character Showcase Box */}
          <div className="featured-char-box">
            <div className="star-rating-row">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={18} fill="#f59e0b" color="#f59e0b" className="star-animated" />
              ))}
              <span className="rarity-title">【5★ 思想巨擘】</span>
            </div>

            <div className="char-name-heading">
              <span className="char-name-cn">{featured5Star.name}</span>
              <span className="char-title-tag">{featured5Star.title}</span>
            </div>

            {/* Quote pull quote */}
            <div className="char-quote-card">
              <span className="quote-mark">“</span>
              <p className="quote-text">{featured5Star.quote}</p>
              <span className="quote-source">—— {featured5Star.quoteSource}</span>
            </div>

            {/* Faction Badge */}
            <div className="faction-pill" style={{ backgroundColor: featured5Star.color + '33' }}>
              <span>{featured5Star.portraitPattern} {featured5Star.factionName}</span>
            </div>
          </div>

          {/* Featured 4-Star Character Thumbnail */}
          <div className="featured-fourstar-row">
            <span className="sub-up-label">概率提升 4★：</span>
            <div className="fourstar-chip">
              <div className="fourstar-stars">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} size={12} fill="#a855f7" color="#a855f7" />
                ))}
              </div>
              <span className="fourstar-name">{featured4Star.name}</span>
              <span className="fourstar-title">{featured4Star.title}</span>
            </div>
          </div>
        </div>

        {/* Right Splash Art / Portrait Vector */}
        <div className="banner-right-splash">
          <div className="portrait-glow-circle" style={{ background: featured5Star.glowColor }} />
          <div className="anime-splash-frame">
            <div className="splash-symbol-large">{featured5Star.portraitPattern}</div>
            <div className="splash-big-name">{featured5Star.enName}</div>
            <div className="splash-quote-voice">"{featured5Star.voiceLine}"</div>
          </div>
        </div>

        {/* Bottom Pity Status & Rules Button */}
        <div className="banner-bottom-bar">
          <div className="pity-counter-box">
            <div className="pity-stat">
              <span className="pity-label">5★ 累计抽数：</span>
              <span className="pity-value">{pity5Star} / 90</span>
              <div className="pity-progress-bar">
                <div
                  className="pity-fill"
                  style={{
                    width: `${(pity5Star / 90) * 100}%`,
                    backgroundColor: pity5Star >= 75 ? '#ef4444' : '#f59e0b'
                  }}
                />
              </div>
              {pity5Star >= 75 && (
                <span className="pity-warning-tag">
                  <ShieldAlert size={12} /> 概率提升中!
                </span>
              )}
            </div>

            <div className="pity-stat-small">
              <span>4★ 保底：{10 - pity4Star} 抽内</span>
            </div>
          </div>

          <button className="banner-details-btn" onClick={onShowDetails}>
            <HelpCircle size={15} />
            <span>祈愿详情 / 概率规则</span>
          </button>
        </div>
      </div>

      {/* Pull Action Buttons Bar */}
      <div className="gacha-actions-bar">
        {/* Single Wish Button */}
        <button
          className={`wish-btn wish-single ${currency < 160 ? 'disabled' : ''}`}
          onClick={onPullSingle}
          disabled={currency < 160}
        >
          <div className="wish-btn-content">
            <div className="wish-btn-title">
              <Sparkles size={16} />
              <span>祈愿 1 次</span>
            </div>
            <div className="wish-cost">
              <span className="cost-amount">160 智慧原石</span>
            </div>
          </div>
        </button>

        {/* 10x Wish Button */}
        <button
          className={`wish-btn wish-ten ${currency < 1600 ? 'disabled' : ''}`}
          onClick={onPullTen}
          disabled={currency < 1600}
        >
          <div className="wish-btn-content">
            <div className="wish-btn-title">
              <Sparkles size={20} className="sparkle-gold" />
              <span>祈愿 10 次</span>
              <span className="guarantee-chip">必得 4★+</span>
            </div>
            <div className="wish-cost">
              <span className="cost-amount">1600 智慧原石</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
