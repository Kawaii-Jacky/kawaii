import React, { useEffect, useState } from 'react';
import type { GachaPullResult } from '../types/philosopher';
import { FastForward, Sparkles } from 'lucide-react';

interface SummonAnimationProps {
  results: GachaPullResult[];
  onComplete: () => void;
}

export const SummonAnimation: React.FC<SummonAnimationProps> = ({ results, onComplete }) => {
  const [phase, setPhase] = useState<'charging' | 'meteor' | 'explosion'>('charging');

  // Determine highest rarity in this pull
  const has5Star = results.some(r => r.philosopher.rarity === '5star');
  const has4Star = results.some(r => r.philosopher.rarity === '4star');

  const mainColor = has5Star ? '#f59e0b' : has4Star ? '#a855f7' : '#3b82f6';
  const glowText = has5Star ? '金色天启 · 思想巨擘降临！' : has4Star ? '紫色神辉 · 杰出学者觉醒！' : '蓝色星火 · 启蒙思客到来';

  useEffect(() => {
    // Sequence timer: Charging (0-1.2s) -> Meteor (1.2-2.5s) -> Explosion (2.5-3.5s) -> Complete
    const t1 = setTimeout(() => setPhase('meteor'), 1200);
    const t2 = setTimeout(() => setPhase('explosion'), 2600);
    const t3 = setTimeout(() => onComplete(), 3600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="summon-fullscreen-overlay">
      {/* Skip Animation Button */}
      <button className="skip-anim-btn" onClick={onComplete}>
        <FastForward size={16} />
        <span>跳过动画</span>
      </button>

      {/* Dynamic Background Effect depending on phase */}
      <div className="summon-stage-wrapper">
        {/* Rotating Magic Circle / Constellation Seal */}
        <div className={`summon-seal-circle ${phase}`} style={{ borderColor: mainColor, boxShadow: `0 0 50px ${mainColor}` }}>
          <div className="inner-seal-pattern">⚖️ 📐 🌌 📜 ✨</div>
        </div>

        {/* Meteor Ray Falling */}
        {phase === 'meteor' && (
          <div className="meteor-streak-container">
            <div className="meteor-streak" style={{ background: `linear-gradient(to bottom, transparent, ${mainColor}, #ffffff)` }} />
          </div>
        )}

        {/* Explosion Shockwave */}
        {phase === 'explosion' && (
          <div className="explosion-burst" style={{ background: `radial-gradient(circle, ${mainColor} 0%, rgba(0,0,0,0.9) 70%)` }}>
            <div className="burst-title-text">
              <Sparkles size={32} className="sparkle-spin" />
              <h2>{glowText}</h2>
            </div>
          </div>
        )}

        {/* Subtitle Message */}
        <div className="summon-subtext">
          <span>{phase === 'charging' ? '哲学天穹感应中...' : phase === 'meteor' ? '思想星辰贯穿视界！' : '真理之门大开！'}</span>
        </div>
      </div>
    </div>
  );
};
