/*****************************************************************************
 * PERFT -- debugging
 ****************************************************************************/
function perft(depth: number, board: board_t) {
    let moves;
    let nodes = 0n;

    if (depth === 0) return 1n;

    moves = generate_legal_moves(board);
    let move: move_score_t;
    for (move of moves) {
        make_move(move.move, board);
        nodes += perft(depth - 1, board);
        take_move(board);
    }
    return nodes;
}

function perft_summary(depth: number, board: board_t) {
    console.log("About to start perf testing, with depth: " + depth.toString());
    let node = 0n;
    let ind = 0;

    let moves = generate_legal_moves(board);
    for (let i = 0; i < moves.length; i++) {
        let move = moves[i].move;
        if (!make_move(move, board)) {
            continue;
        }
        ind++;
        let tmp = node;
        node += perft(depth - 1, board);
        take_move(board);
        console.log("move: " + ind.toString() + ' ' + move_to_smith(move) + ' ' + (node - tmp).toString());
    }
    console.log("Total nodes: " + node.toString());
    return node;
}
