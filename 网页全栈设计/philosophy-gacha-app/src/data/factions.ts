import type { Faction, FactionId } from '../types/philosopher';

export const FACTIONS: Record<FactionId, Faction> = {
  classical: {
    id: 'classical',
    name: '德国古典 / 理性天穹',
    enName: 'German Idealism',
    color: '#a855f7',
    bgGradient: 'linear-gradient(135deg, #3b0764 0%, #6b21a8 50%, #9333ea 100%)',
    description: '强调纯粹理性、先验范畴与绝对精神，构建庞大的形而上学体系。',
    icon: '🔮'
  },
  existentialism: {
    id: 'existentialism',
    name: '存在主义 / 狂飙意志',
    enName: 'Existentialism',
    color: '#eab308',
    bgGradient: 'linear-gradient(135deg, #713f12 0%, #a16207 50%, #eab308 100%)',
    description: '打破传统形而上学桎梏，强调个人的存在、自由意志、超人精神与荒谬抵抗。',
    icon: '⚡'
  },
  materialism: {
    id: 'materialism',
    name: '唯物史观 / 实践变革',
    enName: 'Historical Materialism',
    color: '#ef4444',
    bgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #dc2626 100%)',
    description: '批判唯心主义，立足生产力与阶级分析，主张用革命实践改变世界。',
    icon: '🚩'
  },
  liberalism: {
    id: 'liberalism',
    name: '自由主义 / 社会契约',
    enName: 'Liberalism & Contract',
    color: '#3b82f6',
    bgGradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #2563eb 100%)',
    description: '强调个人基本权利、法治、权力的分立与社会契约的合法性。',
    icon: '⚖️'
  },
  ancient: {
    id: 'ancient',
    name: '古希腊 / 理念理想国',
    enName: 'Ancient Greek Philosophy',
    color: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #f59e0b 100%)',
    description: '探寻宇宙本原、真理形态与至善境界，奠定西方哲学思想基石。',
    icon: '🏛️'
  },
  utilitarianism: {
    id: 'utilitarianism',
    name: '功利主义 / 最大幸福',
    enName: 'Utilitarianism & Empirical',
    color: '#10b981',
    bgGradient: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
    description: '主张以追求“最大多数人的最大幸福”为道德与立法的终极准则。',
    icon: '🌿'
  }
};
