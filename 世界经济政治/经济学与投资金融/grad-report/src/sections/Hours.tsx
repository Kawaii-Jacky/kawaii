import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from 'recharts'
import { Reveal, SectionHead, SNAP } from '../components/bits'
import { hoursBars } from '../data/countries'

const events = [
  {
    tag: '韩国 · 2019',
    title: '62% 日均劳动超 10 小时',
    body: '国家科学技术咨询会议等 6 机构调查：62% 研究生日均劳动超 10 小时、29% 无法使用正式休假、月薪仅 100–125 万韩元。大学院生劳动组合正在争取周 52 小时上限适用。',
    color: '#c4552d',
  },
  {
    tag: '印度 · 2025-10',
    title: 'IISc「打卡」政策争议',
    body: '印度理工学院班加罗尔（IISc）要求硕博新生每周在实验室 ≥50 小时、随导师达 70–80 小时，引发全印关注的学生抗议。全国层面无工时统计，学术小样本约 44.1h/周。',
    color: '#d9a441',
  },
  {
    tag: '英国 · HEPI',
    title: '实测平均 47 小时/周',
    body: 'UKRI 最低津贴 2025/26 为 £20,780/年（免税）。按实测 47h/周折算，有效时薪已低于英国最低工资——详见模型实验室的第一只模型。',
    color: '#8a6d3b',
  },
  {
    tag: '荷兰 · PNN 2020',
    title: '63% 博士生超时工作',
    body: '即便是雇员制、38h/周写进集体协议的荷兰，仍有 63% 的博士生超时、平均每周多 4.4 小时，47% 报告多种心理症状。制度托底，不等于压力消失。',
    color: '#6b7c4e',
  },
  {
    tag: '中国 · Nature 2022',
    title: '47.85% 周工作超 60 小时',
    body: '对 Nature 2022 博士生调查数据的分析显示，中国博士生每周工作超 60 小时者占 47.85%，为本次调研所查各国中的最高值（自愿填答样本，存在自选择偏差）。',
    color: '#a03e1d',
  },
]

export default function Hours() {
  return (
    <section id="hours" className="py-20 md:py-28 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="09"
          kicker="OVERWORK"
          title="工时高压区"
          lead="名义工时写在合同里，实际工时写在实验室的灯里。把各国可查到的数字拉到同一把尺上，高压区一目了然。"
        />

        <Reveal className="paper-card p-4 md:p-8">
          <h3 className="font-serif-sc font-bold text-xl mb-1">周工时横截面 <span className="text-sm font-normal text-[var(--ink-faint)]">（小时/周，口径见条内标注）</span></h3>
          <div className="h-[430px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursBars} layout="vertical" margin={{ top: 8, right: 90, bottom: 8, left: 10 }}>
                <XAxis type="number" domain={[0, 70]} tick={{ fill: '#8a7d6d', fontSize: 12 }} axisLine={{ stroke: '#d8cbb4' }} tickLine={false} unit="h" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: '#2a2521', fontSize: 13, fontFamily: "'Noto Serif SC', serif" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(138,109,59,0.08)' }}
                  contentStyle={{ background: '#fffaf0', border: '1px solid #d8cbb4', borderRadius: 8, fontSize: 13 }}
                  formatter={(value: number, _n: string, item: { payload?: { basis?: string } }) => [
                    `${value}h — ${item?.payload?.basis ?? ''}`,
                    '口径',
                  ]}
                />
                <ReferenceLine x={40} stroke="#6b7c4e" strokeDasharray="6 4" label={{ value: '40h 参考线', position: 'top', fill: '#6b7c4e', fontSize: 12 }} />
                <Bar dataKey="hours" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={!SNAP}>
                  {hoursBars.map((d) => (
                    <Cell key={d.name} fill={d.highlight ? '#c4552d' : d.hours >= 40 ? '#d9a441' : '#8a6d3b'} fillOpacity={d.highlight ? 1 : 0.85} />
                  ))}
                  <LabelList dataKey="hours" position="right" formatter={(v: number) => `${v}h`} style={{ fill: '#5c5248', fontSize: 12, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-[var(--ink-faint)] mt-2 px-1">
            红色为高压事件相关国家；不同年份、不同样本与不同口径并置仅用于感知量级，不构成严格可比序列。
          </p>
        </Reveal>

        {/* 事件卡 */}
        <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {events.map((e, i) => (
            <Reveal key={e.title} delay={i * 0.08}>
              <article className="paper-card p-5 h-full border-t-4" style={{ borderTopColor: e.color }}>
                <p className="text-xs tracking-widest mb-2" style={{ color: e.color }}>{e.tag}</p>
                <h4 className="font-serif-sc font-bold text-lg leading-snug">{e.title}</h4>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed mt-2">{e.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
