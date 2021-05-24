// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as board_ from './board'
import * as attack_ from './attack'
import * as move_ from './move'
import * as thread_ from '../search/thread'

function inCheck(board: board_.board_t): boolean {
    return (attack_.isSquareAttacked(board.kingSquare[board.turn], (board.turn) ^ 1, board))
}

function inCheckmate(board: board_.board_t): boolean {
    const check = inCheck(board);
    const moves = move_.generateLegalMoves(board);
    return check && moves.length === 0;
}

function inStalemate(board: board_.board_t): boolean {
    const check = inCheck(board);
    const moves = move_.generateLegalMoves(board);
    return !check && moves.length === 0;
}

function inThreefoldRepetition(board: board_.board_t, thread: thread_.thread_t): boolean {
    let count = 0;
    for (let i = 0; i < thread.height && count < 2; i++) {
        if (board.currentPolyglotKey === thread.undoStack[i].currentPolyglotKey) count++;
    }
    return count >= 2;
}

function insufficientMaterial(board: board_.board_t): boolean {
    if (board.numberPieces[util_.Pieces.WHITEPAWN] || board.numberPieces[util_.Pieces.BLACKPAWN]) return false;
    if (board.numberPieces[util_.Pieces.WHITEQUEEN] || board.numberPieces[util_.Pieces.BLACKQUEEN]
        || board.numberPieces[util_.Pieces.WHITEROOK] || board.numberPieces[util_.Pieces.BLACKROOK]) return false;
    if (board.numberPieces[util_.Pieces.WHITEBISHOP] > 1 || board.numberPieces[util_.Pieces.BLACKBISHOP] > 1) return false;
    if (board.numberPieces[util_.Pieces.WHITEKNIGHT] > 1 || board.numberPieces[util_.Pieces.BLACKKNIGHT] > 1) return false;
    if (board.numberPieces[util_.Pieces.WHITEKNIGHT] && board.numberPieces[util_.Pieces.WHITEBISHOP]) return false;
    if (board.numberPieces[util_.Pieces.BLACKBISHOP] && board.numberPieces[util_.Pieces.BLACKKNIGHT]) return false;
    return true;
}

function inDraw(board: board_.board_t, thread: thread_.thread_t): boolean {
    const is_50Move = (board.halfMoves >= 100 && board.ply !== 0);
    return is_50Move || insufficientMaterial(board) || inThreefoldRepetition(board, thread) || inStalemate(board);
}

function gameOver(board: board_.board_t, thread: thread_.thread_t): boolean {
    return inCheckmate(board) || inDraw(board, thread);
}

export {
    gameOver,
    inDraw,
    insufficientMaterial,
    inThreefoldRepetition,
    inStalemate,
    inCheckmate,
    inCheck,
}

