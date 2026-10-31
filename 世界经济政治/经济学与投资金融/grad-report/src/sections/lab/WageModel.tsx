import { useMemo, useState } from 'react'
import { Tex, WarmSlider } from '../../components/bits'

interface Preset {
  id: string
  name: string
  stipend: number
  currency: string
  symbol: string
  hours0: number
  minWage: number
  minNote: string
  source: string
}

const WEEKS = 47 // 扣除休假与公共假日后的年工作周数（示意）

const presets: Preset[] = [
  { id: 'uk', name: '英国 · UKRI 最低津贴', stipend: 20780, currency: 'GBP', symbol: '£', hours0: 47, minWage: 12.21, minNote: '英国 National Living Wage 2025（约）', source: 'UKRI 2025/26 津贴 £20,780/年（免税）；HEPI 实测 47h/周' },
  { id: 'us', name: '美国 · NSF GRFP', stipend: 37000, currency: 'USD', symbol: '$', hours0: 50, minWage: 7.25, minNote: '美国联邦最低工资（多州更高）', source: 'NSF GRFP 津贴 $37,000/年；Nature 2022：43.1% 全球博士生 ≥50h' },
  { id: 'ch', name: '瑞士 · SNSF 区间下限', stipend: 50000, currency: 'CHF', symbol: 'CHF ', hours0: 42, minWage: 24, minNote: '日内瓦州最低工资（约，各州不一）', source: 'SNSF 2026 薪资区间 CHF 50,000–55,000 毛/年' },
  { id: 'de', name: '德国 · TV-L 65% 职位', stipend: 34800, currency: 'EUR', symbol: '€', hours0: 40, minWage: 12.82, minNote: '德国法定最低工资 2025', source: 'TV-L E13 65% 职位年毛薪（约）；合同 25h/周、实际加班普遍' },
  { id: 'kr', name: '韩国 · 研究生月薪中位', stipend: 13500000, currency: 'KRW', symbol: '₩', hours0: 55, minWage: 10030, minNote: '韩国法定最低工资 2025', source: '2019 六机构调查：月薪 100–125 万韩元、62% 日均 >10h' },
  { id: 'cn', name: '中国 · 奖助合计（估）', stipend: 30000, currency: 'CNY', symbol: '¥', hours0: 60, minWage: 26.4, minNote: '北京非全日制小时最低工资（约）', source: '国家助学金 ≥15,000 元/年＋学业奖/三助的粗略合计（示意）' },
]

export default function WageModel() {
  const [presetId, setPresetId] = useState('uk')
  const preset = presets.find((p) => p.id === presetId)!
  const [hours, setHours] = useState(preset.hours0)
  const [stipend, setStipend] = useState(preset.stipend)

  const selectPreset = (id: string) => {
    const p = presets.find((x) => x.id === id)!
    setPresetId(id)
    setHours(p.hours0)
    setStipend(p.stipend)
  }

  const wage = stipend / (hours * WEEKS)
  const ratio = wage / preset.minWage
  const below = wage < preset.minWage

  const barW = useMemo(() => {
    const max = Math.max(wage, preset.minWage) * 1.15
    return { wagePct: (wage / max) * 100, minPct: (preset.minWage / max) * 100 }
  }, [wage, preset.minWage])

  const fmt = (v: number) =>
    v >= 1000 ? v.toLocaleString('en-US', { maximumFractionDigits: 0 }) : v.toFixed(v >= 100 ? 0 : 2)

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8">
      <div>
        <Tex block className="text-center text-xl md:text-2xl my-4">
          {'w = \\dfrac{S}{h \\times W}'}
        </Tex>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          <strong className="font-serif-sc">方法说明：</strong>S 为年津贴/工资，h 为每周实际工时，W 为年工作周数（此处固定取 {WEEKS} 周，
          粗略扣除休假与公共假日）。w 即「把博士生当作按小时计酬的劳动者」时的有效时薪。
          津贴多为免税或毛薪口径，与最低工资并非严格同口径比较。
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => selectPreset(p.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                presetId === p.id
                  ? 'bg-[var(--terracotta)] text-[var(--paper)] border-[var(--terracotta)]'
                  : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--terracotta)] hover:text-[var(--terracotta)]'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <WarmSlider label="每周实际工时 h" value={hours} min={20} max={80} unit=" h/周" onChange={setHours} accent="#c4552d" />
          <WarmSlider
            label="年津贴 / 工资 S"
            value={stipend}
            min={Math.round(preset.stipend * 0.4)}
            max={Math.round(preset.stipend * 1.8)}
            step={Math.max(100, Math.round(preset.stipend / 100))}
            unit={` ${preset.currency}`}
            onChange={setStipend}
            accent="#8a6d3b"
          />
        </div>
        <p className="text-xs text-[var(--ink-faint)] mt-3">预填依据：{preset.source}</p>
      </div>

      <div className="paper-card p-6 bg-[var(--paper-deep)] flex flex-col justify-center">
        <Tex block className="text-center text-lg md:text-xl">
          {`w = \\dfrac{${stipend.toLocaleString('en-US')}}{${hours} \\times ${WEEKS}} \\approx ${preset.symbol}${fmt(wage)}\\ /\\ \\text{h}`}
        </Tex>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--ink-soft)]">博士有效时薪</span>
              <strong className="font-serif-sc" style={{ color: below ? '#c4552d' : '#6b7c4e' }}>
                {preset.symbol}{fmt(wage)}
              </strong>
            </div>
            <div className="h-4 rounded-full bg-[#e6dcc6] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${barW.wagePct}%`, background: below ? '#c4552d' : '#6b7c4e' }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--ink-soft)]">当地最低工资参考线</span>
              <strong className="font-serif-sc text-[var(--ochre)]">{preset.symbol}{fmt(preset.minWage)}</strong>
            </div>
            <div className="h-4 rounded-full bg-[#e6dcc6] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--ochre)] transition-all duration-300" style={{ width: `${barW.minPct}%` }} />
            </div>
            <p className="text-xs text-[var(--ink-faint)] mt-1">{preset.minNote}</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          {below ? (
            <p className="font-serif-sc font-bold text-lg text-[var(--terracotta)]">
              有效时薪约为最低工资的 {(ratio * 100).toFixed(0)}% —— 低于参考线
            </p>
          ) : (
            <p className="font-serif-sc font-bold text-lg text-[var(--olive)]">
              有效时薪为最低工资的 {ratio.toFixed(1)} 倍 —— 高于参考线
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
