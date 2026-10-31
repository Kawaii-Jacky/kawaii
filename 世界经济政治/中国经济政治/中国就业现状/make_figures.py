# -*- coding: utf-8 -*-
"""科研级复合图: 暖色纸感风格, 单图多维度"""
import json, os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
import matplotlib.font_manager as fm

ROOT = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(ROOT, "report", "assets", "data", "report_data.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "report", "assets", "img")
os.makedirs(OUT, exist_ok=True)

plt.rcParams.update({
    "font.family": ["Microsoft YaHei", "Noto Sans SC"],
    "axes.unicode_minus": False,
    "figure.facecolor": "#FAF3E7",
    "axes.facecolor": "#FDF8EF",
    "axes.edgecolor": "#D8C3A5",
    "axes.linewidth": 1.1,
    "axes.grid": True,
    "grid.color": "#E8DCC8",
    "grid.linewidth": 0.7,
    "text.color": "#5A4633",
    "axes.labelcolor": "#5A4633",
    "xtick.color": "#7A6450",
    "ytick.color": "#7A6450",
    "font.size": 10.5,
})
# 暖色主色板
TERRA = "#C96F4A"; AMBER = "#E2A93B"; SAGE = "#7D9B76"; PLUM = "#A5678E"
COFFEE = "#8C6A4F"; SKY = "#6E93A6"; ROSE = "#D98E7B"; OLIVE = "#B5A642"

def style_ax(ax, title, sub=None):
    for s in ["top", "right"]:
        ax.spines[s].set_visible(False)
    ax.set_title(title, fontsize=13, fontweight="bold", color="#4A3A28", loc="left", pad=24)
    if sub:
        ax.text(0, 1.012, sub, transform=ax.transAxes, fontsize=8.6, color="#9A8264", va="bottom")

# ============ 图一: 时间的地形 — 工时四维复合 ============
fig = plt.figure(figsize=(16, 11), dpi=200)
gs = fig.add_gridspec(2, 2, hspace=0.38, wspace=0.24, left=0.07, right=0.96, top=0.86, bottom=0.08)

# (a) 美德年工时 1970-2023 + 中国折算
ax = fig.add_subplot(gs[0, 0])
us = D["annual_hours"]["US"]; de = D["annual_hours"]["DE"]
yrs = sorted(int(y) for y in us if int(y) <= 2023)
ax.plot(yrs, [us[str(y)] for y in yrs], color=TERRA, lw=2.4, label="美国", zorder=3)
yrs_de = sorted(int(y) for y in de if int(y) <= 2023)
ax.plot(yrs_de, [de[str(y)] for y in yrs_de], color=SAGE, lw=2.4, label="德国", zorder=3)
cn_owid = D["china_annual_hours"]["series"]
cn_yrs_owid = sorted(int(y) for y in cn_owid if 1970 <= int(y) <= 2023)
ax.plot(cn_yrs_owid, [cn_owid[str(y)] for y in cn_yrs_owid], color=TERRA, lw=2.2, alpha=0.9,
        label="中国·人均年工时 (OWID/ILO)", zorder=3)
cn_yrs = D["china_weekly_hours_trend"]["years"]
cn_ann = [w * 52 for w in D["china_weekly_hours_trend"]["weekly"]]
ax.plot(cn_yrs, cn_ann, color=PLUM, lw=2.2, ls="--", marker="o", ms=5, label="中国·企业周工时×52 (统计局)", zorder=4)
for x, txt in [(2009, "金融危机/短时工作"), (2020, "疫情冲击")]:
    ax.axvline(x, color="#C9B59A", lw=1, ls=":")
    ax.annotate(txt, (x, 1240), fontsize=8.5, color="#9A8264", ha="center")
ax.annotate("德国 2020: ~1332h\n历史低位", xy=(2020, 1332), xytext=(2002, 1470),
            fontsize=8.5, color=SAGE, arrowprops=dict(arrowstyle="-", color=SAGE, lw=0.8))
ax.annotate("中国 2025: 48.6h/周\n结束九年连涨", xy=(2025, 48.6*52), xytext=(2008, 2630),
            fontsize=8.5, color="#B07E1E", arrowprops=dict(arrowstyle="-", color="#B07E1E", lw=0.8))
ax.set_ylabel("人均年实际工时 (小时)")
ax.set_ylim(1200, 2750)
ax.legend(frameon=False, fontsize=9, loc="lower left")
style_ax(ax, "A · 半个世纪的分岔：美德收敛，中国高位", "FRED/OECD; 国家统计局")

# (b) 中国分行业 工时×超时率×就业规模 气泡
ax = fig.add_subplot(gs[0, 1])
ci = D["china_intensity"]
xs = [r["weekly"] for r in ci]; ys = [r["over48pct"] for r in ci]
ss = [max(r["employed_wan"], 60) * 1.15 for r in ci]
colors = [TERRA if y > 60 else (AMBER if y > 45 else SAGE) for y in ys]
ax.scatter(xs, ys, s=ss, c=colors, alpha=0.72, edgecolors="#8A6B4F", linewidths=1.1, zorder=3)
labels = {"住宿和餐饮业": (0, 4), "建筑业": (0, 5), "制造业": (-6, -9), "批发和零售业": (4, -10),
          "金融业": (0, 5), "教育": (0, -10), "信息传输、计算机服务和软件业": (-40, 6),
          "交通运输、仓储和邮政业": (-70, 6), "公共管理和社会组织": (-30, -11),
          "采矿业": (4, 3), "居民服务和其他服务业": (-60, 7)}
for r in ci:
    n = r["industry"]
    if n in labels:
        dx, dy = labels[n]
        short = {"信息传输、计算机服务和软件业": "信息技术", "交通运输、仓储和邮政业": "交通运输",
                 "公共管理和社会组织": "公共管理", "居民服务和其他服务业": "居民服务"}.get(n, n)
        ax.annotate(short, (r["weekly"], r["over48pct"]), xytext=(r["weekly"] + dx/10, r["over48pct"] + dy/2.2),
                    fontsize=8.6, color="#5A4633")
ax.axhline(50, color="#C9B59A", ls="--", lw=1); ax.text(41.3, 51.2, "半数人周工作>48h", fontsize=8, color="#9A8264")
ax.axvline(44, color="#C9B59A", ls="--", lw=1); ax.text(44.1, 22, "法定周工时 44h", fontsize=8, color="#9A8264")
ax.set_xlim(41, 51.8); ax.set_ylim(15, 72)
ax.set_xlabel("周平均工时 (小时, 2020 人口普查)"); ax.set_ylabel("周工作 ≥48 小时者占比 (%)")
style_ax(ax, "B · 中国行业强度地形：工时 × 超时率 × 规模", "气泡面积=城镇就业规模；七普长表")

# (c) 三国可比行业工时对比
ax = fig.add_subplot(gs[1, 0])
pairs = [("制造业", "Manufacturing 制造业", "Manufacturing", "制造业"),
         ("建筑业", "Construction 建筑业", "Construction", "建筑业"),
         ("金融业", "Financial activities 金融业", "Financial and insurance activities", "金融业"),
         ("信息传输、计算机服务和软件业", "Information 信息业", "Information and communication", "信息技术"),
         ("住宿和餐饮业", "Leisure & hospitality 休闲住宿餐饮", "Accommodation and food service activities", "住宿餐饮")]
labels = [p[3] for p in pairs]
cn_v = [D["china_industry_hours"][p[0]]["weekly"] for p in pairs]
us_v = [D["us_industry_hours"][p[1]]["v2024"] for p in pairs]
de_v = [D["germany_industry_hours"][p[2]] for p in pairs]
x = np.arange(len(pairs)); w = 0.26
b1 = ax.bar(x - w, cn_v, w, color=TERRA, label="中国 (2020普查)", zorder=3)
b2 = ax.bar(x, us_v, w, color=AMBER, label="美国 (2024, BLS)", zorder=3)
b3 = ax.bar(x + w, de_v, w, color=SAGE, label="德国 (2025, Eurostat)", zorder=3)
for bs in (b1, b2, b3):
    for b in bs:
        ax.text(b.get_x() + b.get_width()/2, b.get_height() + 0.5, f"{b.get_height():.1f}",
                ha="center", fontsize=8.3, color="#7A6450")
ax.set_xticks(x); ax.set_xticklabels(labels, fontsize=9.5)
ax.set_ylabel("周平均工时 (小时)"); ax.set_ylim(0, 58)
ax.legend(frameon=False, fontsize=9)
style_ax(ax, "C · 同一行业，三种时间：三国可比行业工时", "口径: 中国普查周平均 / 美国全雇员周工时 / 德国雇员惯常周工时")

# (d) 灵活就业: 职业构成横向条 + 总规模趋势文本
ax = fig.add_subplot(gs[1, 1])
fe = D["flexible_employment"]
occ = fe["CN_occupations_2025"]
names = [o["name"] for o in occ][::-1]
cnt = [o["count_wan"] for o in occ][::-1]
yoy = [o["yoy"] for o in occ][::-1]
y = np.arange(len(occ))
bar_colors = [SAGE if v > 0 else ROSE for v in yoy]
ax.barh(y, cnt, 0.58, color=bar_colors, alpha=0.88, zorder=3, edgecolor="#8A6B4F", linewidth=0.6)
for yi, c, v, n in zip(y, cnt, yoy, names):
    sign = "+" if v > 0 else ""
    ax.text(c + 70, yi, f"{c}万  ({sign}{v}%)", va="center", fontsize=9, color="#5A4633")
ax.set_yticks(y); ax.set_yticklabels(names, fontsize=10)
ax.set_xlim(0, 5900)
ax.set_xlabel("2025 年从业人员规模 (万人)")
ax.text(0.985, 0.30,
        "灵活就业总规模：2020 年 1.7 亿 → 2021 年 2.0 亿(人社部)\n→ 2024 年超 2.4 亿(国家统计局) → 2025 年 2.8 亿\n→ 2026 年预计 3.2 亿，占总就业人口约 44%\n新就业形态劳动者 8400 万，占职工总数 21%\n职工养老保险覆盖 7057 万，参保率不足四成",
        transform=ax.transAxes, fontsize=9, color="#8A6B4F", va="top", ha="right",
        bbox=dict(boxstyle="round,pad=0.55", facecolor="#F5EAD6", edgecolor="#D8C3A5", linewidth=1))
style_ax(ax, "D · 灵活就业：从 2 亿到 3 亿的就业底座", "绿=规模扩张，红=收缩；复旦灵工白皮书/新就业形态研究中心/国家统计局")

fig.suptitle("时间的地形：美·德·中劳动市场四维透视", fontsize=20, fontweight="bold",
             color="#4A3A28", x=0.07, ha="left", y=0.955)
fig.text(0.07, 0.912, "劳动时间 · 劳动强度 · 就业形态 | 数据: FRED/OECD · Eurostat · 国家统计局 · 第七次人口普查 · 复旦灵工白皮书",
         fontsize=10.5, color="#9A8264")
fig.savefig(os.path.join(OUT, "fig1_time_terrain.png"), facecolor=fig.get_facecolor())
plt.close(fig)
print("fig1 done")

# ============ 图二: 热度与潮汐 — 专业周期×股权×政策 ============
fig = plt.figure(figsize=(16, 11), dpi=200)
gs = fig.add_gridspec(2, 2, hspace=0.42, wspace=0.24, left=0.07, right=0.96, top=0.86, bottom=0.08)

# (a) 中国三大专业热度构建指数 (2000 起)
ax = fig.add_subplot(gs[0, 0])
civ = D["major_heat"]["CN_civil"]["trend_index"]
fin = D["major_heat"]["CN_finance"]["trend_index"]
law_y = D["major_heat"]["CN_law_exam"]["years"]; law_a = D["major_heat"]["CN_law_exam"]["applicants_wan"]
law_idx = [a / max(law_a) * 100 for a in law_a]
ax.plot(civ["years"], civ["index"], "-o", color=COFFEE, lw=2.4, ms=5, label="土木 (构建指数, 2012 峰值=100)")
ax.plot(fin["years"], fin["index"], "-s", color=AMBER, lw=2.4, ms=5, label="金融 (构建指数, 2014 峰值=100)")
ax.plot(law_y, law_idx, "-^", color=SAGE, lw=2.4, ms=5, label="法学 (司考/法考报名, 2024 峰值=100)")
ax.annotate("土木: 大基建黄金时代见顶回落\n湖南大学转出98人/转入0", xy=(2024, 30), xytext=(2003.5, 26),
            fontsize=8.4, color=COFFEE, arrowprops=dict(arrowstyle="-", color=COFFEE, lw=0.8))
ax.annotate("法学: 2024 峰值 96 万报名\n通过率降至 15.5%", xy=(2024, 100), xytext=(2007, 108),
            fontsize=8.4, color="#5F7A58", arrowprops=dict(arrowstyle="-", color="#5F7A58", lw=0.8))
ax.set_ylabel("热度指数 (各自峰值=100)")
ax.set_ylim(0, 125)
ax.legend(frameon=False, fontsize=8.6, loc="center left")
style_ax(ax, "A · 中国专业热度的二十年河东：金融·土木退潮，法学升温", "指数基于录取位次/报名人数归一化构建(示意图)，2000 年起")

# (b) 法考: 报名 vs 通过率 (2002 起)
ax = fig.add_subplot(gs[0, 1])
law = D["major_heat"]["CN_law_exam"]
yrs_law = law["years"]
ax.bar(range(len(yrs_law)), law["applicants_wan"], 0.6, color=SAGE, alpha=0.85, zorder=3, label="报名人数 (万)")
ax.set_xticks(range(len(yrs_law)))
ax.set_xticklabels([str(y) for y in yrs_law], fontsize=8, rotation=45)
ax.set_ylabel("司考/法考报名人数 (万)", color="#5F7A58"); ax.set_ylim(0, 110)
ax2 = ax.twinx()
pr = [p if p is not None else np.nan for p in law["pass_rate_pct"]]
ax2.plot(range(len(yrs_law)), pr, "-o", color=TERRA, lw=2.2, ms=6, zorder=4, label="通过率 (%)")
ax2.set_ylabel("通过率 (%)", color=TERRA); ax2.set_ylim(0, 26)
ax2.tick_params(colors=TERRA); ax2.grid(False)
for s in ["top", "right"]: ax2.spines[s].set_visible(False)
ax2.annotate("2024: 15.5% 通过率\n法考时代最低", xy=(13, 15.52), xytext=(8.5, 5.5),
             fontsize=8.6, color=TERRA, arrowprops=dict(arrowstyle="-", color=TERRA, lw=0.8))
ax.annotate("2002 首届司考 36 万\n2003 回落 19.7 万", xy=(0, 36), xytext=(0.4, 88),
            fontsize=8.4, color="#5F7A58", arrowprops=dict(arrowstyle="-", color="#5F7A58", lw=0.8))
style_ax(ax, "B · 法学热二十三年：报名冲顶，筛选收紧", "司法部; 全国执业律师 42.3万(2018)→83万(2024)")

# (c) 美国法学院申请周期 (2000 起)
ax = fig.add_subplot(gs[1, 0])
ul = D["major_heat"]["US_law_school"]
ax.fill_between(ul["years"], ul["applicants"], color=SKY, alpha=0.28, zorder=2)
ax.plot(ul["years"], ul["applicants"], "-o", color=SKY, lw=2.4, ms=4.5, zorder=3)
ax.annotate("2004: 100,600 历史峰值\n(互联网泡沫后的繁荣)", xy=(2004, 100600), xytext=(2005.5, 95000),
            fontsize=8.4, color="#4A6B7E", arrowprops=dict(arrowstyle="-", color="#4A6B7E", lw=0.8))
ax.annotate("2013-2015: 谷底\n(金融危机后法律就业寒冬)", xy=(2015, 54433), xytext=(2009.8, 62000),
            fontsize=8.4, color="#4A6B7E", arrowprops=dict(arrowstyle="-", color="#4A6B7E", lw=0.8))
ax.annotate("2021: 70,893\n疫情申请潮", xy=(2021, 70893), xytext=(2016.2, 79000), fontsize=8.4, color="#4A6B7E",
            arrowprops=dict(arrowstyle="-", color="#4A6B7E", lw=0.8))
ax.annotate("2025: 76,480 (+18.1%)", xy=(2025, 76480), xytext=(2020.4, 70000), fontsize=8.4, color="#4A6B7E",
            arrowprops=dict(arrowstyle="-", color="#4A6B7E", lw=0.8))
ax.set_ylabel("ABA 法学院申请人数")
ax.set_ylim(40000, 108000)
style_ax(ax, "C · 美国法学热的周期律动 (2000 起)", "LSAC Admission Trends / ABA")

# (d) 股权薪酬结构
ax = fig.add_subplot(gs[1, 1])
models = D["equity_comp"]["industry_model"]
x = np.arange(len(models)); w = 0.5
eq = [m["equity_weight"] for m in models]; ca = [m["cash_weight"] for m in models]
ax.bar(x, eq, w, color=TERRA, label="股权/长期激励占比 (%)", zorder=3)
ax.bar(x, ca, w, bottom=eq, color="#EAD9B8", edgecolor="#D8C3A5", label="现金/短期占比 (%)", zorder=3)
for i, m in enumerate(models):
    ax.text(i, eq[i]/2, f"{eq[i]}%", ha="center", va="center", color="#FFF6E8", fontsize=11, fontweight="bold")
    ax.text(i, eq[i] + ca[i]/2, f"{ca[i]}%", ha="center", va="center", color="#8A6B4F", fontsize=10)
    ax.text(i, 106, m["model"], ha="center", fontsize=8.8, color="#7A6450")
ax.set_xticks(x); ax.set_xticklabels([m["industry"] for m in models], fontsize=11)
ax.set_ylim(0, 118); ax.set_ylabel("薪酬结构权重 (%)")
prev = D["equity_comp"]["prevalence"]
ax.text(0, -0.235, "Deloitte/NASPP 2024: 99% 公司授予全值股权，期权/SAR 降至 41% (2021 年 47%)；高科技公司向全员授股 59% vs 非科技 11%",
        transform=ax.transAxes, fontsize=8.8, color="#9A8264", va="top")
ax.legend(frameon=False, fontsize=9, loc="lower right")
style_ax(ax, "D · 期权的世界：三大行业薪酬结构范式", "科技=股权主导 · 金融=现金+递延 · 制造=均衡")

fig.suptitle("热度与潮汐：专业周期 · 股权文化 · 代际选择", fontsize=20, fontweight="bold",
             color="#4A3A28", x=0.07, ha="left", y=0.955)
fig.text(0.07, 0.912, "金融热 · 法学热 · 土木热 | 数据: 司法部 · LSAC · 中国教育在线 · Deloitte/NASPP · SEC 高管薪酬披露研究",
         fontsize=10.5, color="#9A8264")
fig.savefig(os.path.join(OUT, "fig2_heat_tides.png"), facecolor=fig.get_facecolor())
plt.close(fig)
print("fig2 done")
