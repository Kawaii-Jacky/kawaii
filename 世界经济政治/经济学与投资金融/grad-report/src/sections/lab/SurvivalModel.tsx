import { useMemo, useState } from 'react'
import { Tex, WarmSlider } from '../../components/bits'

const YEARS = 8
const W = 640
const H = 300
const PAD = { l: 44, r: 16, t: 16, b: 34 }

// 真实数据锚点：日本 MEXT（3 年内修了率）
const anchors = [
  { x: 3, y: 0.45, label: '日本·工学 45%', color: '#8a6d3b' },
  { x: 3, y: 0.21, label: '日本·人文 21%', color: '#a03e1d' },
  { x: 5.7, y: 0.5, label: '美国·中位 5.7 年', color: '#6b7c4e' },
]

function x(year: number) {
  return PAD.l + (year / YEARS) * (W - PAD.l - PAD.r)
}
function y(s: number) {
  return PAD.t + (1 - s) * (H - PAD.t - PAD.b)
}

export default function SurvivalModel() {
  const [pub, setPub] = useState(4) // 发表压力 → 年流失风险 %
  const [fund, setFund] = useState(2) // 资助中断 %
  const [qual, setQual] = useState(6) // 资格考试（前 2 年）%

  const curve = useMemo(() => {
    let s = 1
    const pts: { t: number; s: number }[] = [{ t: 0, s: 1 }]
    for (let t = 1; t <= YEARS; t++) {
      const hazard = pub / 100 + fund / 100 + (t <= 2 ? qual / 100 : 0)
      s = s * (1 - Math.min(hazard, 0.95))
      pts.push({ t, s })
    }
    return pts
  }, [pub, fund, qual])

  const path = useMemo(() => {
    // 阶梯（KM 风格）路径
    let d = `M ${x(0)} ${y(1)}`
    for (let i = 1; i < curve.length; i++) {
      const prev = curve[i - 1]
      const cur = curve[i]
      d += ` L ${x(cur.t)} ${y(prev.s)} L ${x(cur.t)} ${y(cur.s)}`
    }
    return d
  }, [curve])

  const s3 = curve[3].s
  const median = curve.find((p) => p.s <= 0.5)

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-8">
      <div>
        <Tex block className="text-center text-xl md:text-2xl my-4">
          {'S(t) = \\prod_{i:\\, t_i \\le t} \\left( 1 - \\dfrac{d_i}{n_i} \\right)'}
        </Tex>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          <strong className="font-serif-sc">方法说明：</strong>Kaplan–Meier 生存曲线把「仍在读」视为生存状态：
          每一年都有 dᵢ 人退出/结业于风险集 nᵢ 中。此处把年度风险简化为三个可加参数——发表压力、
          资助中断（全年生效）与资格考试（仅前 2 年生效），相乘得到第 t 年仍在读的比例 S(t)。
        </p>

        <div className="mt-6 space-y-5">
          <WarmSlider label="发表压力（年流失风险）" value={pub} min={0} max={15} step={0.5} unit=" %" onChange={setPub} accent="#c4552d" />
          <WarmSlider label="资助中断（年流失风险）" value={fund} min={0} max={10} step={0.5} unit=" %" onChange={setFund} accent="#d9a441" />
          <WarmSlider label="资格考试（前 2 年追加风险）" value={qual} min={0} max={20} step={0.5} unit=" %" onChange={setQual} accent="#6b7c4e" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="paper-card p-4 text-center">
            <div className="font-serif-sc font-black text-3xl text-[var(--terracotta)]">{(s3 * 100).toFixed(0)}%</div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">第 3 年末仍在读比例</div>
          </div>
          <div className="paper-card p-4 text-center">
            <div className="font-serif-sc font-black text-3xl text-[var(--ochre)]">
              {median ? `${median.t} 年` : `>${YEARS} 年`}
            </div>
            <div className="text-xs text-[var(--ink-soft)] mt-1">S(t) 降至 50% 的时间（中位口径）</div>
          </div>
        </div>
      </div>

      <div className="paper-card p-4 md:p-6 bg-[var(--paper-deep)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="博士生存曲线模拟">
          {/* 网格 */}
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="#e6dcc6" strokeDasharray={v === 0.5 ? '6 4' : undefined} />
              <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#8a7d6d">
                {(v * 100).toFixed(0)}%
              </text>
            </g>
          ))}
          {Array.from({ length: YEARS + 1 }).map((_, t) => (
            <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fontSize="11" fill="#8a7d6d">
              {t}年
            </text>
          ))}
          {/* 生存曲线 */}
          <path d={path} fill="none" stroke="#c4552d" strokeWidth="3" strokeLinejoin="round" />
          {curve.map((p) => (
            <circle key={p.t} cx={x(p.t)} cy={y(p.s)} r="4" fill="#c4552d" />
          ))}
          {/* 真实锚点 */}
          {anchors.map((a) => (
            <g key={a.label}>
              <circle cx={x(a.x)} cy={y(a.y)} r="7" fill="none" stroke={a.color} strokeWidth="2.5" strokeDasharray="3 3" />
              <circle cx={x(a.x)} cy={y(a.y)} r="3" fill={a.color} />
              <text x={x(a.x) + 10} y={y(a.y) - 8} fontSize="11" fontWeight="700" fill={a.color}>
                {a.label}
              </text>
            </g>
          ))}
        </svg>
        <p className="text-xs text-[var(--ink-faint)] mt-2">
          虚线圈为真实数据锚点：日本工学博士 3 年内修了率 45%、人文约 21%（MEXT），美国博士完成中位 5.7 年（NSF SED 2023）。
          调节滑杆让曲线穿过锚点，可以反推出对应制度环境下的「等效年风险」。
        </p>
      </div>
    </div>
  )
}
