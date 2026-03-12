"use client";

import { useEffect, useMemo, useReducer } from "react";

type Board = number[][];

type PieceTemplate = {
    shape: number[][];
    colorId: number;
};

type Piece = PieceTemplate & {
    x: number;
    y: number;
};

type TetrisState = {
    board: Board;
    piece: Piece;
    nextTemplate: PieceTemplate;
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

const ROWS = 16;
const COLS = 10;

const SHAPES: PieceTemplate[] = [
    { colorId: 1, shape: [[1, 1, 1, 1]] },
    { colorId: 2, shape: [[1, 1], [1, 1]] },
    { colorId: 3, shape: [[0, 1, 0], [1, 1, 1]] },
    { colorId: 4, shape: [[1, 0, 0], [1, 1, 1]] },
    { colorId: 5, shape: [[0, 0, 1], [1, 1, 1]] },
    { colorId: 6, shape: [[1, 1, 0], [0, 1, 1]] },
    { colorId: 7, shape: [[0, 1, 1], [1, 1, 0]] },
];

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cloneShape(shape: number[][]): number[][] {
    return shape.map((row) => [...row]);
}

function createEmptyBoard(): Board {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function createRandomTemplate(): PieceTemplate {
    const picked = SHAPES[randomInt(0, SHAPES.length - 1)];

    return {
        colorId: picked.colorId,
        shape: cloneShape(picked.shape),
    };
}

function spawnPiece(template: PieceTemplate): Piece {
    return {
        colorId: template.colorId,
        shape: cloneShape(template.shape),
        x: Math.floor((COLS - template.shape[0].length) / 2),
        y: 0,
    };
}

function rotateShape(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0]?.length || 0;

    return Array.from({ length: cols }, (_, col) =>
        Array.from({ length: rows }, (_, row) => shape[rows - 1 - row][col])
    );
}

function isPositionValid(
    board: Board,
    piece: Piece,
    nextX: number,
    nextY: number,
    testShape: number[][] = piece.shape,
): boolean {
    for (let row = 0; row < testShape.length; row += 1) {
        for (let col = 0; col < testShape[row].length; col += 1) {
            if (testShape[row][col] === 0) {
                continue;
            }

            const boardX = nextX + col;
            const boardY = nextY + row;

            if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                return false;
            }

            if (boardY >= 0 && board[boardY][boardX] !== 0) {
                return false;
            }
        }
    }

    return true;
}

function mergePiece(board: Board, piece: Piece): Board {
    const nextBoard = board.map((row) => [...row]);

    for (let row = 0; row < piece.shape.length; row += 1) {
        for (let col = 0; col < piece.shape[row].length; col += 1) {
            if (piece.shape[row][col] === 0) {
                continue;
            }

            const boardX = piece.x + col;
            const boardY = piece.y + row;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                nextBoard[boardY][boardX] = piece.colorId;
            }
        }
    }

    return nextBoard;
}

function clearLines(board: Board): { board: Board; clearedLines: number } {
    const rowsLeft = board.filter((row) => row.some((cell) => cell === 0));
    const clearedLines = ROWS - rowsLeft.length;

    while (rowsLeft.length < ROWS) {
        rowsLeft.unshift(Array(COLS).fill(0));
    }

    return { board: rowsLeft, clearedLines };
}

function pointsForLines(clearedLines: number): number {
    if (clearedLines === 1) return 100;
    if (clearedLines === 2) return 250;
    if (clearedLines === 3) return 450;
    if (clearedLines >= 4) return 700;
    return 0;
}

function overlayPiece(board: Board, piece: Piece): Board {
    const nextBoard = board.map((row) => [...row]);

    for (let row = 0; row < piece.shape.length; row += 1) {
        for (let col = 0; col < piece.shape[row].length; col += 1) {
            if (piece.shape[row][col] === 0) {
                continue;
            }

            const boardX = piece.x + col;
            const boardY = piece.y + row;
            if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
                nextBoard[boardY][boardX] = piece.colorId;
            }
        }
    }

    return nextBoard;
}

function createInitialState(): TetrisState {
    const board = createEmptyBoard();
    const firstPiece = spawnPiece(createRandomTemplate());
    const nextTemplate = createRandomTemplate();

    return {
        board,
        piece: firstPiece,
        nextTemplate,
        score: 0,
        lines: 0,
        level: 1,
        gameOver: !isPositionValid(board, firstPiece, firstPiece.x, firstPiece.y, firstPiece.shape),
    };
}

