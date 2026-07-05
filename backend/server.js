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

function normalizeDetails(item) {
  if (Array.isArray(item.details)) {
    const details = item.details
      .map((detail) => String(detail).trim())
      .filter(Boolean);

    return details.length % 2 === 0 ? details : [...details, ''];
  }

  if (Array.isArray(item.tasks)) {
    return item.tasks.flatMap((task) => [
      String(task.todo || '').trim(),
      String(task.advice || '').trim(),
    ]).filter(Boolean);
  }

  const details = String(item.detail || '')
    .split(/\n+/)
    .map((detail) => detail.replace(/^・/, '').trim())
    .filter(Boolean);

  return details.length % 2 === 0 ? details : [...details, ''];
}

function normalizePlanDetails(plan) {
  return {
    ...plan,
    plan: Array.isArray(plan.plan)
      ? plan.plan.map((item) => ({
          ...item,
          detail: String(item.detail || ''),
          details: normalizeDetails(item),
        }))
      : [],
  };
}

function createFallbackAnswer(message, plan) {
  const lower = message.toLowerCase();

  if (lower.includes('勉強')) {
    return 'まずは今日の予定を1つ選び、やることを短い時間で区切って進めるのがおすすめです。';
  }

  if (lower.includes('計画') && plan) {
    return `現在の計画では、${plan.subject}の予定が${plan.plan.length}件あります。苦手な範囲から優先すると進めやすいです。`;
  }

  return '試験勉強は、毎日少しずつ続けることが大切です。今日の予定を1つずつ確実に終わらせましょう。';
}

async function buildPlanWithAI(payload) {
  if (!process.env.GEMINI_API_KEY) {
    console.log('Gemini API key was not found. Using fallback plan.');
    return buildPlanFallback(payload);
  }

  const prompt = `
以下の条件から、1日ごとの具体的な学習計画をJSONだけで作成してください。


【重要】
各日の予定は必ず details 配列で返してください。
details は [やること, アドバイス, やること, アドバイス] の順番にしてください。
details の要素数は必ず偶数にしてください。

【details の書き方】
・やること: ページ数や問題数がわかる具体的な行動を書く
・アドバイス: その行動を進めるときの短いコツを書く
・1つのやることに複数分野をまとめない
・「単語は〜。文法は〜。」のような説明文にしない
・detail は予備表示用の短い説明だけにする

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
・試験範囲:
${payload.scope}
・提出課題: ${payload.taskTitle || 'なし'}
・課題締切: ${payload.taskDeadline || payload.examDate}
・1日の学習時間: ${payload.studyHoursPerDay || 2}時間

【ルール】
・今日の日付: ${dayjs().format('YYYY-MM-DD')}
・計画は今日の日付から始める
・計画は試験日 ${payload.examDate} までの範囲で作成する
・長くても1か月以内の計画にする
・各予定の date は YYYY-MM-DD 形式にする
・JSON以外の文章やMarkdownは返さない

【出力フォーマット】
{
  "subject": "${payload.subject}",
  "examDate": "${payload.examDate}",
  "deadline": "${payload.taskDeadline || payload.examDate}",
  "summary": "全体の学習方針の要約",
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "title": "今日の学習",
      "focus": "その日の重点項目",
      "detail": "今日の学習内容の短い説明",
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

function buildPlanFallback(payload) {
  const start = dayjs();
  const examDate = dayjs(payload.examDate);
  const deadlineDate = payload.taskDeadline ? dayjs(payload.taskDeadline) : examDate;

  const totalDays = Math.max(
    1,
    Math.min(31, examDate.diff(start, 'day') + 1)
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
      title: `${payload.subject}の学習`,
      focus: topic,
      detail: `${studyHours}時間を目安に、要点整理と問題演習を行います。`,
      details: [
        `${topic}の要点を整理する`,
        '重要な語句や公式をノートにまとめる',
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
      detail: '締切に合わせて仕上げます。',
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
    summary: `${payload.subject}を${totalDays}日で進める学習計画です。`,
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

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
