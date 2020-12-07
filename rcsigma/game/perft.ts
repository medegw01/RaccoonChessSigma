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

export function perft_summary(depth: number, board: board_.board_t): bigint {
    console.log("About to start perf testing, with depth: " + depth.toString());
    let node = 0n;
    let ind = 0;

    const moves = move_.generate_legal_moves(board);
    for (let i = 0; i < moves.length; i++) {
        const move = moves[i].move;
        if (!move_.make_move(move, board)) {
            continue;
        }
        ind++;
        const tmp = node;
        node += perft(depth - 1, board);
        move_.take_move(board);
        console.log("move: " + ind.toString() + ' ' + move_.move_to_smith(move) + ' ' + (node - tmp).toString());
    }
    console.log("Total nodes: " + node.toString());
    return node;
}
