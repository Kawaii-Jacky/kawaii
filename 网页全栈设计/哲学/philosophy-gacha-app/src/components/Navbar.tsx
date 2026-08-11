import React from 'react';
import {
  ArrowLeft,
  BookOpen,
  Diamond,
  History,
  Home,
  Plus,
  Sparkles,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';

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

const NAV_ITEMS = [
  { id: 'gacha', label: '思想寻访', icon: Sparkles },
  { id: 'codex', label: '哲学图鉴', icon: BookOpen },
  { id: 'arena', label: '辩论擂台', icon: Swords },
  { id: 'history', label: '寻访记录', icon: History },
] as const;

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currency,
  addCurrency,
  soundEnabled,
  setSoundEnabled,
  unlockedCount,
  totalCount,
}) => (
  <header className={activeTab === 'gacha' ? 'gacha-navbar gacha-navbar-immersive' : 'gacha-navbar'}>
    <button className="nav-square-button" aria-label="返回"><ArrowLeft size={19} /></button>
    <button className="navbar-logo" onClick={() => setActiveTab('gacha')}>
      <span className="logo-mark"><Home size={15} /></span>
      <span className="logo-text"><b>思想寻访</b><small>PHILOSOPHY ARCHIVE</small></span>
    </button>

    <nav className="navbar-tabs" aria-label="主导航">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button key={id} className={activeTab === id ? 'nav-tab active' : 'nav-tab'} onClick={() => setActiveTab(id)}>
          <Icon size={16} />
          <span>{label}</span>
          {id === 'gacha' && <em>UP</em>}
          {id === 'codex' && <small>{unlockedCount}/{totalCount}</small>}
        </button>
      ))}
    </nav>

    <div className="navbar-actions">
      <div className="currency-box" title="思想棱镜">
        <Diamond size={15} fill="currentColor" />
        <strong>{currency.toLocaleString()}</strong>
        <button onClick={addCurrency} aria-label="补充思想棱镜"><Plus size={15} /></button>
      </div>
      <button className="sound-toggle-btn" onClick={() => setSoundEnabled(!soundEnabled)} aria-label={soundEnabled ? '关闭声音' : '开启声音'}>
        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </div>
  </header>
);
