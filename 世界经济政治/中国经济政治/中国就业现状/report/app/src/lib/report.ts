import { useEffect, useState } from 'react'

// ---------- 暖色纸感色板 ----------
export const PAL = {
  bg: '#FAF3E7',
  card: '#FFFDF7',
  ink: '#4A3A28',
  sub: '#9A8264',
  terra: '#C96F4A',
  amber: '#E2A93B',
  sage: '#7D9B76',
  plum: '#A5678E',
  sky: '#6E93A6',
  coffee: '#8C6A4F',
  rose: '#D98E7B',
  cream: '#F5EAD6',
  line: '#E8DCC8',
}
export const COUNTRY_COLOR: Record<string, string> = { CN: PAL.terra, US: PAL.amber, DE: PAL.sage }
export const COUNTRY_NAME: Record<string, string> = { CN: '中国', US: '美国', DE: '德国' }

export const ECHARTS_BASE = {
  backgroundColor: 'transparent',
  textStyle: { fontFamily: '"Microsoft YaHei","Noto Sans SC",sans-serif', color: PAL.ink },
  tooltip: {
    backgroundColor: '#FFFDF7',
    borderColor: PAL.line,
    borderWidth: 1,
    textStyle: { color: PAL.ink, fontSize: 12 },
    extraCssText: 'border-radius:12px;box-shadow:0 6px 24px rgba(140,106,79,.18);padding:10px 14px;',
  },
}

// ---------- 数据类型 ----------
export interface ReportData {
  annual_hours: { US: Record<string, number>; DE: Record<string, number>; note: string }
  china_weekly_hours_trend: { years: number[]; weekly: number[]; note: string }
  china_annual_hours: { series: Record<string, number>; note: string }
  china_industry_hours: Record<string, { weekly: number; over48pct: number; employed_wan: number }>
  germany_industry_hours: Record<string, number>
  us_industry_hours: Record<string, { v2024: number; series: Record<string, number> }>
  life_course: {
    school_entry_age: Record<string, number>
    retirement_age: Record<string, { value: number; note: string }>
    school_weekly_hours: Record<string, { primary: number; secondary: number; university: number; note: string }>
  }
  equity_comp: {
    prevalence: Record<string, any>
    ceo_structure: { firm: string; industry: string; equity_pct: number; ceo_pay_musd: number }[]
    industry_model: { industry: string; model: string; equity_weight: number; cash_weight: number; note: string }[]
    source: string
  }
  policy_shocks: { year: number; country: string; name: string; sector: string; detail: string }[]
  major_heat: {
    CN_law_exam: { years: number[]; applicants_wan: number[]; pass_rate_pct: (number | null)[]; note: string; source: string }
    CN_lawyers: { years: number[]; count_wan: number[]; note: string }
    CN_civil: { events: string[]; trend_index: { years: number[]; index: number[]; note: string } }
    CN_finance: { events: string[]; trend_index: { years: number[]; index: number[]; note: string } }
    US_law_school: { years: number[]; applicants: number[]; note: string; source: string }
  }
  flexible_employment: {
    CN_total_trend: { years: number[]; count_yi: number[]; note: string }
    CN_occupations_2025: { name: string; count_wan: number; yoy: number }[]
    CN_new_form: { count_wan: number; share_of_workers_pct: number; note: string }
    CN_social_security: { pension_wan: number; medical_wan: number; note: string }
    US_gig: { freelancers_mn: number; share_pct: number; year: number; note: string }
    DE_solo: { solo_self_employed_mn: number; minijobs_mn: number; year: number; note: string }
  }
  china_intensity: { industry: string; weekly: number; over48pct: number; index: number; employed_wan: number }[]
  china_discipline_hours: {
    legal: { std_week: number; std_year: number; law_week_cap: number; overtime_cap_year: number; note: string }
    items: { discipline: string; weekly: number; range: [number, number] | null; tier: string; source: string }[]
    note: string
  }
  meta: { assembled: string; sources: string[] }
}

export function useReportData() {
  const [data, setData] = useState<ReportData | null>(null)
  useEffect(() => {
    fetch('assets/data/report_data.json')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
  }, [])
  return data
}

