import { motion } from 'framer-motion'
import { Reveal, SectionHead, SNAP } from '../components/bits'
import { leaveTiers, type LeaveTier } from '../data/countries'

function TierBody({ t }: { t: LeaveTier }) {
  return (
    <>
      <div className="p-5 text-[var(--paper)]" style={{ background: t.color }}>
        <p className="text-xs tracking-[0.3em] opacity-85">{t.level}</p>
        <h3 className="font-serif-sc font-black text-xl mt-1">{t.title}</h3>
        <p className="font-serif-sc font-bold text-3xl mt-2">{t.range}</p>
      </div>
      <ul className="p-5 space-y-3">
        {t.items.map((it) => (
          <li key={it.name} className="text-sm">
            <span className="font-serif-sc font-bold" style={{ color: t.color }}>{it.name}</span>
            <span className="text-[var(--ink-soft)] block leading-snug">{it.detail}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

export default function Leave() {
  return (
    <section id="leave" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="11"
          kicker="VACATION CLIFF"
          title="休假的断层"
          lead="从 35 天法定带薪年假到「由导师裁量」，休假制度之间存在一道真正的断层——而断层的分界面，恰好就是第二章那条雇员/学生的身份线。"
        />

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 items-end">
          {leaveTiers.map((t, i) =>
            SNAP ? (
              <div key={t.level} className="paper-card overflow-hidden">
                <TierBody t={t} />
              </div>
            ) : (
              <motion.div
                key={t.level}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.65, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="paper-card overflow-hidden"
              >
                <TierBody t={t} />
              </motion.div>
            )
          )}
        </div>

        <Reveal delay={0.15}>
          <div className="mt-10 grid md:grid-cols-[1fr_auto] gap-6 items-center">
            <p className="pull-quote">
              制度化程度排序：欧洲雇员制（25–35 天法定/合同年假）＞ 资助条款写明（澳 20 个工作日、印 30 天、俄 2 个月、英建议 ≥30 天）
              ＞ 工会合同逐校谈判（美加 10–15 天）＞ 无法定规定、导师裁量（日韩台港澳新巴西中）。
              朝鲜无研究生专门休假资料。
            </p>
            <span className="stamp text-sm self-center">断层实测</span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
