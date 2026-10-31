import { useMemo, useState } from 'react'
import EChart from '../components/EChart'
import { PAL, ECHARTS_BASE, COUNTRY_COLOR, COUNTRY_NAME } from '../lib/report'
import type { ReportData } from '../lib/report'
import { SectionTitle } from './HoursTerrain'

// ================= 政策冲击时间轴 =================
export function PolicyShocks({ d }: { d: ReportData }) {
  const [filter, setFilter] = useState<'ALL' | 'CN' | 'US' | 'DE'>('ALL')
  const events = [...d.policy_shocks].sort((a, b) => a.year - b.year)
    .filter((e) => filter === 'ALL' || e.country === filter)

  return (
    <section className="space-y-8">
      <SectionTitle no="03" title="政策冲击：改写行业曲线的手"
        desc="从金融危机到双减，从短时工作制到延迟退休——政策如何在几年之内重塑一个行业的就业与工时。" />
      <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
        <div className="flex flex-wrap gap-2 mb-8">
          {(['ALL', 'CN', 'US', 'DE'] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
              style={{
                background: filter === t ? (t === 'ALL' ? PAL.coffee : COUNTRY_COLOR[t]) : PAL.cream,
                color: filter === t ? '#FFFDF7' : PAL.sub,
              }}>
              {t === 'ALL' ? '全部' : COUNTRY_NAME[t]}
            </button>
          ))}
        </div>
        <div className="relative pl-2">
          <div className="absolute left-[13px] top-1 bottom-1 w-[3px] rounded-full" style={{ background: 'linear-gradient(#E2A93B,#C96F4A,#A5678E)' }} />
          <div className="space-y-6">
            {events.map((e, i) => (
              <div key={i} className="relative pl-12">
                <span className="absolute left-0 top-1.5 w-[26px] h-[26px] rounded-full border-4"
                  style={{ background: COUNTRY_COLOR[e.country], borderColor: PAL.cream, boxShadow: '0 2px 10px rgba(140,106,79,.3)' }} />
                <div className="rounded-3xl p-5 transition-transform hover:-translate-y-0.5"
                  style={{ background: '#FBF5E9', border: `1px solid ${PAL.line}` }}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-xl font-bold" style={{ color: COUNTRY_COLOR[e.country], fontFamily: 'Georgia,serif' }}>
                      {Math.floor(e.year)}
                    </span>
                    <span className="font-bold" style={{ color: PAL.ink }}>{e.name}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full" style={{ background: PAL.cream, color: PAL.sub }}>
                      {COUNTRY_NAME[e.country]} · {e.sector}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: '#7A6450' }}>{e.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ================= 专业热度 =================
type TabKey = 'CN' | 'LAW' | 'US'
export function MajorHeat({ d }: { d: ReportData }) {
  const [tab, setTab] = useState<TabKey>('CN')
  const mh = d.major_heat

  const cnOpt = useMemo(() => {
    const civ = mh.CN_civil.trend_index, fin = mh.CN_finance.trend_index
    const law = mh.CN_law_exam
    const years = Array.from(new Set([...civ.years, ...fin.years, ...law.years])).sort()
    const lawPeak = Math.max(...law.applicants_wan)
    const lawIdx = law.applicants_wan.map((a) => +(a / lawPeak * 100).toFixed(1))
    const pick = (ys: number[], vs: number[]) => years.map((y) => { const i = ys.indexOf(y); return i >= 0 ? vs[i] : null })
    return {
      ...ECHARTS_BASE,
      tooltip: { ...ECHARTS_BASE.tooltip, trigger: 'axis' },
      legend: { bottom: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 6, textStyle: { color: PAL.sub } },
      grid: { left: 50, right: 24, top: 40, bottom: 52 },
      xAxis: { type: 'category', data: years, axisLabel: { color: PAL.sub }, axisLine: { lineStyle: { color: PAL.line } } },
      yAxis: { type: 'value', name: '热度指数 (各自峰值=100)', min: 0, max: 110, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      series: [
        { name: '土木 (构建指数, 2012 峰值)', type: 'line', smooth: true, connectNulls: true, data: pick(civ.years, civ.index), lineStyle: { width: 3, color: PAL.coffee }, itemStyle: { color: PAL.coffee }, symbol: 'circle', symbolSize: 7 },
        { name: '金融 (构建指数, 2014 峰值)', type: 'line', smooth: true, connectNulls: true, data: pick(fin.years, fin.index), lineStyle: { width: 3, color: PAL.amber }, itemStyle: { color: PAL.amber }, symbol: 'rect', symbolSize: 7 },
        { name: '法学 (司考/法考报名, 2024 峰值)', type: 'line', smooth: true, connectNulls: true, data: pick(law.years, lawIdx), lineStyle: { width: 3, color: PAL.sage }, itemStyle: { color: PAL.sage }, symbol: 'triangle', symbolSize: 8,
          areaStyle: { color: 'rgba(125,155,118,.10)' } },
      ],
    }
  }, [mh])

  const lawOpt = useMemo(() => {
    const law = mh.CN_law_exam
    return {
      ...ECHARTS_BASE,
      tooltip: { ...ECHARTS_BASE.tooltip, trigger: 'axis' },
      legend: { bottom: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 6, textStyle: { color: PAL.sub } },
      grid: { left: 52, right: 52, top: 40, bottom: 52 },
      xAxis: { type: 'category', data: law.years, axisLabel: { color: PAL.sub }, axisLine: { lineStyle: { color: PAL.line } } },
      yAxis: [
        { type: 'value', name: '报名 (万)', max: 110, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
        { type: 'value', name: '通过率 (%)', min: 10, max: 26, splitLine: { show: false }, axisLabel: { color: PAL.terra } },
      ],
      series: [
        { name: '司考/法考报名人数 (万)', type: 'bar', data: law.applicants_wan, barWidth: 18,
          itemStyle: { color: PAL.sage, borderRadius: [8, 8, 0, 0], opacity: 0.9 } },
        { name: '通过率 (%)', type: 'line', yAxisIndex: 1, data: law.pass_rate_pct, smooth: true, connectNulls: true,
          lineStyle: { width: 3, color: PAL.terra }, itemStyle: { color: PAL.terra }, symbol: 'circle', symbolSize: 8 },
      ],
    }
  }, [mh])

  const usOpt = useMemo(() => {
    const ul = mh.US_law_school
    return {
      ...ECHARTS_BASE,
      tooltip: { ...ECHARTS_BASE.tooltip, trigger: 'axis' },
      grid: { left: 60, right: 24, top: 40, bottom: 44 },
      xAxis: { type: 'category', data: ul.years, axisLabel: { color: PAL.sub }, axisLine: { lineStyle: { color: PAL.line } } },
      yAxis: { type: 'value', name: '申请人数', min: 40000, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      series: [{
        name: 'ABA 法学院申请人数', type: 'line', smooth: true, data: ul.applicants,
        lineStyle: { width: 3, color: PAL.sky }, itemStyle: { color: PAL.sky }, symbol: 'circle', symbolSize: 7,
        areaStyle: { color: 'rgba(110,147,166,.18)' },
        markPoint: {
          symbolSize: 52, itemStyle: { color: PAL.sky, opacity: 0.85 },
          label: { fontSize: 9, color: '#fff' },
          data: [{ type: 'max', name: '峰值' }, { type: 'min', name: '谷底' }],
        },
      }],
    }
  }, [mh])

  const tabs: { k: TabKey; label: string }[] = [
    { k: 'CN', label: '中国 · 三热曲线' },
    { k: 'LAW', label: '中国 · 法学热深挖' },
    { k: 'US', label: '美国 · 法学周期' },
  ]
  return (
    <section className="space-y-8">
      <SectionTitle no="04" title="热度潮汐：金融热、法学热、土木热"
        desc="专业热度是就业市场最灵敏的温度计。金融与土木相继退潮，法学因考公与职业资格路径而升温——中美两国的法学周期遥相呼应。" />
      <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
              style={{ background: tab === t.k ? PAL.plum : PAL.cream, color: tab === t.k ? '#FFFDF7' : PAL.sub }}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'CN' && (
          <>
            <EChart option={cnOpt} height={400} />
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <EventCard color={PAL.coffee} title="土木：从「天选」到「天坑」" items={mh.CN_civil.events} />
              <EventCard color={PAL.amber} title="金融：财经院校录取退潮" items={mh.CN_finance.events} />
            </div>
            <p className="text-xs mt-3" style={{ color: PAL.sub }}>注：土木/金融为基于录取位次与就业占比归一化的构建指数（示意），法学为法考报名实测指数。</p>
          </>
        )}
        {tab === 'LAW' && (
          <>
            <EChart option={lawOpt} height={400} />
            <div className="mt-4 rounded-3xl p-5" style={{ background: '#FBF5E9', border: `1px solid ${PAL.line}` }}>
              <p className="text-sm leading-relaxed" style={{ color: '#7A6450' }}>
                自 2002 年首届司法考试 36 万人报名起，这条曲线走了二十余年：2003 年回落至 19.7 万后稳步爬升，
                2017 年司考收官之年达 64.9 万；2018—2024 年法考「六连增」，从 60.4 万升至 96 万，2025 年首降至 93 万。
                同期通过率从 23.5%（2021）收紧至 15.5%（2024）。全国执业律师从 42.3 万（2018）增至 83 万（2024），
                近乎翻倍；但中国每万人律师仅约 5.76 名，美国约 40 名。
                「法学热」的底色，是就业不确定性下对「可考编、可执业」确定性路径的追逐。
              </p>
            </div>
          </>
        )}
        {tab === 'US' && (
          <>
            <EChart option={usOpt} height={400} />
            <p className="text-sm mt-3 leading-relaxed" style={{ color: '#7A6450' }}>
              美国法学院申请在 2004 年创下 10.06 万的历史峰值，金融危机后坠入 2013—2015 年谷底（5.4 万），
              2021 年疫情申请潮冲至 7.1 万，2025 年再增 18.1% 至 76,480 人创周期新高——
              与中国的法学热形成跨洋共振：经济不确定性越高，法学院越拥挤。
            </p>
          </>
        )}
      </div>
    </section>
  )
}

function EventCard({ color, title, items }: { color: string; title: string; items: string[] }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: '#FBF5E9', border: `1px solid ${PAL.line}` }}>
      <h4 className="font-bold mb-2" style={{ color }}>{title}</h4>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm flex gap-2" style={{ color: '#7A6450' }}>
            <span style={{ color }}>◆</span><span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
