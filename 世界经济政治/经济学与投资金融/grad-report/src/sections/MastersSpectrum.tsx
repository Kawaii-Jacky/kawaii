import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { Reveal, SectionHead, SNAP } from '../components/bits'
import { mastersSpectrum } from '../data/countries'

const MAX_YEAR = 4.5
const ROW_H = 34
const TOP = 18
const LEFT = 96
const RIGHT = 76
const W = 760
const H = TOP + mastersSpectrum.length * ROW_H + 40

function x(year: number) {
  return LEFT + (year / MAX_YEAR) * (W - LEFT - RIGHT)
}

function barColor(min: number) {
  return min < 2 ? '#d9a441' : '#8a6d3b'
}

/* ---------- 硕士学制光谱图 ---------- */
function SpectrumChart() {
  const chartRef = useRef<HTMLDivElement>(null)
  const inViewRaw = useInView(chartRef, { once: true, margin: '-60px' })
  const inView = SNAP || inViewRaw
  const [active, setActive] = useState(0)
  const cur = mastersSpectrum[active]

  return (
    <div ref={chartRef} className="paper-card p-4 md:p-8">
      <h3 className="font-serif-sc font-bold text-xl mb-1">
        硕士名义学制光谱 <span className="text-sm font-normal text-[var(--ink-faint)]">（年，区间含授课型/研究型差异；hover 或点按查看详情）</span>
      </h3>
      <div className="overflow-x-auto law-track">
        <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[640px] w-full" role="img" aria-label="19 个国家与地区硕士名义学制对比">
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i}>
              <line x1={x(i)} y1={TOP - 4} x2={x(i)} y2={H - 36} stroke="#e6dcc6" strokeWidth="1" />
              <text x={x(i)} y={H - 18} textAnchor="middle" fontSize="12" fill="#8a7d6d">
                {i} 年
              </text>
            </g>
          ))}
          {mastersSpectrum.map((d, i) => {
            const cy = TOP + i * ROW_H + ROW_H / 2
            const isActive = active === i
            const color = barColor(d.min)
            return (
              <g
                key={d.name}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className="cursor-pointer"
                opacity={isActive ? 1 : 0.88}
              >
                <rect
                  x={0}
                  y={TOP + i * ROW_H + 2}
                  width={W}
                  height={ROW_H - 4}
                  rx={6}
                  fill={isActive ? '#f0e6d2' : 'transparent'}
                />
                <text
                  x={LEFT - 12}
                  y={cy + 4.5}
                  textAnchor="end"
                  fontSize="13.5"
                  fontWeight={isActive ? 800 : 600}
                  fill="#2a2521"
                  fontFamily="'Noto Serif SC', serif"
                >
                  {d.name}
                </text>
                <motion.rect
                  x={x(d.min)}
                  y={cy - 7}
                  width={Math.max(x(d.max) - x(d.min), 10)}
                  height={14}
                  rx={7}
                  fill={color}
                  fillOpacity={isActive ? 1 : 0.82}
                  stroke={isActive ? '#2a2521' : 'none'}
                  strokeWidth={1.5}
                  initial={SNAP ? false : { scaleX: 0, opacity: 0 }}
                  animate={inView ? { scaleX: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.6, delay: SNAP ? 0 : i * 0.04 }}
                  style={{ transformOrigin: `${x(d.min)}px ${cy}px` }}
                />
                <text x={x(d.max) + 12} y={cy + 4} fontSize="12" fontWeight="700" fill={isActive ? '#a03e1d' : '#5c5248'}>
                  {d.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-4 border-t border-[var(--line)] pt-4 min-h-[6.5rem]">
        <div className="flex items-center gap-2.5 flex-wrap mb-2">
          <span className="font-serif-sc font-black text-lg">{cur.name}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full text-[var(--paper)]" style={{ background: barColor(cur.min) }}>
            {cur.label}
          </span>
          {cur.note && <span className="text-xs text-[var(--ink-faint)]">{cur.note}</span>}
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <p><strong className="font-serif-sc text-[var(--ochre)]">进入：</strong><span className="text-[var(--ink-soft)]">{cur.entry}</span></p>
          <p><strong className="font-serif-sc text-[var(--ochre)]">论文：</strong><span className="text-[var(--ink-soft)]">{cur.thesis}</span></p>
          <p><strong className="font-serif-sc text-[var(--ochre)]">学费/资助：</strong><span className="text-[var(--ink-soft)]">{cur.fee}</span></p>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-xs text-[var(--ink-soft)] mt-4">
        <span className="inline-flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#d9a441] inline-block" /> 1 年起步（快轨）
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-[#8a6d3b] inline-block" /> 2 年起步（主流）
        </span>
        <span>横条长度 = 名义学制区间（如「1–4 年」覆盖授课型到最长修业年限）。</span>
      </div>
    </div>
  )
}

/* ---------- 授课型 vs 研究型 ---------- */
const paths = [
  {
    key: 'taught',
    title: '授课型硕士',
    en: 'Taught / Course-based',
    color: '#d9a441',
    desc: '以上课、考试与项目为主，通常不要求研究论文，一年可以走完——是「职业加速器」。',
    examples: ['英国 MSc（1 年）', '中国香港授课型（1 年）', '新加坡授课型（1–1.5 年）', '澳大利亚授课型（1.5–2 年）', '中国专业型硕士（2–3 年，重实践）'],
  },
  {
    key: 'research',
    title: '研究型硕士',
    en: 'Research / Thesis',
    color: '#c4552d',
    desc: '以学位论文为核心、导师制培养，常被视为博士的预备役——也是大多数欧陆与东亚博士项目的硬前置。',
    examples: ['美国 MS-thesis / MEng 两轨', '中国学术型硕士（3 年）', '日本修士（30 学分＋论文审查）', '中国香港 MPhil（2 年）', '加拿大 thesis 型（2–3 年）'],
  },
]

export default function MastersSpectrum() {
  return (
    <section id="m-spectrum" className="py-20 md:py-28 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="02"
          kicker="PART ONE · DURATION"
          title="学制光谱（硕）"
          lead="同一纸硕士文凭，从英国的 1 年到中国学硕的 3 年——名义学制的三倍差，是硕士层最直观的全球落差。"
        />

        <Reveal>
          <SpectrumChart />
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          {paths.map((p, i) => (
            <Reveal key={p.key} delay={i * 0.12}>
              <div className="paper-card p-6 h-full border-t-4" style={{ borderTopColor: p.color }}>
                <p className="text-xs tracking-[0.3em] mb-1" style={{ color: p.color }}>{p.en}</p>
                <h3 className="font-serif-sc font-black text-2xl">{p.title}</h3>
                <p className="text-[var(--ink-soft)] leading-relaxed mt-3">{p.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.examples.map((e) => (
                    <span
                      key={e}
                      className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: p.color, color: p.color, background: `${p.color}12` }}
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15}>
          <p className="mt-6 text-xs text-[var(--ink-faint)] max-w-3xl leading-relaxed">
            口径说明：光谱图为「名义学制」区间，覆盖授课型与研究型差异；其中英国 1 年授课型、欧陆 120 ECTS、
            德/法/瑞典学费政策、中国学硕/专硕年限等为通行制度的常识性补充，未在本次调研文件中逐条核验。
            与博士层的「名义 vs 实际」落差相比，硕士层多数按期完成——真正的拉锯发生在博士阶段（见 08 · 时间的落差）。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
