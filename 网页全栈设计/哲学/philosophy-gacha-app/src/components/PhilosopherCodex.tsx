import React, { useState } from 'react';
import type { Philosopher } from '../types/philosopher';
import { PHILOSOPHERS } from '../data/philosophers';
import { FACTIONS } from '../data/factions';
import { RadarChart } from './RadarChart';
import { Star, Lock, Swords, Search, BookOpen, Quote, Shield } from 'lucide-react';

interface PhilosopherCodexProps {
  unlockedIds: Set<string>;
  onSelectForDebate: (p: Philosopher, corner: 'a' | 'b') => void;
}

export const PhilosopherCodex: React.FC<PhilosopherCodexProps> = ({
  unlockedIds,
  onSelectForDebate
}) => {
  const [selectedFaction, setSelectedFaction] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePhilosopher, setActivePhilosopher] = useState<Philosopher | null>(null);

  // Filter philosophers based on criteria
  const filteredList = PHILOSOPHERS.filter((p) => {
    if (selectedFaction !== 'all' && p.factionId !== selectedFaction) return false;
    if (selectedRarity !== 'all' && p.rarity !== selectedRarity) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.factionName.toLowerCase().includes(q);
    }
    return true;
  });

  const unlockedCount = PHILOSOPHERS.filter(p => unlockedIds.has(p.id)).length;

  return (
    <div className="codex-container">
      {/* Top Header Summary & Search Bar */}
      <div className="codex-header">
        <div className="codex-title-group">
          <h2><BookOpen className="inline-icon" size={24} /> 哲学家思想图鉴 (PHILOSOPHER CODEX)</h2>
          <p>解锁并收集历史上伟大哲学家，探究其先验范畴、立场雷达与辩论法则。</p>
        </div>

        <div className="codex-progress-pill">
          <span>图鉴完成度：</span>
          <strong>{unlockedCount} / {PHILOSOPHERS.length}</strong>
          <div className="codex-progress-bg">
            <div
              className="codex-progress-fill"
              style={{ width: `${(unlockedCount / PHILOSOPHERS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="codex-filter-bar">
        {/* Search Input */}
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="搜索哲学家、著作、称号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Faction Filter */}
        <div className="filter-group">
          <button
            className={`filter-chip ${selectedFaction === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFaction('all')}
          >
            全部阵营
          </button>
          {Object.values(FACTIONS).map((f) => (
            <button
              key={f.id}
              className={`filter-chip ${selectedFaction === f.id ? 'active' : ''}`}
              onClick={() => setSelectedFaction(f.id)}
              style={{
                borderColor: selectedFaction === f.id ? f.color : undefined
              }}
            >
              <span>{f.icon} {f.name.split('/')[0]}</span>
            </button>
          ))}
        </div>

        {/* Rarity Filter */}
        <div className="filter-group rarity-group">
          <button
            className={`filter-chip ${selectedRarity === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedRarity('all')}
          >
            全部星级
          </button>
          <button
            className={`filter-chip rarity-tag-5 ${selectedRarity === '5star' ? 'active' : ''}`}
            onClick={() => setSelectedRarity('5star')}
          >
            5★ 思想巨擘
          </button>
          <button
            className={`filter-chip rarity-tag-4 ${selectedRarity === '4star' ? 'active' : ''}`}
            onClick={() => setSelectedRarity('4star')}
          >
            4★ 杰出学者
          </button>
          <button
            className={`filter-chip rarity-tag-3 ${selectedRarity === '3star' ? 'active' : ''}`}
            onClick={() => setSelectedRarity('3star')}
          >
            3★ 启蒙思客
          </button>
        </div>
      </div>

      {/* Philosophers Grid */}
      <div className="codex-grid">
        {filteredList.map((p) => {
          const isUnlocked = unlockedIds.has(p.id);
          const starCount = p.rarity === '5star' ? 5 : p.rarity === '4star' ? 4 : 3;

          return (
            <div
              key={p.id}
              className={`codex-card star-${p.rarity} ${isUnlocked ? 'unlocked' : 'locked'}`}
              onClick={() => isUnlocked && setActivePhilosopher(p)}
              style={{
                borderColor: isUnlocked ? p.color : 'rgba(255,255,255,0.1)'
              }}
            >
              {!isUnlocked && (
                <div className="lock-overlay">
                  <Lock size={28} />
                  <span>未解锁 (可通过抽卡祈愿获得)</span>
                </div>
              )}

              {/* Card Header & Stars */}
              <div className="card-top-row">
                <span className="faction-badge" style={{ backgroundColor: p.color + '22', color: p.color }}>
                  {p.factionName.split('/')[0]}
                </span>
                <div className="card-stars">
                  {[...Array(starCount)].map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      fill={p.rarity === '5star' ? '#f59e0b' : p.rarity === '4star' ? '#a855f7' : '#3b82f6'}
                      color={p.rarity === '5star' ? '#f59e0b' : p.rarity === '4star' ? '#a855f7' : '#3b82f6'}
                    />
                  ))}
                </div>
              </div>

              {/* Portrait & Name */}
              <div className="card-body">
                <div className="card-symbol-avatar">{p.portraitPattern}</div>
                <h3 className="card-philosopher-name">{p.name}</h3>
                <span className="card-philosopher-title">{p.title}</span>
              </div>

              {/* Quote Footer Snippet */}
              {isUnlocked && (
                <div className="card-quote-snippet">
                  <p>“{p.quote.slice(0, 32)}...”</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Philosopher Detail Modal */}
      {activePhilosopher && (
        <div className="modal-backdrop" onClick={() => setActivePhilosopher(null)}>
          <div className="philosopher-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActivePhilosopher(null)}>✕</button>

            <div className="detail-modal-layout">
              {/* Left Column: Portrait & Basic Specs */}
              <div className="modal-left-panel">
                <div
                  className="modal-portrait-card"
                  style={{
                    background: activePhilosopher.splashArt,
                    borderColor: activePhilosopher.color
                  }}
                >
                  <div className="modal-symbol-large">{activePhilosopher.portraitPattern}</div>
                  <h2>{activePhilosopher.name}</h2>
                  <span className="modal-en-name">{activePhilosopher.enName}</span>
                  <span className="modal-title-tag">{activePhilosopher.title}</span>

                  <div className="modal-stars-row">
                    {[...Array(activePhilosopher.rarity === '5star' ? 5 : activePhilosopher.rarity === '4star' ? 4 : 3)].map((_, i) => (
                      <Star key={i} size={16} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                </div>

                {/* Team Selection CTA Buttons */}
                <div className="modal-team-cta-box">
                  <h4><Swords size={16} /> 辩论编队派遣</h4>
                  <div className="team-cta-btns">
                    <button
                      className="cta-corner-btn corner-a"
                      onClick={() => {
                        onSelectForDebate(activePhilosopher, 'a');
                        setActivePhilosopher(null);
                      }}
                    >
                      出战正方 (红角)
                    </button>
                    <button
                      className="cta-corner-btn corner-b"
                      onClick={() => {
                        onSelectForDebate(activePhilosopher, 'b');
                        setActivePhilosopher(null);
                      }}
                    >
                      出战反方 (蓝角)
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Radar Chart, Biography & Quote */}
              <div className="modal-right-panel">
                {/* Quote Box */}
                <div className="modal-quote-block">
                  <Quote size={20} className="quote-icon" />
                  <p className="quote-content">“{activePhilosopher.quote}”</p>
                  <span className="quote-ref">—— {activePhilosopher.quoteSource}</span>
                </div>

                {/* Ideology 5-Dim Radar */}
                <div className="modal-radar-section">
                  <h4 className="section-heading"><Shield size={16} /> 意识形态 5 维雷达图</h4>
                  <RadarChart data={activePhilosopher.radar} color={activePhilosopher.color} size={190} />
                </div>

                {/* Biography & Philosophy */}
                <div className="modal-bio-section">
                  <h4 className="section-heading"><BookOpen size={16} /> 生平思想纲要</h4>
                  <p>{activePhilosopher.biography}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
