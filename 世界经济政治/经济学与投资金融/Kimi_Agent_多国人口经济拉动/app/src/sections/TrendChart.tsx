import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES, type CountryCode } from '../data/countries'
import wdi from '../data/wdi.json'

type Ind = keyof typeof wdi.countries.CN

const METRICS: { key: Ind; label: string; unit: string; note: string; refLine?: number; refLabel?: string }[] = [
  { key: 'tfr', label: '总和生育率', unit: '个/女性', note: '跌到 2.1 以下，长期人口就会缩。日本 1974 年跌破，中国 1991 年跌破，沙特是八国中最后一个还站在线上的。', refLine: 2.1, refLabel: '更替水平 2.1' },
  { key: 'birthRate', label: '粗出生率', unit: '‰', note: '每千人里一年出生几口人。注意它受年龄结构影响：老人多了，即使年轻人生育意愿不变，这个数字也会往下掉。' },
  { key: 'dep', label: '总抚养比', unit: '%', note: '每 100 个劳动者养多少人。曲线的「谷底」就是一个国家的人口红利期——找找中国的谷底在哪里。' },
  { key: 'depOld', label: '老年抚养比', unit: '%', note: '专门看养老压力：日本每 100 个劳动者要养 51 位老人，而沙特只要养 4 位。这条线未来二三十年只会更陡。' },
  { key: 'age65', label: '65岁以上占比', unit: '%', note: '7% 老龄化、14% 深度老龄化、20% 超级老龄化。日本已经接近 30%，进入无人涉足的历史地带。' },
  { key: 'lifeExp', label: '预期寿命', unit: '岁', note: '寿命延长是老龄化的另一半推手。中国从 1960 年的 44 岁升到 78 岁，本身就是一场静悄悄的革命。' },
]

const ALL = COUNTRIES.map(c => c.code)

export default function TrendChart() {
  const [metric, setMetric] = useState(0)
  const [active, setActive] = useState<CountryCode[]>(ALL)
  const m = METRICS[metric]

  const rows = useMemo(() => {
    return wdi.years.map((y, yi) => {
      const row: Record<string, number | null> = { year: y }
      for (const c of COUNTRIES) row[c.code] = (wdi.countries[c.code] as Record<string, (number | null)[]>)[m.key][yi]
      return row
    })
  }, [m.key])

  const toggle = (code: CountryCode) =>
    setActive(a => a.includes(code) ? (a.length > 1 ? a.filter(x => x !== code) : a) : [...a, code])

  return (
    <section className="border-b border-sand px-6 md:px-12 py-20 md:py-28" id="trends">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#B08A00] mb-4">02 · 六十年全景</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">
          一张图，看八个国家<br />怎么「老」的
        </h2>
        <p className="mt-5 max-w-3xl text-ink/75 leading-loose">
          下面是世界银行 1960–2024 年的完整记录。切换指标、点选国家，自己动手对比。比如切到「<Term en="TFR" def="总和生育率：一个女性一生平均生育的孩子数。2.1 是世代更替水平，低于它人口长期必然萎缩。">总和生育率</Term>」看那条 2.1 的虚线——谁先跌破的，谁就先老。
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-10 border border-sand bg-parchment">
          {/* 指标切换 */}
          <div className="flex flex-wrap border-b border-sand">
            {METRICS.map((mm, i) => (
              <button
                key={mm.key}
                onClick={() => setMetric(i)}
                className={`px-4 py-3 text-sm border-r border-sand transition-colors font-medium ${i === metric ? 'bg-ink text-cream' : 'hover:bg-sand/40'}`}
              >
                {mm.label}
              </button>
            ))}
          </div>
          {/* 国家开关 */}
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-sand bg-cream/60">
            {COUNTRIES.map(c => (
              <button
                key={c.code}
                onClick={() => toggle(c.code)}
                className={`inline-flex items-center gap-2 px-3 py-1 text-[13px] border transition-all ${active.includes(c.code) ? 'border-ink bg-cream' : 'border-sand opacity-40 hover:opacity-70'}`}
              >
                <i className="w-2.5 h-2.5" style={{ background: c.color }} />
                {c.name}
              </button>
            ))}
            <button onClick={() => setActive(ALL)} className="ml-auto font-num text-[11px] text-ink/50 hover:text-ink underline underline-offset-2">全选</button>
          </div>
          {/* 图表 */}
          <div className="h-[420px] md:h-[480px] p-2 md:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#D5CDB6" strokeDasharray="2 6" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={{ stroke: '#D5CDB6' }} interval={9} />
                <YAxis tick={{ fontSize: 11, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} width={44} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ background: '#2E3030', border: 'none', color: '#FBF8F2', fontSize: 12, borderRadius: 0 }}
                  labelStyle={{ color: '#E8B400', fontFamily: 'IBM Plex Mono' }}
                  formatter={(v: any, name: any) => [typeof v === 'number' ? `${v} ${m.unit}` : '—', COUNTRIES.find(c => c.code === name)?.name ?? String(name)]}
                />
                {m.refLine && <ReferenceLine y={m.refLine} stroke="#2E3030" strokeDasharray="6 4" label={{ value: m.refLabel, position: 'insideTopRight', fontSize: 10, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} />}
                {COUNTRIES.filter(c => active.includes(c.code)).map(c => (
                  <Line key={c.code} type="monotone" dataKey={c.code} stroke={c.color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="px-4 md:px-6 pb-5 text-[13px] leading-relaxed text-ink/65 border-t border-sand pt-4 bg-cream/60">
            <span className="font-num text-[10px] tracking-widest text-[#B08A00] mr-2">怎么读</span>{m.note}
          </p>
        </div>
      </Reveal>
    </section>
  )
}
