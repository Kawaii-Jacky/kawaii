import {
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
import { earlyDeath, pensionAdjust, personalAccounts, ruleTimeline } from '@/data/reportData'

type AccountData = {
  title: string
  monthly: string | number
  years: number
  total: string
  pension: string
  pensionDetail: string
  breakeven: string
  breakevenAge: string
  note: string
}

function AccountCard({ data, accent }: { data: AccountData; accent: string }) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
      <h3 className="font-serif-sc text-lg font-bold text-stone-100">{data.title}</h3>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex justify-between border-b border-stone-800 pb-2">
          <span className="text-stone-500">每月缴费</span>
          <span className="text-right text-stone-200">{data.monthly}</span>
        </div>
        <div className="flex justify-between border-b border-stone-800 pb-2">
          <span className="text-stone-500">缴费年限 × 总额</span>
          <span className="text-right text-stone-200">
            {data.years} 年 · <span className="font-bold text-amber-400">{data.total}</span>
          </span>
        </div>
        <div className="flex justify-between border-b border-stone-800 pb-2">
          <span className="text-stone-500">退休后每月领取</span>
          <span className="text-right font-bold text-stone-100">{data.pension}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">回本</span>
          <span className={`text-right font-bold ${accent}`}>
            {data.breakeven}（{data.breakevenAge}）
          </span>
        </div>
      </div>
      <p className="mt-4 flex-1 text-xs leading-relaxed text-stone-500">{data.pensionDetail}</p>
      <p className="mt-2 border-t border-stone-800 pt-3 text-xs leading-relaxed text-stone-400">{data.note}</p>
    </div>
  )
}

export default function Chapter4() {
  return (
    <section className="border-t border-stone-800/60 bg-stone-900/30">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <SectionHead
          no="第四章"
          title="个人的账：这笔钱交了到底值不值"
          subtitle="「社保是全世界最好的理财」和「社保就是一场骗局」都太简单。把账老老实实算一遍，它有四个面：回报、单位代缴、寿命、时间。"
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <AccountCard data={personalAccounts.flexible} accent="text-emerald-400" />
          </Reveal>
          <Reveal delay={150}>
            <AccountCard data={personalAccounts.employee} accent="text-amber-400" />
          </Reveal>
        </div>

        {/* 寿命的账 */}
        <Reveal>
          <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-6 md:p-8">
            <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
              第三面：寿命的账——你得活得够长
            </h3>
            <p className="mb-5 text-xs text-stone-500">
              月薪 6000 元职员，假设 65 岁去世，只领了两年养老金
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: '个人 + 单位共缴', value: earlyDeath.paid, color: 'text-stone-100' },
                { label: '两年领到', value: earlyDeath.received, color: 'text-stone-100' },
                { label: '家人可继承（个账余额 + 丧葬抚恤）', value: '约 ' + earlyDeath.inherited, color: 'text-emerald-400' },
                { label: '留在统筹池子里', value: earlyDeath.left, color: 'text-red-400' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-stone-800/70 p-4">
                  <div className={`font-serif-sc text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="mt-1 text-xs leading-relaxed text-stone-500">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              参保人去世后，个人账户余额可由家人继承，统筹账户那部分归公共池子所有，一分也带不走。
              这笔账对谁最狠？对干一辈子体力活的人——工地工人和长途货车司机平均寿命往往比坐办公室的人短，
              他们交钱的年头最长，领钱的年头最短。一套号称保障劳动者的制度，账面上却让短命的穷人补贴长寿的人。
              对比新加坡中央公积金：钱全部记在个人名下，去世后按生前指定留给家人——两种制度各有利弊，
              差别在于参保人自己有没有选择权。
            </p>
          </div>
        </Reveal>

        {/* 规则变动 */}
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
                第四面：规则随时会变
              </h3>
              <p className="mb-5 text-xs text-stone-500">
                商业保险签了合同条款就定了；你和国家签的这份合同，国家可以随时改
              </p>
              <div className="space-y-4">
                {ruleTimeline.map((r) => (
                  <div key={r.date} className="flex gap-4">
                    <div className="w-16 shrink-0 pt-0.5 font-mono text-xs font-bold text-amber-500">{r.date}</div>
                    <div className="border-l-2 border-stone-700 pl-4">
                      <div className="text-sm font-bold text-stone-200">{r.title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-stone-400">{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="flex h-full flex-col rounded-2xl border border-stone-800 bg-stone-900/60 p-6">
              <h3 className="mb-1 font-serif-sc text-lg font-bold text-stone-100">
                领取那一头也在缩水
              </h3>
              <p className="mb-4 text-xs text-stone-500">企业退休人员基本养老金年度上调幅度（%）</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pensionAdjust} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="period" {...axisStyle} tick={{ fill: '#a8a29e' }} />
                    <YAxis domain={[0, 12]} {...axisStyle} tick={{ fill: '#a8a29e' }} unit="%" />
                    <Tooltip {...tooltipStyle} formatter={(v) => [`${v}%`, '上调幅度']} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={COLORS.sky}
                      strokeWidth={3}
                      dot={{ fill: COLORS.sky, r: 6 }}
                      label={{ position: 'top', fill: '#38bdf8', fontSize: 13, formatter: (v: number) => `${v}%` }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-stone-400">
                还有一个很少被提起的参数叫「计发月数」：60 岁退休按 139 个月分摊个人账户——这个数字 2005 年定下，
                20 年没动过，而这 20 年里中国人的平均预期寿命延长了五六岁。一旦上调，同样一笔个人账户，
                每月能领到的钱就会变少。
              </p>
              <p className="mt-3 rounded-lg bg-stone-800/70 p-3 text-sm leading-relaxed text-stone-300">
                每一项改动单独看都有道理，合在一起看方向只有一个：
                <span className="text-red-300">参保人付出更多、得到更少，而且没有人征求过他的意见。</span>
                一个 30 岁的人今天开始缴社保，面对的是一份未来 33 年里随时可能被改写的合同——
                他能确定的只有每个月扣款的日期。
              </p>
            </div>
          </Reveal>
        </div>

        {/* 流动性约束 */}
        <Reveal>
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 to-stone-900/60 p-6 md:p-8">
            <h3 className="mb-2 font-serif-sc text-lg font-bold text-amber-300">
              很多年轻人真正拒绝社保的原因：流动性约束
            </h3>
            <p className="max-w-3xl text-sm leading-relaxed text-stone-300">
              一个 30 岁的外卖骑手每年交一万多元进养老保险，要等 33 年才能动用——不能取、不能借、不能抵押，
              家里出了急事也用不上。对收入丰厚还有存款的中产，每年锁住一万块问题不大；
              对一个月光的年轻人，这一万块也许是孩子半年的学费、老家父母的一次手术费。
              经济学家把这叫「流动性约束」：<span className="text-amber-300">穷人最缺的是眼前的钱，
              一个要求穷人把眼前的钱锁进 30 年的制度，天然会遭到穷人的抗拒。</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
