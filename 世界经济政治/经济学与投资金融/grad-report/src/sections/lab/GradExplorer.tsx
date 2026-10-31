import { useMemo, useState } from 'react'
import { gradCurves, capBars, type GradCurveData } from '../../data/countries'

/* ---------- 几何常量 ---------- */
const W = 760
const H = 340
const PAD = { l: 48, r: 24, t: 34, b: 36 }
const X_MAX = 10
const Y_MAX = 100

function x(year: number) {
  return PAD.l + (year / X_MAX) * (W - PAD.l - PAD.r)
}
function y(cum: number) {
  return PAD.t + (1 - cum / Y_MAX) * (H - PAD.t - PAD.b)
}

/* ---------- 阶梯路径（step-after：两点之间取左侧锚点的值） ---------- */
function stepPath(pts: { year: number; cum: number }[]) {
  if (!pts.length) return ''
  let d = `M ${x(0)} ${y(0)} L ${x(pts[0].year)} ${y(0)}`
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    d += ` L ${x(p.year)} ${y(p.cum)}`
    if (i + 1 < pts.length) d += ` L ${x(pts[i + 1].year)} ${y(p.cum)}`
  }
  return d
}
function stepArea(pts: { year: number; cum: number }[]) {
  if (!pts.length) return ''
  const last = pts[pts.length - 1]
  return `${stepPath(pts)} L ${x(last.year)} ${y(0)} Z`
}

