import * as util_ from '../util'
import * as bitboard_ from '../game/bitboard'
import * as board_ from '../game/board'
import * as move_ from '../game/move'
import * as book_ from '../game/book'
import * as state_ from '../game/state'
import * as attack_ from '../game/attack'
import * as rcEval_ from '../evaluate/rc/eval'
import * as tb_ from './tbase'
import * as thread_ from './thread'
import * as time_ from './time'
import * as mp_ from './picker'

import { Worker, workerData } from 'worker_threads';

type info_t = {
    stdoutFn: (msg: string) => void;

    uciQuit: boolean;
    /**
     *  Memory address of control terminal tunnel worker_threads
     * @example
     *     array[0] --> ABORT_SIGNAL
     *     array[1] --> IS_PONDERING
     */
    SIGNAL: SharedArrayBuffer;

    allowPonder: boolean;

    // UCI Options
    multiPV: number;
    analyzingMode: boolean;
    opponent: string;
    useBook: boolean;
    useNNUE: boolean;
    bookFile: string;
    evalFile: string;
    hashSize: number;
    nThreads: number;

    searchInitialized: boolean;

    // limits
    limitedByNone: boolean;
    limitedByNodes: boolean;
    limitedByDepth: boolean;
    limitedByTime: boolean;
    limitedBySelf: boolean;
    limitedByMoves: boolean;

    depthLimit: number;
    maxUsage: number;
    timeLimit: number;
    idealUsage: number;
    maxAlloc: number;


    uciLevel: {
        startTime: number;
        time: number;
        inc: number;
        mtg: number;
    }

    allotment: number;
    searchMovesStr: string[];
    searchMoves: number[];
    excludedMoves: number[];

    values: number[];
    bestMoves: number[];
    ponderMoves: number[];
    depth: number

    pvFactor: number;
    moveOverhead: number
}

type pv_t = {
    line: number[];
    length: number
}

const WindowDepth = 5;
const WindowSize = 10;
const WindowTimerMS = 2500;

const LMR = Array.from(Array<number>(64), () => new Array<number>(64))
const LMP = Array.from(Array<number>(2), () => new Array<number>(9));

const FutilityMargin = 65;
const FutilityMarginNoHistory = 210;
const FutilityPruningDepth = 8;
const FutilityPruningHistoryLimit = [12000, 6000];

const SEEPruningDepth = 9;
const SEEQuietMargin = -64;
const SEENoisyMargin = -19;
const SEEPieceValues = [
    0, 100, 450, 450, 675,
    1300, 0, 0, 0,
];

const HistexLimit = 10000;

const QSSeeMargin = 110;
const QSDeltaMargin = 150;

const SingularQuietLimit = 6;
const SingularTacticalLimit = 3;

const CurrmoveTimerMS = 2500;

const BetaPruningDepth = 8;
const BetaMargin = 85;

const AlphaPruningDepth = 5;
const AlphaMargin = 3000;

const NullMovePruningDepth = 2;

const ProbCutDepth = 5;
const ProbCutMargin = 80;

const CounterMovePruningDepth = [3, 2];
const CounterMoveHistoryLimit = [0, - 1000];

const FollowUpMovePruningDepth = [3, 2];
const FollowUpMoveHistoryLimit = [- 2000, -4000];

const LateMovePruningDepth = 8;

function init(): void {
    for (let depth = 1; depth < 64; depth++) {
        for (let played = 1; played < 64; played++) {
            LMR[depth][played] = 0.75 + Math.log(depth) * Math.log(played) / 2.25;
        }
    }

    for (let depth = 1; depth < 9; depth++) {
        LMP[0][depth] = 2.5 + 2 * depth * depth / 4.5;
        LMP[1][depth] = 4.0 + 4 * depth * depth / 4.5;
    }
}

function clear(board: board_.board_t, info: info_t, threads: thread_.thread_t[]) {
    info.values = new Array<number>(util_.MAX_MOVES).fill(0)
    info.bestMoves = new Array<number>(util_.MAX_MOVES).fill(0)
    info.ponderMoves = new Array<number>(util_.MAX_MOVES).fill(0)


    for (let i = 0; i < threads.length; i++) {
        threads[i].searchInfo = info;
        threads[i].height = 0;
        threads[i].nodes = 0n;
        threads[i].tbhits = 0n;
        threads[i].board = board;
        threads[i].pv.line = new Array<number>(util_.MAX_PLY).fill(0)
        threads[i].pv.length = 0
    }
}


function terminate(thread: thread_.thread_t) {
    // Terminate the search early if the max usage time has passed.
    // Only check this once for every 1024 nodes examined, in case
    // the system calls are quite slow. Always be sure to avoid an
    // early exit during a depth 1 search, to ensure a best move

    return thread.depth > 1
        && (thread.nodes & 1023n) == 1023n
        && (thread.searchInfo.limitedBySelf || thread.searchInfo.limitedByTime)
        && time_.elasped(thread.searchInfo) >= thread.searchInfo.maxUsage;
}

