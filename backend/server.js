const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dayjs = require('dayjs');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'data', 'study-planner.sqlite');

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('DB connection failed', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

function initDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL,
        subject TEXT NOT NULL,
        plan_json TEXT NOT NULL
      )
    `);
  });
}

function createFallbackAnswer(message, plan) {
  const lower = message.toLowerCase();
  if (lower.includes('勉強')) {
    return 'まずは1日の最初に基礎を30分、午後に問題演習を30分、夜に復習を30分に分けると回復しやすいです。';
  }
  if (lower.includes('計画')) {
    return `現在の計画では ${plan.subject} の試験まで ${plan.plan.length} 件の学習タスクを組み込んでいます。優先度の高い項目から順に進めるのが効果的です。`;
  }
  return '試験勉強なら、毎日少しずつでも続けることが大切です。まずは今日の予定を1つだけ確実に完了させましょう。';
}

function buildPlan(payload) {
  const start = dayjs();
  const examDate = dayjs(payload.examDate);
  const deadlineDate = payload.taskDeadline ? dayjs(payload.taskDeadline) : examDate;
  const totalDays = Math.max(1, Math.min(90, examDate.diff(start, 'day') + 1));
  const scopeItems = payload.scope
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
      type: 'study',
    });
  }

  if (payload.taskTitle) {
    plan.push({
      date: deadlineDate.format('YYYY-MM-DD'),
      title: payload.taskTitle,
      focus: '提出課題',
      detail: '締切に合わせて仕上げる。必要なら最後に見直しを入れます。',
      type: 'task',
    });
  }

  plan.sort((a, b) => a.date.localeCompare(b.date));

  return {
    subject: payload.subject,
    examDate: examDate.format('YYYY-MM-DD'),
    deadline: deadlineDate.format('YYYY-MM-DD'),
    plan,
    summary: `${payload.subject} を ${totalDays} 日で進める学習計画です。${scopeItems.length} つの範囲を分割して、毎日 ${studyHours} 時間学習する形にしています。`,
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/plans', (_req, res) => {
  db.all('SELECT * FROM plans ORDER BY id DESC LIMIT 10', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/generate-plan', (req, res) => {
  const plan = buildPlan(req.body);
  const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
  db.run(
    'INSERT INTO plans (created_at, subject, plan_json) VALUES (?, ?, ?)',
    [createdAt, plan.subject, JSON.stringify(plan)],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ ok: true, plan });
    },
  );
});

app.post('/api/chat', async (req, res) => {
  const { message, plan } = req.body;
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.json({ answer: createFallbackAnswer(message, plan) });
    return;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'あなたは試験勉強を支援するAIです。短く具体的に、勉強計画に沿って助言してください。',
        },
        {
          role: 'user',
          content: `質問: ${message}\n\n現在の学習計画: ${JSON.stringify(plan)}`,
        },
      ],
      temperature: 0.7,
    });

    const answer = completion.choices[0]?.message?.content || '回答が取得できませんでした。';
    res.json({ answer });
  } catch (error) {
    res.json({ answer: createFallbackAnswer(message, plan) });
  }
});

app.post('/api/excuse-breaker', async (req, res) => {
  const { task, obstacles } = req.body;

  if (!task || !obstacles) {
    res.status(400).json({ error: 'task and obstacles are required' });
    return;
  }

  console.log('--- /api/excuse-breaker called ---');
  console.log('task:', task);
  console.log('has api key:', !!process.env.OPENAI_API_KEY);

  if (!process.env.OPENAI_API_KEY) {
    res.json({
      source: 'fallback',
      result: createFallbackExcuseBreaker(task, obstacles),
    });
    return;
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'あなたは学習を支援するコーチです。ユーザーの言いわけや障害を責めずに受け止め、現実的で短い行動提案に変換してください。精神論ではなく、今すぐできる小さな一歩を提案してください。',
        },
        {
          role: 'user',
          content: `
やること:
${task}

障害:
${obstacles}

出力形式:
以下のJSON形式だけで返してください。

{
  "task": "やること",
  "summary": "短いまとめ",
  "responses": [
    {
      "obstacle": "障害",
      "reply": "その障害を乗り越えるための短い提案"
    }
  ]
}
`,
        },
      ],
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content || '';

    let result;
    try {
      result = JSON.parse(text);
    } catch (_parseError) {
      result = createFallbackExcuseBreaker(task, obstacles);
    }

    res.json({
      source: 'openai',
      result,
    });
  } catch (error) {
    console.error('OpenAI excuse-breaker error:', error.message);

    res.json({
      source: 'fallback',
      reason: error.message,
      result: createFallbackExcuseBreaker(task, obstacles),
    });
  }
});

initDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

function createFallbackExcuseBreaker(task, obstacles) {
  const lines = obstacles
    .split(/\n+/)
    .map((line) => line.replace(/^・/, '').trim())
    .filter(Boolean);

  const responses = lines.map((obstacle) => {
    if (obstacle.includes('やる気')) {
      return {
        obstacle,
        reply: 'まずは1分だけ始めてみましょう。やる気は始めた後に出ることが多いです。',
      };
    }

    if (obstacle.includes('今日') || obstacle.includes('明日')) {
      return {
        obstacle,
        reply: '今日やらなくても大丈夫かもしれませんが、1分だけでも進めると明日の自分が確実に楽になります。',
      };
    }

    if (obstacle.includes('理解') || obstacle.includes('わからない') || obstacle.includes('難しい')) {
      return {
        obstacle,
        reply: '完璧に理解しようとせず、まず一度範囲を一周してみましょう。わからない場所を見つけるだけでも前進です。',
      };
    }

    if (obstacle.includes('他') || obstacle.includes('忙しい')) {
      return {
        obstacle,
        reply: `そのことと「${task}」の優先順位を比べて、今どちらに取り組むべきか決めましょう。`,
      };
    }

    if (obstacle.includes('予定')) {
      return {
        obstacle,
        reply: '予定の前、または終わった後に5〜10分だけ取り組める時間がないか考えてみましょう。',
      };
    }

    return {
      obstacle,
      reply: `「${task}」を全部やろうとせず、まず最初の1ステップだけに分解して始めてみましょう。`,
    };
  });

  return {
    task,
    responses,
    summary: `「${task}」に対する障害を、今すぐできる小さな行動に変換しました。`,
  };
}