import { heroStats } from '@/data/reportData'
import Reveal from '@/components/Reveal'

export default function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* 背景装饰 */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 70% 10%, rgba(245,158,11,0.12), transparent), radial-gradient(ellipse 50% 40% at 20% 80%, rgba(239,68,68,0.08), transparent)',
        }}
      />
      <div className="relative mx-auto max-w-4xl px-6 pb-20 pt-24 text-center md:pt-32">
        <Reveal>
          <p className="mb-6 font-mono text-xs tracking-[0.3em] text-amber-500">
            图文交互式报告 · 基于 2026 年 10 月 10 日国新办发布会文稿
          </p>
        </Reveal>
        <Reveal delay={120}>
          <h1 className="font-serif-sc text-5xl font-black leading-tight text-stone-50 md:text-7xl">
            数据<span className="text-amber-400">找</span>人
          </h1>
        </Reveal>
        <Reveal delay={240}>
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-stone-400">
            「十五五」的重点，是让灵活就业人员、农民工和新就业形态人员参加职工养老保险。
            这些人早就在系统里——有身份证号、有参保记录。
            <span className="text-stone-200">说是找人，找的是谁、为什么找、找到了又怎样？</span>
            这份报告把文稿里的每一笔账拆开给你看。
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4">
          {heroStats.map((s, i) => (
            <Reveal key={s.label} delay={120 * i}>
              <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5 text-left backdrop-blur">
                <div className="font-serif-sc text-2xl font-bold text-amber-400 md:text-3xl">
                  {s.value}
                </div>
                <div className="mt-2 text-sm font-medium text-stone-200">{s.label}</div>
                <div className="mt-1 text-xs text-stone-500">{s.note}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={500}>
          <div className="mt-16 animate-bounce text-stone-600">↓ 向下滚动阅读</div>
        </Reveal>
      </div>
    </header>
  )
}
