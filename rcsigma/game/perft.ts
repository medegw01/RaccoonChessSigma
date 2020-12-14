// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './board'
import * as move_ from './move'

/*****************************************************************************
 * PERFT -- debugging
 ****************************************************************************/
export function perft(depth: number, board: board_.board_t): bigint {
    let nodes = 0n;

    if (depth === 0) return 1n;

    const moves = move_.generate_legal_moves(board);
    for (const move of moves) {
        move_.make_move(move.move, board);
        nodes += perft(depth - 1, board);
        move_.take_move(board);
    }
    return nodes;
}
