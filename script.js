function startGame() {
    document.getElementById("title-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";

    resetGame();
}
const boardElement = document.getElementById("board");
const statusElement = document.getElementById("status");

const SIZE = 8;

let currentPlayer = 1; // 1=黒,2=白
let board = [];

function resetGame() {
    board = Array(SIZE)
        .fill()
        .map(() => Array(SIZE).fill(0));

    board[3][3] = 2;
    board[3][4] = 1;
    board[4][3] = 1;
    board[4][4] = 2;

    currentPlayer = 1;

    render();
}

function render() {
    boardElement.innerHTML = "";

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {

            const cell = document.createElement("div");
            cell.className = "cell";

            // ★ ここから追加：置けるマスかどうかの判定
            if (board[y][x] === 0) {
                const flipped = getFlips(x, y);
                if (flipped.length > 0) {
                    cell.classList.add("can-place"); // 置けるマスにクラスを付与
                }
            }
            // ★ ここまで追加

            cell.onclick = () => placeDisk(x, y);

            if (board[y][x] !== 0) {
                const disk = document.createElement("div");

                disk.className =
                    "disk " +
                    (board[y][x] === 1 ? "black" : "white");

                cell.appendChild(disk);
            }

            boardElement.appendChild(cell);
        }
    }

    updateStatus();
}

function updateStatus() {
    const black = countDisks(1);
    const white = countDisks(2);

    statusElement.textContent =
        `${currentPlayer === 1 ? "黒" : "白"}のターン | 黒:${black} 白:${white}`;
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

    if (board[y][x] !== 0) return;

    const flipped = getFlips(x, y);

    if (flipped.length === 0) return;

    board[y][x] = currentPlayer;

    flipped.forEach(([fx, fy]) => {
        board[fy][fx] = currentPlayer;
    });

    currentPlayer = currentPlayer === 1 ? 2 : 1;

    render();
}

function getFlips(x, y) {

    const directions = [
        [-1,-1],[0,-1],[1,-1],
        [-1,0],         [1,0],
        [-1,1],[0,1],[1,1]
    ];

    let result = [];

    for (const [dx, dy] of directions) {

        let nx = x + dx;
        let ny = y + dy;

        let temp = [];

        while (
            nx >= 0 &&
            nx < SIZE &&
            ny >= 0 &&
            ny < SIZE
        ) {

            const v = board[ny][nx];

            if (v === 0) {
                temp = [];
                break;
            }

            if (v !== currentPlayer) {
                temp.push([nx, ny]);
            } else {
                break;
            }

            nx += dx;
            ny += dy;
        }

        if (
            nx >= 0 &&
            nx < SIZE &&
            ny >= 0 &&
            ny < SIZE &&
            board[ny][nx] === currentPlayer &&
            temp.length > 0
        ) {
            result.push(...temp);
        }
    }

    return result;
}

resetGame();