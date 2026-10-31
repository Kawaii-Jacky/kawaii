// 全部数据整理自用户提供的文稿《2026年10月10日 国新办发布会》
// 文稿为语音转写，个别数字存在转写误差，均已按上下文校读

export const heroStats = [
  { value: '10.79亿', label: '基本养老保险参保人数', note: '人社部：规模全球第一' },
  { value: '11.2万亿', label: '三项社保基金累计结余', note: '养老 + 失业 + 工伤，单位：元' },
  { value: '2亿', label: '灵活就业人员', note: '国家统计局口径' },
  { value: '8400万', label: '新就业形态劳动者', note: '全国总工会调查：骑手、网约车司机等' },
]

// 两套养老制度缴费差距（河北，2026 年标准）
export const costCompare = [
  { name: '城乡居民养老·最低档', value: 200 },
  { name: '灵活就业职工养老·最低档', value: 10668 },
]

// 城乡居民医保参保人数逐年净减少（万人）
export const medicalDecline = [
  { year: '2020', loss: 800 },
  { year: '2021', loss: 700 },
  { year: '2022', loss: 2500 },
  { year: '2023', loss: 2000 },
  { year: '2024', loss: 1500 },
  { year: '2025', loss: 500 },
]

// 2025 年养老保险两套制度参保人数（亿人）——职工首次反超居民
export const pensionCrossover = [
  { name: '城镇职工养老', value: 5.47, change: '+1220 万 / 年' },
  { name: '城乡居民养老', value: 5.29, change: '-911 万 / 年' },
]

// 2024 年基本养老保险基金账本（万亿元）
export const fund2024 = {
  income: 8.19,
  fiscal: 1.93,
  contribution: 6.26,
  expense: 7.28,
  gap: 1.1, // 剔除财政补贴后的缺口
}

// 财政对养老保险补贴（亿元）
export const fiscalSubsidy = [
  { year: '2008', value: 1341 },
  { year: '2024', value: 19300 },
]

// 中国社科院《中国养老金精算报告 2019-2050》基准预测
export const actuaryTimeline = [
  { year: '2027', event: '累计结余达峰', detail: '约 7 万亿元，此后迅速下降' },
  { year: '2028', event: '当期结余首次转负', detail: '含财政补贴口径；若剔除补贴，2019 年已是负数' },
  { year: '2035', event: '累计结余可能耗尽', detail: '最年长的 80 后尚未到退休年龄' },
]

// 缴费赡养率：每 100 个缴费者对应多少退休者（%）
export const dependencyRatio = [
  { year: '2019', value: 47 },
  { year: '2050（预测）', value: 96 },
]

// 个人账本对比
export const personalAccounts = {
  flexible: {
    title: '河北灵活就业者（男性）',
    monthly: 889,
    years: 20,
    total: '21.3 万',
    pension: '约 1900 元 / 月',
    pensionDetail: '基础养老金约 1186 元 + 个人账户约 730 元',
    breakeven: '约 9 年回本',
    breakevenAge: '72 岁',
    note: '63 岁退休，个人账户计发月数 117 个月；2024 年中国人均预期寿命 79 岁',
  },
  employee: {
    title: '月薪 6000 元的公司职员',
    monthly: '个人 480（8%）+ 单位 960（16%）',
    years: 20,
    total: '34.6 万（含单位缴纳）',
    pension: '约 2300 元 / 月',
    pensionDetail: '单位缴纳的 16% 全部进入统筹基金，不进个人账户',
    breakeven: '约 12 年回本',
    breakevenAge: '75 岁',
    note: '若只算个人工资条上的 8%，四年多即可回本——但经济学共识是单位缴纳部分最终大部分也由员工承担',
  },
}

// 早逝的账（月薪 6000 职员，65 岁去世）
export const earlyDeath = {
  received: '5.6 万',
  inherited: '15.6 万',
  left: '近 20 万',
  paid: '34.6 万',
}

