import { PAL } from '../lib/report'
import type { ReportData } from '../lib/report'
import { SectionTitle } from './HoursTerrain'

export default function Gallery({ d }: { d: ReportData }) {
  return (
    <section className="space-y-8">
      <SectionTitle no="07" title="科研图廊：一图多维"
        desc="两张高密度复合图，将工时、强度、规模、热度、股权压缩进同一画面——适合直接引用进研究报告。" />
      {[
        { src: 'assets/img/fig1_time_terrain.png', t: '图 I · 时间的地形：美·德·中劳动市场四维透视',
          s: 'A 年工时半世纪演变 | B 中国行业强度气泡（工时×超时率×规模） | C 三国可比行业工时 | D 灵活就业职业构成' },
        { src: 'assets/img/fig2_heat_tides.png', t: '图 II · 热度与潮汐：专业周期 · 股权文化 · 代际选择',
          s: 'A 中国三热构建指数 | B 法考报名×通过率双轴 | C 美国法学院申请周期 | D 三大行业薪酬结构范式' },
      ].map((f) => (
        <figure key={f.src} className="rounded-[1.75rem] p-5 md:p-7" style={{ background: PAL.card, boxShadow: '0 10px 36px rgba(140,106,79,.12)' }}>
          <div className="rounded-3xl overflow-hidden" style={{ border: `1px solid ${PAL.line}` }}>
            <img src={f.src} alt={f.t} className="w-full block" loading="lazy" />
          </div>
          <figcaption className="mt-4">
            <div className="font-bold" style={{ color: PAL.ink }}>{f.t}</div>
            <div className="text-sm mt-1" style={{ color: PAL.sub }}>{f.s}</div>
          </figcaption>
        </figure>
      ))}

      <div className="rounded-[1.75rem] p-6 md:p-8" style={{ background: '#FBF5E9', border: `1px solid ${PAL.line}` }}>
        <h3 className="font-bold text-lg mb-3" style={{ color: PAL.ink }}>数据来源与口径</h3>
        <ul className="grid md:grid-cols-2 gap-x-8 gap-y-2">
          {d.meta.sources.map((s, i) => (
            <li key={i} className="text-sm flex gap-2" style={{ color: '#7A6450' }}>
              <span style={{ color: PAL.amber }}>◆</span><span>{s}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs mt-4 leading-relaxed" style={{ color: PAL.sub }}>
          口径提醒：中国分行业工时来自 2020 年第七次人口普查长表（城镇就业），美国为 BLS CES 全雇员周工时（2024 年均），
          德国为 Eurostat 雇员惯常周工时（2025），三者统计口径不同，比较应关注量级而非小数点。
          专业热度中的土木/金融曲线为基于公开录取位次与就业占比归一化的构建指数，仅作趋势示意；其余均为实测数据。
          报告于 {d.meta.assembled} 整合。
        </p>
      </div>
    </section>
  )
}
