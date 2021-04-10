// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as pawn_ from './pawns'
import * as board_ from '../../game/board'
import * as bitboard_ from '../../game/bitboard'

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

const mobilityBonus = [// kN, B, R, Q
    [
        [-62, -53, -12, -4, 3, 13, 22, 28, 33],
        [-48, -20, 16, 26, 38, 51, 55, 63, 63, 68, 81, 81, 91, 98],
        [-58, -27, -15, -10, -5, -2, 9, 16, 30, 29, 32, 38, 46, 48, 58],
        [-39, -21, 3, 3, 14, 22, 28, 41, 43, 48, 56, 60, 60, 66, 67, 70, 71, 73, 79, 88, 88, 99, 102, 102, 106, 109, 113, 116] // queen
    ],
    [
        [-81, -56, -30, -14, 8, 15, 23, 27, 33],
        [-59, -23, -3, 13, 24, 42, 54, 57, 65, 73, 78, 86, 88, 97],
        [-76, -18, 28, 55, 69, 82, 112, 118, 132, 142, 155, 165, 166, 169, 171],
        [-36, -15, 8, 18, 34, 54, 61, 73, 79, 92, 94, 104, 113, 120, 123, 126, 133, 136, 140, 143, 148, 166, 170, 175, 184, 191, 206, 212]
    ]
];

// Polynomial material imbalance parameters
const qOurs = [
    //            OUR board_.Pieces
    // pair pawn knight bishop rook queen
    [[1419, 1455]], // Bishop pair
    [[101, 28], [37, 39]], // Pawn
    [[57, 64], [249, 187], [-49, -62]], // Knight      OUR board_.Pieces
    [[0, 0], [118, 137], [10, 27], [0, 0]], // Bishop
    [[-63, -68], [-5, 3], [100, 81], [132, 118], [-246, -244]], // Rook
    [[-210, -211], [37, 14], [147, 141], [161, 105], [-158, -174], [-9, -31]]  // Queen
];
const qTheirs = [
    //           THEIR board_.Pieces
    // pair pawn knight bishop rook queen
    [], // Bishop pair
    [[33, 30]], // Pawn
    [[46, 18], [106, 84]], // Knight      OUR board_.Pieces
    [[75, 35], [59, 44], [60, 15]], // Bishop
    [[26, 35], [6, 22], [38, 39], [-12, -2]], // Rook
    [[97, 93], [100, 163], [-58, -91], [112, 192], [276, 225]]  // Queen
];


/**
 * Bonus and Penalties
 */
const rookOn7th = [-1, 42];
const rookOnOpenFile = [[19, 48], [7, 28]];
const rookOnCloseFile = [10, 5];
const rookTrapped = [52, 10];
const rookOnKingRing = [16, 0];

const bishopPair = [22, 88];
const bishopPawn = [3, 7];
const bishopLongDiagonal = [45, 34];
const bishopXrayPawns = [4, 5];
const bishopKingProtector = [6, 9];
const bishopOutposts = [[[31, 60], [24, 11]], [[-1, 12], [6, 11]]];
const bishopOnKingRing = [24, 0];

const knightOutposts = [[[37, 75], [32, 42]], [[-7, 25], [-1, 23]]];
const knightProtector = [8, 9];

const queenRelativePin = [56, 15];

const minorBehindPawn = [18, 3];
const reachableOutpost = [31, 22];

const KingAttackWeights = [0, 0, 52, 81, 44, 10]; //E, P,B,N,R,Q

// SafeCheck[util_.PieceType][single/multiple] contains safe check bonus by piece type,
// higher if multiple safe checks are possible for that piece type.
const SafeCheck = [
    [], [], [639, 974], [803, 1292], [1087, 1878], [759, 1132]
];
const pawnlessFlank = [17, 95];
const flankAttacks = [8, 0];

// ThreatByMinor/ByRook[attacked util_.PieceType] contains bonuses according to
// which piece type attacks which one. Attacks on lesser pieces which are
// pawn-defended are not considered.
const threatByMinor = [
    [0, 0], [55, 41], [5, 32], [77, 56], [89, 119], [79, 162]
];

const threatByRook = [
    [0, 0], [37, 68], [3, 44], [42, 60], [0, 39], [58, 43]
];

// passedRank[Rank] contains a bonus according to the rank of a passed pawn
const passedRank = [
    [0, 0], [7, 27], [16, 32], [17, 40], [64, 71], [170, 174], [278, 262]
];

const passedFile = [11, 8];
const hanging = [69, 36];
const restrictedPiece = [7, 7];
const weakQueenProtection = [14, 0];
const threatByKing = [24, 89];
const threatByPawnPush = [48, 39];
const threatBySafePawn = [173, 94];
const knightOnQueen = [16, 11];
const sliderOnQueen = [60, 18];

//-- helpers for evaluation
let passedPawn: bitboard_.bitboard_t[];
let pawnSpan: bitboard_.bitboard_t[];
let attacked: bitboard_.bitboard_t[];
let attacked2: bitboard_.bitboard_t[];
let attackedBy: bitboard_.bitboard_t[];
let kingAttackCount: number[];
let kingAttackersCount: number[];
let kingAttackWeight: number[];
let boardStaticEval: util_.staticEval_c;


function initEvaluation() {
    attacked = (new Array<bitboard_.bitboard_t>(2)).fill(0n);
    attacked2 = (new Array<bitboard_.bitboard_t>(2)).fill(0n);
    attackedBy = (new Array<bitboard_.bitboard_t>(13)).fill(0n);
    kingAttackCount = (new Array<number>(2)).fill(0);
    kingAttackersCount = (new Array<number>(2)).fill(0);
    kingAttackWeight = (new Array<number>(2)).fill(0);
    pawnSpan = (new Array<bitboard_.bitboard_t>(2)).fill(0n);
    passedPawn = (new Array<bitboard_.bitboard_t>(2)).fill(0n);
    boardStaticEval = new util_.staticEval_c();
}


/**
 * Default mobility area are all squares except the following:
 * 
 *  - occupied by own blocked pawn or king
 *  - attacked by opponent's pawns
 * 
 * @param board 
 * @param color 
 * @param pawn_attacks 
 */
const mobilityArea = (board: board_.board_t, color: board_.Colors, pawn_attacks: bitboard_.bitboard_t) => {
    const shifted = bitboard_.shift(
        util_.pawnPush(color),
        bitboard_.getPieces(color, board) | bitboard_.getPieces(color ^ 1, board)
    );
    const p = (color === board_.Colors.WHITE) ? board.piecesBB[board_.Pieces.WHITEPAWN] : board.piecesBB[board_.Pieces.BLACKPAWN];
    const k = (color === board_.Colors.WHITE) ? board.piecesBB[board_.Pieces.WHITEKING]
        : board.piecesBB[board_.Pieces.BLACKKING];
    return BigInt.asUintN(64, ~((p & shifted) | k | pawn_attacks));
}

