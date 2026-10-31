import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SectionHead from '@/components/SectionHead'
import Reveal from '@/components/Reveal'
import { axisStyle, COLORS, tooltipStyle } from '@/components/chartTheme'
import { incomeLayers, nrcmsFee, pensionGap, regressivity } from '@/data/reportData'

export default function Chapter5() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionHead
        no="第五章"
        title="不确定之外，还有不公平"
        subtitle="同样是养老，中国人被分成几层：体制内退休人员有基本养老金加职业年金；企业退休职工靠一份养老金；最下面是几亿农民，每月两三百块。"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* 养老金分层 */}
        <Reveal>
          <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              一个月 3962 元 vs 一个月 281 元
            </h3>
            <p className="mb-4 text-xs text-stone-500">2025 年人均养老金（元/月），两者相差十几倍</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pensionGap} layout="vertical" margin={{ left: 10, right: 50 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    {...axisStyle}
                    tick={{ fill: '#d6d3d1', fontSize: 12 }}
                  />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 元/月`, '人均养老金']} />
                  <Bar
                    dataKey="value"
                    radius={[0, 6, 6, 0]}
                    barSize={30}
                    label={{ position: 'right', fill: '#e7e5e4', fontSize: 13, formatter: (v: number) => `${v} 元` }}
                  >
                    <Cell fill={COLORS.amber} />
                    <Cell fill={COLORS.red} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              281 元在今天的中国农村，大概能买两袋米和一桶油。而机关事业单位 2014 年「并轨」后还多一份职业年金——
              到 2024 年底投资规模已达 <span className="text-stone-100">3.11 万亿元</span>，由财政出资。
              以贵州为例，2025 年机关事业单位养老保险基金收入约 70 亿元，其中财政补助约 34 亿，将近一半。
              最讽刺的是：给体制内发职业年金的财政资金，来自全体纳税人——
              <span className="text-red-300">拿 281 元的农民买一瓶酱油一包盐，都在为这套体系缴增值税。补贴的方向是从下往上流的。</span>
            </p>
          </div>
        </Reveal>

        {/* 新农合缴费 */}
        <Reveal delay={150}>
          <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              医保也一样：个人缴费 20 年涨 40 倍
            </h3>
            <p className="mb-4 text-xs text-stone-500">新农合 / 城乡居民医保个人缴费（元/年）</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nrcmsFee} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="year" {...axisStyle} tick={{ fill: '#a8a29e' }} />
                  <YAxis {...axisStyle} tick={{ fill: '#a8a29e' }} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 元/年`, '个人缴费']} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.violet}
                    strokeWidth={3}
                    dot={{ fill: COLORS.violet, r: 5 }}
                    label={{ position: 'top', fill: '#a78bfa', fontSize: 12, formatter: (v: number) => `${v}` }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              2003 年新农合刚建立时农民每人每年交 10 元，2024 年涨到 400 元——同一时期农民的收入可没有涨这么多倍。
              一个普通农村四口之家，四个人的居民医保一年就要 1600 元，差不多是一个农村老人几个月的养老金。
              若按人社部的设想转进职工医保：广州灵活就业人员 2026 年职工医保最低每月缴 498 元，一年近 6000 元。
            </p>
          </div>
        </Reveal>
      </div>

      {/* 收入分层 vs 缴费门槛 */}
      <Reveal>
        <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8">
          <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
            更现实的问题：很多人是真的缴不起
          </h3>
          <p className="mb-4 text-xs text-stone-500">2025 年收入分层 vs 河北灵活就业职工养老最低档年缴费（元/年）</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeLayers} layout="vertical" margin={{ left: 10, right: 60 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={220}
                  {...axisStyle}
                  tick={{ fill: '#d6d3d1', fontSize: 12 }}
                />
                <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 元/年`, '']} />
                <Bar
                  dataKey="value"
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                  label={{ position: 'right', fill: '#e7e5e4', fontSize: 12, formatter: (v: number) => `${v} 元` }}
                >
                  {incomeLayers.map((d, i) => (
                    <Cell key={d.name} fill={i === incomeLayers.length - 1 ? COLORS.red : COLORS.sky} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-stone-400">
            收入最低的那两亿多中国人，就算一年不吃不喝、全部收入拿去缴职工养老保险，也不够缴最低档的
            <span className="text-red-400"> 10668 元</span>。平均数被高收入人群拉高，更能代表普通人的是中位数：
            一半中国人一年可支配收入不到 3.6 万，月均约 3000 元；农村中位数更低，月均 1700 多元。
          </p>
        </div>
      </Reveal>

      {/* 累退性 + 青年失业 */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              累退的缴费结构：收入越低，负担越重
            </h3>
            <p className="mb-4 text-xs text-stone-500">
              缴费基数有下限（社平工资 60%）和上限（300%）：河北例子，缴费占真实收入比例（%）
            </p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regressivity} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" {...axisStyle} tick={{ fill: '#d6d3d1', fontSize: 12 }} />
                  <YAxis domain={[0, 35]} {...axisStyle} tick={{ fill: '#a8a29e' }} unit="%" />
                  <Tooltip {...tooltipStyle} formatter={(v, name) => (name === 'ratio' ? [`${v}%`, '占收入比例'] : [`${v} 元/月`, '缴费'])} />
                  <Bar
                    dataKey="ratio"
                    radius={[6, 6, 0, 0]}
                    barSize={60}
                    label={{ position: 'top', fill: '#e7e5e4', fontSize: 13, formatter: (v: number) => `${v}%` }}
                  >
                    <Cell fill={COLORS.red} />
                    <Cell fill={COLORS.emerald} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              月入 3000 元的小摊贩按最低档缴 889 元，占收入近三成；月入 5 万的高管缴费基数封顶在 22230 元，
              合计缴 4446 元，只占收入约 9%。个人所得税是累进的，社保在低收入这一端恰好反过来——
              对底层劳动者而言，它更像一种按人头征收的重税。德国对月收入 500 多欧元以下的「迷你工作」有豁免安排，
              美国在领取端向低工资段倾斜；中国的设计方向正好相反：
              <span className="text-red-300">缴费端用基数下限把穷人的负担往上抬，领取端用「多缴多得」把差距往外拉。</span>
            </p>
          </div>
        </Reveal>

        <Reveal delay={150}>
          <div className="flex h-full flex-col gap-6">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <h3 className="mb-3 font-serif-sc text-lg font-bold text-stone-100">企业那一端：决定生死的成本</h3>
              <p className="text-sm leading-relaxed text-stone-400">
                单位为员工缴的社保——养老 16%、医保 6%-9%，再加失业、工伤——合计往往占到工资的四分之一甚至更多。
                一个雇了 10 个人的小饭馆，若按真实工资足额缴纳，每月要多出上万元成本；
                对利润本就微薄的小微企业，这笔钱足以决定它是活下去还是关门。
                全国小微企业和个体户占市场主体九成以上，吸纳约八成就业。
              </p>
            </div>
            <div className="flex flex-1 items-center gap-6 rounded-2xl border border-red-500/30 bg-red-950/20 p-6">
              <div className="font-serif-sc text-5xl font-black text-red-400">18.9%</div>
              <p className="text-sm leading-relaxed text-stone-300">
                2026 年 8 月，16-24 岁城镇青年（不含在校生）调查失业率——差不多每五个找工作的年轻人里就有一个找不到。
                找到了的很多也是外卖、快递、直播带货这类没有劳动合同的活：先有一份能活口的收入是第一位的事，
                每月 1000 多块的社保像选票一样遥不可及。
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* 小陈案例 */}
      <Reveal>
        <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8">
          <h3 className="mb-4 font-serif-sc text-lg font-bold text-stone-100">一个具体的人：小陈，35 岁，二线城市外卖骑手</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-stone-800/70 p-4 text-sm leading-relaxed text-stone-300">
              每天跑 10 小时，月到手 <span className="font-bold text-stone-100">6000 多元</span>；
              妻子在超市做收银，月 3000 元左右；两个孩子，大的上小学，小的上幼儿园
            </div>
            <div className="rounded-xl bg-stone-800/70 p-4 text-sm leading-relaxed text-stone-300">
              房租每月 <span className="font-bold text-stone-100">2000 元</span>，幼儿园每月
              <span className="font-bold text-stone-100"> 1500 元</span>；目前参加老家的居民养老和居民医保，一年交几百块
            </div>
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm leading-relaxed text-red-200">
              若转进职工养老 + 医保，每月要多缴 <span className="font-bold">约 1300 元</span>——
              正好相当于他家一个月的幼儿园学费，或者大半个月的房租
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-stone-400">
            平台会不会帮他出一部分？人社部说要建立「用工方、平台、企业、劳动者共同筹资」的机制，
            但具体谁出多少至今没有全国统一方案。平台一旦被要求出钱，最可能的做法是摊进配送费或压低每单单价——羊毛出在羊身上。
            而人社部在找的，就是成千上万个小陈：他们每天都在平台上接单，每一单都有记录，注册时绑定了身份证和手机号。
            在今天的中国，没有一个人真的藏得起来；难的是找到他们以后，怎么让他们心甘情愿交钱。
          </p>
          <p className="mt-3 text-xs text-stone-500">
            对照：2025 年起国家给三岁以下孩子每人每年发 3600 元育儿补贴——大约只够河北一个灵活就业者缴四个月的养老保险。
          </p>
        </div>
      </Reveal>
    </section>
  )
}
