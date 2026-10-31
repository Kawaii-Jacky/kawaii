// 手绘杂志插画风内联 SVG：线条 + 暖色块（象牙塔、时钟、天平、空缺档案）
const INK = '#2a2521'
const TERRA = '#c4552d'
const OCHRE = '#8a6d3b'
const OLIVE = '#6b7c4e'
const MUSTARD = '#d9a441'
const PAPER_DEEP = '#f0e6d2'

export function TowerIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 460" className={className} role="img" aria-label="象牙塔与时钟插画">
      {/* 背景暖色块 */}
      <circle cx="210" cy="200" r="150" fill={PAPER_DEEP} opacity="0.8" />
      <circle cx="330" cy="110" r="46" fill={MUSTARD} opacity="0.35" />
      {/* 太阳 */}
      <g stroke={OCHRE} strokeWidth="2.5" strokeLinecap="round">
        <circle cx="330" cy="110" r="26" fill={MUSTARD} opacity="0.9" />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4
          return (
            <line
              key={i}
              x1={330 + Math.cos(a) * 34}
              y1={110 + Math.sin(a) * 34}
              x2={330 + Math.cos(a) * 44}
              y2={110 + Math.sin(a) * 44}
            />
          )
        })}
      </g>
      {/* 塔身 */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M170 420 L178 190 Q210 176 242 190 L250 420 Z" fill="#fffaf0" />
        {/* 塔顶 */}
        <path d="M168 192 L210 120 L252 192 Q210 176 168 192 Z" fill={TERRA} />
        <line x1="210" y1="120" x2="210" y2="96" />
        <circle cx="210" cy="92" r="5" fill={MUSTARD} />
        {/* 窗 */}
        <rect x="196" y="216" width="28" height="40" rx="14" fill={PAPER_DEEP} />
        <rect x="196" y="282" width="28" height="40" rx="14" fill={PAPER_DEEP} />
        <rect x="196" y="348" width="28" height="44" rx="14" fill={OCHRE} opacity="0.55" />
        {/* 砖线 */}
        <path d="M182 268 Q210 258 238 268" fill="none" opacity="0.5" />
        <path d="M180 336 Q210 326 240 336" fill="none" opacity="0.5" />
      </g>
      {/* 大时钟（塔前悬浮） */}
      <g transform="translate(292 250)">
        <circle r="56" fill="#fffaf0" stroke={INK} strokeWidth="3.5" />
        <circle r="47" fill="none" stroke={OCHRE} strokeWidth="1.4" strokeDasharray="2 5" />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * Math.PI) / 6
          return (
            <line
              key={i}
              x1={Math.cos(a) * 47}
              y1={Math.sin(a) * 47}
              x2={Math.cos(a) * 41}
              y2={Math.sin(a) * 41}
              stroke={INK}
              strokeWidth={i % 3 === 0 ? 3 : 1.6}
              strokeLinecap="round"
            />
          )
        })}
        <line x1="0" y1="0" x2="0" y2="-30" stroke={TERRA} strokeWidth="4.5" strokeLinecap="round" />
        <line x1="0" y1="0" x2="22" y2="12" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        <circle r="5" fill={TERRA} />
      </g>
      {/* 阶梯与书 */}
      <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
        <path d="M96 420 h228" fill="none" />
        <rect x="96" y="396" width="72" height="24" fill={OLIVE} opacity="0.85" />
        <rect x="104" y="374" width="56" height="22" fill={MUSTARD} opacity="0.9" />
        <rect x="112" y="352" width="40" height="22" fill={TERRA} opacity="0.85" />
      </g>
      {/* 飘带云 */}
      <g fill="none" stroke={OCHRE} strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
        <path d="M70 150 q18 -16 36 0 q18 16 36 0" />
        <path d="M84 176 q14 -12 28 0" />
        <path d="M300 350 q16 -14 32 0 q16 14 32 0" />
      </g>
      {/* 飞鸟 */}
      <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round">
        <path d="M120 96 q8 -10 16 0 q8 -10 16 0" />
        <path d="M150 118 q6 -8 12 0 q6 -8 12 0" />
      </g>
    </svg>
  )
}

export function ClockSmallIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="沙漏时钟插画">
      <circle cx="100" cy="100" r="86" fill={PAPER_DEEP} opacity="0.7" />
      <g stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        {/* 沙漏 */}
        <path d="M70 40 h60 M70 160 h60" />
        <path d="M76 44 q0 34 24 52 q-24 18 -24 60 h48 q0 -42 -24 -60 q24 -18 24 -52 z" fill="#fffaf0" />
      </g>
      <path d="M82 60 h36 l-18 26 z" fill={MUSTARD} opacity="0.9" />
      <path d="M100 118 l14 30 h-28 z" fill={TERRA} opacity="0.85" />
      <line x1="100" y1="90" x2="100" y2="112" stroke={TERRA} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="1 5" />
    </svg>
  )
}

