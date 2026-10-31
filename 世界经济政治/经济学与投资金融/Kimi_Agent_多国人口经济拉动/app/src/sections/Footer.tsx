import Reveal from '../components/Reveal'

export default function Footer() {
  return (
    <footer className="bg-ink text-cream px-6 md:px-12 py-20 md:py-28">
      <Reveal>
        <p className="font-num text-xs tracking-[0.25em] text-[#E8B400] mb-4">09 · 结语</p>
        <h2 className="font-display font-black text-4xl md:text-6xl leading-tight max-w-4xl">人口是慢变量，<br />但从不迟到</h2>
        <p className="mt-8 max-w-3xl text-cream/80 leading-loose text-[15px]">
          八个国家，同一条转型的路，只是站位不同：沙特刚走到红利期的正中央，巴西的窗口正在关闭，中国的窗口已经关上、正在换赛道，而日本在没人走过的深水区里探路。人口政策的吊诡之处在于——今天出生的孩子，二十年后才变成劳动力；今天做的决定，要一代人之后才能评分。这大概就是为什么人口问题永远「重要但不紧急」，直到它突然变得紧急。
        </p>
      </Reveal>

      <Reveal delay={120}>
        <div className="mt-16 grid md:grid-cols-2 gap-px bg-cream/15 border border-cream/15 max-w-4xl">
          <div className="bg-ink p-6">
            <p className="font-num text-[10px] tracking-[0.2em] text-[#E8B400] uppercase mb-3">数据来源</p>
            <ul className="text-[13px] text-cream/70 leading-relaxed space-y-1.5">
              <li>世界银行 World Development Indicators（1960–2024）：出生率、生育率、抚养比、年龄结构、预期寿命、人口与人均 GDP</li>
              <li>联合国《世界人口展望 2024》（UN WPP 2024）中方案：2050 / 2100 年人口、中位年龄与生育率预测（约数）</li>
              <li>政策事实截至 2025 年公开资料</li>
            </ul>
          </div>
          <div className="bg-ink p-6">
            <p className="font-num text-[10px] tracking-[0.2em] text-[#E8B400] uppercase mb-3">阅读说明</p>
            <ul className="text-[13px] text-cream/70 leading-relaxed space-y-1.5">
              <li>正文中带虚线下划线的名词均可点击查看解释</li>
              <li>预测数字为联合国中方案约数，实际路径存在较大不确定性</li>
              <li>委内瑞拉人均 GDP 序列在 2014 年后缺失</li>
            </ul>
          </div>
        </div>
      </Reveal>

      <div className="mt-16 pt-6 border-t border-cream/15 flex flex-wrap justify-between gap-4 font-num text-[10px] tracking-[0.18em] text-cream/40 uppercase">
        <span>Population Structure Report · 8 Countries · 1960–2100</span>
        <span>WB WDI × UN WPP 2024</span>
      </div>
    </footer>
  )
}
