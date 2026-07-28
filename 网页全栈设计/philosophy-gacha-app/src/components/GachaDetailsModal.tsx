import React from 'react';
import { Sparkles } from 'lucide-react';

interface GachaDetailsModalProps {
  onClose: () => void;
}

export const GachaDetailsModal: React.FC<GachaDetailsModalProps> = ({ onClose }) => {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="gacha-rules-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Sparkles size={20} className="inline-icon" /> 思想祈愿规则与概率公示</h3>
          <button className="close-x-btn" onClick={onClose}>✕</button>
        </div>

        <div className="rules-content-body">
          <section className="rules-section">
            <h4>1. 祈愿概率机制</h4>
            <ul>
              <li><strong style={{ color: '#f59e0b' }}>5★ 思想巨擘基础概率：</strong> 1.60% (含保底综合概率 2.55%)。</li>
              <li><strong style={{ color: '#a855f7' }}>4★ 杰出学者基础概率：</strong> 13.00% (含保底综合概率 14.50%)。</li>
              <li><strong style={{ color: '#3b82f6' }}>3★ 启蒙思客基础概率：</strong> 85.40%。</li>
            </ul>
          </section>

          <section className="rules-section">
            <h4>2. 保底与概率提升机制 (Pity System)</h4>
            <ul>
              <li><strong>【90抽硬保底】</strong> 最多 90 次祈愿内必定获得 5★ 哲学家。</li>
              <li><strong>【75抽软保底】</strong> 当累计未获得 5★ 达 74 次后，第 75 次起每次祈愿获得 5★ 的概率大幅提升。</li>
              <li><strong>【10抽 4★ 保底】</strong> 最多 10 次祈愿内必定获得 4★ 或更高品质哲学家。</li>
              <li><strong>【50% 当期 UP】</strong> 获得 5★ 哲学家时，有 50% 概率为当期 Banner 封面 UP 哲学家！</li>
            </ul>
          </section>

          <section className="rules-section">
            <h4>3. 解锁与重复处理</h4>
            <p>首次获得某位哲学家将自动加入【哲学家图鉴】并解锁其 5 维雷达图与辩论编队资格。重复获得将转换为 100 智慧原石作为思想折返。</p>
          </section>
        </div>

        <div className="modal-footer">
          <button className="confirm-btn" onClick={onClose}>知晓规则</button>
        </div>
      </div>
    </div>
  );
};
