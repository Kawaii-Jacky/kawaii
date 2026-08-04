import React, { useState } from 'react';
import { Navbar, type TabType } from './components/Navbar';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { GachaBanner } from './components/GachaBanner';
import { SummonAnimation } from './components/SummonAnimation';
import { GachaResultModal } from './components/GachaResultModal';
import { PhilosopherCodex } from './components/PhilosopherCodex';
import { DebateArena } from './components/DebateArena';
import { GachaHistoryModal } from './components/GachaHistoryModal';
import { GachaDetailsModal } from './components/GachaDetailsModal';

import { PHILOSOPHERS } from './data/philosophers';
import type { Philosopher, GachaPullResult, GachaHistoryItem } from './types/philosopher';
import { performSinglePull, performTenPull } from './utils/gachaEngine';

export const App: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('gacha');
  const [currency, setCurrency] = useState<number>(8000); // Initial 8000 Wisdom Prisms
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(
    new Set(['kant', 'nietzsche', 'marx', 'plato']) // Default unlocked starters
  );
  const [pity5Star, setPity5Star] = useState<number>(12);
  const [pity4Star, setPity4Star] = useState<number>(3);
  const [selectedBannerId, setSelectedBannerId] = useState<string>('banner-kant');
  const [history, setHistory] = useState<GachaHistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals & Animations state
  const [animatingResults, setAnimatingResults] = useState<GachaPullResult[] | null>(null);
  const [resultModalData, setResultModalData] = useState<GachaPullResult[] | null>(null);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);

  // Debate arena team selections
  const [debaterA, setDebaterA] = useState<Philosopher>(PHILOSOPHERS[0]); // Kant
  const [debaterB, setDebaterB] = useState<Philosopher>(PHILOSOPHERS[1]); // Nietzsche

  // Handle single pull (160 currency)
  const handlePullSingle = () => {
    if (currency < 160) return;
    setCurrency((prev) => prev - 160);

    const { result, newPity5Star, newPity4Star } = performSinglePull(
      selectedBannerId,
      pity5Star,
      pity4Star,
      new Set(unlockedIds)
    );

    setPity5Star(newPity5Star);
    setPity4Star(newPity4Star);

    // Update unlocked set
    const updatedUnlocked = new Set(unlockedIds);
    updatedUnlocked.add(result.philosopher.id);
    setUnlockedIds(updatedUnlocked);

    // Add to history
    const historyItem: GachaHistoryItem = {
      timestamp: new Date().toLocaleTimeString(),
      philosopherId: result.philosopher.id,
      philosopherName: result.philosopher.name,
      rarity: result.philosopher.rarity
    };
    setHistory((prev) => [historyItem, ...prev]);

    // Launch cutscene animation
    setAnimatingResults([result]);
  };

  // Handle 10-pull (1600 currency)
  const handlePullTen = () => {
    if (currency < 1600) return;
    setCurrency((prev) => prev - 1600);

    const { results, newPity5Star, newPity4Star } = performTenPull(
      selectedBannerId,
      pity5Star,
      pity4Star,
      new Set(unlockedIds)
    );

    setPity5Star(newPity5Star);
    setPity4Star(newPity4Star);

    // Update unlocked set
    const updatedUnlocked = new Set(unlockedIds);
    results.forEach((r) => updatedUnlocked.add(r.philosopher.id));
    setUnlockedIds(updatedUnlocked);

    // Add to history
    const newItems: GachaHistoryItem[] = results.map((r) => ({
      timestamp: new Date().toLocaleTimeString(),
      philosopherId: r.philosopher.id,
      philosopherName: r.philosopher.name,
      rarity: r.philosopher.rarity
    }));
    setHistory((prev) => [...newItems, ...prev]);

    // Launch cutscene animation
    setAnimatingResults(results);
  };

  // Called when summon cutscene finishes
  const handleAnimationComplete = () => {
    setResultModalData(animatingResults);
    setAnimatingResults(null);
  };

  // Select for debate from Codex
  const handleSelectForDebate = (p: Philosopher, corner: 'a' | 'b') => {
    if (corner === 'a') setDebaterA(p);
    else setDebaterB(p);
    setActiveTab('arena');
  };

  return (
    <div className="app-root-shell">
      {/* Background Interactive Particle Canvas */}
      <BackgroundCanvas />

      {/* Header Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        addCurrency={() => setCurrency((prev) => prev + 1600)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        unlockedCount={unlockedIds.size}
        totalCount={PHILOSOPHERS.length}
      />

      {/* Main Content Body */}
      <main className={`app-main-content ${activeTab === 'gacha' ? 'gacha-mode' : ''}`}>
        {activeTab === 'gacha' && (
          <GachaBanner
            selectedBannerId={selectedBannerId}
            setSelectedBannerId={setSelectedBannerId}
            onPullSingle={handlePullSingle}
            onPullTen={handlePullTen}
            pity5Star={pity5Star}
            pity4Star={pity4Star}
            currency={currency}
            onShowDetails={() => setShowRulesModal(true)}
          />
        )}

        {activeTab === 'codex' && (
          <PhilosopherCodex
            unlockedIds={unlockedIds}
            onSelectForDebate={handleSelectForDebate}
          />
        )}

        {activeTab === 'arena' && (
          <DebateArena
            debaterA={debaterA}
            debaterB={debaterB}
            setDebaterA={setDebaterA}
            setDebaterB={setDebaterB}
            unlockedIds={unlockedIds}
          />
        )}

        {activeTab === 'history' && (
          <GachaHistoryModal
            history={history}
            pity5Star={pity5Star}
            pity4Star={pity4Star}
          />
        )}
      </main>

      {/* Fullscreen Cutscene Animation */}
      {animatingResults && (
        <SummonAnimation
          results={animatingResults}
          onComplete={handleAnimationComplete}
        />
      )}

      {/* Gacha Result Modal */}
      {resultModalData && (
        <GachaResultModal
          results={resultModalData}
          onClose={() => setResultModalData(null)}
          onPullSingle={handlePullSingle}
          onPullTen={handlePullTen}
          currency={currency}
        />
      )}

      {/* Rules Modal */}
      {showRulesModal && (
        <GachaDetailsModal onClose={() => setShowRulesModal(false)} />
      )}
    </div>
  );
};
export default App;
