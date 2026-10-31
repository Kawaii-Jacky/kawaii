import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES } from '../data/countries'
import { PROJECTIONS } from '../data/meta'

export default function Future() {
  const [yearIdx, setYearIdx] = useState<0 | 1 | 2>(1) // 2050
  const yearLabel = ['2024（现状）', '2050', '2100'][yearIdx]

  const rows = useMemo(() => COUNTRIES.map(c => ({
    name: c.name, color: c.color, pop: PROJECTIONS[c.code].pop[yearIdx],
  })).sort((a, b) => b.pop - a.pop), [yearIdx])

  return (
    <section className="border-b border-sand px-6 md:px-12 py-20 md:py-28" id="future">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#B08A00] mb-4">08 · 望向未来</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">
          2050 年和 2100 年，<br />世界会是什么样？
        </h2>
        <p className="mt-5 max-w-3xl text-ink/75 leading-loose">
          联合国《世界人口展望 2024》的<Term en="Medium Variant" def="中方案预测：联合国人口司给出的中间情景，假设各国生育率沿历史路径缓慢变化。另有高方案（生育率+0.5）和低方案（-0.5），2100年的全球人口在三种方案下从70亿到144亿不等。">中方案预测</Term>给出了这些轮廓。请注意：预测越远越不确定——2100 年的全球人口，高方案和低方案之间差着整整一倍。
        </p>
      </Reveal>

      <div className="mt-10 grid lg:grid-cols-5 gap-px bg-sand border border-sand">
        <Reveal className="lg:col-span-3 bg-cream">
          <div className="p-5 md:p-7">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-display font-bold text-xl">八国人口规模（百万）</h3>
              <div className="flex border border-sand">
                {(['2024（现状）', '2050', '2100'] as const).map((y, i) => (
                  <button key={y} onClick={() => setYearIdx(i as 0 | 1 | 2)}
                    className={`px-3 py-1.5 font-num text-xs transition-colors ${i === yearIdx ? 'bg-ink text-cream' : 'hover:bg-parchment'}`}>{y}</button>
                ))}
              </div>
            </div>
            <div className="h-[380px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 16, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#D5CDB6" strokeDasharray="2 6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#2E3030' }} tickLine={false} axisLine={{ stroke: '#D5CDB6' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip contentStyle={{ background: '#2E3030', border: 'none', color: '#FBF8F2', fontSize: 12, borderRadius: 0 }}
                    formatter={(v: any) => [`${Number(v).toLocaleString()} 百万（${yearLabel}）`, '人口']} />
                  <Bar dataKey="pop" isAnimationActive={false}>
                    {rows.map(r => <Cell key={r.name} fill={r.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[13px] text-ink/60 mt-2 leading-relaxed">
              中国和日本柱子明显变矮；美国和沙特靠移民与相对高的生育率继续缓慢长个；委内瑞拉几乎原地踏步。
            </p>
          </div>
        </Reveal>

        <Reveal delay={80} className="lg:col-span-2 bg-cream">
          <div className="p-5 md:p-7 flex flex-col h-full">
            <h3 className="font-display font-bold text-xl">到 2050 年……</h3>
            <ul className="mt-4 space-y-4 text-[13.5px] leading-relaxed text-ink/80 flex-1">
              <li className="border-l-2 border-[#D64533] pl-3"><b>中国</b> 65+ 老人占比约 31%，中位年龄约 53 岁——比今天的日本还老。人口回到约 12.6 亿。</li>
              <li className="border-l-2 border-[#8E5EA2] pl-3"><b>日本</b> 老人占比逼近 38%，人口约 1.04 亿，守护「一个人也可以老得有尊严」成为国家命题。</li>
              <li className="border-l-2 border-[#148F77] pl-3"><b>沙特</b> 人口增至约 4500 万，红利窗口进入后半场——转型成败届时见分晓。</li>
              <li className="border-l-2 border-[#2E86C1] pl-3"><b>美国</b> 约 3.8 亿人，是发达大国里唯一确定继续增长的——前提是移民之门不关。</li>
              <li className="border-l-2 border-[#239B56] pl-3"><b>巴西</b> 人口见顶回落，老人占比翻倍到 19%，而人均收入大概率仍低于今天的发达国家。</li>
              <li className="border-l-2 border-[#5D6D7E] pl-3"><b>德国、英国</b> 人口靠移民勉强撑住，退休年龄继续往后挪，养老金改革是每届政府的必答题。</li>
            </ul>
            <div className="mt-6 border border-gold bg-gold/10 p-4">
              <p className="font-num text-[10px] tracking-[0.2em] text-[#B08A00] mb-1.5">最大的变量</p>
              <p className="text-[13px] leading-relaxed text-ink/80">
                生育率。全球总和生育率 2024 年约 2.25，联合国预计 2036 年前后触及 2.1。如果各国催生抽效，曲线会翘头；如果继续下探（韩国已跌破 0.8），所有预测都得重写——往更少的方向。
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
