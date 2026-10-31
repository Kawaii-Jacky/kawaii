import { useEffect, useRef, type ReactNode } from 'react'

export default function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { el.classList.add('reveal-in'); io.disconnect(); clearTimeout(fb) }
      }),
      { threshold: 0.1 }
    )
    io.observe(el)
    const fb = setTimeout(() => el.classList.add('reveal-in'), 1600)
    return () => { io.disconnect(); clearTimeout(fb) }
  }, [])
  return <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}
