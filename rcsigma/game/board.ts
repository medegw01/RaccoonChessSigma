
enum PIECES {
    EMPTY,
    WHITEPAWN,
    WHITEBISHOP,
    WHITEKNIGHT,
    WHITEROOK,
    WHITEQUEEN,
    WHITEKING,
    BLACKPAWN,
    BLACKBISHOP,
    BLACKKNIGHT,
    BLACKROOK,
    BLACKQUEEN,
    BLACKKING,
    OFF_BOARD_PIECE
};

enum FILES { A_FILE, B_FILE, C_FILE, D_FILE, E_FILE, F_FILE, G_FILE, H_FILE, NONE_FILE };

enum RANKS {
    FIRST_RANK,
    SECOND_RANK,
    THIRD_RANK,
    FOURTH_RANK,
    FIFTH_RANK,
    SIXTH_RANK,
    SEVENTH_RANK,
    EIGHTH_RANK,
    NONE_RANK
};

enum COLORS { WHITE, BLACK, BOTH };

enum SQUARES {
    A1 = 21, B1, C1, D1, E1, F1, G1, H1,
    A2 = 31, B2, C2, D2, E2, F2, G2, H2,
    A3 = 41, B3, C3, D3, E3, F3, G3, H3,
    A4 = 51, B4, C4, D4, E4, F4, G4, H4,
    A5 = 61, B5, C5, D5, E5, F5, G5, H5,
    A6 = 71, B6, C6, D6, E6, F6, G6, H6,
    A7 = 81, B7, C7, D7, E7, F7, G7, H7,
    A8 = 91, B8, C8, D8, E8, F8, G8, H8, OFF_SQUARE, OFF_BOARD
};

enum CASTLING {
    WHITE_CASTLE_OO = 1 << 0,
    WHITE_CASTLE_OOO = 1 << 1,
    BLACK_CASTLE_OO = 1 << 2,
    BLACK_CASTLE_OOO = 1 << 3
};

type bitboard_t = bigint

type undo_t = {
    move: move_t;

    enpassant: SQUARES;
    turn: COLORS;
    half_moves: number;
    castling_right: number;

    ply: number;
    full_moves: number;
    history_ply: number;
    current_polyglot_key: bitboard_t;

    material_eg: number[];
    material_mg: number[];
}

type board_t = {
    pieces: PIECES[];
    pawns: bitboard_t[];
    king_square: SQUARES[];

    enpassant: SQUARES;
    turn: COLORS;
    half_moves: number;
    full_moves: number;
    castling_right: number;

    ply: number;
    history_ply: number;

    current_polyglot_key: bitboard_t;

    material_eg: number[];
    material_mg: number[];

    number_pieces: number[];
    number_big_pieces: number[];
    number_major_pieces: number[];
    number_minor_pieces: number[];

    piece_list: SQUARES[];
    move_history: undo_t[];
}

/*****************************************************************************
 * MACRO
 ****************************************************************************/
function FILE_RANK_TO_SQUARE(file: number, rank: number) { return ((21 + (file)) + ((rank) * 10)); }
function SQ64(SQ120: number) { return (square120_to_square64[(SQ120)]); }
function SQ120(square_64: number) { return (square64_to_square120[(square_64)]); }
function FLIP64(sq: SQUARES) { return (flip[(sq)]) }

function SQUARE_ON_BOARD(sq: SQUARES) { return (files_board[(sq)] !== SQUARES.OFF_BOARD); }
function IS_VALID_PIECE(pce: PIECES) { return ((pce) >= PIECES.WHITEPAWN && (pce) <= PIECES.BLACKKING) }
function IS_VALID_TURN(turn: COLORS) { return ((turn) == COLORS.WHITE || (turn) == COLORS.BLACK) }
function IS_VALID_FILE_RANK(fr: number) { return ((fr) >= 0 && (fr) <= 7) }

function SQUARE_COLOR(sq: SQUARES) { return (ranks_board[(sq)] + files_board[(sq)]) % 2 === 0 ? COLORS.BLACK : COLORS.WHITE; }
function PIECE_INDEX(piece: number, piece_num: number) { return (piece * 10 + piece_num) }


