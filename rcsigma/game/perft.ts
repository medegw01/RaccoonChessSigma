import * as board_ from './board'
import * as move_ from './move'

/*****************************************************************************
 * PERFT -- debugging
 ****************************************************************************/
export function perft(depth: number, board: board_.board_t) {
    let moves;
    let nodes = 0n;

    if (depth === 0) return 1n;

    moves = move_.generate_legal_moves(board);
    let move: move_.move_score_t;
    for (move of moves) {
        move_.make_move(move.move, board);
        nodes += perft(depth - 1, board);
        move_.take_move(board);
    }
    return nodes;
}

export function perft_summary(depth: number, board: board_.board_t) {
    console.log("About to start perf testing, with depth: " + depth.toString());
    let node = 0n;
    let ind = 0;

    let moves = move_.generate_legal_moves(board);
    for (let i = 0; i < moves.length; i++) {
        let move = moves[i].move;
        if (!move_.make_move(move, board)) {
            continue;
        }
        ind++;
        let tmp = node;
        node += perft(depth - 1, board);
        move_.take_move(board);
        console.log("move: " + ind.toString() + ' ' + move_.move_to_smith(move) + ' ' + (node - tmp).toString());
    }
    console.log("Total nodes: " + node.toString());
    return node;
}
