export type Lang = 'zh' | 'en';

export const t = {
  siteTitle: { zh: 'Perfume Agent · 定制香水', en: 'Perfume Agent · Custom' },
  heroTitle: { zh: '几十秒，生成属于你的专属香水', en: 'Your signature perfume in seconds' },
  heroDesc: {
    zh: '告诉它你今天想要的感觉——清爽、水感、木质还是甜暖，你今天的任何需求——约会、开会还是参加户外活动，或者今天的天气情况。Agent 会从原料库中求解出最贴近你需求的配方，一键发送到你的 Aromacell，由它按比例自动调配出专属于你的香水。',
    en: 'Tell it how you want to feel today — fresh, watery, woody or warm — or what your day looks like: a date, a meeting, outdoor time, or just the weather. The agent solves the formula that fits you best and sends it to your Aromacell to craft your signature perfume.'
  },
  qrHint: { zh: '扫码在手机上体验', en: 'Scan to try on your phone' },
  modeEnum: { zh: '约束优化', en: 'Optimized' },
  modeHeuristic: { zh: '演示模式', en: 'Demo mode' },
  modeExplain: { zh: '配方解释', en: 'Explanation' },
  modeLLM: { zh: '在线模型', en: 'Live model' },
  modeFallback: { zh: '演示模式', en: 'Demo mode' },
  errorTitle: { zh: '目标 vs 实际', en: 'Target vs actual' },
  errorHint: { zh: '约束优化求解的逐维匹配误差', en: 'Per-dimension match error from constrained optimization' },
  labelTarget: { zh: '目标', en: 'Target' },
  labelActual: { zh: '实际', en: 'Actual' },
  labelError: { zh: '误差', en: 'Error' },
  labelTotalError: { zh: '总误差 ||Aw−y||²', en: 'Total error ||Aw−y||²' },
  labelL1Error: { zh: 'L1 误差', en: 'L1 error' },
  inputLabel: { zh: '你想要什么感觉？', en: 'What feeling do you want?' },
  inputPlaceholder: {
    zh: '例如：今天很热，想要清爽、不甜、适合通勤的香气',
    en: 'Example: It is hot today. I want something fresh, not sweet, and commute-friendly.'
  },
  btnFirst: { zh: '生成配方', en: 'Create formula' },
  btnConfirm: { zh: '确定', en: 'Confirm' },
  btnContinue: { zh: '继续修改', en: 'Refine' },
  btnRegenerate: { zh: '重新生成', en: 'Restart' },
  btnLoading: { zh: '生成中...', en: 'Generating...' },
  btnDispatchSending: { zh: '发送中...', en: 'Sending...' },
  btnDispatched: { zh: '配方已发送到 Aromacell', en: 'Formula sent to your Aromacell' },
  dispatchSimulated: { zh: '演示模式，未连接 Aromacell', en: 'Demo mode, no Aromacell connected' },
  dispatchFailed: { zh: '发送失败，请重试', en: 'Dispatch failed, please retry' },
  dispatchHint: {
    zh: '确定后将配方发送到 Aromacell 自动调配；继续修改则按输入框里的新需求调整。',
    en: 'Confirm to send this formula to your Aromacell for automatic mixing; or refine it with a new request.'
  },
  hintFollowUp: {
    zh: '也可以继续说：更清爽一点 / 不要玫瑰 / 更甜一点 / 更适合雨天',
    en: 'Try: fresher / no rose / sweeter / more rainy-day friendly'
  },
  quickTitle: { zh: '快速选择', en: 'Quick picks' },
  quickHint: { zh: '点击任意需求即可生成', en: 'Click any prompt to generate' },
  quickPrompts: {
    zh: [
      '清爽、不甜、适合夏天通勤',
      '雨天、安静、像图书馆',
      '温柔一点，适合约会',
      '木质、沉稳、适合阅读',
      '甜一点，但不要腻',
      '适合面试，干净、有亲和力',
      '适合运动后，清凉、轻盈',
      '适合晚会，成熟、有记忆点',
      '像白衬衫，皂感、低调',
      '适合睡前，放松、柔和',
      '想要茶香，不要太花',
      '想要高级感，但不要太浓',
      '今天心情低落，想要治愈一点',
      '适合拍照打卡，明亮、有氛围',
      '适合秋冬，温暖、木质',
      '想要海风感，清透、干净',
      '适合第一次体验，安全不出错',
      '像刚洗完澡，清洁、舒服',
      '有咖啡感，但不要太苦',
      '像校园午后，轻松、有茶感'
    ],
    en: [
      'Fresh, not sweet, for a summer commute',
      'Rainy, calm, like a library',
      'Soft and gentle, for a date',
      'Woody, steady, for reading',
      'A bit sweet, but not cloying',
      'Clean & friendly, for an interview',
      'Cool & light, after a workout',
      'Elegant & memorable, for a party',
      'Like a white shirt, soapy & understated',
      'Soft & relaxing, before bed',
      'Tea-like, not too floral',
      'Sophisticated but not too strong',
      'Feeling down today, want something soothing',
      'Bright & atmospheric, photo-ready',
      'Warm & woody, for autumn & winter',
      'Sea breeze, clear & clean',
      'Safe & easy, first-time friendly',
      'Just showered, clean & comfy',
      'Coffee-like but not bitter',
      'Campus afternoon, easy & tea-like'
    ]
  },
  historyTitle: { zh: '调整记录', en: 'Refinement history' },
  historyEmpty: {
    zh: '生成后可以继续输入新需求，让 Agent 沿着上一版配方调整。',
    en: 'After generating, you can keep refining or asking about the previous formula.'
  },
  resultTitle: { zh: '你的香水配方', en: 'Your perfume formula' },
  resultHint: {
    zh: '确认后配方会发送到 Aromacell，由 Aromacell 按比例自动调配。',
    en: 'Confirm to send this formula to your Aromacell for automatic crafting.'
  },
  resultEmpty: {
    zh: '先输入一个需求，或点击左侧快速选择。',
    en: 'Enter a request or choose a quick pick.'
  },
  blockAIReply: { zh: 'Agent 建议', en: 'Agent suggestion' },
  blockPositioning: { zh: '香气定位', en: 'Scent positioning' },
  blockBlending: { zh: '配方比例', en: 'Formula ratios' },
  blockFormula: { zh: '配方结构', en: 'Formula structure' },
  blockEffect: { zh: '闻起来会怎样', en: 'Expected effect' },
  blockSafety: { zh: '安全提醒', en: 'Safety note' },
  labelStyle: { zh: '风格', en: 'Style' },
  labelKeywords: { zh: '关键词', en: 'Keywords' },
  labelScenarios: { zh: '适合场景', en: 'Scenarios' },
  labelOpening: { zh: '前段', en: 'Opening' },
  labelHeart: { zh: '中段', en: 'Heart' },
  labelDrydown: { zh: '尾调', en: 'Drydown' },
  labelSillage: { zh: '扩散', en: 'Sillage' },
  labelLongevity: { zh: '留香', en: 'Longevity' },
  topNotes: { zh: '前调', en: 'Top notes' },
  heartNotes: { zh: '中调', en: 'Heart notes' },
  baseNotes: { zh: '后调', en: 'Base notes' },
  roleYou: { zh: '你', en: 'You' },
  roleAgent: { zh: 'Agent', en: 'Agent' },
  debugTitle: { zh: '调试信息', en: 'Debug info' },
  fallbackReply: {
    zh: '约束优化暂时不可用，已切换到本地演示规则生成。',
    en: 'Constrained optimization is unavailable, switched to local demo rules.'
  },
  feedbackTitle: { zh: '使用反馈', en: 'Feedback' },
  feedbackHint: {
    zh: '使用后给这版配方打个分，帮助我们让配方更懂你。',
    en: 'Rate this formula after trying it, so we can match you better.'
  },
  feedbackPlaceholder: {
    zh: '可选：哪里喜欢，哪里想改？',
    en: 'Optional: what worked, what should change?'
  },
  feedbackSubmit: { zh: '提交反馈', en: 'Submit feedback' },
  feedbackThanks: { zh: '已记录，谢谢你的反馈。', en: 'Feedback saved. Thank you.' }
} as const;
