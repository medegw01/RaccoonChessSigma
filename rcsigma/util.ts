
// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './game/board'
import * as hash_ from './game/hash'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const NAME = "rcSigma";
const CHECKMATE = 32000;
const INFINITE = 32001;
const MAX_MOVES = 2048;
const MAX_MOVES_POSITION = 256;
const BOARD_SQUARE_NUM = 120;
const MAX_DEPTH = 64;

enum Phase { MG, EG }

interface evaluationFN { (arg: board_.board_t): number }

const isOfType = <T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    varToBeChecked: any,
    propertyToCheckFor: keyof T
): varToBeChecked is T =>
    (varToBeChecked as T)[propertyToCheckFor] !== undefined;

export function ASSERT(condition: boolean, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg)
    }
}

function COUNT_BITS(b: board_.bitboard_t): number {
    let num_bits = 0;
    while (b) {
        num_bits++;
        b &= b - 1n;
    }
    return num_bits;
}

function SET_BIT(b: board_.bitboard_t, pos: number): bigint {
    return (b | 1n << BigInt(pos))
}

function CLEAR_BIT(b: board_.bitboard_t, pos: number): bigint {
    return (b & ~(1n << BigInt(pos)))
}

function ISKthBIT_SET(b: board_.bitboard_t, k: number): boolean { return ((b >> BigInt(k)) & 1n) === 1n }

//===========================================================//
// Game Globals
//===========================================================//
const square64ToSquare120 = new Array<number>(64);
const square120ToSquare64 = new Array<number>(BOARD_SQUARE_NUM);
const castlePermission = new Array<number>(120);

const pieceToAscii = ".PBNRQKpbnrqk";
const pieceToUnicode = [
    '\u2800',
    '\u2659', '\u2657', '\u2658', '\u2656', '\u2655', '\u2654',
    '\u265f', '\u265d', '\u265e', '\u265c', '\u265b', '\u265a'
];
const castle64Hash = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];

const isBigPiece = [false, false, true, true, true, true, true, false, true, true, true, true, true];
const isMajorPiece = [false, false, false, false, true, true, true, false, false, false, true, true, true];
const isMinorPiece = [false, false, true, true, false, false, false, false, true, true, false, false, false];
const isPawn = [false, true, false, false, false, false, false, true, false, false, false, false, false];
const isKnight = [false, false, false, true, false, false, false, false, false, true, false, false, false];
const isBishop = [false, false, true, false, false, false, false, false, true, false, false, false, false];
const isKing = [false, false, false, false, false, false, true, false, false, false, false, false, true];
const isQueen = [false, false, false, false, false, true, false, false, false, false, false, true, false];
const is_rook = [false, false, false, false, true, false, false, false, false, false, true, false, false];
const isRookOrQueen = [false, false, false, false, true, true, false, false, false, false, true, true, false];
const isBishopOrQueen = [false, false, true, false, false, true, false, false, true, false, false, true, false];
const isSlidePiece = [false, false, true, false, true, true, false, false, true, false, true, true, false];
const isWhitePiece = [false, true, true, true, true, true, true, false, false, false, false, false, false];

const colorPieceflip = [
    [board_.Pieces.WHITEPAWN, board_.Pieces.WHITEKNIGHT, board_.Pieces.WHITEBISHOP, board_.Pieces.WHITEROOK, board_.Pieces.WHITEQUEEN, board_.Pieces.WHITEKING],
    [board_.Pieces.BLACKPAWN, board_.Pieces.BLACKKNIGHT, board_.Pieces.BLACKBISHOP, board_.Pieces.BLACKROOK, board_.Pieces.BLACKQUEEN, board_.Pieces.BLACKKING]
];

const getColorPiece = [
    board_.Colors.BOTH, board_.Colors.WHITE, board_.Colors.WHITE, board_.Colors.WHITE, board_.Colors.WHITE, board_.Colors.WHITE,
    board_.Colors.WHITE, board_.Colors.BLACK, board_.Colors.BLACK, board_.Colors.BLACK, board_.Colors.BLACK, board_.Colors.BLACK, board_.Colors.BLACK, board_.Colors.BOTH,
];

const getValuePiece = [//-- getValuePiece[Phase][board_.Pieces]
    [0, 128, 825, 781, 1276, 2538, 0, 128, 825, 781, 1276, 2538, 0, 0],
    [0, 213, 915, 854, 1380, 2682, 0, 213, 915, 854, 1380, 2682, 0, 0]
];

const getPolyPiece = [
    -1, 1, 5, 3, 7, 9, 11, 0, 4, 2, 6, 8, 10
];

const isColorBishop = [
    [false, false, true, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, true, false, false, false, false]
];

const isColorKnight = [
    [false, false, false, true, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, true, false, false, false]
];

const isColorRook = [
    [false, false, false, false, true, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, true, false, false]
];

