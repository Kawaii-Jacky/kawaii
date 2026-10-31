import { useState } from 'react'
import Reveal from '../components/Reveal'
import { GLOSSARY } from '../data/meta'

export default function Glossary() {
  const [active, setActive] = useState<number | null>(null)
  return (
    <section className="border-b border-sand px-6 md:px-12 py-20 md:py-28" id="glossary">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#B08A00] mb-4">01 · 先统一语言</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-3xl">
          十二个词，看懂整份报告
        </h2>
        <p className="mt-5 max-w-2xl text-ink/75 leading-loose">
          人口学听起来高深，其实核心概念就这几个。点开每张卡片看看大白话解释——后面正文里遇到它们，也可以随时点击回顾。
        </p>
      </Reveal>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-sand border border-sand">
        {GLOSSARY.map((g, i) => (
          <Reveal key={g.term} delay={i * 40} className="bg-cream">
            <button
              onClick={() => setActive(active === i ? null : i)}
              className="w-full h-full text-left p-5 hover:bg-parchment transition-colors group"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display font-bold text-lg">{g.term}</span>
                <span className="font-num text-[10px] tracking-widest text-ink/40 uppercase">{g.en}</span>
              </div>
              <p className={`mt-3 text-[13px] leading-relaxed text-ink/70 overflow-hidden transition-all ${active === i ? 'max-h-60' : 'max-h-0'}`}>
                {g.def}
              </p>
              <div className="mt-2 font-num text-[10px] text-[#B08A00]">{active === i ? '收起 −' : '点开解释 +'}</div>
            </button>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
