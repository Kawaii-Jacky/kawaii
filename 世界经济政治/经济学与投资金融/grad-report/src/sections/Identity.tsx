import { useState } from 'react'
import { Reveal, SectionHead } from '../components/bits'
import { ScaleIllustration } from '../components/illustrations'
import { countries, identityMeta, type Country } from '../data/countries'

/* ---------- 光谱图几何 ---------- */
const W = 1060
const H = 128
const AXIS_L = 50
const AXIS_R = 1010
const AXIS_Y = 56
const MIN_GAP = 58 // 同一泳道内标签最小水平间距（px）
const LANE_UP_Y = 18 // 上泳道标签基线
const LANE_DOWN_Y = 112 // 下泳道标签基线

function sx(v: number) {
  return AXIS_L + (v / 100) * (AXIS_R - AXIS_L)
}

interface Placed {
  c: Country
  dotX: number
  lane: 0 | 1
  labelX: number
  labelY: number
}

// 按 spectrum 排序后奇偶交错分配上下泳道；泳道内贪心右推保证最小间距；
// 圆点 x 始终等于 spectrum 的真实映射，只有标签错层。
const placed: Placed[] = (() => {
  const sorted = [...countries].sort((a, b) => a.spectrum - b.spectrum)
  const lanes: Placed[][] = [[], []]
  sorted.forEach((c, i) => {
    const lane = (i % 2) as 0 | 1
    lanes[lane].push({
      c,
      dotX: sx(c.spectrum),
      lane,
      labelX: 0,
      labelY: lane === 0 ? LANE_UP_Y : LANE_DOWN_Y,
    })
  })
  lanes.forEach((lane) => {
    let prev = -Infinity
    lane.forEach((it) => {
      it.labelX = Math.min(Math.max(Math.max(it.dotX, prev + MIN_GAP), 34), W - 34)
      prev = it.labelX
    })
  })
  return [...lanes[0], ...lanes[1]]
})()

