/* eslint-disable no-case-declarations */
// -------------------------------------------------------------------------------------------------
// Copyright (c) 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as move_ from '../game/move'
import * as board_ from '../game/board'
import * as thread_ from './thread'
import * as search_ from './search'


type movePicker_t = {
    split: number, noisySize: number, quietSize: number;
    stage: number, type: number, threshold: number;
    values: Array<number>, moves: Array<number>;
    tableMove: number, killer1: number, killer2: number, counter: number;
    thread: thread_.thread_t
}

enum PICKER {
    NORMAL, NOISY
}
enum STAGE {
    TABLE,
    GENERATE_NOISY, GOOD_NOISY,
    KILLER_1, KILLER_2, COUNTER_MOVE,
    GENERATE_QUIET, QUIET,
    BAD_NOISY,
    DONE,
}

const HistoryMax = 400;
const HistoryMultiplier = 32;
const HistoryDivisor = 512;

function init(): movePicker_t {
    const movePicker = {} as movePicker_t;
    movePicker.values = new Array<number>(util_.MAX_MOVES).fill(0)
    movePicker.moves = new Array<number>(util_.MAX_MOVES).fill(move_.NO_MOVE)
    return movePicker;
}

function initNoisyMove(mp: movePicker_t, thread: thread_.thread_t, threshold: number): void {
    // Start with just the noisy moves
    mp.stage = STAGE.GENERATE_NOISY;
    // Skip all of the special (refutation and table) moves
    mp.tableMove = mp.killer1 = mp.killer2 = mp.counter = move_.NO_MOVE;
    // General housekeeping
    mp.threshold = threshold;
    mp.thread = thread;
    mp.type = PICKER.NOISY;
}

function initMove(mp: movePicker_t, thread: thread_.thread_t, ttMove: number): void {
    // Start with the table move
    mp.stage = STAGE.TABLE;
    mp.tableMove = ttMove;

    // Lookup our refutations (killers and counter moves)
    getRefutationMoves(mp, thread);

    // General housekeeping
    mp.threshold = 0;
    mp.thread = thread;
    mp.type = PICKER.NOISY;
}

function initSingular(mp: movePicker_t, thread: thread_.thread_t, ttMove: number): void {
    // Simply skip over the TT move
    initMove(mp, thread, ttMove);
    mp.stage = STAGE.GENERATE_NOISY;
}

function getRefutationMoves(mp: movePicker_t, thread: thread_.thread_t) {
    // Extract information from last move
    const previous = thread.movesStack[thread.height - 1];
    const cmPiece = thread.pieceStack[thread.height - 1];
    const cmTo = move_.TO_SQUARE(previous);

    // Set Killer Moves by height
    mp.killer1 = thread.killers[thread.height][0];
    mp.killer2 = thread.killers[thread.height][1];

    // Set Counter Move if one exists
    if (!previous || previous == move_.NULL_MOVE) mp.counter = move_.NO_MOVE;
    else mp.counter = thread.cmtable[thread.board.turn ^ 1][util_.pToPt(cmPiece) - 1][util_.SQ64(cmTo)];
}


function getCaptureHistories(mp: movePicker_t): void {
    const MVVAugment = [0, 2400, 2400, 4800, 9600];
    for (let i = 0; i < mp.noisySize; i++) {
        const from = move_.FROM_SQUARE(mp.moves[i]);
        const to = move_.TO_SQUARE(mp.moves[i]);

        const piece = util_.pToPt(mp.thread.board.pieces[from]);
        let captured = util_.pToPt(mp.thread.board.pieces[to]);

        if (mp.moves[i] & move_.MOVE_FLAG.ENPASS) captured = util_.PieceType.PAWN;
        if (mp.moves[i] & move_.MOVE_FLAG.PROMOTED) captured = util_.PieceType.PAWN;

        util_.ASSERT(util_.PieceType.PAWN <= piece && piece <= util_.PieceType.KING,
            `piece value ${piece} but expected between 1(Pawn) to 5(King)`);


        util_.ASSERT(util_.PieceType.PAWN <= captured && captured <= util_.PieceType.QUEEN,
            `captured value ${captured} but expected between 1(Pawn) to 5(Queen)`);


        mp.values[i] = 64000 + mp.thread.chistory[piece - 1][util_.SQ64(to)][captured - 1];
        if ((mp.moves[i] & move_.MOVE_FLAG.PROMOTED)
            && (util_.pToPt(move_.PROMOTED(mp.moves[i])) == util_.PieceType.QUEEN)) mp.values[i] += 64000;
        mp.values[i] += MVVAugment[captured - 1];

        util_.ASSERT(mp.values[i] >= 0);
    }
}

