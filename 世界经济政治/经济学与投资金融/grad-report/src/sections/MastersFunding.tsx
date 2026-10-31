import { Reveal, SectionHead } from '../components/bits'

const tiers = [
  {
    key: 'free',
    title: '免费 / 低学费层',
    subtitle: '公共财政买单',
    color: '#6b7c4e',
    desc: '欧陆多数公立大学把硕士当作公共品：免学费或仅收注册杂费，门槛不在钱包而在录取。',
    items: [
      '德国：多数公立大学免学费，仅收学期杂费',
      '瑞典：欧盟/EEA 学生免学费',
      '法国：注册费低廉；非欧盟生差异化收费约 3,879€/年',
      '瑞士：学费相对低廉，生活成本高',
      '中国香港：本地全日制 UGC 资助研究型课程学生标准修业期免学费',
      '日本：国公立学费标准相对统一（入学金＋授业料制）',
      '巴西：公立大学免学费＋CAPES/CNPq 硕士奖学金 R$2,100/月（2023 起）',
      '印度：公立大学学费低廉',
    ],
  },
  {
    key: 'self',
    title: '自费为主层',
    subtitle: '一纸文凭的价格标签',
    color: '#d9a441',
    desc: '英语圈授课型硕士多为自费项目，学费即商品定价；资助渠道存在但远薄于博士层。',
    items: [
      '英国：授课型自费为主；研究型可申请 UKRI 体系资助',
      '澳大利亚：授课型自费为主；RTP 奖学金覆盖研究型学位',
      '新加坡：MOE 学费补贴＋国际生 3 年 Service Obligation',
      '美国：硕士资助远少于博士，自费与贷款常见',
      '韩国：私立大学学费较高',
      '俄罗斯：公费（бюджет）名额与自费并行',
    ],
  },
  {
    key: 'funded',
    title: '奖助覆盖层',
    subtitle: '把硕士当「准研究者」养',
    color: '#c4552d',
    desc: '少数体系为硕士铺设了接近博士的资助轨道——奖学金足以覆盖生活，硕士不再只是消费。',
    items: [
      '加拿大：Tri-Agency（CGS-M）硕士奖学金 $27,000/年（2024 harmonization）',
      '中国大陆：学费较低；国家助学金＋学业奖学金＋「三助」（助教/助研/助管）体系',
    ],
  },
]

export default function MastersFunding() {
  return (
    <section id="m-funding" className="py-20 md:py-28 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="04"
          kicker="PART ONE · FUNDING"
          title="学费与资助（硕）"
          lead="硕士层的资助光谱比博士更陡：从德国的免学费到英语圈的自费商品，再到加拿大与中国的奖助覆盖——同一学位，三种账单。"
        />

        <div className="grid md:grid-cols-3 gap-5">
          {tiers.map((t, i) => (
            <Reveal key={t.key} delay={i * 0.1}>
              <div className="paper-card p-6 h-full flex flex-col border-t-4" style={{ borderTopColor: t.color }}>
                <h3 className="font-serif-sc font-bold text-xl">{t.title}</h3>
                <p className="text-xs text-[var(--ochre)] mt-1 mb-3">{t.subtitle}</p>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{t.desc}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {t.items.map((it) => (
                    <li key={it} className="text-xs text-[var(--ink-soft)] leading-relaxed pl-3 border-l-2" style={{ borderColor: t.color }}>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-6 text-xs text-[var(--ink-faint)] max-w-3xl leading-relaxed">
            口径说明：德国免学费、瑞典欧盟/EEA 免费、法国非欧盟差异化收费、日本国公立统一学费、韩国私立高学费、
            俄罗斯公费/自费并行等为通行制度的常识性补充，未在本次调研文件中逐条核验；加拿大 CGS-M、巴西 CAPES、
            新加坡 Service Obligation、香港 UGC 免学费、中国「三助」体系等出自调研原文。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
