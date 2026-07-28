import React, { useState } from 'react';
import type { GachaPullResult } from '../types/philosopher';
import { Star, Sparkles, RotateCw, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GachaResultModalProps {
  results: GachaPullResult[];
  onClose: () => void;
  onPullSingle: () => void;
  onPullTen: () => void;
  currency: number;
}

export const GachaResultModal: React.FC<GachaResultModalProps> = ({
  results,
  onClose,
  onPullSingle,
  onPullTen,
  currency
}) => {
  const isTenPull = results.length > 1;
  const [selectedResult, setSelectedResult] = useState<GachaPullResult | null>(
    isTenPull ? null : results[0]
  );

  // Trigger confetti if 5-star was pulled
  React.useEffect(() => {
    if (results.some(r => r.philosopher.rarity === '5star')) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [results]);

  return (
    <div className="gacha-result-overlay">
      <div className="result-container">
        {/* Header Title */}
        <div className="result-header">
          <div className="result-title-badge">
            <Sparkles className="sparkle-icon" size={20} />
            <span>思想祈愿结果公示</span>
          </div>
          <p className="result-subtitle">已成功引导哲学灵魂交汇！</p>
        </div>

        {/* Display Single Full-card Detail if selected or single pull */}
        {selectedResult ? (
          <div className="single-detail-view">
            {/* Card Frame */}
            <div
              className={`single-card-hero star-${selectedResult.philosopher.rarity}`}
              style={{
                borderColor: selectedResult.philosopher.color,
                boxShadow: `0 0 30px ${selectedResult.philosopher.glowColor}`
              }}
            >
              {selectedResult.isNew && <div className="new-acquired-badge">NEW! 新解锁</div>}

              {/* Star Rating Header */}
              <div className="stars-row">
                {[...Array(selectedResult.philosopher.rarity === '5star' ? 5 : selectedResult.philosopher.rarity === '4star' ? 4 : 3)].map((_, i) => (
                  <Star
                    key={i}
                    size={22}
                    fill={selectedResult.philosopher.rarity === '5star' ? '#f59e0b' : selectedResult.philosopher.rarity === '4star' ? '#a855f7' : '#3b82f6'}
                    color={selectedResult.philosopher.rarity === '5star' ? '#f59e0b' : selectedResult.philosopher.rarity === '4star' ? '#a855f7' : '#3b82f6'}
                  />
                ))}
              </div>

              {/* Character Splash Vector */}
              <div className="single-card-splash">
                <div className="portrait-icon">{selectedResult.philosopher.portraitPattern}</div>
                <div className="splash-name">{selectedResult.philosopher.name}</div>
                <div className="splash-en-name">{selectedResult.philosopher.enName}</div>
                <div className="splash-faction" style={{ color: selectedResult.philosopher.color }}>
                  {selectedResult.philosopher.factionName}
                </div>
              </div>

              {/* Character Quote Box */}
              <div className="single-card-quote">
                <p className="quote-body">“{selectedResult.philosopher.quote}”</p>
                <span className="quote-book">—— {selectedResult.philosopher.quoteSource}</span>
              </div>

              {/* Voice Line / Speech Bubble */}
              <div className="voice-line-chip">
                <span>💬 "{selectedResult.philosopher.voiceLine}"</span>
              </div>
            </div>

            {isTenPull && (
              <button className="back-to-grid-btn" onClick={() => setSelectedResult(null)}>
                ← 返回 10 连抽全景网格
              </button>
            )}
          </div>
        ) : (
          /* 10-Pull Grid Display */
          <div className="ten-pull-grid">
            {results.map((res, index) => {
              const p = res.philosopher;
              const starCount = p.rarity === '5star' ? 5 : p.rarity === '4star' ? 4 : 3;

              return (
                <div
                  key={index}
                  className={`grid-card-item star-${p.rarity} ${res.isNew ? 'is-new' : ''}`}
                  onClick={() => setSelectedResult(res)}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  {res.isNew && <span className="mini-new-tag">NEW!</span>}

                  <div className="grid-card-pattern">{p.portraitPattern}</div>

                  <div className="grid-card-stars">
                    {[...Array(starCount)].map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        fill={p.rarity === '5star' ? '#f59e0b' : p.rarity === '4star' ? '#a855f7' : '#3b82f6'}
                        color={p.rarity === '5star' ? '#f59e0b' : p.rarity === '4star' ? '#a855f7' : '#3b82f6'}
                      />
                    ))}
                  </div>

                  <div className="grid-card-name">{p.name}</div>
                  <div className="grid-card-faction">{p.factionName.split('/')[0]}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Actions */}
        <div className="result-footer-actions">
          <button className="result-action-btn btn-confirm" onClick={onClose}>
            <CheckCircle size={18} />
            <span>确认收下</span>
          </button>

          <button
            className="result-action-btn btn-again"
            onClick={isTenPull ? onPullTen : onPullSingle}
            disabled={currency < (isTenPull ? 1600 : 160)}
          >
            <RotateCw size={18} />
            <span>再祈愿 {isTenPull ? '10 次' : '1 次'} ({isTenPull ? '1600' : '160'} 原石)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
