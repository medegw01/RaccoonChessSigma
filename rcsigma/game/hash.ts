// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './board'
import * as bitboard_ from './bitboard'
import * as util_ from '../util'

function pawnCP(board: board_.board_t): boolean {
    let sqWithPawn = 0;
    const targetPce = (board.turn === util_.Colors.WHITE) ? util_.Pieces.WHITEPAWN : util_.Pieces.BLACKPAWN;
    if (board.enpassant !== util_.Squares.OFF_SQUARE) {
        if (board.turn === util_.Colors.WHITE) {
            sqWithPawn = board.enpassant - 10;
        } else {
            sqWithPawn = Number(board.enpassant) + 10;
        }

        if (board.pieces[sqWithPawn + 1] === targetPce || board.pieces[sqWithPawn - 1] === targetPce) {
            return true;
        }
    }
    return false;
}

function polyglotKey(board: board_.board_t): bitboard_.bitboard_t {
    let sq, rank = 0, file = 0;
    let finalKey = 0n, piece = util_.Pieces.EMPTY, polyPiece = 0;

    for (sq = 0; sq < util_.BOARD_SQUARE_NUM; ++sq) {
        piece = board.pieces[sq];
        if (util_.SQUARE_ON_BOARD(sq) && piece !== util_.Pieces.EMPTY) {
            polyPiece = util_.getPolyPiece[piece];
            rank = util_.ranksBoard[sq];
            file = util_.filesBoard[sq];
            finalKey ^= util_.random64Poly[util_.randomPiece + (64 * polyPiece) + (8 * rank) + file];
        }
    }

    // castling
    if (board.castlingRight & util_.Castling.WHITE_CASTLE_OO) finalKey ^= util_.random64Poly[util_.randomCastle + 0];
    if (board.castlingRight & util_.Castling.WHITE_CASTLE_OOO) finalKey ^= util_.random64Poly[util_.randomCastle + 1];
    if (board.castlingRight & util_.Castling.BLACK_CASTLE_OO) finalKey ^= util_.random64Poly[util_.randomCastle + 2];
    if (board.castlingRight & util_.Castling.BLACK_CASTLE_OOO) finalKey ^= util_.random64Poly[util_.randomCastle + 3];

    // enpassant
    if (pawnCP(board)) {
        file = util_.filesBoard[board.enpassant];
        finalKey ^= util_.random64Poly[util_.randomEnpass + file];
    }

    if (board.turn === util_.Colors.WHITE) {
        finalKey ^= util_.random64Poly[util_.randomTurn];
    }
    return finalKey;
}

export {

    polyglotKey
}