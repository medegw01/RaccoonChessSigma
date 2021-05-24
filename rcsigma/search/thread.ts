import * as util_ from '../util'
import * as board_ from '../game/board'
import * as search_ from './search'
import * as eval_ from '../evaluate/rc/eval'

type thread_t = {
    //search thread
    searchInfo: search_.info_t;
    board: board_.board_t;
    pv: search_.pv_t

    depth: number;
    seldepth: number;
    height: number;
    nodes: bigint;
    tbhits: bigint;

    multiPV: number
    values: number[];
    bestMoves: number[];
    ponderMoves: number[];

    evalStack: number[];
    movesStack: number[];
    pieceStack: number[];

    undoStack: board_.undo_t[];

    killers: number[][];
    cmtable: number[][][];

    history: number[][][];
    chistory: number[][][];
    continuation: number[][][][][];

    index: number;
    threads: thread_t[];
    nThreads: number;

    evtable: BigUint64Array;

    jbuffer: boolean;

}

const STACK_OFFSET = 4;
const STACK_SIZE = util_.MAX_PLY + STACK_OFFSET

function reset(t: thread_t) {
    t.evtable = new BigUint64Array(eval_.Cache.SIZE);

    t.killers = Array.from(Array<number>(util_.MAX_PLY + 1), () => new Array<number>(2).fill(0));
    t.cmtable = Array.from(Array<number>(util_.COLOUR_NB),
        () => Array.from(Array<number>(6), () => new Array<number>(util_.SQUARE_NB).fill(0)));

    t.history = Array.from(Array<number>(util_.COLOUR_NB),
        () => Array.from(Array<number>(util_.SQUARE_NB), () => new Array<number>(util_.SQUARE_NB).fill(0)));
    t.chistory = Array.from(Array<number>(6),
        () => Array.from(Array<number>(util_.SQUARE_NB), () => new Array<number>(5).fill(0)));
    t.continuation = Array.from(Array<number>(2),
        () => Array.from(Array<number>(6),
            () => Array.from(Array<number>(util_.SQUARE_NB),
                () => Array.from(Array<number>(6), () => new Array<number>(util_.SQUARE_NB).fill(0)))));
}

function clear(threads: thread_t[]): boolean {
    for (let i = 0; i < threads.length; i++) {
        reset(threads[i])
    }
    return true
}

function create(nthreads: number): thread_t[] {
    const threads = new Array<thread_t>(nthreads)
    for (let i = 0; i < nthreads; i++) {
        const t = {} as thread_t;

        t.movesStack = new Array<number>(STACK_SIZE).fill(0);
        t.evalStack = new Array<number>(STACK_SIZE).fill(0);
        t.pieceStack = new Array<number>(STACK_SIZE).fill(0);
        t.undoStack = new Array<board_.undo_t>(STACK_SIZE)

        t.searchInfo = {} as search_.info_t;
        t.board = {} as board_.board_t;
        t.pv = {} as search_.pv_t

        t.depth = 0;
        t.seldepth = 0;
        t.height = 0;
        t.nodes = 0n;
        t.tbhits = 0n;

        t.multiPV = 0;
        t.values = new Array<number>(util_.MAX_MOVES).fill(0);
        t.bestMoves = new Array<number>(util_.MAX_MOVES).fill(0);
        t.ponderMoves = new Array<number>(util_.MAX_MOVES).fill(0);

        // thread is aware of other threads
        t.index = i;
        t.nThreads = nthreads;
        t.threads = threads;
        t.jbuffer = false;

        reset(t)
        threads[i] = t
    }

    return threads
}

function nodes(threads: thread_t[]): bigint {
    let c = 0n;
    for (let i = 0; i < threads.length; i++) {
        c += threads[i].nodes;
    }
    return c;
}

function tbhits(threads: thread_t[]): bigint {
    let c = 0n;
    for (let i = 0; i < threads.length; i++) {
        c += threads[i].tbhits;
    }
    return c;
}

export {
    thread_t,

    clear,
    create,
    nodes,
    tbhits,

}
