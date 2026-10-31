// 数据精炼自 research/各国硕博研究生制度对比调研_2026-10.md 与 research/东亚五地研究生制度调研_2026-10.md（调研日期 2026-10-12）
// masters 字段、mastersDetail 与 mastersSpectrum 中少量硕士学制/学费为通行制度的常识性补充（英授课型 1 年、欧陆 120 ECTS、德法瑞典学费、中国学硕/专硕等），
// 未在调研文件中逐条核验，已在页面注明。

export type Identity = 'employee' | 'student' | 'dual' | 'disputed' | 'unknown'

export interface MastersDetail {
  entry: string
  duration: string
  graduation: string
  funding: string
  time: string
  law: string
}

export interface Country {
  id: string
  name: string
  short: string // 图鉴卡片简称
  region: string
  identity: Identity
  identityLabel: string
  spectrum: number // 0 = 完全雇员制, 100 = 完全学生制
  oneLiner: string
  masters: string // 硕士速览一句话
  mastersDetail: MastersDetail // 图鉴「硕士」Tab 六维
  entry: string
  graduation: string
  duration: string
  hours: string
  leave: string
  law: string
}

export const identityMeta: Record<Identity, { label: string; color: string }> = {
  employee: { label: '雇员制', color: '#6b7c4e' },
  dual: { label: '双重身份', color: '#8a6d3b' },
  disputed: { label: '争议/分流中', color: '#d9a441' },
  student: { label: '学生制', color: '#c4552d' },
  unknown: { label: '资料稀缺', color: '#8a7d6d' },
}

