import { useMemo, useState } from 'react'
import EChart from '../components/EChart'
import { PAL, ECHARTS_BASE, COUNTRY_COLOR, COUNTRY_NAME, SHORT_NAME } from '../lib/report'
import type { ReportData } from '../lib/report'

const COMPARE = [
  { cn: '制造业', us: 'Manufacturing 制造业', de: 'Manufacturing', label: '制造业' },
  { cn: '建筑业', us: 'Construction 建筑业', de: 'Construction', label: '建筑业' },
  { cn: '金融业', us: 'Financial activities 金融业', de: 'Financial and insurance activities', label: '金融业' },
  { cn: '信息传输、计算机服务和软件业', us: 'Information 信息业', de: 'Information and communication', label: '信息技术' },
  { cn: '住宿和餐饮业', us: 'Leisure & hospitality 休闲住宿餐饮', de: 'Accommodation and food service activities', label: '住宿餐饮' },
]

export default function HoursTerrain({ d }: { d: ReportData }) {
  const [countryFocus, setCountryFocus] = useState<'ALL' | 'CN' | 'US' | 'DE'>('ALL')

  // ---- 工时长河 ----
  const riverOpt = useMemo(() => {
    const us = d.annual_hours.US, de = d.annual_hours.DE
    const cnAnn = d.china_annual_hours.series
    const cn = d.china_weekly_hours_trend
    const yrs: number[] = []
    for (let y = 1970; y <= 2025; y++) yrs.push(y)
    const ys = yrs.map(String)
    const pick = (rec: Record<string, number>) => yrs.map((y) => rec[String(y)] ?? null)
    return {
      ...ECHARTS_BASE,
      tooltip: { ...ECHARTS_BASE.tooltip, trigger: 'axis' },
      legend: { bottom: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 6, textStyle: { color: PAL.sub } },
      grid: { left: 56, right: 24, top: 40, bottom: 48 },
      xAxis: { type: 'category', data: ys, axisLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      yAxis: {
        type: 'value', name: '小时/年', min: 1200, max: 2700,
        splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub },
      },
      series: [
        {
          name: '美国 (FRED/OECD)', type: 'line', smooth: true, symbol: 'none', connectNulls: true,
          data: pick(us),
          lineStyle: { width: 3, color: PAL.amber }, itemStyle: { color: PAL.amber },
          areaStyle: { color: 'rgba(226,169,59,.10)' },
          markLine: {
            symbol: 'none', label: { color: PAL.sub, fontSize: 11 },
            lineStyle: { color: '#C9B59A', type: 'dashed' },
            data: [{ xAxis: '2009', name: '金融危机/德国短时工作' }, { xAxis: '2020', name: '疫情' }],
          },
        },
        { name: '德国 (FRED/OECD)', type: 'line', smooth: true, symbol: 'none', connectNulls: true,
          data: pick(de),
          lineStyle: { width: 3, color: PAL.sage }, itemStyle: { color: PAL.sage }, areaStyle: { color: 'rgba(125,155,118,.12)' } },
        {
          name: '中国·人均年工时 (OWID/ILO 汇编)', type: 'line', smooth: true, symbol: 'none', connectNulls: true,
          data: pick(cnAnn),
          lineStyle: { width: 3, color: PAL.terra }, itemStyle: { color: PAL.terra },
          areaStyle: { color: 'rgba(201,111,74,.08)' },
        },
        {
          name: '中国·企业周工时×52 (统计局)', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8, connectNulls: true,
          data: yrs.map((y) => { const i = cn.years.indexOf(y); return i >= 0 ? +(cn.weekly[i] * 52).toFixed(0) : null }),
          lineStyle: { width: 2.5, type: 'dashed', color: PAL.plum }, itemStyle: { color: PAL.plum },
        },
      ],
    }
  }, [d])

  // ---- 三国行业对比 ----
  const cmpOpt = useMemo(() => {
    const labels = COMPARE.map((c) => c.label)
    const cn = COMPARE.map((c) => d.china_industry_hours[c.cn]?.weekly)
    const us = COMPARE.map((c) => d.us_industry_hours[c.us]?.v2024)
    const de = COMPARE.map((c) => d.germany_industry_hours[c.de])
    const mk = (name: string, data: any[], color: string, show: boolean) => ({
      name, type: 'bar', data: show ? data : data.map(() => null),
      barWidth: 16, itemStyle: { color, borderRadius: [6, 6, 0, 0] },
      label: { show, position: 'top', fontSize: 10, color: PAL.sub, formatter: (p: any) => p.value?.toFixed?.(1) },
    })
    return {
      ...ECHARTS_BASE,
      tooltip: { ...ECHARTS_BASE.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 6, textStyle: { color: PAL.sub } },
      grid: { left: 48, right: 20, top: 36, bottom: 52 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: PAL.ink, fontSize: 12 }, axisLine: { lineStyle: { color: PAL.line } } },
      yAxis: { type: 'value', name: '周工时 (小时)', max: 58, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      series: [
        mk('中国 (2020 普查)', cn, PAL.terra, countryFocus === 'ALL' || countryFocus === 'CN'),
        mk('美国 (2024 BLS)', us, PAL.amber, countryFocus === 'ALL' || countryFocus === 'US'),
        mk('德国 (2025 Eurostat)', de, PAL.sage, countryFocus === 'ALL' || countryFocus === 'DE'),
      ],
    }
  }, [d, countryFocus])

  // ---- 强度气泡 ----
  const bubbleOpt = useMemo(() => {
    const rows = d.china_intensity
    return {
      ...ECHARTS_BASE,
      tooltip: {
        ...ECHARTS_BASE.tooltip,
        formatter: (p: any) => {
          const r = rows[p.dataIndex]
          return `<b>${r.industry}</b><br/>周工时 ${r.weekly}h · ≥48h 占比 ${r.over48pct}%<br/>城镇就业 ${r.employed_wan} 万人 · 强度指数 ${r.index}`
        },
      },
      grid: { left: 52, right: 30, top: 36, bottom: 48 },
      xAxis: { type: 'value', name: '周平均工时 (h)', min: 41, max: 51.5, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      yAxis: { type: 'value', name: '≥48h 占比 (%)', min: 15, max: 70, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      series: [{
        type: 'scatter',
        data: rows.map((r) => ({ value: [r.weekly, r.over48pct], name: r.industry })),
        symbolSize: (_v: number[], p: any) => Math.max(14, Math.sqrt(rows[p.dataIndex].employed_wan) * 2.4),
        itemStyle: {
          color: (p: any) => { const y = rows[p.dataIndex].over48pct; return y > 60 ? PAL.terra : y > 45 ? PAL.amber : PAL.sage },
          opacity: 0.78, borderColor: '#8A6B4F', borderWidth: 1,
        },
        label: {
          show: true, position: 'top', fontSize: 10, color: PAL.ink,
          formatter: (p: any) => SHORT_NAME[rows[p.dataIndex].industry] ?? '',
        },
        markLine: {
          symbol: 'none', label: { color: PAL.sub, fontSize: 10 },
          lineStyle: { color: '#C9B59A', type: 'dashed' },
          data: [{ xAxis: 44, name: '法定 44h' }, { yAxis: 50, name: '半数超时' }],
        },
      }],
    }
  }, [d])

  const tabs: ('ALL' | 'CN' | 'US' | 'DE')[] = ['ALL', 'CN', 'US', 'DE']

  // ---- 学科工时换算台 ----
  const [discMode, setDiscMode] = useState<'week' | 'year' | 'days'>('week')
  const discOpt = useMemo(() => {
    const dh = d.china_discipline_hours
    const items = [...dh.items].sort((a, b) => a.weekly - b.weekly)
    const conv = (w: number) =>
      discMode === 'week' ? w : discMode === 'year' ? Math.round(w * 52) : Math.round((w * 52 - dh.legal.std_year) / 8)
    const unit = discMode === 'week' ? '小时/周' : discMode === 'year' ? '小时/年' : '天/年'
    const marks =
      discMode === 'week'
        ? [{ xAxis: dh.legal.std_week, name: '国务院标准 40h' }, { xAxis: dh.legal.law_week_cap, name: '劳动法周上限 44h' }]
        : discMode === 'year'
          ? [{ xAxis: dh.legal.std_year, name: '标准年工时 2000h' }, { xAxis: dh.legal.overtime_cap_year, name: '合法年上限 ~2432h' }]
          : [{ xAxis: 0, name: '标准线' }, { xAxis: 54, name: '合法上限折算 ~54 天' }]
    return {
      ...ECHARTS_BASE,
      tooltip: {
        ...ECHARTS_BASE.tooltip,
        formatter: (p: any) => {
          const it = items[p.dataIndex]
          const ann = Math.round(it.weekly * 52)
          const extra = Math.round((ann - dh.legal.std_year) / 8)
          return `<b>${it.discipline}</b><br/>周工时 <b>${it.weekly}h</b>${it.range ? `（区间 ${it.range[0]}-${it.range[1]}h）` : ''} → 年工时约 <b>${ann}h</b><br/>超出标准年工时约 <b>${extra} 个工作日</b><br/><span style="color:#9A8264">${it.tier === 'census' ? '七普实测' : '公开调查量级'} · ${it.source}</span>`
        },
      },
      grid: { left: 210, right: 90, top: 30, bottom: 40 },
      xAxis: { type: 'value', name: unit, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      yAxis: {
        type: 'category', data: items.map((i) => i.discipline),
        axisLabel: { color: PAL.ink, fontSize: 12 }, axisLine: { lineStyle: { color: PAL.line } }, axisTick: { show: false },
      },
      series: [{
        type: 'bar', barWidth: 18,
        data: items.map((i) => ({
          value: conv(i.weekly),
          itemStyle: {
            color: i.weekly > 55 ? PAL.terra : i.weekly > 45 ? PAL.amber : PAL.sage,
            borderRadius: [0, 9, 9, 0],
            opacity: i.tier === 'census' ? 0.72 : 0.95,
          },
        })),
        label: { show: true, position: 'right', fontSize: 11, color: PAL.sub, formatter: (p: any) => `${p.value} ${unit}` },
        markLine: {
          symbol: 'none', label: { color: PAL.sub, fontSize: 10 },
          lineStyle: { color: '#C9B59A', type: 'dashed' },
          data: marks,
        },
      }],
    }
  }, [d, discMode])

  return (
    <section className="space-y-8">
      <SectionTitle no="01" title="时间的地形：工时的长河流与行业落差"
        desc="半个世纪的收敛与分岔：美德年工时持续下行，中国周工时高位企稳；同一行业，在三个国家是三种时间。" />
      <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
        <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>工时长河 · 1970—2025</h3>
        <p className="text-sm mt-1" style={{ color: PAL.sub }}>人均年实际工作小时；中国为 OWID/ILO 汇编长序列 + 统计局企业周工时年化（口径不同，关注量级与趋势）</p>
        <EChart option={riverOpt} height={400} />
      </div>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>同一行业 · 三种时间</h3>
              <p className="text-sm mt-1" style={{ color: PAL.sub }}>分行业周工时三国对比</p>
            </div>
            <div className="flex gap-2">
              {tabs.map((t) => (
                <button key={t} onClick={() => setCountryFocus(t)}
                  className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: countryFocus === t ? (t === 'ALL' ? PAL.coffee : COUNTRY_COLOR[t]) : PAL.cream,
                    color: countryFocus === t ? '#FFFDF7' : PAL.sub,
                  }}>
                  {t === 'ALL' ? '全部' : COUNTRY_NAME[t]}
                </button>
              ))}
            </div>
          </div>
          <EChart option={cmpOpt} height={380} />
        </div>
        <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
          <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>中国行业强度地形</h3>
          <p className="text-sm mt-1" style={{ color: PAL.sub }}>工时 × 超时率 × 就业规模（气泡），七普长表 · 2020</p>
          <EChart option={bubbleOpt} height={380} />
        </div>
      </div>
      <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>学科工时换算台 · 中国</h3>
            <p className="text-sm mt-1" style={{ color: PAL.sub }}>
              学科 → 典型职业的周工时（普查实测 + 公开调查量级），一键换算为年工时与「每年多工作多少天」
            </p>
          </div>
          <div className="flex gap-2">
            {([['week', '周工时'], ['year', '换算年工时'], ['days', '超出标准的天数']] as const).map(([m, label]) => (
              <button key={m} onClick={() => setDiscMode(m)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{ background: discMode === m ? PAL.terra : PAL.cream, color: discMode === m ? '#FFFDF7' : PAL.sub }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <EChart option={discOpt} height={520} />
        <p className="text-xs mt-2 leading-relaxed" style={{ color: PAL.sub }}>
          换算基准：国务院标准每周 40h、年标准工时 2000h（250 个工作日 × 8h）；劳动法规定每周上限 44h、月加班 ≤36h，折算年合法上限约 2432h（≈ 多出 54 个工作日）。
          深色条为公开调查量级（样本与年份各异），浅色条为第七次人口普查实测（2020，城镇）；口径不同，仅作量级比较。数据出处见悬停提示。
        </p>
      </div>
    </section>
  )
}

export function SectionTitle({ no, title, desc }: { no: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-5xl font-bold leading-none select-none" style={{ color: PAL.amber, fontFamily: 'Georgia,serif', opacity: 0.55 }}>{no}</span>
      <div>
        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: PAL.ink, fontFamily: 'Georgia,"STSong",serif' }}>{title}</h2>
        <p className="mt-2 max-w-3xl leading-relaxed" style={{ color: '#7A6450' }}>{desc}</p>
      </div>
    </div>
  )
}