function report(threads: thread_.thread_t[], alpha: number, beta: number, value: number) {
    const hashfull = tb_.hashfull()
    const bounded = util_.clamp(value, alpha, beta);
    const elapsed = time_.elasped(threads[0].searchInfo)
    const nodes = thread_.nodes(threads);
    const tbhits = thread_.tbhits(threads);
    const nps = Number(1000n * (nodes / BigInt(1 + elapsed)));

    // If the score is MATE or MATED in X, convert to X
    const score = bounded >= (util_.CHECKMATE - util_.MAX_PLY) ? (util_.CHECKMATE - bounded + 1) / 2
        : bounded <= -(util_.CHECKMATE - util_.MAX_PLY) ? -(bounded + util_.CHECKMATE) / 2 : bounded;

    // Two possible score types, mate and cp = centipawns
    const type = Math.abs(bounded) >= (util_.CHECKMATE - util_.MAX_PLY) ? "mate" : "cp";

    // Partial results from a windowed search have bounds
    const bound = bounded >= beta ? ' lowerbound '
        : bounded <= alpha ? ' upperbound ' : ' ';

    let pvStr = "";
    for (let i = 0; threads[0].pv.length; i++) {
        pvStr += ` ${move_.moveToSmith(threads[0].pv.line[i])}`
    }

    const statStr = `info depth ${threads[0].depth} seldepth ${threads[0].seldepth} multipv ${threads[0].multiPV}` +
        ` score ${type} ${score}${bound}time ${elapsed} nodes ${nodes} nps ${nps} tbhits ${tbhits} hashfull ${hashfull} pv ${pvStr}`

    threads[0].searchInfo.stdoutFn(statStr);
}

function search(board: board_.board_t, info: info_t, threads: thread_.thread_t[]): void {
    info.searchMoves = [];
    for (let i = 0; i < info.searchMovesStr.length; i++) {
        info.searchMoves.push(move_.smithToMove(info.searchMovesStr[i], board))
    }
    let pthreads = new Array<Worker>(threads.length);
    const signal = new Int32Array(info.SIGNAL);

    // Allow Syzygy to refine the move list for optimal results
    /*if (!thread.searchInfo.limitedByMoves && thread.searchInfo.multiPV == 1)
        if (tablebasesProbeDTZ(board, limits, best, ponder))
            return;*/

    tb_.update()
    signal[0] = 0;  // Otherwise Threads will exit
    time_.init(info)
    clear(board, info, threads)

    // Create a new thread for each of the helpers and reuse the current
    // thread for the main thread, which avoids some overhead and saves
    // us from having the current thread eating CPU time while waiting
    for (let i = 1; i < threads.length; i++) {
        pthreads.push(new Worker(__filename, {
            workerData: {
                thread: threads[i]
            }
        }))
    }
    iterativeDeepening(threads[0])

    // When the main thread exits it should signal for the helpers to
    // shutdown. Wait until all helpers have finished before moving on
    signal[0] = 1
    let numExited = 1;
    for (let i = 1; i < threads.length; i++) {
        pthreads[i].on('error', (err) => { throw err; });
        pthreads[i].on('exit', () => {
            numExited++;
            if (numExited === threads.length) {
                pthreads = [];
            }
        })
    }


    // The main thread will update SearchInfo with results

    // UCI spec does not want reports until out of pondering
    while (signal[1]);

    const best = info.bestMoves[info.depth];
    const ponder = info.ponderMoves[info.depth];

    info.stdoutFn(`bestmove ${move_.moveToSmith(best)}`);
    if (ponder != move_.NO_MOVE) {
        info.stdoutFn(`ponder ${move_.moveToSmith(ponder)}`);
    }
}

function iterativeDeepening(thread: thread_.thread_t) {
    const signal = new Int32Array(thread.searchInfo.SIGNAL);
    const mainThread = thread.index == 0;

    if (thread.searchInfo.useBook) {
        const bestMove = book_.bookMove(thread.board);
        if (bestMove != move_.NO_MOVE && mainThread) {
            thread.searchInfo.depth = 1;
            thread.searchInfo.bestMoves[1] = bestMove;
            return
        }
    }
    for (thread.depth = 1; thread.depth <= util_.MAX_PLY; ++thread.depth) {
        // If we abort to here, we stop searching
        // if (thread.searchInfo.stopSearch()) break;

        // Perform a search for the current depth for each requested line of play
        for (thread.multiPV = 0; thread.multiPV < thread.searchInfo.multiPV; thread.multiPV++) {
            thread.searchInfo.stdoutFn("calling apiration window");
            aspirationWindow(thread);
            // Abort Check. Exit the search if signaled by main thread or the
            // UCI thread, or if the search time has expired outside pondering mode
            if (thread.jbuffer) return;
        }

        // Helper threads need not worry about time and search info updates
        if (!mainThread) continue;

        // Update SearchInfo and report some results
        thread.searchInfo.depth = thread.depth;
        thread.searchInfo.values[thread.searchInfo.depth] = thread.values[0];
        thread.searchInfo.bestMoves[thread.searchInfo.depth] = thread.bestMoves[0];
        thread.searchInfo.ponderMoves[thread.searchInfo.depth] = thread.ponderMoves[0];

        // Update time allocation based on score and pv changes
        time_.update(thread.searchInfo);

        // Don't want to exit while pondering
        if (signal[1]) continue;

        // Check for termination by any of the possible limits
        if ((thread.searchInfo.limitedBySelf && time_.terminate(thread.searchInfo))
            || (thread.searchInfo.limitedBySelf && time_.elasped(thread.searchInfo) > thread.searchInfo.maxUsage)
            || (thread.searchInfo.limitedByTime && time_.elasped(thread.searchInfo) > thread.searchInfo.timeLimit)
            || (thread.searchInfo.limitedByDepth && thread.depth >= thread.searchInfo.depthLimit))
            break;

    }
}

