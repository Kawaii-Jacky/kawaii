import Reveal from '../components/Reveal'

const FACTORS = [
  {
    name: '产业的「就业密度」',
    sub: '一块钱 GDP 由谁生产',
    body: '油田、汽车厂、软件公司、餐馆，同样创造一块钱的 GDP，需要的劳动力相差几十倍。资本密集的部门（石油、芯片、金融）天然「不养人」，劳动密集的部门（建筑、餐饮、纺织）才是就业海绵。沙特的石油和印度的软件，一个太富一个太先进，都绕过了最能吸纳就业的劳动密集制造业——这就是两国「无就业增长」的共同根源。',
    cases: ['沙特', '印度', '德国'],
  },
  {
    name: '劳动市场制度',
    sub: '危机时谁先受伤',
    body: '美国企业可以随时裁员，所以衰退猛、复苏也快；德国用短时工作制和劳资共决把冲击分摊到所有人的工时上；日本干脆不裁员，把代价转嫁给工资和非正规雇佣；印度的劳动法则走向了反面——裁员太难，企业干脆不雇人、不做大。制度没有完美解，只有取舍：保岗位、保收入、还是保灵活性。',
    cases: ['美国', '德国', '日本'],
  },
  {
    name: '人力资本的形状',
    sub: '技能与岗位的匹配度',
    body: '德国双元制让一半年轻人在企业里边学边干，青年失业率欧洲最低；越南靠扎实的基础教育承接了制造业转移；印度则是「哑铃型」教育——顶尖的理工学院和庞大的文盲群体并存，中间的技工断层让制造业无米下锅。教育不是越多越好，而是越匹配越好。',
    cases: ['德国', '越南', '印度'],
  },
  {
    name: '资源禀赋的馈赠与诅咒',
    sub: '躺着的钱最危险',
    body: '石油和铁矿带来轻易的财富，也带来荷兰病：汇率被资源出口抬高，制造业被打垮，财政依赖资源租金，整个经济跟着商品价格坐过山车。沙特在财富里焦虑转型，巴西在衰退里怀念繁荣。资源从来不是原罪，但把租金变成生产率的制度能力，比资源本身稀缺得多。',
    cases: ['沙特', '巴西'],
  },
  {
    name: '人口与全球化的位置',
    sub: '时代的窗口开向谁',
    body: '中国赶上了「人口红利 × 全球化」的黄金交叉；越南正在吃「中国+1」的产业转移红利；日本的老龄化反而制造了劳动力稀缺，把失业率压到地板上。人口是慢变量，全球化是快变量——当快变量转向（逆全球化、供应链重组），慢变量决定谁能接住、谁会踏空。',
    cases: ['中国', '越南', '日本'],
  },
]

const colorOf = (n: string) => ({ 美国: '#2E86C1', 德国: '#5D6D7E', 日本: '#8E5EA2', 中国: '#CE323A', 印度: '#E67E22', 越南: '#148F77', 沙特: '#A67C00', 巴西: '#239B56' }[n] ?? '#171717')

export default function Sources() {
  return (
    <section className="relative border-b border-[#e5e0d5] px-6 md:px-12 py-20 md:py-28 bg-paper overflow-hidden" id="sources">
      <div className="watermark text-[20vw] right-0 -bottom-14 hidden md:block">Why</div>
      <Reveal>
        <div className="flex items-center gap-4 mb-4">
          <span className="font-num text-xs tracking-[0.25em] text-crimson">06 · 合 — 差异从哪里来</span>
          <span className="w-16 h-px bg-crimson" />
        </div>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">五根支柱，<br />撑起八种命运</h2>
        <p className="mt-5 max-w-3xl text-ink/70 leading-loose">
          把八个国家的差异拆到最后，剩下的就是这五样东西。它们相互纠缠、彼此强化——没有哪一个国家的故事能用单一因素解释，但每个国家都有一根最短的板。
        </p>
      </Reveal>
      <div className="relative mt-12 space-y-px border border-[#e5e0d5] bg-[#e5e0d5]">
        {FACTORS.map((f, i) => (
          <Reveal key={f.name} delay={i * 40} className="bg-paper">
            <div className="grid md:grid-cols-[280px_1fr_200px] gap-6 p-6 md:p-8 hover:bg-white transition-colors">
              <div>
                <div className="font-num text-[11px] text-crimson">0{i + 1}</div>
                <h3 className="font-display font-bold text-xl mt-1 leading-snug">{f.name}</h3>
                <p className="font-num text-[11px] text-ink/45 mt-1">{f.sub}</p>
              </div>
              <p className="text-[13.5px] leading-relaxed text-ink/75 self-center">{f.body}</p>
              <div className="flex md:flex-col flex-wrap gap-1.5 md:items-end self-center">
                {f.cases.map(n => (
                  <span key={n} className="text-[11px] border border-[#e5e0d5] bg-white px-2 py-0.5 inline-flex items-center gap-1.5">
                    <i className="w-1.5 h-1.5" style={{ background: colorOf(n) }} />{n}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={100}>
        <div className="mt-10 max-w-3xl border-l-2 border-crimson pl-5 py-1">
          <p className="text-ink/75 leading-loose text-[15px]">
            如果只能记住一句话：<b className="font-display">增长是总量故事，就业是结构故事。</b>
            总量决定国家富不富，结构决定普通人分到多少、用什么方式分到。评价一个经济体的增长，别只问「涨了多少」，还要问「涨的是什么」。
          </p>
        </div>
      </Reveal>
    </section>
  )
}
