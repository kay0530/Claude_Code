const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const STORAGE_KEY = 'om-dispatch-claude-api-key';

// Model selection based on complexity
function selectModel(aiComplexity) {
  return aiComplexity === 'sonnet'
    ? 'claude-sonnet-4-5-20250514'
    : 'claude-haiku-4-5-20251001';
}

// Core API call function
async function callClaudeAPI(model, systemPrompt, userMessage, maxTokens = 1024) {
  const apiKey = localStorage.getItem(STORAGE_KEY);
  if (!apiKey) {
    return {
      content: 'APIキーが設定されていません。設定画面でClaude APIキーを入力してください。',
      model,
      usage: null,
      error: true,
    };
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData?.error?.message || `APIエラー (${response.status})`;
      return { content: errorMsg, model, usage: null, error: true };
    }

    const data = await response.json();
    return {
      content: data.content?.[0]?.text || '',
      model: data.model,
      usage: data.usage,
      error: false,
    };
  } catch (err) {
    return {
      content: `API呼び出しに失敗しました: ${err.message}`,
      model,
      usage: null,
      error: true,
    };
  }
}

// Generate Japanese explanation of why this team is recommended
export async function generateRecommendationReason(
  team,
  job,
  jobType,
  score,
  breakdown,
  isStretch
) {
  const model = selectModel(jobType.aiComplexity);

  const systemPrompt = `あなたは太陽光発電所のO&M（運用保守）ディスパッチシステムのAIアシスタントです。
チーム編成の推薦理由を簡潔に日本語で説明してください。
専門用語を適切に使用し、現場担当者が理解しやすい表現で回答してください。
回答は3〜5文程度にまとめてください。`;

  const memberInfo = team
    .map((m) => {
      const skillEntries = Object.entries(m.skills)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      return `- ${m.nameJa}（スキル平均: ${m.avgSkill}、${skillEntries}）`;
    })
    .join('\n');

  const breakdownStr = Object.entries(breakdown)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const stretchNote = isStretch
    ? '\n※ストレッチ配置（通常より高難度の案件への挑戦的配置）です。成長機会とリスクの観点も含めてください。'
    : '';

  const userMessage = `以下のチーム編成の推薦理由を説明してください。

【案件情報】
- 案件名: ${job.title}
- 作業種別: ${jobType.nameJa}
- 必要スキル合計: ${jobType.requiredSkillTotal}
- 主要スキル: ${jobType.primarySkills.join(', ')}
- 必要人数: ${jobType.minPersonnel}〜${jobType.maxPersonnel}名

【チームメンバー】
${memberInfo}

【スコア詳細】
- 総合スコア: ${score}
- 内訳: ${breakdownStr}
${stretchNote}`;

  return callClaudeAPI(model, systemPrompt, userMessage);
}

// Evaluate stretch risk for stretch mode assignments
export async function evaluateStretchRisk(
  team,
  job,
  jobType,
  stretchMultiplier
) {
  // Always use Sonnet for risk assessment
  const model = selectModel('sonnet');

  const systemPrompt = `あなたは太陽光発電所のO&M（運用保守）ディスパッチシステムのリスク評価AIです。
ストレッチ配置（通常より高難度の案件への挑戦的配置）のリスクを評価してください。

以下の形式で回答してください:
1. リスクレベル: 「低」「中」「高」のいずれか
2. リスク要因: 箇条書きで2〜3点
3. 推奨対策: 箇条書きで2〜3点
4. 総合判断: 1〜2文で`;

  const memberInfo = team
    .map((m) => {
      const skillEntries = Object.entries(m.skills)
        .map(([k, v]) => `${k}:${v}`)
        .join(', ');
      const flags = [];
      if (m.needsGuidance) flags.push('要指導');
      if (m.employmentType === 'freelancer') flags.push('フリーランス');
      const flagStr = flags.length > 0 ? `[${flags.join(', ')}]` : '';
      return `- ${m.nameJa} ${flagStr}（スキル平均: ${m.avgSkill}、${skillEntries}）`;
    })
    .join('\n');

  const userMessage = `以下のストレッチ配置のリスクを評価してください。

【案件情報】
- 案件名: ${job.title}
- 作業種別: ${jobType.nameJa}
- 必要スキル合計: ${jobType.requiredSkillTotal}
- 主要スキル: ${jobType.primarySkills.join(', ')}
- 基準作業時間: ${jobType.baseTimeHours}時間

【ストレッチ情報】
- ストレッチ倍率: ${stretchMultiplier}x
- 通常スキル要件に対して${Math.round((1 - 1 / stretchMultiplier) * 100)}%低いスキルで配置

【チームメンバー】
${memberInfo}`;

  return callClaudeAPI(model, systemPrompt, userMessage, 1500);
}

// Optimize multi-job same-day scheduling
export async function optimizeMultiJobSchedule(jobs, members, constraints) {
  // Always use Sonnet for complex optimization
  const model = selectModel('sonnet');

  const systemPrompt = `あなたは太陽光発電所のO&M（運用保守）ディスパッチシステムの最適化AIです。
同日に複数の案件がある場合の最適なスケジュール配置を提案してください。

以下を考慮してください:
- 各メンバーの移動時間
- スキル適性と案件要件のマッチング
- 作業時間帯の重複回避
- メンバーの負荷バランス
- 安全管理上の考慮事項

JSON形式で回答してください:
{
  "schedule": [
    {
      "jobId": "案件ID",
      "assignedMembers": ["メンバーID"],
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "notes": "備考"
    }
  ],
  "summary": "最適化の概要説明",
  "warnings": ["注意事項"]
}`;

  const jobInfo = jobs
    .map(
      (j) =>
        `- ${j.title}（種別: ${j.jobTypeName}, 必要人数: ${j.minPersonnel}〜${j.maxPersonnel}名, 作業時間: ${j.estimatedHours}h）`
    )
    .join('\n');

  const memberInfo = members
    .map(
      (m) =>
        `- ${m.nameJa}（ID: ${m.id}, スキル平均: ${m.avgSkill}, 車両: ${m.hasVehicle ? 'あり' : 'なし'}）`
    )
    .join('\n');

  const constraintStr = constraints
    ? `\n【制約条件】\n${constraints}`
    : '';

  const userMessage = `以下の条件で最適なスケジュールを提案してください。

【案件一覧】
${jobInfo}

【利用可能メンバー】
${memberInfo}
${constraintStr}`;

  return callClaudeAPI(model, systemPrompt, userMessage, 2048);
}

export { callClaudeAPI, selectModel, STORAGE_KEY };