function getHistoryScores(mp: movePicker_t) {
    const counter = mp.thread.movesStack[mp.thread.height - 1];
    const cmPiece = mp.thread.pieceStack[mp.thread.height - 1];
    const cmTo = move_.TO_SQUARE(counter);

    // Extract information from two moves ago
    const follow = mp.thread.movesStack[mp.thread.height - 2];
    const fmPiece = mp.thread.pieceStack[mp.thread.height - 2];
    const fmTo = move_.TO_SQUARE(follow);

    for (let i = mp.split; i < mp.split + mp.quietSize; i++) {

        // Extract information from this move
        const to = move_.TO_SQUARE(mp.moves[i]);
        const from = move_.FROM_SQUARE(mp.moves[i]);
        const piece = mp.thread.board.pieces[from];


        // Start with the basic Butterfly history
        mp.values[i] = mp.thread.history[mp.thread.board.turn][util_.SQ64(from)][util_.SQ64(to)];

        // Add Counter Move History if it exists
        if (counter != move_.NO_MOVE && counter != move_.NULL_MOVE && counter != undefined)
            mp.values[i] += mp.thread.continuation[0][util_.pToPt(cmPiece) - 1][util_.SQ64(cmTo)][util_.pToPt(piece) - 1][util_.SQ64(to)];

        // Add Followup Move History if it exists
        if (follow != move_.NO_MOVE && follow != move_.NULL_MOVE && follow != undefined)
            mp.values[i] += mp.thread.continuation[1][util_.pToPt(fmPiece) - 1][util_.SQ64(fmTo)][util_.pToPt(piece) - 1][util_.SQ64(to)];
    }
}
function getCaptureHistory(thread: thread_.thread_t, move: move_.move_t): number {
    const to = move_.TO_SQUARE(move);
    const from = move_.FROM_SQUARE(move);

    const piece = util_.pToPt(thread.board.pieces[from])
    let captured = util_.pToPt(thread.board.pieces[to])

    if (move && move_.MOVE_FLAG.ENPASS) captured = util_.PieceType.PAWN;
    if (move && move_.MOVE_FLAG.PROMOTED) util_.PieceType.PAWN;
    util_.ASSERT(util_.PieceType.PAWN <= piece && piece <= util_.PieceType.KING);
    util_.ASSERT(util_.PieceType.PAWN <= captured && captured <= util_.PieceType.QUEEN);

    return thread.chistory[piece - 1][util_.SQ64(to)][captured - 1]
        + 64000 * +(util_.pToPt(move_.PROMOTED(move)) == util_.PieceType.QUEEN);
}

function getHistory(thread: thread_.thread_t, move: move_.move_t, cmhist: { v: number }, fmhist: { v: number }): number {

    const to = move_.TO_SQUARE(move);
    const from = move_.FROM_SQUARE(move);
    const piece = thread.board.pieces[from];

    // Extract information from last move
    const counter = thread.movesStack[thread.height - 1];
    const cmPiece = thread.pieceStack[thread.height - 1];
    const cmTo = move_.TO_SQUARE(counter);

    // Extract information from two moves ago
    const follow = thread.movesStack[thread.height - 2];
    const fmPiece = thread.pieceStack[thread.height - 2];
    const fmTo = move_.TO_SQUARE(follow);

    // Set Counter Move History if it exists
    if (counter == move_.NO_MOVE || counter == move_.NULL_MOVE || counter == undefined) cmhist.v = 0;
    else cmhist.v = thread.continuation[0][util_.pToPt(cmPiece) - 1][util_.SQ64(cmTo)][util_.pToPt(piece) - 1][util_.SQ64(to)];

    // Set Followup Move History if itS exists
    if (follow == move_.NO_MOVE || follow == move_.NULL_MOVE || follow == undefined) fmhist.v = 0;
    else fmhist.v = thread.continuation[1][util_.pToPt(fmPiece) - 1][util_.SQ64(fmTo)][util_.pToPt(piece) - 1][util_.SQ64(to)];

    // Return CMHist + FMHist + ButterflyHist
    return cmhist.v + fmhist.v + thread.history[thread.board.turn][util_.SQ64(from)][util_.SQ64(to)];
}

