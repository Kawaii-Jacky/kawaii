import Reveal from '../components/Reveal'
import { COUNTRIES } from '../data/countries'

export default function Hero() {
  return (
    <header className="relative min-h-[92vh] flex flex-col justify-between border-b border-sand overflow-hidden">
      {/* 顶部细条 */}
      <div className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-sand font-num text-[11px] tracking-[0.18em] uppercase text-ink/60">
        <span>Population Report</span>
        <span>1960 — 2100</span>
      </div>

      {/* 主体 */}
      <div className="px-6 md:px-12 pt-16 md:pt-24 max-w-6xl">
        <Reveal>
          <p className="font-num text-xs md:text-sm tracking-[0.25em] text-[#B08A00] mb-6">一份交互式人口结构研究报告 · 八个国家 · 六十年数据</p>
        </Reveal>
        <Reveal delay={100}>
          <h1 className="font-display font-black text-[13vw] md:text-[7.5rem] leading-[1.02] tracking-tight">
            人，决定<br />一个国家的<span className="relative inline-block">命运<svg className="absolute -bottom-2 left-0 w-full" height="10" viewBox="0 0 200 10" preserveAspectRatio="none"><path d="M0 8 Q 50 0 100 6 T 200 4" fill="none" stroke="#E8B400" strokeWidth="4" /></svg></span>
          </h1>
        </Reveal>
        <Reveal delay={220}>
          <p className="mt-10 max-w-2xl text-base md:text-lg leading-loose text-ink/80">
            为什么日本满街都是银发出租车司机，沙特却满眼年轻人？为什么中国开始发钱催生，而美国靠移民就能续命？这份报告用世界银行 1960–2024 年的真实数据和联合国 2024 年最新预测，把八个国家——中国、美国、日本、德国、沙特、英国、巴西、委内瑞拉——的人口故事讲清楚：它们怎么走到今天，政府都在出什么招，以及这一切会怎样影响经济。遇到带下划线的名词，点一下就有解释。
          </p>
        </Reveal>
        <Reveal delay={320}>
          <div className="mt-10 flex flex-wrap gap-2">
            {COUNTRIES.map(c => (
              <span key={c.code} className="inline-flex items-center gap-2 border border-sand px-3 py-1.5 text-sm bg-cream hover:bg-parchment transition-colors">
                <i className="w-2.5 h-2.5 inline-block" style={{ background: c.color }} />
                {c.name}
              </span>
            ))}
          </div>
        </Reveal>
      </div>

      {/* 底部 */}
      <div className="px-6 md:px-12 pb-10 mt-16 flex items-end justify-between">
        <div className="font-num text-[11px] tracking-[0.15em] text-ink/50 leading-relaxed">
          数据来源 · 世界银行 WDI / 联合国 WPP 2024<br />往下滚动 ↓
        </div>
        <svg width="36" height="60" viewBox="0 0 36 60" className="animate-bounce">
          <rect x="1" y="1" width="34" height="58" fill="none" stroke="#2E3030" strokeWidth="2" />
          <line x1="18" y1="14" x2="18" y2="30" stroke="#2E3030" strokeWidth="2" />
        </svg>
      </div>
    </header>
  )
}
