type move_t = number

type move_score_t = {
    move: move_t;
    score: number;
}

type verbose_move_t = {
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

const NO_MOVE: move_t = 0;
const CAPTURE_BONUS = 1000000;
const ENPASS_BONUS = 105;
const number_directions = [0, 0, 4, 8, 4, 8, 8, 0, 4, 8, 4, 8, 8];
const slider = [
    PIECES.WHITEBISHOP, PIECES.WHITEROOK, PIECES.WHITEQUEEN, -1, PIECES.BLACKBISHOP,
    PIECES.BLACKROOK, PIECES.BLACKQUEEN, -1
];
const nonslider = [PIECES.WHITEKNIGHT, PIECES.WHITEKING, -1, PIECES.BLACKKNIGHT, PIECES.BLACKKING, -1];
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
function MOVE(from: SQUARES, to: SQUARES, cap: PIECES, prom: PIECES, flag: number) { return ((from) | (to << 7) | (cap << 14) | (prom << 20) | (flag)); }
function FROM_SQUARE(move: move_t) { return ((move) & 0x7F); }
function TO_SQUARE(move: move_t) { return (((move) >> 7) & 0x7F); }
function CAPTURED(move: move_t) { return (((move) >> 14) & 0xF); }
function PROMOTED(move: move_t) { return (((move) >> 20) & 0xF); }

/*****************************************************************************
 * MOVE PARSER
****************************************************************************/
function smith_to_move(smith: string, board: board_t) {
    if (smith[1].charCodeAt(0) > '8'.charCodeAt(0) || smith[1].charCodeAt(0) < '1'.charCodeAt(0)) return NO_MOVE;
    if (smith[3].charCodeAt(0) > '8'.charCodeAt(0) || smith[3].charCodeAt(0) < '1'.charCodeAt(0)) return NO_MOVE;
    if (smith[0].charCodeAt(0) > 'h'.charCodeAt(0) || smith[0].charCodeAt(0) < 'a'.charCodeAt(0)) return NO_MOVE;
    if (smith[2].charCodeAt(0) > 'h'.charCodeAt(0) || smith[2].charCodeAt(0) < 'a'.charCodeAt(0)) return NO_MOVE;

    let from = FILE_RANK_TO_SQUARE(smith[0].charCodeAt(0) - 'a'.charCodeAt(0), smith[1].charCodeAt(0) - '1'.charCodeAt(0));
    let to = FILE_RANK_TO_SQUARE(smith[2].charCodeAt(0) - 'a'.charCodeAt(0), smith[3].charCodeAt(0) - '1'.charCodeAt(0));

    if (SQUARE_ON_BOARD(from) && SQUARE_ON_BOARD(to)) {
        let moves = generate_legal_moves(board);
        for (let i = 0; i < moves.length; i++) {
            let move = moves[i].move;
            if (FROM_SQUARE(move) === from && TO_SQUARE(move) === to) {
                let promotion_piece = PROMOTED(move);
                if (promotion_piece !== PIECES.EMPTY) {
                    if ((smith[4] === (piece_to_ascii[promotion_piece]).toLowerCase())
                        || (smith[4] === (piece_to_ascii[promotion_piece]).toUpperCase())) {
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

function move_to_smith(move: move_t) {
    if (move != NO_MOVE) {


        let file_from = files_board[FROM_SQUARE(move)];
        let rank_from = ranks_board[FROM_SQUARE(move)];

        let file_to = files_board[TO_SQUARE(move)];
        let rank_to = ranks_board[TO_SQUARE(move)];

        let promoted = PROMOTED(move);
        let rlt = (String.fromCharCode('a'.charCodeAt(0) + file_from) + String.fromCharCode('1'.charCodeAt(0)
            + rank_from) + String.fromCharCode('a'.charCodeAt(0) + file_to) + String.fromCharCode('1'.charCodeAt(0)
                + rank_to)
        );
        if (promoted) {
            let tmp = 'q';
            if (is_knight[promoted]) {
                tmp = 'n';
            } else if (is_rook_or_queen[promoted] && !is_bishop_or_queen[promoted]) {
                tmp = 'r';
            } else if (!is_rook_or_queen[promoted] && is_bishop_or_queen[promoted]) {
                tmp = 'b';
            }
            rlt += tmp;
        }
        return rlt;
    }
    return "";

}
function move_to_verbose_move(move: move_t, board: board_t) {
    let from = FROM_SQUARE(move);
    let to = TO_SQUARE(move);
    let rlt = {} as verbose_move_t;
    rlt.from = square_to_algebraic(from);
    rlt.to = square_to_algebraic(to);
    rlt.color = "wb-"[board.turn];
    rlt.pieces = (piece_to_ascii[board.pieces[from]]).toLowerCase();
    if ((move & MOVE_FLAG.CAPTURED) !== 0 && (move & MOVE_FLAG.PROMOTED) !== 0) {
        rlt.flag = 'pc';
        rlt.captured = (piece_to_ascii[CAPTURED(move)]).toLowerCase();
        rlt.promoted = (piece_to_ascii[PROMOTED(move)]).toLowerCase();
    }
    else if ((move & MOVE_FLAG.CAPTURED) !== 0) {
        rlt.flag = 'c';
        rlt.captured = (piece_to_ascii[CAPTURED(move)]).toLowerCase();
    }
    else if ((move & MOVE_FLAG.PROMOTED) !== 0) {
        rlt.flag = 'p';
        rlt.promoted = (piece_to_ascii[PROMOTED(move)]).toLowerCase();
    }
    else if ((move & MOVE_FLAG.ENPASS) !== 0) {
        rlt.flag = 'e';
    }
    else if ((move & MOVE_FLAG.CASTLE) !== 0) {
        if (to === SQUARES.G8 || to === SQUARES.G1) {
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
    rlt.san = move_to_san(move, board, true);
    return rlt
}

function disambiguator(move: move_t, board: board_t) {
    let diamb = "";

    let moves = generate_all_moves(board);

    let from = FROM_SQUARE(move);
    let to = TO_SQUARE(move);
    let piece = board.pieces[from];

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
            if (ranks_board[from] === ranks_board[tmp_from]) same_rank++;
            if (files_board[from] === files_board[tmp_from]) same_file++;
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
            diamb += square_to_algebraic(FROM_SQUARE(move));
        }
        else if (same_file > 0) {
            diamb += square_to_algebraic(from).charAt(1);
        }
        else {
            diamb += square_to_algebraic(from).charAt(0);
        }
    }
    return diamb;
}

function move_to_san(move: move_t, board: board_t, verbose = true) {
    let san = "";
    let from = FROM_SQUARE(move);
    let to = TO_SQUARE(move);

    if (SQUARE_ON_BOARD(from) && SQUARE_ON_BOARD(to)) {
        if ((move & MOVE_FLAG.CASTLE) !== 0) {//--castling move
            switch (to) {
                case SQUARES.C1:
                    san = "O-O-O";
                    break;
                case SQUARES.C8:
                    san = "O-O-O";
                    break;
                case SQUARES.G1:
                    san = "O-O";
                    break;
                case SQUARES.G8:
                    san = "O-O";
                    break;
                default: break;
            }
        }
        else {
            let diam = disambiguator(move, board);
            if (!is_pawn[board.pieces[from]]) {
                san += (piece_to_ascii[board.pieces[from]]).toUpperCase();
                san += diam;
            }
            if ((move & (MOVE_FLAG.CAPTURED | MOVE_FLAG.ENPASS)) !== 0) {
                if (is_pawn[board.pieces[from]]) {
                    san += String.fromCharCode('a'.charCodeAt(0) + files_board[from]);
                }
                san += 'x';
            }
            san += square_to_algebraic(to);
            if ((move & MOVE_FLAG.PROMOTED) !== 0) {
                san += '=';
                san += (piece_to_ascii[PROMOTED(move)]).toLowerCase();
            }
        }
        if (verbose) {
            let check = false;
            if (make_move(move, board)) {
                check = in_check(board);
                if (in_checkmate(board)) {
                    san += "#";
                }
                else if (check) {
                    san += "+";
                }
                take_move(board);
            }
            if (!check && ((move & MOVE_FLAG.ENPASS) !== 0)) {
                san += " e.p.";
            }
        }

    }
    return san;
}

function san_to_move(san: string, board: board_t) {
    let legal = generate_legal_moves(board);
    let move: move_score_t;
    for (move of legal) {
        if (san == move_to_san(move.move, board)) return move.move;
    }
    return NO_MOVE;
}

function clean_smith(smith: string) {
    let rlt = "";
    let matches = smith.match(
        /([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/
    );
    if (matches) {
        //let piece = matches[1];
        let from = matches[2];
        let to = matches[3];
        let promotion = matches[4];
        if (typeof from !== 'undefined' && typeof to !== 'undefined') {
            rlt += (from + to);
        }
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
    let score = ENPASS_BONUS + CAPTURE_BONUS;
    moves.push({ move: move, score: score });
}
function add_white_pawn_capture_move(from: SQUARES, to: SQUARES, cap: PIECES, moves: move_score_t[]) {
    if (ranks_board[from] == RANKS.SEVENTH_RANK) {
        add_capture_move(MOVE(from, to, cap, PIECES.WHITEQUEEN, 0), moves);
        add_capture_move(MOVE(from, to, cap, PIECES.WHITEROOK, 0), moves);
        add_capture_move(MOVE(from, to, cap, PIECES.WHITEBISHOP, 0), moves);
        add_capture_move(MOVE(from, to, cap, PIECES.WHITEKNIGHT, 0), moves);
    }
    else {
        add_capture_move(MOVE(from, to, cap, PIECES.EMPTY, 0), moves);
    }
}
function add_white_pawn_move(from: SQUARES, to: SQUARES, moves: move_score_t[]) {
    if (ranks_board[from] == RANKS.SEVENTH_RANK) {
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.WHITEQUEEN, 0), moves);
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.WHITEROOK, 0), moves);
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.WHITEBISHOP, 0), moves);
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.WHITEKNIGHT, 0), moves);
    }
    else {
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.EMPTY, 0), moves);
    }
}
function add_black_pawn_capture_move(from: SQUARES, to: SQUARES, cap: PIECES, moves: move_score_t[]) {
    if (ranks_board[from] === RANKS.SECOND_RANK) {
        add_capture_move(MOVE(from, to, cap, PIECES.BLACKQUEEN, 0), moves);
        add_capture_move(MOVE(from, to, cap, PIECES.BLACKROOK, 0), moves);
        add_capture_move(MOVE(from, to, cap, PIECES.BLACKBISHOP, 0), moves);
        add_capture_move(MOVE(from, to, cap, PIECES.BLACKKNIGHT, 0), moves);
    }
    else {
        add_capture_move(MOVE(from, to, cap, PIECES.EMPTY, 0), moves);
    }
}
function add_black_pawn_move(from: SQUARES, to: SQUARES, moves: move_score_t[]) {
    if (ranks_board[from] === RANKS.SECOND_RANK) {
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.BLACKQUEEN, 0), moves);
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.BLACKROOK, 0), moves);
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.BLACKBISHOP, 0), moves);
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.BLACKKNIGHT, 0), moves);
    }
    else {
        add_quiet_move(MOVE(from, to, PIECES.EMPTY, PIECES.EMPTY, 0), moves);
    }
}
function generate_all_moves(board: board_t, only_capture = false, square = SQUARES.OFF_BOARD) {
    let moves = [] as move_score_t[];
    let turn = board.turn;
    if (turn === COLORS.WHITE) {
        //-- generate white pawn moves
        for (let p = 0; p < board.number_pieces[PIECES.WHITEPAWN]; p++) {
            let sq = board.piece_list[PIECE_INDEX(PIECES.WHITEPAWN, p)];
            if (square === SQUARES.OFF_BOARD || square === sq) {
                //-- forward move
                if ((board.pieces[sq + 10] === PIECES.EMPTY) && !only_capture) {
                    add_white_pawn_move(sq, sq + 10, moves);

                    if (ranks_board[sq] === RANKS.SECOND_RANK && board.pieces[sq + 20] === PIECES.EMPTY) {
                        add_quiet_move(MOVE(sq, sq + 20, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.PAWN_START), moves);
                    }
                }
                //-- capture move
                if (SQUARE_ON_BOARD(sq + 9) && get_color_piece[board.pieces[sq + 9]] === COLORS.BLACK) {
                    add_white_pawn_capture_move(sq, sq + 9, board.pieces[sq + 9], moves);
                }
                if (SQUARE_ON_BOARD(sq + 11) && get_color_piece[board.pieces[sq + 11]] === COLORS.BLACK) {
                    add_white_pawn_capture_move(sq, sq + 11, board.pieces[sq + 11], moves);
                }

                if (board.enpassant !== SQUARES.OFF_SQUARE) {
                    if (sq + 9 === board.enpassant) {
                        add_enpassant_move(MOVE(sq, sq + 9, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                    }
                    if (sq + 11 === board.enpassant) {
                        add_enpassant_move(MOVE(sq, sq + 11, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                    }
                }
            }

        }

        //-- castling
        if (square === SQUARES.OFF_BOARD || square === board.king_square[COLORS.WHITE]) {
            if (((board.castling_right & CASTLING.WHITE_CASTLE_OO) !== 0) && !only_capture) {
                if (board.pieces[SQUARES.F1] === PIECES.EMPTY && board.pieces[SQUARES.G1] === PIECES.EMPTY) {
                    if (!is_square_attacked(SQUARES.E1, COLORS.BLACK, board) && !is_square_attacked(SQUARES.F1, COLORS.BLACK, board)) {
                        add_quiet_move(MOVE(SQUARES.E1, SQUARES.G1, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);
                    }
                }
            }
            if (((board.castling_right & CASTLING.WHITE_CASTLE_OOO) !== 0) && !only_capture) {
                if (board.pieces[SQUARES.D1] === PIECES.EMPTY && board.pieces[SQUARES.C1] === PIECES.EMPTY
                    && board.pieces[SQUARES.B1] === PIECES.EMPTY) {
                    if (!is_square_attacked(SQUARES.E1, COLORS.BLACK, board) && !is_square_attacked(SQUARES.D1, COLORS.BLACK, board)) {
                        add_quiet_move(MOVE(SQUARES.E1, SQUARES.C1, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);
                    }
                }
            }
        }
    }
    else {
        //generate black pawn moves
        for (let p = 0; p < board.number_pieces[PIECES.BLACKPAWN]; p++) {
            let sq = board.piece_list[PIECE_INDEX(PIECES.BLACKPAWN, p)];
            if (square === SQUARES.OFF_BOARD || square === sq) {
                //-- forward move
                if ((board.pieces[sq - 10] === PIECES.EMPTY) && !only_capture) {
                    add_black_pawn_move(sq, sq - 10, moves);
                    if (ranks_board[sq] === RANKS.SEVENTH_RANK && board.pieces[sq - 20] === PIECES.EMPTY) {
                        add_quiet_move(MOVE(sq, sq - 20, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.PAWN_START), moves);
                    }
                }
                //-- capture move
                if (SQUARE_ON_BOARD(sq - 9) && get_color_piece[board.pieces[sq - 9]] === COLORS.WHITE) {
                    add_black_pawn_capture_move(sq, sq - 9, board.pieces[sq - 9], moves);
                }
                if (SQUARE_ON_BOARD(sq - 11) && get_color_piece[board.pieces[sq - 11]] === COLORS.WHITE) {
                    add_black_pawn_capture_move(sq, sq - 11, board.pieces[sq - 11], moves);
                }

                if (board.enpassant !== SQUARES.OFF_SQUARE) {
                    if (sq - 9 === board.enpassant) {
                        add_enpassant_move(MOVE(sq, sq - 9, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                    }
                    if (sq - 11 === board.enpassant) {
                        add_enpassant_move(MOVE(sq, sq - 11, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.ENPASS), moves);
                    }
                }
            }
        }

        //-- castling
        if (square === SQUARES.OFF_BOARD || square === board.king_square[COLORS.BLACK]) {
            if (((board.castling_right & CASTLING.BLACK_CASTLE_OO) !== 0) && !only_capture) {
                if (board.pieces[SQUARES.F8] === PIECES.EMPTY && board.pieces[SQUARES.G8] === PIECES.EMPTY) {
                    if (!is_square_attacked(SQUARES.E8, COLORS.WHITE, board) && !is_square_attacked(SQUARES.F8, COLORS.WHITE, board)) {
                        add_quiet_move(MOVE(SQUARES.E8, SQUARES.G8, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);
                    }
                }
            }
            if (((board.castling_right & CASTLING.BLACK_CASTLE_OOO) !== 0) && !only_capture) {
                if (board.pieces[SQUARES.D8] === PIECES.EMPTY && board.pieces[SQUARES.C8] === PIECES.EMPTY
                    && board.pieces[SQUARES.B8] === PIECES.EMPTY) {
                    if (!is_square_attacked(SQUARES.E8, COLORS.WHITE, board) && !is_square_attacked(SQUARES.D8, COLORS.WHITE, board)) {
                        add_quiet_move(MOVE(SQUARES.E8, SQUARES.C8, PIECES.EMPTY, PIECES.EMPTY, MOVE_FLAG.CASTLE), moves);
                    }
                }
            }
        }
    }

    let i = turn * 4;
    let p = slider[i++];
    while (p !== -1) {
        for (let pceNum = 0; pceNum < board.number_pieces[p]; ++pceNum) {
            let sq = board.piece_list[PIECE_INDEX(p, pceNum)];
            if (square === SQUARES.OFF_BOARD || square === sq) {
                if (SQUARE_ON_BOARD(sq)) {
                    for (let i = 0; i < number_directions[p]; i++) {
                        let dir = pieces_directions[p][i];
                        let to_square = sq + dir;
                        while (SQUARE_ON_BOARD(to_square)) {
                            if (board.pieces[to_square] !== PIECES.EMPTY) {
                                if (get_color_piece[board.pieces[to_square]] === (turn ^ 1)) {
                                    add_capture_move(MOVE(sq, to_square, board.pieces[to_square], PIECES.EMPTY, 0), moves);
                                }
                                break;
                            }
                            if (!only_capture) {
                                add_quiet_move(MOVE(sq, to_square, PIECES.EMPTY, PIECES.EMPTY, 0), moves);
                            }
                            to_square += dir;
                        }
                    }
                }
            }
        }
        p = slider[i++];
    }

    i = turn * 3;
    p = nonslider[i++];
    while (p !== -1) {
        for (let pceNum = 0; pceNum < board.number_pieces[p]; ++pceNum) {
            let sq = board.piece_list[PIECE_INDEX(p, pceNum)];
            if (square === SQUARES.OFF_BOARD || square === sq) {
                if (SQUARE_ON_BOARD(sq)) {
                    for (let i = 0; i < number_directions[p]; i++) {
                        let dir = pieces_directions[p][i];
                        let to_square = sq + dir;

                        if (!SQUARE_ON_BOARD(to_square)) {
                            continue;
                        }
                        if (board.pieces[to_square] !== PIECES.EMPTY) {
                            if (get_color_piece[board.pieces[to_square]] === (turn ^ 1)) {
                                add_capture_move(MOVE(sq, to_square, board.pieces[to_square], PIECES.EMPTY, 0), moves);
                            }
                            continue;
                        }
                        if (!only_capture) {
                            add_quiet_move(MOVE(sq, to_square, PIECES.EMPTY, PIECES.EMPTY, 0), moves);
                        }
                    }
                }
            }
        }
        p = nonslider[i++];
    }
    return moves;
}

function generate_legal_moves(board: board_t, only_capture = false, square = SQUARES.OFF_BOARD) {
    let moves = generate_all_moves(board, only_capture, square);
    let rlt = [] as move_score_t[];
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
function clear_pieces(sq: SQUARES, board: board_t) {
    if (SQUARE_ON_BOARD(sq)) {
        let pce = board.pieces[sq];
        let col = get_color_piece[pce];
        let index;
        let t_pceNum = -1;

        board.pieces[sq] = PIECES.EMPTY;

        board.material_mg[col] -= get_value_piece[PHASE.MG][pce];
        board.material_eg[col] -= get_value_piece[PHASE.EG][pce];

        if (is_big_piece[pce]) {
            board.number_big_pieces[col]--;
            if (is_major_piece[pce]) {
                board.number_major_pieces[col]--;
            } else {
                board.number_minor_pieces[col]--;
            }
        }
        else {
            board.pawns[col] = CLEAR_BIT(board.pawns[col], SQ64(sq));
            board.pawns[COLORS.BOTH] = CLEAR_BIT(board.pawns[COLORS.BOTH], SQ64(sq));
        }

        for (index = 0; index < board.number_pieces[pce]; ++index) {
            if (board.piece_list[PIECE_INDEX(pce, index)] === sq) {
                t_pceNum = index;
                break;
            }
        }

        board.number_pieces[pce]--;
        board.piece_list[PIECE_INDEX(pce, t_pceNum)] = board.piece_list[PIECE_INDEX(pce, board.number_pieces[pce])];
        board.current_polyglot_key ^= random64_poly[random_piece + (get_poly_piece[pce]) * 64 + SQ64(sq)];

    }
}

function add_piece(sq: SQUARES, pce: PIECES, board: board_t) {
    if (SQUARE_ON_BOARD(sq)) {
        let col = get_color_piece[pce];
        let poly_piece = get_poly_piece[pce];

        board.pieces[sq] = pce;

        if (is_big_piece[pce]) {
            board.number_big_pieces[col]++;
            if (is_major_piece[pce]) {
                board.number_major_pieces[col]++;
            } else {
                board.number_minor_pieces[col]++;
            }
        }
        else {
            board.pawns[col] = SET_BIT(board.pawns[col], SQ64(sq));
            board.pawns[COLORS.BOTH] = SET_BIT(board.pawns[COLORS.BOTH], SQ64(sq));
        }

        board.material_eg[col] += get_value_piece[PHASE.EG][pce];
        board.material_mg[col] += get_value_piece[PHASE.MG][pce];

        board.piece_list[PIECE_INDEX(pce, board.number_pieces[pce]++)] = sq;
        board.current_polyglot_key ^= random64_poly[random_piece + (poly_piece) * 64 + SQ64(sq)];

    }
}
function move_piece(from: SQUARES, to: SQUARES, board: board_t) {
    let rcd = false;
    if (SQUARE_ON_BOARD(from) && SQUARE_ON_BOARD(to)) {
        let pce = board.pieces[from];
        let col = get_color_piece[pce];

        board.pieces[from] = PIECES.EMPTY;
        board.pieces[to] = pce;

        if (!is_big_piece[pce]) {
            // -- clear
            board.pawns[col] = CLEAR_BIT(board.pawns[col], SQ64(from));
            board.pawns[COLORS.BOTH] = CLEAR_BIT(board.pawns[COLORS.BOTH], SQ64(from));
            //-- set
            board.pawns[col] = SET_BIT(board.pawns[col], SQ64(to));
            board.pawns[COLORS.BOTH] = SET_BIT(board.pawns[COLORS.BOTH], SQ64(to));
        }

        for (let index = 0; index < board.number_pieces[pce]; ++index) {
            if (board.piece_list[PIECE_INDEX(pce, index)] === from) {
                board.piece_list[PIECE_INDEX(pce, index)] = to;
                rcd = true;
                break;
            }
        }

        let pce_ind = random_piece + get_poly_piece[pce] * 64;
        board.current_polyglot_key ^= random64_poly[pce_ind + SQ64(from)]
            ^ random64_poly[pce_ind + SQ64(to)];
    }
    return rcd;
}

function make_move(move: move_t, board: board_t) {
    if (move === NO_MOVE) return false
    let from = FROM_SQUARE(move);
    let to = TO_SQUARE(move);

    let me = board.turn;
    let opp = me ^ 1;

    // initialise undo
    let undo = {} as undo_t;
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
    board.current_polyglot_key ^= random64_poly[random_turn];

    let old_right = board.castling_right;
    let new_right = old_right & castle_permission[from] & castle_permission[to];

    board.castling_right = new_right;
    board.current_polyglot_key ^= castle64_hash[old_right ^ new_right]; //hack

    if (board.enpassant !== SQUARES.OFF_SQUARE) {
        board.current_polyglot_key ^= random64_poly[random_enpass + files_board[board.enpassant]];
        board.enpassant = SQUARES.OFF_SQUARE;
    }

    board.move_history[board.history_ply] = undo;
    board.history_ply++;
    board.ply++;
    board.full_moves += (me === COLORS.BLACK) ? 1 : 0;

    if (is_pawn[board.pieces[from]]) {
        board.half_moves = 0;
        if ((move & MOVE_FLAG.ENPASS) !== 0) {
            if (me === COLORS.WHITE) {
                clear_pieces(to - 10, board);
            } else {
                clear_pieces(to + 10, board);
            }
        }

        else if ((move & MOVE_FLAG.PAWN_START) !== 0) {
            if ((SQUARE_ON_BOARD(to - 1) && is_color_pawn[opp][board.pieces[to - 1]])
                || (SQUARE_ON_BOARD(to + 1) && is_color_pawn[opp][board.pieces[to + 1]])) {
                if (me === COLORS.WHITE) {
                    board.enpassant = from + 10;
                } else {
                    board.enpassant = from - 10;
                }
                board.current_polyglot_key ^= random64_poly[random_enpass + files_board[board.enpassant]];
            }

        }

    }
    else if ((move & MOVE_FLAG.CASTLE) !== 0) {
        switch (to) {
            case SQUARES.C1:
                move_piece(SQUARES.A1, SQUARES.D1, board);
                break;
            case SQUARES.C8:
                move_piece(SQUARES.A8, SQUARES.D8, board);
                break;
            case SQUARES.G1:
                move_piece(SQUARES.H1, SQUARES.F1, board);
                break;
            case SQUARES.G8:
                move_piece(SQUARES.H8, SQUARES.F8, board);
                break;
            default:
                board.current_polyglot_key = undo.current_polyglot_key;
                return false;
        }
    }

    let captured = CAPTURED(move);
    board.half_moves++;
    if (captured !== PIECES.EMPTY) {
        clear_pieces(to, board);
        board.half_moves = 0;
    }

    move_piece(from, to, board);

    let prPce = PROMOTED(move);
    if (prPce !== PIECES.EMPTY) {
        clear_pieces(to, board);
        add_piece(to, prPce, board);
    }

    if (is_king[board.pieces[to]]) {
        board.king_square[me] = to;
    }

    if (is_square_attacked(board.king_square[me], opp, board)) {
        take_move(board);
        return false;
    }
    return true;
}
function take_move(board: board_t) {
    if (board.history_ply === 0) return;
    board.history_ply--;
    board.ply--;
    board.full_moves -= (board.turn === COLORS.WHITE) ? 1 : 0;

    let move = board.move_history[board.history_ply].move;
    let from = FROM_SQUARE(move);
    let to = TO_SQUARE(move);

    board.turn ^= 1;

    if ((MOVE_FLAG.ENPASS & move) !== 0) {
        if (board.turn === COLORS.WHITE) {
            add_piece(to - 10, PIECES.BLACKPAWN, board);
        } else {
            add_piece(to + 10, PIECES.WHITEPAWN, board);
        }
    } else if ((MOVE_FLAG.CASTLE & move) !== 0) {
        switch (to) {
            case SQUARES.C1: move_piece(SQUARES.D1, SQUARES.A1, board); break;
            case SQUARES.C8: move_piece(SQUARES.D8, SQUARES.A8, board); break;
            case SQUARES.G1: move_piece(SQUARES.F1, SQUARES.H1, board); break;
            case SQUARES.G8: move_piece(SQUARES.F8, SQUARES.H8, board); break;
            default: break;
        }
    }
    move_piece(to, from, board);

    if (is_king[board.pieces[from]]) {
        board.king_square[board.turn] = from;
    }

    let captured = CAPTURED(move);
    if (captured !== PIECES.EMPTY) {
        add_piece(to, captured, board);
    }

    if (PROMOTED(move) !== PIECES.EMPTY) {
        clear_pieces(from, board);
        add_piece(from, (get_color_piece[PROMOTED(move)] === COLORS.WHITE ? PIECES.WHITEPAWN : PIECES.BLACKPAWN), board);
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