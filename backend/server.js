const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// 動作確認用
app.get("/", (req, res) => {
  res.send("Othello AI API is running");
});

// ダミーAI
app.post("/api/ai-move", (req, res) => {
  const { board, validMoves, aiPlayer } = req.body;

  if (!board || !validMoves || validMoves.length === 0) {
    return res.status(400).json({
      error: "AIが置ける場所がありません",
    });
  }

  // 今はランダムに1つ選ぶ
  const randomIndex = Math.floor(Math.random() * validMoves.length);
  const move = validMoves[randomIndex];

  res.json({
    x: move.x,
    y: move.y,
    aiPlayer,
    message: "ダミーAIが手を選びました",
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});