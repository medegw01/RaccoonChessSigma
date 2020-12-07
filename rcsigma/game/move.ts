// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as board_ from './board'
import * as state_ from './state'
import * as hash_ from './hash'
import * as attack_ from './attack'

export type move_t = number

export type move_score_t = {
    move: move_t;
    score: number;
}

export type verbose_move_t = {
    from: string;
    to: string;
    color: string;
    pieces: string;
    flag: string;
    san: string;
    captured?: string;
    promoted?: string;
}

const MOVE_FLAG = {
    ENPASS: 0x40000,
    PAWN_START: 0x80000,
    CASTLE: 0x1000000,
    CAPTURED: 0x7C000,
    PROMOTED: 0xF00000,
};

export const NO_MOVE: move_t = 0;
const CAPTURE_BONUS = 1000000;
const ENPASS_BONUS = 105;
const number_directions = [0, 0, 4, 8, 4, 8, 8, 0, 4, 8, 4, 8, 8];
const slider = [
    board_.PIECES.WHITEBISHOP, board_.PIECES.WHITEROOK, board_.PIECES.WHITEQUEEN, -1, board_.PIECES.BLACKBISHOP,
    board_.PIECES.BLACKROOK, board_.PIECES.BLACKQUEEN, -1
];
const nonslider = [board_.PIECES.WHITEKNIGHT, board_.PIECES.WHITEKING, -1, board_.PIECES.BLACKKNIGHT, board_.PIECES.BLACKKING, -1];
const pieces_directions = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [-9, -11, 11, 9, 0, 0, 0, 0],
    [-8, -19, -21, -12, 8, 19, 21, 12],
    [-1, -10, 1, 10, 0, 0, 0, 0],
    [-1, -10, 1, 10, -9, -11, 11, 9],
    [-1, -10, 1, 10, -9, -11, 11, 9],
    [0, 0, 0, 0, 0, 0, 0],
    [-9, -11, 11, 9, 0, 0, 0, 0],
    [-8, -19, -21, -12, 8, 19, 21, 12],
    [-1, -10, 1, 10, 0, 0, 0, 0],
    [-1, -10, 1, 10, -9, -11, 11, 9],
    [-1, -10, 1, 10, -9, -11, 11, 9],
];

/*****************************************************************************
 * MACRO
 ****************************************************************************/
function MOVE(from: board_.SQUARES, to: board_.SQUARES, cap: board_.PIECES, prom: board_.PIECES, flag: number) { return ((from) | (to << 7) | (cap << 14) | (prom << 20) | (flag)); }
function FROM_SQUARE(move: move_t) { return ((move) & 0x7F); }
function TO_SQUARE(move: move_t) { return (((move) >> 7) & 0x7F); }
function CAPTURED(move: move_t) { return (((move) >> 14) & 0xF); }
function PROMOTED(move: move_t) { return (((move) >> 20) & 0xF); }

/*****************************************************************************
 * MOVE PARSER
****************************************************************************/
export function smith_to_move(smith: string, board: board_.board_t): move_t {
    const cleaned_smith = clean_smith(smith);
    if (cleaned_smith[1].charCodeAt(0) > '8'.charCodeAt(0) || cleaned_smith[1].charCodeAt(0) < '1'.charCodeAt(0)) return NO_MOVE;
    if (cleaned_smith[3].charCodeAt(0) > '8'.charCodeAt(0) || cleaned_smith[3].charCodeAt(0) < '1'.charCodeAt(0)) return NO_MOVE;
    if (cleaned_smith[0].charCodeAt(0) > 'h'.charCodeAt(0) || cleaned_smith[0].charCodeAt(0) < 'a'.charCodeAt(0)) return NO_MOVE;
    if (cleaned_smith[2].charCodeAt(0) > 'h'.charCodeAt(0) || cleaned_smith[2].charCodeAt(0) < 'a'.charCodeAt(0)) return NO_MOVE;

    const from = board_.FILE_RANK_TO_SQUARE(smith[0].charCodeAt(0) - 'a'.charCodeAt(0), smith[1].charCodeAt(0) - '1'.charCodeAt(0));
    const to = board_.FILE_RANK_TO_SQUARE(smith[2].charCodeAt(0) - 'a'.charCodeAt(0), smith[3].charCodeAt(0) - '1'.charCodeAt(0));

    if (board_.SQUARE_ON_BOARD(from) && board_.SQUARE_ON_BOARD(to)) {
        const moves = generate_legal_moves(board);
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i].move;
            if (FROM_SQUARE(move) === from && TO_SQUARE(move) === to) {
                const promotion_piece = PROMOTED(move);
                if (promotion_piece !== board_.PIECES.EMPTY) {
                    if ((smith[4] === (util_.piece_to_ascii[promotion_piece]).toLowerCase())
                        || (smith[4] === (util_.piece_to_ascii[promotion_piece]).toUpperCase())) {
                        return move;
                    }
                    continue;
                }
                return move;
            }
        }
    }
    return NO_MOVE;
}

