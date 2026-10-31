import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import SectionHead from '@/components/SectionHead'
import Reveal from '@/components/Reveal'
import { axisStyle, COLORS, tooltipStyle } from '@/components/chartTheme'
import { costCompare, fifteenthFive } from '@/data/reportData'

const departments = ['人社', '公安', '民政', '市场监管', '税务']

export default function Chapter1() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionHead
        no="第一章"
        title="「数据找人」是怎么运作的"
        subtitle="从内蒙古乌拉特前旗 2025 年的一份扩面方案，可以看到这四个字落到基层的完整链条：部门共享数据、比对筛查、逐户排查——网约车司机和外卖骑手都在重点名单上。"
      />

      {/* 机制流程 */}
      <Reveal>
        <div className="mb-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            {departments.map((d, i) => (
              <div key={d} className="flex items-center gap-2">
                <span className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-300">
                  {d}
                </span>
                {i < departments.length - 1 && <span className="text-stone-600">+</span>}
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-3 text-center text-sm text-stone-400">
            <span className="text-amber-500">↓ 定期比对户籍、工商登记、纳税记录</span>
            <span className="rounded-lg bg-stone-800 px-4 py-2 text-stone-200">筛出未参保人员名单</span>
            <span className="text-amber-500">↓ 以乡镇和社区为单位逐户排查</span>
            <span className="rounded-lg bg-stone-800 px-4 py-2 text-stone-200">
              参保意愿与缴费能力登记入库
            </span>
            <span className="text-red-400">↓ 方案的下一部分标题叫《强化执法》</span>
          </div>
          <p className="mt-6 border-t border-stone-800 pt-4 text-sm leading-relaxed text-stone-500">
            能做到这一步，是因为社保从 2019 年起陆续交由税务部门征收——收社保的和收税的成了同一套系统，
            工资和纳税记录摆在同一张表里，谁没缴、谁少缴，一目了然。
          </p>
        </div>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 缴费差距图 */}
        <Reveal>
          <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              转保的代价：一年 200 元 → 一年 1 万多元
            </h3>
            <p className="mb-4 text-xs text-stone-500">
              河北 2026 年标准：缴费基数 4446 元 × 费率 20% = 每月 889 元（元/年）
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costCompare} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    {...axisStyle}
                    tick={{ fill: '#d6d3d1', fontSize: 12 }}
                  />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 元/年`, '缴费']} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={28}
                    label={{ position: 'right', fill: '#f59e0b', fontSize: 13, formatter: (v: number) => `${v} 元` }}
                  >
                    <Cell fill={COLORS.sky} />
                    <Cell fill={COLORS.red} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              「应转尽转」翻译成大白话：让同一批人从每年交 200 元，改成每年交 1 万多元。
              两套制度的价格差了几十倍。
            </p>
          </div>
        </Reveal>

        {/* 十五五目标 */}
        <Reveal delay={150}>
          <div className="flex h-full flex-col rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              先定一个数字，再把人一个个找出来填进去
            </h3>
            <p className="mb-5 text-xs text-stone-500">发布会上给出的「十五五」目标</p>
            <div className="flex-1 space-y-3">
              {fifteenthFive.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center justify-between rounded-lg bg-stone-800/70 px-4 py-3"
                >
                  <span className="text-sm text-stone-300">{t.label}</span>
                  <span className="font-serif-sc font-bold text-amber-400">{t.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm leading-relaxed text-stone-400">
              数字一旦定下来，就会被一级一级分解：省里分给市里，市里分给区县，区县分给乡镇和社区。
              安徽宣城人社局公布过一张居民养老保险报表，各县区参保率一栏写着
              <span className="text-red-400"> 100.47%、100.57%</span>——参保率超过 100% 的「统计学奇迹」。
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
