import { Reveal, SectionHead } from '../components/bits'

const gates = [
  {
    key: 'advisor',
    title: '导师制与申请',
    subtitle: '材料与导师的双重匹配',
    color: '#6b7c4e',
    desc: '无全国统考，凭成绩单、研究计划、推荐信与导师意向入场；资助常与录取捆绑发放。德国的个人导师制是这条路线的原型。',
    countries: ['德国（个人导师接收函）', '瑞士（联系教授）', '英国', '美国', '加拿大', '澳大利亚', '新加坡', '中国香港'],
  },
  {
    key: 'job',
    title: '公开招聘',
    subtitle: '博士职位是一则招聘启事',
    color: '#8a6d3b',
    desc: '博士岗位像工作一样公开招聘：申请即求职，录用即雇员，薪级与年假写进集体劳动协议。',
    countries: ['荷兰（promovendus）', '瑞典（博士职位公开招聘）'],
  },
  {
    key: 'exam',
    title: '考试与考核',
    subtitle: '一场或多场门槛考试',
    color: '#d9a441',
    desc: '以统一或校考为硬门槛：各校入试、申请-考核、UGC-NET 或三门入学考试＋面试。',
    countries: ['日本（预科内诺＋各校入试）', '中国大陆（申请-考核/统考）', '中国台湾（甄试/考试双轨）', '俄罗斯（三门入学考试）', '印度（UGC-NET/GATE＋面试）'],
  },
  {
    key: 'select',
    title: '选拔制',
    subtitle: '没有公开的考场',
    color: '#8a7d6d',
    desc: '不公开招考：凭学业表现、推荐与官方许可入场，博士通道从「英才连读」一路延伸上来。',
    countries: ['朝鲜（选拔制）'],
  },
]

export default function Gate() {
  return (
    <section id="gate" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="06"
          kicker="PART TWO · ADMISSION"
          title="进入之门（博）"
          lead="博士的入口比硕士多了一种形状：一则招聘启事。门的形状，已经暗示了门后你将成为「学生」还是「雇员」。"
        />

        {/* 光谱轴 */}
        <Reveal>
          <div className="relative mb-8 px-2">
            <div className="h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #6b7c4e, #8a6d3b, #d9a441, #c4552d)' }} />
            <div className="flex justify-between text-xs text-[var(--ink-soft)] mt-2">
              <span>导师与材料说了算</span>
              <span>岗位与编制说了算</span>
              <span>分数说了算</span>
              <span>许可说了算</span>
            </div>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {gates.map((g, i) => (
            <Reveal key={g.key} delay={i * 0.1}>
              <div className="paper-card p-5 h-full flex flex-col border-t-4" style={{ borderTopColor: g.color }}>
                <h3 className="font-serif-sc font-bold text-xl">{g.title}</h3>
                <p className="text-xs text-[var(--ochre)] mt-1 mb-3">{g.subtitle}</p>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed flex-1">{g.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {g.countries.map((c) => (
                    <span
                      key={c}
                      className="text-xs px-2 py-1 rounded-md border"
                      style={{ borderColor: g.color, color: g.color, background: `${g.color}10` }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mt-8 text-sm text-[var(--ink-faint)] max-w-3xl">
            注：不少国家是混合制——德国的个人导师制近乎「申请」，结构化项目近乎「招聘」；中国大陆在统考之外铺开「申请-考核」；
            日本的「研究生（预科）内诺＋各校入试」更是独一无二的二段门。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
