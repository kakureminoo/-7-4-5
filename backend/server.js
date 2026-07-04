const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dayjs = require('dayjs');
const { GoogleGenAI } = require('@google/genai');
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
 if (lower.includes('勉強')) return 'まずは1日の最初に基礎を30分、午後に問題演習を30分、夜に復習を30分に分けると回復しやすいです。';
 if (lower.includes('計画')) return `現在の計画では ${plan.subject} の試験まで ${plan.plan.length} 件の学習タスクを組み込んでいます。優先度の高い項目から順に進めるのが効果等です。`;
 return '試験勉強なら、毎日少しずつでも続けることが大切です。まずは今日の予定を1つだけ確実に完了させましょう。';
}


// AI計画生成ロジック
async function buildPlanWithAI(payload) {
 if (!process.env.GEMINI_API_KEY) {
   console.log("Gemini API Keyが見つからないため、固定ロジックで生成します。");
   return buildPlanFallback(payload);
 }


 const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
以下の条件から、1日ごとの具体的な学習計画をJSONフォーマットで作成してください。
各日の「detail（詳細）」には、その範囲に合わせた具体的で実践的な勉強法のアドバイスを記載してください。


【条件】
・科目: ${payload.subject}
・試験日: ${payload.examDate}
・試験範囲: ${payload.scope}
・提出課題: ${payload.taskTitle}
・課題締切: ${payload.taskDeadline}
・1日の学習時間: ${payload.studyHoursPerDay}時間


【出力フォーマット】
必ず以下のJSON構造のみを返してください。
{
 "subject": "${payload.subject}",
 "examDate": "${payload.examDate}",
 "deadline": "${payload.taskDeadline}",
 "summary": "全体の学習方針の要約",
 "plan": [
   {
     "date": "YYYY-MM-DD",
     "title": "やるべきことのタイトル",
     "focus": "その日の重点項目",
     "detail": "具体的でまともな勉強アドバイス",
     "type": "study"
   }
 ]
}
`;


 try {
   const interaction = await ai.interactions.create({
     model: "gemini-3.5-flash",
     input: prompt,
   });


   console.log(interaction.output_text);
   const output_text = interaction.output_text.replace(/```json/g, '').replace(/```/g, '').trim();
   console.log(output_text);
   // ご希望通り、let textの変数を挟まず直接parseへ送ります
   return JSON.parse(output_text);


 } catch (error) {
   console.error("AI計画生成エラー:", error);
   return buildPlanFallback(payload);
 }
}


// 予備（Fallback）ロジック
function buildPlanFallback(payload) {
 const start = dayjs();
 const examDate = dayjs(payload.examDate);
 const deadlineDate = payload.taskDeadline ? dayjs(payload.taskDeadline) : examDate;
 const totalDays = Math.max(1, Math.min(90, examDate.diff(start, 'day') + 1));
 const scopeItems = payload.scope.split(/\n+/).map((item) => item.trim()).filter(Boolean);


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
   summary: `${payload.subject} を ${totalDays} 日で進める学習計画です。`,
 };
}


app.get('/health', (_req, res) => res.json({ ok: true }));


app.get('/api/plans', (_req, res) => {
 db.all('SELECT * FROM plans ORDER BY id DESC LIMIT 10', [], (err, rows) => {
   if (err) return res.status(500).json({ error: err.message });
   res.json(rows);
 });
});


app.post('/api/generate-plan', async (req, res) => {
 try {
   const plan = await buildPlanWithAI(req.body);
   const createdAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
  
   db.run(
     'INSERT INTO plans (created_at, subject, plan_json) VALUES (?, ?, ?)',
     [createdAt, plan.subject, JSON.stringify(plan)],
     (err) => {
       if (err) return res.status(500).json({ error: err.message });
       res.json({ ok: true, plan });
     },
   );
 } catch (error) {
   res.status(500).json({ error: error.message });
 }
});


// チャット機能
app.post('/api/chat', async (req, res) => {
 const { message, plan } = req.body;
 if (!message) return res.status(400).json({ error: 'message is required' });
 if (!process.env.GEMINI_API_KEY) return res.json({ answer: createFallbackAnswer(message, plan) });


 const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });


 try {
   const prompt = `あなたは試験勉強を支援するAIです。短く具体的に、以下の勉強計画に沿って質問に答してください。\n\n現在の学習計画: ${JSON.stringify(plan)}\n\n質問: ${message}`;
   const interaction = await ai.interactions.create({
     model: 'models/gemini-3.5-flash',
     input: prompt,
   });
  
   const lastStep = interaction.steps?.at(-1);
   let text = lastStep?.content?.[0]?.text || lastStep?.text || '回答を取得できませんでした。';
   res.json({ answer: text });
 } catch (error) {
   console.error("AIチャット生成エラー:", error);
   res.json({ answer: createFallbackAnswer(message, plan) });
 }
});


initDb();


app.listen(PORT, () => {
 console.log(`Server running on http://localhost:${PORT}`);
});

