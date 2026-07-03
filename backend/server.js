const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = 3001;
const SIZE = 8;
const DIRECTIONS = [
  [-1,-1],[0,-1],[1,-1],
  [-1,0],         [1,0],
  [-1,1],[0,1],[1,1]
];

const POSITION_WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, 0, 0, 0, 0, -2, 10],
  [5, -2, 0, 0, 0, 0, -2, 5],
  [5, -2, 0, 0, 0, 0, -2, 5],
  [10, -2, 0, 0, 0, 0, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100]
];

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

function scoreMove(move) {
  const weight = POSITION_WEIGHTS[move.y][move.x] || 0;
  return move.flips.length * 5 + weight;
}

function chooseBestMove(moves) {
  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {
    const score = scoreMove(move);
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

app.post("/api/ai-move", (req, res) => {
  const { board, aiPlayer } = req.body;
  const player = aiPlayer === 1 ? 1 : 2;

  if (!Array.isArray(board) || board.length !== SIZE) {
    return res.status(400).json({ error: "不正な盤面データです" });
  }

  const validMoves = getValidMoves(board, player);

  if (validMoves.length === 0) {
    return res.status(400).json({ error: "AIが置ける場所がありません" });
  }

  const move = chooseBestMove(validMoves);

  res.json({
    x: move.x,
    y: move.y,
    aiPlayer: player,
    message: "AIが手を決めました"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});