const isColorQueen = [
    [false, false, false, false, false, true, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, true, false]
];

const isColorPawn = [
    [false, true, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, true, false, false, false, false, false]
];

const flip = [
    56, 57, 58, 59, 60, 61, 62, 63,
    48, 49, 50, 51, 52, 53, 54, 55,
    40, 41, 42, 43, 44, 45, 46, 47,
    32, 33, 34, 35, 36, 37, 38, 39,
    24, 25, 26, 27, 28, 29, 30, 31,
    16, 17, 18, 19, 20, 21, 22, 23,
    8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7,
];

const filesBoard = new Array<number>(BOARD_SQUARE_NUM);
const ranksBoard = new Array<number>(BOARD_SQUARE_NUM);

// functions
// Export each of these functions so that you can test each of them individually 
function initializeFilesRankArray() {
    for (let i = 0; i < BOARD_SQUARE_NUM; i++) {
        filesBoard[i] = board_.Squares.OFF_BOARD;
        ranksBoard[i] = board_.Squares.OFF_BOARD;
    }
    for (let rank = board_.Ranks.FIRST_RANK; rank <= board_.Ranks.EIGHTH_RANK; ++rank) {
        for (let file = board_.Files.A_FILE; file <= board_.Files.H_FILE; ++file) {
            const square_120 = board_.FILE_RANK_TO_SQUARE(file, rank);
            filesBoard[square_120] = file;
            ranksBoard[square_120] = rank;
        }
    }
}
function initializeSquare120ToSquare64() {
    let sq_64 = 0;
    let i, rank, file;
    for (i = 0; i < BOARD_SQUARE_NUM; ++i) {
        square120ToSquare64[i] = 65;
    }
    for (i = 0; i < 64; ++i) {
        square64ToSquare120[i] = 120;
    }

    for (rank = board_.Ranks.FIRST_RANK; rank <= board_.Ranks.EIGHTH_RANK; ++rank) {
        for (file = board_.Files.A_FILE; file <= board_.Files.H_FILE; file++) {
            const sq = board_.FILE_RANK_TO_SQUARE(file, rank);
            square64ToSquare120[sq_64] = sq;
            square120ToSquare64[sq] = sq_64;
            sq_64++;
        }
    }
}

function initializeHashKey() {
    for (let flag = 0; flag < 16; flag++) {
        for (let i = 0; i < 4; i++) {
            if ((flag & (1 << i)) !== 0) castle64Hash[flag] ^= hash_.random64Poly[hash_.randomCastle + i];
        }
    }

    for (let j = 0; j < 120; j++) castlePermission[j] = 0xF;
    castlePermission[board_.Squares.E1] &= ~board_.Castling.WHITE_CASTLE_OO;
    castlePermission[board_.Squares.H1] &= ~board_.Castling.WHITE_CASTLE_OO;

    castlePermission[board_.Squares.E1] &= ~board_.Castling.WHITE_CASTLE_OOO;
    castlePermission[board_.Squares.A1] &= ~board_.Castling.WHITE_CASTLE_OOO;

    castlePermission[board_.Squares.E8] &= ~board_.Castling.BLACK_CASTLE_OO;
    castlePermission[board_.Squares.H8] &= ~board_.Castling.BLACK_CASTLE_OO;

    castlePermission[board_.Squares.E8] &= ~board_.Castling.BLACK_CASTLE_OOO;
    castlePermission[board_.Squares.A8] &= ~board_.Castling.BLACK_CASTLE_OOO;
}

function initializeGame(): void {
    initializeSquare120ToSquare64();
    initializeHashKey();
    initializeFilesRankArray();
}

function get_time_ms(): number {
    return new Date().getTime();
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

export {
    START_FEN,
    NAME,
    CHECKMATE,
    INFINITE,
    MAX_DEPTH,
    MAX_MOVES,
    MAX_MOVES_POSITION,
    BOARD_SQUARE_NUM,

    square64ToSquare120,
    square120ToSquare64,
    castlePermission,
    pieceToAscii,
    pieceToUnicode,
    castle64Hash,
    isBigPiece,
    isMajorPiece,
    isMinorPiece,
    isPawn,
    isKnight,
    isBishop,
    isKing,
    isQueen,
    is_rook,
    isRookOrQueen,
    isBishopOrQueen,
    isSlidePiece,
    isWhitePiece,
    colorPieceflip,
    getColorPiece,
    getValuePiece,
    getPolyPiece,
    isColorBishop,
    isColorKnight,
    isColorRook,
    isColorQueen,
    isColorPawn,
    flip,
    filesBoard,
    ranksBoard,

    COUNT_BITS,
    SET_BIT,
    CLEAR_BIT,
    ISKthBIT_SET,

    evaluationFN,
    isOfType,
    Phase,

    bufferToArrayBuffer,
    get_time_ms,
    initializeGame,

}
