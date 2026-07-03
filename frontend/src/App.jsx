async function fetchAIMove(board, validMoves, aiPlayer) {
  const response = await fetch("http://localhost:3001/api/ai-move", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      board,
      validMoves,
      aiPlayer,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "AIの手を取得できませんでした");
  }

  return data;
}