import { useState } from 'react'
import GradExplorer from './GradExplorer'
import SurvivalModel from './SurvivalModel'

const subTabs = [
  { id: 'real', label: '真实数据', color: '#c4552d' },
  { id: 'sandbox', label: '参数沙盘', color: '#8a6d3b' },
] as const

type SubId = (typeof subTabs)[number]['id']

export default function GradCurveLab() {
  const [sub, setSub] = useState<SubId>(() => {
    if (typeof window === 'undefined') return 'real'
    return new URLSearchParams(window.location.search).get('sub') === 'sandbox' ? 'sandbox' : 'real'
  })

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-serif-sc font-bold border-2 transition-all ${
              sub === t.id ? 'text-[var(--paper)]' : 'text-[var(--ink-soft)] hover:-translate-y-0.5'
            }`}
            style={{ background: sub === t.id ? t.color : 'transparent', borderColor: t.color }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {sub === 'real' ? <GradExplorer /> : <SurvivalModel />}
    </div>
  )
}
