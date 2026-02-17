"use client";

import { useState, useEffect, useRef, useReducer, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import Sidebar from "@/components/Sidebar";
import toast from "react-hot-toast";
import { useSound } from "@/hooks/useSound";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import type { LearningProfile, PerformanceHistory } from "@/lib/adaptiveEngine";

const WAITING_GIFS = [
    "https://i.giphy.com/media/eeL8EcBBTwSMLACw6F/200w.gif",
    "https://i.giphy.com/media/z4lwT4QTkK3sYITR7Z/200w.gif",
    "https://i.giphy.com/media/3y0oCOkdKKRi0/200w.gif",
    "https://i.giphy.com/media/tlv0osk8muiDtDl2Wx/200w.gif",
    "https://i.giphy.com/media/zOvBKUUEERdNm/200w.gif",
    "https://i.giphy.com/media/HfFccPJv7a9k4/200w.gif",
    "https://i.giphy.com/media/3oKIPf1BaBDILVxbYA/200w.gif",
];

const LOADING_MESSAGES = [
    "Wait... calibrating your learning style engine.",
    "Wait a moment, building your mission map.",
    "Hold up, tuning your difficulty level.",
    "Do not go anywhere, adding examples and visuals.",
    "Hold up, crafting quiz questions.",
    "Wait... matching lessons to your profile.",
    "Wait a sec, organizing the learning path.",
    "Do not go anywhere, final checks in progress.",
];

const LOADING_VOICE_MESSAGES = [
    "Course generation has started.",
    "Please do not close or refresh the page",
    "It may take a bit longer when our API is free tier and handling high demand.",
    "Please wait. We are generating a high quality course based on your learning profile.",
    "We are finalizing your lessons, quizzes, and media now.",
];

const randomInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min: number, max: number) =>
    Math.random() * (max - min) + min;

const hasYouTubeVideoInEveryLesson = (course: unknown): boolean => {
    if (!course || typeof course !== "object") return false;
    const maybeCourse = course as {
        lessons?: Array<{ visualAssets?: Array<{ type?: string; url?: string }> }>;
    };
    const lessons = maybeCourse.lessons;
    if (!Array.isArray(lessons) || lessons.length === 0) return false;

    return lessons.every((lesson) =>
        (lesson.visualAssets || []).some((asset) => {
            if (asset?.type !== "video") return false;
            return /(?:youtube\.com|youtu\.be)/i.test(String(asset.url || ""));
        })
    );
};

type TicTacToeCell = "X" | "O" | null;

type TetrisBoard = number[][];

type TetrisPieceTemplate = {
    shape: number[][];
    colorId: number;
};

type TetrisPiece = TetrisPieceTemplate & {
    x: number;
    y: number;
};

type TetrisState = {
    board: TetrisBoard;
    piece: TetrisPiece;
    nextTemplate: TetrisPieceTemplate;
    score: number;
    lines: number;
    level: number;
    gameOver: boolean;
};

type TetrisAction =
    | { type: "tick" }
    | { type: "softDrop" }
    | { type: "move"; dx: number }
    | { type: "rotate" }
    | { type: "drop" }
    | { type: "reset" };

const TTT_WIN_LINES: number[][] = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
];

const getTicTacToeWinner = (board: TicTacToeCell[]): "X" | "O" | null => {
    for (const [a, b, c] of TTT_WIN_LINES) {
        if (board[a] && board[a] === board[b] && board[b] === board[c]) {
            return board[a];
        }
    }
    return null;
};

const findTicTacToeFinisher = (board: TicTacToeCell[], symbol: "X" | "O"): number | null => {
    for (const line of TTT_WIN_LINES) {
        const values = line.map((index) => board[index]);
        const ownCount = values.filter((value) => value === symbol).length;
        const emptyCells = line.filter((index) => board[index] === null);
        if (ownCount === 2 && emptyCells.length === 1) {
            return emptyCells[0];
        }
    }
    return null;
};