/*****************************************************************************
* BOARD POSITION
****************************************************************************/
function check_board(position: board_t) {
    let tmp_number_piece = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    let tmp_number_big_piece = [0, 0];
    let tmp_number_major_piece = [0, 0];
    let tmp_number_minor_piece = [0, 0];
    let tmp_material_eg = [0, 0];
    let tmp_material_mg = [0, 0];

    let tmp_pawns = [0n, 0n, 0n];
    tmp_pawns[COLORS.WHITE] = position.pawns[COLORS.WHITE];
    tmp_pawns[COLORS.BLACK] = position.pawns[COLORS.BLACK];
    tmp_pawns[COLORS.BOTH] = position.pawns[COLORS.BOTH];


    // check piece lists
    for (let p = PIECES.WHITEPAWN; p <= PIECES.BLACKKING; ++p) {
        for (let p_num = 0; p_num < position.number_pieces[p]; ++p_num) {
            let SQ120: number = position.piece_list[PIECE_INDEX(p, p_num)]
            ASSERT(position.pieces[SQ120] == p, `Piece List Mismatch\n Got: ${piece_to_ascii[position.pieces[SQ120]]} Expect: ${piece_to_ascii[p]}`);
        }
    }

    // check piece count and other counters
    for (let square_64 = 0; square_64 < 64; ++square_64) {
        let sq120 = SQ120(square_64);
        let p = position.pieces[sq120];
        tmp_number_piece[p]++;
        let color = get_color_piece[p];
        if (is_big_piece[p]) tmp_number_big_piece[color]++;
        if (is_minor_piece[p]) tmp_number_minor_piece[color]++;
        if (is_major_piece[p]) tmp_number_major_piece[color]++;

        tmp_material_eg[color] += get_value_piece[PHASE.MG][p];
        tmp_material_mg[color] += get_value_piece[PHASE.EG][p];
    }

    for (let p = PIECES.WHITEPAWN; p <= PIECES.BLACKKING; ++p) {
        ASSERT(tmp_number_piece[p] == position.number_pieces[p], `no. of Pieces Mismatch\n Got: ${position.number_pieces[p]} Expect: ${tmp_number_piece[p]}`);
    }

    // check bitboards count
    let pcount = COUNT_BITS(tmp_pawns[COLORS.WHITE]);
    ASSERT(pcount == position.number_pieces[PIECES.WHITEPAWN], `no. White Pawns Mismatch\n Got: ${position.number_pieces[PIECES.WHITEPAWN]} Expect: ${pcount}`);
    pcount = COUNT_BITS(tmp_pawns[COLORS.BLACK]);
    ASSERT(pcount == position.number_pieces[PIECES.BLACKPAWN], `no. Black Pawns Mismatch\n Got: ${position.number_pieces[PIECES.BLACKPAWN]} Expect: ${pcount}`);
    pcount = COUNT_BITS(tmp_pawns[COLORS.BOTH]);
    let both_pawns = position.number_pieces[PIECES.BLACKPAWN] + position.number_pieces[PIECES.WHITEPAWN];
    ASSERT(pcount == both_pawns, `no. Both Pawns Mismatch\n Got: ${both_pawns} Expect: ${pcount}`);


    // check bitboards squares

    for (let square_64 = 0; square_64 <= 64; ++square_64) {
        if (ISKthBIT_SET(tmp_pawns[COLORS.WHITE], square_64)) {
            ASSERT(position.pieces[SQ120(square_64)] == PIECES.WHITEPAWN, `no. White Pawn BitBoard  Mismatch at ${SQ120(square_64)}`);
        }
    }
    for (let square_64 = 0; square_64 <= 64; ++square_64) {
        if (ISKthBIT_SET(tmp_pawns[COLORS.BLACK], square_64)) {
            ASSERT(position.pieces[SQ120(square_64)] == PIECES.BLACKPAWN, `no. White Pawn BitBoard  Mismatch at  ${SQ120(square_64)}`);
        }
    }
    for (let square_64 = 0; square_64 <= 64; ++square_64) {
        if (ISKthBIT_SET(tmp_pawns[COLORS.BOTH], square_64)) {
            ASSERT(position.pieces[SQ120(square_64)] == PIECES.BLACKPAWN || position.pieces[SQ120(square_64)] == PIECES.WHITEPAWN, `no. Both Pawns BitBoard Mismatch at ${SQ120(square_64)}`);
        }
    }

    ASSERT(tmp_material_eg[COLORS.WHITE] == position.material_eg[COLORS.WHITE] && tmp_material_eg[COLORS.BLACK] == position.material_eg[COLORS.BLACK], `eg Material imbalance`);
    ASSERT(tmp_material_mg[COLORS.WHITE] == position.material_mg[COLORS.WHITE] && tmp_material_mg[COLORS.BLACK] == position.material_mg[COLORS.BLACK], `mg Material imbalance`);
    ASSERT(tmp_number_minor_piece[COLORS.WHITE] == position.number_minor_pieces[COLORS.WHITE], `no. White minor piece Mismatch\n Got: ${position.number_minor_pieces[COLORS.WHITE]} Expect: ${tmp_number_minor_piece[COLORS.WHITE]}`);
    ASSERT(tmp_number_minor_piece[COLORS.BLACK] == position.number_minor_pieces[COLORS.BLACK], `no. Black minor piece Mismatch\n Got: ${position.number_minor_pieces[COLORS.BLACK]} Expect: ${tmp_number_minor_piece[COLORS.BLACK]}`);
    ASSERT(tmp_number_major_piece[COLORS.WHITE] == position.number_major_pieces[COLORS.WHITE], `no. White major piece Mismatch\n Got: ${position.number_major_pieces[COLORS.WHITE]} Expect: ${tmp_number_major_piece[COLORS.WHITE]}`)
    ASSERT(tmp_number_major_piece[COLORS.BLACK] == position.number_major_pieces[COLORS.BLACK], `no. Black major piece Mismatch\n Got: ${position.number_major_pieces[COLORS.BLACK]} Expect: ${tmp_number_major_piece[COLORS.BLACK]}`);
    ASSERT(tmp_number_big_piece[COLORS.WHITE] == position.number_big_pieces[COLORS.WHITE], `no. White big piece Mismatch\n Got: ${position.number_big_pieces[COLORS.WHITE]} Expect: ${tmp_number_big_piece[COLORS.WHITE]}`)
    ASSERT(tmp_number_big_piece[COLORS.BLACK] == position.number_big_pieces[COLORS.BLACK], `no. White big piece Mismatch\n Got: ${position.number_big_pieces[COLORS.BLACK]} Expect: ${tmp_number_big_piece[COLORS.BLACK]}`);

    ASSERT(position.turn == COLORS.WHITE || position.turn == COLORS.BLACK);
    ASSERT(polyglot_key(position) == position.current_polyglot_key, `no. Poly Key Mismatch\n Got: ${position.current_polyglot_key} Expect: ${polyglot_key(position)}`);

    ASSERT(position.enpassant == SQUARES.OFF_SQUARE || (ranks_board[position.enpassant] == RANKS.SIXTH_RANK && position.turn == COLORS.WHITE)
        || (ranks_board[position.enpassant] == RANKS.THIRD_RANK && position.turn == COLORS.BLACK), `eg Wrong empassant square`);

    ASSERT(position.pieces[position.king_square[COLORS.WHITE]] == PIECES.WHITEKING, `eg Wrong White king square`);
    ASSERT(position.pieces[position.king_square[COLORS.BLACK]] == PIECES.BLACKKING, `eg Wrong Black king square`);
}

