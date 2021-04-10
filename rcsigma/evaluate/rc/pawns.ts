// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------
import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as bitboard_ from '../../game/bitboard'

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

// Pawn penalties
const Backward = [9, 22];
const Doubled = [13, 51];
const DoubledEarly = [20, 7];
const Isolated = [3, 15];
const WeakLever = [4, 58];
const WeakUnopposed = [13, 24];

const Connected = [0, 5, 7, 11, 23, 48, 87];
const BlockedPawn = [[- 17, -6], [-9, 2]];

// Strength of pawn shelter for our king by [distance from edge][rank].
// RANK_1 = 0 is used for files where we have no pawn, or pawn is behind our king.
const shelterStrength = [
    [-5, 82, 92, 54, 36, 22, 28],
    [-44, 63, 33, -50, -30, -12, -62],
    [-11, 77, 22, -6, 31, 8, -45],
    [-39, -12, -29, -50, -43, -68, -164]
];

// Danger of enemy pawns moving toward our king by [distance from edge][rank].
// RANK_1 = 0 is used for files where the enemy has no pawn, or their pawn
// is behind our king. Note that UnblockedStorm[0][1-2] accommodate opponent pawn
// on edge, likely blocked by our king.
const unblockedStorm = [
    [87, -288, -168, 96, 47, 44, 46],
    [42, -25, 120, 45, 34, -9, 24],
    [-8, 51, 167, 35, -4, -16, -12],
    [-17, -13, 100, 4, 9, -16, -31]
];
const blockedStorm = [
    [0, 0], [0, 0], [75, 78], [- 8, 16], [-6, 10], [-6, 6], [0, 2]
];


// KingOnFile[semi-open Us][semi-open Them] contains bonuses/penalties
// for king when the king is on a semi-open or open file.
const KingOnFile = [[[-21, 10], [-7, 1]],
[[0, -3], [9, -4]]];


function probePawn(board: board_.board_t): board_.pawnEntry_t {
    let newEntry: board_.pawnEntry_t;
    const key = board.piecesBB[util_.ptToP(board_.Colors.WHITE, util_.PieceType.PAWN)]
        | board.piecesBB[util_.ptToP(board_.Colors.BLACK, util_.PieceType.PAWN)]
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
            passedPawn: (new Array<bitboard_.bitboard_t>(2)).fill(0n),
            boardStaticEval: new util_.staticEval_c()
        }

        for (let c = board_.Colors.WHITE; c < board_.Colors.BOTH; c++) {
            pawnStructure(board, c, newEntry);
            pawnShelter(board, c, newEntry);
        }
        board.pawnEvalHash.set(key, newEntry)
    }

    return newEntry;
}