export const countries: Country[] = [
  {
    id: 'de', name: '德国', short: '德', region: '欧洲', identity: 'employee', identityLabel: '雇员（TV-L 合同）', spectrum: 8,
    oneLiner: '签 TV-L 劳动合同、常见 50–65% 职位，30 天带薪年假——但名义 3 年的合同很少装得下真实的博士。',
    masters: '硕士 2 年（120 ECTS）；申请制，部分经 uni-assist 平台；须毕业论文（Masterarbeit）。多数公立大学免学费。',
    mastersDetail: {
      entry: '申请制；部分项目经 uni-assist 平台集中审核（常识补充）',
      duration: '2 年（120 ECTS，博洛尼亚框架）',
      graduation: '毕业论文（Masterarbeit），部分专业附口试',
      funding: '多数公立大学免学费，仅收学期杂费（常识补充）',
      time: '无硕士生专门工时/休假调查；学生身份适用一般校历',
      law: '博洛尼亚框架、《高等教育框架法》、各州高校法',
    },
    entry: '无统考：个人导师制拿接收函，或申请结构化博士项目（Graduiertenkolleg）；原则上须硕士。',
    graduation: '论文＋口试/答辩（Disputation），程序由各系《博士条例》规定；发表无全国统一硬性要求。',
    duration: '合同名义 3 年；实际平均约 4.5 年（人文 5.1、工程 5.0、自然科学 4.3）。',
    hours: '雇员制，65%×38.5h≈25h/周最典型；Nature 2019：27% 每周 41–50h、25% 51–60h，加班普遍。',
    leave: 'TV-L 雇员 30 天带薪年假；病假 6 周全薪；育儿假依 BEEG。',
    law: '《高等教育框架法》、《科学时间合同法》（WissZeitVG：博士前+博后合计上限 12 年）、各州高校法。',
  },
  {
    id: 'uk', name: '英国', short: '英', region: '欧洲', identity: 'student', identityLabel: '学生（免税津贴）', spectrum: 62,
    oneLiner: '学生身份领免税津贴，实测每周 47 小时——折算时薪已低于最低工资线。',
    masters: '授课型硕士（MSc）通常 1 年、自费为主、无论文答辩要求；MRes/MPhil 研究型 1–2 年。本科 2:1 即可直申博士。',
    mastersDetail: {
      entry: '申请制；本科 2:1 学位即可',
      duration: '授课型通常 1 年；MRes/MPhil 1–2 年（常识补充）',
      graduation: '授课型以课程考核＋dissertation 项目为主，无论文答辩（viva）（常识补充）',
      funding: '授课型自费为主；研究型可申请 UKRI 体系资助',
      time: '无硕士生专门工时/休假调查；Student visa 学期内打工 ≤20h/周',
      law: 'QAA《UK Quality Code》质量框架',
    },
    entry: '申请制，本科 2:1 即可、硕士非强制；经 DTP/CDT 竞争获 UKRI 资助。',
    graduation: '论文（通常 6–10 万词上限）＋ viva voce 口试（外校考官主持）；无统一发表要求。',
    duration: '名义 3–3.5 年（CDT 4 年）；实际约 3.5–4 年。',
    hours: '期望全日制约 35h；HEPI 报告实测平均 47h/周；UKRI 最低津贴 2025/26 为 £20,780/年。',
    leave: 'UKRI 条款建议每年至少 30 天（含公共假日）；病假津贴最长 28 周。',
    law: 'UKRI Training Grant Terms & Conditions、QAA 质量框架、Student visa 学期内打工 ≤20h/周。',
  },
  {
    id: 'fr', name: '法国', short: '法', region: '欧洲', identity: 'employee', identityLabel: '雇员（contrat doctoral）', spectrum: 6,
    oneLiner: '博士合同是公共部门定期劳动合同：年工时 1607 小时、法定 5 周年假，写进法令。',
    masters: '国家硕士文凭 2 年（120 ECTS）；注册费低廉，非欧盟生差异化收费约 3,879€/年；博士须持国家硕士文凭。',
    mastersDetail: {
      entry: '申请制（硕士注册），须学士文凭',
      duration: '2 年（120 ECTS 国家硕士文凭）',
      graduation: '论文或实习报告＋答辩（依专业）',
      funding: '注册费低廉；非欧盟生差异化收费约 3,879€/年（常识补充）',
      time: '无硕士生专门工时/休假调查',
      law: '《研究法典》、2016 年 5 月 25 日法令（博士框架）',
    },
    entry: '须国家硕士文凭（2016 年法令第 11 条）；经博士学院录取且须落实 3 年经费。',
    graduation: '论文＋公开答辩（soutenance），评审团含校外 rapporteurs，导师不投票。',
    duration: '法令规定全日制 3 年，合同可延长两次各 1 年；社科实际常 4–5 年。',
    hours: '年工时 1607 小时（≈35h/周）；2024 年 9 月起最低毛薪 €2,300/月。',
    leave: '法定年假 5 周；病假 3 个月 90%＋9 个月 50%；产假可顺延合同。',
    law: '《研究法典》D412、2016 年 5 月 25 日博士培养法令、2009-464 号法令。',
  },
  {
    id: 'nl', name: '荷兰', short: '荷', region: '欧洲', identity: 'employee', identityLabel: '雇员（CAO-NU）', spectrum: 10,
    oneLiner: '博士是公开招聘的雇员职位，起薪 €3,059/月逐年递增——仍有 63% 的人超时工作。',
    masters: '硕士 2 年（120 ECTS，研究型硕士为主流博士前置）；申请制；非欧盟生学费显著高于欧盟生。',
    mastersDetail: {
      entry: '申请制（Studielink 集中注册，常识补充）',
      duration: '2 年（120 ECTS）',
      graduation: '毕业论文（thesis）',
      funding: '欧盟生学费较低；非欧盟生机构学费显著更高（常识补充）',
      time: '无硕士生专门工时/休假调查',
      law: '《高等教育与科研法》（WHW）',
    },
    entry: '博士为公开招聘的雇员职位（promovendus），须硕士，经 AcademicTransfer 等平台申请。',
    graduation: '论文集式 proefschrift（约 4 篇期刊文章）＋公开答辩（着礼服的传统仪式）。',
    duration: '合同名义 4 年（1.5 年 go/no-go＋2.5 年）；实际平均约 5 年。',
    hours: 'CAO-NU 全职 38h/周；PNN 2020：63% 超时、平均每周多 4.4 小时，47% 报告多种心理症状。',
    leave: '每年 232 小时带薪假（≈29 个工作日）＋8% 度假津贴；带薪产假 16 周。',
    law: '《荷兰大学集体劳动协议》（CAO-NU）、《高等教育与科研法》（WHW）。',
  },
  {
    id: 'se', name: '瑞典', short: '瑞典', region: '欧洲', identity: 'employee', identityLabel: '雇员（doktorandanställning）', spectrum: 5,
    oneLiner: '博士职位作为空缺岗位公开招聘，全薪＋社保，带薪年假按年龄给到 35 天。',
    masters: '硕士 2 年（120 ECTS）；申请制；欧盟/欧洲经济区学生免学费，申博须 240 ECTS（含硕士 60）。',
    mastersDetail: {
      entry: '申请制（全国统一申请平台，常识补充）',
      duration: '2 年（120 ECTS）',
      graduation: '学位论文（degree project）',
      funding: '欧盟/EEA 学生免学费；非欧盟生缴学费（常识补充）',
      time: '无硕士生专门工时/休假调查',
      law: '《高等教育条例》（SFS 1993:100）',
    },
    entry: '须硕士或 240 ECTS；博士职位公开招聘，无入学考试。',
    graduation: '论文（专著式或汇编式）＋公开答辩（设校外 opponent）；可中途取 licentiate（2 年）。',
    duration: '名义 4 年全职；教学、病假、育儿假均相应延长，实际常 4.5–5 年。',
    hours: '雇员制全薪（起薪约 SEK 30,700–33,000/月）；年度总工时 1700–1756h，无固定周工时。',
    leave: '带薪年假按年龄 28/31/35 天；育儿假 480 天体系，合同相应延长。',
    law: '《高等教育条例》（SFS 1993:100）第 5 章、高校集体协议、《工作环境法》。',
  },
  {
    id: 'ch', name: '瑞士', short: '瑞士', region: '欧洲', identity: 'dual', identityLabel: '雇员＋学生双重身份', spectrum: 22,
    oneLiner: 'SNSF 年薪 CHF 50,000–55,000 的「双重身份」：既是学生也是雇员，加班不补偿。',
    masters: '硕士约 2 年（90–120 ECTS）；申请制；学费相对低廉但生活成本高，博士普遍须相关硕士。',
    mastersDetail: {
      entry: '申请制，各校自主',
      duration: '约 2 年（90–120 ECTS，常识补充）',
      graduation: '硕士论文',
      funding: '学费相对低廉，生活成本高（常识补充）',
      time: '无硕士生专门工时/休假调查',
      law: '各州大学规程；博士层面 SNSF 资助条例',
    },
    entry: '普遍须相关硕士；ETH/EPFL 经博士项目委员会申请，州大学直接联系教授拿助理职位。',
    graduation: '论文＋口试；EPFL 另要求 12 ECTS 课程学分＋年度评审。',
    duration: '通常 4 年，较刚性；ETH 规定博士＋博后合计聘期最多 6 年。',
    hours: '100% 工作制弹性安排；EPFL 明示加班不补偿（trust-based）。',
    leave: '法定最低 4 周/年（OR 第 329a 条）；EPFL 25 天、ETH 5 周；产假 14 周 80% 薪。',
    law: 'SNSF 资助条例实施细则、《瑞士债务法》OR Art. 329a、ETH 科学雇员条例。',
  },
  {
    id: 'us', name: '美国', short: '美', region: '北美', identity: 'disputed', identityLabel: '学生；TA/RA 雇员化争议', spectrum: 55,
    oneLiner: '合同写着每周 20 小时，实验室里的真实时钟没有上限；休假靠工会一份一份谈出来。',
    masters: '硕士分 thesis（约 2 年，须论文）与 non-thesis（1–2 年，课程为主）两轨；申请制，GRE 日益可选。',
    mastersDetail: {
      entry: '申请制，GRE 日益可选',
      duration: '1–2 年（thesis 约 2 年，non-thesis 1–2 年）',
      graduation: 'thesis 轨须论文＋答辩；non-thesis 轨以课程/项目结业',
      funding: '硕士资助远少于博士，自费与贷款常见（常识补充）',
      time: '无硕士生专门调查；F-1 签证学期中校内打工 ≤20h/周',
      law: '无联邦统一硕士制度，各校规程；8 C.F.R. §214.2(f)',
    },
    entry: '申请制，本科可直博；录取与资助（TA/RA/fellowship）捆绑，GRE 日益可选。',
    graduation: '课程→资格考试→PhD candidate→论文＋公开答辩；发表无法定统一要求。',
    duration: 'NSF SED 2023：自博士入学起中位 5.7 年；自研究生院入学起约 7 年。',
    hours: 'TA/RA 合同通常 50% FTE≈20h/周；实际科研无合同约束，Nature 2022：43.1% 全球博士生周均 ≥50h。',
    leave: '无联邦法定年假；工会合同例：华大 ASE 每年 80h 带薪休假，UC 系统 12 个工作日 personal time off。',
    law: '2016 年 NLRB Columbia 案承认私立大学助教助研雇员身份；F-1 签证学期打工 ≤20h/周（8 C.F.R. §214.2(f)）。',
  },
  {
    id: 'ca', name: '加拿大', short: '加', region: '北美', identity: 'student', identityLabel: '学生（Tri-Agency 资助）', spectrum: 68,
    oneLiner: '设计 4 年的项目常常走到第 6、7 年；工时与休假都交给各校和工会合同。',
    masters: 'thesis 型硕士常 2–3 年、须论文；Tri-Agency 硕士奖学金 2024 年起 $27,000/年。多数博士项目偏好硕士后申博。',
    mastersDetail: {
      entry: '申请制；导师预先认可为实质门槛',
      duration: 'thesis 型常 2–3 年；course-based 更短（常识补充）',
      graduation: 'thesis 型须论文＋答辩；course-based 以课程结业',
      funding: 'Tri-Agency（CGS-M）硕士奖学金 $27,000/年（2024 harmonization）',
      time: '无全国硕士生工时调查',
      law: 'Tri-Agency TAGFA 拨款规范、各省大学法',
    },
    entry: '省级管辖、去中心化；多数项目偏好硕士后申博，导师预先认可为实质门槛。',
    graduation: '课程＋综合考试＋论文＋口头答辩（答辩委员会含校外考官）为常态。',
    duration: '设计 4 年完成，实际常 6–7 年；无全国官方完成年限统计。',
    hours: 'TA/RA 工时由各校/工会合同定，无全国标准；全国博士实际工时调查数据未找到。',
    leave: '无全国统一条款；UBC 研究生每年 3 周年假；Tri-Agency 持有人可享最长 12 个月带薪育儿假。',
    law: 'Tri-Agency TAGFA 拨款规范、《移民及难民保护条例》（IRPR）、各省大学法。',
  },
  {
    id: 'au', name: '澳大利亚', short: '澳', region: '大洋洲', identity: 'student', identityLabel: '学生（RTP 津贴）', spectrum: 48,
    oneLiner: 'RTP 条款把 20 个工作日带薪年假写进奖学金——学生制里少见的明白账；毕业通常没有答辩。',
    masters: '授课型硕士为主，通常 1.5–2 年、自费；研究型硕士（MPhil）可衔接博士，RTP 覆盖研究型学位。',
    mastersDetail: {
      entry: '申请制；研究型须先获导师同意',
      duration: '授课型通常 1.5–2 年；研究型约 2 年（常识补充）',
      graduation: '授课型无论文要求；研究型须论文（外审，通常无答辩）',
      funding: '授课型自费为主；RTP 奖学金覆盖研究型学位',
      time: '无硕士生工时调查；研究型硕博学生签证无打工时限',
      law: '《高等教育支持法 2003》（HESA）、RTP Guidelines',
    },
    entry: '要求荣誉学士（H1/H2A）或研究型硕士；>95% 项目须先获导师同意，再经 RTP 排名。',
    graduation: '里程碑制（12 个月 confirmation＋年度评审）；论文外审 2–3 名考官书面评审，通常无答辩。',
    duration: 'AQF 规定 3–4 年；惯例 3–3.5 年，实际多数约 4 年。',
    hours: '全日制预期 35–40h/周；研究型硕博学生签证无任何打工时限。',
    leave: 'RTP 条款：每年 20 个工作日带薪年假＋10 天带薪病假（可累积）＋12 周带薪产假。',
    law: '《高等教育支持法 2003》（HESA）、Commonwealth Scholarships Guidelines、ESOS 2000。',
  },
  {
    id: 'jp', name: '日本', short: '日', region: '东亚', identity: 'student', identityLabel: '学生（TA/RA 另算雇佣）', spectrum: 78,
    oneLiner: '「研究生」预科＋教授内诺进门；工学博士 3 年内修了的只有 45%，人文仅约 21%。',
    masters: '修士法定 2 年：30 学分＋修士论文审查；留学生常先以「研究生（预科）」身份入学再考正式课程。',
    mastersDetail: {
      entry: '「研究生（预科）」内诺＋各校自主入试（一般/留学生/社会人/AO）',
      duration: '法定 2 年（最长在学一般 4 年）',
      graduation: '在学 2 年＋30 学分＋修士论文审查及考试（优秀者 1 年可修了）',
      funding: '国公立学费标准相对统一（入学金＋授业料制，常识补充）',
      time: '全国生协调查：28.5% 院生有强制「コアタイム」，修士日均研究 7.8 小时',
      law: '《学校教育法》《学位规则》《大学院设置基准》',
    },
    entry: '独特的「研究生（けんきゅうせい）」预科：凭指导教授内诺＋教授会审核；正式入学为各校自主入试。',
    graduation: '修士 30 学分＋论文审查；博士后期 3 年在学＋论文审查及最终考试；另有「论文博士」制度。',
    duration: '法定修士 2 年＋博士 3 年；MEXT 数据：工学博士 3 年内修了仅 45%、人文约 21%，人文 7 年以上达 25–27%。',
    hours: '东大 2023 调查：研究约 33h/周；繁忙期 55% 理科院生日均在研究室 10 小时以上。',
    leave: 'TA/RA 适用《劳动基准法》比例付与年假；在籍研究生本人无法定休假，由指导教授决定。',
    law: '《学校教育法》《学位规则》《大学院设置基准》；2020 年起学位论文评价基准公布义务化。',
  },
  {
    id: 'kr', name: '韩国', short: '韩', region: '东亚', identity: 'disputed', identityLabel: '学生（劳动者性争议中）', spectrum: 82,
    oneLiner: '62% 研究生日均劳动超 10 小时、月薪 100–125 万韩元；「算不算劳动者」仍在法庭与国会之间拉锯。',
    masters: '硕士上课年限 2 年（在学上限 4–5 年）；书类审查＋口述入学；部分系所硕士也要求学会发表 1 件＋KCI 级论文 1 篇。',
    mastersDetail: {
      entry: '书类审查＋专业口述/面试两段制',
      duration: '上课年限 2 年；在学上限 4–5 年',
      graduation: '论文审查（3 名委员、2/3 赞成）＋综合考试；部分系所须学会发表 1 件＋KCI 级论文 1 篇',
      funding: '私立大学学费较高（常识补充）',
      time: '2019 六机构调查覆盖全院生：62% 日均劳动超 10 小时',
      law: '《高等教育法》及施行令',
    },
    entry: '无统考：「书类审查＋专业口述/面试」两段制；博士申请常须事先面谈确定指导教授。',
    graduation: '论文审查（博士 5 名委员、4/5 赞成）＋前置综合考试；理工科普遍硬性发表要求（如 SNU 博士须 SCI 1 篇）。',
    duration: '上课年限博士 2 年、在学上限 8 年；实际 4–6 年为常例。',
    hours: '2019 年六机构调查：62% 日均劳动超 10 小时、40% 反映研究外杂务过多；大学院生劳动组合争取周 52 小时适用。',
    leave: '无法定休假，29% 用不了正式休假；寒暑假实由指导教授裁量。',
    law: '《高等教育法》及施行令；专门《研究生权益保护法》仅有立法动向，未见通过。',
  },
  {
    id: 'sg', name: '新加坡', short: '新', region: '东南亚', identity: 'student', identityLabel: '学生（奖学金＋服务义务）', spectrum: 70,
    oneLiner: '两年内不过 QE 即终止学籍；补贴学费的国际生毕业后欠新加坡 3 年服务。',
    masters: '授课型硕士 1–1.5 年为主；研究型硕士最长 3 年（MOE 补贴上限），超期按全额学费缴费。均为申请制。',
    mastersDetail: {
      entry: '申请制，各自治大学自主审核',
      duration: '授课型 1–1.5 年（常识补充）；研究型最长 3 年（MOE 补贴上限）',
      graduation: '研究型须论文；授课型以课程结业',
      funding: 'MOE 学费补贴＋国际生 3 年 Service Obligation',
      time: '未找到官方硕士生工时/休假调查',
      law: 'MOE 补贴框架、六所自治大学规程',
    },
    entry: '纯申请制；PhD 需相关硕士或二级甲等荣誉学士（个案），奖学金随录取发放。',
    graduation: '两年内须通过博士资格考试 QE（不过即终止学籍或降硕士）；论文＋口试，发表要求各学院自定。',
    duration: '博士最长 5 年（MOE 补贴上限），典型 4 年；超期按全额学费缴费。',
    hours: '未找到官方工时调查；制度性负担为本地生每周 6 小时无酬助教、国际生须完成助教计划。',
    leave: '未找到可靠官方数据。',
    law: 'MOE 补贴＋3 年 Service Obligation（国际生毕业后须在新加坡注册公司工作 3 年）。',
  },
  {
    id: 'tw', name: '中国台湾', short: '台', region: '东亚', identity: 'disputed', identityLabel: '学生（助理学习/劳雇分流）', spectrum: 74,
    oneLiner: '把研究生助理分流为「学习型」与「劳雇型」——后者适用劳基法，前者的假期由导师决定。',
    masters: '硕士修业年限 1–4 年；「甄试入学」与「考试入学」双轨；学位论文须过线上抄袭侦测＋口试。',
    mastersDetail: {
      entry: '「甄试入学」（资料审查＋面试）与「考试入学」双轨',
      duration: '法定修业年限 1–4 年',
      graduation: '学位考试＝学位论文（须过线上抄袭侦测）＋口试',
      funding: '公立大学学费较低（常识补充）',
      time: '劳雇型助理适用《劳动基准法》；研究生本人无工时调查',
      law: '《学位授予法》《大学法》',
    },
    entry: '「甄试入学」（资料审查＋面试）与「考试入学」双轨；博士原则上需硕士，接受同等学力。',
    graduation: '《学位授予法》框架：资格考→论文计划口试→研究发表成果审定→学位论文口试；顶尖理工系所普遍要求 EI/SCI/SSCI 2–3 篇。',
    duration: '法定修业年限博士 2–7 年（在职可延至 9 年；孕产哺育可延 2 年）。',
    hours: '未找到官方研究生工时调查；劳雇型助理适用《劳动基准法》。',
    leave: '劳雇型助理有特休假并纳劳健保（2019 年起教学助理全面纳保）；研究生本人休假无统一规定。',
    law: '《学位授予法》《大学法》＋劳动部/教育部 2015 年助理分流指导原则。',
  },
  {
    id: 'hk', name: '中国香港', short: '港', region: '东亚', identity: 'student', identityLabel: '学生（PGS 津贴）', spectrum: 72,
    oneLiner: 'PGS 津贴以「协助教学与研究」为对价；工时与休假的官方调查都未找到。',
    masters: '授课型硕士多为 1 年；MPhil 标准修业期 2 年、须论文＋口试。本地全日制 UGC 资助研究型课程学生标准修业期免学费。',
    mastersDetail: {
      entry: '申请制，无统考；MPhil 须认可学士（荣誉不低于二级乙等）',
      duration: '授课型多为 1 年（常识补充）；MPhil 标准 2 年',
      graduation: 'MPhil：修完课程与研究计划＋论文＋口试',
      funding: '本地全日制 UGC 资助研究型课程学生标准修业期免学费',
      time: '未找到硕士生工时/休假调查',
      law: 'UGC 资助框架、各校研究生条例',
    },
    entry: '申请制，无统考；PhD 需研究型硕士或二级甲等荣誉以上学士（可本科直博）。',
    graduation: '课程＋论文＋口试；UGC/RGC 无统一发表要求，各学系自定。',
    duration: 'MPhil 标准 2 年；PhD 3 年（持研究型硕士）或 4 年（直博），标准修业期内发 PGS。',
    hours: '未找到官方工时调查；常规 PGS 约每月 19,100–19,660 港元，HKPFS 2026/27 月津贴 28,400–28,700 港元。',
    leave: '未找到可靠官方数据。',
    law: 'UGC 资助框架＋RGC 的 HKPFS 计划；本地生标准修业期学费豁免。',
  },
  {
    id: 'ru', name: '俄罗斯', short: '俄', region: '欧亚', identity: 'student', identityLabel: '学生（教育非劳动）', spectrum: 66,
    oneLiner: '副博士在法律上是「教育而非劳动」——没有工时概念，但每年 2 个月假期照发奖学金。',
    masters: '硕士 2 年；硕士/专家毕业后经高校或研究所自主入学考试（专业、外语、哲学）进入 аспирантура。',
    mastersDetail: {
      entry: '高校自主招生考试（常识补充）',
      duration: '2 年',
      graduation: '硕士论文答辩（依院校规程）',
      funding: '公费（бюджет）名额与自费并行（常识补充）',
      time: '「教育非劳动」定位，无法定工时概念',
      law: '《教育法》ФЗ-273',
    },
    entry: '硕士/专家毕业后经高校/研究所自主入学考试（专业、外语、哲学）进入 аспирантура。',
    graduation: '论文公开答辩＋ВАК 国家认证；发表硬性要求：人文社科 ≥3 篇、自然技术学科 ≥2 篇 ВАК 期刊。',
    duration: '副博士全日制 3 年（部分 4 年）；实际完成常 5–7 年。',
    hours: '法律定位是教育而非劳动，无法定工时；副博士可自由签订劳动合同另职。',
    leave: '全日制副博士每年 2 个月假期（照发奖学金）；函授副博士另享每年 30 天带薪学习假。',
    law: '《教育法》ФЗ-273、《科学与国家科技政策法》ФЗ-127、ВАК 学位认证体系。',
  },
  {
    id: 'kp', name: '朝鲜', short: '朝', region: '东亚', identity: 'unknown', identityLabel: '不明（资料稀缺）', spectrum: 92,
    oneLiner: '博士院 3 年 6 个月授副博士，其后以研究员身份积累成果——获博士者常年过 60 岁。',
    masters: '学位两级制中的第一级학사（硕士，即副博士）；「英才连读制」优秀生本科 4.5 年＋硕士 2 年连读；无公开招考。',
    mastersDetail: {
      entry: '选拔制，无公开招考；「英才连读制」2002 年引入',
      duration: '连读制硕士 2 年（本科 4.5 年＋硕士 2 年）',
      graduation: '资料稀缺',
      funding: '资料稀缺',
      time: '资料稀缺',
      law: '《教育法》《高等教育法》（2011）；内部细则不公开',
    },
    entry: '金日成综合大学博士院设全日制、在职与特别班；入博士院需研究实绩积累与官方许可，无公开招考。',
    graduation: '博士院修业 3 年 6 个月后授副博士；须自学通过 6 门考试、对外杂志发文 1 篇＋国内 2 篇；博士论文另需约 6 个月。',
    duration: '副博士课程 3.5 年；其后以研究员身份积累成果，获博士者常年过 60 岁。',
    hours: '未找到针对博士院生的调查；《社会主义劳动法》8 小时制对博士院生的适用性未证实。',
    leave: '劳动法年假 14 天（对博士院生适用性未证实）。',
    law: '《教育法》《高等教育法》（2011）等；内部细则不公开，主要来源为韩方二手研究。',
  },
  {
    id: 'in', name: '印度', short: '印', region: '南亚', identity: 'student', identityLabel: '学生（JRF 奖学金）', spectrum: 76,
    oneLiner: 'JRF 条款写着每年 30 天休假；IISc 的「打卡」政策却要求新生每周 ≥50 小时，引发全印抗议。',
    masters: '硕士 2 年；2024 年起 UGC-NET 成绩可直接用于博士录取；M.Phil 已依 NEP 2020 废止。',
    mastersDetail: {
      entry: '各校自主考试＋面试（常识补充）',
      duration: '2 年',
      graduation: '依校规（论文或课程结业）',
      funding: '公立大学学费低廉（常识补充）',
      time: '无硕士生工时/休假调查',
      law: 'NEP 2020（M.Phil 已废止）、UGC 规程',
    },
    entry: '依 UGC PhD Regulations 2022：硕士 ≥55% 或四年制本科 ≥75%；入学考试＋面试＋12 学分课程作业。',
    graduation: '2022 版规章取消全国强制发表要求（各校多在校规保留 1–2 篇 UGC-CARE）；查重＋两名外审＋viva。',
    duration: '全日制最短 3 年、最长 6 年（女性与残障可再延 2 年）；JRF 奖学金总期限 5 年。',
    hours: '无全国官方统计；学术小样本约 44.1h/周；2025 年 10 月 IISc 要求硕博新生 ≥50h/周、随导师达 70–80h，引发抗议。',
    leave: 'UGC-JRF 条款：每年 30 天休假（不含公共假日）；女性一次 240 天带薪产假。',
    law: 'UGC PhD Regulations 2022、UGC 学术诚信条例 2018、NEP 2020。',
  },
  {
    id: 'br', name: '巴西', short: '巴西', region: '拉美', identity: 'student', identityLabel: '学生（bolsista 非雇员）', spectrum: 80,
    oneLiner: '奖学金持有人法律上不是雇员、不受 CLT 保护——没有第 13 薪，也没有法定年假。',
    masters: 'CAPES 标准硕士 24 个月；各研究生院（PPG）自主招生（笔试＋外语＋研究计划＋Lattes 履历）；奖学金 R$2,100/月。',
    mastersDetail: {
      entry: '各 PPG 自主招生（笔试＋外语＋研究计划＋Lattes 履历＋面试）',
      duration: 'CAPES 标准 24 个月',
      graduation: '硕士论文＋公开答辩（各校规程）',
      funding: '公立大学免学费；CAPES/CNPq 硕士奖学金 R$2,100/月（2023 起）',
      time: '无全国硕士生工时调查；bolsista 无 CLT 保护',
      law: '《国民教育方针与基础法》LDB 9.394/1996、CAPES/CNPq Portaria',
    },
    entry: '无全国统一考试；各研究生院（PPG）自主招生（笔试＋外语＋研究计划＋Lattes 履历＋面试）。',
    graduation: '资格考＋公开答辩；PPG 通常要求 2 篇 Qualis A1–B1 期刊论文（评估驱动的惯例而非法定义务）。',
    duration: 'CAPES 标准博士 48 个月（可延至 60 个月）；2023 年起奖学金博士 R$3,100/月。',
    hours: '全职投入按 40h/周表述；bolsista 无 CLT 劳动法保护；未找到全国工时调查。',
    leave: '未找到 CAPES/CNPq 奖学金层面的法定年假条款——原则上全年投入（ANPG 2023 确认）。',
    law: '《国民教育方针与基础法》LDB 9.394/1996、CAPES/CNPq 各 Portaria、Qualis 分级体系。',
  },
  {
    id: 'cn', name: '中国大陆', short: '中', region: '东亚', identity: 'student', identityLabel: '学生', spectrum: 85,
    oneLiner: '每周工作超 60 小时的博士生占 47.85%——所查各国中的最高值；寒暑假由导师与课题组安排。',
    masters: '学术型硕士通常 3 年、专业型硕士 2–3 年；统考（初试＋复试）或推免入学；专硕重实践环节、学硕重学位论文。',
    mastersDetail: {
      entry: '全国统考（初试＋复试）或推免',
      duration: '学硕通常 3 年；专硕 2–3 年（常识补充）',
      graduation: '学位论文＋答辩；专硕重实践环节，《学位法》分类授予',
      funding: '学费较低；国家助学金＋学业奖学金＋「三助」体系',
      time: '无法定工时；寒暑假依校历、实由导师/课题组安排',
      law: '《中华人民共和国学位法》（2025 施行）',
    },
    entry: '硕士统考（初试＋复试）或推免；博士普通招考/「申请-考核」制。',
    graduation: '《学位法》（2025-01-01 施行）：博士学位须「做出创新性成果」、答辩委员会 2/3 票决；发表要求高校自定，教育部明令「破五唯」。',
    duration: '学制 4 年（直博 5 年）为主流；延毕率长期高企（2022 年累积口径 64.1%、应届口径 15.8%）。',
    hours: '无法定工时；Nature 2022 数据分析：周工作超 60 小时者占 47.85%，为所查各国最高。',
    leave: '无法定休假；寒暑假依校历、实由导师/课题组安排。',
    law: '《中华人民共和国学位法》（2025 施行）；国家助学金（博士 ≥15,000 元/年）＋「三助」岗位。',
  },
]

