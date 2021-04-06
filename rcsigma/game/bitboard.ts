// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as board_ from '../game/board'

type bitboard_t = bigint

type bitboardObj_t = {
    v: bitboard_t
}

// racoon will use Plan Bitboard 
// see https://www.chessprogramming.org/Magic_Bitboards for more information
type magic_t = {
    mask: bitboard_t;
    magic: bitboard_t
}

enum Direction {
    NORTH = 8,
    EAST = 1,
    SOUTH = -NORTH,
    WEST = -EAST,

    NORTH_EAST = Number(NORTH) + Number(EAST),
    SOUTH_EAST = Number(SOUTH) + Number(EAST),
    SOUTH_WEST = Number(SOUTH) + Number(WEST),
    NORTH_WEST = Number(NORTH) + Number(WEST)
}


/**
 * bitboard containing all light squares set
 */
const lightSquares = BigInt("0x55AA55AA55AA55AA");

/**
 * bitboard containing all dark squares set
 */
const darkSquares = BigInt("0xAA55AA55AA55AA55");

/**
 * An array containing all rank bitboards.
 */
const ranks: bitboard_t[] = [
    BigInt("0x00000000000000FF"),
    BigInt("0x000000000000FF00"),
    BigInt("0x0000000000FF0000"),
    BigInt("0x00000000FF000000"),
    BigInt("0x000000FF00000000"),
    BigInt("0x0000FF0000000000"),
    BigInt("0x00FF000000000000"),
    BigInt("0xFF00000000000000")
]

/**
 * An array containing all file bitboards.
 */
const files: bitboard_t[] = [
    BigInt("0x0101010101010101"),
    BigInt("0x0202020202020202"),
    BigInt("0x0404040404040404"),
    BigInt("0x0808080808080808"),
    BigInt("0x1010101010101010"),
    BigInt("0x2020202020202020"),
    BigInt("0x4040404040404040"),
    BigInt("0x8080808080808080")
];

const queenSide = files[0] | files[1] | files[2] | files[3];
const centerFiles = files[2] | files[3] | files[4] | files[5];
const kingSide = files[4] | files[5] | files[6] | files[7];
const center = (files[3] | files[4]) & (ranks[3] | ranks[4]);
const centerSquares = (files[3] | files[4]) & (ranks[3] | ranks[4]);

const kingFlank = [
    queenSide ^ files[3], queenSide, queenSide,
    centerFiles, centerFiles,
    kingSide, kingSide, kingSide ^ files[4]
];


const mbits = new Array<bitboard_t>(64);
const isolated = new Array<bitboard_t>(64);
const mkingAttacks = new Array<bitboard_t>(64);
const mknightAttacks = new Array<bitboard_t>(64);

const mpawnAttacks = Array.from(Array<number>(2), () => new Array<bitboard_t>(64));
const xrays = Array.from(Array<number>(8), () => new Array<bitboard_t>(64));
const between = Array.from(Array<number>(64), () => new Array<bitboard_t>(64));
const lines = Array.from(Array<number>(64), () => new Array<bitboard_t>(64));

const passed = Array.from(Array<number>(2), () => new Array<bitboard_t>(64));
const backward = Array.from(Array<number>(2), () => new Array<bitboard_t>(64));
const kingZone = Array.from(Array<number>(2), () => new Array<bitboard_t>(64));
const mOutpost = Array.from(Array<number>(2), () => new Array<bitboard_t>(64));

const mbishopAttacks = Array.from(Array<number>(64), () => new Array<bitboard_t>(512));
const mrookAttacks = Array.from(Array<number>(64), () => new Array<bitboard_t>(4096));