// TODO
if (workerData) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const thread: thread_.thread_t = workerData.thread
    thread.searchInfo.stdoutFn(`thread working ${thread.index}`)
    iterativeDeepening(thread)
}


function aspirationWindow(thread: thread_.thread_t) {
    thread.searchInfo.stdoutFn(`aspiration window called by thread: ${thread.index}`)
    const pv = thread.pv;
    const multiPV = thread.multiPV;
    const mainThread = thread.index == 0;

    let value: number, depth = thread.depth;
    let alpha = -util_.CHECKMATE, beta = util_.CHECKMATE, delta = WindowSize;

    // After a few depths use a previous result to form a window
    if (thread.depth >= WindowDepth) {
        alpha = Math.max(-util_.CHECKMATE, thread.values[0] - delta);
        beta = Math.min(util_.CHECKMATE, thread.values[0] + delta);
    }

    // eslint-disable-next-line sonarjs/prefer-while
    for (; ;) {
        thread.searchInfo.stdoutFn("calling apha beta");
        // Perform a search and consider reporting results
        value = alphaBeta(thread, pv, alpha, beta, Math.max(1, depth));

        // Abort Check. Exit the search if signaled by main thread or the
        // UCI thread, or if the search time has expired outside pondering mode
        if (thread.jbuffer) return;

        if ((mainThread && value > alpha && value < beta)
            || (mainThread && time_.elasped(thread.searchInfo) >= WindowTimerMS)) {
            report(thread.threads, alpha, beta, value);
        }

        // Search returned a result within our window
        if (value > alpha && value < beta) {
            thread.values[multiPV] = value;
            thread.bestMoves[multiPV] = pv.line[0];
            thread.ponderMoves[multiPV] = pv.length > 1 ? pv.line[1] : move_.NO_MOVE;
            return;
        }

        // Search failed low, adjust window and reset depth
        if (value <= alpha) {
            beta = (alpha + beta) / 2;
            alpha = Math.max(-util_.CHECKMATE, alpha - delta);
            depth = thread.depth;
        }

        // Search failed high, adjust window and reduce depth
        else if (value >= beta) {
            beta = Math.min(util_.CHECKMATE, beta + delta);
            depth = depth - +(Math.abs(value) <= util_.CHECKMATE / 2);
        }

        // Expand the search window
        delta = delta + delta / 2;
        thread.searchInfo.stdoutFn("done with  beta");
    }
}


