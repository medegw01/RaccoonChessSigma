// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------
import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as bitboard_ from '../../game/bitboard'
import * as eval_ from './eval'

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

const KingAttackWeight = 0;

function probePawn(board: board_.board_t): board_.pawnEntry_t {
    let newEntry: board_.pawnEntry_t;
    const key = board.piecesBB[eval_.ptToP(board_.Colors.WHITE, eval_.PieceType.PAWN)]
        | board.piecesBB[eval_.ptToP(board_.Colors.BLACK, eval_.PieceType.PAWN)]
    if (board.pawnEvalHash.has(key)) {
        newEntry = board.pawnEvalHash.get(key)!;
    } else {
        newEntry = {
            attacked: (new Array<bitboard_.bitboard_t>(2)).fill(0n),
            attacked2: (new Array<bitboard_.bitboard_t>(2)).fill(0n),
            attackedBy: (new Array<bitboard_.bitboard_t>(13)).fill(0n),
            kingAttackCount: (new Array<number>(2)).fill(0),
            kingAttackersCount: (new Array<number>(2)).fill(0),
            kingAttackWeight: (new Array<number>(2)).fill(0),
            pawnSpan: (new Array<bitboard_.bitboard_t>(2)).fill(0n),
            boardStaticEval: new eval_.staticEval_c()
        }

        for (let c = board_.Colors.WHITE; c < board_.Colors.BOTH; c++) pawnEval(board, c, newEntry)
        board.pawnEvalHash.set(key, newEntry)
    }

    return newEntry;
}

function pawnEval(board: board_.board_t, US: board_.Colors, newEntry: board_.pawnEntry_t) {
    let sq: number, moves: bitboard_.bitboard_t;
    const pov = (1 - US * 2);

    const THEM = US ^ 1;
    const isWhite = (US === board_.Colors.WHITE);
    const pce = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;

    const myPawn = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;
    const enemyPawn = (isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN;

    const kingRing = bitboard_.kingSafetyZone(THEM, board_.SQ64(board.kingSquare[THEM]))
        & BigInt.asUintN(64, ~bitboard_.pawnDoubleAttacksBB(THEM, board.piecesBB[enemyPawn]));
    const pceBB = { v: board.piecesBB[pce] };
    while (pceBB.v) {
        sq = bitboard_.poplsb(pceBB);

        moves = bitboard_.pawnAttacks(US, sq);
        newEntry.attacked2[US] |= moves & newEntry.attacked[US];
        newEntry.attacked[US] |= moves;
        newEntry.attackedBy[pce] |= moves;

        newEntry.pawnSpan[US] |= bitboard_.pawnAttackSpan(US, sq);

        //-- psqt
        newEntry.boardStaticEval.psqt[util_.Phase.EG] += pawnPSQT[util_.Phase.EG][util_.relativeSquare(US, sq)] * pov;
        newEntry.boardStaticEval.psqt[util_.Phase.MG] += pawnPSQT[util_.Phase.MG][util_.relativeSquare(US, sq)] * pov;

        // King Safety calculations
        if (kingRing & moves) {
            newEntry.kingAttackCount[THEM] += bitboard_.popcount({ v: kingRing & moves });
            newEntry.kingAttackersCount[THEM]++;
            newEntry.kingAttackWeight[THEM] += KingAttackWeight;
        }
    }
}

export {
    probePawn
}