import { motion } from 'framer-motion'
import { Reveal } from '../components/bits'
import { ForkedStairsIllustration } from '../components/illustrations'

/* ---------- 上篇·开篇横幅（轻量） ---------- */
export function PartBanner() {
  return (
    <div className="relative py-14 md:py-20 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center gap-6 md:gap-10">
        <Reveal>
          <span className="issue-number text-7xl md:text-9xl select-none" aria-hidden>上</span>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-xs md:text-sm tracking-[0.4em] text-[var(--ochre)] uppercase mb-2">PART ONE</p>
          <h2 className="font-serif-sc font-black text-4xl md:text-6xl text-[var(--ink)]">
            上篇 · 硕士
          </h2>
          <p className="font-serif-sc text-lg md:text-2xl text-[var(--terracotta)] mt-2">被压缩的时间</p>
        </Reveal>
        <Reveal delay={0.2} className="ml-auto hidden md:block">
          <span className="stamp">19 国 · 硕士层</span>
        </Reveal>
      </div>
      <div className="brush-line max-w-6xl mx-auto px-4 md:px-6 mt-8 opacity-70" />
    </div>
  )
}

/* ---------- 下篇·部首过渡页（整幅） ---------- */
export function PartDivider() {
  return (
    <section id="phd-part" className="relative min-h-[88vh] flex items-center py-20 bg-[var(--paper-deep)] overflow-hidden">
      <div className="vertical-text hidden lg:block absolute left-6 top-28 text-[var(--ink-faint)] text-sm select-none">
        从被压缩到被拉长
      </div>
      <div className="max-w-6xl mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-10 items-center w-full">
        <div>
          <Reveal>
            <p className="text-xs md:text-sm tracking-[0.4em] text-[var(--ochre)] uppercase mb-3">PART TWO</p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="flex items-end gap-5">
              <span className="issue-number text-8xl md:text-[10rem] select-none leading-none" aria-hidden>下</span>
              <h2 className="font-serif-sc font-black text-5xl md:text-7xl text-[var(--ink)] pb-2 md:pb-4">
                下篇 · 博士
              </h2>
            </div>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="font-serif-sc text-xl md:text-3xl text-[var(--terracotta)] mt-4">被拉长的时间</p>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="pull-quote mt-8 max-w-xl">
              如果说硕士是一场短跑——一年到三年，冲线即止；那么博士是一段被制度反复折叠的长路：
              身份、工时、休假，每一道褶皱里都藏着一部法律。
            </p>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mt-8 flex items-center gap-4">
              <a
                href="#gate"
                className="inline-flex items-center gap-2 bg-[var(--terracotta)] text-[var(--paper)] px-6 py-3 rounded-full font-medium hover:bg-[var(--terracotta-deep)] transition-colors"
              >
                进入下篇 ↓
              </a>
              <span className="stamp text-xs">雇员 or 学生？</span>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.2}>
          <motion.div
            animate={typeof window !== 'undefined' && !window.location.search.includes('snap') ? { y: [0, -8, 0] } : {}}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ForkedStairsIllustration className="w-full max-w-lg mx-auto" />
          </motion.div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 附录分隔横幅 ---------- */
export function AppendixBanner() {
  return (
    <div className="relative py-14 md:py-16">
      <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center gap-6">
        <Reveal>
          <span className="issue-number text-6xl md:text-8xl select-none" aria-hidden>附</span>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="text-xs md:text-sm tracking-[0.4em] text-[var(--ochre)] uppercase mb-1">APPENDIX</p>
          <h2 className="font-serif-sc font-black text-3xl md:text-5xl text-[var(--ink)]">附录 · 两篇共用</h2>
          <p className="text-[var(--ink-soft)] mt-2 text-sm md:text-base">
            模型实验室、国家图鉴（硕/博双栏）、法律长廊与数据缺口——硕士与博士共同的工具箱。
          </p>
        </Reveal>
      </div>
      <div className="brush-line-olive max-w-6xl mx-auto px-4 md:px-6 mt-8 opacity-70" />
    </div>
  )
}
