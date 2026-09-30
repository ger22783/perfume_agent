import { boothMaterials, type BoothMaterial, type NoteRole } from '@/data/ingredients';
import { analyzeIntent } from './intent';
import { buildTargetVector } from './intentVector';
import { selectMaterials, type SelectionPlan } from './materialSelector';
import type { BoothStep, FormulaResponse, NoteItem } from './types';
import type { Lang } from './i18n';

function distance(percentage: number): string {
  if (percentage >= 40) return '2-3cm';
  if (percentage >= 30) return '4-5cm';
  if (percentage >= 20) return '6-7cm';
  return '8-9cm';
}

function step(material: string, noteRole: BoothStep['noteRole'], percentage: number, lang: Lang = 'zh'): BoothStep {
  const sprayDistance = distance(percentage);
  return {
    material,
    noteRole,
    percentage,
    distance: sprayDistance,
    waitSeconds: 10,
    instruction: lang === 'en'
      ? `Spray 1 pump, ${sprayDistance} away, wait 10 seconds`
      : `喷 1 下，距离 ${sprayDistance}，等待 10 秒`
  };
}

function notesToSteps(topNotes: NoteItem[], heartNotes: NoteItem[], baseNotes: NoteItem[], lang: Lang = 'zh'): BoothStep[] {
  return [
    ...topNotes.map((item) => step(item.name, 'top', item.percentage, lang)),
    ...heartNotes.map((item) => step(item.name, 'heart', item.percentage, lang)),
    ...baseNotes.map((item) => step(item.name, 'base', item.percentage, lang))
  ];
}

function pickMaterial(plan: SelectionPlan, role: NoteRole, fallbackId: string, used: Set<string>) {
  const roleCandidates = role === 'top' ? plan.top : role === 'heart' ? plan.heart : plan.base;
  const candidate = roleCandidates.find((item) => !used.has(item.material.nameZh));
  const material = candidate?.material || boothMaterials.find((item) => item.id === fallbackId) || boothMaterials[0];
  used.add(material.nameZh);
  return material;
}

function clampUsage(material: BoothMaterial, desired: number) {
  const [min, max] = material.usageRange;
  return Math.max(min, Math.min(max, desired));
}

function buildNotes(plan: SelectionPlan) {
  const used = new Set<string>();
  const wantsSweet = plan.intent.desiredFacets.sweet >= 4 && !plan.intent.dislikes.includes('甜腻');
  const wantsWoody = plan.intent.desiredFacets.woody >= 4;
  const wantsWatery = plan.intent.desiredFacets.watery >= 4;

  const topA = pickMaterial(plan, 'top', wantsWatery ? 'sea-breeze-bell' : 'green-tea', used);
  const topB = pickMaterial(plan, 'top', 'japanese-citrus', used);
  const heartA = pickMaterial(plan, 'heart', wantsSweet ? 'osmanthus-oolong' : 'jasmine-floral-ring', used);
  const heartB = pickMaterial(plan, 'heart', wantsWatery ? 'watery-berry' : 'osmanthus-oolong', used);
  const baseA = pickMaterial(plan, 'base', wantsSweet ? 'french-vanilla' : wantsWoody ? 'smoky-agarwood' : 'desert-rose', used);

  let topNotes: NoteItem[] = [
    { name: topA.nameZh, percentage: clampUsage(topA, 22) },
    { name: topB.nameZh, percentage: clampUsage(topB, 18) }
  ];
  let heartNotes: NoteItem[] = [
    { name: heartA.nameZh, percentage: clampUsage(heartA, 28) }
  ];
  let baseNotes: NoteItem[] = [
    { name: baseA.nameZh, percentage: clampUsage(baseA, 24) }
  ];

  if (heartB.nameZh !== heartA.nameZh && topNotes.length + heartNotes.length + baseNotes.length < 5) {
    heartNotes.push({ name: heartB.nameZh, percentage: clampUsage(heartB, 8) });
  }

  const all = [...topNotes, ...heartNotes, ...baseNotes];
  const total = all.reduce((sum, item) => sum + item.percentage, 0);
  const delta = 100 - total;
  const target = heartNotes[0] || baseNotes[0] || topNotes[0];
  target.percentage += delta;

  topNotes = topNotes.filter((item) => item.percentage > 0);
  heartNotes = heartNotes.filter((item) => item.percentage > 0);
  baseNotes = baseNotes.filter((item) => item.percentage > 0);

  return { topNotes, heartNotes, baseNotes };
}

function roleText(materialName: string, lang: Lang = 'zh') {
  const role = boothMaterials.find((item) => item.nameZh === materialName)?.professionalRole;
  if (role) return role;
  return lang === 'en' ? 'it rounds out the structure of the formula.' : '负责补足香气结构。';
}

const SCENARIO_EN: Record<string, string> = {
  约会: 'Dates',
  日常通勤: 'Commute',
  夏日户外: 'Outdoor',
  阅读独处: 'Reading',
  正式场合: 'Formal events',
  睡前放松: 'Before bed'
};