/* ---------- 单国曲线图 ---------- */
function CurveChart({ d }: { d: GradCurveData }) {
  const pts = d.points
  const last = pts[pts.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${d.name}博士累计毕业比例曲线`}>
      {/* 网格 */}
      {[0, 25, 50, 75, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="#e6dcc6" strokeDasharray={v === 50 ? '6 4' : undefined} />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8a7d6d">
            {v}%
          </text>
        </g>
      ))}
      {Array.from({ length: X_MAX + 1 }).map((_, t) => (
        <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fontSize="11" fill="#8a7d6d">
          {t}年
        </text>
      ))}

      {/* 名义学制竖线（陶土红虚线） */}
      {d.nominal != null && (
        <g>
          <line x1={x(d.nominal)} y1={PAD.t} x2={x(d.nominal)} y2={H - PAD.b} stroke="#c4552d" strokeWidth="2" strokeDasharray="7 5" />
          <text x={x(d.nominal)} y={PAD.t - 8} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#c4552d">
            名义 {d.nominal} 年
          </text>
        </g>
      )}
      {/* 上限竖线（橄榄绿实线） */}
      {d.cap != null && (
        <g>
          <line x1={x(d.cap)} y1={PAD.t} x2={x(d.cap)} y2={H - PAD.b} stroke="#6b7c4e" strokeWidth="2.5" />
          <text x={x(d.cap)} y={PAD.t - 20} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#6b7c4e">
            最多能延到第 {d.cap} 年
          </text>
        </g>
      )}

      {/* 面积 + 阶梯线 */}
      {!d.noCurve && pts.length > 0 && (
        <>
          <path d={stepArea(pts)} fill="#c4552d" fillOpacity="0.10" />
          <path d={stepPath(pts)} fill="none" stroke="#c4552d" strokeWidth="3" strokeLinejoin="round" />
          {/* 尾段：最后锚点之后平铺虚线到图右缘 */}
          {last && last.year < X_MAX && (
            <line
              x1={x(last.year)}
              y1={y(last.cum)}
              x2={x(X_MAX)}
              y2={y(last.cum)}
              stroke="#c4552d"
              strokeWidth="2"
              strokeDasharray="3 5"
              opacity="0.55"
            />
          )}
          {pts.map((p) => (
            <g key={`${p.year}-${p.cum}`}>
              <circle cx={x(p.year)} cy={y(p.cum)} r="5" fill="#c4552d" stroke="#fffaf0" strokeWidth="2" />
              <text x={x(p.year)} y={y(p.cum) - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#a03e1d">
                {p.cum}%
              </text>
            </g>
          ))}
        </>
      )}

      {/* 无逐年分布：印章 */}
      {d.noCurve && (
        <g>
          <rect x={W / 2 - 120} y={H / 2 - 40} width={240} height={56} rx={8} fill="none" stroke="#8a7d6d" strokeWidth="2" strokeDasharray="6 4" transform={`rotate(-4 ${W / 2} ${H / 2 - 12})`} />
          <text x={W / 2} y={H / 2 - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill="#8a7d6d" fontFamily="'Noto Serif SC', serif" transform={`rotate(-4 ${W / 2} ${H / 2 - 12})`}>
            无公开逐年分布
          </text>
        </g>
      )}
    </svg>
  )
}

/* ---------- 探索器 ---------- */
export default function GradExplorer() {
  const [sel, setSel] = useState<string>(() => {
    if (typeof window === 'undefined') return 'jp'
    const g = new URLSearchParams(window.location.search).get('g')
    return gradCurves.some((c) => c.id === g) ? (g as string) : 'jp'
  })
  const cur = gradCurves.find((c) => c.id === sel) ?? gradCurves[0]

  return (
    <div>
      <p className="text-sm text-[var(--ink-soft)] leading-relaxed mb-5">
        <strong className="font-serif-sc">读法：</strong>阶梯线是该国的「累计毕业比例」——到第 t 年为止，有多少人已经走完。
        陶土红虚线是名义学制，橄榄绿实线是制度上限（「最多能延到第几年」）。
        各国口径不一（修了者分布 / 入学队列 / 毕业队列），曲线形状不可直接跨国比高低，逐国口径见下方小字。
      </p>

      {/* 国家胶囊 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {gradCurves.map((c) => (
          <button
            key={c.id}
            onClick={() => setSel(c.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
              sel === c.id ? 'text-[var(--paper)]' : 'text-[var(--ink-soft)] hover:-translate-y-0.5'
            }`}
            style={{
              background: sel === c.id ? '#c4552d' : 'transparent',
              borderColor: c.noCurve ? '#8a7d6d' : '#c4552d',
              borderStyle: c.noCurve ? 'dashed' : 'solid',
            }}
          >
            {c.name}
          </button>
        ))}
        <span className="text-xs text-[var(--ink-faint)] self-center ml-1">虚线框 = 无逐年分布，仅有锚点</span>
      </div>

      <div className="paper-card p-4 md:p-6 bg-[var(--paper-deep)]">
        <div className="flex items-baseline gap-3 flex-wrap mb-2">
          <h4 className="font-serif-sc font-black text-2xl">{cur.name}</h4>
          <span className="text-xs text-[var(--ink-faint)]">{cur.source}</span>
        </div>
        <div className="overflow-x-auto law-track">
          <div className="min-w-[620px]">
            <CurveChart d={cur} />
          </div>
        </div>
        {/* 竖线图例 */}
        <div className="flex flex-wrap gap-5 text-xs text-[var(--ink-soft)] mt-1">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-6 border-t-2 border-dashed border-[#c4552d]" /> 名义学制：{cur.nominalLabel}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-6 border-t-[3px] border-[#6b7c4e]" /> 制度上限：{cur.capLabel}
          </span>
        </div>
        <p className="text-xs text-[var(--ink-faint)] mt-2 leading-relaxed">{cur.basis}</p>
        {cur.tail && !cur.noCurve && (
          <p className="text-xs text-[var(--ink-faint)] mt-1">尾段虚线：{cur.tail}。</p>
        )}
        {cur.anchors && (
          <ul className="mt-3 space-y-1.5">
            {cur.anchors.map((a) => (
              <li key={a} className="text-sm text-[var(--ink-soft)] pl-3 border-l-2 border-[#8a7d6d]">
                {a}
              </li>
            ))}
          </ul>
        )}
      </div>

      <CapBarsBlock />
    </div>
  )
}