// 规则变动时间线
export const ruleTimeline = [
  { date: '2024.08', title: '居民医保待遇等待期', body: '断缴后再参保先等 3 个月，每多断一年再多等一个月' },
  { date: '2025.01', title: '延迟退休启动', body: '男职工 60→63 岁，女职工 50/55→55/58 岁，用 15 年分步推进' },
  { date: '2025.09', title: '最高法司法解释（二）', body: '单位与员工约定不缴社保一律无效，堵住「双方自愿不缴」的路' },
  { date: '2030 起', title: '最低缴费年限提高', body: '每年提高半年，2039 年由 15 年提高到 20 年' },
  { date: '2026.07', title: '职业伤害保障全国铺开', body: '新就业形态按日参保、按单计费、平台月度缴费' },
]

// 养老金年度上调幅度
export const pensionAdjust = [
  { period: '2005-2015', value: 10 },
  { period: '2016', value: 6.5 },
  { period: '2025', value: 2 },
]

// 养老金分层（2025，元/月）
export const pensionGap = [
  { name: '企业退休职工（人均）', value: 3962 },
  { name: '城乡居民养老领取者（人均）', value: 281 },
]

// 新农合 / 居民医保个人缴费（元/年）
export const nrcmsFee = [
  { year: '2003', value: 10 },
  { year: '2015', value: 120 },
  { year: '2018', value: 220 },
  { year: '2023', value: 380 },
  { year: '2024', value: 400 },
]

// 缴费负担的累退性（河北例子）
export const regressivity = [
  { name: '小摊贩 · 月入 3000', pay: 889, ratio: 29.6 },
  { name: '企业高管 · 月入 50000', pay: 4446, ratio: 8.9 },
]

// 收入分层 vs 缴费门槛（2025，元/年）
export const incomeLayers = [
  { name: '全国居民人均可支配收入（平均数）', value: 43377 },
  { name: '全国居民人均可支配收入（中位数）', value: 36231 },
  { name: '农村居民人均可支配收入（中位数）', value: 20710 },
  { name: '收入最低 20% 人群人均可支配收入', value: 10150 },
  { name: '河北灵活就业职工养老最低档年缴费', value: 10668 },
]

// 罗马尼亚 770 号法令前后出生率（‰）
export const romaniaBirthRate = [
  { year: '1966 前', value: 14 },
  { year: '1967', value: 27 },
  { year: '数年后', value: 18, note: '逐年回落，再未回到 1967 年高峰' },
]

// 罗马尼亚三条教训
export const romaniaLessons = [
  { title: '强制能在短期拉高数字', body: '1967 年出生率几乎翻倍，从约 14‰ 跳到约 27‰，产房人满为患。' },
  { title: '强制解决不了拒绝的原因', body: '女性不愿生育是因为养不起、住房拥挤、食物凭票。法令没有改变其中任何一条，只是把选择变成犯罪，人们转向地下，数字很快回落。' },
  { title: '代价总落在最弱的人身上', body: '23 年间约 1 万名女性死于非法堕胎，孕产妇死亡率常年全欧最高；有钱有关系的人能找到可靠的医生，穷人只能在厨房桌上冒险。' },
]

// 「门禁式强制」的六张牌
export const gateCards = [
  { icon: '🏠', title: '买房', body: '在京沪等大城市，无户口者购房需连续缴满若干年社保' },
  { icon: '📋', title: '落户', body: '社保缴费年限是积分落户的重要分项' },
  { icon: '🎒', title: '子女入学', body: '广东多市外地孩子入读公办校看父母积分，社保占大头' },
  { icon: '🏥', title: '医保', body: '断缴后设待遇等待期；安徽宁国等地断保一年，大病保险最高报销额度至少降 1000 元' },
  { icon: '⚠️', title: '信用', body: '2019 年起建立社保领域严重失信名单；在征信、社保、税务数据联通的体系里，名单边界只取决于下一份文件' },
  { icon: '💳', title: '数据', body: '社保由税务征收，与工商、公安、民政数据打通；按单计费模式随时可以扩展到养老保险' },
]

// 发布会「十五五」目标
export const fifteenthFive = [
  { label: '基本养老保险参保率', value: '稳定在 95% 以上' },
  { label: '失业保险', value: '2.55 亿人' },
  { label: '工伤保险', value: '3.45 亿人' },
]