// —— 硕士学制光谱（名义学制区间，年）——
export interface MastersSpec {
  name: string
  min: number
  max: number
  label: string
  entry: string
  thesis: string
  fee: string
  note?: string
}

export const mastersSpectrum: MastersSpec[] = [
  { name: '英国', min: 1, max: 2, label: '1–2 年', entry: '申请制', thesis: '授课型无论文；MRes/MPhil 须研究论文', fee: '授课型自费为主', note: '授课型 MSc 通常 1 年' },
  { name: '美国', min: 1, max: 2, label: '1–2 年', entry: '申请制，GRE 日益可选', thesis: 'thesis（约 2 年）/ non-thesis 两轨', fee: '差异极大，硕士资助远少于博士' },
  { name: '中国香港', min: 1, max: 2, label: '1–2 年', entry: '申请制，无统考', thesis: 'MPhil 须论文＋口试', fee: '本地研究型标准修业期免学费', note: '授课型 1 年 / MPhil 2 年' },
  { name: '新加坡', min: 1, max: 3, label: '1–3 年', entry: '申请制', thesis: '研究型须论文', fee: 'MOE 补贴＋国际生 3 年服务义务', note: '授课型 1–1.5 年；研究型最长 3 年' },
  { name: '中国台湾', min: 1, max: 4, label: '1–4 年', entry: '甄试 / 考试双轨', thesis: '学位论文＋口试（须过抄袭侦测）', fee: '公立学费较低', note: '法定修业年限 1–4 年' },
  { name: '澳大利亚', min: 1.5, max: 2, label: '1.5–2 年', entry: '申请制', thesis: '授课型无论文；研究型须论文', fee: '授课型自费为主；RTP 覆盖研究型' },
  { name: '德国', min: 2, max: 2, label: '2 年', entry: '申请制，部分经 uni-assist', thesis: '毕业论文（Masterarbeit）', fee: '多数公立大学免学费', note: '120 ECTS' },
  { name: '法国', min: 2, max: 2, label: '2 年', entry: '申请制（硕士注册）', thesis: '论文/实习（依专业）', fee: '注册费低廉，非欧盟约 3,879€/年', note: '120 ECTS 国家硕士文凭' },
  { name: '荷兰', min: 2, max: 2, label: '2 年', entry: '申请制', thesis: '毕业论文', fee: '非欧盟生学费显著更高', note: '120 ECTS' },
  { name: '瑞典', min: 2, max: 2, label: '2 年', entry: '申请制', thesis: '学位论文', fee: '欧盟/EEA 学生免学费', note: '120 ECTS' },
  { name: '瑞士', min: 2, max: 2, label: '2 年', entry: '申请制', thesis: '硕士论文', fee: '学费较低，生活成本高', note: '90–120 ECTS' },
  { name: '日本', min: 2, max: 2, label: '2 年', entry: '「研究生」预科＋各校入试', thesis: '30 学分＋修士论文审查', fee: '国公立学费标准相对统一（未逐校核验）', note: '法定修业年限' },
  { name: '韩国', min: 2, max: 2, label: '2 年', entry: '书类审查＋口述', thesis: '论文＋综合考试；部分系所须发表', fee: '私立大学较高', note: '上课 2 年，在学上限 4–5 年' },
  { name: '俄罗斯', min: 2, max: 2, label: '2 年', entry: '高校自主招生考试', thesis: '论文答辩（依院校规程）', fee: '公费名额与自费并行' },
  { name: '朝鲜', min: 2, max: 2, label: '2 年', entry: '选拔制，无公开招考', thesis: '资料稀缺', fee: '资料稀缺', note: '「英才连读制」本科 4.5 年＋硕士 2 年' },
  { name: '印度', min: 2, max: 2, label: '2 年', entry: '各校自主考试＋面试', thesis: '依校规', fee: '公立大学低廉', note: 'M.Phil 已依 NEP 2020 废止' },
  { name: '巴西', min: 2, max: 2, label: '24 个月', entry: '各 PPG 自主招生', thesis: '硕士论文＋答辩', fee: 'CAPES 奖学金 R$2,100/月', note: 'CAPES 标准 24 个月' },
  { name: '加拿大', min: 2, max: 3, label: '2–3 年', entry: '申请制，导师预先认可', thesis: 'thesis 型须论文', fee: 'Tri-Agency 硕士奖学金 $27,000/年' },
  { name: '中国大陆', min: 2, max: 3, label: '2–3 年', entry: '统考（初试＋复试）或推免', thesis: '学位论文＋答辩；专硕重实践', fee: '学费较低，奖助体系覆盖广', note: '学硕通常 3 年 / 专硕 2–3 年' },
]

