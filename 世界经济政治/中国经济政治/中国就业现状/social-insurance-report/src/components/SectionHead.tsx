import Reveal from '@/components/Reveal'

export default function SectionHead({
  no,
  title,
  subtitle,
}: {
  no: string
  title: string
  subtitle?: string
}) {
  return (
    <Reveal>
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3">
          <span className="font-mono text-sm tracking-widest text-amber-500">{no}</span>
          <span className="h-px flex-1 bg-gradient-to-r from-amber-500/60 to-transparent" />
        </div>
        <h2 className="font-serif-sc text-3xl font-bold leading-tight text-stone-100 md:text-4xl">
          {title}
        </h2>
        {subtitle && <p className="mt-3 max-w-2xl leading-relaxed text-stone-400">{subtitle}</p>}
      </div>
    </Reveal>
  )
}
