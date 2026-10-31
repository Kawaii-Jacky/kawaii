# -*- coding: utf-8 -*-
"""整合三国劳动市场数据 -> report/assets/data/report_data.json
数据来源: FRED(OECD托管序列+BLS CES), Eurostat lfsa_ewhan2, 中国2020人口普查长表,
国家统计局新闻稿, 司法部/LSAC/ABA, 复旦灵工打卡白皮书, 中国新就业形态研究中心, 财新, Deloitte/NASPP
"""
import csv, json, os, re, glob

ROOT = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(ROOT, "raw")
OUT = os.path.join(ROOT, "report", "assets", "data", "report_data.json")

def read_fred(name):
    path = os.path.join(RAW, f"fred_{name}.csv")
    rows = [r for r in csv.reader(open(path, encoding="utf-8")) if r and r[0][:4].isdigit()]
    out = {}
    for r in rows:
        try:
            out[int(r[0][:4])] = round(float(r[3]), 2)
        except (ValueError, IndexError):
            pass
    return out

data = {}
meta = {"assembled": "2026-10-14", "sources": []}

# ---------- 1. 年工时 1970-2023 (FRED 托管 OECD 序列) ----------
us_ann = read_fred("AVHWPEUSA065NRUG")
de_ann = read_fred("AVHWPEDEA065NRUG")
data["annual_hours"] = {
    "US": us_ann, "DE": de_ann,
    "note": "FRED 托管 OECD 序列 AVHWPE*A065NRUG，人均年实际工作小时",
}
meta["sources"].append("FRED/OECD: Average Annual Hours Worked by Persons Engaged (US: AVHWPEUSA065NRUG, DE: AVHWPEDEA065NRUG)")

# 中国企业就业人员周平均工作时间 (国家统计局, 全年口径)
data["china_weekly_hours_trend"] = {
    "years": [2022, 2023, 2024, 2025],
    "weekly": [47.5, 48.6, 48.7, 48.6],
    "note": "全国企业就业人员周平均工作时间(小时)。2022-2024 为国家统计局月度数据年度均值(三个皮匠汇编); 2025 全年 48.6 见国家统计局 2026-01-19 新闻稿。据经济观察网, 2016-2024 年该指标呈持续上涨态势, 2025 年回落",
}

# 中国人均年工时长序列: Our World in Data (ILO/PWT 汇编)
cn_ann = {}
for r in csv.DictReader(open(os.path.join(RAW, "owid_annual_working_hours.csv"), encoding="utf-8")):
    if r["Code"] == "CHN" and r["Working hours per worker"]:
        cn_ann[r["Year"]] = round(float(r["Working hours per worker"]), 1)
data["china_annual_hours"] = {
    "series": cn_ann,
    "note": "Our World in Data: Working hours per worker (ILO/PWT 汇编口径), 与统计局企业周工时口径不同",
}
meta["sources"].append("Our World in Data grapher/annual-working-hours-per-worker (中国 1952-2023)")
meta["sources"].append("国家统计局 2026-01-19 新闻稿: 2025 年企业就业人员周平均工作时间 48.6 小时")

# ---------- 2. 分行业周工时三国对比 ----------
# 中国: 2020 年第七次人口普查长表 B0412a (城镇就业, 周平均 + 各时段人数分布)
cn_lines = open(os.path.join(RAW, "cn_census_2020_hours_industry.txt"), encoding="utf-8").read().splitlines()
cn_ind = {}
major = ["农、林、牧、渔业", "采矿业", "制造业", "电力、燃气及水的生产和供应业", "建筑业",
         "交通运输、仓储和邮政业", "批发和零售业", "住宿和餐饮业", "信息传输、计算机服务和软件业",
         "金融业", "租赁和商务服务业", "科学研究、技术服务和地质勘查业", "教育",
         "卫生、社会保障和社会福利业", "文化、体育和娱乐业", "公共管理和社会组织", "居民服务和其他服务业"]
seen = set()
for ln in cn_lines:
    for name in major:
        if ln.startswith(name + "\t") and name not in seen:
            parts = ln.split("\t")
            try:
                total = float(parts[1])
                over48 = float(parts[9]) + float(parts[10])  # 48h 及 48h以上两档
                weekly = float(parts[-1])
                cn_ind[name] = {"weekly": weekly, "over48pct": round(over48 / total * 100, 1),
                                "employed_wan": round(total / 10000, 1)}
                seen.add(name)
            except (ValueError, IndexError):
                pass