const rookTbl: magic_t[] = [
    { mask: BigInt("0x000101010101017e"), magic: BigInt("0xe580008110204000") }, { mask: BigInt("0x000202020202027c"), magic: BigInt("0x0160002008011000") }, { mask: BigInt("0x000404040404047a"), magic: BigInt("0x3520080020000400") },
    { mask: BigInt("0x0008080808080876"), magic: BigInt("0x6408080448002002") }, { mask: BigInt("0x001010101010106e"), magic: BigInt("0x1824080004020400") }, { mask: BigInt("0x002020202020205e"), magic: BigInt("0x9e04088101020400") },
    { mask: BigInt("0x004040404040403e"), magic: BigInt("0x8508008001000200") }, { mask: BigInt("0x008080808080807e"), magic: BigInt("0x5a000040a4840201") }, { mask: BigInt("0x0001010101017e00"), magic: BigInt("0x0172800180504000") },
    { mask: BigInt("0x0002020202027c00"), magic: BigInt("0x0094200020483000") }, { mask: BigInt("0x0004040404047a00"), magic: BigInt("0x0341400410000800") }, { mask: BigInt("0x0008080808087600"), magic: BigInt("0x007e040020041200") },
    { mask: BigInt("0x0010101010106e00"), magic: BigInt("0x0042104404000800") }, { mask: BigInt("0x0020202020205e00"), magic: BigInt("0x00cc042090008400") }, { mask: BigInt("0x0040404040403e00"), magic: BigInt("0x00a88081000a0200") },
    { mask: BigInt("0x0080808080807e00"), magic: BigInt("0x006c810180840100") }, { mask: BigInt("0x00010101017e0100"), magic: BigInt("0x0021150010208000") }, { mask: BigInt("0x00020202027c0200"), magic: BigInt("0x0000158060004000") },
    { mask: BigInt("0x00040404047a0400"), magic: BigInt("0x0080bc2808402000") }, { mask: BigInt("0x0008080808760800"), magic: BigInt("0x00113e1000200800") }, { mask: BigInt("0x00101010106e1000"), magic: BigInt("0x0002510001010800") },
    { mask: BigInt("0x00202020205e2000"), magic: BigInt("0x0008660814001200") }, { mask: BigInt("0x00404040403e4000"), magic: BigInt("0x0000760400408080") }, { mask: BigInt("0x00808080807e8000"), magic: BigInt("0x0004158180800300") },
    { mask: BigInt("0x000101017e010100"), magic: BigInt("0x00c0826880004000") }, { mask: BigInt("0x000202027c020200"), magic: BigInt("0x0000803901002800") }, { mask: BigInt("0x000404047a040400"), magic: BigInt("0x0020005d88000400") },
    { mask: BigInt("0x0008080876080800"), magic: BigInt("0x0000136a18001000") }, { mask: BigInt("0x001010106e101000"), magic: BigInt("0x0000053200100a00") }, { mask: BigInt("0x002020205e202000"), magic: BigInt("0x0004301aa0010400") },
    { mask: BigInt("0x004040403e404000"), magic: BigInt("0x0001085c80048200") }, { mask: BigInt("0x008080807e808000"), magic: BigInt("0x000000be04040100") }, { mask: BigInt("0x0001017e01010100"), magic: BigInt("0x0001042142401000") },
    { mask: BigInt("0x0002027c02020200"), magic: BigInt("0x0140300036282000") }, { mask: BigInt("0x0004047a04040400"), magic: BigInt("0x0009802008801000") }, { mask: BigInt("0x0008087608080800"), magic: BigInt("0x0000201870841000") },
    { mask: BigInt("0x0010106e10101000"), magic: BigInt("0x0002020926000a00") }, { mask: BigInt("0x0020205e20202000"), magic: BigInt("0x0004040078800200") }, { mask: BigInt("0x0040403e40404000"), magic: BigInt("0x0002000250900100") },
    { mask: BigInt("0x0080807e80808000"), magic: BigInt("0x00008001b9800100") }, { mask: BigInt("0x00017e0101010100"), magic: BigInt("0x0240001090418000") }, { mask: BigInt("0x00027c0202020200"), magic: BigInt("0x0000100008334000") },
    { mask: BigInt("0x00047a0404040400"), magic: BigInt("0x0060086000234800") }, { mask: BigInt("0x0008760808080800"), magic: BigInt("0x0088088011121000") }, { mask: BigInt("0x00106e1010101000"), magic: BigInt("0x000204000e1d2800") },
    { mask: BigInt("0x00205e2020202000"), magic: BigInt("0x00020082002a0400") }, { mask: BigInt("0x00403e4040404000"), magic: BigInt("0x0006021050270a00") }, { mask: BigInt("0x00807e8080808000"), magic: BigInt("0x0000610002548080") },
    { mask: BigInt("0x007e010101010100"), magic: BigInt("0x0401410280201a00") }, { mask: BigInt("0x007c020202020200"), magic: BigInt("0x0001408100104e00") }, { mask: BigInt("0x007a040404040400"), magic: BigInt("0x0020100980084480") },
    { mask: BigInt("0x0076080808080800"), magic: BigInt("0x000a004808286e00") }, { mask: BigInt("0x006e101010101000"), magic: BigInt("0x0000100120024600") }, { mask: BigInt("0x005e202020202000"), magic: BigInt("0x0002000902008e00") },
    { mask: BigInt("0x003e404040404000"), magic: BigInt("0x0001010800807200") }, { mask: BigInt("0x007e808080808000"), magic: BigInt("0x0002050400295a00") }, { mask: BigInt("0x7e01010101010100"), magic: BigInt("0x004100a080004257") },
    { mask: BigInt("0x7c02020202020200"), magic: BigInt("0x000011008048c005") }, { mask: BigInt("0x7a04040404040400"), magic: BigInt("0x8040441100086001") }, { mask: BigInt("0x7608080808080800"), magic: BigInt("0x8014400c02002066") },
    { mask: BigInt("0x6e10101010101000"), magic: BigInt("0x00080220010a010e") }, { mask: BigInt("0x5e20202020202000"), magic: BigInt("0x0002000810041162") }, { mask: BigInt("0x3e40404040404000"), magic: BigInt("0x00010486100110e4") },
    { mask: BigInt("0x7e80808080808000"), magic: BigInt("0x000100020180406f") }
];