function reset_board(board: board_t) {
    for (let i = 0; i < BOARD_SQUARE_NUM; i++) {
        board.pieces[i] = PIECES.OFF_BOARD_PIECE;
    }
    for (let i = 0; i < 64; i++) {
        board.pieces[SQ120(i)] = PIECES.EMPTY;
    }
    for (let i = 0; i < 2; i++) {
        board.number_big_pieces[i] = 0;
        board.number_major_pieces[i] = 0;
        board.number_minor_pieces[i] = 0;
        board.material_mg[i] = 0;
        board.material_eg[i] = 0;
    }
    for (let i = 0; i < 3; i++) {
        board.pawns[i] = 0n;
    }

    for (let i = 0; i < 13; i++) {
        board.number_pieces[i] = 0;
    }
    board.king_square[COLORS.BLACK] = board.king_square[COLORS.WHITE] = SQUARES.OFF_SQUARE;
    board.turn = COLORS.BOTH;
    board.enpassant = SQUARES.OFF_SQUARE;
    board.half_moves = 0;
    board.ply = 0;
    board.full_moves = 1;
    board.history_ply = 0;
    board.castling_right = 0;
    board.current_polyglot_key = 0n;
}

function update_list_material(board: board_t) {
    for (let square = 0; square < BOARD_SQUARE_NUM; square++) {
        let piece = board.pieces[square];
        if (SQUARE_ON_BOARD(square) && piece !== PIECES.OFF_BOARD_PIECE && piece !== PIECES.EMPTY) {
            let color = get_color_piece[piece];

            if (is_big_piece[piece]) board.number_big_pieces[color]++;
            if (is_major_piece[piece]) board.number_major_pieces[color]++;
            if (is_minor_piece[piece]) board.number_minor_pieces[color]++;

            board.material_mg[color] += get_value_piece[PHASE.MG][piece];
            board.material_eg[color] += get_value_piece[PHASE.EG][piece];
            board.piece_list[(PIECE_INDEX(piece, board.number_pieces[piece]))] = square;
            board.number_pieces[piece]++;

            if (piece === PIECES.WHITEKING) board.king_square[COLORS.WHITE] = square;
            if (piece === PIECES.BLACKKING) board.king_square[COLORS.BLACK] = square;

            //-- set pawns
            if (piece === PIECES.WHITEPAWN) {
                board.pawns[COLORS.WHITE] = SET_BIT(board.pawns[COLORS.WHITE], SQ64(square));
                board.pawns[COLORS.BOTH] = SET_BIT(board.pawns[COLORS.BOTH], SQ64(square));
            }
            else if (piece === PIECES.BLACKPAWN) {
                board.pawns[COLORS.BLACK] = SET_BIT(board.pawns[COLORS.BLACK], SQ64(square));
                board.pawns[COLORS.BOTH] = SET_BIT(board.pawns[COLORS.BOTH], SQ64(square));
            }
        }
    }
}

