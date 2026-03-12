"use client";

import { useEffect, useState } from "react";

type Cell = "X" | "O" | null;

const WIN_LINES: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

function getWinner(board: Cell[]): "X" | "O" | null {
    for (const [a, b, c] of WIN_LINES) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            return board[a];
        }
    }

    return null;
}

function findFinisher(board: Cell[], symbol: "X" | "O"): number | null {
    for (const line of WIN_LINES) {
        const values = line.map((index) => board[index]);
        const ownCount = values.filter((value) => value === symbol).length;
        const emptyCells = line.filter((index) => board[index] === null);
        if (ownCount === 2 && emptyCells.length === 1) {
            return emptyCells[0];
        }
    }

    return null;
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickBotMove(board: Cell[]): number {
    const openMoves = board
        .map((value, index) => (value === null ? index : -1))
        .filter((index) => index !== -1);

    if (openMoves.length === 0) {
        return -1;
    }

    const winningMove = findFinisher(board, "O");
    if (winningMove !== null && Math.random() < 0.55) {
        return winningMove;
    }

    const blockMove = findFinisher(board, "X");
    if (blockMove !== null && Math.random() < 0.45) {
        return blockMove;
    }

    if (board[4] === null && Math.random() < 0.35) {
        return 4;
    }

    const cornerMoves = [0, 2, 6, 8].filter((index) => board[index] === null);
    if (cornerMoves.length > 0 && Math.random() < 0.5) {
        return cornerMoves[randomInt(0, cornerMoves.length - 1)];
    }

    return openMoves[randomInt(0, openMoves.length - 1)];
}

export default function MiniTicTacToe() {
    const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
    const [turn, setTurn] = useState<"player" | "bot">("player");
    const [stats, setStats] = useState({ player: 0, bot: 0, draws: 0 });

    const winner = getWinner(board);
    const isDraw = !winner && board.every((cell) => cell !== null);
    const roundOver = winner !== null || isDraw;
    const botThinking = turn === "bot" && !roundOver;

    useEffect(() => {
        if (turn !== "bot" || roundOver) {
            return;
        }

        const timer = window.setTimeout(() => {
            const move = pickBotMove(board);
            if (move < 0) {
                setTurn("player");
                return;
            }

            const nextBoard = [...board];
            nextBoard[move] = "O";
            const botWinner = getWinner(nextBoard);
            const botDraw = !botWinner && nextBoard.every((cell) => cell !== null);

            setBoard(nextBoard);

            if (botWinner === "O") {
                setStats((prev) => ({ ...prev, bot: prev.bot + 1 }));
            } else if (botDraw) {
                setStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
            }

            setTurn("player");
        }, randomInt(350, 700));

        return () => {
            window.clearTimeout(timer);
        };
    }, [turn, roundOver, board]);

    function handleCellClick(index: number) {
        if (turn !== "player" || board[index] !== null || roundOver) {
            return;
        }

        const nextBoard = [...board];
        nextBoard[index] = "X";
        const playerWinner = getWinner(nextBoard);
        const playerDraw = !playerWinner && nextBoard.every((cell) => cell !== null);

        setBoard(nextBoard);

        if (playerWinner === "X") {
            setStats((prev) => ({ ...prev, player: prev.player + 1 }));
            return;
        }

        if (playerDraw) {
            setStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
            return;
        }

        setTurn("bot");
    }

    function resetRound() {
        setBoard(Array(9).fill(null));
        setTurn("player");
    }

    const statusText = winner === "X"
        ? "You won this round."
        : winner === "O"
            ? "Bot wins this round."
            : isDraw
                ? "Draw round."
                : botThinking
                    ? "Bot is thinking..."
                    : "Your turn.";

    return (
        <div className="rounded-2xl border-[4px] border-black bg-gradient-to-br from-cyan-100 via-white to-blue-100 p-3 shadow-[6px_6px_0px_0px_#000]">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-black uppercase tracking-wide text-comic-ink">Tic-Tac-Toe</h3>
                <span className="rounded-full border-2 border-black bg-comic-yellow px-3 py-1 text-xs font-black uppercase">
                    Easy Bot
                </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border-2 border-black bg-comic-blue px-2 py-1 text-xs font-black text-white">
                    You: {stats.player}
                </div>
                <div className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-black text-gray-700">
                    Draw: {stats.draws}
                </div>
                <div className="rounded-lg border-2 border-black bg-comic-red px-2 py-1 text-xs font-black text-white">
                    Bot: {stats.bot}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                {board.map((cell, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => handleCellClick(index)}
                        disabled={cell !== null || roundOver || turn !== "player"}
                        className={`aspect-square rounded-xl border-[3px] border-black text-2xl font-black transition-all ${cell === "X"
                            ? "bg-comic-blue text-white"
                            : cell === "O"
                                ? "bg-comic-red text-white"
                                : "bg-white text-gray-700 hover:bg-yellow-100"} disabled:cursor-not-allowed disabled:opacity-90`}
                    >
                        {cell || ""}
                    </button>
                ))}
            </div>

            <p className="mt-3 rounded-lg border-2 border-black bg-white px-3 py-2 text-center text-sm font-bold text-gray-700">
                {statusText}
            </p>

            <button
                type="button"
                onClick={resetRound}
                className="mt-3 w-full rounded-lg border-[3px] border-black bg-comic-green px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000]"
            >
                New Round
            </button>
        </div>
    );
}