const bishopTbl: magic_t[] = [
    { mask: BigInt("0x0040201008040200"), magic: BigInt("0x00a08800240c0040") }, { mask: BigInt("0x0000402010080400"), magic: BigInt("0x0020085008088000") }, { mask: BigInt("0x0000004020100a00"), magic: BigInt("0x0080440306000000") },
    { mask: BigInt("0x0000000040221400"), magic: BigInt("0x000c520480000000") }, { mask: BigInt("0x0000000002442800"), magic: BigInt("0x0024856000000000") }, { mask: BigInt("0x0000000204085000"), magic: BigInt("0x00091430a0000000") },
    { mask: BigInt("0x0000020408102000"), magic: BigInt("0x0009081820c00000") }, { mask: BigInt("0x0002040810204000"), magic: BigInt("0x0005100400609000") }, { mask: BigInt("0x0020100804020000"), magic: BigInt("0x0000004448220400") },
    { mask: BigInt("0x0040201008040000"), magic: BigInt("0x00001030010c0480") }, { mask: BigInt("0x00004020100a0000"), magic: BigInt("0x00003228120a0000") }, { mask: BigInt("0x0000004022140000"), magic: BigInt("0x00004c2082400000") },
    { mask: BigInt("0x0000000244280000"), magic: BigInt("0x0000108d50000000") }, { mask: BigInt("0x0000020408500000"), magic: BigInt("0x0000128821100000") }, { mask: BigInt("0x0002040810200000"), magic: BigInt("0x00000a0410245000") },
    { mask: BigInt("0x0004081020400000"), magic: BigInt("0x0000030180208800") }, { mask: BigInt("0x0010080402000200"), magic: BigInt("0x0050000820500c00") }, { mask: BigInt("0x0020100804000400"), magic: BigInt("0x0008010050180200") },
    { mask: BigInt("0x004020100a000a00"), magic: BigInt("0x0150008a00200500") }, { mask: BigInt("0x0000402214001400"), magic: BigInt("0x000e000505090000") }, { mask: BigInt("0x0000024428002800"), magic: BigInt("0x0014001239200000") },
    { mask: BigInt("0x0002040850005000"), magic: BigInt("0x0006000540186000") }, { mask: BigInt("0x0004081020002000"), magic: BigInt("0x0001000603502000") }, { mask: BigInt("0x0008102040004000"), magic: BigInt("0x0005000104480c00") },
    { mask: BigInt("0x0008040200020400"), magic: BigInt("0x0011400048880200") }, { mask: BigInt("0x0010080400040800"), magic: BigInt("0x0008080020304800") }, { mask: BigInt("0x0020100a000a1000"), magic: BigInt("0x00241800b4000c00") },
    { mask: BigInt("0x0040221400142200"), magic: BigInt("0x0020480010820040") }, { mask: BigInt("0x0002442800284400"), magic: BigInt("0x011484002e822000") }, { mask: BigInt("0x0004085000500800"), magic: BigInt("0x000c050044822000") },
    { mask: BigInt("0x0008102000201000"), magic: BigInt("0x0010090020401800") }, { mask: BigInt("0x0010204000402000"), magic: BigInt("0x0004008004a10c00") }, { mask: BigInt("0x0004020002040800"), magic: BigInt("0x0044214001005000") },
    { mask: BigInt("0x0008040004081000"), magic: BigInt("0x0008406000188200") }, { mask: BigInt("0x00100a000a102000"), magic: BigInt("0x0002043000120400") }, { mask: BigInt("0x0022140014224000"), magic: BigInt("0x0010280800120a00") },
    { mask: BigInt("0x0044280028440200"), magic: BigInt("0x0040120a00802080") }, { mask: BigInt("0x0008500050080400"), magic: BigInt("0x0018282700021000") }, { mask: BigInt("0x0010200020100800"), magic: BigInt("0x0008400c00090c00") },
    { mask: BigInt("0x0020400040201000"), magic: BigInt("0x0024200440050400") }, { mask: BigInt("0x0002000204081000"), magic: BigInt("0x004420104000a000") }, { mask: BigInt("0x0004000408102000"), magic: BigInt("0x0020085060000800") },
    { mask: BigInt("0x000a000a10204000"), magic: BigInt("0x00090428d0011800") }, { mask: BigInt("0x0014001422400000"), magic: BigInt("0x00000a6248002c00") }, { mask: BigInt("0x0028002844020000"), magic: BigInt("0x000140820a000400") },
    { mask: BigInt("0x0050005008040200"), magic: BigInt("0x0140900848400200") }, { mask: BigInt("0x0020002010080400"), magic: BigInt("0x000890400c000200") }, { mask: BigInt("0x0040004020100800"), magic: BigInt("0x0008240492000080") },
    { mask: BigInt("0x0000020408102000"), magic: BigInt("0x0010104980400000") }, { mask: BigInt("0x0000040810204000"), magic: BigInt("0x0001480810300000") }, { mask: BigInt("0x00000a1020400000"), magic: BigInt("0x0000060410a80000") },
    { mask: BigInt("0x0000142240000000"), magic: BigInt("0x0000000270150000") }, { mask: BigInt("0x0000284402000000"), magic: BigInt("0x000000808c540000") }, { mask: BigInt("0x0000500804020000"), magic: BigInt("0x00002010202c8000") },
    { mask: BigInt("0x0000201008040200"), magic: BigInt("0x0020a00810210000") }, { mask: BigInt("0x0000402010080400"), magic: BigInt("0x0080801804828000") }, { mask: BigInt("0x0002040810204000"), magic: BigInt("0x0002420010c09000") },
    { mask: BigInt("0x0004081020400000"), magic: BigInt("0x0000080828180400") }, { mask: BigInt("0x000a102040000000"), magic: BigInt("0x0000000890285800") }, { mask: BigInt("0x0014224000000000"), magic: BigInt("0x0000000008234900") },
    { mask: BigInt("0x0028440200000000"), magic: BigInt("0x00000000a0244500") }, { mask: BigInt("0x0050080402000000"), magic: BigInt("0x0000022080900300") }, { mask: BigInt("0x0020100804020000"), magic: BigInt("0x0000005002301100") },
    { mask: BigInt("0x0040201008040200"), magic: BigInt("0x0080881014040040") }
];

