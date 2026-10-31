# -*- coding: utf-8 -*-
"""汇总蒙特卡洛模型结果 + 外部调研数据 -> report_data.js"""
import json, math

SRC = json.load(open('phdmodel_src/results.json', encoding='utf-8'))

# ---------- 五轮专业热潮：独立重写的“报考热度—产能延迟”模拟 ----------
# 与原模型不同的三点结构：
#  1) 报考热度 H 对“适应性预期溢价”即时响应（文化惯性 θ 越小越滞后）；
#  2) 招生产能 E 以速率 cap 滞后 2 年追随报考热度（高校申报—审批周期）；
#  3) 毕业供给 S = E(t−4)，溢价 W = (D/S)^(1/ε)，ε 为需求工资弹性。
clip = lambda x,a,b: max(a,min(b,x))
def boom_sim(c):
    T, L = c['T'], c.get('L', 4)
    H, E, S, D, W, EW = [], [], [], [], [], []
    kappa_of = lambda t: c.get('kappa2') if (c.get('kappa2t') is not None and t >= c['kappa2t']) else c['kappa']
    for t in range(T):
        g = c['g']
        for sh in c.get('shocks', []):
            if t > sh['t']: g = sh.get('g2', g)
        d_t = 1 if t == 0 else D[-1] * (1 + g)
        for sh in c.get('shocks', []):
            if t == sh['t']: d_t *= (1 + sh['size'])
        D.append(d_t)
        S.append(E[t - L] if t >= L else c['S0'])
        W.append((D[t] / S[t]) ** (1 / c['eps']))
        EW.append(1.0 if t == 0 else EW[-1] + c['theta'] * (W[t] - EW[-1]))
        pol = sum(p['size'] for p in c.get('policies', []) if p['t0'] <= t < p['t1'])
        h_new = 1.0 if t == 0 else H[-1] * clip(1 + kappa_of(t) * (EW[t] - 1) + pol * 1.5, 0.65, 1.7)
        H.append(min(h_new, c.get('hCap', 5.0)))   # 生源与考场容量约束：热度软上限
        target = H[t - 2] if t >= 2 else H[0]
        E.append(c['S0'] if t == 0 else E[-1] + c['cap'] * (target - E[-1]))
    r = lambda a: [round(x, 4) for x in a]
    return {'H': r(H), 'E': r(E), 'S': r(S), 'D': r(D), 'W': r(W), 'Wh': r(EW)}

BOOM_PRESETS = {
  'law': {'label':'法学热（1999–2025）','y0':1999,'T':27,'g':0.045,'eps':1.2,'theta':0.22,'kappa':0.55,'cap':0.35,'S0':1.0,
          'kappa2':0.08,'kappa2t':13,
          'policies':[{'t0':0,'t1':6,'size':0.10}],
          'shocks':[],
          'note':'1999 扩招后法学院从约 200 所增至 600 余所；2012 年列入国家控制布点专业（图中 κ 在 2012 年骤降至 0.08）——入口被封，但存量过剩已然形成，法考报名仍在 2024 年冲到 96 万。'},
  'civil': {'label':'土木热（2003–2024）','y0':2003,'T':22,'g':0.075,'eps':1.1,'theta':0.30,'kappa':0.60,'cap':0.40,'S0':1.0,
          'policies':[{'t0':5,'t1':8,'size':0.06}],
          'shocks':[{'t':18,'size':-0.35,'g2':-0.08}],
          'note':'“四万亿”把招生推上顶峰；2021 三道红线需求 −35%，而供给是 4 年前的招生——同济土木河南投档位次一年暴跌 4.1 万名，正是这台延迟机器的定价时刻。'},
  'fin': {'label':'金融热（2008–2024）','y0':2008,'T':17,'g':0.065,'eps':1.0,'theta':0.32,'kappa':0.60,'cap':0.45,'S0':1.0,
          'policies':[{'t0':4,'t1':7,'size':0.05}],
          'shocks':[{'t':10,'size':-0.15,'g2':-0.01},{'t':14,'size':-0.10,'g2':-0.02}],
          'note':'2018 监管风暴与 2022 限薪令构成需求侧“双封顶”；两财一贸物理类录取位次 5 年跌出 1 万名开外——预期一旦反转，高 κ 让报考热度退得比涨时更快。'},
  'net': {'label':'互联网/计算机热（2012–2024）','y0':2012,'T':13,'g':0.11,'eps':0.9,'theta':0.40,'kappa':0.70,'cap':0.50,'S0':1.0,
          'policies':[{'t0':4,'t1':8,'size':0.10}],
          'shocks':[{'t':9,'size':-0.25,'g2':0.005}],
          'note':'大数据专业 2016–2020 备案增长约 200 倍；2021 反垄断需求 −25%，高 θ 使预期调整快、回调也快——这是五轮热潮中“刹车距离”最短的一轮。'},
  'ai': {'label':'AI 热（2017–2030·前瞻）','y0':2017,'T':14,'g':0.12,'eps':0.85,'theta':0.42,'kappa':0.75,'cap':0.55,'S0':1.0,
          'policies':[{'t0':1,'t1':4,'size':0.15},{'t0':8,'t1':11,'size':0.10}],
          'shocks':[{'t':11,'size':-0.20,'g2':0.02}],
          'note':'2019 年新增备案 180 所为首峰，“超常布局”为二次推力；2028 年 −20% 为情景假设（非预测）——2025 年 AI 求职人数 +39% vs 职位 +3%，正是蛛网前夜的张力。'},
}
cobweb_out = {k: dict(c, series=boom_sim(c)) for k, c in BOOM_PRESETS.items()}

