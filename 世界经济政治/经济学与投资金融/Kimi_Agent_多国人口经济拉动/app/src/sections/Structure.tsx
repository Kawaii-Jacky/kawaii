import { useEffect, useMemo, useState } from 'react'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES, COUNTRY_MAP, type CountryCode } from '../data/countries'
import wdi from '../data/wdi.json'

function shapeOf(age65: number, age014: number): { name: string; desc: string } {
  if (age65 >= 20) return { name: '倒金字塔', desc: '老人比孩子多得多，顶部沉重——收缩型社会' }
  if (age65 >= 14) return { name: '壶形 / 顶部变重', desc: '深度老龄化，塔顶越来越宽' }
  if (age65 >= 7 && age014 < 25) return { name: '柱形', desc: '各年龄段接近均匀，静止型人口' }
  if (age014 >= 30) return { name: '金字塔', desc: '底宽顶尖，典型的年轻增长型社会' }
  return { name: '钟形', desc: '底部收窄中，转型正在进行' }
}

export default function Structure() {
  const [code, setCode] = useState<CountryCode>('CN')
  const [year, setYear] = useState(2024)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setYear(y => { if (y >= 2024) { setPlaying(false); return 2024 } return y + 1 })
    }, 120)
    return () => clearInterval(t)
  }, [playing])

  const yi = year - 1960
  const c = COUNTRY_MAP[code]
  const d = wdi.countries[code] as Record<string, (number | null)[]>
  const young = d.age014[yi] ?? 0
  const old = d.age65[yi] ?? 0
  const mid = d.age1564[yi] ?? 0
  const shape = shapeOf(old, young)

  // 历史序列小条形图
  const bars = useMemo(() => {
    const idxs: number[] = []
    for (let i = 0; i < wdi.years.length; i += 4) idxs.push(i)
    if (idxs[idxs.length - 1] !== wdi.years.length - 1) idxs.push(wdi.years.length - 1)
    return idxs
  }, [])

  const depNow = d.dep[yi]

  return (
    <section className="border-b border-sand px-6 md:px-12 py-20 md:py-28 bg-parchment/60" id="structure">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#B08A00] mb-4">03 · 结构变形记</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">
          <Term en="Population Pyramid" def="人口金字塔：按年龄段画出的人口结构图。底宽顶尖=年轻社会；上下均匀=静止型；上宽下窄=收缩型社会。">人口金字塔</Term>是怎样倒过来的
        </h2>
        <p className="mt-5 max-w-3xl text-ink/75 leading-loose">
          选一个国家，拖动年份（或按播放），看它的三段结构——孩子、劳动者、老人——如何此消彼长。注意中国 1990 年后底部的快速收窄，和日本顶部的不断膨胀。
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-10 border border-sand bg-cream">
          {/* 国家选择 */}
          <div className="flex flex-wrap border-b border-sand">
            {COUNTRIES.map(cc => (
              <button key={cc.code} onClick={() => setCode(cc.code)}
                className={`px-4 py-3 text-sm border-r border-sand font-medium transition-colors inline-flex items-center gap-2 ${cc.code === code ? 'bg-ink text-cream' : 'hover:bg-parchment'}`}>
                <i className="w-2.5 h-2.5" style={{ background: cc.color }} />{cc.name}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-5 gap-0">
            {/* 当前结构大条 */}
            <div className="md:col-span-2 p-6 md:p-8 border-b md:border-b-0 md:border-r border-sand flex flex-col justify-between">
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="font-num text-6xl md:text-7xl font-semibold" style={{ color: c.color }}>{year}</span>
                  <span className="font-display font-bold text-2xl">{c.name}</span>
                </div>
                <div className="mt-2 inline-block border border-ink px-2 py-1 text-xs font-medium bg-gold/20">{shape.name} · {shape.desc}</div>
              </div>

              {/* 三段堆叠条 */}
              <div className="mt-8 space-y-5">
                {[
                  { label: '0–14 岁 孩子', v: young, color: '#E8B400' },
                  { label: '15–64 岁 劳动者', v: mid, color: c.color },
                  { label: '65+ 岁 老人', v: old, color: '#2E3030' },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-[13px] mb-1.5">
                      <span className="text-ink/70">{s.label}</span>
                      <span className="font-num font-semibold">{s.v.toFixed(1)}%</span>
                    </div>
                    <div className="h-6 bg-sand/40 relative overflow-hidden">
                      <div className="h-full transition-all duration-300" style={{ width: `${s.v}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-5 border-t border-sand flex items-end justify-between">
                <div>
                  <div className="text-xs text-ink/60 mb-1"><Term en="Dependency Ratio" def="抚养比：每100名劳动年龄人口对应的非劳动人口（孩子+老人）数量。越高负担越重。">总抚养比</Term></div>
                  <div className="font-num text-3xl font-semibold">{depNow?.toFixed(0)}<span className="text-sm text-ink/50">%</span></div>
                </div>
                <p className="text-[12px] text-ink/55 max-w-[180px] leading-relaxed">即每 100 个劳动者，要支撑 {depNow?.toFixed(0)} 位孩子和老人</p>
              </div>
            </div>

            {/* 时间序列条 + 滑块 */}
            <div className="md:col-span-3 p-6 md:p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => { setYear(1960); setPlaying(true) }}
                  className="w-10 h-10 border border-ink flex items-center justify-center hover:bg-ink hover:text-cream transition-colors" aria-label="播放">
                  <svg width="12" height="14" viewBox="0 0 12 14"><path d="M0 0 L12 7 L0 14 Z" fill="currentColor" /></svg>
                </button>
                <input type="range" min={1960} max={2024} value={year}
                  onChange={e => { setPlaying(false); setYear(+e.target.value) }}
                  className="flex-1 accent-[#2E3030]" />
                <span className="font-num text-xs text-ink/50 w-20 text-right">1960–2024</span>
              </div>
              {/* 迷你堆叠条历史 */}
              <div className="flex-1 flex items-end gap-[3px] min-h-[260px]">
                {bars.map(i => (
                  <button key={i} onClick={() => { setPlaying(false); setYear(1960 + i) }}
                    className="flex-1 flex flex-col-reverse group relative" style={{ height: '100%' }} title={`${1960 + i} 年`}>
                    <div style={{ height: `${d.age014[i] ?? 0}%`, background: '#E8B400' }} className="w-full" />
                    <div style={{ height: `${d.age1564[i] ?? 0}%`, background: c.color, opacity: i === yi ? 1 : 0.75 }} className="w-full" />
                    <div style={{ height: `${d.age65[i] ?? 0}%`, background: '#2E3030' }} className="w-full transition-opacity" />
                    {i === yi && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-px h-full bg-ink/60 pointer-events-none" style={{ height: 'calc(100% + 8px)' }} />}
                  </button>
                ))}
              </div>
              <div className="flex justify-between font-num text-[10px] text-ink/45 mt-2"><span>1960</span><span>1980</span><span>2000</span><span>2024</span></div>
              <div className="mt-4 flex gap-4 text-[11px] text-ink/60">
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 bg-[#E8B400] inline-block" />0–14 岁</span>
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 inline-block" style={{ background: c.color }} />15–64 岁</span>
                <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 bg-[#2E3030] inline-block" />65+ 岁</span>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