function initStatic(): void {
    const rankDirection = [
        -1, -1, -1, 0, 0, 1, 1, 1
    ];
    const fileDirection = [
        -1, 0, 1, -1, 1, -1, 0, 1
    ];

    let sq: board_.Squares, r: number, f: number;
    let j: number, i: number;

    const heading = Array.from(Array<number>(64), () => new Array<number>(64));
    for (i = 0; i < 64; ++i) heading[i].fill(-1);

    for (sq = 0; sq < 64; ++sq) mbits[sq] = 1n << BigInt(sq);

    // King attacks
    for (sq = 0; sq < 64; ++sq) {
        let k = mbits[sq];
        k |= (mbits[sq] << 1n) & BigInt("0xFEFEFEFEFEFEFEFE");
        k |= (mbits[sq] >> 1n) & BigInt("0x7F7F7F7F7F7F7F7F");
        k = ((k << 8n) | (k >> 8n) | (k ^ mbits[sq]));
        mkingAttacks[sq] = k;
    }

    // Knight attacks
    for (sq = 0; sq < 64; ++sq) {
        let kn = (mbits[sq] << 17n) & BigInt("0xFEFEFEFEFEFEFEFE");
        kn |= (mbits[sq] << 10n) & BigInt("0xFCFCFCFCFCFCFCFC");
        kn |= (mbits[sq] << 15n) & BigInt("0x7F7F7F7F7F7F7F7F");
        kn |= (mbits[sq] << 6n) & BigInt("0x3F3F3F3F3F3F3F3F");
        kn |= (mbits[sq] >> 17n) & BigInt("0x7F7F7F7F7F7F7F7F");
        kn |= (mbits[sq] >> 10n) & BigInt("0x3F3F3F3F3F3F3F3F");
        kn |= (mbits[sq] >> 15n) & BigInt("0xFEFEFEFEFEFEFEFE");
        kn |= (mbits[sq] >> 6n) & BigInt("0xFCFCFCFCFCFCFCFC");
        mknightAttacks[sq] = kn;
    }

    // Pawn attacks
    for (sq = 0; sq < 64; ++sq) {
        mpawnAttacks[board_.Colors.WHITE][sq] = ((mbits[sq] << 9n) & BigInt("0xFEFEFEFEFEFEFEFE")) | ((mbits[sq] << 7n) & BigInt("0x7F7F7F7F7F7F7F7F"));
        mpawnAttacks[board_.Colors.BLACK][sq] = ((mbits[sq] >> 9n) & BigInt("0x7F7F7F7F7F7F7F7F")) | ((mbits[sq] >> 7n) & BigInt("0xFEFEFEFEFEFEFEFE"));
    }

    // xrays to all directions
    for (sq = 0; sq < 64; ++sq) {
        r = util_.ranksBoard[board_.SQ120(sq)];
        f = util_.filesBoard[board_.SQ120(sq)];

        for (i = 0; i < 8; ++i) {
            xrays[i][sq] = 0n;
            for (j = 1; j < 8; ++j) {
                const toRank = rankDirection[i] * j + r;
                const toFile = fileDirection[i] * j + f;

                if (toRank < 0 || toRank > 7 || toFile < 0 || toFile > 7) break; // We went over the side of the board, stop.

                heading[sq][toRank * 8 + toFile] = i;
                xrays[i][sq] |= mbits[toRank * 8 + toFile];
            }
        }
    }

    // All sqs between two sqs.
    for (i = 0; i < 64; ++i) {
        between[i].fill(0n);
        lines[i].fill(0n);
        for (j = 0; j < 64; ++j) {
            const h = heading[i][j];
            if (h != -1) {
                between[i][j] = xrays[h][i] & xrays[7 - h][j];
                lines[i][j] = xrays[h][i] | xrays[7 - h][j];
            }
        }
    }

    // Pawn evaluation bitboards: passed pawn, backward pawns, isolated pawns.
    isolated.fill(0n);
    passed[board_.Colors.WHITE].fill(0n);
    passed[board_.Colors.BLACK].fill(0n);
    backward[board_.Colors.WHITE].fill(0n);
    backward[board_.Colors.BLACK].fill(0n);
    mOutpost[board_.Colors.WHITE].fill(0n);
    mOutpost[board_.Colors.BLACK].fill(0n);
    for (sq = 0; sq < 64; ++sq) {
        if (sq < board_.SQ64(board_.Squares.A2) || sq > board_.SQ64(board_.Squares.H7)) continue;

        passed[board_.Colors.WHITE][sq] = xrays[6][sq];
        passed[board_.Colors.BLACK][sq] = xrays[1][sq];

        f = util_.filesBoard[board_.SQ120(sq)];
        if (f != 7) {
            passed[board_.Colors.WHITE][sq] |= xrays[6][sq + 1];
            passed[board_.Colors.BLACK][sq] |= xrays[1][sq + 1];
            backward[board_.Colors.WHITE][sq] |= xrays[1][sq + 9];
            backward[board_.Colors.BLACK][sq] |= xrays[6][sq - 7];
            isolated[sq] |= files[f + 1];
        }

        if (f != 0) {
            passed[board_.Colors.WHITE][sq] |= xrays[6][sq - 1];
            passed[board_.Colors.BLACK][sq] |= xrays[1][sq - 1];
            backward[board_.Colors.WHITE][sq] |= xrays[1][sq + 7];
            backward[board_.Colors.BLACK][sq] |= xrays[6][sq - 9];
            isolated[sq] |= files[f - 1];
        }
        mOutpost[board_.Colors.WHITE][sq] = passed[board_.Colors.WHITE][sq] & ~files[f]
        mOutpost[board_.Colors.BLACK][sq] = passed[board_.Colors.BLACK][sq] & ~files[f]

    }

    for (sq = 0; sq < 64; ++sq) {
        kingZone[board_.Colors.WHITE][sq] = sq < board_.SQ64(board_.Squares.A8) ? (mkingAttacks[sq] | mkingAttacks[sq + 8]) : (mkingAttacks[sq] | mbits[sq]);
        kingZone[board_.Colors.BLACK][sq] = sq > board_.SQ64(board_.Squares.H1) ? (mkingAttacks[sq] | mkingAttacks[sq - 8]) : (mkingAttacks[sq] | mbits[sq]);
    }

}


