import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Reveal, SectionHead, CountUp, SNAP } from '../components/bits'
import { durationPairs } from '../data/countries'

const MAX_YEAR = 7.5
const ROW_H = 44
const TOP = 26
const LEFT = 90
const RIGHT = 30
const W = 760
const H = TOP + durationPairs.length * ROW_H + 34

function x(year: number) {
  return LEFT + ((year - 1.5) / (MAX_YEAR - 1.5)) * (W - LEFT - RIGHT)
}

export default function Duration() {
  const chartRef = useRef<HTMLDivElement>(null)
  const inViewRaw = useInView(chartRef, { once: true, margin: '-80px' })
  const inView = SNAP || inViewRaw

  return (
    <section id="duration" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="08"
          kicker="THE GAP"
          title="时间的落差"
          lead="几乎每个国家都在「名义学制」与「实际完成年限」之间藏着一到两年的落差。合同上写 3 年，日历却常常翻到第 5 年。"
        />

        <Reveal className="paper-card p-4 md:p-8 overflow-x-auto law-track">
          <div ref={chartRef}>
            <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" role="img" aria-label="名义学制与实际完成年限哑铃图">
              {/* 年份网格 */}
              {Array.from({ length: 7 }).map((_, i) => {
                const yr = 2 + i
                return (
                  <g key={yr}>
                    <line x1={x(yr)} y1={TOP - 6} x2={x(yr)} y2={H - 30} stroke="#e6dcc6" strokeWidth="1" />
                    <text x={x(yr)} y={H - 12} textAnchor="middle" fontSize="12" fill="#8a7d6d">
                      {yr} 年
                    </text>
                  </g>
                )
              })}
              {durationPairs.map((d, i) => {
                const cy = TOP + i * ROW_H + ROW_H / 2
                const gap = d.actual - d.nominal
                return (
                  <g key={d.name}>
                    <text x={LEFT - 12} y={cy + 4} textAnchor="end" fontSize="14" fontWeight="600" fill="#2a2521" fontFamily="'Noto Serif SC', serif">
                      {d.name}
                    </text>
                    {/* 连接线 */}
                    <motion.line
                      x1={x(d.nominal)}
                      y1={cy}
                      x2={x(d.actual)}
                      y2={cy}
                      stroke={gap > 1.4 ? '#c4552d' : '#d9a441'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      initial={SNAP ? false : { pathLength: 0, opacity: 0 }}
                      animate={inView ? { pathLength: 1, opacity: 0.85 } : {}}
                      transition={{ duration: 0.9, delay: 0.15 + i * 0.07 }}
                    />
                    {/* 名义点 */}
                    <motion.circle
                      cx={x(d.nominal)}
                      cy={cy}
                      r="6"
                      fill="#fffaf0"
                      stroke="#8a6d3b"
                      strokeWidth="2.5"
                      initial={SNAP ? false : { opacity: 0, scale: 0 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: 0.1 + i * 0.07 }}
                    />
                    {/* 实际点 */}
                    <motion.circle
                      cx={x(d.actual)}
                      cy={cy}
                      r="7.5"
                      fill="#c4552d"
                      initial={SNAP ? false : { opacity: 0, scale: 0 }}
                      animate={inView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ delay: 0.35 + i * 0.07, type: 'spring', stiffness: 300, damping: 18 }}
                    />
                    {/* 落差标注 */}
                    <motion.text
                      x={x(d.actual) + 14}
                      y={cy + 4}
                      fontSize="12"
                      fill="#a03e1d"
                      fontWeight="700"
                      initial={SNAP ? false : { opacity: 0 }}
                      animate={inView ? { opacity: 1 } : {}}
                      transition={{ delay: 0.5 + i * 0.07 }}
                    >
                      {gap > 0 ? `+${gap.toFixed(gap % 1 ? 2 : 0).replace(/0+$/, '').replace(/\.$/, '')} 年` : '±0'}
                    </motion.text>
                    {d.note && (
                      <motion.text
                        x={x(d.nominal)}
                        y={cy - 12}
                        fontSize="10.5"
                        fill="#8a7d6d"
                        textAnchor="middle"
                        initial={SNAP ? false : { opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.55 + i * 0.07 }}
                      >
                        {d.note}
                      </motion.text>
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
          <div className="flex flex-wrap gap-6 text-xs text-[var(--ink-soft)] mt-2 px-2 pb-2">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-[var(--ochre)] bg-[var(--paper-card)] inline-block" /> 名义学制（合同/法令）
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[var(--terracotta)] inline-block" /> 实际平均/中位完成年限
            </span>
            <span>口径混杂：均值为平均值或中位数，部分为「常例区间」中点，仅供横向感知。</span>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <Reveal>
            <div className="paper-card p-6 text-center h-full">
              <div className="font-serif-sc font-black text-4xl text-[var(--terracotta)]">
                <CountUp to={5.7} decimals={1} />
                <span className="text-lg"> 年</span>
              </div>
              <p className="text-sm text-[var(--ink-soft)] mt-2">美国博士自入学起的完成年限中位数（NSF SED 2023）</p>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="paper-card p-6 text-center h-full">
              <div className="font-serif-sc font-black text-4xl text-[var(--ochre)]">
                <CountUp to={45} suffix="%" />
              </div>
              <p className="text-sm text-[var(--ink-soft)] mt-2">日本工学博士 3 年内修了率；人文科学仅约 21%</p>
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="paper-card p-6 text-center h-full">
              <div className="font-serif-sc font-black text-4xl text-[var(--olive)]">
                <CountUp to={6.5} decimals={1} />
                <span className="text-lg"> 年</span>
              </div>
              <p className="text-sm text-[var(--ink-soft)] mt-2">加拿大设计 4 年的项目，实际常走到 6–7 年</p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.25}>
          <p className="mt-6 text-sm text-[var(--ink-soft)] max-w-3xl">
            硕士层的落差小得多：名义 1–3 年、多数按期完成，真正的拉锯发生在博士层。
            硕士学制光谱见 <a href="#m-spectrum" className="text-[var(--terracotta)] font-medium underline underline-offset-4 decoration-[var(--mustard)]">02 · 学制光谱</a>。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