export function move_to_smith(move: move_t): string {
    if (move != NO_MOVE) {


        const file_from = util_.files_board[FROM_SQUARE(move)];
        const rank_from = util_.ranks_board[FROM_SQUARE(move)];

        const file_to = util_.files_board[TO_SQUARE(move)];
        const rank_to = util_.ranks_board[TO_SQUARE(move)];

        const promoted = PROMOTED(move);
        let rlt = (String.fromCharCode('a'.charCodeAt(0) + file_from) + String.fromCharCode('1'.charCodeAt(0)
            + rank_from) + String.fromCharCode('a'.charCodeAt(0) + file_to) + String.fromCharCode('1'.charCodeAt(0)
                + rank_to)
        );
        if (promoted) {
            let tmp = 'q';
            if (util_.is_knight[promoted]) {
                tmp = 'n';
            } else if (util_.is_rook_or_queen[promoted] && !util_.is_bishop_or_queen[promoted]) {
                tmp = 'r';
            } else if (!util_.is_rook_or_queen[promoted] && util_.is_bishop_or_queen[promoted]) {
                tmp = 'b';
            }
            rlt += tmp;
        }
        return rlt;
    }
    return "";

}

export function move_to_verbose_move(move: move_t, board: board_.board_t, move_already_made = false): verbose_move_t {
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);
    const rlt = {} as verbose_move_t;
    rlt.from = board_.square_to_algebraic(from);
    rlt.to = board_.square_to_algebraic(to);
    rlt.color = "wb-"[board.turn];
    rlt.pieces = (util_.piece_to_ascii[board.pieces[from]]).toLowerCase();
    if ((move & MOVE_FLAG.CAPTURED) !== 0 && (move & MOVE_FLAG.PROMOTED) !== 0) {
        rlt.flag = 'pc';
        rlt.captured = (util_.piece_to_ascii[CAPTURED(move)]).toLowerCase();
        rlt.promoted = (util_.piece_to_ascii[PROMOTED(move)]).toLowerCase();
    }
    else if ((move & MOVE_FLAG.CAPTURED) !== 0) {
        rlt.flag = 'c';
        rlt.captured = (util_.piece_to_ascii[CAPTURED(move)]).toLowerCase();
    }
    else if ((move & MOVE_FLAG.PROMOTED) !== 0) {
        rlt.flag = 'p';
        rlt.promoted = (util_.piece_to_ascii[PROMOTED(move)]).toLowerCase();
    }
    else if ((move & MOVE_FLAG.ENPASS) !== 0) {
        rlt.flag = 'e';
    }
    else if ((move & MOVE_FLAG.CASTLE) !== 0) {
        if (to === board_.SQUARES.G8 || to === board_.SQUARES.G1) {
            rlt.flag = 'k';
        }
        else {
            rlt.flag = 'q';
        }
    }
    else if ((move & MOVE_FLAG.PAWN_START) !== 0) {
        rlt.flag = 'b';
    }
    else {
        rlt.flag = 'n'
    }

    rlt.san = move_to_san(move, board, move_already_made);
    return rlt
}

function disambiguator(move: move_t, board: board_.board_t) {
    let diamb = "";

    const moves = generate_all_moves(board);

    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);
    const piece = board.pieces[from];

    let ambiguities = 0;
    let same_rank = 0;
    let same_file = 0;

    let i, tmp_move, tmp_from, tmp_to, tmp_piece;

    for (i = 0; i < moves.length; ++i) {
        tmp_move = moves[i].move;
        tmp_from = FROM_SQUARE(tmp_move);
        tmp_to = TO_SQUARE(tmp_move);
        tmp_piece = board.pieces[tmp_from];

        //-- http://cfajohnson.com/chess/SAN/
        if (piece === tmp_piece && from !== tmp_from && to === tmp_to) {
            ambiguities++;
            if (util_.ranks_board[from] === util_.ranks_board[tmp_from]) same_rank++;
            if (util_.files_board[from] === util_.files_board[tmp_from]) same_file++;
        }
    }
    if (ambiguities > 0) {
        /*
         * Examples:
            a. There are two knights, on the squares g1 and e1, and one of them
               moves to the square f3: either Ngf3 or Nef3, as the case may be.
            b. There are two knights, on the squares g5 and g1, and one of them
               moves to the square f3: either N5f3 or N1f3, as the case may be.
            c. There are two knights, on the squares h2 and d4, and one of them
               moves to the square f3: either Nhf3 or Ndf3, as the case may be.
            d. If a capture takes place on the square f3, the notation of the
               previous examples is still applicable, but an x may be inserted: 1)
               either Ngxf3 or Nexf3, 2) either N5xf3 or N1xf3, 3) either Nhxf3 or
              Ndxf3, as the case may be.
         */
        if (same_rank > 0 && same_file > 0) {
            diamb += board_.square_to_algebraic(FROM_SQUARE(move));
        }
        else if (same_file > 0) {
            diamb += board_.square_to_algebraic(from).charAt(1);
        }
        else {
            diamb += board_.square_to_algebraic(from).charAt(0);
        }
    }
    return diamb;
}

