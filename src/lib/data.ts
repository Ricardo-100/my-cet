import { Sentence, Direction, Difficulty } from './types';

// === CET-4 英译汉句子 ===
const cet4EnZh: Sentence[] = [
  {
    id: 'cet4-ez-001',
    text: 'It is never too late to learn.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'It is never too late to learn.',
    zhReference: '学习永远不嫌晚。',
    vocab: ['too late to learn'],
  },
  {
    id: 'cet4-ez-002',
    text: 'The Internet has dramatically changed the way people communicate.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'The Internet has dramatically changed the way people communicate.',
    zhReference: '互联网已经极大地改变了人们的沟通方式。',
    vocab: ['dramatically', 'the way'],
  },
  {
    id: 'cet4-ez-003',
    text: 'Environmental protection is the responsibility of every citizen.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'Environmental protection is the responsibility of every citizen.',
    zhReference: '环境保护是每个公民的责任。',
    vocab: ['environmental protection', 'responsibility', 'citizen'],
  },
  {
    id: 'cet4-ez-004',
    text: 'Reading books can greatly enrich our knowledge and broaden our horizons.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'Reading books can greatly enrich our knowledge and broaden our horizons.',
    zhReference: '读书可以极大地丰富我们的知识、拓宽我们的视野。',
    vocab: ['enrich', 'broaden our horizons'],
  },
  {
    id: 'cet4-ez-005',
    text: 'It is important for students to develop good study habits.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'It is important for students to develop good study habits.',
    zhReference: '对学生来说，养成好的学习习惯很重要。',
    vocab: ['develop good study habits'],
  },
  {
    id: 'cet4-ez-006',
    text: 'Technological advances have made our lives much more convenient.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'Technological advances have made our lives much more convenient.',
    zhReference: '技术进步使我们的生活便利了许多。',
    vocab: ['technological advances', 'convenient'],
  },
  {
    id: 'cet4-ez-007',
    text: 'Music is a universal language that brings people together.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'Music is a universal language that brings people together.',
    zhReference: '音乐是一门通用的语言，能将人们聚集在一起。',
    vocab: ['universal language', 'bring people together'],
  },
  {
    id: 'cet4-ez-008',
    text: 'Taking exercise regularly is essential to maintaining good health.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'Taking exercise regularly is essential to maintaining good health.',
    zhReference: '经常锻炼对保持身体健康至关重要。',
    vocab: ['take exercise', 'essential to'],
  },
  {
    id: 'cet4-ez-009',
    text: 'The government should take effective measures to reduce air pollution.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'The government should take effective measures to reduce air pollution.',
    zhReference: '政府应采取有效措施来减少空气污染。',
    vocab: ['take effective measures', 'reduce'],
  },
  {
    id: 'cet4-ez-010',
    text: 'A good education provides a solid foundation for future success.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'A good education provides a solid foundation for future success.',
    zhReference: '良好的教育为未来的成功奠定了坚实的基础。',
    vocab: ['solid foundation', 'future success'],
  },
  {
    id: 'cet4-ez-011',
    text: 'China has a long history and splendid culture.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'China has a long history and splendid culture.',
    zhReference: '中国拥有悠久的历史和灿烂的文化。',
    vocab: ['splendid culture'],
  },
  {
    id: 'cet4-ez-012',
    text: 'Hard work is the key to achieving your goals.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'Hard work is the key to achieving your goals.',
    zhReference: '努力工作是实现目标的关键。',
    vocab: ['the key to'],
  },
  {
    id: 'cet4-ez-013',
    text: 'The rapid development of cities brings both opportunities and challenges.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'The rapid development of cities brings both opportunities and challenges.',
    zhReference: '城市的快速发展既带来了机遇，也带来了挑战。',
    vocab: ['rapid development', 'opportunities and challenges'],
  },
  {
    id: 'cet4-ez-014',
    text: 'English is one of the most widely spoken languages in the world.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'English is one of the most widely spoken languages in the world.',
    zhReference: '英语是世界上使用最广泛的语言之一。',
    vocab: ['widely spoken'],
  },
  {
    id: 'cet4-ez-015',
    text: 'Volunteering is a great way to give back to the community.',
    direction: 'en-zh',
    difficulty: 'cet4',
    enOriginal: 'Volunteering is a great way to give back to the community.',
    zhReference: '志愿服务是回馈社区的好方法。',
    vocab: ['volunteering', 'give back'],
  },
];