const pickEasyBotMove = (board: TicTacToeCell[]): number => {
    const openMoves = board
        .map((value, index) => (value === null ? index : -1))
        .filter((index) => index !== -1);

    if (openMoves.length === 0) return -1;

    const winningMove = findTicTacToeFinisher(board, "O");
    if (winningMove !== null && Math.random() < 0.55) return winningMove;

    const blockMove = findTicTacToeFinisher(board, "X");
    if (blockMove !== null && Math.random() < 0.45) return blockMove;

    if (board[4] === null && Math.random() < 0.35) return 4;

    const cornerMoves = [0, 2, 6, 8].filter((index) => board[index] === null);
    if (cornerMoves.length > 0 && Math.random() < 0.5) {
        return cornerMoves[randomInt(0, cornerMoves.length - 1)];
    }

    return openMoves[randomInt(0, openMoves.length - 1)];
};

const MiniTicTacToe = () => {
    const [board, setBoard] = useState<TicTacToeCell[]>(Array(9).fill(null));
    const [turn, setTurn] = useState<"player" | "bot">("player");
    const [stats, setStats] = useState({ player: 0, bot: 0, draws: 0 });

    const winner = getTicTacToeWinner(board);
    const isDraw = !winner && board.every((cell) => cell !== null);
    const roundOver = winner !== null || isDraw;
    const botThinking = turn === "bot" && !roundOver;

    useEffect(() => {
        if (turn !== "bot" || roundOver) return;

        const botTimer = window.setTimeout(() => {
            const move = pickEasyBotMove(board);
            if (move < 0) {
                setTurn("player");
                return;
            }

            const nextBoard = [...board];
            nextBoard[move] = "O";
            const botWinner = getTicTacToeWinner(nextBoard);
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
            window.clearTimeout(botTimer);
        };
    }, [turn, roundOver, board]);

    const handleCellClick = (index: number) => {
        if (turn !== "player" || board[index] !== null || roundOver) return;

        const nextBoard = [...board];
        nextBoard[index] = "X";
        const playerWinner = getTicTacToeWinner(nextBoard);
        const playerDraw = !playerWinner && nextBoard.every((cell) => cell !== null);

        setBoard(nextBoard);

        if (playerWinner === "X") {
            setStats((prev) => ({ ...prev, player: prev.player + 1 }));
            setTurn("player");
            return;
        }

        if (playerDraw) {
            setStats((prev) => ({ ...prev, draws: prev.draws + 1 }));
            setTurn("player");
            return;
        }

        setTurn("bot");
    };

    const resetRound = () => {
        setBoard(Array(9).fill(null));
        setTurn("player");
    };

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
};

const TETRIS_ROWS = 16;
const TETRIS_COLS = 10;

const TETRIS_SHAPES: TetrisPieceTemplate[] = [
    { colorId: 1, shape: [[1, 1, 1, 1]] },
    { colorId: 2, shape: [[1, 1], [1, 1]] },
    { colorId: 3, shape: [[0, 1, 0], [1, 1, 1]] },
    { colorId: 4, shape: [[1, 0, 0], [1, 1, 1]] },
    { colorId: 5, shape: [[0, 0, 1], [1, 1, 1]] },
    { colorId: 6, shape: [[1, 1, 0], [0, 1, 1]] },
    { colorId: 7, shape: [[0, 1, 1], [1, 1, 0]] },
];

const cloneShape = (shape: number[][]): number[][] => shape.map((row) => [...row]);

const createEmptyTetrisBoard = (): TetrisBoard =>
    Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0));

const createRandomPieceTemplate = (): TetrisPieceTemplate => {
    const picked = TETRIS_SHAPES[randomInt(0, TETRIS_SHAPES.length - 1)];
    return {
        colorId: picked.colorId,
        shape: cloneShape(picked.shape),
    };
};

const spawnPiece = (template: TetrisPieceTemplate): TetrisPiece => ({
    colorId: template.colorId,
    shape: cloneShape(template.shape),
    x: Math.floor((TETRIS_COLS - template.shape[0].length) / 2),
    y: 0,
});

const rotateTetrisShape = (shape: number[][]): number[][] => {
    const rows = shape.length;
    const cols = shape[0]?.length || 0;
    return Array.from({ length: cols }, (_, col) =>
        Array.from({ length: rows }, (_, row) => shape[rows - 1 - row][col])
    );
};

const isTetrisPositionValid = (
    board: TetrisBoard,
    piece: TetrisPiece,
    nextX: number,
    nextY: number,
    testShape: number[][] = piece.shape
): boolean => {
    for (let row = 0; row < testShape.length; row += 1) {
        for (let col = 0; col < testShape[row].length; col += 1) {
            if (testShape[row][col] === 0) continue;

            const boardX = nextX + col;
            const boardY = nextY + row;

            if (boardX < 0 || boardX >= TETRIS_COLS || boardY >= TETRIS_ROWS) {
                return false;
            }

            if (boardY >= 0 && board[boardY][boardX] !== 0) {
                return false;
            }
        }
    }
    return true;
};

