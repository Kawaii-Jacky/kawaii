import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import 'echarts-gl'

interface Props {
  option: any
  height?: number | string
  className?: string
}

export default function EChart({ option, height = 420, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current, undefined, { renderer: 'canvas' })
    chartRef.current = chart
    const ro = new ResizeObserver(() => chart.resize())
    ro.observe(ref.current)
    return () => { ro.disconnect(); chart.dispose() }
  }, [])

  useEffect(() => {
    if (chartRef.current && option) chartRef.current.setOption(option, true)
  }, [option])

  return <div ref={ref} className={className} style={{ width: '100%', height }} />
}
