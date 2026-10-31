import { useMemo, useState } from 'react'
import { Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, ComposedChart, Cell, BarChart, Bar, LabelList } from 'recharts'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES, COUNTRY_MAP, type CountryCode } from '../data/countries'
import { ELASTICITY } from '../data/static'
import wdi from '../data/wdi.json'

export default function PullSection() {
  const [focus, setFocus] = useState<CountryCode>('CN')

  // 奥肯散点：GDP增速 vs 失业率年度变化
  const scatter = useMemo(() => {
    const d = wdi.countries[focus] as unknown as Record<string, (number | null)[]>
    const pts: { g: number; du: number }[] = []
    for (let i = 1; i < wdi.years.length; i++) {
      const g = d.gdpGrow[i], u0 = d.unemp[i - 1], u1 = d.unemp[i]
      if (g != null && u0 != null && u1 != null) pts.push({ g: +g.toFixed(2), du: +(u1 - u0).toFixed(2) })
    }
    return pts
  }, [focus])

  const elastRows = useMemo(() => COUNTRIES.map(c => ({
    name: c.name, color: c.color, e1: ELASTICITY[c.code][0], e2: ELASTICITY[c.code][1],
  })).sort((a, b) => b.e2 - a.e2), [])

  return (
    <section className="relative px-6 md:px-12 py-20 md:py-28 bg-[#111111] text-white overflow-hidden" id="pull">
      <div className="watermark watermark-light text-[22vw] right-0 -top-8 hidden md:block">Pull</div>
      <Reveal>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-num text-xs tracking-[0.25em] text-[#ff8a90]">02 · 承 — 增长能拉动多少就业？</span>
          <span className="w-16 h-px bg-crimson" />
        </div>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">同样增长 1%，<br />有人创造岗位，有人只创造数字</h2>
        <p className="mt-5 max-w-3xl text-white/70 leading-loose">
          宏观经济学有一条著名的经验规律——<Term dark en="Okun's Law" def="奥肯定律：GDP增速每高于潜在增速1个百分点，失业率约下降0.3–0.5个百分点。它描述增长与失业之间的短期此消彼长。">奥肯定律</Term>：增长快了，失业就降。但它的「汇率」在每个国家都不一样。下面两张图，一张看短期联动（增长 vs 失业率变化），一张看长期能力（就业弹性）。
        </p>
      </Reveal>

      <div className="relative mt-10 grid lg:grid-cols-2 gap-px bg-white/15 border border-white/15">
        {/* 弹性对比 */}
        <Reveal className="bg-[#111111]">
          <div className="p-5 md:p-7">
            <h3 className="font-display font-bold text-xl">就业弹性：增长的「含岗量」</h3>
            <p className="text-[13px] text-white/60 mt-2 leading-relaxed">
              每 1% 的 GDP 增长，能带动百分之几的就业增长？两个年代的对比里藏着趋势：中国在投资驱动的年代弹性只有 0.09，而后趋近于 0；沙特大于 1 是特殊统计现象（用工本地化政策），不代表常态。
            </p>
            <div className="h-[380px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={elastRows} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
                  <CartesianGrid stroke="#333" strokeDasharray="2 6" horizontal={false} />
                  <XAxis type="number" domain={[0, 1.6]} tick={{ fontSize: 10, fill: '#999', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#fff' }} tickLine={false} axisLine={false} width={60} />
                  <Tooltip contentStyle={{ background: '#fff', border: 'none', color: '#171717', fontSize: 12, borderRadius: 0 }}
                    formatter={(v: any, name: any) => [v, name === 'e1' ? '2000–2007' : '2010–2019']} />
                  <Bar dataKey="e1" name="e1" fill="#555" isAnimationActive={false} barSize={7} />
                  <Bar dataKey="e2" name="e2" isAnimationActive={false} barSize={7}>
                    {elastRows.map(r => <Cell key={r.name} fill={r.color} />)}
                    <LabelList dataKey="e2" position="right" style={{ fontSize: 10, fill: '#fff', fontFamily: 'IBM Plex Mono' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 font-num text-[10px] text-white/50 mt-1">
              <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 bg-[#555] inline-block" />2000–2007</span>
              <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 bg-crimson inline-block" />2010–2019（彩色）</span>
            </div>
          </div>
        </Reveal>

        {/* 奥肯散点 */}
        <Reveal delay={80} className="bg-[#111111]">
          <div className="p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-xl">奥肯检验：增长一咳嗽，失业就发烧？</h3>
                <p className="text-[13px] text-white/60 mt-2 leading-relaxed">
                  横轴是当年 GDP 增速，纵轴是失业率的变化。点越往左上方跑，说明增长对失业的「免疫力」越差。选一个国家看看。
                </p>
              </div>
              <select value={focus} onChange={e => setFocus(e.target.value as CountryCode)}
                className="border border-white/25 bg-[#111111] text-white px-2 py-1.5 text-sm font-medium shrink-0">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="h-[340px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={scatter} margin={{ top: 20, right: 16, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="#333" strokeDasharray="2 6" />
                  <XAxis dataKey="g" type="number" domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#999', fontFamily: 'IBM Plex Mono' }} tickLine={false}
                    label={{ value: 'GDP 增速 %', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#999' }} />
                  <YAxis dataKey="du" type="number" tick={{ fontSize: 10, fill: '#999', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false}
                    label={{ value: '失业率变化(百分点)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#999' }} />
                  <ReferenceLine y={0} stroke="#666" />
                  <Tooltip contentStyle={{ background: '#fff', border: 'none', color: '#171717', fontSize: 12, borderRadius: 0 }}
                    formatter={(v: any, name: any) => name === 'g' ? [`${v}%`, 'GDP 增速'] : [`${v} pp`, '失业率变化']} />
                  <Scatter data={scatter} fill={COUNTRY_MAP[focus].color} isAnimationActive={false}>
                    {scatter.map((p, i) => <Cell key={i} fill={p.du > 0.8 ? '#ff8a90' : COUNTRY_MAP[focus].color} fillOpacity={0.85} />)}
                  </Scatter>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[13px] text-white/60 mt-3 leading-relaxed">
              {{ US: '美国：典型的奥肯形态——负增长年份失业率飙升（红点是 2009 和 2020），复苏时快速回落。灵活市场的两面性都在这张图里。', DE: '德国：注意 2009 年——GDP 暴跌 5.7%，失业率几乎没动。短时工作制让企业「囤人」过冬，代价由政府财政分担。', JP: '日本：散点几乎压成一条平线。企业靠减工时、冻结招聘消化冲击，失业率波澜不惊，工资却长期不涨。', CN: '中国：城镇登记/调查失业率被政府稳就业目标强力锚定，GDP 增速从 10% 降到 5%，失业率几乎没变——联动的信号更多体现在工资和工时上。', IN: '印度：7% 的增长也压不住失业率的波动。因为新增岗位大多在非正规部门，统计失业率测不到真正的「就业不足」。', VN: '越南：增长稳定在 6–8%，失业率常年 2% 上下——加工出口模式带来持续的人力需求，真正的风险是工价上涨快于生产率。', SA: '沙特：GDP 随油价大起大落，失业率却有自己的节奏——本国就业由财政和政策决定，与经济周期基本绝缘。', BR: '巴西：2015–16 年衰退的两个红点触目惊心——大宗商品崩盘，失业率从 7% 以下冲到 13% 以上。高弹性的另一面是摔得更狠。' }[focus]}
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={120}>
        <p className="mt-10 max-w-3xl text-white/70 leading-loose">
          为什么弹性差这么多？答案不在宏观总量里，而在结构里：同样一块钱 GDP，是油田产的、工厂产的、还是餐馆产的，背后需要的劳动力完全不同。下一章，我们把经济体拆开来看。
        </p>
      </Reveal>
    </section>
  )
}
