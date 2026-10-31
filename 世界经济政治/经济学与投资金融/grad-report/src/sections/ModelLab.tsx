import { useState } from 'react'
import { Reveal, SectionHead } from '../components/bits'
import OpportunityCostModel from './lab/OpportunityCostModel'
import WageModel from './lab/WageModel'
import GradCurveLab from './lab/GradCurveLab'
import DelayModel from './lab/DelayModel'

const tabs = [
  { id: 'cost', label: '模型零 · 机会成本', color: '#d9a441' },
  { id: 'wage', label: '模型一 · 有效时薪', color: '#c4552d' },
  { id: 'survival', label: '模型二 · 毕业曲线探索器', color: '#8a6d3b' },
  { id: 'delay', label: '模型三 · 延期率口径', color: '#6b7c4e' },
] as const

type TabId = (typeof tabs)[number]['id']

export default function ModelLab() {
  const [tab, setTab] = useState<TabId>(() => {
    const m = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('m') : null
    return tabs.some((t) => t.id === m) ? (m as TabId) : 'wage'
  })

  return (
    <section id="lab" className="py-20 md:py-28 bg-[var(--paper-deep)]">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <SectionHead
          no="12"
          kicker="MODEL LAB"
          title="模型实验室"
          lead="数字不该只躺在表格里。这里有四组可以亲手拨动的模型：把硕士的学制差折成机会成本、把博士津贴折成时薪、对照各国真实的逐年毕业曲线（或自己调一只生存曲线沙盘）、把「延期率」拆开看口径。"
        />

        <Reveal>
          <div className="flex flex-wrap gap-3 mb-8">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-2.5 rounded-full font-serif-sc font-bold transition-all border-2 ${
                  tab === t.id ? 'text-[var(--paper)]' : 'bg-transparent text-[var(--ink-soft)] hover:-translate-y-0.5'
                }`}
                style={{
                  background: tab === t.id ? t.color : 'transparent',
                  borderColor: t.color,
                }}
              >
                {t.label}
              </button>
            ))}
            <span className="stamp text-xs ml-auto self-center">仅供示意</span>
          </div>
        </Reveal>

        <Reveal className="paper-card p-6 md:p-10" key={tab}>
          {tab === 'cost' && <OpportunityCostModel />}
          {tab === 'wage' && <WageModel />}
          {tab === 'survival' && <GradCurveLab />}
          {tab === 'delay' && <DelayModel />}
        </Reveal>

        <Reveal delay={0.1}>
          <p className="text-xs text-[var(--ink-faint)] mt-4 max-w-3xl">
            四只模型均为教学性简化：机会成本忽略学费、税制与复利；时薪模型忽略福利差异；生存曲线用固定年风险近似真实的时变风险；
            延期率模型只演示口径算术。结论请以各国官方统计原文为准。
          </p>
        </Reveal>
      </div>
    </section>
  )
}
