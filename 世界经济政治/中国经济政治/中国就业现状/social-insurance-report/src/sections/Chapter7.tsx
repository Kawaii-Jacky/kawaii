import SectionHead from '@/components/SectionHead'
import Reveal from '@/components/Reveal'
import { gateCards } from '@/data/reportData'

const predictions = [
  {
    title: '平台企业被要求分担缴费',
    body: '为骑手和司机承担一部分养老保险，具体比例由各地试点；成本最可能被摊进配送费或压低单价',
  },
  {
    title: '社保稽查继续加码',
    body: '针对小微企业追缴欠费——小老板把成本转给员工，或者干脆关门，员工再被推进灵活就业的队伍',
  },
  {
    title: '社区领到「转保」任务',
    body: '像当年计生办拿着花名册一样，拿着人社部门的未参保名单上门做工作',
  },
]

export default function Chapter7() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionHead
        no="第七章"
        title="不需要警察的时代：门禁式强制"
        subtitle="中国大概率不会出现罗马尼亚式挨家挨户的社保警察——不是因为善，而是因为手里有更好用的工具。人盯人成本高、漏洞多、还会激起恐惧；今天的中国有一套更安静的办法。"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gateCards.map((c, i) => (
          <Reveal key={c.title} delay={i * 80}>
            <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <div className="mb-3 text-3xl">{c.icon}</div>
              <h3 className="mb-2 font-serif-sc font-bold text-stone-100">{c.title}</h3>
              <p className="text-sm leading-relaxed text-stone-400">{c.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8">
          <h3 className="mb-2 font-serif-sc text-lg font-bold text-stone-100">管道已经铺好</h3>
          <p className="max-w-3xl text-sm leading-relaxed text-stone-400">
            2026 年 7 月起，新就业形态人员职业伤害保障在全国铺开，采用「按日参保、按单计费、平台月度缴费」的模式——
            外卖骑手每接一单，系统就自动扣下一笔保费。这套模式的技术条件完全可以扩展到养老保险：
            哪一天政策要求平台为骑手代扣职工养老保险，只需要在系统里改一个参数。
            <span className="text-stone-100">罗马尼亚需要警察站在工厂的走廊里，中国只需要在系统里加一段算法。</span>
          </p>
        </div>
      </Reveal>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {predictions.map((p, i) => (
          <Reveal key={p.title} delay={i * 120}>
            <div className="h-full rounded-2xl border border-amber-500/25 bg-amber-950/15 p-6">
              <div className="mb-2 font-mono text-xs tracking-widest text-amber-500">可以预见的动作</div>
              <h3 className="mb-2 font-serif-sc font-bold text-stone-100">{p.title}</h3>
              <p className="text-sm leading-relaxed text-stone-400">{p.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="mt-6 rounded-2xl border border-stone-700 bg-gradient-to-br from-stone-900 to-stone-900/60 p-6 md:p-10">
          <h3 className="mb-4 font-serif-sc text-xl font-bold text-stone-100">结语：这些人到底在哪？</h3>
          <p className="max-w-3xl leading-loose text-stone-300">
            所有中国人都知道答案——晚高峰的电动车上就有他们，手机支架上架着手机，为了快 30 秒宁愿冒着生命危险闯红灯；
            县城菜市场的摊位后面，有人凌晨 4 点就起床去进货；长三角的电子厂里，流水线三班倒，宿舍八个人挤一间；
            春节返乡的大巴上坐满了这样的人，口袋里揣着一年攒下的几万块钱，盘算着先还哪一笔债。
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-500">
            这是一个自我强化的循环：越强制，灵活就业的人越多；灵活就业的人越多，越要强制。
            每一项动作都会让参保数字好看一点，也都会把一部分成本转嫁出去——
            平台把成本转给骑手，小老板把成本转给员工或者干脆关门，员工再被推进灵活就业的队伍，成为下一轮「数据找人」的对象。
          </p>
        </div>
      </Reveal>
    </section>
  )
}