export function move_to_san(move: move_t, board: board_.board_t, move_already_made = false): string {
    let san = "";
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    if (board_.SQUARE_ON_BOARD(from) && board_.SQUARE_ON_BOARD(to)) {
        if ((move & MOVE_FLAG.CASTLE) !== 0) {//--castling move
            switch (to) {
                case board_.SQUARES.C1:
                    san = "O-O-O";
                    break;
                case board_.SQUARES.C8:
                    san = "O-O-O";
                    break;
                case board_.SQUARES.G1:
                    san = "O-O";
                    break;
                case board_.SQUARES.G8:
                    san = "O-O";
                    break;
                default: break;
            }
        } else {
            const diam = disambiguator(move, board);
            if (!util_.is_pawn[board.pieces[from]]) {
                san += (util_.piece_to_ascii[board.pieces[from]]).toUpperCase();
                san += diam;
            }
            if ((move & (MOVE_FLAG.CAPTURED | MOVE_FLAG.ENPASS)) !== 0) {
                if (util_.is_pawn[board.pieces[from]]) {
                    san += String.fromCharCode('a'.charCodeAt(0) + util_.files_board[from]);
                }
                san += 'x';
            }
            san += board_.square_to_algebraic(to);
            if ((move & MOVE_FLAG.PROMOTED) !== 0) {
                san += '=';
                san += (util_.piece_to_ascii[PROMOTED(move)]).toLowerCase();
            }

            const check_addOn = function () {
                const check = state_.in_check(board);
                if (state_.in_checkmate(board)) {
                    san += "#";
                }
                else if (check) {
                    san += "+";
                }
                if (!check && ((move & MOVE_FLAG.ENPASS) !== 0)) {
                    san += " e.p.";
                }
            }
            if (!move_already_made && make_move(move, board)) {
                check_addOn();
                take_move(board);
            } else {
                check_addOn();
            }

        }

    }
    return san;
}

export function san_to_move(san: string, board: board_.board_t): number {
    const cleaned_san = stripped_san(san);
    const legal = generate_legal_moves(board);
    let move: move_score_t;
    for (move of legal) {
        if (cleaned_san == move_to_san(move.move, board, false)) return move.move;
    }
    return NO_MOVE;
}

function stripped_san(move: string): string {
    return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '')
}