// === CET-4 汉译英句子 ===
const cet4ZhEn: Sentence[] = [
  {
    id: 'cet4-ze-001',
    text: '学习是一个终身的过程。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Learning is a lifelong process.',
    zhReference: '学习是一个终身的过程。',
    vocab: ['lifelong process'],
  },
  {
    id: 'cet4-ze-002',
    text: '随着生活水平的提高，人们越来越关注健康。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'As living standards improve, people pay more and more attention to health.',
    zhReference: '随着生活水平的提高，人们越来越关注健康。',
    vocab: ['living standards', 'pay attention to'],
  },
  {
    id: 'cet4-ze-003',
    text: '传统文化是民族的根。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Traditional culture is the root of a nation.',
    zhReference: '传统文化是民族的根。',
    vocab: ['traditional culture'],
  },
  {
    id: 'cet4-ze-004',
    text: '旅游可以让人放松心情，开阔眼界。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Traveling can help people relax and broaden their horizons.',
    zhReference: '旅游可以让人放松心情，开阔眼界。',
    vocab: ['relax', 'broaden their horizons'],
  },
  {
    id: 'cet4-ze-005',
    text: '人工智能正在改变世界。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Artificial intelligence is changing the world.',
    zhReference: '人工智能正在改变世界。',
    vocab: ['artificial intelligence'],
  },
  {
    id: 'cet4-ze-006',
    text: '保护野生动物是我们的共同责任。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Protecting wild animals is our common responsibility.',
    zhReference: '保护野生动物是我们的共同责任。',
    vocab: ['wild animals', 'common responsibility'],
  },
  {
    id: 'cet4-ze-007',
    text: '诚实是为人处世的根本。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Honesty is the foundation of being a good person.',
    zhReference: '诚实是为人处世的根本。',
    vocab: ['honesty', 'foundation'],
  },
  {
    id: 'cet4-ze-008',
    text: '科技让生活更美好。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Technology makes life better.',
    zhReference: '科技让生活更美好。',
    vocab: [],
  },
  {
    id: 'cet4-ze-009',
    text: '绿色出行有助于减少碳排放。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Green transportation helps reduce carbon emissions.',
    zhReference: '绿色出行有助于减少碳排放。',
    vocab: ['green transportation', 'carbon emissions'],
  },
  {
    id: 'cet4-ze-010',
    text: '多读书可以提升个人的综合素养。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Reading more books can improve one\'s comprehensive quality.',
    zhReference: '多读书可以提升个人的综合素养。',
    vocab: ['comprehensive quality'],
  },
  {
    id: 'cet4-ze-011',
    text: '团结就是力量。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Unity is strength.',
    zhReference: '团结就是力量。',
    vocab: [],
  },
  {
    id: 'cet4-ze-012',
    text: '珍惜时间就是珍惜生命。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Cherishing time is cherishing life.',
    zhReference: '珍惜时间就是珍惜生命。',
    vocab: ['cherish'],
  },
  {
    id: 'cet4-ze-013',
    text: '良好的沟通能力对职业发展很重要。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Good communication skills are important for career development.',
    zhReference: '良好的沟通能力对职业发展很重要。',
    vocab: ['communication skills', 'career development'],
  },
  {
    id: 'cet4-ze-014',
    text: '我们应该学会独立思考和判断。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'We should learn to think and judge independently.',
    zhReference: '我们应该学会独立思考和判断。',
    vocab: ['think independently'],
  },
  {
    id: 'cet4-ze-015',
    text: '创新是一个民族进步的灵魂。',
    direction: 'zh-en',
    difficulty: 'cet4',
    enOriginal: 'Innovation is the soul of national progress.',
    zhReference: '创新是一个民族进步的灵魂。',
    vocab: ['innovation', 'national progress'],
  },
];

