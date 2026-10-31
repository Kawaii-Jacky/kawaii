import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES, type CountryCode } from '../data/countries'
import wdi from '../data/wdi.json'

type Ind = 'gdpGrow' | 'gdpPc' | 'gdpPerWorker'
const METRICS: { key: Ind; label: string; unit: string; note: string }[] = [
  { key: 'gdpGrow', label: 'GDP 增速', unit: '%', note: '印度和越南在高位赛跑，德国日本贴着地面滑行。注意 2020 年所有曲线的同时跳水——疫情面前，模式差异瞬间消失。' },
  { key: 'gdpPc', label: '人均 GDP（不变价）', unit: '美元', note: '切到这条线看「绝对水位」：增速快的国家，收入水平还相差很远。追赶是几十年的事情。' },
  { key: 'gdpPerWorker', label: '每个劳动者创造的 GDP（PPP）', unit: '美元', note: '劳动生产率才是工资的终极天花板。美国约 15.4 万美元，印度约 2.3 万美元——六倍多的差距，解释了为什么同样的工作在不同国家报酬悬殊。' },
]

const ALL = COUNTRIES.map(c => c.code)

export default function GrowthRace() {
  const [metric, setMetric] = useState(0)
  const [active, setActive] = useState<CountryCode[]>(ALL)
  const m = METRICS[metric]

  const rows = useMemo(() => wdi.years.map((y, yi) => {
    const row: Record<string, number | null> = { year: y }
    for (const c of COUNTRIES) row[c.code] = (wdi.countries[c.code] as unknown as Record<string, (number | null)[]>)[m.key][yi]
    return row
  }), [m.key])

  const toggle = (code: CountryCode) =>
    setActive(a => a.includes(code) ? (a.length > 1 ? a.filter(x => x !== code) : a) : [...a, code])

  return (
    <section className="relative border-b border-[#e5e0d5] px-6 md:px-12 py-20 md:py-28 overflow-hidden" id="race">
      <div className="watermark text-[22vw] -left-10 -top-10 hidden md:block">Race</div>
      <Reveal>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-num text-xs tracking-[0.25em] text-crimson">01 · 起 — 增长的赛跑</span>
          <span className="w-16 h-px bg-crimson" />
        </div>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">八个国家，<br />不在同一条起跑线上</h2>
        <p className="mt-5 max-w-3xl text-ink/70 leading-loose">
          先看清比赛本身。这八个国家横跨三个发展阶段：美、德、日是跑在前面的发达经济体，增长慢但水位高；中国处于中高收入、正在换挡；印度、越南是追赶者，增速快、底子薄；沙特和巴西则是「资源型选手」，增长曲线跟着油价和大宗商品价格上下翻飞。记住这个站位——它决定了后面一切故事的基调。
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="relative mt-10 border border-[#e5e0d5] bg-white">
          <div className="flex flex-wrap border-b border-[#e5e0d5]">
            {METRICS.map((mm, i) => (
              <button key={mm.key} onClick={() => setMetric(i)}
                className={`px-4 py-3 text-sm border-r border-[#e5e0d5] transition-colors font-medium ${i === metric ? 'bg-ink text-white' : 'hover:bg-paper'}`}>
                {mm.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-[#e5e0d5] bg-paper/60">
            {COUNTRIES.map(c => (
              <button key={c.code} onClick={() => toggle(c.code)}
                className={`inline-flex items-center gap-2 px-3 py-1 text-[13px] border transition-all ${active.includes(c.code) ? 'border-ink bg-white' : 'border-[#e5e0d5] opacity-40 hover:opacity-70'}`}>
                <i className="w-2.5 h-2.5" style={{ background: c.color }} />{c.name}
              </button>
            ))}
            <button onClick={() => setActive(ALL)} className="ml-auto font-num text-[11px] text-ink/50 hover:text-ink underline underline-offset-2">全选</button>
          </div>
          <div className="h-[420px] md:h-[460px] p-2 md:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#e5e0d5" strokeDasharray="2 6" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#171717', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={{ stroke: '#e5e0d5' }} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: '#171717', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} width={56}
                  tickFormatter={v => m.key === 'gdpGrow' ? `${v}` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                {m.key === 'gdpGrow' && <ReferenceLine y={0} stroke="#171717" strokeOpacity={0.4} />}
                <Tooltip contentStyle={{ background: '#171717', border: 'none', color: '#fff', fontSize: 12, borderRadius: 0 }}
                  labelStyle={{ color: '#ff8a90', fontFamily: 'IBM Plex Mono' }}
                  formatter={(v: any, name: any) => [typeof v === 'number' ? (m.key === 'gdpGrow' ? `${v.toFixed(1)}%` : `${v.toLocaleString()} 美元`) : '—', COUNTRIES.find(c => c.code === name)?.name ?? name]} />
                {COUNTRIES.filter(c => active.includes(c.code)).map(c => (
                  <Line key={c.code} type="monotone" dataKey={c.code} stroke={c.color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="px-4 md:px-6 pb-5 pt-4 text-[13px] leading-relaxed text-ink/65 border-t border-[#e5e0d5] bg-paper/60">
            <span className="font-num text-[10px] tracking-widest text-crimson mr-2">怎么读</span>{m.note}
          </p>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <p className="mt-8 max-w-3xl text-ink/70 leading-loose">
          但增速只是上半场的故事。真正决定普通人感受的，是增长的「含岗量」——这就要引出本报告的核心指标：<Term en="Employment Elasticity" def="就业弹性：GDP每增长1%，就业增长百分之几。衡量增长创造就业岗位的能力。">就业弹性</Term>。
        </p>
      </Reveal>
    </section>
  )
}