function buildFormula(plan: SelectionPlan, lang: Lang = 'zh'): FormulaResponse {
  const notes = buildNotes(plan);
  const allNotes = [...notes.topNotes, ...notes.heartNotes, ...notes.baseNotes];
  const joiner = lang === 'en' ? ' and ' : '和';
  const topNames = notes.topNotes.map((item) => item.name).join(joiner);
  const heartNames = notes.heartNotes.map((item) => item.name).join(joiner);
  const baseNames = notes.baseNotes.map((item) => item.name).join(joiner);
  const en = lang === 'en';
  const style = plan.intent.moods.includes('浪漫')
    ? en ? 'Restrained floral signature' : '克制花香记忆款'
    : plan.intent.desiredFacets.watery >= 4
      ? en ? 'Clear watery scent' : '清透水感试香'
      : plan.intent.desiredFacets.warm >= 4
        ? en ? 'Warm woody comfort' : '温暖沉稳氛围香'
        : en ? 'Fresh daily scent' : '清新日常款';
  const keywords = en
    ? ['Balanced', 'Layered']
    : [
        ...(plan.intent.moods.length ? plan.intent.moods.slice(0, 2) : ['易接受', '有个性']),
        ...(plan.intent.constraints.includes('低门槛') ? ['低门槛'] : ['有层次'])
      ].slice(0, 3);
  const scenarios = plan.intent.scenarios.length
    ? (en
        ? (() => {
            const mapped = plan.intent.scenarios.map((item) => SCENARIO_EN[item]).filter(Boolean);
            return mapped.length ? mapped : ['Daily use', 'Personal wear'];
          })()
        : plan.intent.scenarios)
    : (en ? ['Daily use', 'Personal wear'] : ['日常使用', '个性定制']);

  return {
    fragrancePositioning: {
      style,
      keywords,
      suitableScenarios: scenarios
    },
    formula: notes,
    blendingSuggestion: {
      recommendedConcentration: en
        ? 'Aromacell blends the formula automatically, in top → heart → base order.'
        : '配方按前调 → 中调 → 后调顺序，由 Aromacell 自动按比例调配。'
    },
    boothSteps: notesToSteps(notes.topNotes, notes.heartNotes, notes.baseNotes, lang),
    finalEffect: {
      opening: en
        ? `Open with ${topNames || 'the top notes'}: a bright, approachable first impression.`
        : `${topNames || '前调'}先给出第一印象，让香气开场更明亮、更容易接近。`,
      heart: en
        ? `${heartNames || 'The heart'} carries the character, turning a single smell into a themed experience.`
        : `${heartNames || '中调'}负责主体性格，让香气从单一气味变成有主题的体验。`,
      drydown: en
        ? `${baseNames || 'The base'} anchors the drydown with a memorable finish.`
        : `${baseNames || '后调'}负责收尾和稳定度，让香水从新鲜开场过渡到有记忆点的尾调。`,
      sillage: allNotes.some((item) => item.percentage >= 35)
        ? (en ? 'Medium projection, great for close-up sniffing' : '中等扩散，适合近距离闻香')
        : (en ? 'Light to medium, good for first-timers' : '轻到中等扩散，适合第一次体验'),
      longevity: en
        ? 'Roughly 3-6 hours; check the drydown 2-3 hours after use'
        : '约 3-6 小时留香，建议使用后 2-3 小时左右观察尾调变化'
    },
    adjustments: {
      fresher: en
        ? 'Want it fresher? Next round, raise green tea, citrus or sea-breeze notes; lower vanilla, coffee and heavy woods.'
        : '想更清爽，下一轮提高绿茶、柑橘或海风类前调，降低香草、咖啡和厚重木质。',
      softer: en
        ? 'Want it softer? Add osmanthus oolong or watery berry to round the edges.'
        : '想更柔和，下一轮增加桂花乌龙或水影浆果，让边缘更圆润。',
      longerLasting: en
        ? 'Want it longer-lasting? Slightly raise agarwood, rose-wood or vanilla in the base.'
        : '想更持久，下一轮可以小幅提高乌木、玫瑰木质或香草类后调。'
    },
    safetyNote: en
      ? 'Use in a ventilated area. Avoid eyes, mouth and nose; patch test first if you have sensitive skin.'
      : '请在通风处使用，避开眼睛、口鼻和伤口；过敏体质请先小范围试用。'
  };
}

function buildReply(formula: FormulaResponse, lang: Lang = 'zh') {
  const en = lang === 'en';
  const allNotes = [...formula.formula.topNotes, ...formula.formula.heartNotes, ...formula.formula.baseNotes];
  const main = allNotes.reduce((a, b) => (b.percentage > a.percentage ? b : a), allNotes[0]);
  const mainName = main?.name || formula.formula.heartNotes[0]?.name || (en ? 'the heart notes' : '中调主体');
  const mainEn = boothMaterials.find((item) => item.nameZh === mainName)?.nameEn || mainName;

  if (en) {
    return [
      `Positioned as "${formula.fragrancePositioning.style}". Keywords: ${formula.fragrancePositioning.keywords.join(', ')}. Great for ${formula.fragrancePositioning.suitableScenarios.join(', ')}.`,
      `The formula centers on ${mainEn}: ${roleText(mainName, 'en')}`
    ].join(' ');
  }
  return [
    `这版定位成「${formula.fragrancePositioning.style}」，关键词是${formula.fragrancePositioning.keywords.join('、')}，适合${formula.fragrancePositioning.suitableScenarios.join('、')}。`,
    `核心选材以${mainName}为主体：${roleText(mainName)}`
  ].join('');
}

export async function generateFallback(input: string, plan?: SelectionPlan, lang: Lang = 'zh') {
  const selectionPlan = plan || selectMaterials(analyzeIntent(input));
  const formula = buildFormula(selectionPlan, lang);
  const targetVector = buildTargetVector(selectionPlan.intent);

  return {
    mode: 'heuristic' as const,
    replyText: buildReply(formula, lang),
    formula: {
      ...formula,
      targetVector,
      solveMode: 'heuristic' as const
    }
  };
}