function mirror_board(board: board_t) {
    let tempPiecesArray = new Array(64);
    let tempSide = board.turn ^ 1;
    let SwapPiece = [
        PIECES.EMPTY,
        PIECES.BLACKPAWN,
        PIECES.BLACKBISHOP,
        PIECES.BLACKKNIGHT,
        PIECES.BLACKROOK,
        PIECES.BLACKQUEEN,
        PIECES.BLACKKING,
        PIECES.WHITEPAWN,
        PIECES.WHITEBISHOP,
        PIECES.WHITEKNIGHT,
        PIECES.WHITEROOK,
        PIECES.WHITEQUEEN,
        PIECES.WHITEKING,
        PIECES.OFF_BOARD_PIECE
    ];
    let tempCastlePerm = 0;
    let tempEnPas = SQUARES.OFF_SQUARE;

    let sq;
    let tp;

    if (board.castling_right & CASTLING.WHITE_CASTLE_OO) tempCastlePerm |= CASTLING.BLACK_CASTLE_OO;
    if (board.castling_right & CASTLING.WHITE_CASTLE_OOO) tempCastlePerm |= CASTLING.BLACK_CASTLE_OOO;

    if ((board.castling_right & CASTLING.BLACK_CASTLE_OO) !== 0) tempCastlePerm |= CASTLING.WHITE_CASTLE_OO;
    if ((board.castling_right & CASTLING.BLACK_CASTLE_OOO) !== 0) tempCastlePerm |= CASTLING.WHITE_CASTLE_OOO;

    if (board.enpassant !== SQUARES.OFF_SQUARE) {
        tempEnPas = SQ120(flip[SQ64(board.enpassant)]);
    }

    for (sq = 0; sq < 64; sq++) {
        tempPiecesArray[sq] = board.pieces[SQ120(flip[sq])];
    }
    let ply = board.ply;
    let history_ply = board.history_ply;
    let half = board.half_moves;

    reset_board(board);

    for (sq = 0; sq < 64; sq++) {
        tp = SwapPiece[tempPiecesArray[sq]];
        board.pieces[SQ120(sq)] = tp;
    }

    board.turn = tempSide;
    board.castling_right = tempCastlePerm;
    board.enpassant = tempEnPas;
    board.half_moves = half;
    board.ply = ply;
    board.history_ply = history_ply;
    board.current_polyglot_key = polyglot_key(board);

    update_list_material(board);
}

