function in_check(board: board_t) {
    return (is_square_attacked(board.king_square[board.turn], (board.turn) ^ 1, board))
}
function in_checkmate(board: board_t) {
    let check = in_check(board);
    let moves = generate_legal_moves(board);
    return check && moves.length === 0;
}
function in_stalemate(board: board_t) {
    let check = in_check(board);
    let moves = generate_legal_moves(board);
    return !check && moves.length === 0;
}
function in_threefold_repetition(board: board_t) {
    let count = 0;
    for (let i = 0; i < board.history_ply; i++) {
        if (count >= 3) return true;
        if (board.current_polyglot_key === board.move_history[i].current_polyglot_key) count++;
    }
    return count >= 2;
}
function insufficient_material(board: board_t) {
    if (board.number_pieces[PIECES.WHITEPAWN] || board.number_pieces[PIECES.BLACKPAWN]) return false;
    if (board.number_pieces[PIECES.WHITEQUEEN] || board.number_pieces[PIECES.BLACKQUEEN]
        || board.number_pieces[PIECES.WHITEROOK] || board.number_pieces[PIECES.BLACKROOK]) return false;
    if (board.number_pieces[PIECES.WHITEBISHOP] > 1 || board.number_pieces[PIECES.BLACKBISHOP] > 1) return false;
    if (board.number_pieces[PIECES.WHITEKNIGHT] > 1 || board.number_pieces[PIECES.BLACKKNIGHT] > 1) return false;
    if (board.number_pieces[PIECES.WHITEKNIGHT] && board.number_pieces[PIECES.WHITEBISHOP]) return false;
    if (board.number_pieces[PIECES.BLACKBISHOP] && board.number_pieces[PIECES.BLACKKNIGHT]) return false;
    return true;
}
function in_draw(board: board_t) {
    let is_50_move = (board.half_moves >= 100 && board.ply);
    return is_50_move || insufficient_material(board) || in_threefold_repetition(board);
}
