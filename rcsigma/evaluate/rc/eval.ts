// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as board_ from '../../game/board'
import { sanToMove, makeMove, takeMove, smithToMove } from '../../game/move';

type eval_t = {
    psqt: [number, number];
    imbalance: [number, number];
    pawns: [number, number];
    pieces: [number, number];
    pieceValue: [number, number];
    mobility: [number, number];
    threat: [number, number];
    passed: [number, number];
    space: [number, number];
    king: [number, number];
};

enum Scale {
    DRAW = 0,
    OCB_BISHOPS_ONLY = 64,
    OCB_ONE_KNIGHT = 106,
    OCB_ONE_ROOK = 96,
    LONE_QUEEN = 88,
    NORMAL = 128,
    LARGE_PAWN_ADV = 144,
}

const TEMPO = 28;

const pawnPSQT = [
    [
        0, 0, 0, 0, 0, 0, 0, 0,
        3, 3, 10, 19, 16, 19, 7, -5,
        -9, -15, 11, 15, 32, 22, 5, -22,
        -8, -23, 6, 20, 40, 17, 4, -12,
        13, 0, -13, 1, 11, -2, -13, 5,
        -5, -12, -7, 22, -8, -5, -15, -18,
        -7, 7, -3, -13, 5, -16, 10, -8,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    [
        0, 0, 0, 0, 0, 0, 0, 0,
        -10, -6, 10, 0, 14, 7, -5, -19,
        -10, -10, -10, 4, 4, 3, -6, -4,
        6, -2, -8, -4, -13, -12, -10, -9,
        9, 4, 3, -12, -12, -6, 13, 8,
        28, 20, 21, 28, 30, 7, 6, 13,
        0, -11, 12, 21, 25, 19, 4, 7,
        0, 0, 0, 0, 0, 0, 0, 0,
    ]
];

const bishopPSQT = [
    [
        -53, -5, -8, -23, -23, -8, -5, -53,
        -15, 8, 19, 4, 4, 19, 8, -15,
        -7, 21, -5, 17, 17, -5, 21, -7,
        -5, 11, 25, 39, 39, 25, 11, -5,
        -12, 29, 22, 31, 31, 22, 29, -12,
        -16, 6, 1, 11, 11, 1, 6, -16,
        -17, -14, 5, 0, 0, 5, -14, -17,
        -48, 1, -14, -23, -23, -14, 1, -48,
    ],
    [
        -57, -30, -37, -12, -12, -37, -30, -57,
        -37, -13, -17, 1, 1, -17, -13, -37,
        -16, -1, -2, 10, 10, -2, -1, -16,
        -20, -6, 0, 17, 17, 0, -6, -20,
        -17, -1, -14, 15, 15, -14, -1, -17,
        -30, 6, 4, 6, 6, 4, 6, -30,
        -31, -20, -1, 1, 1, -1, -20, -31,
        -46, -42, -37, -24, -24, -37, -42, -46,
    ]
];

const knightPSQT = [
    [
        -175, -92, -74, -73, -73, -74, -92, -175,
        -77, -41, -27, -15, -15, -27, -41, -77,
        -61, -17, 6, 12, 12, 6, -17, -61,
        -35, 8, 40, 49, 49, 40, 8, -35,
        -34, 13, 44, 51, 51, 44, 13, -34,
        -9, 22, 58, 53, 53, 58, 22, -9,
        -67, -27, 4, 37, 37, 4, -27, -67,
        -201, -83, -56, -26, -26, -56, -83, -201,
    ],
    [
        -96, -65, -49, -21, -21, -49, -65, -96,
        -67, -54, -18, 8, 8, -18, -54, -67,
        -40, -27, -8, 29, 29, -8, -27, -40,
        -35, -2, 13, 28, 28, 13, -2, -35,
        -45, -16, 9, 39, 39, 9, -16, -45,
        -51, -44, -16, 17, 17, -16, -44, -51,
        -69, -50, -51, 12, 12, -51, -50, -69,
        -100, -88, -56, -17, -17, -56, -88, -100,
    ]
];

const rookPSQT = [
    [
        -31, -20, -14, -5, -5, -14, -20, -31,
        -21, -13, -8, 6, 6, -8, -13, -21,
        -25, -11, -1, 3, 3, -1, -11, -25,
        -13, -5, -4, -6, -6, -4, -5, -13,
        -27, -15, -4, 3, 3, -4, -15, -27,
        -22, -2, 6, 12, 12, 6, -2, -22,
        -2, 12, 16, 18, 18, 16, 12, -2,
        -17, -19, -1, 9, 9, -1, -19, -17,
    ],
    [
        -9, -13, -10, -9, -9, -10, -13, -9,
        -12, -9, -1, -2, -2, -1, -9, -12,
        6, -8, -2, -6, -6, -2, -8, 6,
        -6, 1, -9, 7, 7, -9, 1, -6,
        -5, 8, 7, -6, -6, 7, 8, -5,
        6, 1, -7, 10, 10, -7, 1, 6,
        4, 5, 20, -5, -5, 20, 5, 4,
        18, 0, 19, 13, 13, 19, 0, 18
    ]
];

const queenPSQT = [
    [
        3, -5, -5, 4, 4, -5, -5, 3,
        -3, 5, 8, 12, 12, 8, 5, 3,
        -3, 6, 13, 7, 7, 13, 6, -3,
        4, 5, 9, 8, 8, 9, 5, 4,
        0, 14, 12, 5, 5, 12, 14, 0,
        -4, 10, 6, 8, 8, 6, 10, -4,
        -5, 6, 10, 8, 8, 10, 6, -5,
        -2, -2, 1, -2, -2, 1, -2, -2,
    ],
    [
        -69, -57, -47, -26, -26, -47, -57, -69,
        -55, -31, -22, -4, -4, -22, -31, -55,
        -39, -18, -9, 3, 3, -9, -18, -39,
        -23, -3, 13, 24, 24, 13, -3, -23,
        -29, -6, 9, 21, 21, 9, -6, -29,
        -38, -18, -12, 1, 1, -12, -18, -38,
        -50, -27, -24, -8, -8, -24, -27, -50,
        -75, -52, -43, -36, -36, -43, -52, -75,
    ]
];

const kingPSQT = [
    [
        271, 327, 271, 198, 198, 271, 327, 271,
        278, 303, 234, 179, 179, 234, 303, 278,
        195, 258, 169, 120, 120, 169, 258, 195,
        164, 190, 138, 98, 98, 138, 190, 164,
        154, 179, 105, 70, 70, 105, 179, 154,
        123, 145, 81, 31, 31, 81, 145, 123,
        88, 120, 65, 33, 33, 65, 120, 88,
        59, 89, 45, -1, -1, 45, 89, 59,
    ],
    [
        1, 45, 85, 76, 76, 85, 45, 1,
        53, 100, 133, 135, 135, 133, 100, 53,
        88, 130, 169, 175, 175, 169, 130, 88,
        103, 156, 172, 172, 172, 172, 156, 103,
        96, 166, 199, 199, 199, 199, 166, 96,
        92, 172, 184, 191, 191, 184, 172, 92,
        47, 121, 116, 131, 131, 116, 121, 47,
        11, 59, 73, 78, 78, 73, 59, 11,
    ]
];

function initEvaluation(): eval_t {
    return {
        psqt: [0, 0],
        imbalance: [0, 0],
        pawns: [0, 0],
        pieces: [0, 0],
        pieceValue: [0, 0],
        mobility: [0, 0],
        threat: [0, 0],
        passed: [0, 0],
        space: [0, 0],
        king: [0, 0],
    }
}

function pawnEval(board: board_.board_t, color: board_.Colors, v: eval_t) {
    let i: number, sq120: number;
    const isWhite = (color === board_.Colors.WHITE), pce = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;

    for (i = 0; i < board.numberPieces[pce]; i++) {
        sq120 = board.pieceList[board_.PIECE_INDEX(pce, i)];
        //-- psqt
        if (isWhite) {
            v.psqt[util_.Phase.EG] += pawnPSQT[util_.Phase.EG][board_.SQ64(sq120)];
            v.psqt[util_.Phase.MG] += pawnPSQT[util_.Phase.MG][board_.SQ64(sq120)];
        } else {
            v.psqt[util_.Phase.EG] += pawnPSQT[util_.Phase.EG][util_.flip[board_.SQ64(sq120)]];
            v.psqt[util_.Phase.MG] += pawnPSQT[util_.Phase.MG][util_.flip[board_.SQ64(sq120)]];
        }

    }
}


function knightEval(board: board_.board_t, color: board_.Colors, v: eval_t) {
    let i: number, sq120: number;
    const isWhite = (color === board_.Colors.WHITE), pce = (isWhite) ? board_.Pieces.WHITEKNIGHT : board_.Pieces.BLACKKNIGHT;

    for (i = 0; i < board.numberPieces[pce]; i++) {
        sq120 = board.pieceList[board_.PIECE_INDEX(pce, i)];
        //-- psqt
        if (isWhite) {
            v.psqt[util_.Phase.EG] += knightPSQT[util_.Phase.EG][board_.SQ64(sq120)];
            v.psqt[util_.Phase.MG] += knightPSQT[util_.Phase.MG][board_.SQ64(sq120)];
        } else {
            v.psqt[util_.Phase.EG] += knightPSQT[util_.Phase.EG][util_.flip[board_.SQ64(sq120)]];
            v.psqt[util_.Phase.MG] += knightPSQT[util_.Phase.MG][util_.flip[board_.SQ64(sq120)]];
        }

    }
}


function bishopEval(board: board_.board_t, color: board_.Colors, v: eval_t) {
    let i: number, sq120: number;
    const isWhite = (color === board_.Colors.WHITE), pce = (isWhite) ? board_.Pieces.WHITEBISHOP : board_.Pieces.BLACKBISHOP;

    for (i = 0; i < board.numberPieces[pce]; i++) {
        sq120 = board.pieceList[board_.PIECE_INDEX(pce, i)];
        //-- psqt
        if (isWhite) {
            v.psqt[util_.Phase.EG] += bishopPSQT[util_.Phase.EG][board_.SQ64(sq120)];
            v.psqt[util_.Phase.MG] += bishopPSQT[util_.Phase.MG][board_.SQ64(sq120)];
        } else {
            v.psqt[util_.Phase.EG] += bishopPSQT[util_.Phase.EG][util_.flip[board_.SQ64(sq120)]];
            v.psqt[util_.Phase.MG] += bishopPSQT[util_.Phase.MG][util_.flip[board_.SQ64(sq120)]];
        }

    }
}


function rookEval(board: board_.board_t, color: board_.Colors, v: eval_t) {
    let i: number, sq120: number;
    const isWhite = (color === board_.Colors.WHITE), pce = (isWhite) ? board_.Pieces.WHITEROOK : board_.Pieces.BLACKROOK;

    for (i = 0; i < board.numberPieces[pce]; i++) {
        sq120 = board.pieceList[board_.PIECE_INDEX(pce, i)];
        //-- psqt
        if (isWhite) {
            v.psqt[util_.Phase.EG] += rookPSQT[util_.Phase.EG][board_.SQ64(sq120)];
            v.psqt[util_.Phase.MG] += rookPSQT[util_.Phase.MG][board_.SQ64(sq120)];
        } else {
            v.psqt[util_.Phase.EG] += rookPSQT[util_.Phase.EG][util_.flip[board_.SQ64(sq120)]];
            v.psqt[util_.Phase.MG] += rookPSQT[util_.Phase.MG][util_.flip[board_.SQ64(sq120)]];
        }

    }
}


function queenEval(board: board_.board_t, color: board_.Colors, v: eval_t) {
    let i: number, sq120: number;
    const isWhite = (color === board_.Colors.WHITE), pce = (isWhite) ? board_.Pieces.WHITEQUEEN : board_.Pieces.BLACKQUEEN;

    for (i = 0; i < board.numberPieces[pce]; i++) {
        sq120 = board.pieceList[board_.PIECE_INDEX(pce, i)];
        //-- psqt
        if (isWhite) {
            v.psqt[util_.Phase.EG] += queenPSQT[util_.Phase.EG][board_.SQ64(sq120)];
            v.psqt[util_.Phase.MG] += queenPSQT[util_.Phase.MG][board_.SQ64(sq120)];
        } else {
            v.psqt[util_.Phase.EG] += queenPSQT[util_.Phase.EG][util_.flip[board_.SQ64(sq120)]];
            v.psqt[util_.Phase.MG] += queenPSQT[util_.Phase.MG][util_.flip[board_.SQ64(sq120)]];
        }

    }
}


function kingEval(board: board_.board_t, color: board_.Colors, v: eval_t) {
    let i: number, sq120: number
    const isWhite = (color === board_.Colors.WHITE), pce = (isWhite) ? board_.Pieces.WHITEKING : board_.Pieces.BLACKKING;

    for (i = 0; i < board.numberPieces[pce]; i++) {
        sq120 = board.pieceList[board_.PIECE_INDEX(pce, i)];
        //-- psqt
        if (isWhite) {
            v.psqt[util_.Phase.EG] += kingPSQT[util_.Phase.EG][board_.SQ64(sq120)];
            v.psqt[util_.Phase.MG] += kingPSQT[util_.Phase.MG][board_.SQ64(sq120)];
        } else {
            v.psqt[util_.Phase.EG] += kingPSQT[util_.Phase.EG][util_.flip[board_.SQ64(sq120)]];
            v.psqt[util_.Phase.MG] += kingPSQT[util_.Phase.MG][util_.flip[board_.SQ64(sq120)]];
        }

    }
}

/**
 * pieceTotal gives the static evaulation of all the pieces in board.
 * @param board 
 * @param v 
 */
function pieceTotal(board: board_.board_t, v: eval_t) {
    for (let color = board_.Colors.WHITE; color < board_.Colors.BOTH; color++) {
        const ps = initEvaluation();

        pawnEval(board, color, ps);
        knightEval(board, color, ps);
        bishopEval(board, color, ps);
        rookEval(board, color, ps);
        queenEval(board, color, ps);
        kingEval(board, color, ps);

        console.log(ps.psqt);
        for (let ph = util_.Phase.MG; ph <= util_.Phase.EG; ph++) {
            v.psqt[ph] += ps.psqt[ph] * (1 - color * 2);
        }
    }
}

/**
 * gameEvaluation is used to heuristically determine the relative value of a positions 
 * used in general case when no specialized evaluation or tablebase evaluation is available
 * @param board 
 */
function gameEvaluation(board: board_.board_t): [number, number] {
    const evaluation: eval_t = initEvaluation();

    evaluation.pieceValue[util_.Phase.MG] = (board.materialMg[board_.Colors.WHITE] - board.materialMg[board_.Colors.BLACK]);
    evaluation.pieceValue[util_.Phase.EG] = (board.materialEg[board_.Colors.WHITE] - board.materialEg[board_.Colors.BLACK]);

    pieceTotal(board, evaluation);
    console.log(evaluation.psqt);
    /*TODO*/
    const sumScore = (phase: util_.Phase): number => {
        return (
            evaluation.psqt[phase] + evaluation.imbalance[phase] + evaluation.pawns[phase] + evaluation.pieces[phase]
            + evaluation.pieceValue[phase] + evaluation.mobility[phase] + evaluation.threat[phase] + evaluation.passed[phase]
            + evaluation.space[phase] + evaluation.king[phase]
        );
    }
    return [sumScore(util_.Phase.MG), sumScore(util_.Phase.EG)];
}

/**
 * The game phase based on remaining material
 * @param board 
*/
function phase(board: board_.board_t): number {
    const p = (
        2 * (board.numberPieces[board_.Pieces.WHITEPAWN] + board.numberPieces[board_.Pieces.BLACKPAWN])
        + 44 * (board.numberPieces[board_.Pieces.WHITEQUEEN] + board.numberPieces[board_.Pieces.BLACKQUEEN])
        + 16 * (board.numberPieces[board_.Pieces.WHITEROOK] + board.numberPieces[board_.Pieces.BLACKROOK])
        + 12 * (board.numberPieces[board_.Pieces.WHITEBISHOP] + board.numberPieces[board_.Pieces.BLACKBISHOP])
        + 6 * (board.numberPieces[board_.Pieces.WHITEKNIGHT] + board.numberPieces[board_.Pieces.BLACKKNIGHT])
    );

    return Math.min(p, 256);
}


/**
 * Scale endgames based upon the remaining material We check for various Opposite 
 * Coloured Bishop cases, positions with a lone Queen against multiple minor pieces 
 * and/or rooks, and positions with a Lone minor that should not be winnable
 * 
 * Adopted from Ethereal
 * 
 * @param board 
 * @param eg 
 */
function scaleFactor(board: board_.board_t, eg: number): number {
    const pawns = (board.piecesBB[board_.Pieces.WHITEPAWN] | board.piecesBB[board_.Pieces.BLACKPAWN]);
    const knights = (board.piecesBB[board_.Pieces.WHITEKNIGHT] | board.piecesBB[board_.Pieces.BLACKKNIGHT]);
    const bishops = (board.piecesBB[board_.Pieces.WHITEBISHOP] | board.piecesBB[board_.Pieces.BLACKBISHOP]);
    const rooks = (board.piecesBB[board_.Pieces.WHITEROOK] | board.piecesBB[board_.Pieces.BLACKROOK]);
    const queens = (board.piecesBB[board_.Pieces.WHITEQUEEN] | board.piecesBB[board_.Pieces.BLACKQUEEN]);

    const minors = knights | bishops;
    const pieces = knights | bishops | rooks;

    const white = (
        board.piecesBB[board_.Pieces.WHITEPAWN]
        | board.piecesBB[board_.Pieces.WHITEKNIGHT]
        | board.piecesBB[board_.Pieces.WHITEBISHOP]
        | board.piecesBB[board_.Pieces.WHITEROOK]
        | board.piecesBB[board_.Pieces.WHITEQUEEN]
        | board.piecesBB[board_.Pieces.WHITEKING]
    );

    const black = (
        board.piecesBB[board_.Pieces.BLACKPAWN]
        | board.piecesBB[board_.Pieces.BLACKKNIGHT]
        | board.piecesBB[board_.Pieces.BLACKBISHOP]
        | board.piecesBB[board_.Pieces.BLACKROOK]
        | board.piecesBB[board_.Pieces.BLACKQUEEN]
        | board.piecesBB[board_.Pieces.BLACKKING]
    );

    const weak = eg < 0 ? white : black;
    const strong = eg < 0 ? black : white;


    // Check for opposite coloured bishops
    if (util_.ONLY_ONE(white & bishops)
        && util_.ONLY_ONE(black & bishops)
        && util_.ONLY_ONE(bishops & util_.lightSquares)) {

        // Scale factor for OCB + knights
        if (!(rooks | queens)
            && util_.ONLY_ONE(white & knights)
            && util_.ONLY_ONE(black & knights))
            return Scale.OCB_ONE_KNIGHT;

        // Scale factor for OCB + rooks
        if (!(knights | queens)
            && util_.ONLY_ONE(white & rooks)
            && util_.ONLY_ONE(black & rooks))
            return Scale.OCB_ONE_ROOK;

        // Scale factor for lone OCB
        if (!(knights | rooks | queens))
            return Scale.OCB_BISHOPS_ONLY;
    }

    // Lone Queens are weak against multiple pieces
    if (util_.ONLY_ONE(queens) && util_.SEVERAL(pieces) && pieces == (weak & pieces))
        return Scale.LONE_QUEEN;

    // Lone Minor vs King + Pawns should never be won
    if ((strong & minors) && util_.POP_COUNT(strong) == 2)
        return Scale.DRAW;

    // Scale up lone pieces with massive pawn advantages
    if (!queens
        && !util_.SEVERAL(pieces & white)
        && !util_.SEVERAL(pieces & black)
        && util_.POP_COUNT(strong & pawns) - util_.POP_COUNT(weak & pawns) > 2)
        return Scale.LARGE_PAWN_ADV;

    return Scale.NORMAL;
}

/**
 * Classical Evaluation of board
 * https://hxim.github.io/Stockfish-Evaluation-Guide/
 * @param board 
 */
function raccoonEvaluate(board: board_.board_t): number {
    const [mg, eg] = gameEvaluation(board);
    const p = phase(board), tempo = TEMPO * ((board.turn === board_.Colors.WHITE) ? 1 : -1);
    let score = (((mg * p + ((eg * (256 - p) * (scaleFactor(board, eg) / Scale.NORMAL)) << 0)) / 256) << 0);
    score += tempo;
    return score;
}

export {
    raccoonEvaluate
}


/// Playground
util_.initializeGame();

const fen = util_.START_FEN;
const board = board_.newBoard();
board_.fenToBoard(fen, board);

console.log(raccoonEvaluate(board));

/*const moves = ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4'];
for (const mv of moves) {
    console.log(mv)
    if (makeMove(smithToMove(mv, board), board)) board_.checkBoard(board);
    else console.log("nnn");
    scaleFactor(board, 0);
}
for (const _ of moves) {
    takeMove(board);
    scaleFactor(board, 0);
    board_.checkBoard(board);
}*/

//console.timeEnd('someFunction');
//console.time('someFunction');