function getBestMoveIndex(mp: movePicker_t, start: number, end: number): number {
    let best = start;
    for (let i = start + 1; i < end; i++) {
        if (mp.values[i] > mp.values[best])
            best = i;
    }
    return best;
}


function updateKiller(thread: thread_.thread_t, move: move_.move_t): void {
    // Avoid saving the same Killer Move twice
    if (thread.killers[thread.height][0] == move) return;

    thread.killers[thread.height][1] = thread.killers[thread.height][0];
    thread.killers[thread.height][0] = move;
}

function updateCaptureHistories(thread: thread_.thread_t, best: move_.move_t, moves: move_.move_t[], length: number, depth: number): void {
    const bonus = Math.min(depth * depth, HistoryMax);
    for (let i = 0; i < length; i++) {
        const to = move_.TO_SQUARE(moves[i]);
        const from = move_.FROM_SQUARE(moves[i]);
        const delta = moves[i] == best ? bonus : -bonus;

        const piece = util_.pToPt(thread.board.pieces[from])
        let captured = util_.pToPt(thread.board.pieces[to])

        if (moves[i] && move_.MOVE_FLAG.ENPASS) captured = util_.PieceType.PAWN;
        if (moves[i] && move_.MOVE_FLAG.PROMOTED) util_.PieceType.PAWN;

        util_.ASSERT(util_.PieceType.PAWN <= piece && piece <= util_.PieceType.KING);
        util_.ASSERT(util_.PieceType.PAWN <= captured && captured <= util_.PieceType.QUEEN);

        thread.chistory[piece - 1][util_.SQ64(to)][captured - 1] += HistoryMultiplier
            * delta - thread.chistory[piece - 1][util_.SQ64(to)][captured - 1] * Math.abs(delta) / HistoryDivisor;
    }
}