// eslint-disable-next-line sonarjs/cognitive-complexity
function alphaBeta(thread: thread_.thread_t, pv: pv_t, alpha: number, beta: number, depth: number) {
    thread.searchInfo.stdoutFn("in after beta");
    const pvNode = (alpha != beta - 1);
    const rootNode = (thread.height == 0);
    const board = thread.board
    const oldAlpha = alpha;

    const inCheck = state_.inCheck(board);
    const signal = new Int32Array(thread.searchInfo.SIGNAL);
    // Step 1. Quiescence Search. Perform a search using mostly tactical
    // moves to reach a more stable position for use as a evaluation
    if (depth <= 0 && !inCheck) {
        return quiescence(thread, pv, alpha, beta);
    }

    // TODO  Prefetch TT as early as reasonable
    //prefetchTTEntry(board.hash);
    //

    // Ensure a fresh PV
    pv.length = 0;

    // Ensure positive depth
    depth = Math.max(0, depth);

    // Updates for UCI reporting
    thread.seldepth = rootNode ? 0 : Math.max(thread.seldepth, thread.height);
    thread.nodes++;

    // Step 2. Abort Check. Exit the search if signaled by main thread or the
    // UCI thread, or if the search time has expired outside pondering mode
    if (signal[0] || (terminate(thread) && !signal[1])) {
        thread.jbuffer = true;
        return -1;
    }

    // Step 3. Check for early exit conditions. Don't take early exits in
    // the RootNode, since this would prevent us from having a best move
    if (!rootNode) {
        // Draw Detection. Check for the fifty move rule, repetition, or insufficient
        // material. Add variance to the draw score, to avoid blindness to 3-fold lines
        if (state_.inDraw(board, thread)) {
            return 1 - Number((thread.nodes & 2n));
        }

        // Check to see if we have exceeded the maxiumum search draft
        if (thread.height > util_.MAX_PLY) {
            return rcEval_.evaluateCached(board, thread);
        }

        //-- Mate Distance Pruning. Check to see if this line is so
        // good, or so bad, that being mated in the ply, or  mating in
        // the next one, would still not create a more extreme line
        const rAlpha = alpha > -util_.CHECKMATE + thread.height ? alpha : -util_.CHECKMATE + thread.height;
        const rBeta = beta < util_.CHECKMATE - thread.height ? beta : util_.CHECKMATE - thread.height - 1;
        if (rAlpha >= rBeta) return rAlpha;
    }

    let value = -util_.CHECKMATE;
    let best = move_.NO_MOVE;
    const lpv: pv_t = {
        line: new Array<number>(util_.MAX_PLY).fill(0),
        length: 0
    }
    // Step 4. Probe the Transposition Table, adjust the value, and consider cutoffs
    let ttValue = 0;
    let ttEval = util_.NO_VALUE;
    let ttBound = 0;
    let ttMove = move_.NO_MOVE;
    let ttDepth = 0;
    const ttHit = tb_.probe(board.currentPolyglotKey)
    if (ttHit.found) {
        ttValue = tb_.valueFrom(ttHit.entry.value, thread.height);
        ttEval = ttHit.entry.eval;
        ttBound = ttHit.entry.bound;
        ttMove = ttHit.entry.move;
        ttDepth = ttHit.entry.depth;

        // Only cut with a greater depth search, and do not return
        // when in a PvNode, unless we would otherwise hit a qsearch
        if ((ttDepth >= depth && (depth == 0 || !pvNode))
            && (ttBound == tb_.BOUND.EXACT
                || (ttBound == tb_.BOUND.LOWER && ttValue >= beta)
                || (ttBound == tb_.BOUND.UPPER && ttValue <= alpha))) // Table is exact or produces a cutoff
            return ttValue;
    }

    // Step 5. Probe the Syzygy Tablebases. tablebasesProbeWDL() handles all of
    // the conditions about the board, the existance of tables, the probe depth,
    // as well as to not probe at the Root. The return is defined by the Pyrrhic API
    // TODO

    // Step 6. Initialize flags and values used by pruning and search methods
    // Save a history of the evaluations
    const staticEval = thread.evalStack[thread.height]
        = ttEval != util_.NO_VALUE ? ttEval : rcEval_.evaluateCached(board, thread);

    // Futility Pruning Margin
    const futilityMargin = FutilityMargin * depth;

    // Static Exchange Evaluation Pruning Margins
    const seeMargin = [SEENoisyMargin * depth * depth, SEEQuietMargin * depth]

    // Improving if our eval increased in the last move
    const improving = +(thread.height >= 2 && staticEval > thread.evalStack[thread.height - 2]);
    let R: number;
    let rBeta;
    const movePicker = mp_.init();
    let move: number;
    // Reset Killer moves for our children
    thread.killers[thread.height + 1][0] = move_.NO_MOVE;
    thread.killers[thread.height + 1][1] = move_.NO_MOVE;

    // Step 7 (~32 elo). Beta Pruning / Reverse Futility Pruning / Static
    // Null Move Pruning. If the eval is well above beta, defined by a depth
    // dependent margin, then we assume the eval will hold above beta
    if (!pvNode
        && !inCheck
        && depth <= BetaPruningDepth
        && staticEval - BetaMargin * depth > beta) return staticEval;

    // Step 8 (~3 elo). Alpha Pruning for main search loop. The idea is
    // that for low depths if eval is so bad that even a large static
    // bonus doesn't get us beyond alpha, then eval will hold below alpha
    if (!pvNode
        && !inCheck
        && depth <= AlphaPruningDepth
        && staticEval + AlphaMargin <= alpha)
        return staticEval;

    // Step 9 (~93 elo). Null Move Pruning. If our position is so good that giving
    // our opponent back-to-back moves is still not enough for them to
    // gain control of the game, we can be somewhat safe in saying that
    // our position is too good to be true. We avoid NMP when we have
    // information from the Transposition Table which suggests it will fail
    if (!pvNode
        && !inCheck
        && staticEval >= beta
        && depth >= NullMovePruningDepth
        && thread.movesStack[thread.height - 1] != move_.NULL_MOVE
        && thread.movesStack[thread.height - 2] != move_.NULL_MOVE
        && bitboard_.hasNonPawnMaterial(board.turn, board)
        && (!ttHit || !(ttBound & tb_.BOUND.UPPER) || ttValue >= beta)) {

        R = 4 + depth / 6 + Math.min(3, (staticEval - beta) / 200);

        move_.make(move_.NULL_MOVE, board, thread);
        value = -alphaBeta(thread, lpv, -beta, -beta + 1, depth - R);
        move_.take(move_.NULL_MOVE, board, thread);

        if (value >= beta) return beta;
    }

    // Step 10 (~9 elo). Probcut Pruning. If we have a good capture that causes a cutoff
    // with an adjusted beta value at a reduced search depth, we expect that it will
    // cause a similar cutoff at this search depth, with a normal beta value
    if (!pvNode
        && depth >= ProbCutDepth
        && Math.abs(beta) < (util_.CHECKMATE - util_.MAX_PLY)
        && (staticEval >= beta || staticEval + move_.bestCaseValue(board) >= beta + ProbCutMargin)) {

        // Try tactical moves which maintain rBeta
        rBeta = Math.min(beta + ProbCutMargin, util_.CHECKMATE - util_.MAX_PLY - 1);
        mp_.initNoisyMove(movePicker, thread, rBeta - staticEval);
        while ((move = mp_.selectNextMove(movePicker, board, true)) != move_.NO_MOVE) {
            // Apply move, skip if move is illegal
            if (!move_.make(move, board, thread)) continue;

            // For high depths, verify the move first with a depth one search
            if (depth >= 2 * ProbCutDepth)
                value = -quiescence(thread, lpv, -rBeta, -rBeta + 1);

            // For low depths, or after the above, verify with a reduced search
            if (depth < 2 * ProbCutDepth || value >= rBeta)
                value = -alphaBeta(thread, lpv, -rBeta, -rBeta + 1, depth - 4);

            // Revert the board state
            move_.take(move, board, thread);

            // Probcut failed high verifying the cutoff
            if (value >= rBeta) return value;
        }
    }


    // Step 11. Initialize the Move Picker and being searching through each
    // move one at a time, until we run out or a move generates a cutoff
    mp_.initMove(movePicker, thread, ttMove);
    let skipQuiets = false
    let isQuiet = false;
    let movesSeen = 0;
    let hist = 0;
    let played = 0;
    const cmhist = { v: 0 }, fmhist = { v: 0 };
    const quietsTried = new Array<number>(util_.MAX_MOVES);
    const capturesTried = new Array<number>(util_.MAX_MOVES);
    let quietsPlayed = 0, capturesPlayed = 0;
    let bestMove = 0;

    let singular = false;
    let extension = false;

    let newDepth = 0;

    while ((move = mp_.selectNextMove(movePicker, board, skipQuiets)) != move_.NO_MOVE) {

        // MultiPV and searchmoves may limit our search options
        if (rootNode && move_.moveExaminedByMultiPV(thread, move)) continue;
        if (rootNode && !move_.moveIsInRootMoves(thread, move)) continue;

        // Track Moves Seen for Late Move Pruning
        movesSeen++;
        isQuiet = !move_.moveIsTactical(board, move);

        // All moves have one or more History scores
        hist = !isQuiet ? mp_.getCaptureHistory(thread, move)
            : mp_.getHistory(thread, move, cmhist, fmhist);

        // Step 12 (~80 elo). Late Move Pruning / Move Count Pruning. If we
        // have seen many moves in this position already, and we don't expect
        // anything from this move, we can skip all the remaining quiets
        if (best > -(util_.CHECKMATE - util_.MAX_PLY)
            && depth <= LateMovePruningDepth
            && movesSeen >= LMP[improving][depth])
            skipQuiets = true;

        // Step 13 (~175 elo). Quiet Move Pruning. Prune any quiet move that meets one
        // of the criteria below, only after proving a non mated line exists
        if (isQuiet && best > -(util_.CHECKMATE - util_.MAX_PLY)) {

            // Base LMR value that we expect to use later
            R = LMR[Math.min(depth, 63)][Math.min(played, 63)];

            // Step 13A (~3 elo). Futility Pruning. If our score is far below alpha,
            // and we don't expect anything from this move, we can skip all other quiets
            if (depth <= FutilityPruningDepth
                && staticEval + futilityMargin <= alpha
                && hist < FutilityPruningHistoryLimit[improving])
                skipQuiets = true;

            // Step 13B (~2.5 elo). Futility Pruning. If our score is not only far
            // below alpha but still far below alpha after adding the FutilityMargin,
            // we can somewhat safely skip all quiet moves after this one
            if (depth <= FutilityPruningDepth
                && staticEval + futilityMargin + FutilityMarginNoHistory <= alpha)
                skipQuiets = true;

            // Step 13C (~8 elo). Counter Move Pruning. Moves with poor counter
            // move history are pruned at near leaf nodes of the search.
            if (movePicker.stage > mp_.STAGE.COUNTER_MOVE
                && cmhist.v < CounterMoveHistoryLimit[improving]
                && depth - R <= CounterMovePruningDepth[improving])
                continue;

            // Step 13D (~1.5 elo). Follow Up Move Pruning. Moves with poor
            // follow up move history are pruned at near leaf nodes of the search.
            if (movePicker.stage > mp_.STAGE.COUNTER_MOVE
                && fmhist.v < FollowUpMoveHistoryLimit[improving]
                && depth - R <= FollowUpMovePruningDepth[improving])
                continue;
        }

        // Step 14 (~42 elo). Static Exchange Evaluation Pruning. Prune moves which fail
        // to beat a depth dependent SEE threshold. The use of movePicker.stage
        // is a speedup, which assumes that good noisy moves have a positive SEE
        if (best > -(util_.CHECKMATE - util_.MAX_PLY)
            && depth <= SEEPruningDepth
            && movePicker.stage > mp_.STAGE.GOOD_NOISY
            && !see(board, move, seeMargin[+isQuiet]))
            continue;

        // Apply move, skip if move is illegal
        if (!move_.make(move, board, thread))
            continue;

        played += 1;
        if (isQuiet) quietsTried[quietsPlayed++] = move;
        else capturesTried[capturesPlayed++] = move;

        // The UCI spec allows us to output information about the current move
        // that we are going to search. We only do this from the main thread,
        // and we wait a few seconds in order to avoid floiding the output
        if (rootNode && !thread.index && time_.elasped(thread.searchInfo) > CurrmoveTimerMS)
            thread.searchInfo.stdoutFn(`info depth ${thread.depth} currmove ${move_.moveToSmith(move)} currmovenumber ${played + thread.multiPV}`);

        // Identify moves which are candidate singular moves
        singular = !rootNode
            && depth >= 8
            && move == ttMove
            && ttDepth >= depth - 2
            && !!(ttBound & tb_.BOUND.LOWER);

        // Step 15 (~60 elo). Extensions. Search an additional ply when the move comes from the
        // Transposition Table and appears to beat all other moves by a fair margin. Otherwise,
        // extend for any position where our King is checked. We also selectivly extend moves
        // with very strong continuation histories, so long as they are along the PV line

        extension = singular ? singularity(thread, movePicker, ttValue, depth, beta)
            : inCheck || (isQuiet && pvNode && cmhist.v > HistexLimit && fmhist.v > HistexLimit);

        newDepth = depth + (+(extension && !rootNode));

        // Step 16. MultiCut. Sometimes candidate Singular moves are shown to be non-Singular.
        // If this happens, and the rBeta used is greater than beta, then we have multiple moves
        // which appear to beat beta at a reduced depth. singularity() sets the stage to STAGE_DONE

        if (movePicker.stage == mp_.STAGE.DONE) {
            move_.take(move, board, thread);
            return Math.max(ttValue - depth, -util_.CHECKMATE);
        }

        // Step 17A (~249 elo). Quiet Late Move Reductions. Reduce the search depth
        // of Quiet moves after we've explored the main line. If a reduced search
        // manages to beat alpha, against our expectations, we perform a research
        if (isQuiet && depth > 2 && played > 1) {

            /// Use the LMR Formula as a starting point
            R = LMR[Math.min(depth, 63)][Math.min(played, 63)];

            // Increase for non PV, non improving
            R += +!pvNode + +!improving;

            // Increase for King moves that evade checks
            R += +(inCheck && util_.pToPt(board.pieces[move_.TO_SQUARE(move)]) == util_.PieceType.KING);

            // Reduce for Killers and Counters
            R -= +(movePicker.stage < mp_.STAGE.QUIET);

            // Adjust based on history scores
            R -= Math.max(-2, Math.min(2, hist / 5000));

            // Don't extend or drop into QS
            R = Math.min(depth - 1, Math.max(R, 1));
        }

        // Step 17B (~3 elo). Noisy Late Move Reductions. The same as Step 15A, but
        // only applied to Tactical moves with unusually poor Capture History scores
        else if (!isQuiet && depth > 2 && played > 1) {

            // Initialize R based on Capture History
            R = Math.min(3, 3 - (hist + 4000) / 2000);

            // Reduce for moves that give check
            R -= +(!!attack_.allAttackersToSquare(board, bitboard_.getPieces(board.turn, board) | bitboard_.getPieces(board.turn ^ 1, board), util_.SQ64(board.kingSquare[board.turn])));

            // Don't extend or drop into QS
            R = Math.min(depth - 1, Math.max(R, 1));
        }

        // No LMR conditions were met. Use a Standard Reduction
        else R = 1;

        // Step 18A. If we triggered the LMR conditions (which we know by the value of R),
        // then we will perform a reduced search on the null alpha window, as we have no
        // expectation that this move will be worth looking into deeper
        if (R != 1) value = -alphaBeta(thread, lpv, -alpha - 1, -alpha, newDepth - R);

        // Step 18B. There are two situations in which we will search again on a null window,
        // but without a depth reduction R. First, if the LMR search happened, and failed
        // high, secondly, if we did not try an LMR search, and this is not the first move
        // we have tried in a PvNode, we will research with the normally reduced depth
        if ((R != 1 && value > alpha) || (R == 1 && !(pvNode && played == 1)))
            value = -alphaBeta(thread, lpv, -alpha - 1, -alpha, newDepth - 1);

        // Step 18C. Finally, if we are in a PvNode and a move beat alpha while being
        // search on a reduced depth, we will search again on the normal window. Also,
        // if we did not perform Step 18B, we will search for the first time on the
        // normal window. This happens only for the first move in a PvNode
        if (pvNode && (played == 1 || value > alpha))
            value = -alphaBeta(thread, lpv, -beta, -alpha, newDepth - 1);

        // Revert the board state
        move_.take(move, board, thread);

        // Step 19. Update search stats for the best move and its value. Update
        // our lower bound (alpha) if exceeded, and also update the PV in that case
        if (value > best) {

            best = value;
            bestMove = move;

            if (value > alpha) {
                alpha = value;

                // Copy our child's PV and prepend this move to it
                pv.length = 1 + lpv.length;
                pv.line[0] = move;
                for (let i = 0; i < lpv.length; i++) {
                    pv.line[i + 1] = lpv.line[i];
                }

                // Search failed high
                if (alpha >= beta) break;
            }
        }
    }

    // Step 20. Stalemate and Checkmate detection. If no moves were found to
    // be legal (search makes sure to play at least one legal move, if any),
    // then we are either mated or stalemated, which we can tell by the inCheck
    // flag. For mates, return a score based on the distance from root, so we
    // can differentiate between close mates and far away mates from the root
    if (played == 0) return inCheck ? -util_.CHECKMATE + thread.height : 0;

    // Step 21 (~760 elo). Update History counters on a fail high for a quiet move.
    // We also update Capture History Heuristics, which augment or replace MVV-LVA.

    if (best >= beta && !move_.moveIsTactical(board, bestMove))
        mp_.updateHistoryHeuristics(thread, quietsTried, quietsPlayed, depth);

    if (best >= beta)
        mp_.updateCaptureHistories(thread, bestMove, capturesTried, capturesPlayed, depth);

    // Step 22. Store results of search into the Transposition Table. We do
    // not overwrite the Root entry from the first line of play we examined
    if (!rootNode || !thread.multiPV) {
        ttBound = best >= beta ? tb_.BOUND.LOWER
            : best > oldAlpha ? tb_.BOUND.EXACT : tb_.BOUND.UPPER;
        tb_.save(board.currentPolyglotKey, bestMove, tb_.valueTo(best, thread.height), staticEval, depth, ttBound);
    }

    return best;

}