const mergePieceToBoard = (board: TetrisBoard, piece: TetrisPiece): TetrisBoard => {
    const nextBoard = board.map((row) => [...row]);

    for (let row = 0; row < piece.shape.length; row += 1) {
        for (let col = 0; col < piece.shape[row].length; col += 1) {
            if (piece.shape[row][col] === 0) continue;
            const boardX = piece.x + col;
            const boardY = piece.y + row;
            if (boardY >= 0 && boardY < TETRIS_ROWS && boardX >= 0 && boardX < TETRIS_COLS) {
                nextBoard[boardY][boardX] = piece.colorId;
            }
        }
    }

    return nextBoard;
};

const clearCompletedTetrisLines = (board: TetrisBoard): { board: TetrisBoard; clearedLines: number } => {
    const rowsLeft = board.filter((row) => row.some((cell) => cell === 0));
    const clearedLines = TETRIS_ROWS - rowsLeft.length;
    while (rowsLeft.length < TETRIS_ROWS) {
        rowsLeft.unshift(Array(TETRIS_COLS).fill(0));
    }
    return { board: rowsLeft, clearedLines };
};

const tetrisPointsForLines = (clearedLines: number): number => {
    if (clearedLines === 1) return 100;
    if (clearedLines === 2) return 250;
    if (clearedLines === 3) return 450;
    if (clearedLines >= 4) return 700;
    return 0;
};

const overlayTetrisPiece = (board: TetrisBoard, piece: TetrisPiece): TetrisBoard => {
    const nextBoard = board.map((row) => [...row]);

    for (let row = 0; row < piece.shape.length; row += 1) {
        for (let col = 0; col < piece.shape[row].length; col += 1) {
            if (piece.shape[row][col] === 0) continue;
            const boardX = piece.x + col;
            const boardY = piece.y + row;
            if (boardY >= 0 && boardY < TETRIS_ROWS && boardX >= 0 && boardX < TETRIS_COLS) {
                nextBoard[boardY][boardX] = piece.colorId;
            }
        }
    }

    return nextBoard;
};

const createInitialTetrisState = (): TetrisState => {
    const board = createEmptyTetrisBoard();
    const firstPiece = spawnPiece(createRandomPieceTemplate());
    const nextTemplate = createRandomPieceTemplate();

    return {
        board,
        piece: firstPiece,
        nextTemplate,
        score: 0,
        lines: 0,
        level: 1,
        gameOver: !isTetrisPositionValid(board, firstPiece, firstPiece.x, firstPiece.y, firstPiece.shape),
    };
};

const lockPieceAndContinue = (state: TetrisState): TetrisState => {
    const mergedBoard = mergePieceToBoard(state.board, state.piece);
    const { board: clearedBoard, clearedLines } = clearCompletedTetrisLines(mergedBoard);
    const nextPiece = spawnPiece(state.nextTemplate);
    const queuedTemplate = createRandomPieceTemplate();
    const totalLines = state.lines + clearedLines;
    const level = Math.min(10, 1 + Math.floor(totalLines / 4));
    const score = state.score + tetrisPointsForLines(clearedLines);
    const canSpawn = isTetrisPositionValid(clearedBoard, nextPiece, nextPiece.x, nextPiece.y, nextPiece.shape);

    return {
        board: clearedBoard,
        piece: nextPiece,
        nextTemplate: queuedTemplate,
        score,
        lines: totalLines,
        level,
        gameOver: !canSpawn,
    };
};

