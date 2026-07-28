import React from 'react';
import type { GachaHistoryItem } from '../types/philosopher';
import { History, Star, Sparkles } from 'lucide-react';

interface GachaHistoryModalProps {
  history: GachaHistoryItem[];
  pity5Star: number;
  pity4Star: number;
}

export const GachaHistoryModal: React.FC<GachaHistoryModalProps> = ({
  history,
  pity5Star,
  pity4Star
}) => {
  return (
    <div className="history-container">
      <div className="history-header">
        <h2><History className="inline-icon" size={24} /> 祈愿历史与保底机制统计 (GACHA HISTORY)</h2>
        <p>记录近期的思想祈愿轨迹、抽卡星级公示与保底分布。</p>
      </div>

      {/* Pity Stats Summary Cards */}
      <div className="pity-stats-grid">
        <div className="pity-stat-card card-fivestar">
          <div className="stat-icon-wrapper">
            <Star size={24} fill="#f59e0b" color="#f59e0b" />
          </div>
          <div className="stat-content">
            <span className="stat-label">5★ 思想巨擘已累计</span>
            <strong className="stat-value">{pity5Star} / 90 抽</strong>
            <span className="stat-sub">90抽内必定出现 5★ UP 哲学家 (75抽起概率递增)</span>
          </div>
        </div>

        <div className="pity-stat-card card-fourstar">
          <div className="stat-icon-wrapper">
            <Star size={24} fill="#a855f7" color="#a855f7" />
          </div>
          <div className="stat-content">
            <span className="stat-label">4★ 杰出学者保底进度</span>
            <strong className="stat-value">{pity4Star} / 10 抽</strong>
            <span className="stat-sub">10抽内必定出现 4★ 或更高品质哲学家</span>
          </div>
        </div>

        <div className="pity-stat-card card-total">
          <div className="stat-icon-wrapper">
            <Sparkles size={24} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <span className="stat-label">总祈愿次数</span>
            <strong className="stat-value">{history.length} 次</strong>
            <span className="stat-sub">真理探索不息，智慧原石恒久</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="history-table-container">
        {history.length === 0 ? (
          <div className="empty-history-text">
            <span>暂无祈愿记录，请前往【思想祈愿】进行首次抽取！</span>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>祈愿时间</th>
                <th>获得的哲学家</th>
                <th>星级品质</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 50).map((item, index) => (
                <tr key={index} className={`history-row star-${item.rarity}`}>
                  <td className="time-col">{item.timestamp}</td>
                  <td className="name-col">
                    <strong>{item.philosopherName}</strong>
                  </td>
                  <td className="rarity-col">
                    <span className={`rarity-badge star-${item.rarity}`}>
                      {[...Array(item.rarity === '5star' ? 5 : item.rarity === '4star' ? 4 : 3)].map((_, i) => (
                        <Star key={i} size={12} fill="currentColor" color="currentColor" />
                      ))}
                      <span className="rarity-text">
                        {item.rarity === '5star' ? '5★ 巨擘' : item.rarity === '4star' ? '4★ 学者' : '3★ 思客'}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
