import { boothMaterials } from '@/data/ingredients';
import type { FormulaResponse } from './types';

const explanationTriggers = [
  '为什么',
  '为啥',
  '原因',
  '作用',
  '干嘛',
  '有什么用',
  '为什么要加',
  'why',
  'reason',
  'purpose'
];

function allNotes(formula: FormulaResponse) {
  return [
    ...formula.formula.topNotes.map((item) => ({ ...item, role: '前调' })),
    ...formula.formula.heartNotes.map((item) => ({ ...item, role: '中调' })),
    ...formula.formula.baseNotes.map((item) => ({ ...item, role: '后调' }))
  ];
}

export function isExplanationQuestion(message: string) {
  const text = message.toLowerCase();
  return explanationTriggers.some((trigger) => text.includes(trigger));
}

/** 优化求解模式的解释文案：定位 + 搭配理由（依据用户目标向量与原料库职责；支持中英） */
export function buildOptimizedReply(formula: FormulaResponse, lang: 'zh' | 'en' = 'zh'): string {
  const positioning = formula.fragrancePositioning;
  const target = formula.targetVector;
  const topNotes = formula.formula.topNotes;
  const heartNotes = formula.formula.heartNotes;
  const baseNotes = formula.formula.baseNotes;
  const en = lang === 'en';

  const displayName = (name: string) => {
    if (!en) return name;
    return boothMaterials.find((item) => item.nameZh === name)?.nameEn || name;
  };
  const nameList = (notes: Array<{ name: string }>) => notes.map((note) => displayName(note.name)).join(en ? ' and ' : '、') || '';

  const topNames = nameList(topNotes);
  const heartNames = nameList(heartNotes);
  const baseNames = nameList(baseNotes);

  // 依据目标向量，提炼用户最想要的气味方向（仅在用户非常明确提到时，阈值 ≥5，避免"无中生有"）
  const desires: string[] = [];
  if (target) {
    if (target.facets.fresh >= 5) desires.push(en ? 'want it fresh' : '想清爽');
    if (target.facets.watery >= 5) desires.push(en ? 'want watery coolness' : '想要水感清凉');
    if (target.facets.floral >= 5) desires.push(en ? 'want florals' : '想要花香');
    if (target.facets.woody >= 5) desires.push(en ? 'want a woody base' : '想要沉稳木质');
    if (target.facets.warm >= 5) desires.push(en ? 'want warmth' : '想要温暖感');
    if (target.facets.sweet >= 5) desires.push(en ? 'want a hint of sweetness' : '想要一点甜意');
  }

  const topReason = en
    ? 'they open the scent with brightness and an easy first impression'
    : (() => { const m = boothMaterials.find((item) => item.nameZh === topNotes[0]?.name); return m?.professionalRole || '负责开场的第一印象'; })();
  const heartReason = en
    ? 'it carries the main character of the fragrance'
    : (() => { const m = boothMaterials.find((item) => item.nameZh === heartNotes[0]?.name); return m?.professionalRole || '负责主体气质'; })();
  const baseReason = en
    ? 'it anchors the drydown and gives the perfume stability'
    : (() => { const m = boothMaterials.find((item) => item.nameZh === baseNotes[0]?.name); return m?.professionalRole || '负责收尾与留香'; })();
  const stripPunct = (text: string) => text.replace(/[。！？!?]$/, '');

  const allNotes = [...topNotes, ...heartNotes, ...baseNotes];
  const main = allNotes.reduce((a, b) => (b.percentage > a.percentage ? b : a), allNotes[0]);

  const parts: string[] = [];
  if (en) {
    parts.push(`Positioned as "${positioning.style}". Keywords: ${positioning.keywords.join(', ')}. Great for ${positioning.suitableScenarios.join(', ')}.`);
    const desireLine = desires.length ? `Since you ${desires.join(', ')}, ` : '';
    const body = `${desireLine}the top notes use ${topNames} — ${topReason}; ` +
      `the heart centers on ${heartNames} — ${heartReason}; ` +
      `the base finishes with ${baseNames} — ${baseReason}.`;
    parts.push(desireLine ? body : body.replace(/^the /, 'The '));
    if (main) {
      parts.push(`${displayName(main.name)} takes the largest share (${main.percentage}%) as the backbone; the other notes build layers around it.`);
    }
  } else {
    parts.push(`这版定位成「${positioning.style}」，关键词${positioning.keywords.join('、')}，适合${positioning.suitableScenarios.join('、')}。`);
    const desireLine = desires.length ? `考虑到你${desires.join('、')}，` : '';
    parts.push(
      `${desireLine}前调选了${topNames}——${stripPunct(topReason)}；` +
      `中调以${heartNames}为主体——${stripPunct(heartReason)}；` +
      `后调用${baseNames}收尾——${stripPunct(baseReason)}。`
    );
    if (main) {
      parts.push(`${main.name}占比最高（${main.percentage}%），构成这瓶香水的骨架，其余原料围绕它做层次与衔接。`);
    }
  }

  return en ? parts.join(' ') : parts.join('');
}