function initMagic() {
    let sq: number, i: number, index: number, n: number;
    let bitmask = 0n, mask: bitboard_t;

    const rookMask = (sq: number): bitboard_t => {
        let result = 0n;
        const rk = util_.ranksBoard[board_.SQ120(sq)], fl = util_.filesBoard[board_.SQ120(sq)];
        for (let r = rk + 1; r <= 6; ++r) result |= (mbits[fl + r * 8]);
        for (let r = rk - 1; r >= 1; --r) result |= (mbits[fl + r * 8]);
        for (let f = fl + 1; f <= 6; ++f) result |= (mbits[f + rk * 8]);
        for (let f = fl - 1; f >= 1; --f) result |= (mbits[f + rk * 8]);
        return result;
    };
    const bishopMask = (sq: number): bitboard_t => {
        let result = 0n;
        const rk = util_.ranksBoard[board_.SQ120(sq)], fl = util_.filesBoard[board_.SQ120(sq)];
        for (let r = rk + 1, f = fl + 1; r <= 6 && f <= 6; ++r, ++f) result |= (mbits[f + r * 8]);
        for (let r = rk + 1, f = fl - 1; r <= 6 && f >= 1; ++r, --f) result |= (mbits[f + r * 8]);
        for (let r = rk - 1, f = fl + 1; r >= 1 && f <= 6; --r, ++f) result |= (mbits[f + r * 8]);
        for (let r = rk - 1, f = fl - 1; r >= 1 && f >= 1; --r, --f) result |= (mbits[f + r * 8]);
        return result;
    };


    for (sq = 0; sq < 64; sq++) {
        // Reset
        mrookAttacks[sq].fill(0n);
        mbishopAttacks[sq].fill(0n);

        // Rooks
        mask = rookMask(sq);
        n = popcount({ v: mask });
        for (i = 0; i < (1 << n); i++) {
            bitmask = indexToBitboard(mask, i);
            index = Number((BigInt.asUintN(64, bitmask * rookTbl[sq].magic)) >> 52n);
            mrookAttacks[sq][index] = crAttacks(sq, bitmask);
        }
        // Bishops
        mask = bishopMask(sq);
        n = popcount({ v: mask });
        for (i = 0; i < (1 << n); i++) {
            bitmask = indexToBitboard(mask, i);
            index = Number((BigInt.asUintN(64, bitmask * bishopTbl[sq].magic)) >> 55n);
            mbishopAttacks[sq][index] = cbAttacks(sq, bitmask);
        }
    }
}

function indexToBitboard(bb: bitboard_t, k: number) {
    let i: number, j: number;
    const n = popcount({ v: bb });

    let rlt = 0n;
    const bbOBJ = { v: bb };
    for (i = 0; i < n; i++) {
        j = poplsb(bbOBJ);
        if (k & (1 << i)) rlt |= (1n << BigInt(j));
    }
    return rlt;
}

function crAttacks(sq: number, mask: bitboard_t) {
    const sRank = util_.ranksBoard[board_.SQ120(sq)], sFile = util_.filesBoard[board_.SQ120(sq)];
    let r: number, f: number, b = 0n;

    for (f = sFile + 1, r = sRank; f <= 7; f++) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; } // East
    for (f = sFile - 1, r = sRank; f >= 0; f--) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; } // West
    for (f = sFile, r = sRank + 1; r <= 7; r++) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; }// North
    for (f = sFile, r = sRank - 1; r >= 0; r--) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; } // South

    return b;
}

function cbAttacks(sq: number, mask: bitboard_t) {
    const sRank = util_.ranksBoard[board_.SQ120(sq)], sFile = util_.filesBoard[board_.SQ120(sq)];
    let r: number, f: number, b = 0n;

    for (f = sFile + 1, r = sRank + 1; f <= 7 && r <= 7; f++, r++) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; }// North East
    for (f = sFile - 1, r = sRank + 1; f >= 0 && r <= 7; f--, r++) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; }// North West
    for (f = sFile + 1, r = sRank - 1; f <= 7 && r >= 0; f++, r--) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; }// South East
    for (f = sFile - 1, r = sRank - 1; f >= 0 && r >= 0; f--, r--) { b |= mbits[r * 8 + f]; if (mask & mbits[r * 8 + f]) break; }// South West

    return b;
}


/**
 * Initializes all bitboard variables
 */
function initBitBoard(): void {
    initStatic();
    initMagic();
}

/**
 *  Moves a bitboard one or two steps as specified by the direction D
 * @param D The direction to shift to 
 * @param b The bitboard to shift
 */
function shift(D: Direction, b: bitboard_t): bitboard_t {
    return D == Direction.NORTH ? b << 8n : D == Direction.SOUTH ? b >> 8n
        : D == Direction.NORTH + Direction.NORTH ? b << 16n : D == Direction.SOUTH + Direction.SOUTH ? b >> 16n
            : D == Direction.EAST ? (b & ~files[7]) << 1n : D == Direction.WEST ? (b & ~files[0]) >> 1n
                : D == Direction.NORTH_EAST ? (b & ~files[7]) << 9n : D == Direction.NORTH_WEST ? (b & ~files[0]) << 7n
                    : D == Direction.SOUTH_EAST ? (b & ~files[7]) >> 7n : D == Direction.SOUTH_WEST ? (b & ~files[0]) >> 9n
                        : 0n;
}

/**
 * Calculates the bishop attacks from a square with the given occupied squares
 * @param sq The square
 * @param occ The currently occupied squares
 * @return A bitboard containing the possible bishop attacks
 */