// —— 博士学制哑铃图：名义 → 实际（年）——
export interface DurationPair {
  name: string
  nominal: number
  actual: number
  note?: string
}
export const durationPairs: DurationPair[] = [
  { name: '德国', nominal: 3, actual: 4.5 },
  { name: '英国', nominal: 3.25, actual: 3.75 },
  { name: '法国', nominal: 3, actual: 4.5, note: '社科常 4–5 年' },
  { name: '荷兰', nominal: 4, actual: 5 },
  { name: '瑞典', nominal: 4, actual: 4.75 },
  { name: '瑞士', nominal: 4, actual: 4, note: '较刚性' },
  { name: '美国', nominal: 5, actual: 5.7, note: '名义 4–6，中位 5.7' },
  { name: '加拿大', nominal: 4, actual: 6.5, note: '实际常 6–7 年' },
  { name: '澳大利亚', nominal: 3.25, actual: 4 },
  { name: '日本', nominal: 3, actual: 5, note: '工学 3 年修了率仅 45%、人文 21%' },
  { name: '韩国', nominal: 2, actual: 5, note: '上课 2 年，实际 4–6 年' },
  { name: '俄罗斯', nominal: 3.5, actual: 6, note: '常 5–7 年' },
  { name: '中国大陆', nominal: 4, actual: 5.5, note: '直博 5 年；常例 5–6 年中点（推算）' },
]

