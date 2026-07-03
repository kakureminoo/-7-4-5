const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 3001;
const SIZE = 8;
const DIRECTIONS = [
  [-1,-1],[0,-1],[1,-1],
  [-1,0],         [1,0],
  [-1,1],[0,1],[1,1]
];

// Gemini API の初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Othello AI API is running");
});

function getFlips(board, x, y, player) {
  if (board[y][x] !== 0) return [];

  const result = [];

  for (const [dx, dy] of DIRECTIONS) {
    let nx = x + dx;
    let ny = y + dy;
    const temp = [];

    while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) {
      const cell = board[ny][nx];
      if (cell === 0) {
        break;
      }
      if (cell !== player) {
        temp.push([nx, ny]);
      } else {
        if (temp.length > 0) {
          result.push(...temp);
        }
        break;
      }
      nx += dx;
      ny += dy;
    }
  }

  return result;
}

function getValidMoves(board, player) {
  const moves = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const flips = getFlips(board, x, y, player);
      if (flips.length > 0) {
        moves.push({ x, y, flips });
      }
    }
  }
  return moves;
}

function describeBoardState(board, player, validMoves) {
  const playerName = player === 1 ? "Black (1)" : "White (2)";
  const opponentName = player === 1 ? "White (2)" : "Black (1)";
  
  let description = `Player: ${playerName}\n\nBoard (8x8):\n`;
  
  // ボード表示
  for (let y = 0; y < SIZE; y++) {
    let row = "";
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === 0) row += ". ";
      else if (board[y][x] === 1) row += "B ";
      else row += "W ";
    }
    description += row + "\n";
  }
  
  // 駒の数をカウント
  const blackCount = board.flat().filter(c => c === 1).length;
  const whiteCount = board.flat().filter(c => c === 2).length;
  
  description += `\nScore: Black=${blackCount}, White=${whiteCount}\n`;
  
  description += `\nYou can place at: ${validMoves.map(m => `(${m.x},${m.y})-flips:${m.flips.length}`).join(", ")}\n`;
  
  return description;
}

app.post("/api/ai-move", async (req, res) => {
  const { board, aiPlayer } = req.body;
  const player = aiPlayer === 1 ? 1 : 2;

  if (!Array.isArray(board) || board.length !== SIZE) {
    return res.status(400).json({ error: "不正な盤面データです" });
  }

  const validMoves = getValidMoves(board, player);

  if (validMoves.length === 0) {
    return res.status(400).json({ error: "AIが置ける場所がありません" });
  }

  try {
    // Gemini APIに盤面を説明して、最適手を判断させる
    const boardDescription = describeBoardState(board, player, validMoves);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
You are playing Othello (Reversi) as the ${player === 1 ? "Black (1)" : "White (2)"} player.

Current board state:
${boardDescription}

Valid moves available: ${validMoves.map(m => `[${m.x},${m.y}]`).join(", ")}

Analyze the board and choose the BEST move. Consider:
1. Maximize the number of opponent pieces flipped
2. Prefer corner positions (0,0), (0,7), (7,0), (7,7)
3. Avoid edge positions near corners
4. Strategic positioning

Respond with ONLY the coordinate in format: x,y
Example: 2,3

Your move:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();
    
    // レスポンスからx,yを抽出
    const match = text.match(/(\d+),(\d+)/);
    if (!match) {
      throw new Error("Invalid response format from Gemini");
    }

    const [, xStr, yStr] = match;
    const x = parseInt(xStr);
    const y = parseInt(yStr);

    // 返答が有効か確認
    if (!validMoves.find(m => m.x === x && m.y === y)) {
      throw new Error("Gemini returned invalid move");
    }

    res.json({
      x,
      y,
      aiPlayer: player,
      message: "Geminiが手を決めました"
    });
  } catch (error) {
    console.error("Gemini API error:", error);
    // フォールバック：ランダムで置ける場所を選ぶ
    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    res.json({
      x: randomMove.x,
      y: randomMove.y,
      aiPlayer: player,
      message: "フォールバック: ランダムな手"
    });
  }
});

app.listen(PORT, () => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  警告: GEMINI_API_KEY が設定されていません");
    console.warn("https://aistudio.google.com/app/apikeys でAPIキーを取得してください");
    console.warn(".env ファイルに以下を追加してください:");
    console.warn("GEMINI_API_KEY=あなたのキー");
  }
  console.log(`Server running on http://localhost:${PORT}`);
});