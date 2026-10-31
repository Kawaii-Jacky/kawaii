import { Reveal, SectionHead } from '../components/bits'

const gates = [
  {
    key: 'apply',
    title: '申请制',
    subtitle: '材料与绩点的匹配游戏',
    color: '#6b7c4e',
    desc: '无统考，凭成绩单、推荐信、语言成绩与个人陈述入场；欧陆部分项目经 uni-assist 等平台集中审核。',
    countries: ['英国', '美国', '加拿大', '澳大利亚', '新加坡', '中国香港', '德国', '法国', '荷兰', '瑞典', '瑞士'],
  },
  {
    key: 'exam',
    title: '统考 / 考试制',
    subtitle: '分数是硬门槛',
    color: '#c4552d',
    desc: '全国统一考试或各校自主命题：初试复试、笔试面试，一场考试决定入场券。',
    countries: ['中国大陆（初试＋复试 / 推免）', '日本（预科＋各校入试）', '印度（考试＋面试）', '俄罗斯（高校自主考试）'],
  },
  {
    key: 'dual',
    title: '双轨 / 自主招生',
    subtitle: '甄试与考试并行',
    color: '#d9a441',
    desc: '资料审查＋面试的「甄试」与笔试「考试」双轨并行；或由研究生院（PPG）完全自主命题选拔。',
    countries: ['中国台湾（甄试/考试双轨）', '韩国（书类＋口述）', '巴西（PPG 自主招生）'],
  },
  {
    key: 'select',
    title: '选拔制',
    subtitle: '没有公开的考场',
    color: '#8a7d6d',
    desc: '不公开招考：凭学业表现与官方许可入场，「英才连读制」把本科与硕士连成一条直线。',
    countries: ['朝鲜（英才连读：本科 4.5 年＋硕士 2 年）'],
  },
]

export default function MastersGate() {
  return (
    <section id="m-gate" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="01"
          kicker="PART ONE · ADMISSION"
          title="进入之门（硕）"
          lead="硕士的入口比博士整齐得多：大多数国家是一纸申请；东亚与印度、俄罗斯仍保留考试门槛；朝鲜则没有公开的考场。"
        />

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
          <p className="mt-6 text-sm text-[var(--ink-faint)] max-w-3xl">
            注：日本留学生常先以「研究生（けんきゅうせい）」预科身份入校再考正式课程；中国推免（保研）不占统考名额——
            同一国家内部也常常并存多条入口。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
