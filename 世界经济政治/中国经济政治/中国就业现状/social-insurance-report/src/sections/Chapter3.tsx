import {
  Area,
  AreaChart,
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
import { actuaryTimeline, dependencyRatio, fiscalSubsidy } from '@/data/reportData'

export default function Chapter3() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <SectionHead
        no="第三章"
        title="基金的账本：11.2 万亿结余的另一面"
        subtitle="累计结余听上去很安心，摊到每个参保人头上一人一万多。但社保是动态系统，真正重要的是每年进来多少、出去多少、钱从哪来。"
      />

      {/* 2024 收支 */}
      <Reveal>
        <div className="mb-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8">
          <h3 className="mb-5 font-serif-sc text-lg font-bold text-stone-100">
            2024 年基本养老保险基金：拆开看（万亿元）
          </h3>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-stone-800/70 p-5">
              <div className="text-xs text-stone-500">总收入</div>
              <div className="font-serif-sc text-3xl font-bold text-stone-100">8.19</div>
              <div className="mt-2 text-xs leading-relaxed text-stone-400">
                其中财政补贴 <span className="font-bold text-amber-400">1.93</span>，接近总收入的 1/4
              </div>
            </div>
            <div className="rounded-xl bg-stone-800/70 p-5">
              <div className="text-xs text-stone-500">缴费收入（剔除补贴）</div>
              <div className="font-serif-sc text-3xl font-bold text-sky-400">≈6.26</div>
              <div className="mt-2 text-xs leading-relaxed text-stone-400">老百姓和企业真正交上来的钱</div>
            </div>
            <div className="rounded-xl bg-stone-800/70 p-5">
              <div className="text-xs text-stone-500">总支出</div>
              <div className="font-serif-sc text-3xl font-bold text-stone-100">7.28</div>
              <div className="mt-2 text-xs leading-relaxed text-stone-400">账面还剩 8000 多亿</div>
            </div>
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5">
              <div className="text-xs text-red-300/70">真实缺口</div>
              <div className="font-serif-sc text-3xl font-bold text-red-400">-1.1</div>
              <div className="mt-2 text-xs leading-relaxed text-red-200/80">
                拿掉财政补贴，2024 年的养老金缺了 11000 多亿
              </div>
            </div>
          </div>
          <p className="mt-5 border-t border-stone-800 pt-4 text-sm leading-relaxed text-stone-400">
            这种局面由来已久：只算缴费收入，基本养老保险基金从 <span className="text-stone-100">2013 年</span>起就已入不敷出，
            十几年来一直靠财政往里填。而财政的钱主要来自税收和土地出让金，不够的部分就发债——
            这几年土地财政塌了一大块，地方政府债务压得喘不过气，往养老金里填的钱每年都要多填，填钱的那只手却越来越瘦。
          </p>
        </div>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 财政补贴增长 */}
        <Reveal>
          <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              财政补贴：16 年涨了约 15 倍
            </h3>
            <p className="mb-4 text-xs text-stone-500">
              财政对养老保险的补贴（亿元），远快于同期财政收入增长
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={fiscalSubsidy} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="year" {...axisStyle} tick={{ fill: '#a8a29e' }} />
                  <YAxis {...axisStyle} tick={{ fill: '#a8a29e' }} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 亿元`, '财政补贴']} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.amber}
                    fill={COLORS.amber}
                    fillOpacity={0.15}
                    strokeWidth={2.5}
                    dot={{ fill: COLORS.amber, r: 5 }}
                    label={{ position: 'top', fill: '#f59e0b', fontSize: 12, formatter: (v: number) => `${v}` }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              国家手里还有另一个钱包：2017 年起推动国企股权划转社保基金，到 2020 年底共划转
              <span className="text-stone-100"> 1.68 万亿元</span>国有资本——但放在国企 300 多万亿的资产规模面前，只是很小的一块。
            </p>
          </div>
        </Reveal>

        {/* 赡养率 */}
        <Reveal delay={150}>
          <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              缴费赡养率：从 2 人养 1 人，到 1 人养 1 人
            </h3>
            <p className="mb-4 text-xs text-stone-500">
              每 100 个正在缴费的人要养多少个退休者（%），社科院 2019 年预测
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dependencyRatio} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="year" {...axisStyle} tick={{ fill: '#a8a29e' }} />
                  <YAxis domain={[0, 100]} {...axisStyle} tick={{ fill: '#a8a29e' }} />
                  <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, '赡养率']} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={COLORS.red}
                    strokeWidth={3}
                    dot={{ fill: COLORS.red, r: 6 }}
                    label={{ position: 'top', fill: '#ef4444', fontSize: 14, formatter: (v: number) => `${v}%` }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              到 2050 年，差不多一个交钱的人养一个退休的人——一个年轻人交着房贷、养着孩子，
              还要用工资的一大块去养一位素不相识的老人。
            </p>
          </div>
        </Reveal>
      </div>

      {/* 社科院精算预测 */}
      <Reveal>
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-950/40 to-stone-900/60 p-6 md:p-8">
          <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
            官方智库的倒计时
          </h3>
          <p className="mb-6 text-xs text-stone-500">
            中国社科院《中国养老金精算报告 2019-2050》基准情形（含财政补贴口径）
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            {actuaryTimeline.map((t, i) => (
              <div key={t.year} className="relative rounded-xl bg-stone-900/70 p-5">
                <div className="font-mono text-2xl font-bold text-red-400">{t.year}</div>
                <div className="mt-2 font-serif-sc font-bold text-stone-100">{t.event}</div>
                <div className="mt-1 text-xs leading-relaxed text-stone-400">{t.detail}</div>
                {i < actuaryTimeline.length - 1 && (
                  <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-red-500/60 md:block">→</div>
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-relaxed text-stone-400">
            职工养老名义上「统账结合」，实际运行基本是现收现付：今天在职的人交的钱，今天就发给了退休的人，
            个人账户很多年都是空账。这类制度的健康完全取决于交钱的人和领钱的人之间的比例——
            人口一老，它就必须不停地拉新人进来。每找到一个新的缴费人，体系当年就多一笔现金收入，
            而这个人的养老金要二三十年后才开始发。<span className="text-red-300">所谓「应保尽保」，落到账本上首先是「应收尽收」。</span>
          </p>
        </div>
      </Reveal>
    </section>
  )
}
