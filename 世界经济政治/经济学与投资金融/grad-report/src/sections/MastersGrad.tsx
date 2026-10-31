import { Reveal, SectionHead } from '../components/bits'

const lanes = [
  {
    key: 'no-thesis',
    title: '无论文 · 课程考核',
    subtitle: '修满学分，冲线即止',
    color: '#d9a441',
    desc: '授课型硕士的出口是课程考试、项目报告或短论文（dissertation），没有答辩仪式——学制短，出口也轻。',
    items: [
      '英国授课型 MSc：课程考核＋dissertation 项目，无论文答辩（viva）',
      '澳大利亚授课型：coursework 为主，部分含 capstone 项目',
      '美国 non-thesis 轨道：综合考试或项目替代论文',
    ],
  },
  {
    key: 'thesis',
    title: '论文标配 · 审查答辩',
    subtitle: '一纸论文是出口的钥匙',
    color: '#8a6d3b',
    desc: '欧陆与东亚的研究型硕士，毕业论文（Masterarbeit / 修士论文）是标配，常附审查或口试——出口比授课型重得多。',
    items: [
      '德国：Masterarbeit，部分专业附口试',
      '日本修士：30 学分＋论文审查',
      '中国大陆学硕/专硕：论文＋答辩（含盲审）',
      '中国台湾：论文抄袭侦测＋口试',
      '中国香港 MPhil：论文＋答辩',
      '巴西：PPG 论文答辩；俄罗斯：高校自主考试＋论文',
    ],
  },
  {
    key: 'publish',
    title: '论文 ＋ 发表硬要求',
    subtitle: '出口被再叠一道闸门',
    color: '#c4552d',
    desc: '韩国部分高校把发表写进硕士毕业条件——硕士层罕见的「发表前置」，与博士层共享同一套发表文化。',
    items: [
      '首尔大学生体系：硕士须学会发表 1 件＋KCI 级论文 1 篇刊载（或 SCIE 级 1 篇投稿）',
      '各校各系自定，理工科普遍硬性要求',
    ],
  },
]

export default function MastersGrad() {
  return (
    <section id="m-grad" className="py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="03"
          kicker="PART ONE · GRADUATION"
          title="毕业与论文（硕）"
          lead="硕士的出口有三重天：授课型修完学分就走；研究型以论文审查为关；韩国部分高校再叠一道发表闸门。"
        />

        <div className="grid md:grid-cols-3 gap-5">
          {lanes.map((l, i) => (
            <Reveal key={l.key} delay={i * 0.1}>
              <div className="paper-card p-6 h-full flex flex-col border-t-4" style={{ borderTopColor: l.color }}>
                <h3 className="font-serif-sc font-bold text-xl">{l.title}</h3>
                <p className="text-xs text-[var(--ochre)] mt-1 mb-3">{l.subtitle}</p>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{l.desc}</p>
                <ul className="mt-4 space-y-2 flex-1">
                  {l.items.map((it) => (
                    <li key={it} className="text-xs text-[var(--ink-soft)] leading-relaxed pl-3 border-l-2" style={{ borderColor: l.color }}>
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="pull-quote mt-10 max-w-3xl mx-auto">
            「出口的重量」往往预告了入口的方向：无论文的授课型通向职场，论文标配的研究型通向博士——
            而发表前置的硕士，已经提前过上了博士的生活。
          </p>
        </Reveal>

        <Reveal delay={0.25}>
          <p className="mt-6 text-xs text-[var(--ink-faint)] max-w-3xl leading-relaxed">
            口径说明：英国授课型无论文答辩、澳大利亚 capstone、美国 non-thesis 轨道等为通行制度的常识性补充，未在本次调研文件中逐条核验；
            日本 30 学分＋审查、台湾抄袭侦测＋口试、首尔大发表要求等出自调研原文。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