// —— 工时横向条形图（周工时，口径见注）——
export interface HoursBar {
  name: string
  hours: number
  basis: string
  highlight?: boolean
}
export const hoursBars: HoursBar[] = [
  { name: '中国大陆', hours: 60, basis: '47.85% 的人 >60h（Nature 2022）', highlight: true },
  { name: '韩国', hours: 55, basis: '62% 日均 >10h，按 5.5 日推算', highlight: true },
  { name: '印度（IISc 要求）', hours: 50, basis: '新生 ≥50h/周，随导师达 70–80h', highlight: true },
  { name: '美国（实际）', hours: 50, basis: '43.1% 全球博士生 ≥50h（Nature 2022）' },
  { name: '英国', hours: 47, basis: 'HEPI 报告实测平均' },
  { name: '印度（小样本）', hours: 44.1, basis: '学术小样本 50 人' },
  { name: '荷兰', hours: 42.4, basis: '名义 38h＋平均超时 4.4h' },
  { name: '瑞典', hours: 40, basis: '年度总工时 1700–1756h 折算' },
  { name: '法国', hours: 35, basis: '法定年工时 1607h' },
  { name: '日本', hours: 33, basis: '东大 2023：研究时间约 33h/周' },
  { name: '德国（合同）', hours: 25, basis: '65% 职位 × 38.5h，实际加班普遍' },
]