function bishopAttacks(sq: number, occ: bitboard_t): bitboard_t {
    occ &= bishopTbl[sq].mask;
    occ *= bishopTbl[sq].magic; // Number may not fit in U64 
    occ = BigInt.asUintN(64, occ); // Fit in U64
    occ >>= 55n;
    return mbishopAttacks[sq][Number(occ)];
}

/**
 * Calculates the rook attacks from a square with the given occupied squares
 * @param sq The square
 * @param occ The currently occupied squares
 * @return A bitboard containing the possible rook attacks
 */
function rookAttacks(sq: number, occ: bitboard_t): bitboard_t {
    occ &= rookTbl[sq].mask;
    occ *= rookTbl[sq].magic; // Number may not fit in U64 
    occ = BigInt.asUintN(64, occ); // Fit in U64
    occ >>= 52n;
    return mrookAttacks[sq][Number(occ)];
}

/**
 * Calculates the queen attacks from a square with the given occupied squares
 * @param sq The square
 * @param occ The currently occupied squares
 * @return A bitboard containing the possible queen attacks
 */
function queenAttacks(sq: number, occ: bitboard_t): bitboard_t {
    return (bishopAttacks(sq, occ) | rookAttacks(sq, occ));
}

/**
 * Calculates the king attacks from a square with the given squares
 * @param sq The square
 * @return A bitboard containing the possible king attacks
 */
function kingAttacks(sq: number): bitboard_t {
    return mkingAttacks[sq];
}

/**
 * Calculates the knight attacks from a square with the given squares
 * @param sq The square
 * @return A bitboard containing the possible knight attacks
 */
function knightAttacks(sq: number): bitboard_t {
    return mknightAttacks[sq];
}

/**
 * Calculates the pawn attacks from a square with the given squares
 * @param c The color(0: WHITE, BLACK: 1)
 * @param sq The square
 * @return A bitboard containing the possible pawn attacks
 */
function pawnAttacks(c: number, sq: number): bitboard_t {
    return mpawnAttacks[c][sq];
}

/**
 * Get all pieces of a given color.
 * @param color
 */
function getPieces(color: board_.Colors, board: board_.board_t): bitboard_t {
    return [(
        board.piecesBB[board_.Pieces.WHITEPAWN]
        | board.piecesBB[board_.Pieces.WHITEKNIGHT]
        | board.piecesBB[board_.Pieces.WHITEBISHOP]
        | board.piecesBB[board_.Pieces.WHITEROOK]
        | board.piecesBB[board_.Pieces.WHITEQUEEN]
        | board.piecesBB[board_.Pieces.WHITEKING]
    ),
    (
        board.piecesBB[board_.Pieces.BLACKPAWN]
        | board.piecesBB[board_.Pieces.BLACKKNIGHT]
        | board.piecesBB[board_.Pieces.BLACKBISHOP]
        | board.piecesBB[board_.Pieces.BLACKROOK]
        | board.piecesBB[board_.Pieces.BLACKQUEEN]
        | board.piecesBB[board_.Pieces.BLACKKING]
    )
    ][color];
}


/**
 * Returns a bitboard of all the pieces (both colors)
 * that are blocking attacks on the square 's' from 'sliders'. A piece blocks a
 * slider if removing that piece from the board would result in a position where
 * square 's' is attacked. For example, a king-attack blocking piece can be either
 * a pinned or a discovered check piece, according if its color is the opposite
 * or the same of the color of the slider.
 * @param sliders The slider Pieces
 * @param sq The square
 * @param pos The current board
 * @param pinnersObj The bitboard for pinners
 */
function sliderBlockers(sliders: bitboard_t, sq: number, pos: board_.board_t, pinnersObj: bitboardObj_t): bitboard_t {
    let blockers = 0n;
    pinnersObj.v = 0n;

    // Snipers are sliders that attack 'sq' when a piece and other snipers are removed
    const q = (pos.piecesBB[board_.Pieces.WHITEQUEEN] | pos.piecesBB[board_.Pieces.BLACKQUEEN]);
    const r = (pos.piecesBB[board_.Pieces.WHITEROOK] | pos.piecesBB[board_.Pieces.BLACKROOK]);
    const b = (pos.piecesBB[board_.Pieces.WHITEBISHOP] | pos.piecesBB[board_.Pieces.BLACKBISHOP]);

    const snipers = ((rookAttacks(sq, 0n) & (q | r))
        | (bishopAttacks(sq, 0n) & (q | b))) & sliders;
    const occupancy = (getPieces(board_.Colors.WHITE, pos) | getPieces(board_.Colors.BLACK, pos))
        ^ snipers;


    const sniperOBJ: bitboardObj_t = { v: snipers };
    while (sniperOBJ.v) {
        const sniperSq = poplsb(sniperOBJ);
        const b = squaresBetween(sq, sniperSq) & occupancy;

        if (b && !several(b)) {
            blockers |= b;
            if (b & getPieces(board_.PIECE_COLOR(pos.pieces[board_.SQ120(sq)]), pos))
                pinnersObj.v |= bit(sniperSq);
        }
    }
    return blockers;
}


/**
 * Get a bitboard with the bit corresponding to the given square set
 * @param sq The square
 * @return A bitboard which is equivalent to 1ULL << sq
 */
function bit(sq: number): bitboard_t {
    return mbits[sq];
}

/**
 * Gets a bitboard with all squares between the given squares marked.
 * @param from The from-square.
 * @param to The to-square.
 * @return The bitboard. If the given squares are not in a line the bitboard will be empty.
 */
function squaresBetween(from: number, to: number): bitboard_t {
    return between[from][to];
}

