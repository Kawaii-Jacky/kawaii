import { useMemo } from 'react'
import EChart from '../components/EChart'
import { PAL, ECHARTS_BASE } from '../lib/report'
import type { ReportData } from '../lib/report'
import { SectionTitle } from './HoursTerrain'

// ================= 期权的世界 =================
export function EquityWorld({ d }: { d: ReportData }) {
  const eq = d.equity_comp
  const stackOpt = useMemo(() => {
    const models = eq.industry_model
    return {
      ...ECHARTS_BASE,
      tooltip: { ...ECHARTS_BASE.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' },
        formatter: (ps: any[]) => {
          const m = models[ps[0].dataIndex]
          return `<b>${m.industry} · ${m.model}</b><br/>股权/长期激励 ${m.equity_weight}% · 现金/短期 ${m.cash_weight}%<br/><span style="color:#9A8264">${m.note}</span>`
        } },
      legend: { bottom: 0, icon: 'roundRect', itemWidth: 14, itemHeight: 6, textStyle: { color: PAL.sub } },
      grid: { left: 52, right: 20, top: 30, bottom: 52 },
      xAxis: { type: 'category', data: models.map((m) => `${m.industry} · ${m.model}`), axisLabel: { color: PAL.ink, fontSize: 12 }, axisLine: { lineStyle: { color: PAL.line } } },
      yAxis: { type: 'value', max: 100, name: '薪酬结构权重 (%)', splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      series: [
        { name: '股权 / 长期激励', type: 'bar', stack: 'a', data: models.map((m) => m.equity_weight), barWidth: 44,
          itemStyle: { color: PAL.terra }, label: { show: true, formatter: '{c}%', color: '#FFF6E8', fontWeight: 'bold' } },
        { name: '现金 / 短期', type: 'bar', stack: 'a', data: models.map((m) => m.cash_weight), barWidth: 44,
          itemStyle: { color: '#EAD9B8', borderRadius: [10, 10, 0, 0] }, label: { show: true, formatter: '{c}%', color: PAL.coffee } },
      ],
    }
  }, [eq])

  const ceoOpt = useMemo(() => ({
    ...ECHARTS_BASE,
    tooltip: { ...ECHARTS_BASE.tooltip,
      formatter: (p: any) => `<b>${p.data[3]}</b> (${p.data[2]})<br/>CEO 薪酬 $${p.data[1]}M · 股权占比 ${p.data[0]}%` },
    grid: { left: 52, right: 30, top: 30, bottom: 48 },
    xAxis: { type: 'value', name: '股权占比 (%)', min: 20, max: 100, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
    yAxis: { type: 'value', name: 'CEO 年薪 (百万美元)', min: 20, max: 70, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
    series: [{
      type: 'scatter',
      data: eq.ceo_structure.map((c) => [c.equity_pct, c.ceo_pay_musd, c.industry, c.firm]),
      symbolSize: (v: any[]) => v[1] * 1.1,
      itemStyle: { color: (p: any) => (p.data[2] === '科技' ? PAL.terra : PAL.amber), opacity: 0.8, borderColor: '#8A6B4F', borderWidth: 1 },
      label: { show: true, position: 'top', fontSize: 10, color: PAL.ink, formatter: (p: any) => p.data[3] },
    }],
  }), [eq])

  return (
    <section className="space-y-8">
      <SectionTitle no="05" title="期权的世界：三种薪酬哲学"
        desc="科技用股权锁定长期创新，金融用现金奖金奖励风险，制造在两者之间寻找均衡。期权本身正在退位——全值股权成为主流。" />
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
          <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>行业薪酬结构范式</h3>
          <p className="text-sm mt-1" style={{ color: PAL.sub }}>基于 SEC 2024 高管薪酬披露的跨行业比较（Qian, 2025）</p>
          <EChart option={stackOpt} height={360} />
        </div>
        <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
          <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>巨头 CEO：薪酬 × 股权占比</h3>
          <p className="text-sm mt-1" style={{ color: PAL.sub }}>气泡大小 = CEO 年度薪酬规模</p>
          <EChart option={ceoOpt} height={360} />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { v: '99%', k: '公司授予全值股权', s: '已成绝对主流', c: PAL.terra },
          { v: '41%', k: '仍授予期权/SAR', s: '2021 年为 47%，持续退位', c: PAL.amber },
          { v: '59% vs 11%', k: '高科技 vs 非科技全员授股', s: '股权文化的行业鸿沟', c: PAL.sage },
          { v: '5年/50%', k: '高盛交易部门奖金递延', s: '金融的风险对冲机制', c: PAL.plum },
        ].map((s) => (
          <div key={s.k} className="rounded-3xl px-5 py-5 transition-transform hover:-translate-y-1"
            style={{ background: PAL.card, boxShadow: '0 8px 28px rgba(140,106,79,.12)' }}>
            <div className="text-2xl font-bold" style={{ color: s.c, fontFamily: 'Georgia,serif' }}>{s.v}</div>
            <div className="mt-1 text-sm font-medium" style={{ color: PAL.ink }}>{s.k}</div>
            <div className="text-xs mt-0.5" style={{ color: PAL.sub }}>{s.s}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ================= 灵活就业 =================
export function FlexJobs({ d }: { d: ReportData }) {
  const fe = d.flexible_employment
  const trendOpt = useMemo(() => ({
    ...ECHARTS_BASE,
    tooltip: { ...ECHARTS_BASE.tooltip, trigger: 'axis' },
    grid: { left: 48, right: 20, top: 36, bottom: 44 },
    xAxis: { type: 'category', data: fe.CN_total_trend.years.map((y) => (y === 2026 ? '2026E' : String(y))), axisLabel: { color: PAL.sub }, axisLine: { lineStyle: { color: PAL.line } } },
    yAxis: { type: 'value', name: '亿人', max: 3.6, splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
    series: [{
      name: '灵活就业人员', type: 'bar', data: fe.CN_total_trend.count_yi.map((v, i) => ({
        value: v, itemStyle: { color: i >= 4 ? PAL.plum : PAL.amber, borderRadius: [10, 10, 0, 0] },
      })),
      barWidth: 34,
      label: { show: true, position: 'top', color: PAL.sub, formatter: '{c} 亿' },
      markLine: { symbol: 'none', label: { color: PAL.sub, fontSize: 10 }, lineStyle: { color: '#C9B59A', type: 'dashed' },
        data: [{ yAxis: 2, name: '2 亿时代' }, { yAxis: 3, name: '3 亿时代' }] },
    }],
  }), [fe])

  const occOpt = useMemo(() => {
    const occ = [...fe.CN_occupations_2025].sort((a, b) => a.count_wan - b.count_wan)
    return {
      ...ECHARTS_BASE,
      tooltip: { ...ECHARTS_BASE.tooltip,
        formatter: (p: any) => { const o = occ[p.dataIndex]; return `<b>${o.name}</b><br/>${o.count_wan} 万人 · 同比 ${o.yoy > 0 ? '+' : ''}${o.yoy}%` } },
      grid: { left: 90, right: 70, top: 20, bottom: 40 },
      xAxis: { type: 'value', name: '万人', splitLine: { lineStyle: { color: PAL.line } }, axisLabel: { color: PAL.sub } },
      yAxis: { type: 'category', data: occ.map((o) => o.name), axisLabel: { color: PAL.ink, fontSize: 12 }, axisLine: { lineStyle: { color: PAL.line } } },
      series: [{
        type: 'bar', data: occ.map((o) => ({ value: o.count_wan, itemStyle: { color: o.yoy > 0 ? PAL.sage : PAL.rose, borderRadius: [0, 10, 10, 0] } })),
        barWidth: 20,
        label: { show: true, position: 'right', color: PAL.sub, formatter: (p: any) => `${occ[p.dataIndex].count_wan}万 (${occ[p.dataIndex].yoy > 0 ? '+' : ''}${occ[p.dataIndex].yoy}%)` },
      }],
    }
  }, [fe])

  return (
    <section className="space-y-8">
      <SectionTitle no="06" title="灵活就业：从补充形式到就业底座"
        desc="五年间从 1.7 亿迈向 3.2 亿，灵活就业正在重写「工作」的定义——但社保覆盖仍不足四成，是这片高原上最深的裂缝。" />
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
          <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>中国灵活就业总规模</h3>
          <p className="text-sm mt-1" style={{ color: PAL.sub }}>人社部 / 国家统计局 / 复旦·灵工打卡白皮书（2026 为预测）</p>
          <EChart option={trendOpt} height={360} />
        </div>
        <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
          <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>主要新就业形态职业 · 2025</h3>
          <p className="text-sm mt-1" style={{ color: PAL.sub }}>绿 = 扩张，红 = 收缩（中国新就业形态研究中心）</p>
          <EChart option={occOpt} height={360} />
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <CompareCard color={PAL.terra} country="中国" big="2.8 亿"
          lines={['占总就业约 39%（2025）', '新就业形态劳动者 8400 万，占职工 21%', '职工养老保险覆盖 7057 万 · 参保率不足 40%']} />
        <CompareCard color={PAL.amber} country="美国" big="5900 万"
          lines={['自由职业者占劳动力约 36%（2020）', 'Upwork Freelance Forward 口径', '平台零工与传统自雇并存']} />
        <CompareCard color={PAL.sage} country="德国" big="410 万 + 700 万"
          lines={['个体自雇者约 410 万（2023）', 'Mini-job 迷你工作约 700 万', '社保强制覆盖程度高，零工渗透最低']} />
      </div>
    </section>
  )
}

function CompareCard({ color, country, big, lines }: { color: string; country: string; big: string; lines: string[] }) {
  return (
    <div className="rounded-3xl p-6 transition-transform hover:-translate-y-1"
      style={{ background: PAL.card, boxShadow: '0 8px 28px rgba(140,106,79,.12)', borderTop: `6px solid ${color}` }}>
      <div className="text-sm font-semibold tracking-widest" style={{ color: PAL.sub }}>{country}</div>
      <div className="text-3xl font-bold mt-1" style={{ color, fontFamily: 'Georgia,serif' }}>{big}</div>
      <ul className="mt-3 space-y-1.5">
        {lines.map((l, i) => (
          <li key={i} className="text-sm flex gap-2" style={{ color: '#7A6450' }}>
            <span style={{ color }}>◆</span><span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
