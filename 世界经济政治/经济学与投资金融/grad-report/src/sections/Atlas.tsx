import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Reveal, SectionHead } from '../components/bits'
import { countries, identityMeta, type Country, type MastersDetail } from '../data/countries'

const dims: { key: keyof Pick<Country, 'entry' | 'graduation' | 'duration' | 'hours' | 'leave' | 'law'>; label: string }[] = [
  { key: 'entry', label: '进入' },
  { key: 'graduation', label: '毕业' },
  { key: 'duration', label: '学制' },
  { key: 'hours', label: '周工时' },
  { key: 'leave', label: '休假' },
  { key: 'law', label: '法律' },
]

const mastersDims: { key: keyof MastersDetail; label: string }[] = [
  { key: 'entry', label: '进入' },
  { key: 'duration', label: '学制' },
  { key: 'graduation', label: '毕业' },
  { key: 'funding', label: '学费 / 资助' },
  { key: 'time', label: '工时 / 休假' },
  { key: 'law', label: '法律' },
]

export default function Atlas() {
  const [open, setOpen] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const o = new URLSearchParams(window.location.search).get('open')
    return o && countries.some((c) => c.id === o) ? o : null
  })
  const [tab, setTab] = useState<'phd' | 'masters'>(() => {
    if (typeof window === 'undefined') return 'phd'
    return new URLSearchParams(window.location.search).get('tab') === 'masters' ? 'masters' : 'phd'
  })

  return (
    <section id="atlas" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="13"
          kicker="ATLAS"
          title="国家图鉴"
          lead="19 张卡片，每张背后都是一个完整的制度世界。点开任意一张，切换「博 / 硕」查看该国在两个层次、六个维度上的速览。"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {countries.map((c, i) => {
            const meta = identityMeta[c.identity]
            const isOpen = open === c.id
            return (
              <Reveal key={c.id} delay={(i % 3) * 0.08}>
                <motion.article
                  layout
                  className={`atlas-card paper-card overflow-hidden cursor-pointer ${isOpen ? 'sm:col-span-2 lg:col-span-3' : ''}`}
                  onClick={() => setOpen(isOpen ? null : c.id)}
                >
                  <div className="p-5 flex items-start gap-4">
                    <span
                      className="w-12 h-12 rounded-full flex items-center justify-center font-serif-sc font-black text-xl shrink-0 border-2"
                      style={{ borderColor: meta.color, color: meta.color, background: `${meta.color}10` }}
                    >
                      {c.short}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif-sc font-bold text-xl">{c.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-full text-[var(--paper)]" style={{ background: meta.color }}>
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-[var(--ink-faint)]">{c.region}</span>
                      </div>
                      <p className="text-sm text-[var(--ink-soft)] leading-relaxed mt-1.5">{c.oneLiner}</p>
                      {!isOpen && (
                        <p className="text-xs text-[var(--terracotta)] mt-2 font-medium">点击展开硕/博双栏详情 →</p>
                      )}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <div className="px-5 pb-6 border-t border-[var(--line)] pt-5">
                          <div className="flex gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
                            {(['phd', 'masters'] as const).map((k) => (
                              <button
                                key={k}
                                onClick={() => setTab(k)}
                                className={`px-4 py-1.5 rounded-full text-xs font-serif-sc font-bold border-2 transition-all ${
                                  tab === k ? 'text-[var(--paper)]' : 'text-[var(--ink-soft)] hover:-translate-y-0.5'
                                }`}
                                style={{
                                  background: tab === k ? (k === 'phd' ? 'var(--terracotta)' : 'var(--mustard)') : 'transparent',
                                  borderColor: k === 'phd' ? 'var(--terracotta)' : 'var(--mustard)',
                                  color: tab === k && k === 'masters' ? 'var(--ink)' : undefined,
                                }}
                              >
                                {k === 'phd' ? '博 · 博士六维' : '硕 · 硕士六维'}
                              </button>
                            ))}
                          </div>

                          {tab === 'phd' ? (
                            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                              {dims.map((d) => (
                                <div key={d.key} className="bg-[var(--paper-deep)] rounded-md p-4">
                                  <p className="font-serif-sc font-bold text-sm mb-1.5 inline-flex items-center gap-2">
                                    <span className="w-1.5 h-4 rounded-full inline-block" style={{ background: meta.color }} />
                                    {d.label}
                                  </p>
                                  <p className="text-[0.83rem] text-[var(--ink-soft)] leading-relaxed">{c[d.key]}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>
                              <p className="text-[0.85rem] text-[var(--ink-soft)] leading-relaxed mb-4 rounded-md p-4 border border-[var(--mustard)] bg-[rgba(217,164,65,0.08)]">
                                {c.masters}
                              </p>
                              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {mastersDims.map((d) => {
                                  const scarce = c.mastersDetail[d.key].includes('资料稀缺') || c.mastersDetail[d.key].includes('未找到')
                                  return (
                                    <div key={d.key} className="bg-[var(--paper-deep)] rounded-md p-4 relative">
                                      <p className="font-serif-sc font-bold text-sm mb-1.5 inline-flex items-center gap-2">
                                        <span className="w-1.5 h-4 rounded-full inline-block" style={{ background: 'var(--mustard)' }} />
                                        {d.label}
                                        {scarce && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#8a7d6d] text-[#8a7d6d]">资料稀缺</span>
                                        )}
                                      </p>
                                      <p className="text-[0.83rem] text-[var(--ink-soft)] leading-relaxed">{c.mastersDetail[d.key]}</p>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-[var(--terracotta)] px-5 pb-4 font-medium">点击收起 ↑</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