data["china_industry_hours"] = cn_ind
meta["sources"].append("第七次全国人口普查长表 4-12a: 分行业周平均工作时间及工时分布 (2020, 城镇)")

# 德国: Eurostat lfsa_ewhan2 (2025, 15-64 岁雇员, 周惯常工时)
de_rows = list(csv.reader(open(os.path.join(RAW, "eurostat_de_hours_industry.csv"), encoding="utf-8")))
de_ind = {}
for r in de_rows[1:]:
    m = re.search(r"'nace_r2': \{'code': '([^']+)', 'label': '([^']+)'", r[1])
    if m and r[2]:
        de_ind[m.group(2)] = round(float(r[2]), 1)
data["germany_industry_hours"] = de_ind
meta["sources"].append("Eurostat lfsa_ewhan2: 德国分行业周惯常工时 (2025)")

# 美国: FRED BLS CES 系列年均值
us_series = {
    "Mining & logging 采掘业": "CES1000000007",
    "Construction 建筑业": "CES2000000007",
    "Manufacturing 制造业": "AWHMAN",
    "Information 信息业": "CES5000000007",
    "Financial activities 金融业": "CES5500000007",
    "Professional & business 专业商务": "CES6000000007",
    "Leisure & hospitality 休闲住宿餐饮": "CES7000000007",
    "Total private 私营部门整体": "AWHAETP",
}
us_ind = {}
for label, sid in us_series.items():
    s = read_fred(sid)
    if 2024 in s:
        us_ind[label] = {"v2024": s[2024], "series": {str(y): v for y, v in s.items() if y >= 2000}}
data["us_industry_hours"] = us_ind
meta["sources"].append("FRED/BLS CES: 美国分行业周平均工时 (AWHAETP/AWHMAN/CES*7)")

# ---------- 3. 人生阶段参数 (入学->退休) ----------
data["life_course"] = {
    "school_entry_age": {"CN": 6, "US": 6, "DE": 6},
    "retirement_age": {
        "CN": {"value": 61, "note": "2025 年起渐进式延迟退休改革过渡均值: 男 60→63, 女干部 55→58, 女工人 50→55"},
        "US": {"value": 67, "note": "Social Security 完全退休年龄 (1960 年后出生)"},
        "DE": {"value": 67, "note": "法定退休年龄逐步升至 67 (1964 年后出生)"},
    },
    "school_weekly_hours": {
        "CN": {"primary": 34, "secondary": 48, "university": 30,
               "note": "中学含晚自习/作业, 依据 PISA 2018 中国学生周学习约 57 小时(含课外)下调至校内口径估计, 标注为估算"},
        "US": {"primary": 32, "secondary": 36, "university": 32, "note": "NCES/时间利用调查量级估计"},
        "DE": {"primary": 30, "secondary": 34, "university": 30, "note": "Destatis/欧盟学生调查量级估计"},
    },
}
meta["sources"].append("延迟退休: 全国人大常委会 2024-09 决定(2025 施行); 美/德法定退休年龄公开资料; 学习时长为标注估算值")

# ---------- 4. 期权/股权薪酬 ----------
data["equity_comp"] = {
    "prevalence": {
        "grant_full_value_awards_pct": 99,
        "grant_performance_awards_pct": 91,
        "grant_stock_options_sars_pct": 41,
        "options_trend": {"2021": 47, "2024": 41},
        "hightech_general_workforce_full_value_pct": 59,
        "nontech_general_workforce_full_value_pct": 11,
        "source": "Deloitte/NASPP 2024 Equity Incentives Design Survey",
    },
    "ceo_structure": [
        {"firm": "Apple", "industry": "科技", "equity_pct": 85, "ceo_pay_musd": 63.2},
        {"firm": "NVIDIA", "industry": "科技", "equity_pct": 90, "ceo_pay_musd": 34.2},
        {"firm": "JPMorgan", "industry": "金融", "equity_pct": 40, "ceo_pay_musd": 34.5},
        {"firm": "Goldman Sachs", "industry": "金融", "equity_pct": 32, "ceo_pay_musd": 35.8},
        {"firm": "BlackRock", "industry": "金融", "equity_pct": 55, "ceo_pay_musd": 28.4},
    ],
    "industry_model": [
        {"industry": "科技", "model": "股权主导", "equity_weight": 85, "cash_weight": 15,
         "note": "绑定长期创新, 技术岗价值可超 CEO (NVIDIA CTO≈CEO 84%)"},
        {"industry": "金融", "model": "现金奖金+递延", "equity_weight": 42, "cash_weight": 58,
         "note": "前台现金占比>60%, 交易部门奖金递延 5 年 50% (高盛)"},
        {"industry": "制造", "model": "均衡设计", "equity_weight": 50, "cash_weight": 50,
         "note": "生产岗薪酬不低于技术岗, 重视安全与成本 KPI"},
    ],
    "source": "Qian (2025) 基于 SEC 2024 高管薪酬披露的跨行业比较研究",
}
meta["sources"].append("Deloitte/NASPP 2024 股权激励设计调查; Qian 2025 跨行业高管薪酬比较")