// —— 休假阶梯 ——
export interface LeaveTier {
  level: string
  title: string
  range: string
  color: string
  items: { name: string; detail: string }[]
}
export const leaveTiers: LeaveTier[] = [
  {
    level: '第一级', title: '法定带薪年假', range: '25–35 天', color: '#6b7c4e',
    items: [
      { name: '德国', detail: 'TV-L 雇员 30 天' },
      { name: '法国', detail: '法定 5 周（25 个工作日+）' },
      { name: '荷兰', detail: '232 小时 ≈ 29 个工作日' },
      { name: '瑞典', detail: '按年龄 28/31/35 天' },
      { name: '瑞士', detail: '法定 ≥4 周；EPFL 25 天、ETH 5 周' },
    ],
  },
  {
    level: '第二级', title: '资助条款保障', range: '20–30 天', color: '#d9a441',
    items: [
      { name: '澳大利亚', detail: 'RTP：20 个工作日＋10 天病假' },
      { name: '英国', detail: 'UKRI 建议 ≥30 天（含公共假日）' },
      { name: '印度', detail: 'UGC-JRF：每年 30 天' },
      { name: '俄罗斯', detail: '全日制副博士每年 2 个月假期' },
    ],
  },
  {
    level: '第三级', title: '工会合同谈判', range: '10–15 天', color: '#c4552d',
    items: [
      { name: '美国', detail: '华大 ASE 80h/年；UC 系统 12 个工作日' },
      { name: '加拿大', detail: 'UBC 每年 3 周；无全国标准' },
    ],
  },
  {
    level: '第四级', title: '无规定 · 导师裁量', range: '0 — 看运气', color: '#8a7d6d',
    items: [
      { name: '日本', detail: '在籍研究生无法定休假' },
      { name: '韩国', detail: '29% 用不了正式休假' },
      { name: '中国台湾', detail: '研究生本人无统一规定' },
      { name: '中国香港', detail: '未找到可靠数据' },
      { name: '新加坡', detail: '未找到可靠数据' },
      { name: '巴西', detail: '奖学金层面无法定年假' },
      { name: '中国大陆', detail: '寒暑假由导师/课题组安排' },
      { name: '朝鲜', detail: '年假 14 天适用性未证实' },
    ],
  },
]