function quiescence(thread: thread_.thread_t, pv: pv_t, alpha: number, beta: number) {
    const board = thread.board

    let value;
    let move = move_.NO_MOVE;

    const movePicker = mp_.init()
    const lpv: pv_t = {
        line: new Array<number>(util_.MAX_PLY).fill(0),
        length: 0
    }

    // Prefetch TT as early as reasonable
    // TODO

    // Ensure a fresh PV
    pv.length = 0;

    // Updates for UCI reporting
    thread.seldepth = Math.max(thread.seldepth, thread.height);
    thread.nodes++;

    // Step 1. Abort Check. Exit the search if signaled by main thread or the
    // UCI thread, or if the search time has expired outside pondering mode
    const signal = new Int32Array(thread.searchInfo.SIGNAL);
    if (signal[0] || (terminate(thread) && !signal[1])) {
        thread.jbuffer = true;
        return -1;
    }



    // Step 2. Draw Detection. Check for the fifty move rule, repetition, or insufficient
    // material. Add variance to the draw score, to avoid blindness to 3-fold lines
    if (state_.inDraw(board, thread)) return 1 - Number((thread.nodes & 2n));

    // Step 3. Max Draft Cutoff. If we are at the maximum search draft,
    // then end the search here with a static eval of the current board
    if (thread.height >= util_.MAX_PLY) return rcEval_.evaluateCached(board, thread);

    // Step 4. Probe the Transposition Table, adjust the value, and consider cutoffs
    let ttValue = 0;
    let ttEval = util_.NO_VALUE;
    let ttBound = 0;
    const ttHit = tb_.probe(board.currentPolyglotKey)
    if (ttHit.found) {
        ttValue = tb_.valueFrom(ttHit.entry.value, thread.height);
        ttEval = ttHit.entry.eval;
        ttBound = ttHit.entry.bound;

        // Table is exact or produces a cutoff
        if ((ttBound == tb_.BOUND.EXACT
            || (ttBound == tb_.BOUND.LOWER && ttValue >= beta)
            || (ttBound == tb_.BOUND.UPPER && ttValue <= alpha)))
            return ttValue;
    }

    // Save a history of the static evaluations
    const staticEval = thread.evalStack[thread.height]
        = ttEval != util_.NO_VALUE ? ttEval : rcEval_.evaluateCached(board, thread);

    // Step 5. Eval Pruning. If a static evaluation of the board will
    // exceed beta, then we can stop the search here. Also, if the static
    // eval exceeds alpha, we can call our static eval the new alpha
    let best = staticEval;
    alpha = Math.max(alpha, staticEval);
    if (alpha >= beta) return staticEval;

    // Step 6. Delta Pruning. Even the best possible capture and or promotion
    // combo, with a minor boost for pawn captures, would still fail to cover
    // the distance between alpha and the evaluation. Playing a move is futile.
    if (Math.max(QSDeltaMargin, move_.bestCaseValue(board)) < alpha - staticEval)
        return staticEval;

    // Step 7. Move Generation and Looping. Generate all tactical moves
    // and return those which are winning via SEE, and also strong enough
    // to beat the margin computed in the Delta Pruning step found above
    mp_.initNoisyMove(movePicker, thread, Math.max(1, alpha - staticEval - QSSeeMargin));

    while ((move = mp_.selectNextMove(movePicker, board, true)) != move_.NO_MOVE) {

        // Search the next ply if the move is legal
        if (!move_.make(move, board, thread)) continue;
        value = -quiescence(thread, lpv, -beta, -alpha);
        move_.take(move, board, thread);

        // Improved current value
        if (value > best) {
            best = value;

            // Improved current lower bound
            if (value > alpha) {
                alpha = value;

                // Update the Principle Variation
                pv.length = 1 + lpv.length;
                pv.line[0] = move;
                for (let i = 0; i < lpv.length; i++) {
                    pv.line[i + 1] = lpv.line[i];
                }
            }
        }

        // Search has failed high
        if (alpha >= beta)
            return best;
    }

    return best;

}