const tetrisReducer = (state: TetrisState, action: TetrisAction): TetrisState => {
    if (action.type === "reset") {
        return createInitialTetrisState();
    }

    if (state.gameOver) return state;

    if (action.type === "tick" || action.type === "softDrop") {
        const canMoveDown = isTetrisPositionValid(
            state.board,
            state.piece,
            state.piece.x,
            state.piece.y + 1
        );

        if (canMoveDown) {
            return {
                ...state,
                piece: {
                    ...state.piece,
                    y: state.piece.y + 1,
                },
            };
        }

        return lockPieceAndContinue(state);
    }

    if (action.type === "move") {
        const nextX = state.piece.x + action.dx;
        if (!isTetrisPositionValid(state.board, state.piece, nextX, state.piece.y)) {
            return state;
        }
        return {
            ...state,
            piece: {
                ...state.piece,
                x: nextX,
            },
        };
    }

    if (action.type === "rotate") {
        const rotatedShape = rotateTetrisShape(state.piece.shape);

        if (isTetrisPositionValid(state.board, state.piece, state.piece.x, state.piece.y, rotatedShape)) {
            return {
                ...state,
                piece: {
                    ...state.piece,
                    shape: rotatedShape,
                },
            };
        }

        if (isTetrisPositionValid(state.board, state.piece, state.piece.x - 1, state.piece.y, rotatedShape)) {
            return {
                ...state,
                piece: {
                    ...state.piece,
                    x: state.piece.x - 1,
                    shape: rotatedShape,
                },
            };
        }

        if (isTetrisPositionValid(state.board, state.piece, state.piece.x + 1, state.piece.y, rotatedShape)) {
            return {
                ...state,
                piece: {
                    ...state.piece,
                    x: state.piece.x + 1,
                    shape: rotatedShape,
                },
            };
        }

        return state;
    }

    if (action.type === "drop") {
        let nextY = state.piece.y;
        while (isTetrisPositionValid(state.board, state.piece, state.piece.x, nextY + 1)) {
            nextY += 1;
        }

        return lockPieceAndContinue({
            ...state,
            piece: {
                ...state.piece,
                y: nextY,
            },
        });
    }

    return state;
};

const getTetrisCellClass = (value: number): string => {
    if (value === 1) return "bg-comic-blue";
    if (value === 2) return "bg-comic-yellow";
    if (value === 3) return "bg-comic-red";
    if (value === 4) return "bg-comic-green";
    if (value === 5) return "bg-fuchsia-400";
    if (value === 6) return "bg-orange-400";
    if (value === 7) return "bg-cyan-400";
    return "bg-white";
};

