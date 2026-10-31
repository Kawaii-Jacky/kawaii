import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView, useSpring, useScroll } from 'framer-motion'
import katex from 'katex'

/* 测试快照模式：URL 带 ?snap=1 时跳过入场动画，直接呈现最终状态 */
export const SNAP =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('snap')

/* ---------- 滚动入场容器：首屏立即播放，其余 whileInView 一次 ---------- */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  once?: boolean
}) {
  if (SNAP) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

/* ---------- 数字滚动计数 ---------- */
export function CountUp({
  to,
  decimals = 0,
  suffix = '',
  duration = 1.6,
  className,
}: {
  to: number
  decimals?: number
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [text, setText] = useState(SNAP ? to.toFixed(decimals) : (0).toFixed(decimals))

  useEffect(() => {
    if (!inView || SNAP) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setText((to * eased).toFixed(decimals))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    // 兜底：无论如何最终定格在目标值
    const timer = window.setTimeout(() => setText(to.toFixed(decimals)), duration * 1000 + 300)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(timer)
    }
  }, [inView, to, decimals, duration])

  return (
    <span ref={ref} className={className}>
      {text}
      {suffix}
    </span>
  )
}

/* ---------- KaTeX 公式 ---------- */
export function Tex({ children, block = false, className }: { children: string; block?: boolean; className?: string }) {
  const html = katex.renderToString(children, { displayMode: block, throwOnError: false })
  if (block) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  }
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
}

/* ---------- 杂志章节标题 ---------- */
export function SectionHead({
  no,
  title,
  kicker,
  lead,
}: {
  no: string
  title: string
  kicker: string
  lead?: string
}) {
  return (
    <div className="mb-10 md:mb-14">
      <Reveal>
        <div className="flex items-end gap-4 md:gap-6">
          <span className="issue-number text-6xl md:text-8xl select-none" aria-hidden>
            {no}
          </span>
          <div className="pb-1 md:pb-2">
            <p className="text-xs md:text-sm tracking-[0.35em] text-[var(--ochre)] uppercase mb-1">{kicker}</p>
            <h2 className="font-serif-sc text-3xl md:text-5xl font-black text-[var(--ink)]">{title}</h2>
          </div>
        </div>
      </Reveal>
      {lead && (
        <Reveal delay={0.12}>
          <p className="pull-quote mt-6 max-w-3xl">{lead}</p>
        </Reveal>
      )}
      <div className="brush-line mt-8 w-40" />
    </div>
  )
}

/* ---------- 顶部阅读进度条 ---------- */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 })
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] z-[70] origin-left"
      style={{ scaleX, background: 'linear-gradient(90deg, #c4552d, #d9a441, #6b7c4e)' }}
    />
  )
}

/* ---------- 滑杆（暖色风格） ---------- */
export function WarmSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  accent = '#c4552d',
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  accent?: string
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm text-[var(--ink-soft)]">{label}</span>
        <span className="font-serif-sc font-bold text-lg" style={{ color: accent }}>
          {value}
          <span className="text-xs ml-0.5 font-normal">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="warm-range w-full"
        style={{ ['--range-accent' as string]: accent }}
      />
    </label>
  )
}
