// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './board'
import * as move_ from './move'
import * as thread_ from '../search/thread'

/*****************************************************************************
 * PERFT -- debugging
 ****************************************************************************/
function perft(depth: number, board: board_.board_t, thread: thread_.thread_t): bigint {
    let nodes = 0n;
    if (depth === 0) return 1n;

    const moves = move_.generateLegalMoves(board);
    for (const move of moves) {
        move_.makeMove(move, board, thread);
        nodes += perft(depth - 1, board, thread);
        move_.takeMove(board, thread);
    }
    return nodes;
}

export {
    perft,
}
