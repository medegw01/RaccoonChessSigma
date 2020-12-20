// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from './board'
import * as util_ from '../util'

const knightDirection = [-8, -19, -21, -12, 8, 19, 21, 12];
const rookDirection = [-1, -10, 1, 10];
const bishopDirection = [-9, -11, 11, 9];
const kingDirection = [-1, -10, 1, 10, -9, -11, 11, 9];
/*
function pinnedDirection(color: board_.Colors, sq: board_.Squares, board: board_.board_t) {
    const pce = board.pieces[sq];
    let tmp_sq, tmp_pce;
    if (pce === board_.Pieces.EMPTY) return 0;
    const sign = (+(color === board_.Colors.WHITE) ^ +(util_.isWhitePiece[pce])) ? -1 : 1;
    const king_sq = board.kingSquare[color];
    const king_r = util_.ranksBoard[king_sq];
    const king_f = util_.filesBoard[king_sq];

    const pce_r = util_.ranksBoard[sq];
    const pce_f = util_.filesBoard[sq];

    if (sq === king_sq) return 0;
    function look(dir: number, rtn: number, pce_checker: boolean[]) {
        let seen = false;
        tmp_sq = king_sq + dir;
        while (board_.SQUARE_ON_BOARD(tmp_sq)) {
            tmp_pce = board.pieces[tmp_sq];
            if (tmp_pce !== board_.Pieces.EMPTY) {
                if (seen) {
                    if (pce_checker[tmp_pce] && (+(color === board_.Colors.WHITE) ^ +(util_.isWhitePiece[tmp_pce]))) return sign * rtn;
                    break;
                } else {
                    if (sq === tmp_sq) {
                        seen = true;
                    } else return 0;
                }
            }
            tmp_sq += dir;
        }
        return 0;
    }
    //-- horizontal return 1
    if (king_r === pce_r) {
        return look((pce_f > king_f) ? 1 : -1, 1, util_.isRookOrQueen);
    }
    //-- vertical return 3
    else if (king_f === pce_f) {
        return look((pce_r > king_r) ? 10 : -10, 3, util_.isRookOrQueen);
    }
    //-- top left to bottom right return 2
    else if ((king_f > pce_f && king_r < pce_r) || (king_f < pce_f && king_r > pce_r)) {
        return look((pce_f > king_f) ? -9 : 9, 2, util_.isBishopOrQueen);
    } else { //-- top-right to bottom-left return 4
        return look((pce_f > king_f) ? 11 : -11, 4, util_.isBishopOrQueen);
    }
}

function pinned(color: board_.Colors, sq: board_.Squares, board: board_.board_t) {
    if (board.pieces[sq] === board_.Pieces.EMPTY) return 0;
    return pinnedDirection(color, sq, board) > 0 ? 1 : 0;
}

function walker(color: board_.Colors, tmp_sq: board_.Squares, dir: number, mj_checker: boolean[], mn_checker: boolean[], board: board_.board_t, t_sq = board_.Squares.OFF_BOARD) {
    let pce, is_pinned;
    while (board_.SQUARE_ON_BOARD(tmp_sq)) {
        pce = board.pieces[tmp_sq];
        is_pinned = pinned(color, tmp_sq, board);
        if (pce === board_.Pieces.EMPTY) {
            tmp_sq += dir;
            continue;
        }

        else if (!mj_checker[pce] || (is_pinned || pinned(color ^ 1, tmp_sq, board))) {
            break;
        }
        else if (mn_checker[pce] && !(+(color === board_.Colors.WHITE) ^ +(util_.isWhitePiece[pce]))) {
            return (t_sq === board_.Squares.OFF_BOARD) ? +(!is_pinned) : +(!is_pinned && tmp_sq === t_sq);
        }
        tmp_sq += dir;
    }
    return 0;
}

function slide_attack(color: board_.Colors, sq: board_.Squares, mj_pce_check: boolean[], pce_check: boolean[], board: board_.board_t) {
    let v = 0;
    let tmp_sq, i;
    for (i = 0; i < 4; i++) {
        tmp_sq = sq + rookDirection[i];
        v += walker(color, tmp_sq, rookDirection[i], mj_pce_check, pce_check, board);
    }
    return v;
}
const DIR = {//-- white pov
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3,
    UP_LEFT: 4,
    UP_RIGHT: 5,
    DOWN_LEFT: 6,
    DOWN_RIGHT: 7,
    SAME: 8,
};

function getDirection(from: board_.Squares, to: board_.Squares) {
    const from_r = util_.ranksBoard[from];
    const from_f = util_.filesBoard[from];
    const to_f = util_.filesBoard[to];
    const to_r = util_.ranksBoard[to];
    if (from === to) return DIR.SAME;
    else if (from_r === to_r) return (from_f > to_f) ? DIR.LEFT : DIR.RIGHT;
    else if (from_f === to_f) return (from_r > to_r) ? DIR.DOWN : DIR.UP;
    else if (from_r > to_r) return (from_f > to_f) ? DIR.DOWN_LEFT : DIR.DOWN_RIGHT;
    return (from_f > to_f) ? DIR.UP_LEFT : DIR.UP_RIGHT;
}

function same_diagonal(a: board_.Squares, b: board_.Squares) {
    return Math.abs(util_.filesBoard[a] - util_.filesBoard[b]) === Math.abs(util_.ranksBoard[a] - util_.ranksBoard[b])
}
function diagonal_attack(color: board_.Colors, sq: board_.Squares, mj_pce_checker: boolean[], pce_checker: boolean[], board: board_.board_t) {
    let v = 0;
    let tmp_sq, i;
    for (i = 0; i < 8; i++) {
        tmp_sq = sq + bishopDirection[i];
        v += walker(color, tmp_sq, bishopDirection[i], mj_pce_checker, pce_checker, board);
    }
    return v;
}

function bishop_xray_attack(color: board_.Colors, sq: board_.Squares, board: board_.board_t, b_sq = board_.Squares.OFF_BOARD, xray = true) {
    const mj = (xray) ? util_.isBishopOrQueen : util_.isColorBishop[color];
    if (b_sq !== board_.Squares.OFF_BOARD) {//-- determine direction
        const b = (color === board_.Colors.WHITE) ? board_.Pieces.WHITEBISHOP : board_.Pieces.BLACKBISHOP;
        if (b !== board.pieces[b_sq]) return 0;
        const dir = getDirection(sq, b_sq);
        if (dir >= DIR.UP_LEFT && dir < DIR.SAME) {
            const dir_tmp = [9, 11, -11, -9][dir - 4];
            return (same_diagonal(sq, b_sq)) ? walker(color, sq + dir_tmp, dir_tmp, mj, util_.isBishop, board, b_sq) : 0;
        }
        return 0;
    }
    return diagonal_attack(color, sq, mj, util_.isBishop, board);
}

function rook_xray_attack(color: board_.Colors, sq: board_.Squares, board: board_.board_t, r_sq = board_.Squares.OFF_BOARD, xray = true) {
    const mj = (xray) ? util_.isRookOrQueen : util_.isColorRook[color];
    if (r_sq !== board_.Squares.OFF_BOARD) {
        const r = (color === board_.Colors.WHITE) ? board_.Pieces.WHITEROOK : board_.Pieces.BLACKROOK;
        if (r !== board.pieces[r_sq]) return 0;
        const dir = getDirection(sq, r_sq);
        if (dir < DIR.UP_LEFT) {
            const dir_tmp = [10, -10, -1, 1][dir];
            return walker(color, sq + dir_tmp, dir_tmp, mj, util_.is_rook, board, r_sq);
        }
        return 0;
    }
    return slide_attack(color, sq, mj, util_.is_rook, board);
}
function queen_attack(color: board_.Colors, sq: board_.Squares, board: board_.board_t, q_sq = board_.Squares.OFF_BOARD) {
    if (q_sq !== board_.Squares.OFF_BOARD) {//-- determine direction
        if (!util_.isColorQueen[color][board.pieces[q_sq]]) return 0;
        const dir = getDirection(sq, q_sq);
        let dir_tmp;
        if (dir >= DIR.UP_LEFT && dir < DIR.SAME) {
            dir_tmp = [9, 11, -11, -9][dir - 4];
            if (!same_diagonal(sq, q_sq)) return 0;
        }
        else dir_tmp = [10, -10, -1, 1][dir];
        return walker(color, sq + dir_tmp, dir_tmp, util_.isColorQueen[color], util_.isQueen, board, q_sq);
    }
    let v = 0;
    v += slide_attack(color, sq, util_.isColorQueen[color], util_.isQueen, board);
    v += diagonal_attack(color, sq, util_.isColorQueen[color], util_.isQueen, board);
    return v;
}

function knight_attack(color: board_.Colors, sq: board_.Squares, board: board_.board_t, kn_sq = board_.Squares.OFF_BOARD) {
    if (kn_sq !== board_.Squares.OFF_BOARD && !util_.isKnight[board.pieces[kn_sq]]) return 0;
    let v = 0;
    let pce, tmp_sq, i, is_pinned;
    for (i = 0; i < 8; i++) {
        tmp_sq = sq + knightDirection[i];
        pce = board.pieces[tmp_sq];
        is_pinned = pinned(color, tmp_sq, board);
        if (board_.SQUARE_ON_BOARD(tmp_sq)) {
            if (kn_sq !== board_.Squares.OFF_BOARD) {
                if (tmp_sq === kn_sq) return +(!is_pinned);
            }
            else {
                if (util_.isKnight[pce] && util_.getColorPiece[pce] === color) {
                    v += (is_pinned) ? 0 : 1;
                }
            }
        }
    }
    return (kn_sq === board_.Squares.OFF_BOARD) ? v : 0;
}

function pawn_attack(color: board_.Colors, sq: board_.Squares, board: board_.board_t, p_sq = board_.Squares.OFF_BOARD) {
    let v = 0;
    const pce = (color === board_.Colors.WHITE) ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN;
    const sg = (color === board_.Colors.WHITE) ? -1 : 1;
    if (p_sq !== board_.Squares.OFF_BOARD) {
        if (pce !== board.pieces[p_sq]) return 0;
        return +((p_sq === (sq + (sg * 11))) || (p_sq === (sq + (sg * 9))));
    }
    if (board.pieces[sq + (sg * 11)] === pce) v++;
    if (board.pieces[sq + (sg * 9)] === pce) v++;
    return v;
}
function king_attack(color: board_.Colors, sq: board_.Squares, board: board_.board_t, k_sq = board_.Squares.OFF_BOARD) {
    let tmp_sq, i, pce;
    let v = 0;
    const k = (color === board_.Colors.WHITE) ? board_.Pieces.WHITEKING : board_.Pieces.BLACKKING;
    if (k_sq !== board_.Squares.OFF_BOARD && (k !== board.pieces[k_sq])) return 0;
    for (i = 0; i < 8; i++) {
        tmp_sq = sq + kingDirection[i];
        pce = board.pieces[tmp_sq];
        if (board_.SQUARE_ON_BOARD(tmp_sq) && (tmp_sq === k_sq || k === pce)) return ++v;
    }
    return 0;
}


export function attack(square: board_.Squares, color: board_.Colors, board: board_.board_t): number {
    let v = 0;
    v += pawn_attack(color, square, board);
    v += king_attack(color, square, board);
    v += knight_attack(color, square, board);
    v += bishop_xray_attack(color, square, board);
    v += rook_xray_attack(color, square, board);
    v += queen_attack(color, square, board);
    return v;
}
*/
// function will be replaced by attack() WHEN attack is OPTIMIZED soon
export function isSquareAttacked(square: board_.Squares, turn: board_.Colors, board: board_.board_t): boolean {
    let piece, direction, tmp_square;
    // pawns
    if (turn === board_.Colors.WHITE) {
        if (board.pieces[square - 11] === board_.Pieces.WHITEPAWN || board.pieces[square - 9] === board_.Pieces.WHITEPAWN) {
            return true;
        }
    } else {
        if (board.pieces[square + 11] === board_.Pieces.BLACKPAWN || board.pieces[square + 9] === board_.Pieces.BLACKPAWN) {
            return true;
        }
    }
    // knight and king
    for (let i = 0; i < 8; i++) {
        // check knight
        piece = board.pieces[square + knightDirection[i]];
        if (piece !== board_.Pieces.OFF_BOARD_PIECE && util_.isKnight[piece] && util_.getColorPiece[piece] === turn) {
            return true;
        }
        // check king
        piece = board.pieces[square + kingDirection[i]];
        if (piece !== board_.Pieces.OFF_BOARD_PIECE && util_.isKing[piece] && util_.getColorPiece[piece] === turn) {
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
            while (piece !== board_.Pieces.OFF_BOARD_PIECE) {
                if (piece !== board_.Pieces.EMPTY) {
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