/* ---------- 「最多能延到第几年」对比条 ---------- */
const BAR_MAX = 11 // 俄罗斯无硬上限 → 开口条延伸至 11 年刻度
function CapBarsBlock() {
  const [active, setActive] = useState<string | null>(null)
  const cur = useMemo(() => capBars.find((b) => b.id === active), [active])

  return (
    <div className="mt-10">
      <h4 className="font-serif-sc font-bold text-xl mb-1">最多能延到第几年？</h4>
      <p className="text-sm text-[var(--ink-soft)] mb-4">
        名义学制只是起点，制度上限才是「最坏情况」的边界。横条从名义学制画到法定/校规上限；hover 或点按查看依据。
      </p>
      <div className="paper-card p-4 md:p-6">
        <div className="space-y-1.5">
          {capBars.map((b) => {
            const capV = b.cap ?? BAR_MAX
            const isActive = active === b.id
            return (
              <button
                key={b.id}
                className={`w-full grid grid-cols-[4.5rem_1fr] sm:grid-cols-[5.5rem_1fr] items-center gap-2 py-1.5 px-2 rounded-md text-left transition-colors ${
                  isActive ? 'bg-[#f0e6d2]' : 'hover:bg-[rgba(230,220,198,0.4)]'
                }`}
                onMouseEnter={() => setActive(b.id)}
                onClick={() => setActive(b.id)}
              >
                <span className="font-serif-sc font-bold text-sm whitespace-nowrap">{b.name}</span>
                <span className="relative h-6 block">
                  {/* 刻度线 */}
                  {[0, 2, 4, 6, 8, 10].map((t) => (
                    <span key={t} className="absolute top-0 bottom-0 w-px bg-[#e6dcc6]" style={{ left: `${(t / BAR_MAX) * 100}%` }} />
                  ))}
                  {/* 区间条 */}
                  <span
                    className="absolute top-1.5 h-3 rounded-full transition-all"
                    style={{
                      left: `${(b.nominal / BAR_MAX) * 100}%`,
                      width: `${((capV - b.nominal) / BAR_MAX) * 100}%`,
                      background: b.cap == null
                        ? 'repeating-linear-gradient(45deg, #8a7d6d, #8a7d6d 4px, transparent 4px, transparent 8px)'
                        : isActive ? '#c4552d' : '#d9a441',
                    }}
                  />
                  {/* 名义学制刻度钉 */}
                  <span
                    className="absolute top-0 h-6 w-[3px] bg-[#8a6d3b] rounded"
                    style={{ left: `${(b.nominal / BAR_MAX) * 100}%` }}
                  />
                  {/* 右端标注 */}
                  <span className="absolute top-0.5 text-[11px] font-bold whitespace-nowrap" style={{ left: `calc(${(capV / BAR_MAX) * 100}% + 6px)`, color: b.cap == null ? '#8a7d6d' : '#a03e1d' }}>
                    {b.cap == null ? `${b.nominalLabel} → ∞` : `${b.nominalLabel} → ${b.capLabel}`}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="border-t border-[var(--line)] mt-3 pt-3 min-h-[3.2rem]">
          {cur ? (
            <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
              <strong className="font-serif-sc">{cur.name}：</strong>
              {cur.basis}
            </p>
          ) : (
            <p className="text-xs text-[var(--ink-faint)]">刻度钉 = 名义学制；横条右端 = 制度上限；斜纹条 = 无硬上限。</p>
          )}
        </div>
        <p className="text-[11px] text-[var(--ink-faint)] mt-2">
          口径混杂：「上限」有的是学籍上限（台/韩/港/印）、有的是资助或合同上限（新/巴/德）、有的是校规区间（中/美）——横条长度不可直接跨国比较，逐条依据见 hover。
        </p>
      </div>
    </div>
  )
}
