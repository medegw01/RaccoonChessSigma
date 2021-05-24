import { bitboard_t } from "../game/bitboard";
import * as util_ from "../util"

enum BOUND {
    NONE = 0,
    LOWER = 1,
    UPPER = 2,
    EXACT = 3,
}

const TT_BUCKET_NB = 3;
const TT_MASK_AGE = 0xFC;
const TT_MASK_BOUND = 0x03;

type entry_t = {
    move: number;
    value: number;
    eval: number;
    depth: number;
    bound: number;
}

type TTable_t = {
    number_entries: number;
    generation: number;
    move16: Array<Uint16Array>;
    genBound8: Array<Uint8Array>;
    depth8: Array<Uint8Array>;
    hash16: Array<Uint16Array>;
    value16: Array<Int16Array>;
    eval16: Array<Int16Array>;
}

const TT = {} as TTable_t;


function update(): void {
    TT.generation += TT_MASK_BOUND + 1;
}

function hashfull(): number {
    let used = 0;
    for (let i = 0; i < 1000; i++) {
        for (let j = 0; j < TT_BUCKET_NB; j++) {
            used += +(
                (TT.genBound8[j][i] & TT_MASK_BOUND) != BOUND.NONE
                && (TT.genBound8[j][i] & TT_MASK_AGE) == TT.generation
            );

        }
    }
    return used / TT_BUCKET_NB;
}

// called by ucinewgame
function clear(): void {
    for (let i = 0; i < TT_BUCKET_NB; i++) {
        TT.move16[i].fill(0);
        TT.genBound8[i].fill(0);
        TT.depth8[i].fill(0);
        TT.hash16[i].fill(0);
        TT.value16[i].fill(0);
        TT.eval16[i].fill(0);
    }
}

function resize(MB: number): void {
    TT.number_entries = ((MB << 20) / 16) - 2;
    TT.move16 = Array.from(Array<number>(TT_BUCKET_NB), () => new Uint16Array(TT.number_entries));
    TT.genBound8 = Array.from(Array<number>(TT_BUCKET_NB), () => new Uint8Array(TT.number_entries));
    TT.depth8 = Array.from(Array<number>(TT_BUCKET_NB), () => new Uint8Array(TT.number_entries));
    TT.hash16 = Array.from(Array<number>(TT_BUCKET_NB), () => new Uint16Array(TT.number_entries));
    TT.value16 = Array.from(Array<number>(TT_BUCKET_NB), () => new Int16Array(TT.number_entries));
    TT.eval16 = Array.from(Array<number>(TT_BUCKET_NB), () => new Int16Array(TT.number_entries));
    clear();
}


function save(hash64: bitboard_t, move: number, value: number, eval_: number, depth: number, bound: number): void {
    const index = Number(hash64 & BigInt(TT.number_entries))
    const hash16 = Number(hash64 >> 48n);

    let replacePos = 0;
    let i: number;

    // Find a matching hash, or replace using MAX(x1, x2, x3),
    // where xN equals the depth minus 4 times the age difference
    for (i = 0; i < TT_BUCKET_NB && TT.hash16[i][index] != hash16; i++) {
        if (TT.depth8[replacePos][index] - ((259 + TT.generation - TT.genBound8[replacePos][index]) & TT_MASK_AGE)
            >= TT.depth8[i][index] - ((259 + TT.generation - TT.genBound8[i][index]) & TT_MASK_AGE)) {
            replacePos = i;
        }
    }
    // Prefer a matching hash, otherwise score a replacement
    replacePos = (i != TT_BUCKET_NB) ? i : replacePos;

    // Don't overwrite an entry from the same position, unless we have
    // an exact bound or depth that is nearly as good as the old one
    if (bound != BOUND.EXACT
        && hash16 == TT.hash16[replacePos][index]
        && depth < TT.depth8[replacePos][index] - 3) {
        return;
    }

    // Finally, copy the new data into the replaced slot
    TT.depth8[replacePos][index] = depth;
    TT.genBound8[replacePos][index] = bound | TT.generation;
    TT.value16[replacePos][index] = value;
    TT.eval16[replacePos][index] = eval_;
    TT.move16[replacePos][index] = move;
    TT.hash16[replacePos][index] = hash16;
}

function probe(hash64: bitboard_t): { entry: entry_t, found: boolean } {
    const index = Number(hash64 & BigInt(TT.number_entries))
    const hash16 = Number(hash64 >> 48n);

    // Search for a matching hash signature
    for (let i = 0; i < TT_BUCKET_NB && TT.hash16[i][index] != hash16; i++) {
        if (TT.hash16[i][index] == hash16) {
            // Update age but retain bound type
            TT.genBound8[i][index] = TT.generation | (TT.genBound8[i][index] & TT_MASK_BOUND);

            return {
                entry: {
                    move: TT.hash16[i][index],
                    value: TT.value16[i][index],
                    eval: TT.eval16[i][index],
                    depth: TT.depth8[i][index],
                    bound: TT.genBound8[i][index] & TT_MASK_BOUND,
                },
                found: true
            }

        }
    }
    return { entry: {} as entry_t, found: false }
}

function valueFrom(value: number, height: number): number {
    // When probing MATE scores into the table
    // we must factor in the search height
    return value >= (util_.TBWIN - util_.MAX_PLY) ? value - height
        : value <= -(util_.TBWIN - util_.MAX_PLY) ? value + height : value;
}

function valueTo(value: number, height: number): number {
    // When storing MATE scores into the table
    // we must factor in the search height

    return value >= (util_.TBWIN - util_.MAX_PLY) ? value + height
        : value <= -(util_.TBWIN - util_.MAX_PLY) ? value - height : value;
}


export {
    BOUND,
    TTable_t,
    entry_t,

    update,
    hashfull,
    clear,
    resize,
    save,
    probe,
    valueFrom,
    valueTo,
}