function pawnEval(board: board_.board_t) {
    const pawnEntry = pawn_.probePawn(board);
    // Update Evaluation with pawn entry 
    for (let c = board_.Colors.WHITE; c < board_.Colors.BOTH; c++) {
        attacked[c] |= pawnEntry.attacked[c];
        attacked2[c] |= pawnEntry.attacked2[c];
        attackedBy[util_.ptToP(c, util_.PieceType.PAWN)] |= pawnEntry.attackedBy[util_.ptToP(c, util_.PieceType.PAWN)];
        pawnSpan[c] |= pawnEntry.pawnSpan[c];
        passedPawn[c] |= pawnEntry.passedPawn[c];
        kingAttackCount[c] += pawnEntry.kingAttackCount[c];
        kingAttackersCount[c] += pawnEntry.kingAttackersCount[c];
        kingAttackWeight[c] += pawnEntry.kingAttackWeight[c];

    }
    for (let p = util_.Phase.MG; p <= util_.Phase.EG; p++) {
        boardStaticEval.psqt[p] += pawnEntry.boardStaticEval.psqt[p];
        boardStaticEval.pawns[p] += pawnEntry.boardStaticEval.pawns[p];
    }
}

function knightEval(board: board_.board_t, US: board_.Colors) {
    let sq: number, moves: bitboard_.bitboard_t, mob: number;
    const pov = (1 - US * 2);
    const THEM = US ^ 1;
    const isWhite = (US === board_.Colors.WHITE);
    const DOWN = -util_.pawnPush(US);
    const pce = (isWhite) ? board_.Pieces.WHITEKNIGHT : board_.Pieces.BLACKKNIGHT;
    const mobArea = mobilityArea(board, US, attackedBy[(isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN]);
    const outpostRanks = bitboard_.ranks[util_.relativeRank(US, 3)]
        | bitboard_.ranks[util_.relativeRank(US, 4)] | bitboard_.ranks[util_.relativeRank(US, 5)];
    const notOccupied = BigInt.asUintN(64, ~bitboard_.getPieces(US, board));

    const myPawn = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;
    const enemyPawn = (isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN;

    const kingRing = bitboard_.kingSafetyZone(THEM, board_.SQ64(board.kingSquare[THEM]))
        & BigInt.asUintN(64, ~bitboard_.pawnDoubleAttacksBB(THEM, board.piecesBB[enemyPawn]));

    const pceBB = { v: board.piecesBB[pce] };
    while (pceBB.v) {
        sq = bitboard_.poplsb(pceBB);

        moves = bitboard_.knightAttacks(sq);
        attacked2[US] |= moves & attacked[US];
        attacked[US] |= moves;
        attackedBy[pce] |= moves;

        //-- psqt
        boardStaticEval.psqt[util_.Phase.EG] += knightPSQT[util_.Phase.EG][util_.relativeSquare(US, sq)] * pov;
        boardStaticEval.psqt[util_.Phase.MG] += knightPSQT[util_.Phase.MG][util_.relativeSquare(US, sq)] * pov;

        //-- mobility
        mob = bitboard_.popcount({ v: moves & (notOccupied & mobArea) });
        boardStaticEval.mobility[util_.Phase.EG] += mobilityBonus[util_.Phase.EG][0][mob] * pov;
        boardStaticEval.mobility[util_.Phase.MG] += mobilityBonus[util_.Phase.MG][0][mob] * pov;

        //-- pieces
        const allPawns = board.piecesBB[myPawn] | board.piecesBB[enemyPawn];

        // bishop shielded by pawn
        if (bitboard_.isSet(bitboard_.shift(DOWN, allPawns), sq)) {
            boardStaticEval.pieces[util_.Phase.EG] += minorBehindPawn[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += minorBehindPawn[util_.Phase.MG] * pov;
        }

        // outpost
        if (bitboard_.isSet(outpostRanks, sq)
            && !(bitboard_.pawnAttackSpan(US, sq) & board.piecesBB[enemyPawn])) {
            const outside = +bitboard_.isSet(bitboard_.files[0] | bitboard_.files[7], sq);
            const defended = +bitboard_.isSet(attackedBy[myPawn], sq);
            boardStaticEval.pieces[util_.Phase.EG] += knightOutposts[util_.Phase.EG][outside][defended] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += knightOutposts[util_.Phase.MG][outside][defended] * pov;

        }
        // outpost bonus for potential moves
        else if (moves & ~pawnSpan[THEM] & outpostRanks & notOccupied) {
            boardStaticEval.pieces[util_.Phase.EG] += reachableOutpost[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += reachableOutpost[util_.Phase.MG] * pov;

        }

        // penalty for being too far from king
        boardStaticEval.pieces[util_.Phase.EG] -= knightProtector[util_.Phase.EG] * util_.distance(board_.SQ64(board.kingSquare[US]), sq) * pov;
        boardStaticEval.pieces[util_.Phase.MG] -= knightProtector[util_.Phase.MG] * util_.distance(board_.SQ64(board.kingSquare[US]), sq) * pov;

        // King Safety calculations
        if (kingRing & moves) {
            kingAttackCount[THEM] += bitboard_.popcount({ v: kingRing & moves });
            kingAttackersCount[THEM]++;
            kingAttackWeight[THEM] += KingAttackWeights[util_.PieceType.KNIGHT];
        }
    }
}

function bishopEval(board: board_.board_t, US: board_.Colors,) {
    let sq: number, moves: bitboard_.bitboard_t, mob: number;
    const pov = (1 - US * 2);
    const THEM = US ^ 1;
    const isWhite = (US === board_.Colors.WHITE);
    const DOWN = -util_.pawnPush(US);
    const pce = (isWhite) ? board_.Pieces.WHITEBISHOP : board_.Pieces.BLACKBISHOP;
    const mobArea = mobilityArea(board, US, attackedBy[(isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN]);
    const outpostRanks = bitboard_.ranks[util_.relativeRank(US, 3)]
        | bitboard_.ranks[util_.relativeRank(US, 4)] | bitboard_.ranks[util_.relativeRank(US, 5)];
    const notOccupied = BigInt.asUintN(64, ~bitboard_.getPieces(US, board));

    const myPawn = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;
    const enemyPawn = (isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN;
    const kingRing = bitboard_.kingSafetyZone(THEM, board_.SQ64(board.kingSquare[THEM]))
        & BigInt.asUintN(64, ~bitboard_.pawnDoubleAttacksBB(THEM, board.piecesBB[enemyPawn]));


    // x-ray through queens
    const occ = bitboard_.getPieces(US, board) | bitboard_.getPieces(THEM, board)
        ^ (board.piecesBB[board_.Pieces.BLACKQUEEN] ^ board.piecesBB[board_.Pieces.WHITEQUEEN]);

    const pceBB = { v: board.piecesBB[pce] };

    // bishop pairs
    if ((pceBB.v & bitboard_.lightSquares) && (pceBB.v & bitboard_.darkSquares)) {
        console.log("pair")
        boardStaticEval.pieces[util_.Phase.EG] += bishopPair[util_.Phase.EG] * pov;
        boardStaticEval.pieces[util_.Phase.MG] += bishopPair[util_.Phase.MG] * pov;
    }
    while (pceBB.v) {
        sq = bitboard_.poplsb(pceBB);

        moves = bitboard_.bishopAttacks(sq, occ);
        attacked2[US] |= moves & attacked[US];
        attacked[US] |= moves;
        attackedBy[pce] |= moves;

        //-- psqt
        boardStaticEval.psqt[util_.Phase.EG] += bishopPSQT[util_.Phase.EG][util_.relativeSquare(US, sq)] * pov;
        boardStaticEval.psqt[util_.Phase.MG] += bishopPSQT[util_.Phase.MG][util_.relativeSquare(US, sq)] * pov;

        //-- mobility
        mob = bitboard_.popcount({ v: moves & mobArea });
        boardStaticEval.mobility[util_.Phase.EG] += mobilityBonus[util_.Phase.EG][1][mob] * pov;
        boardStaticEval.mobility[util_.Phase.MG] += mobilityBonus[util_.Phase.MG][1][mob] * pov;

        //-- pieces
        const allPawns = board.piecesBB[myPawn] | board.piecesBB[enemyPawn];

        // bishop pawn: 
        // number of pawns on the same color square as the bishop multiplied by one plus the
        // number of our blocked pawns in the center files C, D, E or F
        const blocked = board.piecesBB[myPawn] & bitboard_.shift(DOWN, bitboard_.getPieces(US, board) | bitboard_.getPieces(THEM, board));
        const psc = (bitboard_.isSet(bitboard_.lightSquares, sq)) ? bitboard_.lightSquares & board.piecesBB[myPawn]
            : bitboard_.darkSquares & board.piecesBB[myPawn];
        const bp = bitboard_.popcount({ v: psc })
            * ((+!(bitboard_.isSet(attackedBy[myPawn], sq))) + bitboard_.popcount({ v: blocked & bitboard_.centerFiles }));
        boardStaticEval.pieces[util_.Phase.EG] -= bp * bishopPawn[util_.Phase.EG] * pov;
        boardStaticEval.pieces[util_.Phase.MG] -= bp * bishopPawn[util_.Phase.MG] * pov;

        // bishop shielded by pawn
        if (bitboard_.isSet(bitboard_.shift(DOWN, allPawns), sq)) {
            boardStaticEval.pieces[util_.Phase.EG] += minorBehindPawn[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += minorBehindPawn[util_.Phase.MG] * pov;
        }

        // x-raying enermy pawn
        const xray = bitboard_.popcount({ v: moves & board.piecesBB[enemyPawn] });
        boardStaticEval.pieces[util_.Phase.EG] -= bishopXrayPawns[util_.Phase.EG] * xray * pov;
        boardStaticEval.pieces[util_.Phase.MG] -= bishopXrayPawns[util_.Phase.MG] * xray * pov;

        // fianchettoed bishops that are not blocked by pawns
        if (bitboard_.several(bitboard_.bishopAttacks(sq, allPawns) & bitboard_.centerSquares)) {
            boardStaticEval.pieces[util_.Phase.EG] += bishopLongDiagonal[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += bishopLongDiagonal[util_.Phase.MG] * pov;
        }

        // penalty for being too far from king
        boardStaticEval.pieces[util_.Phase.EG] -= bishopKingProtector[util_.Phase.EG] * util_.distance(board_.SQ64(board.kingSquare[US]), sq) * pov;
        boardStaticEval.pieces[util_.Phase.MG] -= bishopKingProtector[util_.Phase.MG] * util_.distance(board_.SQ64(board.kingSquare[US]), sq) * pov;

        // outpost
        if (bitboard_.isSet(outpostRanks, sq)
            && !(bitboard_.outpost(US, sq) & board.piecesBB[enemyPawn])) {
            const outside = +bitboard_.isSet(bitboard_.files[0] | bitboard_.files[7], sq);
            const defended = +bitboard_.isSet(attackedBy[myPawn], sq);
            boardStaticEval.pieces[util_.Phase.EG] += bishopOutposts[util_.Phase.EG][outside][defended] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += bishopOutposts[util_.Phase.MG][outside][defended] * pov;

        }
        // outpost bonus for potential moves
        else if (moves & ~pawnSpan[THEM] & outpostRanks & notOccupied) {
            boardStaticEval.pieces[util_.Phase.EG] += reachableOutpost[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += reachableOutpost[util_.Phase.MG] * pov;

        }

        // Bishop on king ring
        if (bitboard_.bishopAttacks(sq, board.piecesBB[myPawn] | board.piecesBB[enemyPawn]) & kingRing) {
            boardStaticEval.pieces[util_.Phase.EG] += bishopOnKingRing[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += bishopOnKingRing[util_.Phase.MG] * pov;
        }

        // King Safety calculations
        if (kingRing & moves) {
            kingAttackCount[THEM] += bitboard_.popcount({ v: kingRing & moves });
            kingAttackersCount[THEM]++;
            kingAttackWeight[THEM] += KingAttackWeights[util_.PieceType.BISHOP];
        }

    }
}

function rookEval(board: board_.board_t, US: board_.Colors) {
    let sq: number, moves: bitboard_.bitboard_t, mob: number, open: boolean;
    const pov = (1 - US * 2);
    const THEM = US ^ 1;
    const isWhite = (US === board_.Colors.WHITE);
    const mobArea = mobilityArea(board, US, attackedBy[(isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN]);
    const pce = (isWhite) ? board_.Pieces.WHITEROOK : board_.Pieces.BLACKROOK;
    const myPawnBB = (isWhite) ? board.piecesBB[board_.Pieces.WHITEPAWN]
        : board.piecesBB[board_.Pieces.BLACKPAWN];
    const enemyPawnBB = (isWhite) ? board.piecesBB[board_.Pieces.BLACKPAWN]
        : board.piecesBB[board_.Pieces.WHITEPAWN];

    const kingRing = bitboard_.kingSafetyZone(THEM, board_.SQ64(board.kingSquare[THEM]))
        & BigInt.asUintN(64, ~bitboard_.pawnDoubleAttacksBB(THEM, enemyPawnBB));

    // x-ray through queens, and our rooks
    const occ = bitboard_.getPieces(US, board) | bitboard_.getPieces(THEM, board)
        ^ (board.piecesBB[pce])
        ^ (board.piecesBB[board_.Pieces.BLACKQUEEN] ^ board.piecesBB[board_.Pieces.WHITEQUEEN])

    const pceBB = { v: board.piecesBB[pce] };
    while (pceBB.v) {
        sq = bitboard_.poplsb(pceBB);

        moves = bitboard_.rookAttacks(sq, occ);
        attacked2[US] |= moves & attacked[US];
        attacked[US] |= moves;
        attackedBy[pce] |= moves;

        //-- psqt
        boardStaticEval.psqt[util_.Phase.EG] += rookPSQT[util_.Phase.EG][util_.relativeSquare(US, sq)] * pov;
        boardStaticEval.psqt[util_.Phase.MG] += rookPSQT[util_.Phase.MG][util_.relativeSquare(US, sq)] * pov;

        //-- mobility
        mob = bitboard_.popcount({ v: moves & mobArea });
        boardStaticEval.mobility[util_.Phase.EG] += mobilityBonus[util_.Phase.EG][2][mob] * pov;
        boardStaticEval.mobility[util_.Phase.MG] += mobilityBonus[util_.Phase.MG][2][mob] * pov;

        //-- pieces
        const rF = bitboard_.files[util_.fileOf(sq)];

        // open and semi open files
        if (!(myPawnBB & rF)) {
            open = !(enemyPawnBB & rF);
            boardStaticEval.pieces[util_.Phase.MG] += rookOnOpenFile[util_.Phase.MG][+open] * pov;
            boardStaticEval.pieces[util_.Phase.EG] += rookOnOpenFile[util_.Phase.EG][+open] * pov;
        }
        else {
            const allPieces = bitboard_.getPieces(US, board) | bitboard_.getPieces(THEM, board);
            const blockedPawns = (US === board_.Colors.WHITE) ? board.piecesBB[board_.Pieces.WHITEPAWN] & (allPieces >> 8n)
                : board.piecesBB[board_.Pieces.BLACKPAWN] & (allPieces << 8n);
            if (myPawnBB & blockedPawns & rF) { // If our pawn on this file is blocked, increase penalty
                boardStaticEval.pieces[util_.Phase.EG] -= rookOnCloseFile[util_.Phase.EG] * pov;
                boardStaticEval.pieces[util_.Phase.MG] -= rookOnCloseFile[util_.Phase.MG] * pov;
            }
            if (mob <= 3) { // Penalty when trapped by the king, even more if the king cannot castle
                const kF = bitboard_.files[util_.filesBoard[board.kingSquare[US]]];
                if ((kF < board_.Files.E_FILE) == (rF < kF)) {
                    boardStaticEval.pieces[util_.Phase.EG] -= rookTrapped[util_.Phase.EG] * (1 + (+!board.castlingRight)) * pov;
                    boardStaticEval.pieces[util_.Phase.MG] -= rookTrapped[util_.Phase.MG] * (1 + (+!board.castlingRight)) * pov;
                }
            }

        }

        // rook on 7th trapping opponent king
        if ((util_.relativeRank(US, util_.ranksBoard[board_.SQ120(sq)]) == 6)
            && (util_.relativeRank(US, util_.ranksBoard[board.kingSquare[THEM]]) >= 6)) {
            boardStaticEval.pieces[util_.Phase.EG] += rookOn7th[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += rookOn7th[util_.Phase.MG] * pov;
        }

        // rook on king rookOnKing
        if (rF & kingRing) {
            boardStaticEval.pieces[util_.Phase.EG] += rookOnKingRing[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] += rookOnKingRing[util_.Phase.MG] * pov;
        }

        // King Safety calculations
        if (kingRing & moves) {
            kingAttackCount[THEM] += bitboard_.popcount({ v: kingRing & moves });
            kingAttackersCount[THEM]++;
            kingAttackWeight[THEM] += KingAttackWeights[util_.PieceType.ROOK];
        }
    }
}


function queenEval(board: board_.board_t, US: board_.Colors) {
    let sq: number, moves: bitboard_.bitboard_t, mob: number;
    const pov = (1 - US * 2);

    const THEM = US ^ 1;
    const isWhite = (US === board_.Colors.WHITE);
    const pce = (isWhite) ? board_.Pieces.WHITEQUEEN : board_.Pieces.BLACKQUEEN;
    const mobArea = mobilityArea(board, US, attackedBy[(isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN]);
    const occ = bitboard_.getPieces(US, board) | bitboard_.getPieces(THEM, board);
    const enemyPawnBB = (isWhite) ? board.piecesBB[board_.Pieces.BLACKPAWN]
        : board.piecesBB[board_.Pieces.WHITEPAWN];

    const kingRing = bitboard_.kingSafetyZone(THEM, board_.SQ64(board.kingSquare[THEM]))
        & BigInt.asUintN(64, ~bitboard_.pawnDoubleAttacksBB(THEM, enemyPawnBB));

    const pceBB = { v: board.piecesBB[pce] };
    while (pceBB.v) {
        sq = bitboard_.poplsb(pceBB);

        moves = bitboard_.queenAttacks(sq, occ);
        attacked2[US] |= moves & attacked[US];
        attacked[US] |= moves;
        attackedBy[pce] |= moves;

        //-- psqt
        boardStaticEval.psqt[util_.Phase.EG] += (queenPSQT[util_.Phase.EG][util_.relativeSquare(US, sq)]) * pov;
        boardStaticEval.psqt[util_.Phase.MG] += (queenPSQT[util_.Phase.MG][util_.relativeSquare(US, sq)]) * pov;

        //-- mobility
        mob = bitboard_.popcount({ v: moves & mobArea });
        boardStaticEval.mobility[util_.Phase.EG] += (mobilityBonus[util_.Phase.EG][3][mob]) * pov;
        boardStaticEval.mobility[util_.Phase.MG] += (mobilityBonus[util_.Phase.MG][3][mob]) * pov;

        // -- pieces
        // Penalty if any relative pin or discovered attack against the queen
        const enemyRookBishop = (isWhite) ? board.piecesBB[board_.Pieces.BLACKROOK] | board.piecesBB[board_.Pieces.BLACKBISHOP]
            : board.piecesBB[board_.Pieces.WHITEBISHOP] | board.piecesBB[board_.Pieces.WHITEROOK]
        const pinner: bitboard_.bitboardObj_t = { v: 0n };
        if (bitboard_.sliderBlockers(enemyRookBishop, sq, board, pinner)) {
            boardStaticEval.pieces[util_.Phase.EG] -= queenRelativePin[util_.Phase.EG] * pov;
            boardStaticEval.pieces[util_.Phase.MG] -= queenRelativePin[util_.Phase.MG] * pov;
        }

        // King Safety calculations
        if (kingRing & moves) {
            kingAttackCount[THEM] += bitboard_.popcount({ v: kingRing & moves });
            kingAttackersCount[THEM]++;
            kingAttackWeight[THEM] += KingAttackWeights[util_.PieceType.QUEEN];
        }

    }
}

function kingEval(board: board_.board_t, US: board_.Colors) {// stockfish
    let b1: bitboard_.bitboard_t, b2: bitboard_.bitboard_t, b3: bitboard_.bitboard_t;
    const THEM = US ^ 1;
    const pov = (1 - US * 2);

    const sq = board_.SQ64(board.kingSquare[US]);
    const moves = bitboard_.kingAttacks(sq);
    attacked2[US] |= moves & attacked[US];
    attacked[US] |= moves;
    attackedBy[util_.ptToP(US, util_.PieceType.KING)] |= moves;


    const myKingRing = bitboard_.kingSafetyZone(US, board_.SQ64(board.kingSquare[US]))
        & BigInt.asUintN(64, ~bitboard_.pawnDoubleAttacksBB(US, board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)]));

    //-- psqt
    boardStaticEval.psqt[util_.Phase.EG] += kingPSQT[util_.Phase.EG][util_.relativeSquare(US, sq)] * pov;
    boardStaticEval.psqt[util_.Phase.MG] += kingPSQT[util_.Phase.MG][util_.relativeSquare(US, sq)] * pov;


    const camp = (US === board_.Colors.WHITE) ? (BigInt.asUintN(64, ~0n)) ^ bitboard_.ranks[5] ^ bitboard_.ranks[6] ^ bitboard_.ranks[7]
        : (BigInt.asUintN(64, ~0n)) ^ bitboard_.ranks[0] ^ bitboard_.ranks[1] ^ bitboard_.ranks[2];

    let kingDanger = 0;
    let unsafeChecks = 0n;


    // Weak squares are attacked by the enemy, defended no more
    // than once and only defended by our Queens or our King
    const weak = attacked[THEM]
        & ~attacked2[US]
        & (~attacked[US] | attackedBy[util_.ptToP(US, util_.PieceType.QUEEN)] | attackedBy[util_.ptToP(US, util_.PieceType.KING)]);

    // Safe target squares are defended or are weak and attacked by two.
    // We exclude squares containing pieces which we cannot capture.
    const safe = ~bitboard_.getPieces(THEM, board)
        & (attacked[US] | (weak & attacked2[THEM]));

    // Find square and piece combinations which would check our King
    const occ = (bitboard_.getPieces(THEM, board) | bitboard_.getPieces(US, board))
        ^ board.piecesBB[util_.ptToP(US, util_.PieceType.QUEEN)];

    b1 = bitboard_.rookAttacks(sq, occ);
    b2 = bitboard_.bishopAttacks(sq, occ);
    b3 = 0n;

    // Enemy rooks checks
    const rookChecks = b1 & safe & attackedBy[util_.ptToP(THEM, util_.PieceType.ROOK)];
    if (rookChecks) kingDanger += SafeCheck[util_.PieceType.ROOK][+bitboard_.several(rookChecks)]
    else unsafeChecks |= b1 & attackedBy[util_.ptToP(THEM, util_.PieceType.ROOK)];

    // Enemy queen safe checks: count them only if the checks are from squares from
    // which opponent cannot give a rook check, because rook checks are more valuable.
    const queenChecks = (b1 | b2) & safe & attackedBy[util_.ptToP(THEM, util_.PieceType.QUEEN)]
        & ~(attackedBy[util_.ptToP(US, util_.PieceType.QUEEN)] | rookChecks);
    if (queenChecks) kingDanger += SafeCheck[util_.PieceType.QUEEN][+bitboard_.several(queenChecks)]


    // Enemy bishops checks: count them only if they are from squares from which
    // opponent cannot give a queen check, because queen checks are more valuable.
    const bishopChecks = b2 & safe & attackedBy[util_.ptToP(THEM, util_.PieceType.BISHOP)] & ~queenChecks;
    if (bishopChecks) kingDanger += SafeCheck[util_.PieceType.BISHOP][+bitboard_.several(bishopChecks)]
    else unsafeChecks |= b2 & attackedBy[util_.ptToP(THEM, util_.PieceType.BISHOP)];

    // Enemy knights checks
    const knightChecks = bitboard_.kingAttacks(sq) & attackedBy[util_.ptToP(THEM, util_.PieceType.KNIGHT)];
    if (knightChecks & safe) kingDanger += SafeCheck[util_.PieceType.BISHOP][+bitboard_.several(bishopChecks & safe)];
    else unsafeChecks |= knightChecks;

    // Find the squares that opponent attacks in our king flank, the squares
    // which they attack twice in that flank, and the squares that we defend.
    b1 = attacked[THEM] & bitboard_.kingFlank[util_.fileOf(sq)] & camp;
    b2 = b1 & attacked2[THEM];
    b3 = attacked[US] & bitboard_.kingFlank[util_.fileOf(sq)] & camp;

    const kingFlankAttack = bitboard_.popcount({ v: b1 }) + bitboard_.popcount({ v: b2 });
    const kingFlankDefense = bitboard_.popcount({ v: b3 });
    const kingDefenders = bitboard_.sliderBlockers(bitboard_.getPieces(THEM, board), sq, board, { v: 0n });


    kingDanger += kingAttackersCount[THEM] * kingAttackWeight[THEM]
        + 185 * bitboard_.popcount({ v: myKingRing & weak })
        + 148 * bitboard_.popcount({ v: unsafeChecks })
        + 98 * bitboard_.popcount({ v: kingDefenders })
        + 69 * kingAttackCount[THEM]
        + ((US == board_.Colors.WHITE) ? boardStaticEval.mobility[util_.Phase.MG] : -boardStaticEval.mobility[util_.Phase.MG])
        + 3 * kingFlankAttack * kingFlankAttack / 8
        - 873 * ((board.piecesBB[util_.ptToP(THEM, util_.PieceType.QUEEN)]) ? 0 : 1)
        - 100 * ((attackedBy[util_.ptToP(US, util_.PieceType.KNIGHT)] & attackedBy[util_.ptToP(US, util_.PieceType.KING)]) ? 1 : 0)
        - 4 * kingFlankDefense
        + 37;

    // Transform the kingDanger units into a Score, and subtract it from the evaluation
    if (kingDanger > 100) {
        boardStaticEval.kingSafety[util_.Phase.MG] -= ((kingDanger * kingDanger / 4096) << 0) * pov;
        boardStaticEval.kingSafety[util_.Phase.EG] -= ((kingDanger / 16) << 0) * pov;
    }

    // Penalty when our king is on a pawnless flank
    if (!((board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)] | board.piecesBB[util_.ptToP(THEM, util_.PieceType.PAWN)]) & bitboard_.kingFlank[util_.fileOf(sq)])) {
        boardStaticEval.kingSafety[util_.Phase.MG] -= pawnlessFlank[util_.Phase.MG] * pov;
        boardStaticEval.kingSafety[util_.Phase.EG] -= pawnlessFlank[util_.Phase.EG] * pov;
    }

    // Penalty if king flank is under attack, potentially moving toward the king
    boardStaticEval.kingSafety[util_.Phase.EG] -= flankAttacks[util_.Phase.EG] * kingFlankAttack * pov;
    boardStaticEval.kingSafety[util_.Phase.MG] -= flankAttacks[util_.Phase.MG] * kingFlankAttack * pov;

}

function passedEval(board: board_.board_t, US: board_.Colors) {
    const pov = (1 - US * 2);
    const THEM = US ^ 1;
    const isWhite = (US === board_.Colors.WHITE);
    const Up = Number(util_.pawnPush(US));
    const Down = -Up;

    const myPawn = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;
    const enemyPawn = (isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN;


    const kingProximity = (c: board_.Colors, sq: number): number => {
        return Math.min(util_.distance(board_.SQ64(board.kingSquare[c]), sq), 5)
    };

    let b: bitboard_.bitboard_t, bb: bitboard_.bitboard_t, sq2Queen: bitboard_.bitboard_t
    let unsafeSq: bitboard_.bitboard_t, helpers: bitboard_.bitboard_t


    let eg = 0; let mg = 0;
    b = passedPawn[US];


    const blockedPassers = b & bitboard_.shift(Down, board.piecesBB[enemyPawn])
    if (blockedPassers) {
        helpers = bitboard_.shift(Up, board.piecesBB[myPawn])
            & BigInt.asUintN(64, ~bitboard_.getPieces(THEM, board))
            & (BigInt.asUintN(64, ~attacked2[THEM]) | attacked[US])

        // Remove blocked candidate passers that don't have help to pass
        b &= ~blockedPassers
            | bitboard_.shift(bitboard_.Direction.WEST, helpers)
            | bitboard_.shift(bitboard_.Direction.EAST, helpers)
    }


    const vB: bitboard_.bitboardObj_t = { v: b };
    while (vB.v) {
        const sq = bitboard_.poplsb(vB)
        util_.ASSERT(!(board.piecesBB[enemyPawn] & bitboard_.forwardFiles(US, sq + Up)))
        const r = util_.relativeRank(US, util_.rankOf(sq))
        const bonus = [...passedRank[r]]; //clone Arrays

        if (r > board_.Ranks.THIRD_RANK) {
            const w = 5 * r - 13;
            const blockSq = sq + Up;

            // Adjust bonus based on the king's proximity
            bonus[util_.Phase.EG] += (kingProximity(THEM, blockSq) * 19 / 4
                - kingProximity(US, blockSq) * 2) * w;

            // If blockSq is not the queening square then consider also a second push
            if (r != board_.Ranks.SEVENTH_RANK)
                bonus[util_.Phase.EG] -= kingProximity(US, blockSq + Up) * w;

            // If the pawn is free to advance, then increase the bonus
            if (board.pieces[board_.SQ120(blockSq)] == board_.Pieces.EMPTY) {
                sq2Queen = bitboard_.forwardFiles(US, sq);
                unsafeSq = bitboard_.passedPawn(US, sq);

                bb = bitboard_.forwardFiles(THEM, sq)
                    & ((board.piecesBB[board_.Pieces.WHITEQUEEN] | board.piecesBB[board_.Pieces.BLACKQUEEN])
                        | (board.piecesBB[board_.Pieces.WHITEROOK] | board.piecesBB[board_.Pieces.BLACKROOK])
                    )


                if (!(bitboard_.getPieces(THEM, board) & bb))
                    unsafeSq &= attacked[THEM] | bitboard_.getPieces(THEM, board);

                // If there are no enemy pieces or attacks on passed pawn span, assign a big bonus.
                // Or if there is some, but they are all attacked by our pawns, assign a bit smaller bonus.
                // Otherwise assign a smaller bonus if the path to queen is not attacked
                // and even smaller bonus if it is attacked but block square is not.
                let k = !unsafeSq ? 36 :
                    !(unsafeSq & (BigInt.asUintN(64, ~attackedBy[myPawn]))) ? 30 :
                        !(unsafeSq & sq2Queen) ? 17 :
                            !(unsafeSq & bitboard_.bit(blockSq)) ? 7 :
                                0;
                // Assign a larger bonus if the block square is defended
                if ((bitboard_.getPieces(US, board) & bb) || (attacked[US] & bitboard_.bit(blockSq)))
                    k += 5;

                bonus[util_.Phase.EG] += k * w
                bonus[util_.Phase.MG] += k * w
            }
        } // r > RANK_3

        const d = Math.min(util_.fileOf(sq), board_.Files.H_FILE - util_.fileOf(sq))
        eg += bonus[util_.Phase.EG] - passedFile[util_.Phase.EG] * d
        mg += bonus[util_.Phase.MG] - passedFile[util_.Phase.MG] * d

    }

    boardStaticEval.passed[util_.Phase.MG] += mg * pov
    boardStaticEval.passed[util_.Phase.EG] += eg * pov
}

/**
 * Second-degree polynomial material imbalance by Tord Romstad
 * @param board
 */
function imbalanceEval(board: board_.board_t, US: board_.Colors) {
    const pieceCount = [// piece_count[COLOR][PIECE_6]
        [
            +(board.numberPieces[board_.Pieces.WHITEBISHOP] > 1), board.numberPieces[board_.Pieces.WHITEPAWN], board.numberPieces[board_.Pieces.WHITEKNIGHT],
            board.numberPieces[board_.Pieces.WHITEBISHOP], board.numberPieces[board_.Pieces.WHITEROOK], board.numberPieces[board_.Pieces.WHITEQUEEN],
        ],
        [
            +(board.numberPieces[board_.Pieces.BLACKBISHOP] > 1), board.numberPieces[board_.Pieces.BLACKPAWN], board.numberPieces[board_.Pieces.BLACKKNIGHT],
            board.numberPieces[board_.Pieces.BLACKBISHOP], board.numberPieces[board_.Pieces.BLACKROOK], board.numberPieces[board_.Pieces.BLACKQUEEN],
        ]
    ];

    const pov = (1 - US * 2);
    const THEM = US ^ 1;
    for (let j = util_.PieceType.NO_PIECE_TYPE; j <= util_.PieceType.QUEEN; ++j) {
        if (!pieceCount[US][j]) continue;
        const v = [qOurs[j][j][util_.Phase.MG] * pieceCount[US][j], qOurs[j][j][util_.Phase.EG] * pieceCount[US][j]];
        for (let i = util_.PieceType.NO_PIECE_TYPE; i < j; ++i) {
            for (let p = util_.Phase.MG; p <= util_.Phase.EG; p++) {
                v[p] += qOurs[j][i][p] * pieceCount[US][i] + qTheirs[j][i][p] * pieceCount[THEM][i];
            }

        }
        for (let p = util_.Phase.MG; p <= util_.Phase.EG; p++) boardStaticEval.imbalance[p] += (((pieceCount[US][j] * v[p]) / 16) << 0) * pov;
    }
}

function spaceEval(board: board_.board_t, US: board_.Colors) {
    const THEM = US ^ 1;
    const Up = util_.pawnPush(US);
    const Down = -Up;
    const pov = (1 - US * 2);
    // Early exit if, for example, both queens or 6 minor pieces have been exchanged
    if ((board.numberMinorPieces[US] + board.numberMinorPieces[THEM]
        + 2 * (board.numberMajorPieces[US] + board.numberMajorPieces[THEM] - 2)) >= 12) {
        const spaceMask =
            US == board_.Colors.WHITE ? bitboard_.centerFiles & (bitboard_.ranks[1] | bitboard_.ranks[2] | bitboard_.ranks[3])
                : bitboard_.centerFiles & (bitboard_.ranks[6] | bitboard_.ranks[5] | bitboard_.ranks[4]);

        // Find the available squares for our pieces inside the area defined by SpaceMask
        const safe = spaceMask
            & BigInt.asUintN(64, ~board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)])
            & BigInt.asUintN(64, ~attackedBy[util_.ptToP(THEM, util_.PieceType.PAWN)])

        // Find all squares which are at most three squares behind some friendly pawn
        let behind = board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)];
        behind |= bitboard_.shift(Down, behind);
        behind |= bitboard_.shift(Down + Down, behind);

        // Compute space score based on the number of safe squares and number of our pieces
        // increased with number of total blocked pawns in position.
        const bonus = bitboard_.popcount({ v: safe })
            + bitboard_.popcount({ v: behind & safe & BigInt.asUintN(64, ~attacked[THEM]) });

        const doubleAttackThem = bitboard_.pawnDoubleAttacksBB(THEM, board.piecesBB[util_.ptToP(THEM, util_.PieceType.PAWN)]);
        const blockedByOppPawns = bitboard_.shift(Up, board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)])
            & (board.piecesBB[util_.ptToP(THEM, util_.PieceType.PAWN)] | doubleAttackThem)

        const number_blocked = bitboard_.popcount({ v: blockedByOppPawns });
        const weight = bitboard_.popcount({ v: bitboard_.getPieces(US, board) }) - 3 + Math.min(number_blocked, 9);

        boardStaticEval.space[util_.Phase.MG] += ((bonus * weight * weight / 16) << 0) * pov;
    }
}

// Evaluation::threats() assigns bonuses according to the types of the
// attacking and the attacked pieces.
function threatsEval(board: board_.board_t, US: board_.Colors) {
    const THEM = US ^ 1;
    const Up = util_.pawnPush(US);
    const pov = (1 - US * 2);
    const thirdRankBB = (US == board_.Colors.WHITE) ? bitboard_.ranks[2] : bitboard_.ranks[5];

    let b: bitboard_.bitboardObj_t, cnt: number;

    // Non-pawn enemies
    const nonPawnEnemies = bitboard_.getPieces(THEM, board)
        & BigInt.asUintN(64, ~(board.piecesBB[util_.ptToP(THEM, util_.PieceType.PAWN)] | board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)]));

    // Squares strongly protected by the enemy, either because they defend the
    // square with a pawn, or because they defend the square twice and we don't.
    const stronglyProtected = attackedBy[util_.ptToP(THEM, util_.PieceType.PAWN)]
        | (attacked2[THEM] & BigInt.asUintN(64, ~attacked2[US]));

    // Non-pawn enemies, strongly protected
    const defended = nonPawnEnemies & stronglyProtected;

    // Enemies not strongly protected and under our attack
    const weak = bitboard_.getPieces(THEM, board) & BigInt.asUintN(64, ~stronglyProtected) & attacked[US];

    // Bonus according to the kind of attacking pieces
    if (defended | weak) {
        b = {
            v: (defended | weak) & (attackedBy[util_.ptToP(US, util_.PieceType.KNIGHT)] | attackedBy[util_.ptToP(US, util_.PieceType.BISHOP)])
        };
        while (b.v) {
            const pce = util_.pToPt(board.pieces[board_.SQ120(bitboard_.poplsb(b))]);
            boardStaticEval.threat[util_.Phase.MG] += threatByMinor[pce][util_.Phase.MG] * pov;
            boardStaticEval.threat[util_.Phase.EG] += threatByMinor[pce][util_.Phase.EG] * pov;
        }

        b = { v: weak & attackedBy[util_.ptToP(US, util_.PieceType.ROOK)] };
        while (b.v) {
            const pce = util_.pToPt(board.pieces[board_.SQ120(bitboard_.poplsb(b))]);
            boardStaticEval.threat[util_.Phase.MG] += threatByRook[pce][util_.Phase.MG] * pov;
            boardStaticEval.threat[util_.Phase.EG] += threatByRook[pce][util_.Phase.EG] * pov;
        }

        if (weak & attackedBy[util_.ptToP(US, util_.PieceType.KING)]) {
            boardStaticEval.threat[util_.Phase.MG] += threatByKing[util_.Phase.MG] * pov;
            boardStaticEval.threat[util_.Phase.EG] += threatByKing[util_.Phase.EG] * pov;
        }

        b = {
            v: BigInt.asUintN(64, ~attacked[THEM])
                | (nonPawnEnemies & attacked2[US])
        };
        cnt = bitboard_.popcount({ v: weak & b.v });
        boardStaticEval.threat[util_.Phase.MG] += hanging[util_.Phase.MG] * cnt * pov;
        boardStaticEval.threat[util_.Phase.EG] += hanging[util_.Phase.EG] * cnt * pov;

        // Additional bonus if weak piece is only protected by a queen
        cnt = bitboard_.popcount({ v: weak & attackedBy[util_.ptToP(THEM, util_.PieceType.QUEEN)] });
        boardStaticEval.threat[util_.Phase.MG] += weakQueenProtection[util_.Phase.MG] * cnt * pov;
        boardStaticEval.threat[util_.Phase.EG] += weakQueenProtection[util_.Phase.EG] * cnt * pov;
    }

    // Bonus for restricting their piece moves
    b = {
        v: attacked[THEM] & BigInt.asUintN(64, ~stronglyProtected) & attacked[US]
    }

    cnt = bitboard_.popcount(b);
    boardStaticEval.threat[util_.Phase.MG] += restrictedPiece[util_.Phase.MG] * cnt * pov;
    boardStaticEval.threat[util_.Phase.EG] += restrictedPiece[util_.Phase.EG] * cnt * pov;


    // Protected or unattacked squares
    let safe = BigInt.asUintN(64, ~attacked[THEM]) | attacked[US];

    // Bonus for attacking enemy pieces with our relatively safe pawns
    b = {
        v: bitboard_.pawnAttacksBB(US, board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)] & safe) & nonPawnEnemies
    }
    cnt = bitboard_.popcount(b);
    boardStaticEval.threat[util_.Phase.MG] += threatBySafePawn[util_.Phase.MG] * cnt * pov;
    boardStaticEval.threat[util_.Phase.EG] += threatBySafePawn[util_.Phase.EG] * cnt * pov;

    // Find squares where our pawns can push on the next move
    const allSquares = bitboard_.getPieces(US, board) | bitboard_.getPieces(THEM, board);
    b = {
        v: bitboard_.shift(Up, board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)]) & BigInt.asUintN(64, ~allSquares)
    }
    b.v |= bitboard_.shift(Up, b.v & thirdRankBB) & BigInt.asUintN(64, ~allSquares);

    // Keep only the squares which are relatively safe
    b.v &= BigInt.asUintN(64, ~attackedBy[util_.ptToP(THEM, util_.PieceType.PAWN)]) & safe;

    // Bonus for safe pawn threats on the next move
    b.v = bitboard_.pawnAttacksBB(US, b.v) & nonPawnEnemies;
    cnt = bitboard_.popcount(b);
    boardStaticEval.threat[util_.Phase.MG] += threatByPawnPush[util_.Phase.MG] * cnt * pov;
    boardStaticEval.threat[util_.Phase.EG] += threatByPawnPush[util_.Phase.EG] * cnt * pov;

    // Bonus for threats on the next moves against enemy queen
    if (board.numberPieces[util_.ptToP(THEM, util_.PieceType.QUEEN)] == 1) {
        const queenImbalance = +((board.numberPieces[util_.ptToP(THEM, util_.PieceType.QUEEN)] + board.numberPieces[util_.ptToP(US, util_.PieceType.QUEEN)]) == 1);
        const sq = bitboard_.poplsb({ v: board.piecesBB[util_.ptToP(THEM, util_.PieceType.QUEEN)] });
        const mobArea = mobilityArea(
            board,
            US,
            attackedBy[(US == board_.Colors.WHITE) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN]
        );
        safe = mobArea
            & BigInt.asUintN(64, ~board.piecesBB[util_.ptToP(US, util_.PieceType.PAWN)])
            & BigInt.asUintN(64, ~stronglyProtected);


        b = {
            v: attackedBy[util_.ptToP(US, util_.PieceType.KNIGHT)] & bitboard_.knightAttacks(sq)
        }
        cnt = bitboard_.popcount({ v: b.v & safe });
        boardStaticEval.threat[util_.Phase.MG] += knightOnQueen[util_.Phase.MG] * cnt * (1 + queenImbalance) * pov;
        boardStaticEval.threat[util_.Phase.EG] += knightOnQueen[util_.Phase.EG] * cnt * (1 + queenImbalance) * pov;

        b = {
            v: (attackedBy[util_.ptToP(US, util_.PieceType.BISHOP)] & bitboard_.bishopAttacks(sq, allSquares))
                | (attackedBy[util_.ptToP(US, util_.PieceType.ROOK)] & bitboard_.rookAttacks(sq, allSquares))
        }
        cnt = bitboard_.popcount({ v: b.v & safe & attacked2[US] });
        boardStaticEval.threat[util_.Phase.MG] += sliderOnQueen[util_.Phase.MG] * cnt * (1 + queenImbalance) * pov;
        boardStaticEval.threat[util_.Phase.EG] += sliderOnQueen[util_.Phase.EG] * cnt * (1 + queenImbalance) * pov;
    }

}

