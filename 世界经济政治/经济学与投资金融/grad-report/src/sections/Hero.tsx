import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { CountUp } from '../components/bits'
import { TowerIllustration } from '../components/illustrations'

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
}

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yArt = useTransform(scrollYProgress, [0, 1], [0, 120])
  const yText = useTransform(scrollYProgress, [0, 1], [0, 60])

  return (
    <section id="top" ref={ref} className="relative min-h-[92vh] flex items-center pt-20 pb-10 overflow-hidden">
      {/* 竖排装饰 */}
      <div className="vertical-text hidden lg:block absolute right-6 top-32 text-[var(--ink-faint)] text-sm select-none">
        读博是一段被制度塑造的时间
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-10 items-center w-full">
        <motion.div style={{ y: yText }}>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-sm tracking-[0.4em] text-[var(--ochre)] mb-4"
          >
            全球硕博研究生制度图鉴 · 二〇二六年十月
          </motion.p>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.08, ease: 'easeOut' }}
            className="font-serif-sc font-black text-5xl md:text-7xl leading-tight text-[var(--ink)]"
          >
            象牙塔的
            <span className="text-[var(--terracotta)]">时间</span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.18, ease: 'easeOut' }}
            className="mt-6 text-lg md:text-xl text-[var(--ink-soft)] leading-relaxed max-w-xl"
          >
            同样是「读研」两个字，在 19 个国家与地区意味着 19 种不同的法律身份、时钟与假期——
            从一年制的授课硕士，到六七年长征的博士。
            这一页长卷分为上下两篇，把进入之门、学制光谱、身份分野、工时高压与休假断层一一铺开——
            并给你四只可以亲手拨动的制度模型。
          </motion.p>

          {/* 一部两篇 · 题献 */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.26, ease: 'easeOut' }}
            className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl"
          >
            <a
              href="#m-gate"
              className="paper-card px-5 py-3.5 flex-1 border-l-4 hover:-translate-y-0.5 transition-transform"
              style={{ borderLeftColor: '#d9a441' }}
            >
              <span className="text-[10px] tracking-[0.3em] text-[var(--mustard)] font-bold">上篇 · 硕士</span>
              <span className="block font-serif-sc font-bold text-lg mt-0.5">被压缩的时间</span>
            </a>
            <a
              href="#phd-part"
              className="paper-card px-5 py-3.5 flex-1 border-l-4 hover:-translate-y-0.5 transition-transform"
              style={{ borderLeftColor: '#c4552d' }}
            >
              <span className="text-[10px] tracking-[0.3em] text-[var(--terracotta)] font-bold">下篇 · 博士</span>
              <span className="block font-serif-sc font-bold text-lg mt-0.5">被拉长的时间</span>
            </a>
          </motion.div>

          {/* 三枚数字徽章 */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            className="mt-10 flex flex-wrap gap-4 md:gap-6"
          >
            <div className="paper-card px-5 py-4 text-center min-w-[7.5rem]">
              <div className="font-serif-sc font-black text-4xl text-[var(--terracotta)]">
                <CountUp to={19} />
              </div>
              <div className="text-xs text-[var(--ink-soft)] mt-1 tracking-widest">个国家 / 地区</div>
            </div>
            <div className="paper-card px-5 py-4 text-center min-w-[7.5rem]">
              <div className="font-serif-sc font-black text-4xl text-[var(--ochre)]">
                <CountUp to={6} />
              </div>
              <div className="text-xs text-[var(--ink-soft)] mt-1 tracking-widest">个制度维度</div>
            </div>
            <div className="paper-card px-5 py-4 text-center min-w-[9rem]">
              <div className="font-serif-sc font-black text-4xl text-[var(--olive)]">
                <CountUp to={47.85} decimals={2} suffix="%" />
              </div>
              <div className="text-xs text-[var(--ink-soft)] mt-1 tracking-widest">中国博士生周工作 &gt;60h</div>
            </div>
            <div className="paper-card px-5 py-4 text-center min-w-[8rem]">
              <div className="font-serif-sc font-black text-4xl text-[var(--terracotta-deep)]">
                1–3<span className="text-xl"> 年</span>
              </div>
              <div className="text-xs text-[var(--ink-soft)] mt-1 tracking-widest">硕士名义学制跨度</div>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.8, delay: 0.42, ease: 'easeOut' }}
            className="mt-10 flex items-center gap-4"
          >
            <a
              href="#m-gate"
              className="inline-flex items-center gap-2 bg-[var(--terracotta)] text-[var(--paper)] px-6 py-3 rounded-full font-medium hover:bg-[var(--terracotta-deep)] transition-colors"
            >
              从上篇读起 ↓
            </a>
            <span className="stamp text-xs">田野调研 · 2026-10-12</span>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: yArt }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.25, ease: 'easeOut' }}
          className="relative"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <TowerIllustration className="w-full max-w-md mx-auto" />
          </motion.div>
          <div className="stamp-circle absolute -top-2 right-2 md:right-8">
            19 国<br />图鉴
          </div>
        </motion.div>
      </div>
    </section>
  )
}
