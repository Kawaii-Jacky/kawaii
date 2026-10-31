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
import { medicalDecline, pensionCrossover } from '@/data/reportData'

export default function Chapter2() {
  return (
    <section className="border-t border-stone-800/60 bg-stone-900/30">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <SectionHead
          no="第二章"
          title="为什么是「找」：几千万人正在离开"
          subtitle="如果官方的说法是扩大保障覆盖面，那如何解释过去几年有几千万人主动离开社保系统？离开的，恰好是这套体系最需要的那批人——年轻、健康、还能交很多年。"
        />

        <div className="grid gap-6 lg:grid-cols-5">
          {/* 居民医保逐年流失 */}
          <Reveal className="lg:col-span-3">
            <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
                城乡居民医保参保人数：六年净减约 8000 万
              </h3>
              <p className="mb-4 text-xs text-stone-500">
                2019 年达峰超过 10 亿人，此后连续六年下滑（每年净减少，万人）
              </p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medicalDecline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="year" {...axisStyle} tick={{ fill: '#a8a29e' }} />
                    <YAxis {...axisStyle} tick={{ fill: '#a8a29e' }} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`-${v} 万`, '净减少']} />
                    <ReferenceLine y={0} stroke="#44403c" />
                    <Bar dataKey="loss" radius={[6, 6, 0, 0]} barSize={36}>
                      {medicalDecline.map((d) => (
                        <Cell key={d.year} fill={d.year === '2025' ? COLORS.emerald : COLORS.red} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-stone-400">
                到 2025 年底降到约 <span className="text-stone-100">9.42 亿</span>，六年合计少了约 8000 万——差不多是一个德国的总人口。
                注意 <span className="text-emerald-400">2025 年降幅明显收窄</span>：这正是待遇等待期执行的第一年，
                断缴的人发现再想回来要先自费看三个月的病。惩罚一出，退出的速度就慢了下来。
              </p>
            </div>
          </Reveal>

          {/* 医保总账 + 缴费率 */}
          <Reveal delay={150} className="lg:col-span-2">
            <div className="flex h-full flex-col gap-6">
              <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
                <h3 className="mb-3 font-serif-sc text-lg font-bold text-stone-100">总账也解释不通</h3>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xs text-stone-500">全国基本医保总参保（2019）</div>
                    <div className="font-serif-sc text-2xl font-bold text-stone-100">13.54 亿</div>
                  </div>
                  <div className="text-stone-600">→</div>
                  <div>
                    <div className="text-xs text-stone-500">2024</div>
                    <div className="font-serif-sc text-2xl font-bold text-red-400">13.27 亿</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-stone-400">
                  五年净少约 2700 万。同期总人口只少了几百万，重复参保的清理也解释不完——
                  剩下那一大块，只能是活生生的人自己决定今年不交了。
                </p>
              </div>
              <div className="grid flex-1 grid-cols-2 gap-4">
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
                  <div className="font-serif-sc text-3xl font-bold text-amber-400">6-7成</div>
                  <p className="mt-2 text-xs leading-relaxed text-stone-400">
                    流动人口大省职工养老保险中真正在缴费的人占参保人数的比例——剩下 3-4 成名字挂着、钱早不缴了
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-800 bg-stone-900/60 p-5">
                  <div className="font-serif-sc text-3xl font-bold text-amber-400">28.4%</div>
                  <p className="mt-2 text-xs leading-relaxed text-stone-400">
                    行业白皮书估计：2024 年按员工真实工资足额缴纳社保的企业占比。小微企业占市场主体九成以上
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        {/* 养老反超 */}
        <Reveal>
          <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              2025 年：职工养老参保人数首次反超居民养老
            </h3>
            <p className="mb-4 text-xs text-stone-500">
              自 2014 年两套居民养老制度合并以来的第一次（亿人）
            </p>
            <div className="grid items-center gap-6 md:grid-cols-2">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pensionCrossover} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" {...axisStyle} tick={{ fill: '#d6d3d1', fontSize: 13 }} />
                    <YAxis domain={[0, 6]} {...axisStyle} tick={{ fill: '#a8a29e' }} />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 亿人`, '参保人数']} />
                    <Bar
                      dataKey="value"
                      radius={[6, 6, 0, 0]}
                      barSize={56}
                      label={{ position: 'top', fill: '#e7e5e4', fontSize: 13, formatter: (v: number) => `${v} 亿` }}
                    >
                      <Cell fill={COLORS.amber} />
                      <Cell fill={COLORS.stone} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-stone-400">
                <p>
                  官方会把这个变化讲成好消息：更多人从低档保障「升级」到了高档保障。这话有一部分是对的——确实有一批进城打工的人迈进了职工养老。
                </p>
                <p>
                  但另一层原因是：2025 年居民养老里<span className="text-stone-100">领钱的人增加了 781 万，达到 1.88 亿</span>。
                  领钱的人越来越多，交钱的年轻人越来越少——很多农村年轻人的想法很朴素：
                  缴了十几年，老了每月拿一两百块，这笔数缴不缴区别不大。
                </p>
                <p className="text-stone-500">
                  断缴的大多是灵活就业者和农民工，年纪多在二三十岁、身体硬朗——这正是保险业最怕的「逆向选择」：
                  健康的人退出，池子里剩下年纪更大、病更多的人，支出上升、只能涨价，涨价又推走下一批人。居民医保这几年的走势，已经能看到死亡螺旋的影子。
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