// ---------- 人生阶段 3D 模型 ----------
export interface LifeRow { industry: string; weekly: number }

export const LIFE_INDUSTRIES: Record<string, string[]> = {
  CN: ['住宿和餐饮业', '批发和零售业', '建筑业', '制造业', '交通运输、仓储和邮政业', '采矿业', '信息传输、计算机服务和软件业', '金融业', '教育', '电力、燃气及水的生产和供应业'],
  US: ['Leisure & hospitality 休闲住宿餐饮', 'Professional & business 专业商务', 'Information 信息业', 'Financial activities 金融业', 'Construction 建筑业', 'Manufacturing 制造业', 'Mining & logging 采掘业'],
  DE: ['Accommodation and food service activities', 'Education', 'Arts, entertainment and recreation', 'Human health and social work activities', 'Wholesale and retail trade; repair of motor vehicles and motorcycles', 'Professional, scientific and technical activities', 'Financial and insurance activities', 'Information and communication', 'Manufacturing', 'Transportation and storage', 'Construction', 'Agriculture, forestry and fishing'],
}

export const SHORT_NAME: Record<string, string> = {
  '住宿和餐饮业': '住宿餐饮', '批发和零售业': '批发零售', '建筑业': '建筑', '制造业': '制造',
  '交通运输、仓储和邮政业': '交通运输', '采矿业': '采矿', '信息传输、计算机服务和软件业': '信息技术',
  '金融业': '金融', '教育': '教育', '电力、燃气及水的生产和供应业': '电力公用',
  'Leisure & hospitality 休闲住宿餐饮': '休闲餐饮', 'Professional & business 专业商务': '专业商务',
  'Information 信息业': '信息业', 'Financial activities 金融业': '金融', 'Construction 建筑业': '建筑',
  'Manufacturing 制造业': '制造', 'Mining & logging 采掘业': '采掘',
  'Accommodation and food service activities': '住宿餐饮', 'Education': '教育',
  'Arts, entertainment and recreation': '文娱', 'Human health and social work activities': '卫生社工',
  'Wholesale and retail trade; repair of motor vehicles and motorcycles': '批发零售',
  'Professional, scientific and technical activities': '专业科技', 'Financial and insurance activities': '金融保险',
  'Information and communication': '信息通信', 'Manufacturing': '制造', 'Transportation and storage': '运输仓储',
  'Construction': '建筑', 'Agriculture, forestry and fishing': '农林渔',
}

function ageFactor(age: number) {
  if (age < 26) return 0.96
  if (age <= 50) return 1.0
  return 0.95
}

/** 生成某国 3D 人生工时数据: [年龄, 行业index, 周工时, 阶段] */
export function buildLifeData(d: ReportData, country: 'CN' | 'US' | 'DE') {
  const inds = LIFE_INDUSTRIES[country]
  const retire = d.life_course.retirement_age[country].value
  const sch = d.life_course.school_weekly_hours[country]
  const weeklyOf = (ind: string): number => {
    if (country === 'CN') return d.china_industry_hours[ind]?.weekly ?? 45
    if (country === 'US') return d.us_industry_hours[ind]?.v2024 ?? 34
    return d.germany_industry_hours[ind] ?? 34
  }
  const ages: number[] = []
  for (let a = 6; a <= 72; a += 2) ages.push(a)
  const points: [number, number, number, string][] = []
  for (const age of ages) {
    for (let j = 0; j < inds.length; j++) {
      let v: number, stage: string
      if (age < 12) { v = sch.primary; stage = '小学' }
      else if (age < 18) { v = sch.secondary; stage = '中学' }
      else if (age < 22) { v = sch.university; stage = '大学' }
      else if (age < retire) { v = +(weeklyOf(inds[j]) * ageFactor(age)).toFixed(1); stage = '职业期' }
      else { v = 5; stage = '退休(少量兼职/志愿)' }
      points.push([ages.indexOf(age), j, v, stage])
    }
  }
  return { ages, industries: inds.map((i) => SHORT_NAME[i] ?? i), points, retire }
}
