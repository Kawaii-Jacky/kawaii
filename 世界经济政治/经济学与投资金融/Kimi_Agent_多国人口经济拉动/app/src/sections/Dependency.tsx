import { useMemo, useState } from 'react'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES } from '../data/countries'
import wdi from '../data/wdi.json'

type Mode = 'depOld' | 'depYoung'
const LATEST = wdi.years.length - 1

export default function Dependency() {
  const [mode, setMode] = useState<Mode>('depOld')

  const rows = useMemo(() => {
    return COUNTRIES.map(c => {
      const d = wdi.countries[c.code] as Record<string, (number | null)[]>
      return { c, y1960: d[mode][0] ?? 0, y2024: d[mode][LATEST] ?? 0 }
    }).sort((a, b) => b.y2024 - a.y2024)
  }, [mode])

  const max = Math.max(...rows.flatMap(r => [r.y1960, r.y2024]))

  return (
    <section className="border-b border-sand px-6 md:px-12 py-20 md:py-28" id="dependency">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#B08A00] mb-4">04 · 肩膀上的重量</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">
          每 100 个干活的人，<br />要养多少人？
        </h2>
        <p className="mt-5 max-w-3xl text-ink/75 leading-loose">
          这就是<Term en="Dependency Ratio" def="抚养比：每100名15–64岁劳动人口对应的非劳动人口数量。少儿抚养比看孩子，老年抚养比看老人。">抚养比</Term>的直觉版。六十年前，各国的负担主要是「孩子」；今天，日本和德国的负担已经主要是「老人」。负担的性质变了，解法也完全不同——孩子十几年后会变成劳动力，老人不会。
        </p>
      </Reveal>

      <Reveal delay={100}>
        <div className="mt-10 border border-sand">
          <div className="flex border-b border-sand">
            <button onClick={() => setMode('depOld')} className={`px-5 py-3 text-sm font-medium border-r border-sand transition-colors ${mode === 'depOld' ? 'bg-ink text-cream' : 'hover:bg-parchment'}`}>
              老年抚养比（养老压力）
            </button>
            <button onClick={() => setMode('depYoung')} className={`px-5 py-3 text-sm font-medium border-r border-sand transition-colors ${mode === 'depYoung' ? 'bg-ink text-cream' : 'hover:bg-parchment'}`}>
              少儿抚养比（养娃压力）
            </button>
            <div className="ml-auto hidden md:flex items-center gap-4 px-4 font-num text-[10px] text-ink/50">
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 border border-ink inline-block" />1960</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 bg-ink inline-block" />2024</span>
            </div>
          </div>
          <div className="p-5 md:p-8 space-y-5">
            {rows.map(({ c, y1960, y2024 }, i) => (
              <Reveal key={c.code} delay={i * 40}>
                <div className="grid grid-cols-[88px_1fr_120px] md:grid-cols-[110px_1fr_170px] items-center gap-3">
                  <span className="text-sm font-medium inline-flex items-center gap-2">
                    <i className="w-2.5 h-2.5 shrink-0" style={{ background: c.color }} />{c.name}
                  </span>
                  <div className="relative h-7 bg-parchment">
                    <div className="absolute inset-y-0 left-0 border border-ink/60 transition-all duration-500" style={{ width: `${(y1960 / max) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{ width: `${(y2024 / max) * 100}%`, background: c.color, opacity: 0.9 }} />
                  </div>
                  <div className="font-num text-[11px] md:text-xs text-ink/70 leading-tight">
                    <span className="font-semibold text-ink">{y2024.toFixed(0)}</span>
                    <span className="text-ink/45"> / 1960年 {y1960.toFixed(0)}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="px-5 md:px-8 pb-6 text-[13px] text-ink/60 leading-relaxed border-t border-sand pt-4 bg-cream/60">
            {mode === 'depOld'
              ? '日本每 100 个劳动者对应 51 位老人，意味着大约 2 个在职者养 1 位退休者——养老金、护理、医疗的账都要从这里出。沙特的 4 则代表几乎还没有养老负担，红利期正当其时。'
              : '1960 年，中国、巴西、沙特每 100 个劳动者要养 80 多个孩子——那是人口爆炸的年代。今天这组数字普遍砍半甚至更多，学校开始招不满，而幼儿园过剩正变成养老院短缺的前奏。'}
          </p>
        </div>
      </Reveal>
    </section>
  )
}
