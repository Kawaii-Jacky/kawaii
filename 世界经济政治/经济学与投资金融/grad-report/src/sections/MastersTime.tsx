import { Reveal, SectionHead } from '../components/bits'

const clues = [
  {
    key: 'tw',
    title: '中国台湾 · 一纸分流令',
    color: '#8a6d3b',
    body: '兼任助理被分流为「学习型」与「劳雇型」：劳雇型属雇佣关系，校方须依《劳动基准法》投保劳健保、给予特休假；2019 年 2 月起学生兼任教学助理全面纳入劳、健保。硕士生是否算「劳动者」，取决于名字落在哪一栏。',
  },
  {
    key: 'jp',
    title: '日本 · 唯一的一组数字',
    color: '#c4552d',
    body: '全国大学生活协同组合连合会《全国院生生活实态调查》：平均到校每周 5.1 日；28.5% 的院生有强制在室「コアタイム」，其修士生日均研究 7.8 小时，无核心时间者反而达 8.8 小时。TA/RA 作为短时间劳动者适用《劳动基准法》，入职满 6 个月且出勤率 8 成以上者按比例付与带薪年假——但这只覆盖雇员身份的少数人。',
  },
  {
    key: 'cn',
    title: '中国大陆 · 由导师安排',
    color: '#d9a441',
    body: '研究生原则上不具劳动者身份，无法定带薪休假；2019 年六机构调查显示 29% 无法使用正式休假，寒暑假与日常休假实际由导师及实验室文化裁量——未找到官方统一规定。',
  },
]

export default function MastersTime() {
  return (
    <section id="m-time" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="05"
          kicker="PART ONE · HOURS & LEAVE"
          title="工时与休假（硕）"
          lead="下篇将用整章篇幅丈量博士的工时与休假；而在这里，我们只能给你三条线索——因为硕士层几乎没有被测量过。"
        />

        <Reveal>
          <div className="paper-card p-8 md:p-12 text-center relative overflow-hidden">
            <span className="stamp absolute top-6 right-6 rotate-6">资料稀缺</span>
            <p className="font-serif-sc font-black text-2xl md:text-4xl leading-snug md:leading-snug max-w-3xl mx-auto">
              没有人统计硕士生的时间，<br className="hidden md:block" />
              这本身就是数据。
            </p>
            <p className="text-sm md:text-base text-[var(--ink-soft)] mt-6 max-w-2xl mx-auto leading-relaxed">
              Nature 的研究生调查、各国的博士生实态报告，对象几乎都是博士。硕士生被视为「短暂路过的学生」，
              既无雇员身份可统计，也无学生权益可主张——他们在所有问卷的样本框之外。
            </p>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 mt-8">
          {clues.map((c, i) => (
            <Reveal key={c.key} delay={i * 0.1}>
              <div className="paper-card p-6 h-full border-t-4" style={{ borderTopColor: c.color }}>
                <h3 className="font-serif-sc font-bold text-lg">{c.title}</h3>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed mt-3">{c.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-6 text-sm text-[var(--ink-faint)] max-w-3xl">
            注：上篇至此收束。硕士层的「时间」问题并非不存在，而是未被制度命名——下篇「被拉长的时间」将展示，
            当一段研究生涯长到无法忽视时，身份、工时与休假才会被迫进入法律与统计的视野。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
