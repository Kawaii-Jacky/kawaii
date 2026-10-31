import Reveal from '../components/Reveal'
import Term from '../components/Term'

const TOOLS = [
  {
    name: '真金白银鼓励生育',
    sub: '发钱 · 减税 · 分房优先',
    body: '最直接的一招。德国的儿童金和父母金让生育率从 1.25 的谷底回到过 1.5；中国多地发放生育补贴、托育券。但国际经验很一致：钱能改变「什么时候生」，很难改变「生不生」。养一个孩子的成本里，现金补贴通常只覆盖一小部分。',
    cases: ['德国', '中国', '日本'],
    verdict: '有效但昂贵，见效以十年计',
  },
  {
    name: '托育与育儿假改革',
    sub: '让父母敢生、能生',
    body: '比发钱更深一层：解决「没人带娃」和「怕丢工作」。德国 2013 年起 1 岁以上儿童法定有权入托；日本拼命扩充保育园、消灭「待机儿童」；父亲育儿假的强制配额（北欧首创、日德跟进）则试图把育儿成本从女性一个人身上卸下来。',
    cases: ['德国', '日本', '英国'],
    verdict: '北欧证明过有效，前提是真舍得投入',
  },
  {
    name: '打开移民之门',
    sub: '最快的人口补丁',
    body: '生育政策见效要二十年，移民当月就能补充劳动力。美国、英国、德国的总人口增长几乎全靠移民。但移民会带来融合成本和政治反弹——英国脱欧、美国边境之争、德国选择党崛起，背后都有移民议题的影子。',
    cases: ['美国', '德国', '英国'],
    verdict: '立竿见影，但政治代价高',
  },
  {
    name: '延迟退休 · 开发「银发劳动力」',
    sub: '改不了人口，就改定义',
    body: '既然老人变多，那就让「老人」晚一点成为老人。德国退休年龄正延至 67 岁；中国 2025 年起渐进式延迟退休；日本干脆打造「终身不退休社会」，70 岁员工随处可见。配合健康寿命延长，这是对冲抚养比最现实的一手。',
    cases: ['日本', '德国', '中国'],
    verdict: '财政上最解渴，推行时最容易引发抗议',
  },
  {
    name: '释放女性生产力',
    sub: '一举两得的关键棋',
    body: '女性劳动参与率每提一格，劳动力短缺就缓一口气。沙特把女性参与率从 18% 拉到 35% 以上，是近年全球最激进的人口政策实验；日本「女性经济学」让女性就业率反超美国。难点在于：工作友好和生育友好必须同时成立，否则生育率会进一步塌陷。',
    cases: ['沙特', '日本', '德国'],
    verdict: '红利巨大，但要求职场文化整体改造',
  },
  {
    name: '用机器人和 AI 对冲',
    sub: '劳动力不够，机器来凑',
    body: '日本的护理机器人、中国的「黑灯工厂」，都是同一条思路：劳动年龄人口下降不可逆，那就提高每个劳动者的人均产出。自动化不能完全替代人——尤其护理和情感劳动——但它是所有老龄化国家的必答题，也是「人口红利」之后「技术红利」的入场券。',
    cases: ['日本', '中国', '德国'],
    verdict: '长期最优解，但解决不了养老金筹资',
  },
]

const colorOf = (n: string) => ({ 德国: '#5D6D7E', 中国: '#D64533', 日本: '#8E5EA2', 美国: '#2E86C1', 沙特: '#148F77', 英国: '#CA6F1E', 巴西: '#239B56', 委内瑞拉: '#C2185B' }[n] ?? '#2E3030')

export default function PolicyToolbox() {
  return (
    <section className="border-b border-sand px-6 md:px-12 py-20 md:py-28" id="policy">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#B08A00] mb-4">06 · 政策工具箱</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">
          改变人口结构，<br />政府手里有六张牌
        </h2>
        <p className="mt-5 max-w-3xl text-ink/75 leading-loose">
          人口结构变化缓慢，但并非不可撼动。这六类<Term en="Macro Policy" def="宏观措施：由国家层面实施、作用于整个经济社会的政策手段，区别于企业和个人层面的决策。">宏观措施</Term>是各国的共同选项——区别只在组合和剂量。残酷的现实是：没有一张牌是免费的，也没有一张牌能快速见效。
        </p>
      </Reveal>
      <div className="mt-12 grid md:grid-cols-2 xl:grid-cols-3 gap-px bg-sand border border-sand">
        {TOOLS.map((t, i) => (
          <Reveal key={t.name} delay={i * 50} className="bg-cream">
            <div className="p-6 md:p-7 h-full flex flex-col hover:bg-parchment transition-colors">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display font-bold text-xl leading-snug">{t.name}</h3>
                <span className="font-num text-[10px] text-ink/40 whitespace-nowrap">0{i + 1}</span>
              </div>
              <p className="font-num text-[11px] text-[#B08A00] mt-1">{t.sub}</p>
              <p className="mt-4 text-[13.5px] leading-relaxed text-ink/75 flex-1">{t.body}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {t.cases.map(n => (
                  <span key={n} className="text-[11px] border border-sand px-2 py-0.5 inline-flex items-center gap-1.5">
                    <i className="w-1.5 h-1.5" style={{ background: colorOf(n) }} />{n}
                  </span>
                ))}
              </div>
              <p className="mt-3 pt-3 border-t border-sand text-[12px] text-ink/60"><span className="font-num text-[10px] text-[#B08A00] tracking-widest mr-1.5">评估</span>{t.verdict}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
