import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import Reveal from '../components/Reveal'
import { COUNTRIES, COUNTRY_MAP, type CountryCode } from '../data/countries'
import { ELASTICITY } from '../data/static'
import wdi from '../data/wdi.json'

const L = wdi.years.length - 1
const TABS = [
  { key: 'growth', label: '增长 × 就业' },
  { key: 'structure', label: '结构 × 质量' },
  { key: 'source', label: '差异的来源' },
] as const

function latest(code: string, ind: string): number | null {
  const arr = (wdi.countries as any)[code][ind] as (number | null)[]
  for (let i = L; i >= 0; i--) if (arr[i] != null) return arr[i]
  return null
}
function spark(code: string, ind: string) {
  const arr = (wdi.countries as any)[code][ind] as (number | null)[]
  return wdi.years.map((y, i) => ({ y, v: arr[i] })).filter(d => d.v != null)
}

export default function Models() {
  const [code, setCode] = useState<CountryCode>('CN')
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('growth')
  const c = COUNTRY_MAP[code]

  const stats = [
    { label: 'GDP 增速（2024）', v: latest(code, 'gdpGrow')?.toFixed(1) + '%', ind: 'gdpGrow' },
    { label: '失业率', v: latest(code, 'unemp')?.toFixed(1) + '%', ind: 'unemp' },
    { label: '服务业就业占比', v: latest(code, 'empSrv')?.toFixed(0) + '%', ind: 'empSrv' },
    { label: '就业弹性 2010s', v: ELASTICITY[code][1].toFixed(2), ind: 'gdpGrow' },
  ]

  return (
    <section className="relative py-20 md:py-28 bg-[#111111] text-white overflow-hidden" id="models">
      <div className="watermark watermark-light text-[20vw] left-0 -top-10 hidden md:block">Models</div>
      <div className="relative px-6 md:px-12">
        <Reveal>
          <div className="flex items-center gap-4 mb-4">
            <span className="font-num text-xs tracking-[0.25em] text-[#ff8a90]">05 · 合 — 八种模式深描</span>
            <span className="w-16 h-px bg-crimson" />
          </div>
          <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">每个国家，<br />都有自己的活法</h2>
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap gap-px bg-white/15 border border-white/15">
            {COUNTRIES.map(cc => (
              <button key={cc.code} onClick={() => setCode(cc.code)}
                className={`flex-1 min-w-[96px] px-3 py-3.5 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 ${cc.code === code ? 'bg-white text-ink' : 'hover:bg-white/10'}`}>
                <i className="w-2.5 h-2.5" style={{ background: cc.color }} />{cc.name}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-8 border border-white/15">
            <div className="p-6 md:p-8 border-b border-white/15 grid lg:grid-cols-3 gap-8">
              <div>
                <div className="font-num text-[10px] tracking-[0.2em] uppercase text-white/50">{c.stage}</div>
                <h3 className="font-display font-bold text-3xl mt-2">{c.name}<span className="text-white/40 text-xl ml-3">{c.model}</span></h3>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.pillars.map(p => (
                    <span key={p} className="text-[12px] border border-white/25 px-2.5 py-1 text-white/80">{p}</span>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 grid grid-cols-2 gap-px bg-white/10 border border-white/10">
                {stats.map(s => (
                  <div key={s.label} className="bg-[#111111] p-4">
                    <div className="text-[11px] text-white/55">{s.label}</div>
                    <div className="font-num text-2xl font-semibold mt-1" style={{ color: c.color }}>{s.v}</div>
                    <div className="h-8 mt-2 -mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={spark(code, s.ind)} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                          <Line type="monotone" dataKey="v" stroke="#ff8a90" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap border-b border-white/15">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-5 py-3 text-[13px] font-medium border-r border-white/15 transition-colors ${tab === t.key ? 'bg-crimson text-white' : 'hover:bg-white/10'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-6 md:p-10 min-h-[240px]">
              <p className="max-w-4xl text-white/85 leading-[2] text-[15px]">{c[tab]}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
