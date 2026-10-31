import { Reveal, SectionHead } from '../components/bits'
import { GapIllustration } from '../components/illustrations'
import { lawEvents, dataGaps } from '../data/countries'

export function Law() {
  const min = 1995
  const max = 2027
  const pos = (y: number) => ((y - min) / (max - min)) * 100

  return (
    <section id="law" className="py-20 md:py-28 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="14"
          kicker="LEGAL TIMELINE"
          title="法律长廊"
          lead="制度不是一天建成的。从里斯本到博洛尼亚，从 NLRB 的裁决到 2025 年施行的中国《学位法》——研究生「这段时间」的形状，由这些条文一寸寸凿出。"
        />

        <Reveal className="overflow-x-auto law-track pb-4">
          <div className="relative min-w-[880px] pt-24 pb-6 px-6">
            {/* 主轴 */}
            <div className="absolute left-6 right-6 top-[7.5rem] h-1 rounded-full bg-gradient-to-r from-[var(--olive)] via-[var(--mustard)] to-[var(--terracotta)]" />
            <div className="grid grid-cols-7 gap-4">
              {lawEvents.map((e, i) => {
                const up = i % 2 === 0
                return (
                  <div key={e.title + e.year} className="relative">
                    {/* 节点 */}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-[3px] bg-[var(--paper-card)]"
                      style={{ top: '1.55rem', borderColor: ['#6b7c4e', '#8a6d3b', '#d9a441', '#c4552d'][i % 4] }}
                    />
                    <div className={`${up ? '-mt-24' : 'mt-14'}`}>
                      <div className="paper-card p-4">
                        <p className="font-serif-sc font-black text-2xl" style={{ color: ['#6b7c4e', '#8a6d3b', '#d9a441', '#c4552d'][i % 4] }}>
                          {e.year}
                        </p>
                        <h3 className="font-serif-sc font-bold leading-snug mt-1">{e.title}</h3>
                        <p className="text-xs text-[var(--ochre)] mt-0.5">{e.place}</p>
                        <p className="text-[0.82rem] text-[var(--ink-soft)] leading-relaxed mt-2">{e.detail}</p>
                      </div>
                    </div>
                    {/* 位置微调，避免年份重叠感 */}
                    <span className="sr-only">{`位置 ${pos(e.year).toFixed(0)}%`}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-sm text-[var(--ink-faint)] mt-4 max-w-3xl">
            另有众多国别框架并行运转：荷兰 CAO-NU、瑞典《高等教育条例》、日本《学校教育法》/《学位规则》、
            韩国《高等教育法》、俄罗斯 ФЗ-273/ФЗ-127、台湾《学位授予法》等，详见图鉴各卡片「法律」栏。
          </p>
        </Reveal>
      </div>
    </section>
  )
}

export function Gaps() {
  return (
    <section id="gaps" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="15"
          kicker="KNOWN UNKNOWNS"
          title="数据缺口"
          lead="诚实的地图要标出空白。以下维度在本次调研中明确未找到可靠公开数据——「查不到」本身，也是制度透明度的一种测量。"
        />

        <div className="grid md:grid-cols-[1fr_260px] gap-8 items-start">
          <Reveal>
            <ul className="space-y-4">
              {dataGaps.map((g, i) => (
                <li key={i} className="paper-card p-4 flex gap-4 items-start">
                  <span className="font-serif-sc font-black text-2xl text-[var(--terracotta)] shrink-0 leading-none mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-[var(--ink-soft)] leading-relaxed text-[0.95rem]">{g}</p>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-center gap-4 flex-wrap">
              <span className="stamp">资料稀缺</span>
              <p className="text-xs text-[var(--ink-faint)] max-w-xl">
                权威度提示：朝鲜部分依赖韩方二手研究（B 级及以下）；印度 44.1h/周为 50 人小样本；IISc 事件为 2025-10 单校政策；
                Nature 调查为自愿填答样本。正式引用前请核验各国官方法令原文与统计公报。
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.15} className="hidden md:block">
            <GapIllustration className="w-full" />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)] py-14 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="brush-line w-48 mb-10" />
        <div className="grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <p className="font-serif-sc font-black text-2xl text-[var(--terracotta)] mb-3">象牙塔的时间</p>
            <p className="text-[var(--ink-soft)] leading-relaxed">
              单页交互报告：19 个国家与地区 × 6 个维度的研究生制度对比。
              读博是一段被制度塑造的时间——愿这张地图帮你看见自己（或他人）身处哪种时间。
            </p>
          </div>
          <div>
            <p className="font-serif-sc font-bold mb-3 text-[var(--ochre)]">素材来源</p>
            <ul className="text-[var(--ink-soft)] space-y-1.5 leading-relaxed">
              <li>《各国硕博研究生制度对比调研_2026-10》</li>
              <li>《东亚五地研究生制度调研_2026-10》</li>
              <li>调研日期：2026-10-12</li>
              <li>原始来源含 MEXT、UKRI、NSF、CAO-NU、UGC、Nature PhD Survey 等官方与权威调查</li>
            </ul>
          </div>
          <div>
            <p className="font-serif-sc font-bold mb-3 text-[var(--ochre)]">权威度提示</p>
            <p className="text-[var(--ink-soft)] leading-relaxed">
              本页所有数字均来自上述调研文档的整理与精炼；朝鲜等部分条目权威度较低，
              模型实验室的输出仅供示意。正式引用前，请回到各国法令原文与统计公报核验。
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[var(--line)] flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-[var(--ink-faint)]">田野编号 2026-10 · 暖纸印刷式样 · 手工排版</p>
          <span className="stamp text-xs">象牙塔印</span>
        </div>
      </div>
    </footer>
  )
}