// === CET-6 英译汉句子 ===
const cet6EnZh: Sentence[] = [
  {
    id: 'cet6-ez-001',
    text: 'Climate change poses an unprecedented threat to ecosystems worldwide.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'Climate change poses an unprecedented threat to ecosystems worldwide.',
    zhReference: '气候变化对全球生态系统构成了前所未有的威胁。',
    vocab: ['pose a threat to', 'unprecedented', 'ecosystems'],
  },
  {
    id: 'cet6-ez-002',
    text: 'The pursuit of scientific knowledge should always be guided by ethical principles.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'The pursuit of scientific knowledge should always be guided by ethical principles.',
    zhReference: '对科学知识的追求应当始终以伦理原则为指导。',
    vocab: ['pursuit of', 'guided by', 'ethical principles'],
  },
  {
    id: 'cet6-ez-003',
    text: 'Cultural diversity is essential to fostering mutual understanding among nations.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'Cultural diversity is essential to fostering mutual understanding among nations.',
    zhReference: '文化多样性对于促进各国之间的相互理解至关重要。',
    vocab: ['cultural diversity', 'fostering', 'mutual understanding'],
  },
  {
    id: 'cet6-ez-004',
    text: 'The digital revolution has fundamentally transformed the global economic landscape.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'The digital revolution has fundamentally transformed the global economic landscape.',
    zhReference: '数字革命从根本上改变了全球经济格局。',
    vocab: ['fundamentally', 'global economic landscape'],
  },
  {
    id: 'cet6-ez-005',
    text: 'Demographic shifts will have far-reaching implications for social policy in the coming decades.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'Demographic shifts will have far-reaching implications for social policy in the coming decades.',
    zhReference: '人口结构的变化将在未来数十年对社会政策产生深远影响。',
    vocab: ['demographic shifts', 'far-reaching', 'implications'],
  },
  {
    id: 'cet6-ez-006',
    text: 'Globalization has created an interconnected world where no nation can thrive in isolation.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'Globalization has created an interconnected world where no nation can thrive in isolation.',
    zhReference: '全球化创造了一个相互联系的世界，没有任何一个国家可以在孤立中繁荣发展。',
    vocab: ['interconnected', 'thrive', 'in isolation'],
  },
  {
    id: 'cet6-ez-007',
    text: 'The democratization of information empowers individuals but also challenges traditional authorities.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'The democratization of information empowers individuals but also challenges traditional authorities.',
    zhReference: '信息的民主化赋予个人权力，同时也对传统权威构成挑战。',
    vocab: ['democratization of', 'empowers', 'traditional authorities'],
  },
  {
    id: 'cet6-ez-008',
    text: 'Sustainable development requires a delicate balance between economic growth and environmental conservation.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'Sustainable development requires a delicate balance between economic growth and environmental conservation.',
    zhReference: '可持续发展需要在经济增长和环境保护之间取得微妙的平衡。',
    vocab: ['sustainable development', 'delicate balance', 'conservation'],
  },
  {
    id: 'cet6-ez-009',
    text: 'The advancement of artificial intelligence raises profound philosophical questions about the nature of consciousness.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'The advancement of artificial intelligence raises profound philosophical questions about the nature of consciousness.',
    zhReference: '人工智能的发展引发了关于意识本质的深刻哲学问题。',
    vocab: ['raises profound questions', 'philosophical', 'consciousness'],
  },
  {
    id: 'cet6-ez-010',
    text: 'Inequality in education perpetuates cycles of poverty across generations.',
    direction: 'en-zh',
    difficulty: 'cet6',
    enOriginal: 'Inequality in education perpetuates cycles of poverty across generations.',
    zhReference: '教育不平等使贫困的代际循环持续不断。',
    vocab: ['perpetuates', 'cycles of poverty', 'across generations'],
  },
];