# ---------- 5. 政策冲击 ----------
data["policy_shocks"] = [
    {"year": 2008.7, "country": "US", "name": "金融危机", "sector": "金融/建筑",
     "detail": "美国年工时从 2007 年 1828.8h 降至 2009 年约 1767h；金融业裁员数十万"},
    {"year": 2009.2, "country": "DE", "name": "短时工作制 Kurzarbeit", "sector": "制造业",
     "detail": "德国年工时 2008→2009 由 1446.9h 降至 1406.8h (-2.8%)，以工时代替裁员"},
    {"year": 2020.4, "country": "DE", "name": "疫情+短时工作", "sector": "全行业",
     "detail": "德国年工时 2020 年降至约 1332h 的历史低位"},
    {"year": 2020.4, "country": "US", "name": "疫情停摆", "sector": "休闲酒店业",
     "detail": "休闲酒店业周工时从 26.1h (2019) 骤降，就业大幅收缩后反弹"},
    {"year": 2020.8, "country": "CN", "name": "三道红线", "sector": "房地产/建筑",
     "detail": "房企融资收紧，行业进入下行通道；建筑业周工时仍高达 49.7h 但岗位收缩"},
    {"year": 2021.6, "country": "CN", "name": "双减", "sector": "教培",
     "detail": "K12 教培从业者超 1000 万，头部六家三年裁员超 80%；好未来 -83% (约 6 万人)，新东方 -47%"},
    {"year": 2021.0, "country": "CN", "name": "平台经济强监管", "sector": "互联网",
     "detail": "反垄断与数据监管周期开启，互联网招聘收缩，工时文化受审视"},
    {"year": 2025.0, "country": "CN", "name": "延迟退休+反内卷", "sector": "全社会",
     "detail": "2025 年起渐进式延迟法定退休年龄；2025 年企业周工时 48.6h 结束九年连涨"},
]