export function buildFormulaExplanation(message: string, formula: FormulaResponse, lang: 'zh' | 'en' = 'zh') {
  const en = lang === 'en';
  const notes = allNotes(formula);
  const mentionedNote = notes.find((note) => message.includes(note.name));
  const target = mentionedNote || notes.find((note) => {
    const material = boothMaterials.find((item) => item.nameZh === note.name);
    return material ? message.toLowerCase().includes(material.nameEn.toLowerCase()) : false;
  });

  if (target) {
    const material = boothMaterials.find((item) => item.nameZh === target.name);
    const family = material?.family || (en ? 'current family' : '当前香调');
    const nameEn = material?.nameEn || target.name;
    if (en) {
      return [
        `"${nameEn}" is not here to stand out on its own, but to serve a structural role in the ${target.role}.`,
        `It belongs to the ${family} family and takes ${target.percentage}% of this formula.`,
        'So I keep this formula unchanged — it only explains the role of each note. If you want to swap it, just say "no ${nameEn}" or "make it fresher".'
      ].join('');
    }
    const description = material?.description || '它主要负责补足配方里的气味层次。';
    const moods = material?.moods?.slice(0, 3).join('、') || '整体氛围';
    return [
      `这里加入「${target.name}」不是为了单独突出它，而是让它在${target.role}里承担结构作用。`,
      `它属于${family}，在这版配方中占 ${target.percentage}%，主要贡献是：${description}`,
      `从闻感上，它会把整体往「${moods}」的方向推，让前中后调之间衔接得更自然。`,
      '所以这一步我不会改动你的配方，只解释它在当前版本里的作用；如果你想换掉它，可以直接说"不要这个"或"换成更清爽的"。'
    ].join('');
  }

  const style = formula.fragrancePositioning.style || (en ? 'this scent' : '这版香气');
  const noteSummary = notes.map((note) => `${note.role} ${note.name} ${note.percentage}%`).join(en ? '; ' : '；');
  if (en) {
    return [
      `The logic of "${style}" is to lock in the scenario and mood first, then use top/heart/base notes to complete the experience.`,
      `Current structure: ${noteSummary}.`,
      'Top notes open the first impression, the heart carries the character, and the base provides stability and longevity.',
      'Since you are asking about the formula, I keep the previous version unchanged; only when you clearly ask to adjust it (e.g. "fresher", "no rose") will I regenerate.'
    ].join('');
  }
  return [
    `这版「${style}」的逻辑是先确定场景和情绪，再用前中后调分工把体验做完整。`,
    `当前结构是：${noteSummary}。`,
    '前调负责第一下闻到的印象，中调负责主体性格，后调负责稳定度和留香感。',
    '你现在问的是配方解释，所以我会保留上一版配方不变；只有当你明确说"更清爽、不要玫瑰、换一个"时，我才会重新调整配方。'
  ].join('');
}
