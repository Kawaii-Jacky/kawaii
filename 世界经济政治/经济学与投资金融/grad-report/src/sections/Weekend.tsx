import { Reveal, SectionHead } from '../components/bits'

/* ---------- 左栏：法律上的周末 ---------- */
const lawCards = [
  {
    place: '欧盟',
    color: '#6b7c4e',
    title: '《工作时间指令》2003/88/EC',
    body: '每 7 天至少 24 小时连续休息、周均工时 ≤48 小时——「周末」在这里是写在指令里的法定底线。',
  },
  {
    place: '德国',
    color: '#6b7c4e',
    title: 'ArbZG §9：周日与假日原则禁工',
    body: '但注意：周六在德国是普通工作日——法律保的是「周日」，不是「双休」。',
  },
  {
    place: '法国',
    color: '#6b7c4e',
    title: '周休 ≥35 小时，原则含周日',
    body: '每周连续休息不少于 35 小时，原则上包含周日。',
  },
  {
    place: '荷兰 / 瑞典',
    color: '#6b7c4e',
    title: '每 7 天 36 小时连续休息',
    body: '瑞典进一步规定这 36 小时「尽可能安排在周末」。',
  },
  {
    place: '瑞士（例外）',
    color: '#d9a441',
    title: 'ETH 科研雇员不适用周日/夜班条款',
    body: '内部规章只说「必要时才做」周日工作——法律周末在象牙塔里率先开了个口子。',
  },
  {
    place: '中国台湾',
    color: '#d9a441',
    title: '劳雇型助理适用「一例一休」',
    body: '每 7 天 2 天休息——但只覆盖被认定为「劳雇型」的助理，研究生本人不在其内。',
  },
]

/* ---------- 右栏：实验室里的周末 ---------- */
const labCards = [
  {
    place: '日本',
    color: '#c4552d',
    stat: '5.1 天 / 周',
    body: '全国生协调查：研究生平均每周到校 5.1 天，7 天全勤者 7.3%。在籍研究生不适用《劳动基准法》第 35 条（每周 1 休息日）——它只保护签了合同的 TA/RA。',
  },
  {
    place: '韩国',
    color: '#c4552d',
    stat: '周末干活 2.41 小时',
    body: 'KAIST 2019 调查：周末两天平均工作 2.41 小时，周末完全不出勤者仅 20.9%。',
  },
  {
    place: '中国大陆',
    color: '#c4552d',
    stat: '周末强度 = 平时 77%',
    body: '《劳动法》第 38 条（每周至少休 1 日）不适用于在校研究生（劳部发〔1995〕309 号）；教育部 2020《研究生导师指导行为准则》全文无工时与休息日条款。中国科学家周末工作强度为平时的 77%（美 68%、德 64%）。',
  },
  {
    place: '英国 / 美国 / 澳加',
    color: '#c4552d',
    stat: '条款里没有「周末」',
    body: 'UKRI 资助条款全文无「周末」字样；美国工会合同只以周/日工时上限间接覆盖；澳、加同。',
  },
  {
    place: '中国香港 / 新加坡',
    color: '#8a6d3b',
    stat: '以「工作日」计假',
    body: '校规假期按工作日计算（HKU 请假表注明周六日不计入）——间接承认周末存在，但没有休息权条文。',
  },
  {
    place: '印度 / 俄罗斯 / 巴西',
    color: '#8a6d3b',
    stat: '打卡不豁免周末',
    body: 'IISc 打卡按周计 50h+，未豁免周末；俄罗斯副博士「教育非劳动」；巴西 bolsista 不受 CLT 劳动法保护。',
  },
]

export default function Weekend() {
  return (
    <section id="weekend" className="py-20 md:py-28 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="10"
          kicker="PART TWO · THE WEEKEND"
          title="周末的消失"
          lead="「周末」是雇员的法律概念，不是学生的。它在欧陆的劳动法里，在东亚的实验室里不存在——身份的断层，最终落在了星期六的早上。"
        />

        <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-14">
          {/* 中间手绘竖线（桌面） */}
          <div className="hidden lg:block absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2" aria-hidden>
            <svg className="h-full w-4 -ml-2" preserveAspectRatio="none" viewBox="0 0 16 100">
              <path d="M 8 0 Q 5 25 9 50 T 7 100" fill="none" stroke="#c9b99a" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>

          {/* 左：法律上的周末 */}
          <div>
            <Reveal>
              <div className="flex items-center gap-3 mb-5">
                <h3 className="font-serif-sc font-black text-2xl text-[var(--olive)]">法律上的周末</h3>
                <span className="stamp text-xs">条文存在</span>
              </div>
            </Reveal>
            <div className="space-y-4">
              {lawCards.map((c, i) => (
                <Reveal key={c.place} delay={i * 0.07}>
                  <div className="paper-card p-5 border-l-4" style={{ borderLeftColor: c.color }}>
                    <p className="text-xs tracking-widest mb-1" style={{ color: c.color }}>{c.place}</p>
                    <h4 className="font-serif-sc font-bold text-base">{c.title}</h4>
                    <p className="text-sm text-[var(--ink-soft)] leading-relaxed mt-1.5">{c.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          {/* 右：实验室里的周末 */}
          <div>
            <Reveal>
              <div className="flex items-center gap-3 mb-5">
                <h3 className="font-serif-sc font-black text-2xl text-[var(--terracotta)]">实验室里的周末</h3>
                <span className="stamp text-xs">概念消失</span>
              </div>
            </Reveal>
            <div className="space-y-4">
              {labCards.map((c, i) => (
                <Reveal key={c.place} delay={i * 0.07}>
                  <div className="paper-card p-5 border-l-4" style={{ borderLeftColor: c.color }}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <p className="text-xs tracking-widest" style={{ color: c.color }}>{c.place}</p>
                      <p className="font-serif-sc font-black text-lg" style={{ color: c.color }}>{c.stat}</p>
                    </div>
                    <p className="text-sm text-[var(--ink-soft)] leading-relaxed mt-1.5">{c.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>

        <Reveal delay={0.15}>
          <p className="pull-quote mt-12 max-w-3xl mx-auto">
            而即便在法律周末存在的地方，文化周末也在被侵蚀——法国 FAGE 调查中周休与日休「常常不被尊重」；
            荷兰格罗宁根的博士生平均每周多干 12–13 小时。条文写在纸上，实验不停转。
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-6 text-xs text-[var(--ink-faint)] max-w-3xl leading-relaxed">
            来源：欧盟 2003/88/EC 指令；德国《工作时间法》（ArbZG）§9；法国《劳动法典》周休条款；荷兰/瑞典工时法；
            ETH 内部规章；台湾「一例一休」与助理分流制度；日本全国大学生活协同组合连合会《全国院生生活实态调查》；
            KAIST 2019 研究生实态调查；劳部发〔1995〕309 号、教育部《研究生导师指导行为准则》（2020）；
            科学家周末工作强度跨国比较研究；UKRI 条款文本；HKU 请假规程；IISc 考勤规定。均出自本次调研原文。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
