import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SectionHead from '@/components/SectionHead'
import Reveal from '@/components/Reveal'
import { axisStyle, COLORS, tooltipStyle } from '@/components/chartTheme'
import { romaniaBirthRate, romaniaLessons } from '@/data/reportData'

const romaniaTimeline = [
  { year: '1966.10.01', event: '第 770 号法令颁布：禁止终止妊娠，避孕药具几乎从市场消失' },
  { year: '1967', event: '出生率几乎翻倍，产房人满为患，学校托儿所临时加建' },
  { year: '1970s 起', event: '25 岁起无孩者不论婚否都要多交所得税；秘密警察进驻产科病房' },
  { year: '1984', event: '育龄女性须定期接受强制妇科检查，一旦发现怀孕即登记在册——人称「月经警察」' },
  { year: '1989.12.25', event: '齐奥塞斯库夫妇被处决；次日新政权废除 770 号法令，连一天都不愿多等' },
]

export default function Chapter6() {
  return (
    <section className="border-t border-stone-800/60 bg-stone-900/30">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <SectionHead
          no="第六章"
          title="历史给过一个极端的答案：罗马尼亚"
          subtitle="国家先定一个数字，再把人一个个找出来填进去——这种做法并不新鲜。齐奥塞斯库手里有一个数字：人口从 2000 多万涨到 3000 万；今天的人社部手里也有一个数字。"
        />

        <div className="grid gap-6 lg:grid-cols-5">
          {/* 出生率 */}
          <Reveal className="lg:col-span-2">
            <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
                770 号法令的「立竿见影」
              </h3>
              <p className="mb-4 text-xs text-stone-500">罗马尼亚出生率（‰）</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={romaniaBirthRate} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="year" {...axisStyle} tick={{ fill: '#a8a29e' }} />
                    <YAxis domain={[0, 30]} {...axisStyle} tick={{ fill: '#a8a29e' }} unit="‰" />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v}‰`, '出生率']} />
                    <ReferenceLine y={0} stroke="#44403c" />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      barSize={52}
                      label={{ position: 'top', fill: '#e7e5e4', fontSize: 13, formatter: (v: number) => `${v}‰` }}
                    >
                      <Cell fill={COLORS.stone} />
                      <Cell fill={COLORS.red} />
                      <Cell fill={COLORS.amber} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                好景只维持了几年。女性们很快找到绕开法令的办法——黑市医生和口口相传的土方子——
                出生率逐年回落，再未回到 1967 年的高峰。
              </p>
            </div>
          </Reveal>

          {/* 时间线 */}
          <Reveal delay={150} className="lg:col-span-3">
            <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <h3 className="mb-5 font-serif-sc text-lg font-bold text-stone-100">23 年的强制实验</h3>
              <div className="space-y-4">
                {romaniaTimeline.map((t) => (
                  <div key={t.year} className="flex gap-4">
                    <div className="w-24 shrink-0 pt-0.5 font-mono text-xs font-bold text-red-400">{t.year}</div>
                    <div className="border-l-2 border-stone-700 pl-4 text-sm leading-relaxed text-stone-300">
                      {t.event}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-5 border-t border-stone-800 pt-4 text-sm leading-relaxed text-stone-400">
                在齐奥塞斯库的逻辑里，胎儿是「全社会的财产」，女人的子宫和工厂的机床一样，都是国家完成计划的生产资料。
                法令存续的 23 年里，约 <span className="text-red-400">1 万名女性死于非法堕胎</span>，
                孕产妇死亡率常年全欧最高，有研究显示其中近九成由堕胎造成。活下来的孩子里，
                许多被送进国家孤儿院——这一代人在罗马尼亚有个专门的称呼：「法令之子」。
                1989 年 12 月冲上街头的年轻人里，有相当一部分正是 20 出头的「法令之子」。
              </p>
            </div>
          </Reveal>
        </div>

        {/* 三条教训 */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {romaniaLessons.map((l, i) => (
            <Reveal key={l.title} delay={i * 120}>
              <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
                <div className="mb-2 font-mono text-2xl font-bold text-red-400">{String(i + 1).padStart(2, '0')}</div>
                <h3 className="mb-2 font-serif-sc font-bold text-stone-100">{l.title}</h3>
                <p className="text-sm leading-relaxed text-stone-400">{l.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* 中国对照 */}
        <Reveal>
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-stone-900/60 p-6 md:p-8">
            <h3 className="mb-3 font-serif-sc text-lg font-bold text-amber-300">
              中国自己也有过「月经警察」，只是方向相反
            </h3>
            <p className="max-w-3xl text-sm leading-relaxed text-stone-300">
              从 1970 年代到 2000 年代，计划生育最严的那些年里，农村育龄妇女要定期接受「三查」——查环、查孕、查病。
              乡镇计生办干部手里有一本花名册，谁家媳妇上了环、谁家怀了二胎，都登记在案。
              齐奥塞斯库的警察查的是女人有没有怀孕，目的是逼她们生；中国的计生干部查的也是女人有没有怀孕，目的是逼她们不生。
              <span className="text-amber-300">目标截然相反，手段几乎一模一样：国家派人盯着女人的身体，把生育当成完成指标的工具。</span>
            </p>
            <p className="mt-4 max-w-3xl border-t border-amber-500/20 pt-4 text-sm leading-relaxed text-stone-400">
              这和今天的社保有什么关系？关系很直接：养老金窟窿的根源是交钱的年轻人越来越少——1980 到 2015 这 35 年里，
              国家用尽手段把出生率压了下去，2022 年中国人口开始负增长。那些年被「三查」拦住的孩子，
              本来应该在今天走进劳动力市场成为缴费者；他们没有出生，于是今天的人社部只好拿着数据，
              去找那些已经出生却不愿交钱的人。<span className="text-stone-100">当年查环查孕留下的账单，今天要靠「数据找人」来还。</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