// —— 法律长廊 ——
export interface LawEvent {
  year: number
  title: string
  place: string
  detail: string
}
export const lawEvents: LawEvent[] = [
  { year: 1997, title: '《里斯本承认公约》', place: '欧洲理事会 / UNESCO', detail: '学历与学位跨国互认（ETS No.165），欧洲资格流动的地基。' },
  { year: 1999, title: '《博洛尼亚宣言》', place: '欧洲 29 国发起', detail: '确立学士–硕士–博士三级学位结构，博士成为「第三级」。' },
  { year: 2007, title: 'WissZeitVG', place: '德国', detail: '《科学时间合同法》：博士前＋博后科研聘期合计上限 12 年。' },
  { year: 2016, title: '博士培养国家法令', place: '法国', detail: '5 月 25 日法令：3 年学制、经费门槛、答辩规则全国框架。' },
  { year: 2016, title: 'NLRB Columbia 案', place: '美国', detail: '私立大学助教助研被认定为 NLRA 下的雇员，获得工会化权利。' },
  { year: 2022, title: 'UGC PhD Regulations', place: '印度', detail: '全国博士最低标准；废除强制发表要求以遏制灌水期刊。' },
  { year: 2025, title: '《中华人民共和国学位法》', place: '中国', detail: '1 月 1 日施行：学术/专业分类授予、学术复核与学位撤销程序。' },
]

// —— 数据缺口 ——
export const dataGaps: string[] = [
  '日本、韩国、中国台湾研究生本人（非雇员身份）的法定休假规定——「无此制度」即为现状',
  '韩国专门《研究生权益保护法》是否已通过——仅有立法动向与工会运动',
  '新加坡、中国香港、中国台湾、加拿大、巴西的官方研究生周工时调查',
  '瑞典、加拿大、澳大利亚的官方实际平均完成年限（只有定性或二手数据）',
  '朝鲜博士院生的工时、休假适用，以及朝俄/朝中教育交流条约文本',
  '俄罗斯副博士周工时调查（其「教育非劳动」定位本身即是答案的一部分）',
  '全球范围内几乎没有针对硕士生（非博士）的工时与休假专项调查——硕士篇的相关栏目以制度线索代替统计',
]


// —— 各国逐年毕业曲线探索器 ——
// points 为「累计毕业比例」锚点（%，阶梯插值：两点之间取左侧点的值）；
// 各国口径不一（修了者分布 / 入学队列 / 毕业队列），逐国见 basis，不作跨国精确比较。
export interface GradPoint {
  year: number
  cum: number
  tag?: string // 该锚点的口径小注
}
export interface GradCurveData {
  id: string
  name: string
  noCurve?: boolean // 无公开逐年分布：只画锚点说明与制度竖线
  points: GradPoint[]
  tail?: string // 阶梯线末端之后的尾注（如「其后 13.8%」）
  nominal: number | null
  nominalLabel: string
  cap: number | null
  capLabel: string
  source: string
  basis: string
  anchors?: string[] // noCurve 时的已知锚点
}

export const gradCurves: GradCurveData[] = [
  {
    id: 'jp', name: '日本',
    points: [
      { year: 3, cum: 40.0 },
      { year: 4, cum: 67.6 },
      { year: 5, cum: 77.5 },
      { year: 6, cum: 86.2 },
    ],
    tail: '其后 13.8% 于第 6 年后陆续修了',
    nominal: 3, nominalLabel: '名义 3 年',
    cap: 6, capLabel: '校规常见上限 5–6 年',
    source: '文科省《学校基本调查》2022 届博士修了者 10,413 人 · 修了年限分布',
    basis: '口径：修了者（已完成者）的年限分布，非入学队列生存率——分母不含中途退学者，曲线必然抵达 100%。',
  },
  {
    id: 'cn', name: '中国大陆',
    points: [
      { year: 4, cum: 60.3, tag: '按期（延期率 39.68%）' },
      { year: 4.5, cum: 65.5, tag: '延期者中 +0.5 年占 13.0%' },
      { year: 5, cum: 79.4, tag: '+1 年占 48.2%' },
      { year: 6, cum: 87.0, tag: '+2 年占 19.1%' },
    ],
    tail: '延期 +2 年以上者占 12.5%，毕业时间分散于第 6 年后',
    nominal: 4, nominalLabel: '学制 4 年（直博 5 年）',
    cap: 8, capLabel: '最长 6–8 年（各校自定）',
    source: '2017 全国博士离校调查（延期率 39.68%＋延期年限分布）',
    basis: '口径：曲线由「按期 60.32%＋延期者年限分布（+0.5 年 13.0% / +1 年 48.2% / +2 年 19.1% / +2 年以上 12.5%）」推算的累计值，非直接队列统计；另据调查 2022–24 平均修业 4.52–4.59 年。',
  },
  {
    id: 'uk', name: '英国',
    points: [
      { year: 5, cum: 57 },
      { year: 7, cum: 71 },
    ],
    nominal: 3.5, nominalLabel: '名义 3–3.5 年',
    cap: 4, capLabel: '典型最长注册 4 年（含写作期，可申延）',
    source: 'HEFCE 全日制博士队列',
    basis: '口径：全日制入学队列完成率；UKRI 资助者约 75% 在 4 年内「提交」论文——提交 ≠ 答辩通过，未并入曲线。',
  },
  {
    id: 'fr', name: '法国',
    points: [{ year: 3.33, cum: 38, tag: '38% 在 40 个月内答辩' }],
    nominal: 3, nominalLabel: '法令名义 3 年',
    cap: 6, capLabel: '非全职法令上限 6 年＋可逐年申延',
    source: '法国高教部统计（答辩时间分布）',
    basis: '口径：答辩时间分布锚点；人文社科约 70% 超过 52 个月（4.3 年）才答辩。',
  },
  {
    id: 'nl', name: '荷兰',
    points: [
      { year: 5, cum: 40 },
      { year: 9, cum: 77 },
    ],
    nominal: 4, nominalLabel: '合同名义 4 年',
    cap: null, capLabel: '学籍无法定上限',
    source: '荷兰博士队列统计 / PNN 调查',
    basis: '口径：PNN 调查 5 年内仅约 40% 完成、平均 5 年；9 年累计约 77%。',
  },
  {
    id: 'se', name: '瑞典',
    points: [
      { year: 5, cum: 45 },
      { year: 8, cum: 73 },
    ],
    nominal: 4, nominalLabel: '名义 4 年',
    cap: 8, capLabel: 'HEO 5:7：雇佣 4 个全职当量年 / 日历 8 年',
    source: 'UKÄ（瑞典高教署）2012 入学队列',
    basis: '口径：入学队列博士学位完成率；另有 7% 以 licentiate（副博士）结业，未计入。',
  },
  {
    id: 'ch', name: '瑞士',
    points: [{ year: 9, cum: 74 }],
    nominal: 4, nominalLabel: '名义 4 年',
    cap: null, capLabel: '无国家法定上限（SNSF 资助雇佣上限 4 年）',
    source: 'OFS（联邦统计局）2003 入学队列',
    basis: '口径：入学队列 9 年累计完成率；分学科差异巨大——ETH 88%、人文社科 55%。',
  },
  {
    id: 'us', name: '美国',
    points: [
      { year: 5.7, cum: 50, tag: '完成年限中位 5.7 年' },
      { year: 10, cum: 57, tag: '10 年累计完成率 57%' },
    ],
    nominal: null, nominalLabel: '无统一名义学制（常见 4–6 年）',
    cap: 10, capLabel: '校规常见 5–10 年（斯坦福 candidacy 5 年、密歇根入学起 7+2 年）',
    source: 'NSF SED（中位）/ CGS 十年队列',
    basis: '口径：两锚点来自不同统计——SED 为完成者中位年限（自博士入学起），CGS 为入学队列 10 年累计完成率，仅作锚点并列。',
  },
  {
    id: 'au', name: '澳大利亚',
    points: [
      { year: 4, cum: 14.6, tag: 'ACGR 2017 队列 4 年累计 14.6%' },
      { year: 4.9, cum: 50, tag: '毕业队列中位 4.8–5.0 年' },
    ],
    nominal: 3.5, nominalLabel: '名义 3–3.5 年',
    cap: 4, capLabel: 'RTP 资助上限 4 年（FTE，非学籍上限）',
    source: 'ACGR 2017 入学队列 / Torka 2020 毕业队列',
    basis: '口径：两锚点不同源——ACGR 为入学队列（分母含退学），中位数为毕业队列（只含完成者）；Torka 2020：≤4 年完成仅 23–25%。',
  },
  {
    id: 'ca', name: '加拿大', noCurve: true,
    points: [],
    nominal: 4, nominalLabel: '设计 4 年',
    cap: 10, capLabel: '多大上限 6 年＋可延至 10、UBC 上限 6 年',
    source: 'U-15 2013 队列',
    basis: '无公开逐年分布；实际常走到 6–7 年。',
    anchors: ['U-15 2013 队列：9 年内完成率——健康科学 78%、人文 56%'],
  },
  {
    id: 'kr', name: '韩国', noCurve: true,
    points: [],
    nominal: 2, nominalLabel: '名义 2 年（仅上课年限）',
    cap: 8, capLabel: '在学上限 8 年（校规）',
    source: 'STEPI 统计 / 各校校规',
    basis: '无公开逐年分布。',
    anchors: ['实际 4–6 年为常例', 'STEPI：理工博士自本科入学到获位平均约 148 个月'],
  },
  {
    id: 'hk', name: '中国香港', noCurve: true,
    points: [],
    nominal: 3.5, nominalLabel: 'PhD 3 年（研究型硕士前置）/ 4 年（直博）',
    cap: 8, capLabel: 'HKUST 上限 8 年',
    source: '各校校规',
    basis: '无公开逐年分布。',
    anchors: ['标准修业期内发 PGS 津贴', 'HKUST 学籍上限 8 年'],
  },
  {
    id: 'tw', name: '中国台湾', noCurve: true,
    points: [],
    nominal: 2, nominalLabel: '法定修业年限博士 2–7 年',
    cap: 7, capLabel: '上限 7 年（在职生可延至 9 年）',
    source: '《学位授予法》',
    basis: '无公开逐年分布；孕产哺育可再延 2 年。',
    anchors: ['法定修业 2–7 年', '在职生可延至 9 年'],
  },
  {
    id: 'sg', name: '新加坡', noCurve: true,
    points: [],
    nominal: 4, nominalLabel: '典型 4 年',
    cap: 5, capLabel: 'MOE 补贴上限（MCD）5 年，超期全额学费',
    source: 'MOE 资助条款',
    basis: '无公开逐年分布。',
    anchors: ['研究型博士典型 4 年', 'MOE 补贴上限 5 年'],
  },
  {
    id: 'in', name: '印度', noCurve: true,
    points: [],
    nominal: 3, nominalLabel: '全日制最短 3 年',
    cap: 6, capLabel: '最长 6 年（重新注册至 8；女性/残障至 10）',
    source: 'UGC PhD Regulations 2022',
    basis: '无公开逐年分布。',
    anchors: ['全日制 3–6 年', '重新注册可至 8 年；女性与残障再延 2 年'],
  },
  {
    id: 'ru', name: '俄罗斯', noCurve: true,
    points: [],
    nominal: 3.5, nominalLabel: '副博士 3–4 年',
    cap: null, capLabel: '学术假可无限次（每次 ≤2 年），无硬上限',
    source: '俄高校学制与学术假规定',
    basis: '无公开逐年分布。',
    anchors: ['副博士全日制 3 年（部分专业 4 年），函授 4–5 年', '按期答辩者仅约 10%'],
  },
  {
    id: 'br', name: '巴西', noCurve: true,
    points: [],
    nominal: 4, nominalLabel: 'CAPES 标准 48 个月',
    cap: 5, capLabel: '可延至 60 个月（5 年）',
    source: 'CAPES 奖学金规章',
    basis: '无公开逐年分布。',
    anchors: ['标准博士 48 个月', '可延至 60 个月'],
  },
]

