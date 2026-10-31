import { useMemo, useState } from 'react'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES, COUNTRY_MAP, type CountryCode } from '../data/countries'
import wdi from '../data/wdi.json'

const SECTORS = [
  { emp: 'empAgr', va: 'vaAgr', label: '农业', color: '#A67C00' },
  { emp: 'empInd', va: 'vaInd', label: '工业', color: '#5D6D7E' },
  { emp: 'empSrv', va: 'vaSrv', label: '服务业', color: '#CE323A' },
] as const

export default function StructureGap() {
  const [code, setCode] = useState<CountryCode>('IN')
  const [year, setYear] = useState<1991 | 2024>(2024)

  const d = wdi.countries[code] as unknown as Record<string, (number | null)[]>
  const c = COUNTRY_MAP[code]

  const data = useMemo(() => {
    // 产值数据部分国家 1991 缺失，向前找最近年份
    const yi = (ind: string): number => {
      let i = year - 1991
      while (i > 0 && d[ind][i] == null) i--
      return i
    }
    return SECTORS.map(s => {
      const ie = yi(s.emp), iv = yi(s.va)
      return { ...s, empVal: d[s.emp][ie], vaVal: d[s.va][iv], gap: d[s.emp][ie] != null && d[s.va][iv] != null ? +(d[s.emp][ie]! - d[s.va][iv]!).toFixed(1) : null }
    })
  }, [code, year]) // eslint-disable-line

  const agrGap = data[0].gap

  return (
    <section className="relative border-b border-[#e5e0d5] px-6 md:px-12 py-20 md:py-28 bg-paper overflow-hidden" id="gap">
      <div className="watermark text-[22vw] -right-8 top-0 hidden md:block">Gap</div>
      <Reveal>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-num text-xs tracking-[0.25em] text-crimson">03 · 转 — 结构里的剪刀差</span>
          <span className="w-16 h-px bg-crimson" />
        </div>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">42% 的人种地，<br />只产出 18% 的 GDP</h2>
        <p className="mt-5 max-w-3xl text-ink/70 leading-loose">
          把一个经济体按三次产业拆开，对比「就业占比」和「产值占比」，你会看到发展经济学里最直观的一张 X 光片：农业的就业占比远高于产值占比，意味着大量劳动力被困在低生产率部门——他们「有工作」，但工作产出微薄。这道差距就是<Term en="Dual Economy" def="二元经济结构：现代部门（工业/服务业）与传统部门（农业）并存、生产率悬殊的经济形态，由发展经济学家刘易斯提出。">二元经济</Term>的量化形状，也是就业质量差异的总源头。
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="relative mt-10 border border-[#e5e0d5] bg-white">
          <div className="flex flex-wrap items-center border-b border-[#e5e0d5]">
            <div className="flex flex-wrap">
              {COUNTRIES.map(cc => (
                <button key={cc.code} onClick={() => setCode(cc.code)}
                  className={`px-4 py-3 text-sm border-r border-[#e5e0d5] font-medium transition-colors inline-flex items-center gap-2 ${cc.code === code ? 'bg-ink text-white' : 'hover:bg-paper'}`}>
                  <i className="w-2.5 h-2.5" style={{ background: cc.color }} />{cc.name}
                </button>
              ))}
            </div>
            <div className="ml-auto flex border-l border-[#e5e0d5]">
              {([1991, 2024] as const).map(y => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-4 py-3 font-num text-sm transition-colors ${year === y ? 'bg-crimson text-white' : 'hover:bg-paper'}`}>{y}</button>
              ))}
            </div>
          </div>

          <div className="p-6 md:p-10">
            <div className="grid md:grid-cols-[1fr_260px] gap-10">
              <div className="space-y-8">
                {data.map(s => (
                  <div key={s.label}>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="font-display font-bold text-lg">{s.label}</span>
                      {s.gap != null && (
                        <span className="font-num text-xs text-ink/50">
                          剪刀差 <b className={s.gap > 5 ? 'text-crimson' : s.gap < -5 ? 'text-[#148F77]' : ''}>{s.gap > 0 ? '+' : ''}{s.gap}</b> pp
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-[92px_1fr_64px] items-center gap-3">
                        <span className="text-[12px] text-ink/60">就业占比</span>
                        <div className="h-7 bg-paper relative"><div className="h-full transition-all duration-500" style={{ width: `${s.empVal ?? 0}%`, background: s.color }} /></div>
                        <span className="font-num text-sm font-semibold text-right">{s.empVal?.toFixed(1)}%</span>
                      </div>
                      <div className="grid grid-cols-[92px_1fr_64px] items-center gap-3">
                        <span className="text-[12px] text-ink/60">产值占比</span>
                        <div className="h-7 bg-paper relative"><div className="h-full transition-all duration-500 border border-ink/70" style={{ width: `${s.vaVal ?? 0}%`, background: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(23,23,23,0.12) 4px, rgba(23,23,23,0.12) 6px)' }} /></div>
                        <span className="font-num text-sm text-ink/70 text-right">{s.vaVal?.toFixed(1) ?? '—'}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-l border-[#e5e0d5] pl-8 hidden md:flex flex-col justify-center">
                <p className="font-num text-[10px] tracking-[0.2em] text-crimson uppercase">{c.name} · {year}</p>
                <p className="font-num text-6xl font-semibold mt-3">{agrGap != null ? `+${agrGap}` : '—'}<span className="text-lg text-ink/40">pp</span></p>
                <p className="text-[13px] text-ink/60 mt-3 leading-relaxed">农业就业占比超出产值占比的幅度。数字越大，越多劳动力沉淀在低生产率部门。</p>
                <p className="text-[12.5px] text-ink/70 mt-5 pt-5 border-t border-[#e5e0d5] leading-relaxed">
                  {{ US: '美国农业用 1.6% 的劳动力产出约 1% 的 GDP——农业早已是技术密集型产业，拖拉机比农民多。', DE: '德国农业就业仅 1%，剪刀差几乎消失。工业 27% 的就业匹配 27% 的产值，均衡而坚实。', JP: '日本农业就业 2.9% vs 产值 1%——小规模兼业农户靠补贴和保护维持，是发达经济体中农业效率最低的之一。', CN: '中国 22% 的劳动力还在农业，只产出约 7% 的 GDP。城镇化每推进一步，这道口子就收窄一分。', IN: '印度是八国中最大的剪刀差：4 亿多农业劳动力，人均产出只有服务业的零头。这就是「无就业增长」的另一面——不是没有就业，是就业困在低产出里。', VN: '越南的剪刀差正在快速收窄——工厂每年从农村吸走百万劳动力。但组装环节的增加值率仍然偏低。', SA: '沙特农业就业 2.6%，沙漠里的农业靠补贴和外籍劳工维持。真正的结构问题不在农业，而在石油 vs 其他的一切。', BR: '巴西的农业反而是现代化部门：大豆、牛肉出口强劲，就业占比已降到 8%。巴西的问题出在没有完成工业化的工业。' }[code]}
                </p>
              </div>
            </div>
          </div>
          <p className="px-6 md:px-10 pb-6 text-[13px] text-ink/60 border-t border-[#e5e0d5] pt-4 bg-paper/60 leading-relaxed">
            <span className="font-num text-[10px] tracking-widest text-crimson mr-2">怎么读</span>
            实心条是就业占比，条纹条是产值占比。两者相等意味着该部门人均产出等于全国平均；就业远超产值 = 低生产率沉淀。把年份从 2024 切回 1991，看看三十年来谁填平了这道沟。
          </p>
        </div>
      </Reveal>
    </section>
  )
}
