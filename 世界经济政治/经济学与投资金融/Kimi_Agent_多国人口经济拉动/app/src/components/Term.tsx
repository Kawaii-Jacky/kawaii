import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props { children: ReactNode; en?: string; def: string }

/** 行内专有名词标注：点按弹出解释卡 */
export default function Term({ children, en, def }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close); window.removeEventListener('resize', close) }
  }, [open])

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const above = r.top > 260
      setPos({ x: Math.min(Math.max(r.left + r.width / 2, 170), window.innerWidth - 170), y: above ? r.top : r.bottom, above })
    }
    setOpen(v => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={`inline font-medium border-b border-dashed border-[#B08A00] decoration-1 underline-offset-4 cursor-help transition-colors hover:text-[#B08A00] ${open ? 'text-[#B08A00]' : ''}`}
        aria-expanded={open}
      >
        {children}
        <sup className="font-num text-[0.6em] text-[#B08A00] ml-px">?</sup>
      </button>
      {open && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-[320px] max-w-[85vw] bg-ink text-cream p-4 shadow-[8px_16px_16px_rgba(0,0,0,0.25)] border border-ink"
            style={{ left: pos.x, top: pos.y, transform: `translate(-50%, ${pos.above ? 'calc(-100% - 10px)' : '10px'})` }}
          >
            <div className="font-num text-[10px] tracking-[0.15em] text-[#E8B400] uppercase mb-1">
              名词解释 {en ? `· ${en}` : ''}
            </div>
            <p className="text-[13px] leading-relaxed text-cream/90">{def}</p>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
