import { useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES, COUNTRY_MAP, type CountryCode } from '../data/countries'
import { PROJECTIONS } from '../data/meta'
import wdi from '../data/wdi.json'

const L = wdi.years.length - 1

function spark(code: CountryCode, ind: string) {
  const arr = (wdi.countries[code] as Record<string, (number | null)[]>)[ind]
  return wdi.years.map((y, i) => ({ y, v: arr[i] })).filter(d => d.v != null)
}

const TAB_LABELS = [
  { key: 'past', label: '来路 · 怎么走到今天' },
  { key: 'policy', label: '出手 · 政策工具箱' },
  { key: 'economy', label: '代价 · 对经济的影响' },
  { key: 'future', label: '前方 · 未来趋势' },
] as const

export default function CountryProfiles() {
  const [code, setCode] = useState<CountryCode>('CN')
  const [tab, setTab] = useState<(typeof TAB_LABELS)[number]['key']>('past')
  const c = COUNTRY_MAP[code]
  const d = wdi.countries[code] as Record<string, (number | null)[]>
  const p = PROJECTIONS[code]

  const stats = [
    { label: '总和生育率', v: d.tfr[L]?.toFixed(2) ?? '—', sub: '更替水平 2.1', ind: 'tfr', def: '一个女性一生平均生育的孩子数。低于2.1，人口长期必然萎缩。' },
    { label: '65+ 老人占比', v: d.age65[L] ? d.age65[L]!.toFixed(1) + '%' : '—', sub: '7%/14%/20% 三档线', ind: 'age65', def: '65岁以上人口占比：≥7%老龄化社会，≥14%深度老龄化，≥20%超级老龄化。' },
    { label: '老年抚养比', v: d.depOld[L]?.toFixed(0) ?? '—', sub: '每百位劳动者对应老人', ind: 'depOld', def: '每100名劳动年龄人口对应的65岁以上老人数量，直接衡量养老压力。' },
    { label: '预期寿命', v: d.lifeExp[L] ? d.lifeExp[L]!.toFixed(1) + ' 岁' : '—', sub: '1960 年为 ' + (d.lifeExp[0]?.toFixed(0) ?? '—') + ' 岁', ind: 'lifeExp', def: '按当前各年龄死亡率，一个新生儿预期能活的年数。' },
  ]

  return (
    <section className="border-b border-sand py-20 md:py-28 bg-ink text-cream" id="countries">
      <div className="px-6 md:px-12">
        <Reveal>
          <p className="font-num text-xs tracking-[0.25em] text-[#E8B400] mb-4">05 · 八国特写</p>
          <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">同一个地球，<br />八种人口命运</h2>
        </Reveal>

        {/* 国家 tab */}
        <Reveal delay={100}>
          <div className="mt-10 flex flex-wrap gap-px bg-cream/20 border border-cream/20">
            {COUNTRIES.map(cc => (
              <button key={cc.code} onClick={() => setCode(cc.code)}
                className={`flex-1 min-w-[100px] px-4 py-3.5 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 ${cc.code === code ? 'bg-cream text-ink' : 'hover:bg-cream/10'}`}>
                <i className="w-2.5 h-2.5" style={{ background: cc.color }} />{cc.name}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-8 border border-cream/20">
            {/* 头部摘要 */}
            <div className="p-6 md:p-8 border-b border-cream/20 grid lg:grid-cols-3 gap-8">
              <div>
                <div className="font-num text-[10px] tracking-[0.2em] uppercase text-cream/50">{c.stage}</div>
                <h3 className="font-display font-bold text-3xl mt-2">{c.name}</h3>
                <p className="mt-3 text-cream/75 leading-relaxed text-[15px]">{c.tagline}</p>
                <div className="mt-5 font-num text-[11px] text-cream/50 leading-relaxed">
                  联合国中方案预测<br />
                  2050 人口 ≈ <span className="text-[#E8B400]">{p.pop[1] >= 1000 ? (p.pop[1] / 1000).toFixed(2) + ' 亿' : p.pop[1] + ' 百万'}</span> ·
                  中位年龄 ≈ <span className="text-[#E8B400]">{p.medianAge[1]} 岁</span>
                </div>
              </div>
              <div className="lg:col-span-2 grid grid-cols-2 gap-px bg-cream/15 border border-cream/15">
                {stats.map(s => (
                  <div key={s.label} className="bg-ink p-4 md:p-5">
                    <div className="text-[12px] text-cream/60"><span className="text-cream/80"><Term en={s.ind} def={s.def}>{s.label}</Term></span></div>
                    <div className="font-num text-2xl md:text-3xl font-semibold mt-1.5" style={{ color: c.color === '#2E3030' ? '#E8B400' : c.color }}>{s.v}</div>
                    <div className="font-num text-[10px] text-cream/45 mt-1">{s.sub}</div>
                    <div className="h-9 mt-2 -mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={spark(code, s.ind)} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                          <Line type="monotone" dataKey="v" stroke="#E8B400" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 四个维度 */}
            <div className="flex flex-wrap border-b border-cream/20">
              {TAB_LABELS.map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-5 py-3 text-[13px] font-medium border-r border-cream/20 transition-colors ${tab === t.key ? 'bg-[#E8B400] text-ink' : 'hover:bg-cream/10'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="p-6 md:p-10 min-h-[220px]">
              <p className="max-w-4xl text-cream/85 leading-[2] text-[15px]">{c[tab]}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
