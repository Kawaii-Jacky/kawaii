import React from 'react';
import { Sparkles, BookOpen, Swords, History, Volume2, VolumeX, PlusCircle, Award } from 'lucide-react';

export type TabType = 'gacha' | 'codex' | 'arena' | 'history';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  currency: number;
  addCurrency: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  unlockedCount: number;
  totalCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currency,
  addCurrency,
  soundEnabled,
  setSoundEnabled,
  unlockedCount,
  totalCount
}) => {
  return (
    <header className="gacha-navbar">
      {/* Brand Logo */}
      <div className="navbar-logo" onClick={() => setActiveTab('gacha')}>
        <div className="logo-icon-wrapper">
          <Sparkles className="logo-sparkle" size={24} />
        </div>
        <div className="logo-text">
          <span className="title-cn">哲学殿堂 · 思想祈愿</span>
          <span className="title-en">PHILOSOPHY GACHA & ARENA</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="navbar-tabs">
        <button
          className={`nav-tab ${activeTab === 'gacha' ? 'active' : ''}`}
          onClick={() => setActiveTab('gacha')}
        >
          <Sparkles size={18} />
          <span>思想祈愿</span>
          <span className="badge-glow">UP</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'codex' ? 'active' : ''}`}
          onClick={() => setActiveTab('codex')}
        >
          <BookOpen size={18} />
          <span>哲学家图鉴</span>
          <span className="count-pill">{unlockedCount}/{totalCount}</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'arena' ? 'active' : ''}`}
          onClick={() => setActiveTab('arena')}
        >
          <Swords size={18} />
          <span>辩论擂台</span>
        </button>

        <button
          className={`nav-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          <span>祈愿记录</span>
        </button>
      </nav>

      {/* Right Controls: Currency & Sound */}
      <div className="navbar-actions">
        {/* Wisdom Currency Box */}
        <div className="currency-box" title="智慧原石 - 用于进行思想祈愿">
          <Award className="currency-icon" size={18} />
          <span className="currency-amount">{currency.toLocaleString()}</span>
          <button className="add-currency-btn" onClick={addCurrency} title="补充 1600 智慧原石">
            <PlusCircle size={16} />
          </button>
        </div>

        {/* Mute/Sound Toggle */}
        <button
          className="sound-toggle-btn"
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? '音效已开启' : '音效已关闭'}
        >
          {soundEnabled ? <Volume2 size={20} className="sound-icon active" /> : <VolumeX size={20} className="sound-icon" />}
        </button>
      </div>
    </header>
  );
};