export function ScaleIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={className} role="img" aria-label="天平插画：雇员制与学生制">
      <circle cx="120" cy="100" r="88" fill={PAPER_DEEP} opacity="0.7" />
      <g stroke={INK} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <line x1="120" y1="36" x2="120" y2="150" />
        <path d="M86 166 h68" />
        <path d="M120 150 l-34 16 M120 150 l34 16" opacity="0" />
        <line x1="48" y1="58" x2="192" y2="58" />
        <circle cx="120" cy="58" r="6" fill={INK} />
        {/* 左盘：雇员制（低位，较重） */}
        <line x1="48" y1="58" x2="34" y2="98" />
        <line x1="48" y1="58" x2="62" y2="98" />
        <path d="M28 98 q20 22 40 0 z" fill={OLIVE} />
        {/* 右盘：学生制（高位） */}
        <line x1="192" y1="58" x2="178" y2="88" />
        <line x1="192" y1="58" x2="206" y2="88" />
        <path d="M172 88 q20 22 40 0 z" fill={TERRA} />
      </g>
      <text x="48" y="140" textAnchor="middle" fontSize="13" fill={OLIVE} fontWeight="700" fontFamily="'Noto Serif SC', serif">雇员制</text>
      <text x="192" y="130" textAnchor="middle" fontSize="13" fill={TERRA} fontWeight="700" fontFamily="'Noto Serif SC', serif">学生制</text>
    </svg>
  )
}

export function GapIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" className={className} role="img" aria-label="资料稀缺插画：空抽屉与放大镜">
      <circle cx="110" cy="90" r="80" fill={PAPER_DEEP} opacity="0.7" />
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {/* 档案柜 */}
        <rect x="46" y="44" width="96" height="102" rx="4" fill="#fffaf0" />
        <rect x="56" y="56" width="76" height="24" rx="3" fill={PAPER_DEEP} />
        <rect x="56" y="88" width="76" height="24" rx="3" fill="none" strokeDasharray="5 5" />
        <rect x="56" y="120" width="76" height="18" rx="3" fill={PAPER_DEEP} />
        <circle cx="94" cy="68" r="3.4" fill={OCHRE} stroke="none" />
        <circle cx="94" cy="129" r="3.4" fill={OCHRE} stroke="none" />
      </g>
      {/* 问号 */}
      <text x="94" y="106" textAnchor="middle" fontSize="18" fill={TERRA} fontWeight="900" fontFamily="'Noto Serif SC', serif">？</text>
      {/* 放大镜 */}
      <g stroke={INK} strokeWidth="3.4" strokeLinecap="round">
        <circle cx="164" cy="66" r="22" fill="#fffaf0" opacity="0.85" />
        <line x1="180" y1="82" x2="198" y2="100" />
      </g>
      <path d="M156 66 q8 -10 16 0" fill="none" stroke={TERRA} strokeWidth="2.4" strokeLinecap="round" />
      {/* 印章式斜线 */}
      <g stroke={TERRA} strokeWidth="2" opacity="0.5">
        <line x1="50" y1="150" x2="150" y2="150" strokeDasharray="3 6" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/* 分岔的阶梯：左路短而平缓（硕士），右路长而蜿蜒（博士） */
export function ForkedStairsIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 460 360" className={className} role="img" aria-label="分岔的阶梯插画：硕士与博士两条路">
      <circle cx="230" cy="180" r="160" fill={PAPER_DEEP} opacity="0.7" />
      {/* 共同起点 */}
      <g stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 320 h340" fill="none" />
        <circle cx="230" cy="320" r="7" fill={INK} />
        <text x="230" y="345" textAnchor="middle" fontSize="12" fill={INK} fontFamily="'Noto Serif SC', serif">本科毕业</text>
      </g>
      {/* 左阶梯：硕士（短，芥末黄） */}
      <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M230 320 L170 320 L170 272 L130 272 L130 224 L96 224" fill="none" />
        <rect x="170" y="272" width="60" height="48" fill={MUSTARD} opacity="0.28" stroke="none" />
        <rect x="130" y="224" width="40" height="48" fill={MUSTARD} opacity="0.45" stroke="none" />
      </g>
      {/* 左顶：小旗（1–3 年） */}
      <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <line x1="96" y1="224" x2="96" y2="176" />
        <path d="M96 176 L136 186 L96 198 Z" fill={MUSTARD} />
      </g>
      <text x="96" y="162" textAnchor="middle" fontSize="13" fontWeight="700" fill={OCHRE} fontFamily="'Noto Serif SC', serif">硕士 · 1–3 年</text>
      {/* 右阶梯：博士（长，陶土红，蜿蜒） */}
      <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M230 320 L290 320 L290 284 L330 284 L330 248 L300 248 L300 214 L340 214 L340 180 L312 180 L312 146 L352 146 L352 112" fill="none" />
        <rect x="290" y="284" width="40" height="36" fill={TERRA} opacity="0.2" stroke="none" />
        <rect x="300" y="214" width="40" height="34" fill={TERRA} opacity="0.28" stroke="none" />
        <rect x="312" y="146" width="40" height="34" fill={TERRA} opacity="0.36" stroke="none" />
      </g>
      {/* 右顶：小塔 */}
      <g stroke={INK} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M340 112 L344 78 Q352 72 360 78 L364 112 Z" fill="#fffaf0" />
        <path d="M340 79 L352 58 L364 79 Q352 72 340 79 Z" fill={TERRA} />
        <line x1="352" y1="58" x2="352" y2="46" />
        <circle cx="352" cy="43" r="3.4" fill={MUSTARD} stroke="none" />
      </g>
      <text x="352" y="34" textAnchor="middle" fontSize="13" fontWeight="700" fill={TERRA} fontFamily="'Noto Serif SC', serif">博士 · 3–7 年</text>
      {/* 飘云与飞鸟 */}
      <g fill="none" stroke={OCHRE} strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
        <path d="M120 96 q14 -12 28 0 q14 12 28 0" />
        <path d="M70 130 q10 -9 20 0" />
      </g>
      <g fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
        <path d="M196 70 q7 -8 14 0 q7 -8 14 0" />
      </g>
      {/* 分岔虚线问号 */}
      <path d="M230 300 q-6 -18 6 -28" fill="none" stroke={TERRA} strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
    </svg>
  )
}