# 数值谱半径：对我方状态方程做有限差分 Jacobian + 幂迭代（独立于原模型的解析式）
import numpy as np
def boom_rho(theta, kappa, eps=1.1, L=4):
    # 稳态附近线性化：状态 x = [e_t, e_{t-1}, e_{t-2}, e_{t-3}, h_t, h_{t-1}]
    # e = 招生产能, h = 报考热度；s = e(t-L), w = -(1/eps)·s 偏差, ew 预期
    def step(st, shock=0.0):
        e0, e1, e2, e3, h0, h1 = st
        s = e3  # t-L, L=4 → e_{t-4} 用 e3 代表上一状态的第4延迟
        w = -(1.0 / eps) * s + shock
        h_new = h0 + kappa * (theta * w)  # ∂H/∂EW·θ
        e_new = e0 + 0.45 * (h1 - e0)     # cap=0.45, 滞后2年用 h1 近似
        return np.array([e_new, e0, e1, e2, h_new, h0])
    n = 6
    J = np.zeros((n, n))
    base = np.zeros(n)
    for j in range(n):
        d = np.zeros(n); d[j] = 1e-6
        J[:, j] = (step(base + d) - step(base - d)) / 2e-6
    return float(max(abs(np.linalg.eigvals(J))))
THETAS = [0.05,0.1,0.2,0.3,0.4,0.5,0.6,0.8,1.0]
KAPPAS = [0.1,0.2,0.3,0.4,0.5,0.6,0.8,1.0,1.2]
RHO_GRID = [[round(boom_rho(t,k),3) for k in KAPPAS] for t in THETAS]
RHO_PRESETS = {k: round(boom_rho(c['theta'], c['kappa'], c['eps']),3) for k,c in BOOM_PRESETS.items()}

# ---------- 行业主数据 ----------
ind = {}
for k in SRC['keys']:
    v = SRC['ind'][k]
    ind[k] = {
        'name': v['name'], 'short': v['short'],
        'val': v['val'], 'ov': v['ov'],
        'hrs': v['hrs'], 'heff': v['heff'], 'inc': v['inc'],
        'cum': v['cum'], 'breakeven': v['breakeven'],
        'PI': v['PI'], 'DP': v['DP'], 'merton': v['merton'],
        'Mcond': v['Mcond'], 'psiStar': v['psiStar'], 'psiStarM': v['psiStarM'],
        'params': SRC['params']['IND'][k],
    }

