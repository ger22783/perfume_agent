import { NextRequest, NextResponse } from 'next/server';

/**
 * 配方下发接口：把确认后的配方发送给 Aromacell 自动调配出个性化香水。
 *
 * - 配置 HARDWARE_API_URL 时：把配方 POST 到 Aromacell 网关，失败返回 502。
 * - 未配置时：返回模拟成功（开发/演示模式），便于前端联调。
 *
 * 协议约定（待硬件团队确认后扩展）：
 *   POST { sessionId, formula, dispatchedAt }
 *   formula.formula 为 { topNotes / heartNotes / baseNotes }，每种原料带百分比。
 */

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = String(body?.sessionId || '').trim();
    const formula = body?.formula;
    if (!sessionId || !formula) {
      return NextResponse.json({ error: 'sessionId and formula are required' }, { status: 400 });
    }

    // 简单校验配方结构
    const notes = [
      ...(Array.isArray(formula?.formula?.topNotes) ? formula.formula.topNotes : []),
      ...(Array.isArray(formula?.formula?.heartNotes) ? formula.formula.heartNotes : []),
      ...(Array.isArray(formula?.formula?.baseNotes) ? formula.formula.baseNotes : [])
    ];
    if (notes.length < 3 || notes.length > 5) {
      return NextResponse.json({ error: 'formula must contain 3-5 materials' }, { status: 400 });
    }
    const total = notes.reduce((sum: number, note: any) => sum + Number(note?.percentage || 0), 0);
    if (total !== 100) {
      return NextResponse.json({ error: `formula percentages must sum to 100, got ${total}` }, { status: 400 });
    }

    const hardwareUrl = process.env.HARDWARE_API_URL?.trim();

    if (hardwareUrl) {
      const res = await fetch(hardwareUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, formula, dispatchedAt: new Date().toISOString() })
      });
      if (!res.ok) {
        return NextResponse.json({ ok: false, error: `Hardware dispatch failed: ${res.status}` }, { status: 502 });
      }
      return NextResponse.json({ ok: true, mode: 'hardware', dispatchedAt: new Date().toISOString() });
    }

    // 未配置硬件：模拟成功
    return NextResponse.json({
      ok: true,
      mode: 'simulated',
      dispatchedAt: new Date().toISOString(),
      note: 'HARDWARE_API_URL 未配置，配方未实际发送（演示模式）'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'failed to dispatch formula'
    }, { status: 500 });
  }
}
