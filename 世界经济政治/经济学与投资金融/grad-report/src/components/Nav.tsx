import { useEffect, useState } from 'react'

const groups: { label: string; color: string; links: { id: string; label: string }[] }[] = [
  {
    label: '上篇 · 硕士',
    color: '#d9a441',
    links: [
      { id: 'm-gate', label: '进入之门' },
      { id: 'm-spectrum', label: '学制光谱' },
      { id: 'm-grad', label: '毕业与论文' },
      { id: 'm-funding', label: '学费与资助' },
      { id: 'm-time', label: '工时与休假' },
    ],
  },
  {
    label: '下篇 · 博士',
    color: '#c4552d',
    links: [
      { id: 'gate', label: '进入之门' },
      { id: 'identity', label: '身份光谱' },
      { id: 'duration', label: '时间的落差' },
      { id: 'hours', label: '工时高压区' },
      { id: 'weekend', label: '周末的消失' },
      { id: 'leave', label: '休假的断层' },
    ],
  },
  {
    label: '附录',
    color: '#6b7c4e',
    links: [
      { id: 'lab', label: '模型实验室' },
      { id: 'atlas', label: '国家图鉴' },
      { id: 'law', label: '法律长廊' },
      { id: 'gaps', label: '数据缺口' },
    ],
  },
]

const allLinks = groups.flatMap((g) => g.links)

export default function Nav() {
  const [active, setActive] = useState('')
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    allLinks.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[rgba(250,245,236,0.92)] shadow-[0_1px_0_var(--line),0_6px_20px_rgba(42,37,33,0.06)] backdrop-blur-sm' : ''
      }`}
    >
      <nav className="max-w-6xl mx-auto flex items-center gap-1.5 px-4 md:px-6 h-14 overflow-x-auto law-track">
        <a href="#top" className="font-serif-sc font-black text-[var(--terracotta)] whitespace-nowrap mr-2 text-lg">
          象牙塔的时间
        </a>
        {groups.map((g, gi) => (
          <div key={g.label} className="flex items-center gap-1 whitespace-nowrap">
            {gi > 0 && <span className="w-px h-5 bg-[var(--line)] mx-1.5 shrink-0" aria-hidden />}
            <span className="text-[10px] tracking-widest font-serif-sc font-bold shrink-0 hidden xl:inline" style={{ color: g.color }}>
              {g.label}
            </span>
            {g.links.map((l) => (
              <a
                key={l.id}
                href={`#${l.id}`}
                className={`text-xs whitespace-nowrap px-2 py-1 rounded-full transition-colors ${
                  active === l.id
                    ? 'bg-[var(--terracotta)] text-[var(--paper)]'
                    : 'text-[var(--ink-soft)] hover:text-[var(--terracotta)]'
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </header>
  )
}