function clean_smith(smith: string): string {
    let rlt = "";
    const pattern = /([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/;
    const matches = pattern.exec(smith);
    if (matches) {
        //let piece = matches[1];
        const from = matches[2];
        const to = matches[3];
        const promotion = matches[4];
        rlt += (from + to);
        if (typeof promotion !== 'undefined') rlt += promotion;
    }
    return rlt;
}

/*****************************************************************************
* MOVE GENERATION
****************************************************************************/
function add_quiet_move(move: move_t, moves: move_score_t[]) {
    moves.push({ move: move, score: 0 });
}
function add_capture_move(move: move_t, moves: move_score_t[]) {
    moves.push({ move: move, score: CAPTURE_BONUS });
}
function add_enpassant_move(move: move_t, moves: move_score_t[]) {
    const score = ENPASS_BONUS + CAPTURE_BONUS;
    moves.push({ move: move, score: score });
}
function add_white_pawn_capture_move(from: board_.SQUARES, to: board_.SQUARES, cap: board_.PIECES, moves: move_score_t[]) {
    if (util_.ranks_board[from] == board_.RANKS.SEVENTH_RANK) {
        add_capture_move(MOVE(from, to, cap, board_.PIECES.WHITEQUEEN, 0), moves);
        add_capture_move(MOVE(from, to, cap, board_.PIECES.WHITEROOK, 0), moves);
        add_capture_move(MOVE(from, to, cap, board_.PIECES.WHITEBISHOP, 0), moves);
        add_capture_move(MOVE(from, to, cap, board_.PIECES.WHITEKNIGHT, 0), moves);
    }
    else {
        add_capture_move(MOVE(from, to, cap, board_.PIECES.EMPTY, 0), moves);
    }
}
function add_white_pawn_move(from: board_.SQUARES, to: board_.SQUARES, moves: move_score_t[]) {
    if (util_.ranks_board[from] == board_.RANKS.SEVENTH_RANK) {
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.WHITEQUEEN, 0), moves);
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.WHITEROOK, 0), moves);
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.WHITEBISHOP, 0), moves);
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.WHITEKNIGHT, 0), moves);
    }
    else {
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.EMPTY, 0), moves);
    }
}
function add_black_pawn_capture_move(from: board_.SQUARES, to: board_.SQUARES, cap: board_.PIECES, moves: move_score_t[]) {
    if (util_.ranks_board[from] === board_.RANKS.SECOND_RANK) {
        add_capture_move(MOVE(from, to, cap, board_.PIECES.BLACKQUEEN, 0), moves);
        add_capture_move(MOVE(from, to, cap, board_.PIECES.BLACKROOK, 0), moves);
        add_capture_move(MOVE(from, to, cap, board_.PIECES.BLACKBISHOP, 0), moves);
        add_capture_move(MOVE(from, to, cap, board_.PIECES.BLACKKNIGHT, 0), moves);
    }
    else {
        add_capture_move(MOVE(from, to, cap, board_.PIECES.EMPTY, 0), moves);
    }
}
function add_black_pawn_move(from: board_.SQUARES, to: board_.SQUARES, moves: move_score_t[]) {
    if (util_.ranks_board[from] === board_.RANKS.SECOND_RANK) {
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.BLACKQUEEN, 0), moves);
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.BLACKROOK, 0), moves);
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.BLACKBISHOP, 0), moves);
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.BLACKKNIGHT, 0), moves);
    }
    else {
        add_quiet_move(MOVE(from, to, board_.PIECES.EMPTY, board_.PIECES.EMPTY, 0), moves);
    }
}
function generate_white_helper_moves(board: board_.board_t, moves: move_score_t[], only_capture = false, square = board_.SQUARES.OFF_BOARD) {
    //-- generate white pawn moves
    for (let p = 0; p < board.number_pieces[board_.PIECES.WHITEPAWN]; p++) {
        const sq = board.piece_list[board_.PIECE_INDEX(board_.PIECES.WHITEPAWN, p)];
        if (square === board_.SQUARES.OFF_BOARD || square === sq) {
            //-- forward move
            if ((board.pieces[sq + 10] === board_.PIECES.EMPTY) && !only_capture) {
                add_white_pawn_move(sq, sq + 10, moves);

                if (util_.ranks_board[sq] === board_.RANKS.SECOND_RANK && board.pieces[sq + 20] === board_.PIECES.EMPTY) {
                    add_quiet_move(MOVE(sq, sq + 20, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.PAWN_START), moves);
                }
            }
            //-- capture move
            if (board_.SQUARE_ON_BOARD(sq + 9) && util_.get_color_piece[board.pieces[sq + 9]] === board_.COLORS.BLACK) {
                add_white_pawn_capture_move(sq, sq + 9, board.pieces[sq + 9], moves);
            }
            if (board_.SQUARE_ON_BOARD(sq + 11) && util_.get_color_piece[board.pieces[sq + 11]] === board_.COLORS.BLACK) {
                add_white_pawn_capture_move(sq, sq + 11, board.pieces[sq + 11], moves);
            }

            if (board.enpassant !== board_.SQUARES.OFF_SQUARE) {
                if (sq + 9 === board.enpassant) {
                    add_enpassant_move(MOVE(sq, sq + 9, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
                if (sq + 11 === board.enpassant) {
                    add_enpassant_move(MOVE(sq, sq + 11, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
            }
        }

    }

    //-- castling
    if (square === board_.SQUARES.OFF_BOARD || square === board.king_square[board_.COLORS.WHITE]) {
        if ((((board.castling_right & board_.CASTLING.WHITE_CASTLE_OO) !== 0) && !only_capture)
            && (board.pieces[board_.SQUARES.F1] === board_.PIECES.EMPTY && board.pieces[board_.SQUARES.G1] === board_.PIECES.EMPTY)
            && (!attack_.is_square_attacked(board_.SQUARES.E1, board_.COLORS.BLACK, board) && !attack_.is_square_attacked(board_.SQUARES.F1, board_.COLORS.BLACK, board))) {
            add_quiet_move(MOVE(board_.SQUARES.E1, board_.SQUARES.G1, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);
        }
        if ((((board.castling_right & board_.CASTLING.WHITE_CASTLE_OOO) !== 0) && !only_capture)
            && (board.pieces[board_.SQUARES.D1] === board_.PIECES.EMPTY && board.pieces[board_.SQUARES.C1] === board_.PIECES.EMPTY
                && board.pieces[board_.SQUARES.B1] === board_.PIECES.EMPTY)
            && (!attack_.is_square_attacked(board_.SQUARES.E1, board_.COLORS.BLACK, board) && !attack_.is_square_attacked(board_.SQUARES.D1, board_.COLORS.BLACK, board))) {
            add_quiet_move(MOVE(board_.SQUARES.E1, board_.SQUARES.C1, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);
        }
    }
}
function generate_black_helper_moves(board: board_.board_t, moves: move_score_t[], only_capture = false, square = board_.SQUARES.OFF_BOARD) {
    //generate black pawn moves
    for (let p = 0; p < board.number_pieces[board_.PIECES.BLACKPAWN]; p++) {
        const sq = board.piece_list[board_.PIECE_INDEX(board_.PIECES.BLACKPAWN, p)];
        if (square === board_.SQUARES.OFF_BOARD || square === sq) {
            //-- forward move
            if ((board.pieces[sq - 10] === board_.PIECES.EMPTY) && !only_capture) {
                add_black_pawn_move(sq, sq - 10, moves);
                if (util_.ranks_board[sq] === board_.RANKS.SEVENTH_RANK && board.pieces[sq - 20] === board_.PIECES.EMPTY) {
                    add_quiet_move(MOVE(sq, sq - 20, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.PAWN_START), moves);
                }
            }
            //-- capture move
            if (board_.SQUARE_ON_BOARD(sq - 9) && util_.get_color_piece[board.pieces[sq - 9]] === board_.COLORS.WHITE) {
                add_black_pawn_capture_move(sq, sq - 9, board.pieces[sq - 9], moves);
            }
            if (board_.SQUARE_ON_BOARD(sq - 11) && util_.get_color_piece[board.pieces[sq - 11]] === board_.COLORS.WHITE) {
                add_black_pawn_capture_move(sq, sq - 11, board.pieces[sq - 11], moves);
            }

            if (board.enpassant !== board_.SQUARES.OFF_SQUARE) {
                if (sq - 9 === board.enpassant) {
                    add_enpassant_move(MOVE(sq, sq - 9, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
                if (sq - 11 === board.enpassant) {
                    add_enpassant_move(MOVE(sq, sq - 11, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
            }
        }
    }

    //-- castling
    if (square === board_.SQUARES.OFF_BOARD || square === board.king_square[board_.COLORS.BLACK]) {
        if ((((board.castling_right & board_.CASTLING.BLACK_CASTLE_OO) !== 0) && !only_capture)
            && (board.pieces[board_.SQUARES.F8] === board_.PIECES.EMPTY && board.pieces[board_.SQUARES.G8] === board_.PIECES.EMPTY)
            && (!attack_.is_square_attacked(board_.SQUARES.E8, board_.COLORS.WHITE, board) && !attack_.is_square_attacked(board_.SQUARES.F8, board_.COLORS.WHITE, board))) {
            add_quiet_move(MOVE(board_.SQUARES.E8, board_.SQUARES.G8, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);
        }
        if ((((board.castling_right & board_.CASTLING.BLACK_CASTLE_OOO) !== 0) && !only_capture)
            && (board.pieces[board_.SQUARES.D8] === board_.PIECES.EMPTY && board.pieces[board_.SQUARES.C8] === board_.PIECES.EMPTY
                && board.pieces[board_.SQUARES.B8] === board_.PIECES.EMPTY)
            && (!attack_.is_square_attacked(board_.SQUARES.E8, board_.COLORS.WHITE, board) && !attack_.is_square_attacked(board_.SQUARES.D8, board_.COLORS.WHITE, board))) {
            add_quiet_move(MOVE(board_.SQUARES.E8, board_.SQUARES.C8, board_.PIECES.EMPTY, board_.PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);


        }
    }

}
function generate_slider_moves(board: board_.board_t, moves: move_score_t[], only_capture = false, square = board_.SQUARES.OFF_BOARD) {
    const turn = board.turn;
    let i = turn * 4;
    let p = slider[i++];
    while (p !== -1) {
        for (let pceNum = 0; pceNum < board.number_pieces[p]; ++pceNum) {
            const sq = board.piece_list[board_.PIECE_INDEX(p, pceNum)];
            if (square === board_.SQUARES.OFF_BOARD || square === sq && (board_.SQUARE_ON_BOARD(sq))) {
                for (let i = 0; i < number_directions[p]; i++) {
                    const dir = pieces_directions[p][i];
                    let to_square = sq + dir;
                    while (board_.SQUARE_ON_BOARD(to_square)) {
                        if (board.pieces[to_square] !== board_.PIECES.EMPTY) {
                            if (util_.get_color_piece[board.pieces[to_square]] === (turn ^ 1)) {
                                add_capture_move(MOVE(sq, to_square, board.pieces[to_square], board_.PIECES.EMPTY, 0), moves);
                            }
                            break;
                        }
                        if (!only_capture) {
                            add_quiet_move(MOVE(sq, to_square, board_.PIECES.EMPTY, board_.PIECES.EMPTY, 0), moves);
                        }
                        to_square += dir;
                    }
                }

            }
        }
        p = slider[i++];
    }
}
function generate_nonslider_moves(board: board_.board_t, moves: move_score_t[], only_capture = false, square = board_.SQUARES.OFF_BOARD) {
    const turn = board.turn;
    let i = turn * 3;
    let p = nonslider[i++];
    while (p !== -1) {
        for (let pceNum = 0; pceNum < board.number_pieces[p]; ++pceNum) {
            const sq = board.piece_list[board_.PIECE_INDEX(p, pceNum)];
            if (square === board_.SQUARES.OFF_BOARD || square === sq && board_.SQUARE_ON_BOARD(sq)) {
                for (let i = 0; i < number_directions[p]; i++) {
                    const dir = pieces_directions[p][i];
                    const to_square = sq + dir;

                    if (!board_.SQUARE_ON_BOARD(to_square)) {
                        continue;
                    }
                    if (board.pieces[to_square] !== board_.PIECES.EMPTY) {
                        if (util_.get_color_piece[board.pieces[to_square]] === (turn ^ 1)) {
                            add_capture_move(MOVE(sq, to_square, board.pieces[to_square], board_.PIECES.EMPTY, 0), moves);
                        }
                        continue;
                    }
                    if (!only_capture) {
                        add_quiet_move(MOVE(sq, to_square, board_.PIECES.EMPTY, board_.PIECES.EMPTY, 0), moves);
                    }
                }

            }
        }
        p = nonslider[i++];
    }
}

export function generate_all_moves(board: board_.board_t, only_capture = false, square = board_.SQUARES.OFF_BOARD): move_score_t[] {
    const moves = [] as move_score_t[];
    const turn = board.turn;

    if (turn === board_.COLORS.WHITE) {
        generate_white_helper_moves(board, moves, only_capture, square);
    } else {
        generate_black_helper_moves(board, moves, only_capture, square);
    }

    generate_slider_moves(board, moves, only_capture, square);
    generate_nonslider_moves(board, moves, only_capture, square);

    return moves;
}

export function generate_legal_moves(board: board_.board_t, only_capture = false, square = board_.SQUARES.OFF_BOARD): move_score_t[] {
    const moves = generate_all_moves(board, only_capture, square);
    const rlt = [] as move_score_t[];
    let move: move_score_t;
    for (move of moves) {
        if (!make_move(move.move, board)) {
            continue;
        }
        rlt.push(move);
        take_move(board);
    }
    return rlt;

}

/*****************************************************************************
* MOVE MAKE
****************************************************************************/
export function clear_pieces(sq: board_.SQUARES, board: board_.board_t): void {
    if (board_.SQUARE_ON_BOARD(sq)) {
        const pce = board.pieces[sq];
        const col = util_.get_color_piece[pce];
        let index;
        let t_pceNum = -1;

        board.pieces[sq] = board_.PIECES.EMPTY;

        board.material_mg[col] -= util_.get_value_piece[util_.PHASE.MG][pce];
        board.material_eg[col] -= util_.get_value_piece[util_.PHASE.EG][pce];

        if (util_.is_big_piece[pce]) {
            board.number_big_pieces[col]--;
            if (util_.is_major_piece[pce]) {
                board.number_major_pieces[col]--;
            } else {
                board.number_minor_pieces[col]--;
            }
        }
        else {
            board.pawns[col] = util_.CLEAR_BIT(board.pawns[col], board_.SQ64(sq));
            board.pawns[board_.COLORS.BOTH] = util_.CLEAR_BIT(board.pawns[board_.COLORS.BOTH], board_.SQ64(sq));
        }

        for (index = 0; index < board.number_pieces[pce]; ++index) {
            if (board.piece_list[board_.PIECE_INDEX(pce, index)] === sq) {
                t_pceNum = index;
                break;
            }
        }

        board.number_pieces[pce]--;
        board.piece_list[board_.PIECE_INDEX(pce, t_pceNum)] = board.piece_list[board_.PIECE_INDEX(pce, board.number_pieces[pce])];
        board.current_polyglot_key ^= (hash_.random64_poly[hash_.random_piece + (util_.get_poly_piece[pce]) * 64 + board_.SQ64(sq)]);

    }
}

export function add_piece(sq: board_.SQUARES, pce: board_.PIECES, board: board_.board_t): void {
    if (board_.SQUARE_ON_BOARD(sq) && board_.IS_VALID_PIECE(pce)) {
        const col = util_.get_color_piece[pce];
        const poly_piece = util_.get_poly_piece[pce];

        board.pieces[sq] = pce;

        if (util_.is_big_piece[pce]) {
            board.number_big_pieces[col]++;
            if (util_.is_major_piece[pce]) {
                board.number_major_pieces[col]++;
            } else {
                board.number_minor_pieces[col]++;
            }
        }
        else {
            board.pawns[col] = util_.SET_BIT(board.pawns[col], board_.SQ64(sq));
            board.pawns[board_.COLORS.BOTH] = util_.SET_BIT(board.pawns[board_.COLORS.BOTH], board_.SQ64(sq));
        }

        board.material_eg[col] += util_.get_value_piece[util_.PHASE.EG][pce];
        board.material_mg[col] += util_.get_value_piece[util_.PHASE.MG][pce];

        board.piece_list[board_.PIECE_INDEX(pce, board.number_pieces[pce]++)] = sq;

        board.current_polyglot_key ^= hash_.random64_poly[hash_.random_piece + (poly_piece) * 64 + board_.SQ64(sq)];

    }
}

export function move_piece(from: board_.SQUARES, to: board_.SQUARES, board: board_.board_t): boolean {
    let rcd = false;
    if (board_.SQUARE_ON_BOARD(from) && board_.SQUARE_ON_BOARD(to)) {
        //console.log(`board entering move_piece: ${board_.board_to_ascii(board)}`)
        const pce = board.pieces[from];
        const col = util_.get_color_piece[pce];

        board.pieces[from] = board_.PIECES.EMPTY;
        board.pieces[to] = pce;


        if (!util_.is_big_piece[pce]) {
            // -- clear
            board.pawns[col] = util_.CLEAR_BIT(board.pawns[col], board_.SQ64(from));
            board.pawns[board_.COLORS.BOTH] = util_.CLEAR_BIT(board.pawns[board_.COLORS.BOTH], board_.SQ64(from));
            //-- set
            board.pawns[col] = util_.SET_BIT(board.pawns[col], board_.SQ64(to));
            board.pawns[board_.COLORS.BOTH] = util_.SET_BIT(board.pawns[board_.COLORS.BOTH], board_.SQ64(to));
        }

        for (let index = 0; index < board.number_pieces[pce]; ++index) {
            if (board.piece_list[board_.PIECE_INDEX(pce, index)] === from) {
                board.piece_list[board_.PIECE_INDEX(pce, index)] = to;
                rcd = true;
                break;
            }
        }
        const pce_ind = hash_.random_piece + util_.get_poly_piece[pce] * 64;
        board.current_polyglot_key ^= hash_.random64_poly[pce_ind + board_.SQ64(from)] ^ hash_.random64_poly[pce_ind + board_.SQ64(to)];
    }
    return rcd;
}

export function make_move(move: move_t, board: board_.board_t): boolean {
    //console.log(`board entering make move: ${board_.board_to_ascii(board)}`)
    if (move === NO_MOVE) return false
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    const me = board.turn;
    const opp = me ^ 1;

    // initialise undo
    const undo = {} as board_.undo_t;
    undo.current_polyglot_key = board.current_polyglot_key;

    undo.turn = board.turn;
    undo.move = move;

    undo.half_moves = board.half_moves;
    undo.history_ply = board.history_ply;
    undo.ply = board.ply;

    undo.enpassant = board.enpassant;
    undo.castling_right = board.castling_right;
    undo.material_eg = board.material_eg;
    undo.material_mg = board.material_mg;

    // update board
    board.turn = opp;
    board.current_polyglot_key ^= hash_.random64_poly[hash_.random_turn];

    const old_right = board.castling_right;
    const new_right = old_right & util_.castle_permission[from] & util_.castle_permission[to];

    board.castling_right = new_right;
    board.current_polyglot_key ^= util_.castle64_hash[old_right ^ new_right]; //hack

    if (board.enpassant !== board_.SQUARES.OFF_SQUARE) {
        board.current_polyglot_key ^= hash_.random64_poly[hash_.random_enpass + util_.files_board[board.enpassant]];
        board.enpassant = board_.SQUARES.OFF_SQUARE;
    }

    board.move_history[board.history_ply] = undo;
    board.history_ply++;
    board.ply++;
    board.full_moves += (me === board_.COLORS.BLACK) ? 1 : 0;

    if (util_.is_pawn[board.pieces[from]]) {
        board.half_moves = 0;
        if ((move & MOVE_FLAG.ENPASS) !== 0) {
            if (me === board_.COLORS.WHITE) {
                clear_pieces(to - 10, board);
            } else {
                clear_pieces(to + 10, board);
            }
        }

        else if (((move & MOVE_FLAG.PAWN_START) !== 0)
            && ((board_.SQUARE_ON_BOARD(to - 1) && util_.is_color_pawn[opp][board.pieces[to - 1]])
                || (board_.SQUARE_ON_BOARD(to + 1) && util_.is_color_pawn[opp][board.pieces[to + 1]]))) {
            if (me === board_.COLORS.WHITE) {
                board.enpassant = from + 10;
            } else {
                board.enpassant = from - 10;
            }
            board.current_polyglot_key ^= hash_.random64_poly[hash_.random_enpass + util_.files_board[board.enpassant]];
        }

    }
    else if ((move & MOVE_FLAG.CASTLE) !== 0) {
        switch (to) {
            case board_.SQUARES.C1:
                move_piece(board_.SQUARES.A1, board_.SQUARES.D1, board);
                break;
            case board_.SQUARES.C8:
                move_piece(board_.SQUARES.A8, board_.SQUARES.D8, board);
                break;
            case board_.SQUARES.G1:
                move_piece(board_.SQUARES.H1, board_.SQUARES.F1, board);
                break;
            case board_.SQUARES.G8:
                move_piece(board_.SQUARES.H8, board_.SQUARES.F8, board);
                break;
            default:
                board.current_polyglot_key = undo.current_polyglot_key;
                return false;
        }
    }

    const captured = CAPTURED(move);
    board.half_moves++;
    if (captured !== board_.PIECES.EMPTY) {
        clear_pieces(to, board);
        board.half_moves = 0;
    }

    //console.log(`board before move_piece: ${board_.board_to_ascii(board)}`)
    move_piece(from, to, board);
    //console.log(`board after move_piece: ${board_.board_to_ascii(board)}`)

    const prPce = PROMOTED(move);
    if (prPce !== board_.PIECES.EMPTY) {
        clear_pieces(to, board);
        add_piece(to, prPce, board);
    }

    if (util_.is_king[board.pieces[to]]) {
        board.king_square[me] = to;
    }

    if (attack_.is_square_attacked(board.king_square[me], opp, board)) {
        take_move(board);
        return false;
    }
    return true;
}

export function take_move(board: board_.board_t): void {
    if (board.history_ply === 0) return;
    board.history_ply--;
    board.ply--;
    board.full_moves -= (board.turn === board_.COLORS.WHITE) ? 1 : 0;

    const move = board.move_history[board.history_ply].move;
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    board.turn ^= 1;

    if ((MOVE_FLAG.ENPASS & move) !== 0) {
        if (board.turn === board_.COLORS.WHITE) {
            add_piece(to - 10, board_.PIECES.BLACKPAWN, board);
        } else {
            add_piece(to + 10, board_.PIECES.WHITEPAWN, board);
        }
    } else if ((MOVE_FLAG.CASTLE & move) !== 0) {
        switch (to) {
            case board_.SQUARES.C1: move_piece(board_.SQUARES.D1, board_.SQUARES.A1, board); break;
            case board_.SQUARES.C8: move_piece(board_.SQUARES.D8, board_.SQUARES.A8, board); break;
            case board_.SQUARES.G1: move_piece(board_.SQUARES.F1, board_.SQUARES.H1, board); break;
            case board_.SQUARES.G8: move_piece(board_.SQUARES.F8, board_.SQUARES.H8, board); break;
            default: break;
        }
    }
    move_piece(to, from, board);

    if (util_.is_king[board.pieces[from]]) {
        board.king_square[board.turn] = from;
    }

    const captured = CAPTURED(move);
    if (captured !== board_.PIECES.EMPTY) {
        add_piece(to, captured, board);
    }

    if (PROMOTED(move) !== board_.PIECES.EMPTY) {
        clear_pieces(from, board);
        add_piece(from, (util_.get_color_piece[PROMOTED(move)] === board_.COLORS.WHITE ? board_.PIECES.WHITEPAWN : board_.PIECES.BLACKPAWN), board);
    }

    board.current_polyglot_key = board.move_history[board.history_ply].current_polyglot_key; //Hack
    board.turn = board.move_history[board.history_ply].turn;
    board.castling_right = board.move_history[board.history_ply].castling_right;
    board.half_moves = board.move_history[board.history_ply].half_moves;
    board.enpassant = board.move_history[board.history_ply].enpassant;
    board.turn = board.move_history[board.history_ply].turn;
    board.material_eg = board.move_history[board.history_ply].material_eg;
    board.material_mg = board.move_history[board.history_ply].material_mg;
}