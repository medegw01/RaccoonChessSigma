// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './board'
import * as attack_ from './attack'
import * as move_ from './move'

export function inCheck(board: board_.board_t): boolean {
    return (attack_.isSquareAttacked(board.kingSquare[board.turn], (board.turn) ^ 1, board))
}

export function inCheckmate(board: board_.board_t): boolean {
    const check = inCheck(board);
    const moves = move_.generateLegalMoves(board);
    return check && moves.length === 0;
}

export function inStalemate(board: board_.board_t): boolean {
    const check = inCheck(board);
    const moves = move_.generateLegalMoves(board);
    return !check && moves.length === 0;
}

export function inThreefoldRepetition(board: board_.board_t): boolean {
    let count = 0;
    for (let i = 0; i < board.historyPly; i++) {
        if (count >= 3) return true;
        if (board.currentPolyglotKey === board.moveHistory[i].currentPolyglotKey) count++;
    }
    return count >= 2;
}

export function insufficientMaterial(board: board_.board_t): boolean {
    if (board.numberPieces[board_.Pieces.WHITEPAWN] || board.numberPieces[board_.Pieces.BLACKPAWN]) return false;
    if (board.numberPieces[board_.Pieces.WHITEQUEEN] || board.numberPieces[board_.Pieces.BLACKQUEEN]
        || board.numberPieces[board_.Pieces.WHITEROOK] || board.numberPieces[board_.Pieces.BLACKROOK]) return false;
    if (board.numberPieces[board_.Pieces.WHITEBISHOP] > 1 || board.numberPieces[board_.Pieces.BLACKBISHOP] > 1) return false;
    if (board.numberPieces[board_.Pieces.WHITEKNIGHT] > 1 || board.numberPieces[board_.Pieces.BLACKKNIGHT] > 1) return false;
    if (board.numberPieces[board_.Pieces.WHITEKNIGHT] && board.numberPieces[board_.Pieces.WHITEBISHOP]) return false;
    if (board.numberPieces[board_.Pieces.BLACKBISHOP] && board.numberPieces[board_.Pieces.BLACKKNIGHT]) return false;
    return true;
}

export function inDraw(board: board_.board_t): boolean {
    const is_50Move = (board.halfMoves >= 100 && board.ply !== 0);
    return is_50Move || insufficientMaterial(board) || inThreefoldRepetition(board) || inStalemate(board);
}

export function gameOver(board: board_.board_t): boolean {
    return inCheckmate(board) || inDraw(board);
}