function board_to_ascii(board: board_t): string {
    let ascii_t = "\n +-----------------+\n";
    for (let rank = RANKS.EIGHTH_RANK; rank >= RANKS.FIRST_RANK; --rank) {
        ascii_t += (rank + 1).toString() + "| ";
        for (let file = FILES.A_FILE; file <= FILES.H_FILE; ++file) {
            let SQ120 = FILE_RANK_TO_SQUARE(file, rank);
            let piece = board.pieces[SQ120];
            ascii_t += ((piece_to_ascii[piece]) + " ");
        }
        ascii_t += "| \n";
    }

    ascii_t += " +-----------------+\n";
    ascii_t += "   a b c d e f g h\n";
    ascii_t += "        INFO         \n";
    ascii_t += "turn: " + ("wb-"[board.turn]) + '\n';
    ascii_t += "enpass: " + (board.enpassant).toString() + '\n';
    ascii_t += "castling: "
        + (((board.castling_right & CASTLING.WHITE_CASTLE_OO) !== 0) ? piece_to_ascii[PIECES.WHITEKING] : '')
        + (((board.castling_right & CASTLING.WHITE_CASTLE_OOO) !== 0) ? piece_to_ascii[PIECES.WHITEQUEEN] : '')
        + (((board.castling_right & CASTLING.BLACK_CASTLE_OO) !== 0) ? piece_to_ascii[PIECES.BLACKKING] : '')
        + (((board.castling_right & CASTLING.BLACK_CASTLE_OOO) !== 0) ? piece_to_ascii[PIECES.BLACKQUEEN] : '');
    ascii_t += ("\npoly key: 0x" + board.current_polyglot_key.toString(16) + '\n');

    return ascii_t;
}

//-- square
function square_to_algebraic(square: SQUARES) {
    let file = 'a'.charCodeAt(0) + files_board[square];
    let rank = '1'.charCodeAt(0) + ranks_board[square];
    return String.fromCharCode(file) + String.fromCharCode(rank);
}

/*****************************************************************************
 * FEN
 ****************************************************************************/