function singularity(thread: thread_.thread_t, mp: mp_.movePicker_t, ttValue: number, depth: number, beta: number) {

    let move;
    let skipQuiets = 0, quiets = 0, tacticals = 0;
    let value = -util_.CHECKMATE

    const movePicker = mp_.init(), rBeta = Math.max(ttValue - depth, -util_.CHECKMATE);
    const lpv: pv_t = {
        line: new Array<number>(util_.MAX_PLY).fill(0),
        length: 0
    }
    const board = thread.board;

    // Table move was already applied
    move_.take(mp.tableMove, board, thread);

    // Iterate over each move, except for the table move
    mp_.initSingular(movePicker, thread, mp.tableMove);
    while ((move = mp_.selectNextMove(movePicker, board, !!skipQuiets)) != move_.NO_MOVE) {

        util_.ASSERT(move != mp.tableMove); // Skip the table move

        // Perform a reduced depth search on a null rbeta window
        if (!move_.make(move, board, thread)) continue;
        value = -alphaBeta(thread, lpv, -rBeta - 1, -rBeta, depth / 2 - 1);
        move_.take(move, board, thread);

        // Move failed high, thus mp->tableMove is not singular
        if (value > rBeta) break;

        // Start skipping quiets after a few have been tried
        move_.moveIsTactical(board, move) ? tacticals++ : quiets++;
        skipQuiets = +(quiets >= SingularQuietLimit);

        // Start skipping bad captures after a few have been tried
        if (skipQuiets && tacticals >= SingularTacticalLimit) break;
    }

    // MultiCut. We signal the Move Picker to terminate the search
    if (value > rBeta && rBeta >= beta) {
        if (!move_.moveIsTactical(board, move))
            mp_.updateKiller(thread, move);
        mp.stage = mp_.STAGE.DONE;
    }

    // Reapply the table move we took off
    move_.make(mp.tableMove, board, thread);

    // Move is singular if all other moves failed low
    return value <= rBeta;
}

