const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");

const SIZE = 8;
const HUMAN_PLAYER = 1;
const AI_PLAYER = 2;
const DIRECTIONS = [
    [-1,-1],[0,-1],[1,-1],
    [-1,0],         [1,0],
    [-1,1],[0,1],[1,1]
];

let currentPlayer = HUMAN_PLAYER;
let board = [];

function startGame() {
    document.getElementById("title-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";

    resetGame();
}

function resetGame() {
    board = Array(SIZE)
        .fill()
        .map(() => Array(SIZE).fill(0));

    board[3][3] = 2;
    board[3][4] = 1;
    board[4][3] = 1;
    board[4][4] = 2;

    currentPlayer = HUMAN_PLAYER;

    render();
    handleNextTurn();
}

function render() {
    boardElement.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const cell = document.createElement("div");
            cell.className = "cell";

            if (board[y][x] === 0) {
                const flipped = getFlips(x, y, currentPlayer);
                if (flipped.length > 0 && currentPlayer === HUMAN_PLAYER) {
                    cell.classList.add("can-place");
                }
            }

            cell.onclick = () => placeDisk(x, y);

            if (board[y][x] !== 0) {
                const disk = document.createElement("div");
                disk.className = "disk " + (board[y][x] === HUMAN_PLAYER ? "black" : "white");
                cell.appendChild(disk);
            }

            boardElement.appendChild(cell);
        }
    }

    boardElement.style.pointerEvents = currentPlayer === AI_PLAYER ? "none" : "auto";
    updateStatus();
}

function updateStatus() {
    const black = countDisks(HUMAN_PLAYER);
    const white = countDisks(AI_PLAYER);

    if (isGameOver()) {
        const result = black === white
            ? "引き分けです"
            : black > white
                ? "黒の勝ちです"
                : "白の勝ちです";

        statusElement.textContent = `${result} | 黒:${black} 白:${white}`;
        return;
    }

    if (currentPlayer === AI_PLAYER) {
        statusElement.textContent = `白（AI）が考えています... | 黒:${black} 白:${white}`;
    } else {
        statusElement.textContent = `黒のターン | 黒:${black} 白:${white}`;
    }
}

function countDisks(color) {
    let count = 0;
    for (let row of board) {
        for (let cell of row) {
            if (cell === color) count++;
        }
    }
    return count;
}

function placeDisk(x, y) {
    if (currentPlayer !== HUMAN_PLAYER) return;
    if (board[y][x] !== 0) return;

    const flipped = getFlips(x, y, currentPlayer);
    if (flipped.length === 0) return;

    applyMove(x, y, currentPlayer, flipped);
    currentPlayer = AI_PLAYER;
    render();
    handleNextTurn();
}

function applyMove(x, y, player, flips) {
    board[y][x] = player;
    flips.forEach(([fx, fy]) => {
        board[fy][fx] = player;
    });
}

function getFlips(x, y, player) {
    if (board[y][x] !== 0) return [];

    let result = [];

    for (const [dx, dy] of DIRECTIONS) {
        let nx = x + dx;
        let ny = y + dy;
        let temp = [];

        while (
            nx >= 0 && nx < SIZE &&
            ny >= 0 && ny < SIZE
        ) {
            const v = board[ny][nx];
            if (v === 0) {
                temp = [];
                break;
            }
            if (v !== player) {
                temp.push([nx, ny]);
            } else {
                break;
            }
            nx += dx;
            ny += dy;
        }

        if (
            nx >= 0 && nx < SIZE &&
            ny >= 0 && ny < SIZE &&
            board[ny][nx] === player &&
            temp.length > 0
        ) {
            result.push(...temp);
        }
    }

    return result;
}

function getValidMoves(player) {
    const moves = [];
    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const flips = getFlips(x, y, player);
            if (flips.length > 0) {
                moves.push({ x, y, flips });
            }
        }
    }
    return moves;
}

function hasValidMove(player) {
    return getValidMoves(player).length > 0;
}

function isGameOver() {
    return !hasValidMove(HUMAN_PLAYER) && !hasValidMove(AI_PLAYER);
}

async function handleNextTurn() {
    if (isGameOver()) {
        render();
        return;
    }

    if (!hasValidMove(currentPlayer)) {
        currentPlayer = currentPlayer === HUMAN_PLAYER ? AI_PLAYER : HUMAN_PLAYER;
        if (!hasValidMove(currentPlayer)) {
            render();
            return;
        }
    }

    render();

    if (currentPlayer === AI_PLAYER) {
        await runAIMove();
    }
}

async function runAIMove() {
    const validMoves = getValidMoves(AI_PLAYER);
    if (validMoves.length === 0) {
        currentPlayer = HUMAN_PLAYER;
        render();
        return;
    }

    try {
        const response = await fetch("http://localhost:3001/api/ai-move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ board, aiPlayer: AI_PLAYER })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "AIの手を取得できませんでした");
        }

        const move = validMoves.find(m => m.x === data.x && m.y === data.y);
        if (!move) {
            throw new Error("AIが返した手が無効です");
        }

        applyMove(move.x, move.y, AI_PLAYER, move.flips);
    } catch (error) {
        console.error(error);
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        applyMove(randomMove.x, randomMove.y, AI_PLAYER, randomMove.flips);
    }

    currentPlayer = HUMAN_PLAYER;
    render();
    handleNextTurn();
}

resetGame();