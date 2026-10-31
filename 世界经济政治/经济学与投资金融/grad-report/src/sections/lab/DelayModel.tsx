import { useState } from 'react'
import { Tex, WarmSlider } from '../../components/bits'

export default function DelayModel() {
  const [expected, setExpected] = useState(100) // 预计毕业数
  const [actual, setActual] = useState(36) // 实际按期毕业数

  const cum = Math.max(0, 1 - actual / Math.max(expected, 1)) // 累积口径
  const safeExpected = Math.max(expected, 1)
  const safeActual = Math.min(actual, safeExpected)

  return (
    <div className="grid lg:grid-cols-[1fr_1.1fr] gap-8">
      <div>
        <Tex block className="text-center text-xl md:text-2xl my-4">
          {'\\text{累积延期率} = 1 - \\dfrac{\\text{实际毕业数}}{\\text{预计毕业数}}'}
        </Tex>
        <p className="text-sm text-[var(--ink-soft)] leading-relaxed">
          <strong className="font-serif-sc">方法说明：</strong>「延期率」有两个常被混用的口径。
          <strong>应届口径</strong>只看当年应毕业的那一届人中延期的比例；<strong>累积口径</strong>的分母「预计毕业数」
          包含往年一路延下来的所有人，因此数值天然高得多。中国 2022 年的真实数据是：累积口径
          <strong className="text-[var(--terracotta)]"> 64.1%</strong>，应届口径
          <strong className="text-[var(--olive)]"> 15.8%</strong>——同一个教育系统，两种 headlines。
          拨动下方滑杆，亲手验证口径差异。
        </p>

        <div className="mt-6 space-y-5">
          <WarmSlider label="预计毕业数（含往年累积延期者）" value={expected} min={10} max={200} unit=" 人" onChange={setExpected} accent="#8a6d3b" />
          <WarmSlider label="实际按期毕业数" value={actual} min={0} max={200} unit=" 人" onChange={setActual} accent="#c4552d" />
        </div>
        {actual > expected && (
          <p className="text-xs text-[var(--terracotta)] mt-2">实际毕业数超过预计毕业数时，延期率按 0 计。</p>
        )}
      </div>

      <div className="paper-card p-6 bg-[var(--paper-deep)] flex flex-col justify-center">
        <Tex block className="text-center text-lg md:text-xl">
          {`1 - \\dfrac{${safeActual}}{${safeExpected}} = ${(cum * 100).toFixed(1)}\\%`}
        </Tex>

        <div className="mt-6 space-y-5">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-[var(--ink-soft)]">你的输入 · 累积口径</span>
              <strong className="font-serif-sc text-2xl text-[var(--terracotta)]">{(cum * 100).toFixed(1)}%</strong>
            </div>
            <div className="h-5 rounded-full bg-[#e6dcc6] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--terracotta)] transition-all duration-300" style={{ width: `${cum * 100}%` }} />
            </div>
          </div>

          <div className="border-t border-dashed border-[var(--line)] pt-5 space-y-4">
            <p className="text-xs tracking-widest text-[var(--ochre)]">中国 2022 真实数据对照</p>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink-soft)]">累积口径（预计含往年延期者）</span>
                <strong className="font-serif-sc text-[var(--terracotta)]">64.1%</strong>
              </div>
              <div className="h-4 rounded-full bg-[#e6dcc6] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--terracotta)]" style={{ width: '64.1%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--ink-soft)]">应届口径（当年应毕业者中延期比例）</span>
                <strong className="font-serif-sc text-[var(--olive)]">15.8%</strong>
              </div>
              <div className="h-4 rounded-full bg-[#e6dcc6] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--olive)]" style={{ width: '15.8%' }} />
              </div>
            </div>
            <p className="text-xs text-[var(--ink-faint)]">
              试把「实际按期毕业数」设为 36、「预计毕业数」保持 100，即可复现 64.1% 的累积口径。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
