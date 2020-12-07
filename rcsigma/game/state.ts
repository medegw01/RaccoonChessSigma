// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './board'
import * as attack_ from './attack'
import * as move_ from './move'

export function in_check(board: board_.board_t): boolean {
    return (attack_.is_square_attacked(board.king_square[board.turn], (board.turn) ^ 1, board))
}

export function in_checkmate(board: board_.board_t): boolean {
    const check = in_check(board);
    const moves = move_.generate_legal_moves(board);
    return check && moves.length === 0;
}

export function in_stalemate(board: board_.board_t): boolean {
    const check = in_check(board);
    const moves = move_.generate_legal_moves(board);
    return !check && moves.length === 0;
}

export function in_threefold_repetition(board: board_.board_t): boolean {
    let count = 0;
    for (let i = 0; i < board.history_ply; i++) {
        if (count >= 3) return true;
        if (board.current_polyglot_key === board.move_history[i].current_polyglot_key) count++;
    }
    return count >= 2;
}

export function insufficient_material(board: board_.board_t): boolean {
    if (board.number_pieces[board_.PIECES.WHITEPAWN] || board.number_pieces[board_.PIECES.BLACKPAWN]) return false;
    if (board.number_pieces[board_.PIECES.WHITEQUEEN] || board.number_pieces[board_.PIECES.BLACKQUEEN]
        || board.number_pieces[board_.PIECES.WHITEROOK] || board.number_pieces[board_.PIECES.BLACKROOK]) return false;
    if (board.number_pieces[board_.PIECES.WHITEBISHOP] > 1 || board.number_pieces[board_.PIECES.BLACKBISHOP] > 1) return false;
    if (board.number_pieces[board_.PIECES.WHITEKNIGHT] > 1 || board.number_pieces[board_.PIECES.BLACKKNIGHT] > 1) return false;
    if (board.number_pieces[board_.PIECES.WHITEKNIGHT] && board.number_pieces[board_.PIECES.WHITEBISHOP]) return false;
    if (board.number_pieces[board_.PIECES.BLACKBISHOP] && board.number_pieces[board_.PIECES.BLACKKNIGHT]) return false;
    return true;
}

export function in_draw(board: board_.board_t): boolean {
    const is_50_move = (board.half_moves >= 100 && board.ply !== 0);
    return is_50_move || insufficient_material(board) || in_threefold_repetition(board);
}