# ---------- 外部调研数据（灵活就业 / 热专业 / 政策事件） ----------
external = {
  # AI 冲击 × 学历 × 调控（综合用户提供的研究材料：高盛、ICRIER、新加坡管理大学、麦可思等）
  'aiImpact': {
    # 四象限：暴露度(0-5) × 净效应(-2=被替代 ~ +2=互补增益)
    'quadrant': [
      {'name':'数学/统计*','x':4.3,'y':-0.9,'grp':'ref','note':'ICRIER 暴露度 3.86/5 居全职业之首；初级数据分析、基础建模岗被加速替代；博士以上与 AI 互补'},
      {'name':'AI 人工智能','x':4.0,'y':1.6,'grp':'model','note':'高暴露但强互补：大模型浪潮直接扩张人才需求，应届博士起薪 2.8 万/月'},
      {'name':'互联网','x':3.6,'y':-0.4,'grp':'model','note':'软件开发列入高盛高暴露行业且就业增长转负；20–30 岁科技从业者失业率 +3pp'},
      {'name':'金融','x':3.2,'y':-0.7,'grp':'model','note':'初级行研、柜面、标准报表被压缩；招行新招大学生 50% 以上为计算机/数学背景'},
      {'name':'电子电力','x':2.6,'y':1.1,'grp':'model','note':'芯片设计借 AI 提效，国产替代下人才争夺白热化，互补为主'},
      {'name':'能源动力*','x':2.0,'y':0.3,'grp':'ref','note':'替代监测与数据分析类任务；涡轮机械领域 AI“缺乏物理理解”；本质是门槛提升'},
      {'name':'生物','x':1.8,'y':0.6,'grp':'model','note':'湿实验与实体判断难自动化；AI 制药反向增加交叉人才需求'},
      {'name':'基础医学','x':1.6,'y':0.5,'grp':'model','note':'AI4S 推动科研范式变革，互补渐进'},
      {'name':'临床医学','x':1.2,'y':0.8,'grp':'model','note':'诊疗责任与实体操作不可替代；AI 限于影像、病历等辅助环节'},
    ],
    # 学历非对称：常规认知任务替代压力指数(0-100)，按 本科/硕士/博士
    'tierPressure': {
      '数学/统计*':[85,60,15],'互联网':[70,45,15],'金融':[65,45,15],
      '能源动力*':[60,35,12],'AI 人工智能':[55,35,10],'电子电力':[45,30,10],
      '生物':[40,35,20],'基础医学':[35,30,18],'临床医学':[20,15,8],
    },
    # 调控矩阵：-3 强收缩 ~ +3 强扶持
    'regulation': {
      'dims':['产业政策扶持','价格/薪酬管制','入口与资质管制','反垄断与用工规范','需求侧冲击'],
      'rows':['AI','互联网','金融','电子电力','生物','临床/基础医学','能源动力*','土木/地产*','教培*'],
      'vals':[
        [ 3, 0, 0,-1, 1],
        [ 0,-1,-1,-3,-2],
        [ 0,-3,-2,-1,-2],
        [ 3, 0,-1, 0, 1],
        [ 2,-2,-1, 0,-1],
        [ 0,-3,-2, 0,-2],
        [ 3, 0,-1, 0,-1],
        [ 0,-1,-1, 0,-3],
        [ 0,-3,-3,-1,-3],
      ],
      'notes':{
        'AI|产业政策扶持':'“人工智能+”行动与大模型浪潮：算法岗起薪跳涨',
        '互联网|反垄断与用工规范':'2020 反垄断启动：扩张转降本增效，校招连年压缩',
        '互联网|需求侧冲击':'高盛：软件开发等高暴露行业就业增长已转负',
        '金融|价格/薪酬管制':'2022 券商限薪令：递延+追索，人均百万时代终结',
        '金融|入口与资质管制':'牌照与执业资格壁垒；新招大学生过半为理工背景',
        '电子电力|产业政策扶持':'国产替代加码：IC 设计应届硕士起薪连年上行',
        '电子电力|入口与资质管制':'外部出口管制反向刺激自主培养',
        '生物|价格/薪酬管制':'集采常态化：中标药价平均降 52%，销售岗收缩',
        '生物|产业政策扶持':'创新药与生物医药列入战略性新兴产业',
        '临床/基础医学|价格/薪酬管制':'DRG/DIP 控费深化，薪酬与检查收入受限',
        '临床/基础医学|入口与资质管制':'规培制度：5+3+X，执业入口显著拉长',
        '能源动力*|产业政策扶持':'双碳战略：储能、氢能、热管理赛道扩张',
        '能源动力*|需求侧冲击':'火电存量收缩：央国企招聘转向“存量替换”',
        '土木/地产*|需求侧冲击':'三道红线后地产投资 2021 峰值回落，招聘 -29%',
        '教培*|价格/薪酬管制':'双减：学科类培训统登非营利，不得上市融资',
        '教培*|入口与资质管制':'不再审批新学科类机构，4 个月注销 21 万家',
        '教培*|需求侧冲击':'K9 业务清零，新东方裁员 6 万',
      },
    },
  },
  # 灵活就业：宏观规模
  'gigMacro': {
    'flexTotal': 2.4e8, 'flexTotalYear': 2024,
    'newFormWorkers': 8400,   # 万人, 第九次全国职工队伍调查
    'shareOfEmployees': 21,   # %
    'riderCerts': None,
    'wangyuecheLicenses': 748.3,  # 万本 2024.10
    'zhuboCount': 1508,  # 万, 2023.12
    'meituanRiders': 745,  # 万 2023 有接单收入
    'avgWeeklyHours': 48.6,  # 全国 2024H1
  },
  # 灵活就业：职业对比（来源：中国新就业形态研究中心、美团研究院、《网络主播新职业发展报告》）
  'gigJobs': [
    {'key':'rider','name':'外卖骑手','monthly':6803,'monthlyHigh':11014,'monthlyMid':7354,'monthlyLow':5556,
     'hoursDay':6.9,'hoursWeek':46.7,'satisf':None,'note':'旺季日均送单6.9h；高频骑手一线城市月入可达1.1万'},
    {'key':'driver','name':'网约车司机','monthly':7623,'monthlyHigh':11557,'hoursDay':10.0,'hoursWeek':60,
     'satisf':81.4,'note':'一线日均上线≥8h平均收入11557元；收入满意度81.4%居蓝领之首'},
    {'key':'truck','name':'货车司机','monthly':8424,'hoursDay':11.0,'hoursWeek':66,'satisf':21.95,
     'note':'收入居蓝领榜首但满意度仅21.95%：长途、事故风险、异地生活'},
    {'key':'zhubo','name':'网络主播','monthly':6709,'hoursDay':6.0,'hoursWeek':42,'satisf':None,
     'pyramid':[{'band':'<1000元','pct':36.9},{'band':'1000–3000元','pct':31.0},{'band':'3000–8000元','pct':18.4},{'band':'>8000元','pct':13.7}],
     'note':'收入金字塔极端陡峭：67.9%月入不足3000元'},
    {'key':'courier','name':'快递员','monthly':6200,'hoursDay':9.5,'hoursWeek':57,'satisf':None,'note':'蓝领均值6043元附近，旺季工时显著拉长'},
  ],
  # 灵活就业终身画像（按调研数据参数化的简化生命周期，用于与学历路线对比）
  'gigLife': {
    'ages': list(range(20, 61)),
    # 年收入（万元）轨迹：起薪 → 峰值 → 体力衰减
    'rider':  {'start':7.0,'peak':10.5,'peakAge':30,'decay':0.028,'hours':47,'endAge':55},
    'driver': {'start':8.0,'peak':11.5,'peakAge':38,'decay':0.015,'hours':60,'endAge':60},
    'truck':  {'start':8.5,'peak':12.0,'peakAge':35,'decay':0.022,'hours':66,'endAge':55},
    'zhubo_mean': {'start':4.0,'peak':8.0,'peakAge':26,'decay':0.08,'hours':42,'endAge':40},
    'zhubo_top':  {'start':8.0,'peak':60.0,'peakAge':28,'decay':0.10,'hours':50,'endAge':45},
  },
  # 金融热：两财一贸物理类最低录取位次（部分省代表性数据）
  'finBoom': {
    'cufo':  {'years':[2019,2023,2024],'rank':[5127,11370,13853]},   # 中央财经大学
    'uibe':  {'years':[2019,2023,2024],'rank':[5474,13448,15363]},   # 对外经贸大学
    'brokerPay': {'note':'2023年13家上市券商人均薪酬全部下降，头部无一超80万，“人均百万”时代终结'},
    'turning': '2017年底银监会监管风暴 / 2018金融政策调整 → 黄金时代结束；2019高考财经分数线首次大跌',
  },
  # 法学热：法考报名与通过
  'lawBoom': {
    'years':[2018,2019,2020,2021,2022,2023,2024,2025],
    'signup':[60.4,60.7,70.5,71.9,81.6,86.0,96.0,93.0],  # 万人
    'passRate':[None,None,None,19.36,None,17.79,15.52,None],
    'grant':[None,None,None,16.9,15.8,15.3,11.4,None],  # 万人获证
    'note':'报名6年连涨58.9%后2025首降；通过率三连降至15.52%；法学多年位列麦可思红牌专业',
  },
  # 土木热：同济土木河南录取
  'civilBoom': {
    'tongji': {'years':[2021,2022],'score':[667,564],'rank':[1730,43252]},
    'realestate': {'quitRate':28.8,'crisisPct':82.14,'jobPostDrop':-29},
    'note':'2022同济土木河南投档位次一年暴跌4.1万名；房地产投资2021峰值后持续下行',
  },
  # 考研热退潮
  'kaoyan': {'years':[2018,2019,2020,2021,2022,2023,2024,2025,2026],
             'signup':[238,290,341,377,457,474,438,388,343]},
  # 政策冲击事件时间线
  'policyEvents': [
    {'year':2018.9,'name':'“4+7”药品集采','field':'医药','impact':'中标药价平均降52%，医药代表与销售岗位收缩','dir':-1},
    {'year':2020.6,'name':'房企“三道红线”','field':'房地产/土木','impact':'融资端急刹车，地产链招聘2022年同比-29%','dir':-1},
    {'year':2020.9,'name':'互联网反垄断启动','field':'互联网','impact':'平台扩张转向降本增效，校招规模逐年压缩','dir':-1},
    {'year':2021.55,'name':'“双减”落地','field':'教培','impact':'新东方裁6万、高途裁1/3，4个月21万家教培企业注销','dir':-1},
    {'year':2022.4,'name':'券商限薪令','field':'金融','impact':'薪酬递延+追索扣回，人均百万年薪时代终结','dir':-1},
    {'year':2020.0,'name':'芯片国产替代加码','field':'电子电力','impact':'人才争夺白热化，IC设计应届硕士起薪连年上行','dir':1},
    {'year':2023.0,'name':'AI大模型浪潮','field':'AI','impact':'算法岗起薪跳涨，与传统互联网岗位走势分化','dir':1},
    {'year':2024.75,'name':'延迟退休立法','field':'全市场','impact':'2025起男63/女干部58/女工人55，职业生涯拉长3–5年','dir':0},
    {'year':2021.0,'name':'新就业形态权益保障意见','field':'灵活就业','impact':'职业伤害保障试点，平台用工从“裸奔”走向半正规化','dir':0},
  ],
  # 院校层次 × AI 非对称（2024 届口径，教育部 + 985/211 生源报告）
  'tierEdu': {
    'tiers':['清北+华五','其他 985','211/双一流学科','普通公办本科','民办本科','高职专科'],
    'grads':[10, 36, 87, 330, 110, 553],       # 年毕业生(万人, 含研究生; 合计≈1126万, 余为科研机构及成教)
    'pressure':[20, 30, 42, 62, 70, 45],        # AI 替代压力指数(0-100)
    'prestige':[98, 90, 75, 45, 30, 20],        # 信号认可度指数(0-100)
    'notes':[
      'A+ 学科密度最高；毕业生多进入非常规认知任务轨道，AI 以互补为主',
      '研究生占比超 50%；信号红利仍可对冲大部分替代压力',
      '行业特色校的 A 类学科（如两财一贸金融、邮电类计算机）认可度显著高于校牌本身——学科实力是独立于院校层级的第二维度',
      '常规认知任务最密集的人群：初级分析、报表、标准化文案——正是 AI 替代的第一排',
      '信号折价 + 任务可编码双重挤压；校招缓冲最薄',
      '实操与现场任务自动化难度高，替代压力中等；但薪资天花板与学历通胀传导是另一重压力',
    ],
    'source':'教育部 2024 届 1179 万；《全国 985/211 高校 2024 届毕业生源报告》(985 约46万、211非985约62万)；2023 届构成：专科553万/本科490万/硕93万/博9万；层次拆分为估算口径',
  },
}