const MiniTetris = () => {
    const [state, dispatch] = useReducer(tetrisReducer, undefined, createInitialTetrisState);
    const tickDelay = Math.max(140, 460 - (state.level - 1) * 35);

    useEffect(() => {
        if (state.gameOver) return;
        const tickTimer = window.setInterval(() => {
            dispatch({ type: "tick" });
        }, tickDelay);

        return () => {
            window.clearInterval(tickTimer);
        };
    }, [state.gameOver, tickDelay]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                dispatch({ type: "move", dx: -1 });
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                dispatch({ type: "move", dx: 1 });
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                dispatch({ type: "softDrop" });
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                dispatch({ type: "rotate" });
                return;
            }

            if (event.key === " " || event.code === "Space") {
                event.preventDefault();
                dispatch({ type: "drop" });
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const boardWithPiece = overlayTetrisPiece(state.board, state.piece);
    const nextPreview = Array.from({ length: 4 }, (_, row) =>
        Array.from({ length: 4 }, (_, col) => state.nextTemplate.shape[row]?.[col] || 0)
    );

    return (
        <div className="rounded-2xl border-[4px] border-black bg-gradient-to-br from-pink-100 via-white to-orange-100 p-3 shadow-[6px_6px_0px_0px_#000]">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-black uppercase tracking-wide text-comic-ink">Mini Tetris</h3>
                <span className="rounded-full border-2 border-black bg-comic-blue px-3 py-1 text-xs font-black uppercase text-white">
                    Fast Fun
                </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-black text-gray-700">
                    Score: {state.score}
                </div>
                <div className="rounded-lg border-2 border-black bg-comic-yellow px-2 py-1 text-xs font-black text-black">
                    Lines: {state.lines}
                </div>
                <div className="rounded-lg border-2 border-black bg-comic-green px-2 py-1 text-xs font-black text-white">
                    Level: {state.level}
                </div>
            </div>

            <div className="mb-3 flex items-start gap-3">
                <div className="grid grid-cols-10 gap-[2px] rounded-xl border-[3px] border-black bg-sky-50 p-2">
                    {boardWithPiece.map((row, rowIndex) =>
                        row.map((value, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`h-[14px] w-[14px] rounded-[3px] border border-black/10 sm:h-4 sm:w-4 ${getTetrisCellClass(value)}`}
                            />
                        ))
                    )}
                </div>

                <div className="rounded-xl border-[3px] border-black bg-white p-2">
                    <p className="mb-1 text-center text-[10px] font-black uppercase tracking-widest text-gray-600">Next</p>
                    <div className="grid grid-cols-4 gap-[2px]">
                        {nextPreview.map((row, rowIndex) =>
                            row.map((value, colIndex) => (
                                <div
                                    key={`next-${rowIndex}-${colIndex}`}
                                    className={`h-3 w-3 rounded-[2px] border border-black/10 ${value ? getTetrisCellClass(state.nextTemplate.colorId) : "bg-white"}`}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {state.gameOver && (
                <div className="mb-3 rounded-lg border-2 border-black bg-comic-red px-3 py-2 text-center text-sm font-black text-white">
                    Game Over. Hit restart.
                </div>
            )}

            <div className="grid grid-cols-4 gap-2">
                <button
                    type="button"
                    onClick={() => dispatch({ type: "move", dx: -1 })}
                    className="rounded-lg border-[3px] border-black bg-white px-2 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                    Left
                </button>
                <button
                    type="button"
                    onClick={() => dispatch({ type: "move", dx: 1 })}
                    className="rounded-lg border-[3px] border-black bg-white px-2 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                    Right
                </button>
                <button
                    type="button"
                    onClick={() => dispatch({ type: "rotate" })}
                    className="rounded-lg border-[3px] border-black bg-comic-yellow px-2 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                    Rotate
                </button>
                <button
                    type="button"
                    onClick={() => dispatch({ type: "drop" })}
                    className="rounded-lg border-[3px] border-black bg-comic-blue px-2 py-2 text-[10px] font-black uppercase text-white shadow-[2px_2px_0px_0px_#000]"
                >
                    Drop
                </button>
            </div>

            <button
                type="button"
                onClick={() => dispatch({ type: "reset" })}
                className="mt-3 w-full rounded-lg border-[3px] border-black bg-comic-green px-3 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000]"
            >
                Restart
            </button>
        </div>
    );
};

const LoadingOverlay = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const [gifIndex, setGifIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const progressStageRef = useRef(0);
    const stallUntilRef = useRef(0);
    const progressStopsRef = useRef<{ first: number; second: number; third: number } | null>(null);

    useEffect(() => {
        WAITING_GIFS.forEach((url) => {
            const img = new Image();
            img.src = url;
        });

        const messageInterval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 1800);

        const gifInterval = setInterval(() => {
            setGifIndex((prev) => (prev + 1) % WAITING_GIFS.length);
        }, 3200);

        const firstStop = randomInt(18, 35);
        const secondStop = randomInt(Math.max(firstStop + 20, 58), 86);
        const thirdStop = randomInt(Math.max(secondStop + 8, 90), 99);
        progressStopsRef.current = { first: firstStop, second: secondStop, third: thirdStop };
        progressStageRef.current = 0;
        stallUntilRef.current = 0;

        const progressInterval = setInterval(() => {
            const stops = progressStopsRef.current;
            if (!stops) return;
            const now = Date.now();

            setProgress((prev) => {
                switch (progressStageRef.current) {
                    case 0: {
                        const next = Math.min(stops.first, prev + randomFloat(3.5, 6.8));
                        if (next >= stops.first) {
                            progressStageRef.current = 1;
                            stallUntilRef.current = now + randomInt(600, 1200);
                        }
                        return next;
                    }
                    case 1: {
                        if (now >= stallUntilRef.current) {
                            progressStageRef.current = 2;
                        }
                        return prev;
                    }
                    case 2: {
                        const next = Math.min(stops.second, prev + randomFloat(3.8, 6.4));
                        if (next >= stops.second) {
                            progressStageRef.current = 3;
                            stallUntilRef.current = now + randomInt(600, 1200);
                        }
                        return next;
                    }
                    case 3: {
                        if (now >= stallUntilRef.current) {
                            progressStageRef.current = 4;
                        }
                        return prev;
                    }
                    case 4: {
                        const next = Math.min(stops.third, prev + randomFloat(2.2, 4.1));
                        if (next >= stops.third) {
                            progressStageRef.current = 5;
                        }
                        return next;
                    }
                    default:
                        return Math.min(99, prev + randomFloat(0.2, 0.55));
                }
            });
        }, 95);

        return () => {
            clearInterval(messageInterval);
            clearInterval(gifInterval);
            clearInterval(progressInterval);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-comic-yellow/95 p-4 animate-fade-in">
            <div className="mx-auto w-full max-w-[1320px] py-2 lg:py-6">
                <div className="mb-4 rounded-2xl border-[4px] border-black bg-white/95 px-4 py-3 text-center shadow-[5px_5px_0px_0px_#000]">
                    <p className="text-sm font-black uppercase tracking-wide text-comic-ink md:text-base">
                        While generating your course, you can play mini games.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(220px,0.8fr)_minmax(460px,560px)_minmax(220px,0.8fr)] lg:items-start xl:gap-6">
                    <div className="order-2 mx-auto w-full max-w-[280px] lg:order-1">
                        <MiniTicTacToe />
                    </div>

                    <div className="order-1 lg:order-2">
                        <div className="relative">
                            <div className="absolute inset-0 bg-[repeating-conic-gradient(#0000_0deg_10deg,rgba(0,0,0,0.1)_10deg_20deg)] animate-[spin_20s_linear_infinite] rounded-full scale-[2] pointer-events-none opacity-20"></div>
                            <div className="relative z-10 bg-white border-[6px] border-black p-8 md:p-10 shadow-[12px_12px_0px_0px_#000] rotate-1 transform">
                                <div className="flex flex-col items-center">
                                    <div className="mb-4 w-full rounded-xl border-4 border-black bg-gray-100 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={WAITING_GIFS[gifIndex]}
                                            alt="Course generation in progress"
                                            loading="eager"
                                            decoding="async"
                                            fetchPriority="high"
                                            className="h-44 w-full rounded-lg object-cover md:h-52"
                                        />
                                        <div className="mt-2 flex justify-center gap-1.5">
                                            {WAITING_GIFS.map((_, i) => (
                                                <span
                                                    key={i}
                                                    className={`h-2.5 w-2.5 rounded-full border border-black ${i === gifIndex ? "bg-comic-blue" : "bg-white"}`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <h2 className="mb-2 text-3xl font-black uppercase tracking-tight text-black md:text-4xl">
                                        Generating...
                                    </h2>

                                    <div className="relative mb-6 h-12 w-full rounded-xl border-4 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
                                        <div
                                            className="flex h-full items-center justify-end border-r-4 border-black bg-comic-blue px-3 transition-all duration-300 ease-linear"
                                            style={{ width: `${Math.max(5, progress)}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-black mix-blend-multiply">
                                            {Math.round(progress)}%
                                        </div>
                                    </div>

                                    <p className="text-center text-lg font-black text-gray-700 animate-pulse md:text-xl">
                                        {LOADING_MESSAGES[messageIndex]}
                                    </p>
                                    <p className="mt-3 text-center text-sm font-bold text-gray-600">
                                        It may take a little longer when the API is busy. Play a quick game while we tailor your course.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="order-3 mx-auto w-full max-w-[320px]">
                        <MiniTetris />
                    </div>
                </div>
            </div>
        </div>
    );
};

function GenerateContent() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTopic = searchParams.get("topic") || "";

    const [topic, setTopic] = useState(initialTopic);
    const [genLoading, setGenLoading] = useState(false);
    const [profile, setProfile] = useState<LearningProfile | null>(null);
    const [perfHistory, setPerfHistory] = useState<PerformanceHistory | null>(null);
    const loadingSpeechIndexRef = useRef(0);

    const { playClick, playComplete, playWrong } = useSound();
    const { playIntro, speak, cancel, voiceModeEnabled, hasVoiceSupport } = useTextToSpeech();

    useEffect(() => {
        const urlTopic = searchParams.get("topic");
        if (urlTopic) {
            setTopic(urlTopic);
        }
    }, [searchParams]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            try {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile(data.learningProfile || null);
                    setPerfHistory(data.performanceHistory || null);

                    if (!data.learningProfile) {
                        toast.error("Please set up your profile first.");
                        router.push("/onboarding");
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            }
        };

        if (user) fetchProfile();
    }, [user, router]);

    useEffect(() => {
        if (voiceModeEnabled && !loading) {
            playIntro("generate-adaptive", "What do you want to learn today? I will customize the course for you.");
        }
    }, [voiceModeEnabled, loading, playIntro]);

    useEffect(() => {
        if (!genLoading) {
            cancel();
            return;
        }

        if (!voiceModeEnabled || !hasVoiceSupport) return;

        loadingSpeechIndexRef.current = 0;
        const speakLoadingStatus = () => {
            const index = loadingSpeechIndexRef.current % LOADING_VOICE_MESSAGES.length;
            speak(LOADING_VOICE_MESSAGES[index]);
            loadingSpeechIndexRef.current += 1;
        };

        let miniGamePromptTimer: number | null = null;
        const startTimer = window.setTimeout(() => {
            speakLoadingStatus();
            miniGamePromptTimer = window.setTimeout(() => {
                speak("While we generate, you can play mini games on the left and right.");
            }, 1800);
        }, 450);

        const cycleTimer = window.setInterval(() => {
            speakLoadingStatus();
        }, 9000);

        return () => {
            window.clearTimeout(startTimer);
            if (miniGamePromptTimer !== null) {
                window.clearTimeout(miniGamePromptTimer);
            }
            window.clearInterval(cycleTimer);
            cancel();
        };
    }, [genLoading, voiceModeEnabled, hasVoiceSupport, speak, cancel]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        playClick();
        if (!user || !profile) return;

        setGenLoading(true);
        try {
            const res = await fetch("/api/adaptive-generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    learningProfile: profile,
                    performanceHistory: perfHistory,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Generation failed");
            }

            const { course, adaptiveMetadata } = await res.json();
            if (!hasYouTubeVideoInEveryLesson(course)) {
                throw new Error("Mandatory YouTube video was not attached to one or more lessons. Please try again.");
            }
            const mergedMetadata = {
                ...(course?.metadata || {}),
                ...(adaptiveMetadata || {}),
                topic,
                generationType: "adaptive",
            };

            const ref = await addDoc(collection(db, "courses"), {
                ...course,
                metadata: mergedMetadata,
                adaptiveMetadata: adaptiveMetadata || null,
                creatorId: user.uid,
                createdAt: serverTimestamp(),
            });

            playComplete();
            toast.success("Course ready! 🚀");
            router.push(`/course/${ref.id}`);
        } catch (e: unknown) {
            console.error(e);
            playWrong();
            const message = e instanceof Error ? e.message : "Course generation failed.";
            toast.error(message);
        } finally {
            setGenLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen">
            {genLoading && <LoadingOverlay />}

            <Sidebar
                userName={user.displayName || "Explorer"}
                userAvatar={user.photoURL || "👤"}
                xp={0}
                level={1}
                streak={0}
                gems={0}
                onSignOut={() => { }}
            />

            <main className="lg:ml-80 pt-24 p-4 md:p-8 lg:p-12 relative overflow-hidden">
                <div className="max-w-3xl mx-auto relative z-10">
                    <div className="text-center mb-10">
                        <div className="inline-block px-4 py-2 bg-comic-green border-2 border-black rounded-lg text-white font-black uppercase shadow-[4px_4px_0px_0px_#000] -rotate-2 mb-4">
                            Adaptive Engine Active ⚡
                        </div>
                        <h1 className="text-5xl font-black text-black text-outline mb-4">What&apos;s Your Mission?</h1>
                        <p className="text-xl font-bold text-gray-500">
                            I&apos;ll build a course that matches your learning style.
                        </p>
                    </div>

                    <div className="comic-box p-8 bg-white mb-10 transform rotate-1">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xl font-black text-black mb-3">
                                    I want to learn about...
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="e.g. Black Holes, Ancient Rome, Coding..."
                                    className="w-full px-6 py-5 rounded-xl border-4 border-black font-bold text-2xl outline-none focus:shadow-[4px_4px_0px_0px_#000] focus:-translate-y-1 transition-all placeholder:text-gray-300"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={genLoading || !topic.trim()}
                                className={`w-full py-5 rounded-xl font-black text-2xl uppercase tracking-widest border-4 border-black transition-all flex items-center justify-center gap-3 ${genLoading || !topic.trim()
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-comic-blue text-white shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#000] active:translate-y-1 active:shadow-[2px_2px_0px_0px_#000]"
                                    }`}
                            >
                                {genLoading ? "Building..." : "Start Adventure 🚀"}
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function GeneratePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
            <GenerateContent />
        </Suspense>
    );
}
