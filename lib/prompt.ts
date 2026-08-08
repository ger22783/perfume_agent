import type { FormulaResponse } from './types';

/**
 * 提示词模块（改造后）
 *
 * LLM 的角色已从「生成配方」收窄为「解释文案增强」：
 * 配方比例完全由约束优化求解器（lib/optimizer.ts）决定，
 * 模型只负责把配方结构 + 目标向量 + 误差翻译成人话（可选开关）。
 */

export const SYSTEM_PROMPT =
  '你是 iGEM 路演展台里的专业调香体验 Agent 的「解释助手」。' +
  '你的唯一任务是：根据给定的【配方结构】【目标香气向量】【预测香气与误差】，把配方写成人话解释，' +
  '让第一次闻香的路人也能听懂「为什么这样配」。\n\n' +
  '硬性规则：\n' +
  '1. replyText 必须是中文，控制在 300 字以内，用自然段，不要 markdown 标题。\n' +
  '2. 只解释当前配方，绝不改变配方比例，不要编造新原料。\n' +
  '3. 只讲香气定位、核心选材逻辑、可调整方向；不要重复具体比例、喷香步骤、喷距、等待时间（这些在结构化配方卡里单独展示）。\n' +
  '4. 引用误差数据时严格使用给定数据，不要编造数字。\n' +
  '5. 只输出 JSON，不要 markdown，不要解释推理过程。\n\n' +
  '输出 JSON 结构：\n' +
  '{\n' +
  '  "replyText": "300 字以内的专业中文解释，只包含香气定位、核心选材逻辑和基于误差的可调整方向"\n' +
  '}';

/** 把配方结构 + 目标向量 + 误差格式化为解释上下文 */
export function buildExplanationContext(formula: FormulaResponse): string {
  const positioning = formula.fragrancePositioning;
  const formatNotes = (notes?: Array<{ name: string; percentage: number }>) =>
    notes?.map((item) => `${item.name} ${item.percentage}%`).join('、') || '无';

  const lines: string[] = [
    '【香气定位】',
    `风格：${positioning.style}；关键词：${positioning.keywords.join('、')}；适合场景：${positioning.suitableScenarios.join('、')}`,
    '【配方结构】',
    `前调：${formatNotes(formula.formula.topNotes)}`,
    `中调：${formatNotes(formula.formula.heartNotes)}`,
    `后调：${formatNotes(formula.formula.baseNotes)}`
  ];

  if (formula.targetVector) {
    const target = formula.targetVector;
    lines.push('【目标香气向量 y（用户想要）】');
    lines.push(
      `清爽 ${target.facets.fresh}、甜感 ${target.facets.sweet}、花香 ${target.facets.floral}、木质 ${target.facets.woody}、水感 ${target.facets.watery}、温暖 ${target.facets.warm}、强度 ${target.intensity}`
    );
  }

  if (formula.error) {
    lines.push('【预测香气 Aw 与逐维误差】');
    formula.error.perDimension.forEach((item) => {
      lines.push(`${item.label}：目标 ${item.target}，实际 ${item.actual}，偏差 ${item.diff}`);
    });
    lines.push(`总误差 ||Aw−y||² = ${formula.error.total}`);
  }

  lines.push('请基于以上信息输出一段自然、专业、亲切的中文解释。');
  return lines.join('\n');
}
