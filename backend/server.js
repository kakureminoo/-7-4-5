const express = require('express');
const cors = require('cors');
const dayjs = require('dayjs');
const { GoogleGenAI } = require('@google/genai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function extractJsonText(text) {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}

async function generateGeminiText(prompt) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
}

function normalizePlanDetails(plan) {
  return {
    ...plan,
    plan: Array.isArray(plan.plan)
      ? plan.plan.map((item) => {
          const details = Array.isArray(item.details)
            ? item.details
                .map((detail) => String(detail).trim())
                .filter(Boolean)
            : String(item.detail || '')
                .split(/\n+/)
                .map((detail) => detail.replace(/^・/, '').trim())
                .filter(Boolean);

          if (details.length % 2 === 1) {
            details.push('');
          }

          return {
            ...item,
            detail: String(item.detail || ''),
            details,
          };
        })
      : [],
  };
}

function createFallbackAnswer(message, plan) {
  const lower = message.toLowerCase();

  if (lower.includes('勉強')) {
    return 'まずは1日の最初に基礎を30分、午後に問題演習を30分、夜に復習を30分に分けると進めやすいです。';
  }

  if (lower.includes('計画') && plan) {
    return `現在の計画では ${plan.subject} の試験まで ${plan.plan.length} 件の学習タスクを組み込んでいます。優先度の高い項目から順に進めるのが効果的です。`;
  }

  return '試験勉強なら、毎日少しずつでも続けることが大切です。まずは今日の予定を1つだけ確実に完了させましょう。';
}

// AI計画生成ロジック
async function buildPlanWithAI(payload) {
  if (!process.env.GEMINI_API_KEY) {
    console.log('Gemini API Keyが見つからないため、固定ロジックで生成します。');
    return buildPlanFallback(payload);
  }

  const prompt = `
以下の条件から、1日ごとの具体的な学習計画をJSONフォーマットで作成してください。
各日の予定は、画面側で箇条書き表示できるように details 配列で返してください。

【details のルール】
・details は必ず配列にしてください。
・details は [やること, アドバイス, やること, アドバイス] の順番にしてください。
・details の要素数は必ず偶数にしてください。
・1つの「やること」に対して、次の要素に短いアドバイスを書いてください。
・やることはページ数や問題数がわかる具体的な行動にしてください。
・アドバイスは一言で、やるときのコツや注意点を書いてください。
・1つの要素に複数分野をまとめて書くことは禁止です。
・「単語は〜。文法は〜。」のような説明文は禁止です。
・detail には details 全体を短くまとめた予備文だけを書いてください。

良い例:
"details": [
  "単語p.1-20を音読する",
  "意味を隠して即答できるか確認する",
  "文法p.1-10の例題を解く",
  "間違えた問題だけ解説を読み直す"
]

悪い例:
"details": [
  "単語p.1-20、文法p.1-10、長文p.1-5",
  "単語は音読し意味を確認。文法は例題を解く。"
]

【条件】
・科目: ${payload.subject}
・試験日: ${payload.examDate}
・試験範囲: ${payload.scope}
・提出課題: ${payload.taskTitle || 'なし'}
・課題締切: ${payload.taskDeadline || payload.examDate}
・1日の学習時間: ${payload.studyHoursPerDay || 2}時間

【ルール】
・今日の日付: ${dayjs().format('YYYY-MM-DD')}
・計画は必ず今日の日付から開始してください。
・計画は必ず今日の日付から試験日 ${payload.examDate} までの範囲で作成してください。
・長くても1か月以内の計画にしてください。
・各予定の date は YYYY-MM-DD 形式にしてください。
・JSON以外の文章やMarkdownは返さないでください。
・details が空の予定を作らないでください。

【出力フォーマット】
{
  "subject": "${payload.subject}",
  "examDate": "${payload.examDate}",
  "deadline": "${payload.taskDeadline || payload.examDate}",
  "summary": "全体の学習方針の要約",
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "title": "やるべきことのタイトル",
      "focus": "その日の重点項目",
      "detail": "今日の学習内容の短い予備説明",
      "details": [
        "問題集p.12-15を解く",
        "間違えた問題には印をつける",
        "重要語句を10個覚える",
        "赤シートで即答できるか確認する"
      ],
      "type": "study"
    }
  ]
}
`;

  try {
    const text = await generateGeminiText(prompt);
    console.log('Gemini raw plan response:', text);

    const outputText = extractJsonText(text);
    const parsedPlan = JSON.parse(outputText);
    return normalizePlanDetails(parsedPlan);
  } catch (error) {
    console.error('AI計画生成エラー:', error.message);
    return buildPlanFallback(payload);
  }
}