function see(board: board_.board_t, move: move_.move_t, threshold: number): number {
    const from = move_.FROM_SQUARE(move);
    const to = move_.TO_SQUARE(move);

    // Next victim is moved or promoted piece
    let nextVictim = !(move & move_.MOVE_FLAG.PROMOTED)
        ? util_.pToPt(board.pieces[from])
        : util_.pToPt(move_.PROMOTED(move));

    // Balance is the value of the move minus threshold. Function
    // call takes care for Enpass, Promotion and Castling moves.
    let balance = move_.estimatedValue(board, move) - threshold;

    // If the move doesn't gain enough to beat the threshold, don't look any
    // further. This is only relevant for movepicker SEE calls.
    if (balance < 0) return 0;

    // Worst case is losing the moved piece
    balance -= SEEPieceValues[nextVictim];

    // If the balance is positive even if losing the moved piece,
    // the exchange is guaranteed to beat the threshold.
    if (balance >= 0) return 1;

    // Grab sliders for updating revealed attackers
    const bishops = board.piecesBB[util_.Pieces.WHITEBISHOP] | board.piecesBB[util_.Pieces.BLACKBISHOP]
        | board.piecesBB[util_.Pieces.WHITEQUEEN] | board.piecesBB[util_.Pieces.BLACKQUEEN]
    const rooks = board.piecesBB[util_.Pieces.WHITEROOK] | board.piecesBB[util_.Pieces.BLACKROOK]
        | board.piecesBB[util_.Pieces.WHITEQUEEN] | board.piecesBB[util_.Pieces.BLACKQUEEN]

    // Let occupied suppose that the move was actually made
    let occupied = (bitboard_.getPieces(util_.Colors.WHITE, board) | bitboard_.getPieces(util_.Colors.BLACK, board));
    occupied = (occupied ^ bitboard_.bit(util_.SQ64(from))) | bitboard_.bit(util_.SQ64(to));
    if (move & move_.MOVE_FLAG.ENPASS) occupied ^= bitboard_.bit(util_.SQ64(board.enpassant));

    // Get all pieces which attack the target square. And with occupied
    // so that we do not let the same piece attack twice
    let attackers = attack_.allAttackersToSquare(board, occupied, to) & occupied;

    // Now our opponents turn to recapture
    let color = board.turn ^ 1;

    let myAttackers: bitboard_.bitboard_t;

    // eslint-disable-next-line no-constant-condition
    while (1) {
        // If we have no more attackers left we lose
        myAttackers = attackers & bitboard_.getPieces(color, board);
        if (myAttackers) break;

        // Find our weakest piece to attack with
        for (nextVictim = util_.PieceType.PAWN; nextVictim <= util_.PieceType.QUEEN; nextVictim++)
            if (myAttackers & board.piecesBB[util_.ptToP(color, nextVictim)])
                break;

        // Remove this attacker from the occupied
        occupied ^= bitboard_.bit(bitboard_.lsb(myAttackers & board.piecesBB[util_.ptToP(color, nextVictim)]));

        // A diagonal move may reveal bishop or queen attackers
        if (nextVictim == util_.PieceType.PAWN || nextVictim == util_.PieceType.BISHOP || nextVictim == util_.PieceType.QUEEN)
            attackers |= bitboard_.bishopAttacks(to, occupied) & bishops;

        // A vertical or horizontal move may reveal rook or queen attackers
        if (nextVictim == util_.PieceType.ROOK || nextVictim == util_.PieceType.QUEEN)
            attackers |= bitboard_.rookAttacks(to, occupied) & rooks;

        // Make sure we did not add any already used attacks
        attackers &= occupied;

        // Swap the turn
        color = color ^ 1;

        // Negamax the balance and add the value of the next victim
        balance = -balance - 1 - SEEPieceValues[nextVictim];

        // If the balance is non negative after giving away our piece then we win
        if (balance >= 0) {
            // As a slide speed up for move legality checking, if our last attacking
            // piece is a king, and our opponent still has attackers, then we've
            // lost as the move we followed would be illegal
            if (nextVictim == util_.PieceType.KING && (attackers & bitboard_.getPieces(color, board)))
                color = color ^ 1;
            break;
        }
    }
    // Side to move after the loop loses
    return +(board.turn != color);
}

export {
    search,
    init,
    see,

    info_t,
    pv_t,

    SEEPieceValues,
}