/**
 * Gets a bitboard with all squares in the line formed by the two given squares marked.
 * @param from The from-square.
 * @param to The to-square.
 * @return The bitboard. If the given squares are not in a line the bitboard will be empty.
 */
function lineFormedBySquares(from: number, to: number): bitboard_t {
    return lines[from][to];
}


/**
 * Gets a bitboard with all squares in the DIRECTION through squares marked.
 *   
 * Directions
 * 
 *     0 -> South West 
 *     1 -> South
 *     2 -> South East
 *     3 -> West
 *     4 -> East
 *     5 -> North West
 *     6 -> North
 *     7 -> North East
 * 
 * @param direction The direction of the ray(0->SW, 1->).
 * @param sq The square.
 * @return The bitboard.
 */
function ray(direction: number, sq: number): bitboard_t {
    return xrays[direction][sq];
}


/**
 * Get a bitboard for detecting if square is doubly attacked by pawn
 * @param c The color
 * @param bb The bitboard
 * @returns A bitboard with the squares doubly attacked by pawns of the given color from the squares in the given bitboard.
 */
function pawnDoubleAttacksBB(c: number, bb: bitboard_t): bitboard_t {
    return (c == board_.Colors.WHITE) ? shift(Direction.NORTH_WEST, bb) & shift(Direction.NORTH_EAST, bb)
        : shift(Direction.SOUTH_WEST, bb) & shift(Direction.SOUTH_EAST, bb);
}

/**
 * Get a bitboard for detecting if square is attacked by pawn
 * @param c 
 * @param bb 
 * @returns the squares attacked by pawns of the given color from the squares in the given bitboard
 */
function pawnAttacksBB(c: number, bb: bitboard_t): bitboard_t {
    return (c == board_.Colors.WHITE) ? shift(Direction.NORTH_WEST, bb) | shift(Direction.NORTH_EAST, bb)
        : shift(Direction.SOUTH_WEST, bb) | shift(Direction.SOUTH_EAST, bb);
}


/**
 * 
 * @param sq The square.
 * @returns  returns a bitboard representing all the squares on the adjacent files of a given square.
 */
function adjacentFiles(sq: number): bitboard_t {
    const f = files[util_.filesBoard[board_.SQ120(sq)]];
    return shift(Direction.EAST, f) | shift(Direction.WEST, f);
}

/**
 * Gets a bitboard for getting all the ranks in above sq
 * @param c The color.
 * @param sq The square.
 * @return A bitboard representing the squares on the ranks in front of the given one, from the point of view of the given color
 */
function forwardRanks(c: number, sq: number): bitboard_t {
    const r = util_.rankOf(sq);
    return (c == board_.Colors.WHITE) ? BigInt.asUintN(64, ~ranks[0]) << BigInt(8 * util_.relativeRank(board_.Colors.WHITE, r))
        : BigInt.asUintN(64, ~ranks[7]) >> BigInt(8 * util_.relativeRank(board_.Colors.BLACK, r))
}

/**
 * Gets a bitboard for getting al the files in above sq
 * @param c The color.
 * @param sq The square.
 * @return A bitboard representing the squares along the line in front of the given one, from the point of view of the given color
 */
function forwardFiles(c: number, sq: number): bitboard_t {
    return forwardRanks(c, sq) & files[util_.fileOf(sq)];
}

/**
 * Gets a bitboard for detecting if a pawn can possibly attack a sq in the future
 * @param c The color.
 * @param sq The square.
 * @return A bitboard representing all the squares that can be attacked by a pawn of the given color when it moves along its file, starting from the given square.
 */
function pawnAttackSpan(c: number, sq: number): bitboard_t {
    return forwardRanks(c, sq) & adjacentFiles(sq);
}


/**
 * Gets a bitboard for detecting if a pawn of a given color on a given square is passed
 * @param c The color.
 * @param sq The square.
 * @return A bitboard with all squares in front of the pawn on the same or adjacent files marked. If the marked squares contain no friendly pawns the given pawn is passed.
 */
function passedPawn(c: number, sq: number): bitboard_t {
    return passed[c][sq]; // pawnAttackSpan(c, s) | forwardFile(c, s);
}


/**
 * Gets a bitboard for detecting if a square is an outpost
 * @param c The color.
 * @param sq The square.
 * @return A bitboard to check if a square is an outpost relative to opposing pawns, such that no enemy pawn may attack the square with ease
 */
function outpost(c: number, sq: number): bitboard_t {
    return mOutpost[c][sq]; // pawnAttackSpan(c, sq);
}

/**
 * Gets a bitboard for detecting if a pawn of a given color on a given square is backward.
 * @param c The color.
 * @param sq The square.
 * @return A bitboard which has the adjacent files marked as long as these files are <= the rank of the pawn (taking into account the color).
 */
function backwardPawn(c: number, sq: number): bitboard_t {
    return backward[c][sq];
}

/**
 * Gets a bitboard for detecting if a pawn on a given square is isolated.
 * @param sq The square.
 * @return A bitboard which has the adjacent files marked. If the marked squares contain no friendly pawns the given pawn is isolated.
 */
function isolatedPawn(sq: number): bitboard_t {
    return isolated[sq]; //adjacentFiles(sq)
}

/**
 * Get the zone used for king safety calculations for a given color and square.
 * @param c The color.
 *  @param sq The square.
 * @return A bitboard which has the square of the king, all king attacks from that square and three (or two) squares in front of those marked.
 */
function kingSafetyZone(c: number, sq: number): bitboard_t {
    return kingZone[c][sq];
}

/**
 * returns an ASCII representation of a bitboard suitable to be printed to standard output. 
 * Useful for debugging
 * @param bb The bitboard
 */