// 予備Fallbackロジック
function buildPlanFallback(payload) {
  const start = dayjs();
  const examDate = dayjs(payload.examDate);
  const deadlineDate = payload.taskDeadline ? dayjs(payload.taskDeadline) : examDate;

  const totalDays = Math.max(
    1,
    Math.min(90, examDate.diff(start, 'day') + 1)
  );

  const scopeItems = (payload.scope || '')
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const studyHours = Number(payload.studyHoursPerDay || 2);
  const topicCount = Math.max(scopeItems.length, 3);
  const dailySlots = Math.min(totalDays, Math.max(7, topicCount + 3));
  const plan = [];

  for (let index = 0; index < dailySlots; index += 1) {
    const currentDate = start.add(index, 'day').format('YYYY-MM-DD');
    const topic = scopeItems[index % Math.max(scopeItems.length, 1)] || '総復習';

    plan.push({
      date: currentDate,
      title: `${payload.subject} の学習`,
      focus: topic,
      detail: `${studyHours}時間の学習プラン。要点の整理と問題演習をセットで行います。`,
      details: [
        `${topic}の要点を整理する`,
        `${studyHours}時間を目安に、重要な部分をノートにまとめる`,
        `${topic}の問題演習を行う`,
        '間違えた問題だけ印をつけて復習する',
      ],
      type: 'study',
    });
  }

  if (payload.taskTitle) {
    plan.push({
      date: deadlineDate.format('YYYY-MM-DD'),
      title: payload.taskTitle,
      focus: '提出課題',
      detail: '締切に合わせて仕上げる。必要なら最後に見直しを入れます。',
      details: [
        payload.taskTitle,
        '締切に間に合うように仕上げ、最後に見直しを入れる',
      ],
      type: 'task',
    });
  }

  plan.sort((a, b) => a.date.localeCompare(b.date));

  return {
    subject: payload.subject,
    examDate: examDate.format('YYYY-MM-DD'),
    deadline: deadlineDate.format('YYYY-MM-DD'),
    plan,
    summary: `${payload.subject} を ${totalDays} 日で進める学習計画です。`,
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// 保存済み計画の取得
app.get('/api/plans', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 学習計画生成 + Supabase保存
app.post('/api/generate-plan', async (req, res) => {
  try {
    const plan = await buildPlanWithAI(req.body);

    const { error } = await supabase
      .from('plans')
      .insert([
        {
          subject: plan.subject,
          plan_json: plan,
        },
      ]);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true, plan });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// チャット機能
app.post('/api/chat', async (req, res) => {
  const { message, plan } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      source: 'fallback',
      answer: createFallbackAnswer(message, plan),
    });
  }

  try {
    const prompt = `
あなたは試験勉強を支援するAIです。
短く具体的に、以下の勉強計画に沿って質問に答えてください。

現在の学習計画:
${JSON.stringify(plan)}

質問:
${message}
`;

    const text = await generateGeminiText(prompt);

    res.json({
      source: 'gemini',
      answer: text || '回答を取得できませんでした。',
    });
  } catch (error) {
    console.error('AIチャット生成エラー:', error.message);

    res.json({
      source: 'fallback',
      reason: error.message,
      answer: createFallbackAnswer(message, plan),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
