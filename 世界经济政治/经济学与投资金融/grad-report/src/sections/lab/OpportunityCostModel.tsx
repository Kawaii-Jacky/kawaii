import { useState } from 'react'
import { Tex, WarmSlider } from '../../components/bits'

const presets = [
  { key: 'uk-cn', label: '英 1 年 vs 中 3 年', dt: 2 },
  { key: 'uk-jp', label: '英 1 年 vs 日 2 年', dt: 1 },
  { key: 'uk-ca', label: '英 1 年 vs 加 2–3 年', dt: 2 },
] as const

export default function OpportunityCostModel() {
  const [dt, setDt] = useState(2) // 学制差 Δt（年）
  const [wage, setWage] = useState(20) // 毕业后年起薪 Y（万元）
  const [stipend, setStipend] = useState(3) // 在读年收入 S（万元，奖助/兼职）

  const cost = dt * (wage - stipend) // 万元

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8">
      <div>
        <Tex block className="text-center text-xl md:text-2xl my-4">
          {'C = \\Delta t \\times (Y - S)'}
        </Tex>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          <strong className="font-serif-sc">方法说明：</strong>同样是硕士文凭，学制每多一年，就晚一年进入职场。
          机会成本 <Tex>{'C'}</Tex> 近似为「学制差 <Tex>{'\\Delta t'}</Tex>」乘以「毕业后年起薪{' '}
          <Tex>{'Y'}</Tex> 与「在读年收入 <Tex>{'S'}</Tex>」之差——这是把「被压缩的时间」翻译成钱的最粗算法：
          它不计学费差异、不计复利、也不计入职场起步早晚对长期薪资曲线的影响。
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setDt(p.dt)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${
                dt === p.dt ? 'text-[var(--paper)]' : 'text-[var(--ink-soft)] hover:-translate-y-0.5'
              }`}
              style={{ background: dt === p.dt ? '#d9a441' : 'transparent', borderColor: '#d9a441' }}
            >
              {p.label}（Δt={p.dt}）
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <WarmSlider label="学制差 Δt" value={dt} min={0} max={4} step={0.5} unit=" 年" onChange={setDt} accent="#d9a441" />
          <WarmSlider label="毕业后年起薪 Y" value={wage} min={5} max={80} unit=" 万元" onChange={setWage} accent="#c4552d" />
          <WarmSlider label="在读年收入 S（奖助/兼职）" value={stipend} min={0} max={15} step={0.5} unit=" 万元" onChange={setStipend} accent="#6b7c4e" />
        </div>
      </div>

      <div className="paper-card p-6 bg-[var(--paper-deep)] flex flex-col justify-center">
        <Tex block className="text-center text-lg md:text-xl">
          {`${dt} \\times (${wage} - ${stipend}) = ${cost.toFixed(1)}\\ \\text{万元}`}
        </Tex>

        <div className="mt-6 text-center">
          <p className="text-xs tracking-widest text-[var(--ochre)] mb-2">机会成本 C</p>
          <p className="font-serif-sc font-black text-5xl text-[var(--terracotta)]">
            {cost.toFixed(1)}
            <span className="text-xl"> 万元</span>
          </p>
          <p className="text-sm text-[var(--ink-soft)] mt-4 max-w-md mx-auto leading-relaxed">
            {cost > 0
              ? `多读 ${dt} 年硕士，大约相当于晚挣 ${cost.toFixed(1)} 万元——还没算学费与复利。`
              : cost === 0
                ? '学制相同，机会成本为零——账单发生在别处（学费、汇率、生活成本）。'
                : '在读年收入高于毕业后起薪时，结果不再代表「成本」。'}
          </p>
        </div>

        <div className="border-t border-dashed border-[var(--line)] mt-6 pt-4">
          <p className="text-xs text-[var(--ink-faint)] leading-relaxed">
            对照上篇光谱：英国授课型 1 年、日本修士 2 年、中国学硕 3 年、加拿大 thesis 型 2–3 年。
            Δt 预设即取这些名义学制之差；Y 与 S 为可拨动的假设值，非任何国家的官方统计。
          </p>
        </div>
      </div>
    </div>
  )
}