function pretty(bb: bitboard_t): string {
    let sq: number;
    let s = "  +---+---+---+---+---+---+---+---+\n";

    for (let rank = board_.Ranks.EIGHTH_RANK; rank >= board_.Ranks.FIRST_RANK; --rank) {
        s += `${(1 + rank).toString()} `
        for (let file = board_.Files.A_FILE; file <= board_.Files.H_FILE; ++file) {
            sq = board_.SQ64(board_.FILE_RANK_TO_SQUARE(file, rank))
            s += (isSet(bb, sq)) ? "| X " : "|   ";
        }
        s += "| " + "\n  +---+---+---+---+---+---+---+---+\n";
    }
    s += "    a   b   c   d   e   f   g   h\n";

    return s;
}

/**
 * Returns the amount of set mbits in a given bitboard.
 * @param bb The bitboard.
 * @returns 
 */
function popcount(bb: bitboardObj_t): number {
    let num_mbits = 0;
    while (bb.v) {
        num_mbits++;
        bb.v &= bb.v - 1n;
    }
    return num_mbits;
}

/**
 * Returns true if more than one bit is set.
 * @param bb The bitboard.
 */
function several(bb: bitboard_t): boolean { return (bb & (bb - 1n)) !== 0n; }

/**
 * Return true if only one bit is set.
 * @param bb The bitboard.
 */
function onlyOne(bb: bitboard_t): boolean { return (bb !== 0n) && !several(bb); }

/**
 * Checks whether a given bitboard has a particular bit set
 * @param bb  The bitboard. 
 * @param k The bit to check.
 */
function isSet(bb: bitboard_t, k: number): boolean {
    return (bb & mbits[k]) != 0n
}

/**
 * Sets the specified bit of a bitboard to 1
 * @param bb  The bitboard.
 * @param k The bit to set.
 */
function setBit(bb: bitboardObj_t, k: number): bitboard_t {
    return bb.v |= mbits[k];
}

/**
 * Sets the specified bit of the given bitboard to 0. We assume that the bit is already 1, otherwise this doesn't work
 * @param bb  The bitboard.
 * @param k The bit to clear.
 */
function clearBit(bb: bitboardObj_t, k: number): bitboard_t { return bb.v ^= mbits[k]; }


/**
 * Returns the number of leading zero
 * @param bb  The bitboard.
 */
function clz(bb: bitboard_t): number {
    if (bb === 0n) return 64;

    let n = 1n;
    if ((bb >> 32n) === 0n) { n += 32n; bb <<= 32n; }
    if ((bb >> 48n) === 0n) { n += 16n; bb <<= 16n; }
    if ((bb >> 56n) === 0n) { n += 8n; bb <<= 8n; }
    if ((bb >> 60n) === 0n) { n += 4n; bb <<= 4n; }
    if ((bb >> 62n) === 0n) { n += 2n; bb <<= 2n; }
    n = n - (bb >> 63n);

    return Number(n);
}

/**
 * Returns the number of trailing zero
 * @param bb  The bitboard.
 */
function ctz(bb: bitboard_t): number {
    if (!bb) return 64;

    let n = 0n;
    if ((bb & BigInt("0xFFFFFFFF")) === 0n) { n += 32n; bb >>= 32n; }
    if ((bb & BigInt("0x0000FFFF")) === 0n) { n += 16n; bb >>= 16n; }
    if ((bb & BigInt("0x000000FF")) === 0n) { n += 8n; bb >>= 8n; }
    if ((bb & BigInt("0x0000000F")) === 0n) { n += 4n; bb >>= 4n; }
    if ((bb & BigInt("0x00000003")) === 0n) { n += 2n; bb >>= 2n; }
    if ((bb & BigInt("0x00000001")) === 0n) { n += 1n; }

    return Number(n);
}

/**
 * Returns the least significant bit, little endian order.
 * @param bb  The bitboard.
 */
function lsb(bb: bitboard_t): number {
    return ctz(bb);
}


/**
 * Returns the most significant bit, little endian order.
 * @param bb  The bitboard.
 */
function msb(bb: bitboard_t): number { return 63 ^ clz(bb) }


/**
 * Resets and returns the least significant set bit in a given bitboard
 * @param bb  The bitboard.
 */
function poplsb(bb: bitboardObj_t): number {
    const s = lsb(bb.v);
    bb.v &= (bb.v - 1n);
    return s;
}


/**
 * Resets and returns the most significant set bit in a given bitboard
 * @param bb  The bitboard.
 */
function popmsb(bb: bitboardObj_t): number {
    const s = msb(bb.v);
    bb.v ^= (1n << BigInt(s));
    return s;
}


export {
    bitboard_t,
    bitboardObj_t,
    Direction,

    lightSquares,
    darkSquares,
    files,
    ranks,
    kingFlank,
    center,
    queenSide,
    centerFiles,
    centerSquares,
    kingSide,

    pawnAttacks,
    bishopAttacks,
    knightAttacks,
    rookAttacks,
    queenAttacks,
    kingAttacks,

    shift,
    passedPawn,
    forwardFiles,
    forwardRanks,
    pawnAttackSpan,
    getPieces,
    sliderBlockers,
    adjacentFiles,
    isolatedPawn,
    backwardPawn,
    pawnDoubleAttacksBB,
    pawnAttacksBB,
    outpost,
    kingSafetyZone,
    lineFormedBySquares,
    squaresBetween,
    bit,
    ray,

    several,
    isSet,
    onlyOne,
    setBit,
    clearBit,
    popcount,
    ctz,
    clz,
    lsb,
    poplsb,
    msb,
    popmsb,

    pretty,
    initBitBoard,
}