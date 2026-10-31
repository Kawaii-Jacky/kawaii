import Hero from '../sections/Hero'
import HoursTerrain from '../sections/HoursTerrain'
import Life3D from '../sections/Life3D'
import { PolicyShocks, MajorHeat } from '../sections/PolicyMajors'
import { EquityWorld, FlexJobs } from '../sections/EquityFlex'
import Gallery from '../sections/Gallery'
import { useReportData, PAL } from '../lib/report'

export default function Home() {
  const d = useReportData()
  if (!d) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PAL.bg }}>
        <div className="text-lg animate-pulse" style={{ color: PAL.sub }}>正在铺展时间的地形……</div>
      </div>
    )
  }
  return (
    <div className="min-h-screen" style={{ background: PAL.bg }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-16">
        <Hero />
        <HoursTerrain d={d} />
        <Life3D d={d} />
        <PolicyShocks d={d} />
        <MajorHeat d={d} />
        <EquityWorld d={d} />
        <FlexJobs d={d} />
        <Gallery d={d} />
        <footer className="text-center pb-8 pt-2">
          <p className="text-sm" style={{ color: PAL.sub }}>
            时间的地形 · 美·德·中劳动市场多维交互报告 — 数据整合于 2026-10 · 仅供研究参考
          </p>
        </footer>
      </div>
    </div>
  )
}
