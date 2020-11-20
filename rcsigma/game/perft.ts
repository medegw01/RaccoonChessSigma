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