# ---------- 6. 专业热度 ----------
data["major_heat"] = {
    "CN_law_exam": {
        "years": [2002, 2003, 2010, 2013, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
        "applicants_wan": [36, 19.7, 39.5, 43, 48, 58.8, 64.9, 60.4, 60.66, 70.5, 71.89, 81.6, 86, 96, 93],
        "pass_rate_pct": [7.7, None, 22.0, 10.0, 10.0, 14.0, 16.0, 19.87, 21.2, 22.98, 23.51, 19.36, 17.79, 15.52, None],
        "note": "司法考试(2002-2017)/法考(2018起)报名人数(万)。2002 首届 36 万(汇集两届律考), 2003 19.7 万, 2010 39.5 万, 2013 43 万, 2015 48 万, 2016 58.8 万, 2017 64.9 万(收官, 财新); 2018-2024 六连增至 96 万峰值, 2025 首降。通过率为整体口径(含放宽地区), 2002-2017 为公开汇总量级",
        "source": "司法部/财新/南方周末/律法网历年汇总",
    },
    "CN_lawyers": {"years": [2018, 2024], "count_wan": [42.3, 83.0],
                   "note": "全国执业律师数量(万), 六年近翻倍; 每万人律师 5.76 (中国) vs 约 40 (美国)"},
    "CN_civil": {
        "events": [
            "2000-2012 大基建与地产黄金时代: 土木为「天选」专业, 录取分数居高不下",
            "2020 年以来建筑老八校录取位次普跌: 华南理工在河北 -7000 名, 西安建大 -10000+ 名",
            "同济在山东录取位次 -400+, 中国地质大学(北京) -5000 位次",
            "麦可思: 2019-2023 届毕业生从事建筑工程比例降幅为 46 个职业类别第一",
            "重庆大学房地产建筑就业占比 31.05% (2018) → 16% (2021)",
            "2024 河北考生 665 分'捡漏'清华土木类; 湖南大学土木转专业转出 98 人转入 0",
        ],
        "trend_index": {"years": [2000, 2004, 2008, 2012, 2016, 2018, 2020, 2022, 2024],
                        "index": [55, 78, 95, 100, 88, 75, 62, 48, 30],
                        "note": "基于基建地产周期/录取位次/就业占比综合归一化构建指数(标注为构建指数, 2012 峰值=100)"},
    },
    "CN_finance": {
        "events": [
            "2000 年代-2014: 金融业高速扩张, 财经院校录取线一度超过 985 高校",
            "中央财经大学 2024 上海投档位次下降 1200+ 名",
            "某知名财经院校 2024 在某高考大省最低位次跌幅超 64%",
            "券商基金降薪限薪周期: 2022 年起金融行业薪酬指引收紧",
        ],
        "trend_index": {"years": [2000, 2004, 2008, 2012, 2014, 2016, 2018, 2020, 2022, 2024],
                        "index": [42, 60, 82, 92, 100, 95, 82, 70, 55, 42],
                        "note": "财经类院校录取位次归一化构建指数(标注为构建指数, 2014 峰值=100)"},
    },
    "US_law_school": {
        "years": [2000, 2004, 2008, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
        "applicants": [74600, 100600, 83400, 59602, 55808, 54433, 54897, 55521, 59908, 61648, 62090, 70893, 62507, 61319, 64779, 76480],
        "note": "ABA 认证法学院申请人数。2000/2004/2008 为 Fall 入学班口径(LSAC Volume Summary, 2004 为历史峰值 10.06 万); 2013 起为 LSAC 入学年汇总口径; 2025 年 +18.1% 创周期新高",
        "source": "LSAC Admission Trends / ABA Profile of the Legal Profession",
    },
}
meta["sources"].append("司法部法考数据; LSAC 法学院申请趋势; 中国教育在线/麦可思/智联招聘 专业冷热报告")

# ---------- 7. 灵活就业 ----------
data["flexible_employment"] = {
    "CN_total_trend": {"years": [2020, 2021, 2023, 2024, 2025, 2026],
                       "count_yi": [1.7, 2.0, 2.3, 2.4, 2.8, 3.2],
                       "note": "2021 人社部 2 亿; 2024 统计局超 2.4 亿; 2025-2026 复旦/灵工打卡白皮书(2026 为预测)"},
    "CN_occupations_2025": [
        {"name": "家政服务员", "count_wan": 4680, "yoy": 4},
        {"name": "网约车司机", "count_wan": 3724, "yoy": -2},
        {"name": "货车司机", "count_wan": 1813, "yoy": -3},
        {"name": "网络主播", "count_wan": 1746, "yoy": -3},
        {"name": "外卖员", "count_wan": 1590, "yoy": 6},
    ],
    "CN_new_form": {"count_wan": 8400, "share_of_workers_pct": 21,
                    "note": "第九次全国职工队伍调查(2023): 新就业形态劳动者 8400 万, 占职工总数 21%"},
    "CN_social_security": {"pension_wan": 7057, "medical_wan": 6615.9,
                           "note": "截至 2024 年底灵活就业参加职工养老/医疗保险人数; 按 2 亿口径参保率不足 40%"},
    "US_gig": {"freelancers_mn": 59, "share_pct": 36, "year": 2020,
               "note": "Upwork Freelance Forward 口径: 约 5900 万人, 占劳动力 36%"},
    "DE_solo": {"solo_self_employed_mn": 4.1, "minijobs_mn": 7.0, "year": 2023,
                "note": "Destatis 个体自雇者约 410 万; Mini-job 约 700 万 (量级)"},
}
meta["sources"].append("国家统计局/人社部; 复旦&灵工打卡白皮书 2026; 中国新就业形态研究中心 2025 蓝领报告; Upwork; Destatis")

# ---------- 9. 中国不同学科工作时长(换算) ----------
data["china_discipline_hours"] = {
    "legal": {"std_week": 40, "std_year": 2000, "law_week_cap": 44, "overtime_cap_year": 2432,
              "note": "国务院规定职工每周工作 40h; 年标准工时=250 个工作日×8h=2000h; 劳动法月加班≤36h, 折算年合法上限约 2432h"},
    "items": [
        {"discipline": "金融 → 投行分析师", "weekly": 80, "range": [70, 90], "tier": "survey",
         "source": "投行岗位采集(47 个岗位): 73% 要求每周 70-90h, 平均约 80h"},
        {"discipline": "建筑/土木 → 建筑设计师", "weekly": 60, "range": [50, 70], "tier": "survey",
         "source": "媒体调查: 每周加班约 30h, 有设计小组周均 70h(单休 12h/天)"},
        {"discipline": "法学 → 律师", "weekly": 56, "range": [52, 60], "tier": "survey",
         "source": "行业调查: 初级律师约 52h/周, 中级 56h, 高级 60h"},
        {"discipline": "金融 → 金融从业者(整体)", "weekly": 56, "range": [46, 65], "tier": "survey",
         "source": "调查分布加权: 49.7% 每周 46-55h, 39.2% 55-65h, 11.1% >65h"},
        {"discipline": "计算机 → 互联网开发", "weekly": 55, "range": [50, 67], "tier": "survey",
         "source": "职级对标: 互联网公司普遍 >50h; 拼多多约 65h、得物约 67h, 外企约 40h"},
        {"discipline": "师范 → 中小学教师", "weekly": 53, "range": [52, 54], "tier": "survey",
         "source": "西南大学学报 2025 调查: 周均 52-54h; 国家社科课题: 绝大多数 >54h"},
        {"discipline": "医学 → 临床医师", "weekly": 51.05, "range": [48.24, 53.3], "tier": "survey",
         "source": "中国医师协会白皮书(2018): 三级 51.05h/二级 51.13h, 手术科室 53.3h"},
        {"discipline": "机械/工学 → 机械制造加工", "weekly": 49.31, "range": None, "tier": "census",
         "source": "第七次人口普查长表(2020, 城镇)"},
        {"discipline": "工商管理 → 单位负责人", "weekly": 47.28, "range": None, "tier": "census",
         "source": "第七次人口普查长表(2020, 城镇)"},
        {"discipline": "公共管理 → 办事人员", "weekly": 44.36, "range": None, "tier": "census",
         "source": "第七次人口普查长表(2020, 城镇)"},
        {"discipline": "卫生管理 → 卫生专业技术人员", "weekly": 44.41, "range": None, "tier": "census",
         "source": "第七次人口普查长表(2020, 城镇)"},
        {"discipline": "理学/通用 → 专业技术人员", "weekly": 43.43, "range": None, "tier": "census",
         "source": "第七次人口普查长表(2020, 城镇)"},
        {"discipline": "农学 → 农林牧渔生产人员", "weekly": 41.82, "range": None, "tier": "census",
         "source": "第七次人口普查长表(2020, 城镇)"},
    ],
    "note": "普查口径为 2020 年城镇就业人员周平均工时; 调查口径为各行业公开调研量级, 样本与年份各异, 仅作量级比较",
}
meta["sources"].append("中国医师协会白皮书 2018; 西南大学学报教师负担调查 2025; 职级对标/脉脉; 律师与投行行业调查; 七普长表分职业工时")

# ---------- 8. 劳动强度指数 (构建) ----------
# 强度指数 = 周平均工时 × (1 + 48h+ 占比/100) × 标准化
intensity = []
for name, v in cn_ind.items():
    idx = round(v["weekly"] * (1 + v["over48pct"] / 100) / 2, 1)  # 归一到 ~50 区间
    intensity.append({"industry": name, "weekly": v["weekly"], "over48pct": v["over48pct"],
                      "index": idx, "employed_wan": v["employed_wan"]})
intensity.sort(key=lambda x: -x["index"])
data["china_intensity"] = intensity

os.makedirs(os.path.dirname(OUT), exist_ok=True)
data["meta"] = meta
json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("written", OUT, os.path.getsize(OUT), "bytes")
print("cn industries:", len(cn_ind), "| de:", len(de_ind), "| us:", len(us_ind))
for r in intensity[:5]:
    print(r)
