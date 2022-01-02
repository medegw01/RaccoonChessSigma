// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './board'
import * as bitboard_ from './bitboard'
import * as util_ from '../util'

const knightDirection = [-8, -19, -21, -12, 8, 19, 21, 12];
const rookDirection = [-1, -10, 1, 10];
const bishopDirection = [-9, -11, 11, 9];
const kingDirection = [-1, -10, 1, 10, -9, -11, 11, 9];

// function will be replaced by attack() WHEN attack is OPTIMIZED soon
function isSquareAttacked(square: util_.Squares, turn: util_.Colors, board: board_.board_t): boolean {
    let piece, direction, tmp_square;
    // pawns
    if (turn === util_.Colors.WHITE) {
        if (board.pieces[square - 11] === util_.Pieces.WHITEPAWN || board.pieces[square - 9] === util_.Pieces.WHITEPAWN) {
            return true;
        }
    } else {
        if (board.pieces[square + 11] === util_.Pieces.BLACKPAWN || board.pieces[square + 9] === util_.Pieces.BLACKPAWN) {
            return true;
        }
    }
    // knight and king
    for (let i = 0; i < 8; i++) {
        // check knight
        piece = board.pieces[square + knightDirection[i]];
        if (piece !== util_.Pieces.OFF_BOARD_PIECE && util_.isKnight[piece] && util_.getColorPiece[piece] === turn) {
            return true;
        }
        // check king
        piece = board.pieces[square + kingDirection[i]];
        if (piece !== util_.Pieces.OFF_BOARD_PIECE && util_.isKing[piece] && util_.getColorPiece[piece] === turn) {
            return true;
        }
    }

    for (let v = 0; v < 2; v++) {
        let direction_, isPiece;
        if (v === 0) { //rooks and queen
            direction_ = rookDirection;
            isPiece = util_.isRookOrQueen;
        }
        else {
            direction_ = bishopDirection;
            isPiece = util_.isBishopOrQueen;
        }
        for (let i = 0; i < 4; i++) {
            direction = direction_[i];
            tmp_square = square + direction;
            piece = board.pieces[tmp_square];
            while (piece !== util_.Pieces.OFF_BOARD_PIECE) {
                if (piece !== util_.Pieces.EMPTY) {
                    if (isPiece[piece] && (util_.getColorPiece[piece] === turn)) {
                        return true;
                    }
                    break;
                }
                tmp_square += direction;
                piece = board.pieces[tmp_square];
            }
        }
    }
    return false;
}


function allAttackersToSquare(board: board_.board_t, occupied: bitboard_.bitboard_t, sq64: number): bitboard_.bitboard_t {
    return (bitboard_.pawnAttacks(util_.Colors.WHITE, sq64) & board.piecesBB[util_.Pieces.BLACKPAWN])
        | (bitboard_.pawnAttacks(util_.Colors.BLACK, sq64) & board.piecesBB[util_.Pieces.WHITEPAWN])
        | (bitboard_.knightAttacks(sq64) & (board.piecesBB[util_.Pieces.BLACKKNIGHT] | board.piecesBB[util_.Pieces.WHITEKNIGHT]))
        | (bitboard_.bishopAttacks(sq64, occupied) & (board.piecesBB[util_.Pieces.BLACKBISHOP] | board.piecesBB[util_.Pieces.WHITEBISHOP]
            | board.piecesBB[util_.Pieces.WHITEQUEEN] | board.piecesBB[util_.Pieces.BLACKQUEEN]))
        | (bitboard_.rookAttacks(sq64, occupied) & (board.piecesBB[util_.Pieces.BLACKROOK] | board.piecesBB[util_.Pieces.WHITEROOK]
            | board.piecesBB[util_.Pieces.WHITEQUEEN] | board.piecesBB[util_.Pieces.BLACKQUEEN]))
        | (bitboard_.kingAttacks(sq64) & (board.piecesBB[util_.Pieces.BLACKKING] | board.piecesBB[util_.Pieces.WHITEKING]));
}

function squareIsAttacked(sq64: number, turn: util_.Colors, board: board_.board_t): bitboard_.bitboard_t {
    const occupied = board_.getPieces(turn, board) | board_.getPieces(turn ^ 1, board);
    const enemyPawns = board.piecesBB[util_.ptToP(turn ^ 1, util_.PieceType.PAWN)];
    const enemyKnights = board.piecesBB[util_.ptToP(turn ^ 1, util_.PieceType.KNIGHT)];
    const enemyBishops = board.piecesBB[util_.ptToP(turn ^ 1, util_.PieceType.BISHOP)] | board.piecesBB[util_.ptToP(turn ^ 1, util_.PieceType.QUEEN)];
    const enemyRooks = board.piecesBB[util_.ptToP(turn ^ 1, util_.PieceType.ROOK)] | board.piecesBB[util_.ptToP(turn ^ 1, util_.PieceType.QUEEN)];
    const enemyKings = board.piecesBB[util_.ptToP(turn ^ 1, util_.PieceType.KING)];

    return (bitboard_.pawnAttacks(turn, sq64) & enemyPawns)
        || (bitboard_.knightAttacks(sq64) & enemyKnights)
        || (enemyBishops && (bitboard_.bishopAttacks(sq64, occupied) & enemyBishops))
        || (enemyRooks && (bitboard_.rookAttacks(sq64, occupied) & enemyRooks))
        || (bitboard_.kingAttacks(sq64) & enemyKings);
}

export {
    isSquareAttacked,
    squareIsAttacked,
    allAttackersToSquare
}