// —— 「最多能延到第几年」：名义学制 vs 制度上限 ——
export interface CapBar {
  id: string
  name: string
  nominal: number
  nominalLabel: string
  cap: number | null // null = 无硬上限
  capLabel: string
  basis: string
}
export const capBars: CapBar[] = [
  { id: 'sg', name: '新加坡', nominal: 4, nominalLabel: '典型 4 年', cap: 5, capLabel: '5 年', basis: 'MOE 补贴上限（MCD）5 年；超期按全额学费缴费。' },
  { id: 'br', name: '巴西', nominal: 4, nominalLabel: 'CAPES 48 个月', cap: 5, capLabel: '5 年', basis: 'CAPES 标准博士 48 个月，可延至 60 个月。' },
  { id: 'de', name: '德国', nominal: 3, nominalLabel: '合同名义 3 年', cap: 6, capLabel: '合同 6 年', basis: '学籍本身无上限；WissZeitVG 规定博士前科研聘期上限 6 年（与博后合计 12 年）。' },
  { id: 'fr', name: '法国', nominal: 3, nominalLabel: '法令 3 年', cap: 6, capLabel: '6 年＋申延', basis: '非全职法令上限 6 年；合同可延长两次各 1 年，之后可逐年申请延期。' },
  { id: 'in', name: '印度', nominal: 3, nominalLabel: '最短 3 年', cap: 6, capLabel: '6 年（特殊至 10）', basis: 'UGC 2022：全日制 3–6 年；重新注册可至 8 年，女性与残障再延 2 年至 10 年。' },
  { id: 'tw', name: '中国台湾', nominal: 2, nominalLabel: '法定 2 年起', cap: 7, capLabel: '7 年（在职 9）', basis: '《学位授予法》：博士修业 2–7 年；在职生可延至 9 年，孕产哺育再延 2 年。' },
  { id: 'cn', name: '中国大陆', nominal: 4, nominalLabel: '学制 4 年', cap: 8, capLabel: '6–8 年', basis: '最长学习年限 6–8 年由各校自定（直博 5 年起算）。' },
  { id: 'hk', name: '中国香港', nominal: 3.5, nominalLabel: '3 / 4 年', cap: 8, capLabel: '8 年', basis: 'HKUST 学籍上限 8 年；其余各校 6–8 年不等。' },
  { id: 'kr', name: '韩国', nominal: 2, nominalLabel: '上课 2 年', cap: 8, capLabel: '8 年', basis: '在学上限博士 8 年（校规）；上课年限仅 2 年，其后为论文期。' },
  { id: 'us', name: '美国', nominal: 5, nominalLabel: '常见 4–6 年', cap: 10, capLabel: '5–10 年', basis: '无全国统一上限：斯坦福 candidacy 5 年、密歇根自入学起 7+2 年，校规常见 5–10 年。' },
  { id: 'ru', name: '俄罗斯', nominal: 3.5, nominalLabel: '3–4 年', cap: null, capLabel: '无硬上限', basis: '学术假可无限次申请（每次 ≤2 年）；按期答辩者仅约 10%。' },
]