/**
 * gameEvaluation is used to heuristically determine the relative value of a positions 
 * used in general case when no specialized evaluation or tablebase evaluation is available
 * @param board 
 */
function gameEvaluation(board: board_.board_t): [number, number] {
    const sumScore = (phase: util_.Phase): number => {
        return (
            boardStaticEval.psqt[phase] + boardStaticEval.imbalance[phase] + boardStaticEval.pawns[phase] + boardStaticEval.pieces[phase]
            + boardStaticEval.pieceValue[phase] + boardStaticEval.mobility[phase] + boardStaticEval.threat[phase] + boardStaticEval.passed[phase]
            + boardStaticEval.space[phase] + boardStaticEval.kingSafety[phase]
        );
    }
    const colorLoop = (fn: (board: board_.board_t, color: board_.Colors) => void) => {
        for (let color = board_.Colors.WHITE; color < board_.Colors.BOTH; color++) fn(board, color);
    }

    initEvaluation();

    //-- piece value
    boardStaticEval.pieceValue[util_.Phase.MG] = (board.materialMg[board_.Colors.WHITE] - board.materialMg[board_.Colors.BLACK]);
    boardStaticEval.pieceValue[util_.Phase.EG] = (board.materialEg[board_.Colors.WHITE] - board.materialEg[board_.Colors.BLACK]);
    //-- Pawns
    pawnEval(board);

    //-- pieces
    colorLoop(knightEval);
    colorLoop(bishopEval);
    colorLoop(rookEval);
    colorLoop(queenEval);

    //-- king
    colorLoop(kingEval);

    //-- passed
    colorLoop(passedEval)


    //-- imbalance
    colorLoop(imbalanceEval);

    //-- space
    colorLoop(spaceEval);

    //-- threat
    colorLoop(threatsEval);

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

    const white = bitboard_.getPieces(board_.Colors.WHITE, board);

    const black = bitboard_.getPieces(board_.Colors.BLACK, board);

    const weak = eg < 0 ? white : black;
    const strong = eg < 0 ? black : white;


    // Check for opposite coloured bishops
    if (bitboard_.onlyOne(white & bishops)
        && bitboard_.onlyOne(black & bishops)
        && bitboard_.onlyOne(bishops & bitboard_.lightSquares)) {

        // Scale factor for OCB + knights
        if (!(rooks | queens)
            && bitboard_.onlyOne(white & knights)
            && bitboard_.onlyOne(black & knights))
            return Scale.OCB_ONE_KNIGHT;

        // Scale factor for OCB + rooks
        if (!(knights | queens)
            && bitboard_.onlyOne(white & rooks)
            && bitboard_.onlyOne(black & rooks))
            return Scale.OCB_ONE_ROOK;

        // Scale factor for lone OCB
        if (!(knights | rooks | queens))
            return Scale.OCB_BISHOPS_ONLY;
    }

    // Lone Queens are weak against multiple pieces
    if (bitboard_.onlyOne(queens) && bitboard_.several(pieces) && pieces == (weak & pieces))
        return Scale.LONE_QUEEN;

    // Lone Minor vs King + Pawns should never be won
    if ((strong & minors) && bitboard_.popcount({ v: strong }) == 2)
        return Scale.DRAW;

    // Scale up lone pieces with massive pawn advantages
    if (!queens
        && !bitboard_.several(pieces & white)
        && !bitboard_.several(pieces & black)
        && bitboard_.popcount({ v: strong & pawns }) - bitboard_.popcount({ v: weak & pawns }) > 2)
        return Scale.LARGE_PAWN_ADV;

    return Scale.NORMAL;
}

/**
 * Classical Evaluation of board
 * https://hxim.github.io/Stockfish-Evaluation-Guide/
 * @param board 
 */
function raccoonEvaluate(position: board_.board_t): number {
    const [mg, eg] = gameEvaluation(position);
    const p = phase(position), tempo = TEMPO * ((position.turn === board_.Colors.WHITE) ? 1 : -1);
    let score = (((mg * p + ((eg * (256 - p) * (scaleFactor(position, eg) / Scale.NORMAL)) << 0)) / 256) << 0);
    score += tempo;
    return score;
}

export {
    raccoonEvaluate
}