function fen_to_board(fen: string, board: board_t) {
    let rank = RANKS.EIGHTH_RANK;
    let file = FILES.A_FILE;
    let n = fen.length;
    let piece = 0;
    let count = 0;
    let square_64_ = 0;
    let square_120_ = 0;
    let i = 0;
    ASSERT(n != 0, "Empty fen provided")

    reset_board(board);
    while ((rank >= RANKS.FIRST_RANK) && (i < n)) {
        count = 1;
        switch (fen[i]) {
            case 'p': piece = PIECES.BLACKPAWN; break;
            case 'r': piece = PIECES.BLACKROOK; break;
            case 'n': piece = PIECES.BLACKKNIGHT; break;
            case 'b': piece = PIECES.BLACKBISHOP; break;
            case 'k': piece = PIECES.BLACKKING; break;
            case 'q': piece = PIECES.BLACKQUEEN; break;
            case 'Q': piece = PIECES.WHITEQUEEN; break;
            case 'K': piece = PIECES.WHITEKING; break;
            case 'N': piece = PIECES.WHITEKNIGHT; break;
            case 'R': piece = PIECES.WHITEROOK; break;
            case 'B': piece = PIECES.WHITEBISHOP; break;
            case 'P': piece = PIECES.WHITEPAWN; break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
                piece = PIECES.EMPTY;
                count = fen[i].charCodeAt(0) - '0'.charCodeAt(0);
                break;
            case '/':
            case ' ':
                rank--;
                file = FILES.A_FILE;
                i++;
                continue;
            default:
                ASSERT(false, `Illegal character ${fen[i]}`);
        }
        for (let j = 0; j < count; j++) {
            square_64_ = rank * 8 + file;
            square_120_ = SQ120(square_64_);
            if (piece !== PIECES.EMPTY) {
                board.pieces[square_120_] = piece;
            }
            file++;
        }
        i++;
    }

    if (!(fen[i] === 'w' || fen[i] === 'b')) {
        ASSERT(false, `Side to move is invalid. It should be w or b`);
    }
    board.turn = (fen[i] === 'w') ? COLORS.WHITE : COLORS.BLACK;
    i += 2;

    for (let j = 0; j < 4; j++) {
        if (fen[i] === ' ') {
            break;
        }
        switch (fen[i]) {
            case 'K': board.castling_right |= CASTLING.WHITE_CASTLE_OO; break;
            case 'Q': board.castling_right |= CASTLING.WHITE_CASTLE_OOO; break;
            case 'k': board.castling_right |= CASTLING.BLACK_CASTLE_OO; break;
            case 'q': board.castling_right |= CASTLING.BLACK_CASTLE_OOO; break;
            default: break;
        }
        i++;
    }
    i++;

    if (fen[i] !== '-') {
        file = fen.charCodeAt(i) - 'a'.charCodeAt(0);
        rank = fen.charCodeAt(++i) - '1'.charCodeAt(0);

        if (!(file >= FILES.A_FILE && file <= FILES.H_FILE)
            || !(rank >= RANKS.FIRST_RANK && rank <= RANKS.EIGHTH_RANK)) {
            ASSERT(false, `Invalid en-passant square`);
        }
        board.enpassant = FILE_RANK_TO_SQUARE(file, rank);
    }
    i++;
    let half = "";
    i++;
    while (fen[i] !== ' ') {
        half += fen[i++];
    }
    i++;
    let half_move = parseInt(half);
    if (half_move < 0) ASSERT(false, `Half move cannot be a negative integer. GOT ${half_move}`);

    let full = "";
    while (i < n) {
        full += fen[i++];
    }

    let full_move = parseInt(full);
    if (full_move < 1) ASSERT(false, `Full move must be greater than 0. GOT ${full_move}`);

    board.half_moves = half_move;
    board.history_ply = 0;
    board.ply = 0;
    board.full_moves = full_move;
    board.current_polyglot_key = polyglot_key(board);
    update_list_material(board);
    try {
        check_board(board)
    }
    catch (err) {
        ASSERT(false, `Cannot not parse fen`);
    }

}
function board_to_fen(board: board_t) {
    let fen_str = "";
    let empty = 0;

    for (let rank = RANKS.EIGHTH_RANK; rank >= RANKS.FIRST_RANK; --rank) {
        for (let file = FILES.A_FILE; file <= FILES.H_FILE; file++) {
            let sq = FILE_RANK_TO_SQUARE(file, rank);
            let piece = board.pieces[sq];
            if (piece === PIECES.EMPTY) {
                empty++;
            }
            else {
                if (empty > 0) {
                    fen_str += empty.toString();
                    empty = 0;
                }
                fen_str += piece_to_ascii[piece];

            }
        }
        if (empty > 0) {
            fen_str += empty.toString();
        }
        if (rank !== RANKS.FIRST_RANK) fen_str += '/';
        empty = 0;
    }

    fen_str += (board.turn === COLORS.WHITE) ? " w " : " b ";
    var cflag = "";
    if ((board.castling_right & CASTLING.WHITE_CASTLE_OO) !== 0) {
        cflag += 'K';
    }
    if ((board.castling_right & CASTLING.WHITE_CASTLE_OOO) !== 0) {
        cflag += 'Q';
    }
    if ((board.castling_right & CASTLING.BLACK_CASTLE_OO) !== 0) {
        cflag += 'k';
    }
    if ((board.castling_right & CASTLING.BLACK_CASTLE_OOO) !== 0) {
        cflag += 'q';
    }

    fen_str += (cflag !== "") ? cflag : "-";
    fen_str += ' ';
    let en_sq = board.enpassant;
    fen_str += (en_sq !== SQUARES.OFF_SQUARE) ? square_to_algebraic(en_sq) : "-";
    fen_str += ' ';
    fen_str += board.half_moves.toString();
    fen_str += ' ';
    fen_str += board.full_moves.toString();

    return fen_str;
}