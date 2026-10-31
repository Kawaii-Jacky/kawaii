import { PAL } from '../lib/report'

const STATS = [
  { v: '48.6h', k: '中国企业就业人员周工时', s: '2025 · 结束九年连涨', c: PAL.terra },
  { v: '34.3h', k: '美国私营部门周工时', s: '2024 · BLS', c: PAL.amber },
  { v: '33.8h', k: '德国雇员周惯常工时', s: '2025 · Eurostat', c: PAL.sage },
  { v: '2.8亿', k: '中国灵活就业人员', s: '2025 · 占总就业约 39%', c: PAL.plum },
]

export default function Hero() {
  return (
    <header className="relative overflow-hidden rounded-[2rem] px-8 py-14 md:px-14 md:py-20"
      style={{ background: 'linear-gradient(135deg,#FBF0DC 0%,#F7E3C8 45%,#F2D9C4 100%)' }}>
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-30"
        style={{ background: 'radial-gradient(circle,#E2A93B 0%,transparent 70%)' }} />
      <div className="absolute -bottom-32 -left-16 w-[28rem] h-[28rem] rounded-full opacity-25"
        style={{ background: 'radial-gradient(circle,#C96F4A 0%,transparent 70%)' }} />
      <div className="relative">
        <p className="tracking-[0.35em] text-sm font-semibold" style={{ color: PAL.sub }}>美 · 德 · 中 劳动市场多维交互报告</p>
        <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight" style={{ color: PAL.ink, fontFamily: 'Georgia,"STSong",serif' }}>
          时间的地形
          <span className="block mt-2 text-2xl md:text-3xl font-normal" style={{ color: PAL.coffee }}>
            从入学到退休，三个国家的劳动时间、强度与热度
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-base md:text-lg leading-relaxed" style={{ color: '#7A6450' }}>
          以 FRED/OECD、Eurostat、中国第七次人口普查、国家统计局等公开数据为基底，
          铺展劳动时间与劳动强度的行业地形、从入学到退休的 3D 人生曲面、期权文化、政策冲击，
          以及金融热、法学热、土木热的周期潮汐与灵活就业的崛起。
        </p>
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.k} className="rounded-3xl px-5 py-5 backdrop-blur-sm transition-transform hover:-translate-y-1"
              style={{ background: 'rgba(255,253,247,.75)', boxShadow: '0 8px 28px rgba(140,106,79,.14)' }}>
              <div className="text-3xl font-bold" style={{ color: s.c, fontFamily: 'Georgia,serif' }}>{s.v}</div>
              <div className="mt-1 text-sm font-medium" style={{ color: PAL.ink }}>{s.k}</div>
              <div className="text-xs mt-0.5" style={{ color: PAL.sub }}>{s.s}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  )
}