function lockPieceAndContinue(state: TetrisState): TetrisState {
    const mergedBoard = mergePiece(state.board, state.piece);
    const { board: clearedBoard, clearedLines } = clearLines(mergedBoard);
    const nextPiece = spawnPiece(state.nextTemplate);
    const queuedTemplate = createRandomTemplate();
    const totalLines = state.lines + clearedLines;
    const level = Math.min(10, 1 + Math.floor(totalLines / 4));
    const score = state.score + pointsForLines(clearedLines);
    const canSpawn = isPositionValid(clearedBoard, nextPiece, nextPiece.x, nextPiece.y, nextPiece.shape);

    return {
        board: clearedBoard,
        piece: nextPiece,
        nextTemplate: queuedTemplate,
        score,
        lines: totalLines,
        level,
        gameOver: !canSpawn,
    };
}

function reducer(state: TetrisState, action: TetrisAction): TetrisState {
    if (action.type === "reset") {
        return createInitialState();
    }

    if (state.gameOver) {
        return state;
    }

    if (action.type === "tick" || action.type === "softDrop") {
        const canMoveDown = isPositionValid(state.board, state.piece, state.piece.x, state.piece.y + 1);

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
        if (!isPositionValid(state.board, state.piece, nextX, state.piece.y)) {
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
        const rotatedShape = rotateShape(state.piece.shape);

        if (isPositionValid(state.board, state.piece, state.piece.x, state.piece.y, rotatedShape)) {
            return {
                ...state,
                piece: {
                    ...state.piece,
                    shape: rotatedShape,
                },
            };
        }

        if (isPositionValid(state.board, state.piece, state.piece.x - 1, state.piece.y, rotatedShape)) {
            return {
                ...state,
                piece: {
                    ...state.piece,
                    x: state.piece.x - 1,
                    shape: rotatedShape,
                },
            };
        }

        if (isPositionValid(state.board, state.piece, state.piece.x + 1, state.piece.y, rotatedShape)) {
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
        while (isPositionValid(state.board, state.piece, state.piece.x, nextY + 1)) {
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
}

function getCellClass(value: number): string {
    if (value === 1) return "bg-comic-blue";
    if (value === 2) return "bg-comic-yellow";
    if (value === 3) return "bg-comic-red";
    if (value === 4) return "bg-comic-green";
    if (value === 5) return "bg-fuchsia-400";
    if (value === 6) return "bg-orange-400";
    if (value === 7) return "bg-cyan-400";
    return "bg-white";
}

export default function MiniTetris() {
    const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
    const tickDelay = Math.max(140, 460 - (state.level - 1) * 35);

    useEffect(() => {
        if (state.gameOver) {
            return;
        }

        const tickTimer = window.setInterval(() => {
            dispatch({ type: "tick" });
        }, tickDelay);

        return () => {
            window.clearInterval(tickTimer);
        };
    }, [state.gameOver, tickDelay]);

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
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

            if (event.key === " ") {
                event.preventDefault();
                dispatch({ type: "drop" });
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, []);

    const displayBoard = useMemo(() => overlayPiece(state.board, state.piece), [state.board, state.piece]);

    return (
        <div className="rounded-2xl border-[4px] border-black bg-gradient-to-br from-pink-100 via-white to-yellow-100 p-3 shadow-[6px_6px_0px_0px_#000]">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-black uppercase tracking-wide text-comic-ink">Mini Tetris</h3>
                <span className="rounded-full border-2 border-black bg-comic-blue px-3 py-1 text-xs font-black uppercase text-white">
                    {state.gameOver ? "Game Over" : `Level ${state.level}`}
                </span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border-2 border-black bg-comic-green px-2 py-1 text-xs font-black text-white">
                    Score: {state.score}
                </div>
                <div className="rounded-lg border-2 border-black bg-white px-2 py-1 text-xs font-black text-gray-700">
                    Lines: {state.lines}
                </div>
                <button
                    type="button"
                    onClick={() => dispatch({ type: "reset" })}
                    className="rounded-lg border-2 border-black bg-comic-yellow px-2 py-1 text-xs font-black uppercase hover:bg-yellow-300"
                >
                    Restart
                </button>
            </div>

            <div className="mx-auto w-full max-w-[220px] rounded-lg border-[3px] border-black bg-gray-900 p-2">
                <div className="grid grid-cols-10 gap-1">
                    {displayBoard.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`aspect-square rounded-[2px] border border-black/20 ${getCellClass(cell)}`}
                            />
                        ))
                    )}
                </div>
            </div>

            <p className="mt-3 text-center text-xs font-black uppercase tracking-wider text-gray-600">
                Use arrow keys to play.
            </p>
        </div>
    );
}