// === CET-6 汉译英句子 ===
const cet6ZhEn: Sentence[] = [
  {
    id: 'cet6-ze-001',
    text: '气候变化对全球生态系统构成了前所未有的威胁。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'Climate change poses an unprecedented threat to ecosystems worldwide.',
    zhReference: '气候变化对全球生态系统构成了前所未有的威胁。',
    vocab: ['pose a threat to', 'unprecedented', 'ecosystems'],
  },
  {
    id: 'cet6-ze-002',
    text: '对科学知识的追求应当始终以伦理原则为指导。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'The pursuit of scientific knowledge should always be guided by ethical principles.',
    zhReference: '对科学知识的追求应当始终以伦理原则为指导。',
    vocab: ['pursuit of', 'guided by', 'ethical principles'],
  },
  {
    id: 'cet6-ze-003',
    text: '文化多样性对于促进各国之间的相互理解至关重要。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'Cultural diversity is essential to fostering mutual understanding among nations.',
    zhReference: '文化多样性对于促进各国之间的相互理解至关重要。',
    vocab: ['cultural diversity', 'fostering', 'mutual understanding'],
  },
  {
    id: 'cet6-ze-004',
    text: '数字革命从根本上改变了全球经济格局。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'The digital revolution has fundamentally transformed the global economic landscape.',
    zhReference: '数字革命从根本上改变了全球经济格局。',
    vocab: ['fundamentally', 'global economic landscape'],
  },
  {
    id: 'cet6-ze-005',
    text: '人口结构的变化将在未来数十年对社会政策产生深远影响。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'Demographic shifts will have far-reaching implications for social policy in the coming decades.',
    zhReference: '人口结构的变化将在未来数十年对社会政策产生深远影响。',
    vocab: ['demographic shifts', 'far-reaching', 'implications'],
  },
  {
    id: 'cet6-ze-006',
    text: '教育不平等使贫困的代际循环持续不断。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'Inequality in education perpetuates cycles of poverty across generations.',
    zhReference: '教育不平等使贫困的代际循环持续不断。',
    vocab: ['perpetuates', 'cycles of poverty', 'across generations'],
  },
  {
    id: 'cet6-ze-007',
    text: '可持续发展的核心在于协调经济发展与环境保护之间的关系。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'The core of sustainable development lies in coordinating the relationship between economic development and environmental protection.',
    zhReference: '可持续发展的核心在于协调经济发展与环境保护之间的关系。',
    vocab: ['sustainable development', 'coordinating'],
  },
  {
    id: 'cet6-ze-008',
    text: '跨国公司的扩张反映了经济全球化的深入发展。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'The expansion of multinational corporations reflects the deepening of economic globalization.',
    zhReference: '跨国公司的扩张反映了经济全球化的深入发展。',
    vocab: ['multinational corporations', 'deepening'],
  },
  {
    id: 'cet6-ze-009',
    text: '互联网在促进信息共享的同时，也给隐私保护带来了新的挑战。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'While facilitating information sharing, the Internet also brings new challenges to privacy protection.',
    zhReference: '互联网在促进信息共享的同时，也给隐私保护带来了新的挑战。',
    vocab: ['facilitating', 'privacy protection'],
  },
  {
    id: 'cet6-ze-010',
    text: '培养创新精神是推动社会进步的重要途径。',
    direction: 'zh-en',
    difficulty: 'cet6',
    enOriginal: 'Cultivating the spirit of innovation is an important way to promote social progress.',
    zhReference: '培养创新精神是推动社会进步的重要途径。',
    vocab: ['cultivating', 'promote social progress'],
  },
];

// === 汇总 ===
export const allSentences: Sentence[] = [
  ...cet4EnZh,
  ...cet4ZhEn,
  ...cet6EnZh,
  ...cet6ZhEn,
];

export function getSentences(
  direction: Direction,
  difficulty: Difficulty
): Sentence[] {
  let pool = allSentences;

  // 难度过滤
  if (difficulty !== 'mixed') {
    pool = pool.filter(s => s.difficulty === difficulty);
  }

  // 方向过滤
  pool = pool.filter(s => s.direction === direction);

  return pool;
}

export function getRandomSentence(
  direction: Direction,
  difficulty: Difficulty,
  excludeIds: string[] = []
): Sentence {
  const pool = getSentences(direction, difficulty).filter(
    s => !excludeIds.includes(s.id)
  );

  if (pool.length === 0) {
    // 如果全做完了，重新开始
    return getSentences(direction, difficulty)[
      Math.floor(Math.random() * getSentences(direction, difficulty).length)
    ];
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

export function getSentenceById(id: string): Sentence | undefined {
  return allSentences.find(s => s.id === id);
}