# ---------- 灵活就业终身轨迹计算 ----------
def gig_traj(p):
    out = []
    for a in external['gigLife']['ages']:
        if a > p['endAge']:
            out.append(0); continue
        if a <= p['peakAge']:
            inc = p['start'] + (p['peak']-p['start']) * (a-20)/max(1,(p['peakAge']-20))
        else:
            inc = p['peak'] * ((1-p['decay'])**(a-p['peakAge']))
        out.append(round(inc,2))
    return out
gigTraj = {k: gig_traj(p) for k,p in external['gigLife'].items() if isinstance(p,dict) and 'start' in p}

data = {
  'ages': SRC['ages'], 'keys': SRC['keys'], 'ind': ind,
  'sens': SRC['sens'], 'scen': SRC['scen'],
  'acad': SRC['acad'],
  'cobweb': {'presets': cobweb_out, 'rho4': RHO_GRID,
             'thetas': THETAS, 'kappas': KAPPAS,
             'rhoPresets': RHO_PRESETS},
  'gigTraj': gigTraj, 'ext': external,
  'meta': SRC['meta'],
}

with open('report_data.js','w',encoding='utf-8') as f:
    f.write('window.REPORT_DATA = ')
    json.dump(data, f, ensure_ascii=False, separators=(',',':'))
    f.write(';\n')
print('bytes:', len(open('report_data.js','rb').read()))
print('gig rider traj:', gigTraj['rider'][:5], '...', gigTraj['rider'][-3:])