function pawnStructure(board: board_.board_t, US: board_.Colors, newEntry: board_.pawnEntry_t) {
    let sq: number, r: number, moves: bitboard_.bitboard_t;
    let neighbours: bitboard_.bitboard_t, stoppers: bitboard_.bitboard_t, support: bitboard_.bitboard_t
    let phalanx: bitboard_.bitboard_t, opposed: bitboard_.bitboard_t;
    let lever: bitboard_.bitboard_t, leverPush: bitboard_.bitboard_t, blocked: bitboard_.bitboard_t;
    let backward: boolean, passed: boolean, doubled: boolean;

    const pov = (1 - US * 2);
    const THEM = US ^ 1;
    const isWhite = (US == board_.Colors.WHITE);
    const Up = Number(util_.pawnPush(US));
    const Down = -Up;

    const myPawn = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;
    const enemyPawn = (isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN;
    const doubleAttackThem = bitboard_.pawnDoubleAttacksBB(THEM, board.piecesBB[enemyPawn]);
    const kingRing = bitboard_.kingSafetyZone(THEM, board_.SQ64(board.kingSquare[THEM]))
        & BigInt.asUintN(64, ~doubleAttackThem);

    const pceBB = { v: board.piecesBB[myPawn] };
    while (pceBB.v) {
        sq = bitboard_.poplsb(pceBB);
        r = util_.relativeRank(US, util_.rankOf(sq));

        moves = bitboard_.pawnAttacks(US, sq);
        newEntry.attacked2[US] |= moves & newEntry.attacked[US];
        newEntry.attacked[US] |= moves;
        newEntry.attackedBy[myPawn] |= moves;

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

        // flags
        opposed = board.piecesBB[enemyPawn] & bitboard_.forwardFiles(US, sq);
        blocked = board.piecesBB[enemyPawn] & bitboard_.bit(sq + Up);
        stoppers = board.piecesBB[enemyPawn] & bitboard_.passedPawn(US, sq);
        lever = board.piecesBB[enemyPawn] & bitboard_.pawnAttacks(US, sq);
        leverPush = board.piecesBB[enemyPawn] & bitboard_.pawnAttacks(US, sq + Up);
        doubled = !!(board.piecesBB[myPawn] & bitboard_.bit(sq - Up));
        neighbours = board.piecesBB[myPawn] & bitboard_.adjacentFiles(sq);
        phalanx = neighbours & bitboard_.ranks[util_.rankOf(sq)];
        support = neighbours & bitboard_.ranks[util_.rankOf(sq - Up)];


        if (doubled) {
            // Additional doubled penalty if none of their pawns is fixed
            const fixedBB = board.piecesBB[enemyPawn] | bitboard_.pawnAttacksBB(THEM, board.piecesBB[enemyPawn])
            if (!(board.piecesBB[myPawn] & bitboard_.shift(Down, fixedBB))) {
                newEntry.boardStaticEval.pawns[util_.Phase.EG] -= DoubledEarly[util_.Phase.EG] * pov;
                newEntry.boardStaticEval.pawns[util_.Phase.MG] -= DoubledEarly[util_.Phase.MG] * pov;
            }

        }

        // A pawn is backward when it is behind all pawns of the same color on
        // the adjacent files and cannot safely advance.
        backward = !(neighbours & bitboard_.forwardRanks(THEM, sq + Up))
            && !!(leverPush | blocked);

        // Compute additional span if pawn is not backward nor blocked
        if (!backward && !blocked) {
            newEntry.pawnSpan[US] |= bitboard_.pawnAttackSpan(US, sq)
        }


        /* A pawn is passed if one of the three following conditions is true:
          (a) there is no stoppers except some levers
         (b) the only stoppers are the leverPush, but we outnumber them
          (c) there is only one front stopper which can be levered.
             (Refined in Evaluation::passed)
        */
        passed = !(stoppers ^ lever)
            || (!(stoppers ^ leverPush)
                && (bitboard_.popcount({ v: phalanx }) >= bitboard_.popcount({ v: leverPush }))
            )
            || (stoppers == blocked && r >= board_.Ranks.FIFTH_RANK
                && (!!(bitboard_.shift(Up, (support)) & ~(board.piecesBB[enemyPawn] | doubleAttackThem)))
            );

        passed &&= !(bitboard_.forwardFiles(US, sq) & board.piecesBB[myPawn]);

        // Passed pawns will be properly scored later in evaluation when we have
        if (passed) newEntry.passedPawn[US] |= bitboard_.bit(sq)

        // Score this pawn
        if (support | phalanx) {
            const v = Connected[r] * (2 + (+!!(phalanx)) - (+!!(opposed)))
                + 22 * bitboard_.popcount({ v: support });

            newEntry.boardStaticEval.pawns[util_.Phase.EG] += (v * (r - 2) / 4) * pov;
            newEntry.boardStaticEval.pawns[util_.Phase.MG] += v * pov;
        }

        else if (!neighbours) {
            if (opposed
                && (board.piecesBB[myPawn] & bitboard_.forwardFiles(THEM, sq))
                && !(board.piecesBB[enemyPawn] & bitboard_.adjacentFiles(sq))) {
                newEntry.boardStaticEval.pawns[util_.Phase.EG] -= Doubled[util_.Phase.EG] * pov;
                newEntry.boardStaticEval.pawns[util_.Phase.MG] -= Doubled[util_.Phase.MG] * pov;
            }
            else {
                newEntry.boardStaticEval.pawns[util_.Phase.EG] -= (Isolated[util_.Phase.EG] + WeakUnopposed[util_.Phase.EG] * (+!opposed)) * pov;
                newEntry.boardStaticEval.pawns[util_.Phase.MG] -= (Isolated[util_.Phase.MG] + WeakUnopposed[util_.Phase.MG] * (+!opposed)) * pov;
            }
        }

        else if (backward) {
            newEntry.boardStaticEval.pawns[util_.Phase.EG] -= (Backward[util_.Phase.EG]
                + WeakUnopposed[util_.Phase.EG] * (+!opposed) * (+!!(~(bitboard_.files[0] | bitboard_.files[7]) & bitboard_.bit(sq))))
                * pov;
            newEntry.boardStaticEval.pawns[util_.Phase.MG] -= (Backward[util_.Phase.MG]
                + WeakUnopposed[util_.Phase.MG] * (+!opposed) * (+!!(~(bitboard_.files[0] | bitboard_.files[7]) & bitboard_.bit(sq))))
                * pov;
        }
        if (!support) {
            newEntry.boardStaticEval.pawns[util_.Phase.MG] -= (Doubled[util_.Phase.MG] * (+doubled)
                + WeakLever[util_.Phase.MG] * (+bitboard_.several(lever))) * pov
            newEntry.boardStaticEval.pawns[util_.Phase.EG] -= (Doubled[util_.Phase.EG] * (+doubled)
                + WeakLever[util_.Phase.EG] * (+bitboard_.several(lever))) * pov

        }
        if (blocked && r >= board_.Ranks.FIFTH_RANK) {
            newEntry.boardStaticEval.pawns[util_.Phase.EG] += BlockedPawn[r - board_.Ranks.FIFTH_RANK][util_.Phase.EG] * pov
            newEntry.boardStaticEval.pawns[util_.Phase.MG] += BlockedPawn[r - board_.Ranks.FIFTH_RANK][util_.Phase.MG] * pov

        }
    }
}

function pawnShelter(board: board_.board_t, US: board_.Colors, newEntry: board_.pawnEntry_t) {
    const isWhite = (US === board_.Colors.WHITE);
    const myPawn = (isWhite) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;
    const enemyPawn = (isWhite) ? board_.Pieces.BLACKPAWN : board_.Pieces.WHITEPAWN;
    const pov = (1 - US * 2);
    const THEM = US ^ 1;
    const kingSQ = board_.SQ64(board.kingSquare[US]);

    let b = (board.piecesBB[myPawn] | board.piecesBB[enemyPawn]) & BigInt.asUintN(64, ~bitboard_.forwardRanks(THEM, kingSQ));
    const myPawnBB = b & bitboard_.getPieces(US, board) & BigInt.asUintN(64, ~newEntry.attackedBy[enemyPawn]);
    const enemyPawnBB = b & bitboard_.getPieces(THEM, board)

    newEntry.boardStaticEval.pawns[util_.Phase.MG] += 5 * pov;
    newEntry.boardStaticEval.pawns[util_.Phase.EG] += 5 * pov;

    const c = Math.max(board_.Files.B_FILE, Math.min(util_.fileOf(kingSQ), board_.Files.G_FILE));
    for (let f = c - 1; f <= c + 1; ++f) {
        const d = Math.min(f, board_.Files.H_FILE - f)

        b = myPawnBB & bitboard_.files[f];
        const ourRank = b ? util_.relativeRank(US, util_.rankOf(bitboard_.fmSQ(THEM, b))) : 0;

        b = enemyPawnBB & bitboard_.files[f];
        const theirRank = b ? util_.relativeRank(US, util_.rankOf(bitboard_.fmSQ(THEM, b))) : 0;
        newEntry.boardStaticEval.pawns[util_.Phase.MG] += shelterStrength[d][ourRank] * pov;

        if (ourRank && (ourRank == theirRank - 1)) {
            newEntry.boardStaticEval.pawns[util_.Phase.MG] -= blockedStorm[theirRank][util_.Phase.MG] * pov;
            newEntry.boardStaticEval.pawns[util_.Phase.EG] -= blockedStorm[theirRank][util_.Phase.EG] * pov;
        }
        else
            newEntry.boardStaticEval.pawns[util_.Phase.MG] -= unblockedStorm[d][theirRank] * pov;
    }

    // King On File
    const i = +!(myPawnBB & bitboard_.files[util_.fileOf(kingSQ)]);
    const j = +!(enemyPawnBB & bitboard_.files[util_.fileOf(kingSQ)]);
    newEntry.boardStaticEval.pawns[util_.Phase.MG] -= KingOnFile[i][j][util_.Phase.MG] * pov;
    newEntry.boardStaticEval.pawns[util_.Phase.EG] -= KingOnFile[i][j][util_.Phase.EG] * pov;
}

export {
    probePawn
}