function updateHistoryHeuristics(thread: thread_.thread_t, moves: move_.move_t[], length: number, depth: number): void {

    const colour = thread.board.turn;
    const bestMove = moves[length - 1];

    let cmPiece = 0;
    let fmPiece = 0;

    // Extract information from last move
    const counter = thread.movesStack[thread.height - 1];
    const cmTo = move_.TO_SQUARE(counter);

    // Extract information from two moves ago
    const follow = thread.movesStack[thread.height - 2];
    const fmTo = move_.TO_SQUARE(follow);


    if (counter != undefined) cmPiece = util_.pToPt(thread.pieceStack[thread.height - 1]);
    if (follow != undefined) fmPiece = util_.pToPt(thread.pieceStack[thread.height - 2]);

    // Update Killer Moves (Avoid duplicates)
    if (thread.killers[thread.height][0] != bestMove) {
        thread.killers[thread.height][1] = thread.killers[thread.height][0];
        thread.killers[thread.height][0] = bestMove;
    }

    // Update Counter Moves (BestMove refutes the previous move)
    if (counter != move_.NO_MOVE && counter != move_.NULL_MOVE && counter != undefined)
        thread.cmtable[colour ^ 1][cmPiece - 1][util_.SQ64(cmTo)] = bestMove;

    // If the 1st quiet move failed-high below depth 4, we don't update history tables
    // Depth 0 gives no bonus in any case
    if (length == 1 && depth <= 3) return;

    // Cap update size to avoid saturation
    const bonus = Math.min(depth * depth, HistoryMax);

    for (let i = 0; i < length; i++) {

        // Apply a malus until the final move
        const delta = (moves[i] == bestMove) ? bonus : -bonus;

        // Extract information from this move
        const to = move_.TO_SQUARE(moves[i]);
        const from = move_.FROM_SQUARE(moves[i]);
        const piece = util_.pToPt(thread.board.pieces[from]);

        // Update Butterfly History
        thread.history[colour][util_.SQ64(from)][util_.SQ64(to)] += HistoryMultiplier
            * delta - thread.history[colour][util_.SQ64(from)][util_.SQ64(to)] * Math.abs(delta) / HistoryDivisor

        // Update Counter Move History
        if (counter != move_.NO_MOVE && counter != move_.NULL_MOVE && counter != undefined)
            thread.continuation[0][cmPiece - 1][util_.SQ64(cmTo)][piece - 1][util_.SQ64(to)] += HistoryMultiplier
                * delta - thread.continuation[0][cmPiece - 1][util_.SQ64(cmTo)][piece - 1][util_.SQ64(to)] * Math.abs(delta) / HistoryDivisor;


        // Update Followup Move History
        if (follow != move_.NO_MOVE && follow != move_.NULL_MOVE && follow != undefined)
            thread.continuation[0][fmPiece - 1][util_.SQ64(fmTo)][piece - 1][util_.SQ64(to)] += HistoryMultiplier
                * delta - thread.continuation[0][fmPiece - 1][util_.SQ64(fmTo)][piece - 1][util_.SQ64(to)] * Math.abs(delta) / HistoryDivisor;
    }
}


function popMove(mp: movePicker_t, size: number, buffer: number, index: number) {
    const popped = mp.moves[index + buffer];
    mp.moves[index + buffer] = mp.moves[size];
    mp.values[index + buffer] = mp.values[size];
    return popped;
}