export default function Identity() {
  const [hovered, setHovered] = useState<string | null>(null)
  const active = countries.find((c) => c.id === hovered)

  return (
    <section id="identity" className="py-20 md:py-28 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="07"
          kicker="THE SPECTRUM"
          title="身份光谱"
          lead="根本的分野不是入学考试，也不是学制长短，而是一个法律问题：你究竟是「雇员」还是「学生」？这一个身份，决定了你的工时上限、休假权利与社保。"
        />

        <div className="grid lg:grid-cols-[1fr_280px] gap-8 items-start">
          <Reveal className="paper-card p-6 md:p-10">
            {/* 光谱轴端标签 */}
            <div className="flex justify-between font-serif-sc font-bold text-lg mb-3">
              <span className="text-[var(--olive)]">雇员制</span>
              <span className="text-[var(--terracotta)]">学生制</span>
            </div>

            <div className="overflow-x-auto law-track">
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="min-w-[720px] w-full"
                role="img"
                aria-label="19 个国家与地区博士生法律身份光谱"
              >
                <defs>
                  <linearGradient id="spectrum-axis" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6b7c4e" />
                    <stop offset="45%" stopColor="#8a6d3b" />
                    <stop offset="75%" stopColor="#d9a441" />
                    <stop offset="100%" stopColor="#c4552d" />
                  </linearGradient>
                </defs>

                {/* 主轴 */}
                <rect
                  x={AXIS_L}
                  y={AXIS_Y - 4}
                  width={AXIS_R - AXIS_L}
                  height={8}
                  rx={4}
                  fill="url(#spectrum-axis)"
                />

                {placed.map((p) => {
                  const meta = identityMeta[p.c.identity]
                  const isActive = hovered === p.c.id
                  const stemEndY = p.lane === 0 ? LANE_UP_Y + 6 : LANE_DOWN_Y - 14
                  return (
                    <g
                      key={p.c.id}
                      className="cursor-pointer"
                      onMouseEnter={() => setHovered(p.c.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => setHovered(p.c.id)}
                    >
                      {/* 扩大热区 */}
                      <rect
                        x={Math.min(p.dotX, p.labelX) - 14}
                        y={p.lane === 0 ? 4 : AXIS_Y - 16}
                        width={Math.abs(p.labelX - p.dotX) + 28}
                        height={p.lane === 0 ? AXIS_Y + 12 : H - AXIS_Y - 4}
                        fill="transparent"
                      />
                      {/* 引线 */}
                      <line
                        x1={p.dotX}
                        y1={AXIS_Y + (p.lane === 0 ? -10 : 10)}
                        x2={p.labelX}
                        y2={stemEndY}
                        stroke={isActive ? meta.color : '#cbbfa8'}
                        strokeWidth={isActive ? 1.8 : 1}
                      />
                      {/* 圆点：位置 = spectrum 真实映射 */}
                      <circle
                        cx={p.dotX}
                        cy={AXIS_Y}
                        r={isActive ? 11 : 8.5}
                        fill={isActive ? meta.color : '#fffaf0'}
                        stroke={meta.color}
                        strokeWidth={isActive ? 3 : 2.5}
                        style={{ transition: 'r 0.15s, fill 0.15s' }}
                      />
                      {/* 标签 */}
                      <text
                        x={p.labelX}
                        y={p.labelY}
                        textAnchor="middle"
                        fontSize="13"
                        fontWeight={isActive ? 800 : 600}
                        fill={isActive ? meta.color : '#2a2521'}
                        fontFamily="'Noto Serif SC', serif"
                      >
                        {p.c.name}
                      </text>
                      {/* 标签下的小色钉，提示身份类别 */}
                      <circle cx={p.labelX} cy={p.labelY + (p.lane === 0 ? 7 : -19)} r={2.4} fill={meta.color} />
                    </g>
                  )
                })}
              </svg>
            </div>

            {/* hover 详情 */}
            <div className="min-h-[7.5rem] border-t border-[var(--line)] pt-5 mt-4">
              {active ? (
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-serif-sc font-bold text-xl">{active.name}</h3>
                    <span
                      className="text-xs px-2.5 py-1 rounded-full text-[var(--paper)]"
                      style={{ background: identityMeta[active.identity].color }}
                    >
                      {active.identityLabel}
                    </span>
                    <span className="text-xs text-[var(--ink-faint)]">光谱位置 {active.spectrum} / 100</span>
                  </div>
                  <p className="mt-2 text-[var(--ink-soft)] leading-relaxed">{active.oneLiner}</p>
                </div>
              ) : (
                <p className="text-[var(--ink-faint)]">
                  把光标停在任何一枚圆点或标签上——每个国家一句话。圆点在轴上的位置是光谱值（0=完全雇员制，100=完全学生制）的真实映射，相邻过近时仅标签上下错层。
                </p>
              )}
            </div>

            {/* 图例 */}
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-[var(--ink-soft)]">
              {Object.entries(identityMeta).map(([k, m]) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                  {m.label}
                </span>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15} className="hidden lg:block">
            <ScaleIllustration className="w-full" />
            <p className="pull-quote mt-4 text-base">
              「博士生是不是劳动者？」——美国 NLRB、韩国法院与台湾劳动部，给出了三种不同的答案。
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-8 grid sm:grid-cols-3 gap-4 text-sm">
            <div className="paper-card p-4 border-l-4" style={{ borderLeftColor: '#6b7c4e' }}>
              <strong className="font-serif-sc">雇员制（欧陆五国）</strong>
              <p className="text-[var(--ink-soft)] mt-1">德、法、荷、瑞典、瑞士：劳动合同、工资、社保、25–35 天法定年假。</p>
            </div>
            <div className="paper-card p-4 border-l-4" style={{ borderLeftColor: '#c4552d' }}>
              <strong className="font-serif-sc">学生制（多数国家）</strong>
              <p className="text-[var(--ink-soft)] mt-1">英美加澳日俄印巴中等：津贴而非工资，多数无法定工时上限与法定年假。</p>
            </div>
            <div className="paper-card p-4 border-l-4" style={{ borderLeftColor: '#d9a441' }}>
              <strong className="font-serif-sc">拉锯地带</strong>
              <p className="text-[var(--ink-soft)] mt-1">美国 2016 NLRB 案、韩国劳动者性诉讼、台湾「学习/劳雇」分流——身份仍在谈判桌上。</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
