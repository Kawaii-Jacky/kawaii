import { useMemo, useState } from 'react'
import EChart from '../components/EChart'
import { PAL, ECHARTS_BASE, COUNTRY_COLOR, COUNTRY_NAME, buildLifeData } from '../lib/report'
import type { ReportData } from '../lib/report'
import { SectionTitle } from './HoursTerrain'

export default function Life3D({ d }: { d: ReportData }) {
  const [country, setCountry] = useState<'CN' | 'US' | 'DE'>('CN')

  const opt = useMemo(() => {
    const { ages, industries, points, retire } = buildLifeData(d, country)
    const maxV = country === 'CN' ? 52 : 48
    return {
      ...ECHARTS_BASE,
      tooltip: {
        ...ECHARTS_BASE.tooltip,
        formatter: (p: any) => {
          const [xi, yi, v, stage] = p.data
          return `<b>${COUNTRY_NAME[country]} · ${industries[yi]}</b><br/>年龄 ${ages[xi]} 岁 · ${stage}<br/>每周投入 <b>${v}</b> 小时`
        },
      },
      visualMap: {
        show: true, min: 0, max: maxV, dimension: 2, right: 8, bottom: 12,
        text: ['高', '低'], calculable: false,
        inRange: { color: ['#F7EBD2', '#EED9A8', '#E2A93B', '#D98E5B', '#C96F4A', '#8A4A2E'] },
        textStyle: { color: PAL.sub },
      },
      xAxis3D: {
        type: 'category', name: '年龄', data: ages.map(String),
        axisLabel: { color: PAL.sub, interval: 3 }, nameTextStyle: { color: PAL.ink },
        axisLine: { lineStyle: { color: PAL.line } },
      },
      yAxis3D: {
        type: 'category', name: '行业', data: industries,
        axisLabel: { color: PAL.sub, fontSize: 10 }, nameTextStyle: { color: PAL.ink },
        axisLine: { lineStyle: { color: PAL.line } },
      },
      zAxis3D: {
        type: 'value', name: '小时/周', max: 60,
        axisLabel: { color: PAL.sub }, nameTextStyle: { color: PAL.ink },
      },
      grid3D: {
        boxWidth: 190, boxDepth: 105, boxHeight: 62,
        environment: '#FBF3E2',
        axisLine: { lineStyle: { color: '#D8C3A5' } },
        axisPointer: { lineStyle: { color: PAL.terra } },
        light: {
          main: { intensity: 1.15, shadow: true, shadowQuality: 'medium', alpha: 40, beta: -25 },
          ambient: { intensity: 0.45 },
        },
        viewControl: { autoRotate: true, autoRotateSpeed: 7, distance: 265, alpha: 24, beta: 42 },
      },
      series: [{
        type: 'bar3D',
        data: points,
        shading: 'lambert',
        barSize: 1.1,
        itemStyle: { opacity: 0.96 },
        emphasis: { itemStyle: { color: PAL.plum } },
        // 在退休年龄处加一道提示: 用 markLine 不可用于3D, 以注释说明
        name: `退休年龄 ${retire} 岁`,
      }],
    }
  }, [d, country])

  const retireInfo = d.life_course.retirement_age[country]
  return (
    <section className="space-y-8">
      <SectionTitle no="02" title="3D 人生地形：从入学到退休"
        desc="横轴为年龄，纵轴为行业，立柱高度为每周投入小时。学龄段为学习时长（估算值，已标注），职业段为分行业实测周工时，退休后回落。旋转观察：中国的高原、美国的丘陵、德国的谷地，一目了然。" />
      <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg" style={{ color: PAL.ink }}>
              {COUNTRY_NAME[country]} · 人生投入地形 <span className="text-sm font-normal" style={{ color: PAL.sub }}>（自动旋转，可拖拽缩放）</span>
            </h3>
            <p className="text-sm mt-1" style={{ color: PAL.sub }}>法定退休年龄 {retireInfo.value} 岁 — {retireInfo.note}</p>
          </div>
          <div className="flex gap-2">
            {(['CN', 'US', 'DE'] as const).map((c) => (
              <button key={c} onClick={() => setCountry(c)}
                className="px-5 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: country === c ? COUNTRY_COLOR[c] : PAL.cream,
                  color: country === c ? '#FFFDF7' : PAL.sub,
                  boxShadow: country === c ? '0 6px 18px rgba(140,106,79,.25)' : 'none',
                }}>
                {COUNTRY_NAME[c]}
              </button>
            ))}
          </div>
        </div>
        <EChart option={opt} height={560} />
        <p className="text-xs mt-2 leading-relaxed" style={{ color: PAL.sub }}>
          口径说明：职业段 = 各国分行业周实测工时（中国 2020 人口普查 / 美国 BLS 2024 / 德国 Eurostat 2025），并按年龄附加经验曲线（22–26 岁 ×0.96，50 岁后 ×0.95）；
          学龄段为 PISA/NCES/Destatis 量级估算；退休段按每周 5 小时示意。模型为可视化综合，非精算结果。
        </p>
      </div>
    </section>
  )
}