function selectNextMove(mp: movePicker_t, board: board_.board_t, skipQuiets: boolean): number {

    let best: number, bestMove: number;
    let i = 0
    let j = 0
    //let moves: number[];

    switch (mp.stage) {
        case STAGE.TABLE:
            mp.stage = STAGE.GENERATE_NOISY;
            if (move_.pseudoLegal(board, mp.tableMove)) {
                if (mp.tableMove == 8116) { // TODO
                    throw `700ssss`;
                }
                return mp.tableMove;
            }
        /* falls through */
        case STAGE.GENERATE_NOISY:
            const moves: number[] = [];
            mp.noisySize = mp.split = move_.generateNoisy(board, moves)
            for (i = 0; i < mp.noisySize; i++) {
                mp.moves[i] = moves[i];
            }
            //mp.thread.searchInfo.stdoutFn(`GENERATE_NOISY ${mp.moves} ${mp.threshold} ${board_.boardToFen(board)}`)
            getCaptureHistories(mp);
            mp.stage = STAGE.GOOD_NOISY;
        /* falls through */
        case STAGE.GOOD_NOISY:

            // Check to see if there are still more noisy moves
            if (mp.noisySize) {
                // Grab the next best move index
                best = getBestMoveIndex(mp, 0, mp.noisySize);
                // Values below zero are flagged as failing an SEE (bad noisy)
                if (mp.values[best] >= 0) {

                    // Skip moves which fail to beat our SEE margin. We flag those moves
                    // as failed with the value (-1), and then repeat the selection process
                    //mp.thread.searchInfo.stdoutFn(`GOOD_NOISY ${mp.moves} ${mp.threshold} ${move_.moveToSmith(mp.moves[best])} ${board_.boardToFen(board)}`)
                    if (!search_.see(board, mp.moves[best], mp.threshold)) {
                        mp.values[best] = -1;
                        return selectNextMove(mp, board, skipQuiets);
                    }

                    // Reduce effective move list size
                    bestMove = popMove(mp, --mp.noisySize, 0, best);

                    // Don't play the table move twice
                    if (bestMove == mp.tableMove)
                        return selectNextMove(mp, board, skipQuiets);

                    // Don't play the refutation moves twice
                    if (bestMove == mp.killer1) mp.killer1 = move_.NO_MOVE;
                    if (bestMove == mp.killer2) mp.killer2 = move_.NO_MOVE;
                    if (bestMove == mp.counter) mp.counter = move_.NO_MOVE;

                    return bestMove;
                }
            }

            // Jump to bad noisy moves when skipping quiets
            if (skipQuiets) {
                mp.stage = STAGE.BAD_NOISY;
                return selectNextMove(mp, board, skipQuiets);
            }

            mp.stage = STAGE.KILLER_1;

        /* falls through */
        case STAGE.KILLER_1:
            // Play killer move if not yet played, and pseudo legal
            mp.stage = STAGE.KILLER_2;
            if (!skipQuiets
                && mp.killer1 != mp.tableMove
                && move_.pseudoLegal(board, mp.killer1)) {
                return mp.killer1;
            }

        /* falls through */
        case STAGE.KILLER_2:
            // Play killer move if not yet played, and pseudo legal
            mp.stage = STAGE.COUNTER_MOVE;
            if (!skipQuiets
                && mp.killer2 != mp.tableMove
                && move_.pseudoLegal(board, mp.killer2)) {
                return mp.killer2;
            }

        /* falls through */
        case STAGE.COUNTER_MOVE:
            // Play counter move if not yet played, and pseudo legal
            mp.stage = STAGE.GENERATE_QUIET;
            if (!skipQuiets
                && mp.counter != mp.tableMove
                && mp.counter != mp.killer1
                && mp.counter != mp.killer2
                && move_.pseudoLegal(board, mp.counter)) {
                return mp.counter;
            }

        /* falls through */
        case STAGE.GENERATE_QUIET:
            // Generate and evaluate all quiet moves when not skipping them
            if (!skipQuiets) {
                const moves: number[] = [];
                mp.noisySize = mp.split = move_.generateNoisy(board, moves)
                mp.quietSize = move_.generateQuiet(board, moves)
                for (i = 0, j = mp.split; i < mp.quietSize; i++, j++) {
                    mp.moves[j] = moves[i];
                }
                getHistoryScores(mp)
            }

            mp.stage = STAGE.QUIET;

        /* falls through */
        case STAGE.QUIET:
            // Check to see if there are still more quiet moves
            if (!skipQuiets && mp.quietSize) {

                // Select next best quiet and reduce the effective move list size
                best = getBestMoveIndex(mp, mp.split, mp.split + mp.quietSize) - mp.split;
                bestMove = popMove(mp, --mp.quietSize, mp.split, best);
                // Don't play a move more than once
                if (bestMove == mp.tableMove
                    || bestMove == mp.killer1
                    || bestMove == mp.killer2
                    || bestMove == mp.counter)
                    return selectNextMove(mp, board, skipQuiets);

                return bestMove;
            }

            // Out of quiet moves, only bad quiets remain
            mp.stage = STAGE.BAD_NOISY;

        /* falls through */
        case STAGE.BAD_NOISY:
            // Check to see if there are still more noisy moves
            if (mp.noisySize && mp.type != PICKER.NOISY) {

                // Reduce effective move list size
                bestMove = popMove(mp, --mp.noisySize, 0, 0);

                // Don't play a move more than once
                if (bestMove == mp.tableMove
                    || bestMove == mp.killer1
                    || bestMove == mp.killer2
                    || bestMove == mp.counter)
                    return selectNextMove(mp, board, skipQuiets);

                return bestMove;
            }

            mp.stage = STAGE.DONE;


        /* falls through */
        case STAGE.DONE:
            return move_.NO_MOVE;

        default:
            util_.ASSERT(false);
    }
}

export {
    movePicker_t,
    PICKER,
    STAGE,

    init,
    initNoisyMove,
    initMove,
    initSingular,
    getCaptureHistory,
    getHistory,
    updateKiller,
    updateCaptureHistories,
    updateHistoryHeuristics,

    selectNextMove,
}