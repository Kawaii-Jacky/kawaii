import React, { useState } from 'react';
import type { Philosopher, DebateMessage } from '../types/philosopher';
import { PHILOSOPHERS, PRESET_TOPICS } from '../data/philosophers';
import { Swords, RefreshCw, Zap, Sparkles, Play, MessageSquare } from 'lucide-react';

interface DebateArenaProps {
  debaterA: Philosopher;
  debaterB: Philosopher;
  setDebaterA: (p: Philosopher) => void;
  setDebaterB: (p: Philosopher) => void;
  unlockedIds: Set<string>;
}

export const DebateArena: React.FC<DebateArenaProps> = ({
  debaterA,
  debaterB,
  setDebaterA,
  setDebaterB,
  unlockedIds
}) => {
  const [topicInput, setTopicInput] = useState<string>('最低工资制度是否符合正义？');
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [showSelectModalCorner, setShowSelectModalCorner] = useState<'a' | 'b' | null>(null);

  // Calculate Ideological Conflict Score (0-100%)
  const calculateConflictScore = (p1: Philosopher, p2: Philosopher) => {
    const r1 = p1.radar;
    const r2 = p2.radar;
    const dist = Math.sqrt(
      Math.pow(r1.rationality - r2.rationality, 2) +
      Math.pow(r1.freedom - r2.freedom, 2) +
      Math.pow(r1.equality - r2.equality, 2) +
      Math.pow(r1.tradition - r2.tradition, 2) +
      Math.pow(r1.revolution - r2.revolution, 2)
    );
    const maxDist = Math.sqrt(5 * Math.pow(100, 2));
    return Math.min(99, Math.round((dist / maxDist) * 160 + 20));
  };

  const conflictScore = calculateConflictScore(debaterA, debaterB);

  // Generate simulated AI debate responses
  const startDebate = (topicText: string) => {
    if (!topicText.trim()) return;
    setIsDebating(true);
    setMessages([]);

    const timestamp = new Date().toLocaleTimeString();

    // 1. Host Message
    const msgHost: DebateMessage = {
      id: '1',
      senderId: 'user',
      senderName: '主持人 (你)',
      avatarColor: '#3b82f6',
      role: 'host',
      content: `各位，今天辩论的核心议题是：【${topicText}】。请正方 ${debaterA.name} 与 反方 ${debaterB.name} 分别从各自的理论体系阐述立场！`,
      timestamp
    };

    // 2. Debater A Opening Statement
    const msgA: DebateMessage = {
      id: '2',
      senderId: debaterA.id,
      senderName: debaterA.name,
      avatarColor: debaterA.color,
      role: 'debater_a',
      content: `从我的理论视角来看，【${topicText.slice(0, 10)}...】必须置于“${debaterA.title}”的原则之下审视！正如我在《${debaterA.quoteSource}》中所讲：“${debaterA.quote}”。我们的核心准则在于理性的普遍性与基本道德秩序，绝不可被眼前的短视利益所蒙蔽！`,
      citation: debaterA.quoteSource,
      timestamp
    };

    // 3. Debater B Counter Rebuttal
    const msgB: DebateMessage = {
      id: '3',
      senderId: debaterB.id,
      senderName: debaterB.name,
      avatarColor: debaterB.color,
      role: 'debater_b',
      content: `${debaterA.name}的论述存在着根本性的逻辑建构缺陷！你试图用抽象先验的普遍原则去硬套错综复杂的现实。在《${debaterB.quoteSource}》中我已经指出：“${debaterB.quote}”。任何离开真实历史条件与现实意志的教条，最终都会退化为平庸的虚妄！`,
      citation: debaterB.quoteSource,
      timestamp
    };

    // 4. Round 2 - Debater A Deepening Rebuttal
    const msgA2: DebateMessage = {
      id: '4',
      senderId: debaterA.id,
      senderName: debaterA.name,
      avatarColor: debaterA.color,
      role: 'debater_a',
      content: `这正是你的偏颇之处，${debaterB.name}！如果取消了道德绝对律或自然法则的锚定，社会规则便会陷入彻底的相对主义与无序混乱。自由的前提恰恰是对理性和自律的绝对恪守！`,
      timestamp
    };

    // Simulate progressive streaming effect
    setMessages([msgHost]);

    setTimeout(() => {
      setMessages((prev) => [...prev, msgA]);
    }, 1000);

    setTimeout(() => {
      setMessages((prev) => [...prev, msgB]);
    }, 2200);

    setTimeout(() => {
      setMessages((prev) => [...prev, msgA2]);
      setIsDebating(false);
    }, 3600);
  };

  // Add next round of debate
  const continueDebateRound = () => {
    setIsDebating(true);
    const timestamp = new Date().toLocaleTimeString();

    const msgB2: DebateMessage = {
      id: String(Date.now()),
      senderId: debaterB.id,
      senderName: debaterB.name,
      avatarColor: debaterB.color,
      role: 'debater_b',
      content: `再次强调：唯有关注实践、关注具体个体的生存困境或生产力发展，辩论才有现实意义！你所谓的普遍道德律在饥饿与失业面前毫无力量！`,
      timestamp
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, msgB2]);
      setIsDebating(false);
    }, 1200);
  };

  const unlockedPhilosophers = PHILOSOPHERS.filter(p => unlockedIds.has(p.id));

  return (
    <div className="arena-container">
      {/* Top Banner: Duel Face-off */}
      <div className="arena-duel-header">
        {/* Debater A (Red Corner) */}
        <div className="corner-card corner-a" style={{ borderColor: debaterA.color }}>
          <div className="corner-tag">【正方 · 红角】</div>
          <div className="corner-avatar" style={{ background: debaterA.avatarBg }}>
            {debaterA.portraitPattern}
          </div>
          <div className="corner-info">
            <h3>{debaterA.name}</h3>
            <span>{debaterA.title}</span>
            <div className="corner-faction">{debaterA.factionName}</div>
          </div>
          <button
            className="change-debater-btn"
            onClick={() => setShowSelectModalCorner('a')}
          >
            切换正方
          </button>
        </div>

        {/* VS Conflict Badge */}
        <div className="vs-badge-container">
          <div className="vs-circle">
            <Swords size={32} className="swords-icon" />
            <span>VS</span>
          </div>
          <div className="conflict-indicator">
            <Zap size={14} className="zap-icon" />
            <span>思想碰撞度: <strong>{conflictScore}%</strong></span>
          </div>
        </div>

        {/* Debater B (Blue Corner) */}
        <div className="corner-card corner-b" style={{ borderColor: debaterB.color }}>
          <div className="corner-tag">【反方 · 蓝角】</div>
          <div className="corner-avatar" style={{ background: debaterB.avatarBg }}>
            {debaterB.portraitPattern}
          </div>
          <div className="corner-info">
            <h3>{debaterB.name}</h3>
            <span>{debaterB.title}</span>
            <div className="corner-faction">{debaterB.factionName}</div>
          </div>
          <button
            className="change-debater-btn"
            onClick={() => setShowSelectModalCorner('b')}
          >
            切换反方
          </button>
        </div>
      </div>

      {/* Preset Topics Quick Bar */}
      <div className="preset-topics-bar">
        <span className="preset-label"><Sparkles size={14} /> 快捷热门辩题：</span>
        <div className="preset-chips">
          {PRESET_TOPICS.map((t) => (
            <button
              key={t.id}
              className="preset-chip"
              onClick={() => {
                setTopicInput(t.title);
                startDebate(t.title);
              }}
            >
              {t.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Debate Messages Chat Stream */}
      <div className="debate-chat-box">
        {messages.length === 0 ? (
          <div className="empty-debate-placeholder">
            <MessageSquare size={48} className="placeholder-icon" />
            <h3>辩论台准备就绪！</h3>
            <p>在下方输入或选择一个议题，点击“发起哲学对决”，让 {debaterA.name} 与 {debaterB.name} 开展辩论。</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((m) => {
              const isHost = m.role === 'host';
              const isA = m.role === 'debater_a';

              return (
                <div
                  key={m.id}
                  className={`message-bubble-wrapper ${isHost ? 'host-msg' : isA ? 'a-msg' : 'b-msg'}`}
                >
                  <div className="msg-sender-header">
                    <span className="msg-avatar" style={{ backgroundColor: m.avatarColor }}>
                      {isHost ? '🎙️' : isA ? debaterA.portraitPattern : debaterB.portraitPattern}
                    </span>
                    <strong className="msg-sender-name" style={{ color: m.avatarColor }}>
                      {m.senderName}
                    </strong>
                    <span className="msg-time">{m.timestamp}</span>
                  </div>

                  <div className="msg-content-card" style={{ borderColor: m.avatarColor + '55' }}>
                    <p>{m.content}</p>
                    {m.citation && (
                      <div className="msg-citation-tag">
                        <span>📚 引述文献：{m.citation}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isDebating && (
              <div className="typing-indicator">
                <RefreshCw size={16} className="spin-icon" />
                <span>哲学家正在检索理论体系并构思反驳逻辑...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Debate Control & Input Panel */}
      <div className="arena-input-panel">
        <div className="input-row">
          <input
            type="text"
            className="debate-topic-input"
            placeholder="请输入辩题或哲学考问（例：最低工资制度是否符合正义？...）"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startDebate(topicInput)}
          />

          <button
            className="start-debate-btn"
            onClick={() => startDebate(topicInput)}
            disabled={isDebating || !topicInput.trim()}
          >
            <Play size={18} />
            <span>发起哲学对决</span>
          </button>
        </div>

        {/* Action Controls */}
        {messages.length > 0 && (
          <div className="arena-intervene-actions">
            <button className="intervene-btn" onClick={continueDebateRound} disabled={isDebating}>
              <RefreshCw size={14} /> 再辩一轮交锋
            </button>
            <button className="intervene-btn" onClick={() => startDebate(`针对【${debaterA.name}】的论点进行深入质疑`)}>
              指定追问正方
            </button>
            <button className="intervene-btn" onClick={() => startDebate(`针对【${debaterB.name}】的论点进行深入质疑`)}>
              指定追问反方
            </button>
          </div>
        )}
      </div>

      {/* Select Debater Modal */}
      {showSelectModalCorner && (
        <div className="modal-backdrop" onClick={() => setShowSelectModalCorner(null)}>
          <div className="select-debater-modal" onClick={(e) => e.stopPropagation()}>
            <h3>选择【{showSelectModalCorner === 'a' ? '正方 (红角)' : '反方 (蓝角)'}】哲学家</h3>
            <p className="sub-text">从已解锁的图鉴中挑选哲学大师登台辩论：</p>

            <div className="select-philosophers-grid">
              {unlockedPhilosophers.map((p) => (
                <div
                  key={p.id}
                  className="select-p-card"
                  onClick={() => {
                    if (showSelectModalCorner === 'a') setDebaterA(p);
                    else setDebaterB(p);
                    setShowSelectModalCorner(null);
                  }}
                >
                  <div className="p-icon">{p.portraitPattern}</div>
                  <div className="p-name">{p.name}</div>
                  <div className="p-faction">{p.factionName.split('/')[0]}</div>
                </div>
              ))}
            </div>

            <button className="modal-close-pill" onClick={() => setShowSelectModalCorner(null)}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
