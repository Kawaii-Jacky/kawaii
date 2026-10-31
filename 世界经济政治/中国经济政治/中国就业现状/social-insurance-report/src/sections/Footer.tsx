export default function Footer() {
  return (
    <footer className="border-t border-stone-800 bg-stone-950">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h3 className="mb-3 font-serif-sc font-bold text-stone-200">数据与免责声明</h3>
        <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-stone-500">
          <li>
            本报告全部内容整理自用户提供的文稿《2026年10月10日 国新办发布会》（语音转写文本）。
            文稿引用的官方统计、社科院精算报告、行业白皮书等第三方数据，均按文稿原文呈现，未逐一独立核实。
          </li>
          <li>
            文稿为语音转写，个别数字可能存在转写误差（如「1.93 亿元」按上下文校读为「1.93 万亿元」），已标注处仅供参考。
          </li>
          <li>本报告仅为对原文观点与数据的可视化整理，不代表编者立场，不构成任何投资或参保建议。</li>
        </ul>
        <div className="mt-8 flex items-center justify-between border-t border-stone-800/60 pt-6 text-xs text-stone-600">
          <span>数据找人 · 交互式报告</span>
          <span>2026.10</span>
        </div>
      </div>
    </footer>
  )
}
