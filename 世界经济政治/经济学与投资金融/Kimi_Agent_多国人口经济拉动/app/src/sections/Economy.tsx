import { useMemo, useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, LineChart, Line, Legend } from 'recharts'
import Reveal from '../components/Reveal'
import Term from '../components/Term'
import { COUNTRIES, COUNTRY_MAP, type CountryCode } from '../data/countries'
import wdi from '../data/wdi.json'

const L = wdi.years.length - 1

export default function Economy() {
  const [focus, setFocus] = useState<CountryCode>('CN')

  const scatter = useMemo(() => COUNTRIES.map(c => {
    const d = wdi.countries[c.code] as Record<string, (number | null)[]>
    // 找最近一个有 GDP 数据的年份（委内瑞拉近年缺失）
    let gi = L
    while (gi > 0 && d.gdpPc[gi] == null) gi--
    return { code: c.code, name: c.name, color: c.color, tfr: d.tfr[L], gdp: d.gdpPc[gi], gdpYear: 1960 + gi, age65: d.age65[L] }
  }).filter(d => d.tfr != null && d.gdp != null), [])

  const focusData = useMemo(() => {
    const d = wdi.countries[focus] as Record<string, (number | null)[]>
    return wdi.years.map((y, i) => ({ year: y, gdp: d.gdpPc[i], dep: d.dep[i] }))
  }, [focus])

  return (
    <section className="border-b border-sand px-6 md:px-12 py-20 md:py-28 bg-parchment/60" id="economy">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#B08A00] mb-4">07 · 人口与钱袋子</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">
          人口结构，<br />如何改写经济
        </h2>
        <p className="mt-5 max-w-3xl text-ink/75 leading-loose">
          人口对经济的传导链条其实很朴素：劳动年龄人口决定「能生产多少」，<Term en="Dependency Ratio" def="抚养比：每100名劳动者对应的被抚养人口。越低，社会可用于投资和消费的余力越大。">抚养比</Term>决定「要分出去多少」，而生育率决定「二十年后还剩多少劳动力」。左图看横截面的规律，右图看一个国家的时间轨迹。
        </p>
      </Reveal>

      <div className="mt-10 grid lg:grid-cols-2 gap-px bg-sand border border-sand">
        {/* 散点：TFR vs 人均GDP */}
        <Reveal className="bg-cream">
          <div className="p-5 md:p-7">
            <h3 className="font-display font-bold text-xl">2024 横截面：越富越不生？</h3>
            <p className="text-[13px] text-ink/65 mt-2 leading-relaxed">横轴是人均 GDP（对数刻度），纵轴是总和生育率。富裕国家普遍在 2.1 以下扎堆——但注意巴西和中国：还没富到位，生育率已经先降了，这就是「未富先老」。</p>
            <div className="h-[340px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 24, bottom: 10, left: 0 }}>
                  <CartesianGrid stroke="#D5CDB6" strokeDasharray="2 6" />
                  <XAxis type="number" dataKey="gdp" scale="log" domain={[800, 100000]} tickFormatter={v => v >= 1000 ? `${v / 1000}k` : `${v}`} tick={{ fontSize: 10, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} name="人均GDP" label={{ value: '人均 GDP（美元，对数）', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#2E3030' }} />
                  <YAxis type="number" dataKey="tfr" domain={[0.5, 3]} tick={{ fontSize: 10, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} name="总和生育率" />
                  <Tooltip contentStyle={{ background: '#2E3030', border: 'none', color: '#FBF8F2', fontSize: 12, borderRadius: 0 }}
                    formatter={(v: any, name: any) => name === '人均GDP' ? [`$${Number(v).toLocaleString()}`, name] : [v, name]}
                    labelFormatter={() => ''} />
                  {scatter.map(s => (
                    <Scatter key={s.code} name={s.name} data={[s]} fill={s.color}>
                      <LabelList dataKey="name" position="top" style={{ fontSize: 11, fill: '#2E3030' }} />
                    </Scatter>
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-ink/45 mt-1 font-num">委内瑞拉为 2014 年人均 GDP（此后数据缺失）</p>
          </div>
        </Reveal>

        {/* 双轴：抚养比 vs 人均GDP */}
        <Reveal delay={80} className="bg-cream">
          <div className="p-5 md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-xl">红利期 = 增长加速期</h3>
                <p className="text-[13px] text-ink/65 mt-2 leading-relaxed">选一个国家：金色线是总抚养比（右轴），彩色线是人均 GDP（左轴）。抚养比触底的那段日子，往往就是经济跑得最快的年代。</p>
              </div>
              <select value={focus} onChange={e => setFocus(e.target.value as CountryCode)}
                className="border border-sand bg-cream px-2 py-1.5 text-sm font-medium shrink-0">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div className="h-[340px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={focusData} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#D5CDB6" strokeDasharray="2 6" vertical={false} />
                  <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} tickLine={false} interval={9} />
                  <YAxis yAxisId="gdp" tick={{ fontSize: 10, fill: '#2E3030', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} width={52} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                  <YAxis yAxisId="dep" orientation="right" tick={{ fontSize: 10, fill: '#B08A00', fontFamily: 'IBM Plex Mono' }} tickLine={false} axisLine={false} width={36} domain={[20, 110]} />
                  <Tooltip contentStyle={{ background: '#2E3030', border: 'none', color: '#FBF8F2', fontSize: 12, borderRadius: 0 }}
                    formatter={(v: any, name: any) => name === '人均 GDP' ? [`$${Number(v).toLocaleString()}`, name] : [`${v}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="gdp" type="monotone" dataKey="gdp" name="人均 GDP" stroke={COUNTRY_MAP[focus].color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
                  <Line yAxisId="dep" type="monotone" dataKey="dep" name="总抚养比" stroke="#E8B400" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[13px] text-ink/60 mt-3 leading-relaxed">
              {focus === 'CN' && '中国的抚养比 2010 年前后触底（约 34%），恰是两位数增长的尾声；此后抚养比回升，增长换挡。这不是巧合，是人口规律。'}
              {focus === 'JP' && '日本的抚养比 1990 年代初触底，随后泡沫破裂、增长停滞——人口红利关闭和经济转折几乎同时发生。'}
              {focus === 'US' && '美国的抚养比曲线平缓得多，移民让红利期被拉长，这是它相对欧日的结构性优势。'}
              {focus === 'DE' && '德国的抚养比已回升到 59%，且全是老人贡献的——制造业强国的劳动力焦虑由此而来。'}
              {focus === 'SA' && '沙特正处在抚养比的历史低位——37% 左右。窗口开着，但 2030 愿景必须赶在窗口关闭前完成。'}
              {focus === 'GB' && '英国的抚养比温和回升，问题不在人口本身，而在生产率停滞——人多了，人均产出没跟上。'}
              {focus === 'BR' && '巴西的抚养比谷底（约 44%）比中国浅、持续短，而人均 GDP 卡在 1 万美元——红利没吃饱就散席了。'}
              {focus === 'VE' && '委内瑞拉的曲线被经济危机拦腰截断：人口转型还在继续，但经济列车脱轨了。'}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
