# Lieflat Charts 重绘记录

## 来源与安装

- 仓库：https://github.com/larashero3-dotcom/lieflat-charts
- 固定提交：`eace082a317b696c5570c25826a53a7fa113e984`。
- 项目副本：`D:/h2o/obsidian/lieflat-charts`。
- Codex个人技能目录：`C:/Users/41832/.codex/skills/lieflat-charts`，与项目副本同一版本。
- 使用系统 skill-installer 的 GitHub 下载脚本，未执行远程仓库的安装或测试脚本。审阅了SKILL、tokens、配色及所用模板；所用运行时代码没有数据上传、动态下载执行、凭据读取逻辑。这是有限人工检查，不是第三方安全认证。
- 仓库许可证为 PolyForm Noncommercial 1.0.0；保留LICENSE及THIRD_PARTY_NOTICES。不是无条件允许商业用途的许可证。

## 模板审计

交付为单张可交互图，不使用整页报告模板。已检查catalog的Lupi Editorial、Basics、Glance与关系型交互大图的数据契约。

| 候选 | 决定与理由 |
| --- | --- |
| L3 Barcode Lollipop | 面向90天左右单序列，千期、多类、有正负数据会造成多组条形相互遮挡，不采用。 |
| F2 Hairline Line | 最接近所需时间—数值编码。原模板限定短日序列，不能声称直接套用；根据SKILL第六节“参考图翻译”规则，采用其代码及骨架扩展为长周期多序列。 |
| F3 Hairline Area | 多序列面积遮挡，净持仓有负数，不宜暗示非负构成，不采用。 |
| F16 Stream Ribbon | 适用于构成及总量，本数据五类净额总和为零，不适合流带总量叙事。 |
| G18 Draw-in + Counter | 单条累计增长，不是多类有正负的存量头寸，不采用。 |
| B1/B2/B3 | 网络或流向，不是时间序列；不能暗示机构间直接成交关系，不采用。 |

最终一页使用四张互不重复的图：

| 图 | 真实模板 | 承担的结论 |
| --- | --- | --- |
| 全周期走势 | F2 Hairline Line，`templates/basics-gallery.html`，`Thirty days of sign-ups` | 五类头寸怎样沿时间变化；从短日序列扩展为周序列，保留发丝线、真实观测点、日历底纹与重播。 |
| 最新站位 | G10 Diverging Bar，`templates/glance-gallery.html`，`Where we gained, where we bled` | 最新一期五类净多/净空的方向与量级。Lupi与Basics没有可诚实承载“少类目、带正负、以零轴分侧”的模板：F5只适合非负排名，F6/F12是两时点对比，故按决策树降级采用G10。 |
| 多空拆解 | F9 Rung Waterfall，`templates/basics-gallery.html`，`From gross to net, step by step` | 杠杆资金总多头减总空头如何得到净持仓；每档约20十亿美元，端点与标签使用精确值。 |
| 年度结构 | L9 Bubble Almanac，`templates/lupi-gallery.html`，`Eight years of tickets, one almanac` | 五类交易者年末头寸如何从接近中性演变为结构性分化；面积严格按绝对值平方根换算半径，实心/空心表示净多/净空。 |

未采用L4 Arc Matrix：21年×5类为105格，超出其≤100格轻量矩阵边界，且需要年度旁注，L9更匹配。未采用F12 Dumbbell：它适合两个时点且串珠必须是真实单位，无法承担完整历史。未采用L10 Radial Patchwork：该模板编码一天内事件时刻与规模，本数据没有相应角度维度。未采用F16 Stream Ribbon：五类净额逐期恒等于零，不存在诚实的正值总量与构成。

单一配色：按用户换色要求改为 `color-presets.js` 中 PALM 椰林绿。暖纸底、深绿主线、低饱和橄榄绿与浓咖辅助线；净持仓模式以琥珀色突出杠杆资金，总量模式突出总空头。为提高可读性，浅色仅向本色系TXT加深，曲线、末端文字、主要数值及辅助文字与背景对比度不低于4.6:1，不引入其他色系。全部线保留名称、不同线型及末端标签。零轴明确标作参考线。未修改全局skill的原始预设，未改动数据与交互。

## 数据口径

沿用同目录2026-10-03取得的CFTC数据快照，实际报告日止于2026-09-29。共1060个原始报告日；2016-03-15、2016-03-29缺少超10年期合约记录，汇总图使用1058期，并在对应时间位置断线，不补零。

五类是资管/机构、杠杆资金、交易商/中介、其他可报告交易者、非报告头寸。杠杆资金并不只包含对冲基金。“全部五类”“核心三类”“原图两类”均画净面值；五类之和按每期整数美元计算验证为0。

总量模式采用：杠杆资金总多头=官方Long+Spreading；总空头=官方Short+Spreading，分别乘对应合约面值并汇总。Spreading同时计入两侧，故总多头−总空头仍等于净持仓。逐合约核对全体交易者两侧头寸（含Spreading）均等于Open Interest。

2026-09-29（十亿美元面值）：杠杆总多头396.7456，总空头1171.0371，净持仓−774.2915。此处“总量”不能与未包含价差腿的Long/Short字段混称。

页面内联全部数据和使用的模板代码，离线打开，不使用CDN、远程字体或遥测。字体优先本机Inter，中文回退微软雅黑。所用CSV包含五类净持仓和杠杆多空总量。
