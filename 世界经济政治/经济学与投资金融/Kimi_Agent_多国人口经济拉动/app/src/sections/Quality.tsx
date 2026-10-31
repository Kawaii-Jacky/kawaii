import { useMemo } from 'react'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES } from '../data/countries'
import wdi from '../data/wdi.json'

const L = wdi.years.length - 1

function latest(code: string, ind: string): number | null {
  const arr = (wdi.countries as any)[code][ind] as (number | null)[]
  for (let i = L; i >= 0; i--) if (arr[i] != null) return arr[i]
  return null
}

const PANELS = [
  { key: 'vuln', label: '脆弱就业占比', unit: '%', en: 'Vulnerable Employment', def: '自营劳动者+无薪家庭帮工占就业总数的比例。他们没有雇主、没有合同、没有社保，是就业质量的反向指标。', note: '越高越脆弱', good: 'low' },
  { key: 'youthUnemp', label: '青年失业率（15–24岁）', unit: '%', en: 'Youth Unemployment', def: '15–24岁劳动力中没有工作且正在找工作的比例。青年失业会留下长期的「疤痕效应」，影响一生收入。', note: '越高越危险', good: 'low' },
  { key: 'lfpr', label: '劳动参与率（15岁以上）', unit: '%', en: 'LFPR', def: '15岁以上人口中正在工作或找工作的比例。它衡量一个社会把多少「人」变成了「劳动力」——女性参与率是主要变量。', note: '适度为宜', good: 'mid' },
  { key: 'gdpPerWorker', label: '劳动生产率（人均产出，PPP）', unit: '千美元', en: 'GDP per Worker', def: '平均每个就业者一年创造的GDP（购买力平价）。这是工资的长期天花板，也是国家贫富最硬的解释变量。', note: '越高越富', good: 'high' },
] as const

export default function Quality() {
  const data = useMemo(() => PANELS.map(p => ({
    ...p,
    rows: COUNTRIES.map(c => {
      const v = latest(c.code, p.key)
      return { name: c.name, color: c.color, v: v != null ? (p.key === 'gdpPerWorker' ? +(v / 1000).toFixed(1) : +v.toFixed(1)) : null }
    }).sort((a, b) => (b.v ?? 0) - (a.v ?? 0)),
    max: Math.max(...COUNTRIES.map(c => latest(c.code, p.key) ?? 0)) / (p.key === 'gdpPerWorker' ? 1000 : 1),
  })), [])

  return (
    <section className="relative border-b border-[#e5e0d5] px-6 md:px-12 py-20 md:py-28 overflow-hidden" id="quality">
      <div className="watermark text-[20vw] -left-8 -bottom-12 hidden md:block">Quality</div>
      <Reveal>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-num text-xs tracking-[0.25em] text-crimson">04 · 转 — 数量之外，质量如何？</span>
          <span className="w-16 h-px bg-crimson" />
        </div>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">失业率低，<br />不等于就业好</h2>
        <p className="mt-5 max-w-3xl text-ink/70 leading-loose">
          越南失业率 1.6%，日本 2.5%——都很漂亮。但一个的劳动者在流水线上组装别人的芯片，一个在非正规雇佣里拿着七折工资。衡量就业质量，要看四面镜子：<Term en="Vulnerable Employment" def="脆弱就业：自营+无薪家庭帮工占比，反映岗位的稳定性与保障水平。">脆弱就业</Term>、<Term en="Youth Unemployment" def="青年失业率：15–24岁劳动力失业比例，衡量经济体吸纳新人的能力。">青年失业</Term>、<Term en="LFPR" def="劳动参与率：15岁以上人口中参与劳动力市场的比例，反映人力动员程度，尤其女性。">劳动参与</Term>和<Term en="GDP per Worker" def="劳动生产率：每个就业者创造的GDP（PPP计价），工资水平的上限。">劳动生产率</Term>。
        </p>
      </Reveal>

      <div className="relative mt-10 grid md:grid-cols-2 gap-px bg-[#e5e0d5] border border-[#e5e0d5]">
        {data.map((p, pi) => (
          <Reveal key={p.key} delay={pi * 60} className="bg-white">
            <div className="p-5 md:p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display font-bold text-lg">{p.label}</h3>
                <span className="font-num text-[10px] text-ink/40 uppercase">{p.note}</span>
              </div>
              <div className="mt-4 space-y-2">
                {p.rows.map(r => (
                  <div key={r.name} className="grid grid-cols-[56px_1fr_58px] items-center gap-2.5">
                    <span className="text-[12px] text-ink/70">{r.name}</span>
                    <div className="h-[18px] bg-paper relative">
                      <div className="h-full transition-all duration-500" style={{ width: `${((r.v ?? 0) / p.max) * 100}%`, background: r.color }} />
                    </div>
                    <span className="font-num text-[12px] text-right text-ink/80">{r.v ?? '—'}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 pt-3 border-t border-[#e5e0d5] text-[12.5px] text-ink/65 leading-relaxed">
                {{ vuln: '印度 72% 的就业是脆弱的：没有合同、没有社保。德国不到 5%——差距比收入差距更刺眼。', youthUnemp: '青年失业考验的是经济体「造新岗位」的能力。德国靠双元制把青年失业率压到 6% 左右；巴西和沙特的青年则在两位数线上挣扎。', lfpr: '沙特的劳动参与率随着女性大规模入市快速攀升，是过去十年全球变化最剧烈的劳动力市场之一。', gdpPerWorker: '生产率是残酷的裁判：美国一个劳动者一年的产出，印度要六个半人。所有关于工资的讨论，最终都回到这条曲线上。' }[p.key]}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
