// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as hash_ from './hash'
import * as move_ from './move'

enum Pieces {
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
}
enum Files { A_FILE, B_FILE, C_FILE, D_FILE, E_FILE, F_FILE, G_FILE, H_FILE, NONE_FILE }
enum Ranks {
    FIRST_RANK,
    SECOND_RANK,
    THIRD_RANK,
    FOURTH_RANK,
    FIFTH_RANK,
    SIXTH_RANK,
    SEVENTH_RANK,
    EIGHTH_RANK,
    NONE_RANK
}
enum Colors { WHITE, BLACK, BOTH }
enum Squares {
    A1 = 21, B1, C1, D1, E1, F1, G1, H1,
    A2 = 31, B2, C2, D2, E2, F2, G2, H2,
    A3 = 41, B3, C3, D3, E3, F3, G3, H3,
    A4 = 51, B4, C4, D4, E4, F4, G4, H4,
    A5 = 61, B5, C5, D5, E5, F5, G5, H5,
    A6 = 71, B6, C6, D6, E6, F6, G6, H6,
    A7 = 81, B7, C7, D7, E7, F7, G7, H7,
    A8 = 91, B8, C8, D8, E8, F8, G8, H8, OFF_SQUARE, OFF_BOARD, ALL
}
enum Castling {
    WHITE_CASTLE_OO = 1 << 0,
    WHITE_CASTLE_OOO = 1 << 1,
    BLACK_CASTLE_OO = 1 << 2,
    BLACK_CASTLE_OOO = 1 << 3
}


type bitboard_t = bigint
type undo_t = {
    move: move_.move_t;

    enpassant: Squares;
    turn: Colors;
    halfMoves: number;
    castlingRight: number;

    ply: number;
    fullMoves: number;
    historyPly: number;
    currentPolyglotKey: bitboard_t;

    materialEg: number[];
    materialMg: number[];
}
type board_t = {
    pieces: Pieces[];
    pawns: bitboard_t[];
    kingSquare: Squares[];

    enpassant: Squares;
    turn: Colors;
    halfMoves: number;
    fullMoves: number;
    castlingRight: number;

    ply: number;
    historyPly: number;

    currentPolyglotKey: bitboard_t;

    materialEg: number[];
    materialMg: number[];

    piecesBB: bitboard_t[];

    numberPieces: number[];
    numberBigPieces: number[];
    numberMajorPieces: number[];
    numberMinorPieces: number[];

    pieceList: Squares[];
    moveHistory: undo_t[];
}
type piece_t = { type: string, color: string };
type position_t = {
    board: (piece_t | null)[][]; // chessboard
    castling: [boolean, boolean, boolean, boolean];// castling right: [K, Q, k, q]
    enpassant: string  // enpassant
    turn: string // side to move
    moveCount: [number, number] // move counts: [half move, full, move]
}


/*****************************************************************************
 * MACRO
 ****************************************************************************/
function FILE_RANK_TO_SQUARE(file: number, rank: number): number { return ((21 + (file)) + ((rank) * 10)); }
function SQ64(SQ120: number): number { return (util_.square120ToSquare64[(SQ120)]); }
function SQ120(square64: number): number { return (util_.square64ToSquare120[(square64)]); }
function FLIP64(sq: Squares): number { return (util_.flip[(sq)]) }

function SQUARE_ON_BOARD(sq: Squares): boolean { return (util_.filesBoard[(sq)] !== Squares.OFF_BOARD); }
function IS_VALID_PIECE(pce: Pieces): boolean { return ((pce) >= Pieces.WHITEPAWN && (pce) <= Pieces.BLACKKING) }
//function IS_VALID_TURN(turn: Colors) { return ((turn) == Colors.WHITE || (turn) == Colors.BLACK) }
//function IS_VALID_FILE_RANK(fr: number) { return ((fr) >= 0 && (fr) <= 7) }

function SQUARE_COLOR(sq: Squares): Colors { return (util_.ranksBoard[(sq)] + util_.filesBoard[(sq)]) % 2 === 0 ? Colors.BLACK : Colors.WHITE; }
function PIECE_INDEX(piece: number, piece_num: number): number { return (piece * 10 + piece_num) }
function SQ64BB(square64: number): bigint { return 1n << BigInt(square64); }


/*****************************************************************************
* BOARD POSITION
****************************************************************************/
function checkBoard(position: board_t): void {
    const tmpNumberPiece = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const tmpPieceBB = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];
    const tmpNumberbigPiece = [0, 0];
    const tmpNumbermajorPiece = [0, 0];
    const tmpNumberminorPiece = [0, 0];
    const tmpMaterialEg = [0, 0];
    const tmpMaterialMg = [0, 0];

    const tmp_pawns = [0n, 0n, 0n];
    tmp_pawns[Colors.WHITE] = position.pawns[Colors.WHITE];
    tmp_pawns[Colors.BLACK] = position.pawns[Colors.BLACK];
    tmp_pawns[Colors.BOTH] = position.pawns[Colors.BOTH];


    // check piece lists
    for (let p = Pieces.WHITEPAWN; p <= Pieces.BLACKKING; ++p) {
        for (let p_num = 0; p_num < position.numberPieces[p]; ++p_num) {
            const SQ120: number = position.pieceList[PIECE_INDEX(p, p_num)]
            util_.ASSERT(position.pieces[SQ120] == p, `BoardErr: Piece List Mismatch\n Got: ${util_.pieceToAscii[position.pieces[SQ120]]} Expect: ${util_.pieceToAscii[p]}`);
        }
    }

    // check piece count and other counters
    for (let square64 = 0; square64 < 64; ++square64) {
        const sq120 = SQ120(square64);
        const p = position.pieces[sq120];
        tmpNumberPiece[p]++;
        tmpPieceBB[p] |= SQ64BB(square64);
        const color = util_.getColorPiece[p];
        if (util_.isBigPiece[p]) tmpNumberbigPiece[color]++;
        if (util_.isMinorPiece[p]) tmpNumberminorPiece[color]++;
        if (util_.isMajorPiece[p]) tmpNumbermajorPiece[color]++;

        tmpMaterialEg[color] += util_.getValuePiece[util_.Phase.EG][p];
        tmpMaterialMg[color] += util_.getValuePiece[util_.Phase.MG][p];
    }

    for (let p = Pieces.WHITEPAWN; p <= Pieces.BLACKKING; ++p) {
        util_.ASSERT(tmpNumberPiece[p] == position.numberPieces[p], `BoardErr: no. of Pieces Mismatch\n Got: ${position.numberPieces[p]} Expect: ${tmpNumberPiece[p]}`);
        util_.ASSERT(tmpPieceBB[p] == position.piecesBB[p], `BoardErr: no. of Pieces BB Mismatch\n Got: ${position.piecesBB[p]} Expect: ${tmpPieceBB[p]}`);
        util_.ASSERT(position.numberPieces[p] == util_.POP_COUNT(position.piecesBB[p]), `BoardErr: no. of Pieces BB Mismatch no Pieces\n Got: ${position.piecesBB[p]} Expect: ${position.numberPieces[p]}`);
    }

    // check bitboards count
    let pcount = util_.POP_COUNT(tmp_pawns[Colors.WHITE]);
    util_.ASSERT(pcount == position.numberPieces[Pieces.WHITEPAWN], `BoardErr: no. White Pawns Mismatch\n Got: ${position.numberPieces[Pieces.WHITEPAWN]} Expect: ${pcount}`);
    pcount = util_.POP_COUNT(tmp_pawns[Colors.BLACK]);
    util_.ASSERT(pcount == position.numberPieces[Pieces.BLACKPAWN], `BoardErr: no. Black Pawns Mismatch\n Got: ${position.numberPieces[Pieces.BLACKPAWN]} Expect: ${pcount}`);
    pcount = util_.POP_COUNT(tmp_pawns[Colors.BOTH]);
    const both_pawns = position.numberPieces[Pieces.BLACKPAWN] + position.numberPieces[Pieces.WHITEPAWN];
    util_.ASSERT(pcount == both_pawns, `BoardErr: no. Both Pawns Mismatch\n Got: ${both_pawns} Expect: ${pcount}`);


    // check bitboards squares

    for (let square64 = 0; square64 <= 64; ++square64) {
        if (util_.ISKthBIT_SET(tmp_pawns[Colors.WHITE], square64)) {
            util_.ASSERT(position.pieces[SQ120(square64)] == Pieces.WHITEPAWN, `BoardErr: no. White Pawn BitBoard  Mismatch at ${SQ120(square64)}`);
        }
    }
    for (let square64 = 0; square64 <= 64; ++square64) {
        if (util_.ISKthBIT_SET(tmp_pawns[Colors.BLACK], square64)) {
            util_.ASSERT(position.pieces[SQ120(square64)] == Pieces.BLACKPAWN, `BoardErr: no. White Pawn BitBoard  Mismatch at  ${SQ120(square64)}`);
        }
    }
    for (let square64 = 0; square64 <= 64; ++square64) {
        if (util_.ISKthBIT_SET(tmp_pawns[Colors.BOTH], square64)) {
            util_.ASSERT(position.pieces[SQ120(square64)] == Pieces.BLACKPAWN || position.pieces[SQ120(square64)] == Pieces.WHITEPAWN, `BoardErr: no. Both Pawns BitBoard Mismatch at ${SQ120(square64)}`);
        }
    }

    util_.ASSERT(tmpMaterialEg[Colors.WHITE] == position.materialEg[Colors.WHITE], `BoardErr: White eg Material imbalance. Got: ${position.materialEg[Colors.WHITE]} Expect: ${tmpMaterialEg[Colors.WHITE]}`);
    util_.ASSERT(tmpMaterialMg[Colors.WHITE] == position.materialMg[Colors.WHITE], `BoardErr: White mg Material imbalance. Got: ${position.materialMg[Colors.WHITE]} Expect: ${tmpMaterialMg[Colors.WHITE]}`);
    util_.ASSERT(tmpMaterialEg[Colors.BLACK] == position.materialEg[Colors.BLACK], `BoardErr: BLACK eg Material imbalance. Got: ${position.materialEg[Colors.BLACK]} Expect: ${tmpMaterialEg[Colors.BLACK]}`);
    util_.ASSERT(tmpMaterialMg[Colors.BLACK] == position.materialMg[Colors.BLACK], `BoardErr: BLACK mg Material imbalance. Got: ${position.materialMg[Colors.BLACK]} Expect: ${tmpMaterialMg[Colors.BLACK]}`);

    util_.ASSERT(tmpNumberminorPiece[Colors.WHITE] == position.numberMinorPieces[Colors.WHITE], `BoardErr: no. White minor piece Mismatch\n Got: ${position.numberMinorPieces[Colors.WHITE]} Expect: ${tmpNumberminorPiece[Colors.WHITE]}`);
    util_.ASSERT(tmpNumberminorPiece[Colors.BLACK] == position.numberMinorPieces[Colors.BLACK], `BoardErr: no. Black minor piece Mismatch\n Got: ${position.numberMinorPieces[Colors.BLACK]} Expect: ${tmpNumberminorPiece[Colors.BLACK]}`);
    util_.ASSERT(tmpNumbermajorPiece[Colors.WHITE] == position.numberMajorPieces[Colors.WHITE], `BoardErr: no. White major piece Mismatch\n Got: ${position.numberMajorPieces[Colors.WHITE]} Expect: ${tmpNumbermajorPiece[Colors.WHITE]}`)
    util_.ASSERT(tmpNumbermajorPiece[Colors.BLACK] == position.numberMajorPieces[Colors.BLACK], `BoardErr: no. Black major piece Mismatch\n Got: ${position.numberMajorPieces[Colors.BLACK]} Expect: ${tmpNumbermajorPiece[Colors.BLACK]}`);
    util_.ASSERT(tmpNumberbigPiece[Colors.WHITE] == position.numberBigPieces[Colors.WHITE], `BoardErr: no. White big piece Mismatch\n Got: ${position.numberBigPieces[Colors.WHITE]} Expect: ${tmpNumberbigPiece[Colors.WHITE]}`)
    util_.ASSERT(tmpNumberbigPiece[Colors.BLACK] == position.numberBigPieces[Colors.BLACK], `BoardErr: no. White big piece Mismatch\n Got: ${position.numberBigPieces[Colors.BLACK]} Expect: ${tmpNumberbigPiece[Colors.BLACK]}`);

    util_.ASSERT(position.turn == Colors.WHITE || position.turn == Colors.BLACK);
    util_.ASSERT(hash_.polyglotKey(position) == position.currentPolyglotKey, `BoardErr: no. Poly Key Mismatch\n Got: ${position.currentPolyglotKey} Expect: ${hash_.polyglotKey(position)}`);

    util_.ASSERT(position.enpassant == Squares.OFF_SQUARE || (util_.ranksBoard[position.enpassant] == Ranks.SIXTH_RANK && position.turn == Colors.WHITE)
        || (util_.ranksBoard[position.enpassant] == Ranks.THIRD_RANK && position.turn == Colors.BLACK), `BoardErr: eg Wrong empassant square`);

    util_.ASSERT(position.pieces[position.kingSquare[Colors.WHITE]] == Pieces.WHITEKING, `BoardErr: Wrong White king square`);
    util_.ASSERT(position.pieces[position.kingSquare[Colors.BLACK]] == Pieces.BLACKKING, `BoardErr: Wrong Black king square`);
}

function getTurn(board: board_t): string {
    return "wb-"[board.turn];
}
function newBoard(): board_t {
    return {
        pieces: new Array<Pieces>(util_.BOARD_SQUARE_NUM),
        kingSquare: new Array<Squares>(2),
        pawns: new Array<bitboard_t>(3),

        enpassant: Squares.OFF_SQUARE,
        turn: Colors.BOTH,
        halfMoves: 0,
        fullMoves: 0,
        castlingRight: 0,

        ply: 0,
        historyPly: 0,

        currentPolyglotKey: 0n,

        materialEg: new Array<number>(2),
        materialMg: new Array<number>(2),

        piecesBB: new Array<bitboard_t>(13),

        numberPieces: new Array<number>(13),
        numberBigPieces: new Array<number>(2),
        numberMajorPieces: new Array<number>(2),
        numberMinorPieces: new Array<number>(2),

        pieceList: new Array<Squares>(13 * 10),
        moveHistory: new Array<undo_t>(util_.MAX_MOVES),
    };
}

function clearBoard(board: board_t): void {
    for (let i = 0; i < util_.BOARD_SQUARE_NUM; i++) {
        board.pieces[i] = Pieces.OFF_BOARD_PIECE;
    }
    for (let i = 0; i < 64; i++) {
        board.pieces[SQ120(i)] = Pieces.EMPTY;
    }
    for (let i = 0; i < 2; i++) {
        board.numberBigPieces[i] = 0;
        board.numberMajorPieces[i] = 0;
        board.numberMinorPieces[i] = 0;
        board.materialMg[i] = 0;
        board.materialEg[i] = 0;
    }
    for (let i = 0; i < 3; i++) {
        board.pawns[i] = 0n;
    }

    for (let i = 0; i < 13; i++) {
        board.numberPieces[i] = 0;
        board.piecesBB[i] = 0n;
    }
    board.kingSquare[Colors.BLACK] = board.kingSquare[Colors.WHITE] = Squares.OFF_SQUARE;
    board.turn = Colors.WHITE; // Generally cleard board sets turn to white
    board.enpassant = Squares.OFF_SQUARE;
    board.halfMoves = 0;
    board.ply = 0;
    board.fullMoves = 1;
    board.historyPly = 0;
    board.castlingRight = 0;
    board.currentPolyglotKey = 0n;
}

function updateMaterialList(board: board_t) {
    for (let square = 0; square < util_.BOARD_SQUARE_NUM; square++) {
        const piece = board.pieces[square];
        if (SQUARE_ON_BOARD(square) && piece !== Pieces.OFF_BOARD_PIECE && piece !== Pieces.EMPTY) {
            const color = util_.getColorPiece[piece];

            if (util_.isBigPiece[piece]) board.numberBigPieces[color]++;
            if (util_.isMajorPiece[piece]) board.numberMajorPieces[color]++;
            if (util_.isMinorPiece[piece]) board.numberMinorPieces[color]++;

            board.materialMg[color] += util_.getValuePiece[util_.Phase.MG][piece];
            board.materialEg[color] += util_.getValuePiece[util_.Phase.EG][piece];
            board.pieceList[(PIECE_INDEX(piece, board.numberPieces[piece]))] = square;
            board.numberPieces[piece]++;

            board.piecesBB[piece] |= SQ64BB(SQ64(square));

            if (piece === Pieces.WHITEKING) board.kingSquare[Colors.WHITE] = square;
            if (piece === Pieces.BLACKKING) board.kingSquare[Colors.BLACK] = square;

            //-- set pawns
            if (piece === Pieces.WHITEPAWN) {
                board.pawns[Colors.WHITE] |= SQ64BB(SQ64(square));
                board.pawns[Colors.BOTH] |= SQ64BB(SQ64(square));
            }
            else if (piece === Pieces.BLACKPAWN) {
                board.pawns[Colors.BLACK] |= SQ64BB(SQ64(square));
                board.pawns[Colors.BOTH] |= SQ64BB(SQ64(square));
            }
        }
    }
}

function mirrorBoard(board: board_t): void {
    const tempPiecesArray = new Array<Pieces>(64);
    const tempSide = board.turn ^ 1;
    const SwapPiece = [
        Pieces.EMPTY,
        Pieces.BLACKPAWN,
        Pieces.BLACKBISHOP,
        Pieces.BLACKKNIGHT,
        Pieces.BLACKROOK,
        Pieces.BLACKQUEEN,
        Pieces.BLACKKING,
        Pieces.WHITEPAWN,
        Pieces.WHITEBISHOP,
        Pieces.WHITEKNIGHT,
        Pieces.WHITEROOK,
        Pieces.WHITEQUEEN,
        Pieces.WHITEKING,
        Pieces.OFF_BOARD_PIECE
    ];
    let tempCastlePerm = 0;
    let tempEnPas = Squares.OFF_SQUARE;

    let sq: Squares;
    let tp: Pieces;

    if (board.castlingRight & Castling.WHITE_CASTLE_OO) tempCastlePerm |= Castling.BLACK_CASTLE_OO;
    if (board.castlingRight & Castling.WHITE_CASTLE_OOO) tempCastlePerm |= Castling.BLACK_CASTLE_OOO;

    if ((board.castlingRight & Castling.BLACK_CASTLE_OO) !== 0) tempCastlePerm |= Castling.WHITE_CASTLE_OO;
    if ((board.castlingRight & Castling.BLACK_CASTLE_OOO) !== 0) tempCastlePerm |= Castling.WHITE_CASTLE_OOO;

    if (board.enpassant !== Squares.OFF_SQUARE) {
        tempEnPas = SQ120(FLIP64(SQ64(board.enpassant)));
    }

    for (sq = 0; sq < 64; sq++) {
        tempPiecesArray[sq] = board.pieces[SQ120(FLIP64(sq))];
    }
    const ply = board.ply;
    const historyPly = board.historyPly;
    const half = board.halfMoves;

    clearBoard(board);

    for (sq = 0; sq < 64; sq++) {
        tp = SwapPiece[tempPiecesArray[sq]];
        board.pieces[SQ120(sq)] = tp;
    }

    board.turn = tempSide;
    board.castlingRight = tempCastlePerm;
    board.enpassant = tempEnPas;
    board.halfMoves = half;
    board.ply = ply;
    board.historyPly = historyPly;
    board.currentPolyglotKey = hash_.polyglotKey(board);

    updateMaterialList(board);
}

function getInfo(board: board_t): string {
    let ascii_t = "INFO:\n";
    ascii_t += "turn: " + (getTurn(board)) + '\n';
    ascii_t += "enpass: " + ((board.enpassant === Squares.OFF_SQUARE) ? "-" : squareToAlgebraic(board.enpassant)) + '\n';
    ascii_t += "castling: "
        + (((board.castlingRight & Castling.WHITE_CASTLE_OO) !== 0) ? util_.pieceToAscii[Pieces.WHITEKING] : '')
        + (((board.castlingRight & Castling.WHITE_CASTLE_OOO) !== 0) ? util_.pieceToAscii[Pieces.WHITEQUEEN] : '')
        + (((board.castlingRight & Castling.BLACK_CASTLE_OO) !== 0) ? util_.pieceToAscii[Pieces.BLACKKING] : '')
        + (((board.castlingRight & Castling.BLACK_CASTLE_OOO) !== 0) ? util_.pieceToAscii[Pieces.BLACKQUEEN] : '');
    ascii_t += ("\npoly key: 0x" + board.currentPolyglotKey.toString(16) + "\n");
    return ascii_t
}

function boardToANSI(board: board_t, white_piece: string, black_piece: string, light_square: string, dark_square: string, show_info: boolean): string {
    let ansi_t = "    a  b  c  d  e  f  g  h\n";
    for (let rank = Ranks.EIGHTH_RANK; rank >= Ranks.FIRST_RANK; --rank) {
        ansi_t += ` ${(rank + 1).toString()} `;
        for (let file = Files.A_FILE; file <= Files.H_FILE; ++file) {
            const SQ120 = FILE_RANK_TO_SQUARE(file, rank);
            const piece = board.pieces[SQ120];
            ansi_t += [
                (SQUARE_COLOR(SQ120) === Colors.WHITE) ? light_square : dark_square,
                (util_.isWhitePiece[piece]) ? white_piece : black_piece,
                ` ${util_.pieceToUnicode[piece]} `,
                '\u001b[0m',
            ].join('');

        }
        ansi_t += ` ${(rank + 1).toString()}\n`;
    }

    ansi_t += "    a  b  c  d  e  f  g  h\n\n";

    return (show_info) ? ansi_t + getInfo(board) : ansi_t
}
function boardToASCII(board: board_t, parser: string[], light_square: string, dark_square: string, show_info: boolean): string {
    let ascii_t = "   A B C D E F G H   \n";
    ascii_t += "\n";
    for (let rank = Ranks.EIGHTH_RANK; rank >= Ranks.FIRST_RANK; --rank) {
        ascii_t += (rank + 1).toString() + "  ";
        for (let file = Files.A_FILE; file <= Files.H_FILE; ++file) {
            const SQ120 = FILE_RANK_TO_SQUARE(file, rank);
            const piece = board.pieces[SQ120];
            if (piece === Pieces.EMPTY) {
                ascii_t += (SQUARE_COLOR(SQ120) === Colors.WHITE) ? light_square + " " : dark_square + " ";
            } else {
                ascii_t += ((parser[piece - 1]) + " ");
            }

        }
        ascii_t += " " + (rank + 1).toString() + "\n";
    }

    ascii_t += "\n";
    ascii_t += "   A B C D E F G H   \n";

    return (show_info) ? ascii_t + getInfo(board) : ascii_t
}

function boardToPosition_t(board: board_t): position_t {
    const position = {} as position_t
    const b: (piece_t | null)[][] = [];
    let r_str: (piece_t | null)[];
    for (let rank = Ranks.EIGHTH_RANK; rank >= Ranks.FIRST_RANK; --rank) {
        r_str = [];
        for (let file = Files.A_FILE; file <= Files.H_FILE; ++file) {
            const p = board.pieces[FILE_RANK_TO_SQUARE(file, rank)];
            if (p === Pieces.EMPTY) {
                r_str.push(null);
            } else {
                r_str.push(
                    {
                        type: util_.pieceToAscii[p].toLowerCase(),
                        color: util_.isWhitePiece[p] ? "w" : "b"
                    }
                );
            }

        }
        b.push(r_str);
    }
    position.board = b;
    position.turn = getTurn(board);
    position.enpassant = (board.enpassant === Squares.OFF_SQUARE) ? "-" : squareToAlgebraic(board.enpassant);
    position.moveCount = [board.halfMoves, board.fullMoves];
    position.castling = [
        ((board.castlingRight & Castling.WHITE_CASTLE_OO) !== 0),
        ((board.castlingRight & Castling.WHITE_CASTLE_OOO) !== 0),
        ((board.castlingRight & Castling.BLACK_CASTLE_OO) !== 0),
        ((board.castlingRight & Castling.BLACK_CASTLE_OOO) !== 0)
    ];

    return position;
}

function bitboardToString(board: bitboard_t): string {
    let cout = "  +-----------------+\n";

    for (let rank = Ranks.EIGHTH_RANK; rank >= Ranks.FIRST_RANK; --rank) {
        cout += `${(rank + 1)} | `;
        for (let file = Files.A_FILE; file <= Files.H_FILE; ++file) {
            if (util_.ISKthBIT_SET(board, SQ64(FILE_RANK_TO_SQUARE(file, rank)))) {
                cout += "X ";
            }
            else {
                cout += ". ";
            }
        }
        cout += "|\n";
    }
    cout += "  +-----------------+\n";
    cout += "   a b c d e f g h\n";

    return cout;
}

//-- square
function squareToAlgebraic(square: Squares): string {
    const file = 'a'.charCodeAt(0) + util_.filesBoard[square];
    const rank = '1'.charCodeAt(0) + util_.ranksBoard[square];
    return String.fromCharCode(file) + String.fromCharCode(rank);
}
function algebraicToSquare(square: string): Squares {
    if (square[1].charCodeAt(0) > '8'.charCodeAt(0) || square[1].charCodeAt(0) < '1'.charCodeAt(0)) return Squares.OFF_BOARD;
    if (square[0].charCodeAt(0) > 'h'.charCodeAt(0) || square[0].charCodeAt(0) < 'a'.charCodeAt(0)) return Squares.OFF_BOARD;
    return FILE_RANK_TO_SQUARE(
        square[0].charCodeAt(0) - 'a'.charCodeAt(0), square[1].charCodeAt(0) - '1'.charCodeAt(0)
    );
}

/*****************************************************************************
 * FEN
 ****************************************************************************/
function fenToBoard(fen: string, board: board_t): void {
    let rank = Ranks.EIGHTH_RANK;
    let file = Files.A_FILE;
    const n = fen.length;
    let piece = 0;
    let count = 0;
    let square64_ = 0;
    let square_120_ = 0;
    let i = 0;
    util_.ASSERT(n != 0, "FenErr: Empty fen provided")

    clearBoard(board);
    while ((rank >= Ranks.FIRST_RANK) && (i < n)) {
        count = 1;
        switch (fen[i]) {
            case 'p': piece = Pieces.BLACKPAWN; break;
            case 'r': piece = Pieces.BLACKROOK; break;
            case 'n': piece = Pieces.BLACKKNIGHT; break;
            case 'b': piece = Pieces.BLACKBISHOP; break;
            case 'k': piece = Pieces.BLACKKING; break;
            case 'q': piece = Pieces.BLACKQUEEN; break;
            case 'Q': piece = Pieces.WHITEQUEEN; break;
            case 'K': piece = Pieces.WHITEKING; break;
            case 'N': piece = Pieces.WHITEKNIGHT; break;
            case 'R': piece = Pieces.WHITEROOK; break;
            case 'B': piece = Pieces.WHITEBISHOP; break;
            case 'P': piece = Pieces.WHITEPAWN; break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
                piece = Pieces.EMPTY;
                count = fen[i].charCodeAt(0) - '0'.charCodeAt(0);
                break;
            case '/':
            case ' ':
                rank--;
                file = Files.A_FILE;
                i++;
                continue;
            default:
                util_.ASSERT(false, `FenErr: Illegal character ${fen[i]}`);
        }
        for (let j = 0; j < count; j++) {
            square64_ = rank * 8 + file;
            square_120_ = SQ120(square64_);
            if (piece !== Pieces.EMPTY) {
                board.pieces[square_120_] = piece;
            }
            file++;
        }
        i++;
    }

    if (!(fen[i] === 'w' || fen[i] === 'b')) {
        util_.ASSERT(false, `FenErr: Side to move is invalid. It should be w or b`);
    }
    board.turn = (fen[i] === 'w') ? Colors.WHITE : Colors.BLACK;
    i += 2;

    for (let j = 0; j < 4; j++) {
        if (fen[i] === ' ') {
            break;
        }
        switch (fen[i]) {
            case 'K': board.castlingRight |= Castling.WHITE_CASTLE_OO; break;
            case 'Q': board.castlingRight |= Castling.WHITE_CASTLE_OOO; break;
            case 'k': board.castlingRight |= Castling.BLACK_CASTLE_OO; break;
            case 'q': board.castlingRight |= Castling.BLACK_CASTLE_OOO; break;
            default: break;
        }
        i++;
    }
    i++;

    if (fen[i] !== '-') {
        file = fen.charCodeAt(i) - 'a'.charCodeAt(0);
        rank = fen.charCodeAt(++i) - '1'.charCodeAt(0);

        if (!(file >= Files.A_FILE && file <= Files.H_FILE)
            || !(rank >= Ranks.FIRST_RANK && rank <= Ranks.EIGHTH_RANK)) {
            util_.ASSERT(false, `FenErr: Invalid en-passant square`);
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
    const halfMove = parseInt(half);
    if (halfMove < 0) util_.ASSERT(false, `FenErr: Half move cannot be a negative integer. GOT ${halfMove}`);

    let full = "";
    while (i < n) {
        full += fen[i++];
    }

    const fullMove = parseInt(full);
    if (fullMove < 1) util_.ASSERT(false, `FenErr: Full move must be greater than 0. GOT ${fullMove}`);

    board.halfMoves = halfMove;
    board.historyPly = 0;
    board.ply = 0;
    board.fullMoves = fullMove;
    board.currentPolyglotKey = hash_.polyglotKey(board);

    updateMaterialList(board);
    try {
        checkBoard(board)
    }
    catch (err) {
        util_.ASSERT(false, `FenErr: Cannot not parse fen due to ${(err as Error).message}`);
    }

}

function boardToFen(board: board_t): string {
    let fen_str = "";
    let empty = 0;

    for (let rank = Ranks.EIGHTH_RANK; rank >= Ranks.FIRST_RANK; --rank) {
        for (let file = Files.A_FILE; file <= Files.H_FILE; file++) {
            const sq = FILE_RANK_TO_SQUARE(file, rank);
            const piece = board.pieces[sq];
            if (piece === Pieces.EMPTY) {
                empty++;
            }
            else {
                if (empty > 0) {
                    fen_str += empty.toString();
                    empty = 0;
                }
                fen_str += util_.pieceToAscii[piece];

            }
        }
        if (empty > 0) {
            fen_str += empty.toString();
        }
        if (rank !== Ranks.FIRST_RANK) fen_str += '/';
        empty = 0;
    }

    fen_str += (board.turn === Colors.WHITE) ? " w " : " b ";
    let cflag = "";
    if ((board.castlingRight & Castling.WHITE_CASTLE_OO) !== 0) {
        cflag += 'K';
    }
    if ((board.castlingRight & Castling.WHITE_CASTLE_OOO) !== 0) {
        cflag += 'Q';
    }
    if ((board.castlingRight & Castling.BLACK_CASTLE_OO) !== 0) {
        cflag += 'k';
    }
    if ((board.castlingRight & Castling.BLACK_CASTLE_OOO) !== 0) {
        cflag += 'q';
    }

    fen_str += (cflag !== "") ? cflag : "-";
    fen_str += ' ';
    const en_sq = board.enpassant;
    fen_str += (en_sq !== Squares.OFF_SQUARE) ? squareToAlgebraic(en_sq) : "-";
    fen_str += ' ';
    fen_str += board.halfMoves.toString();
    fen_str += ' ';
    fen_str += board.fullMoves.toString();

    return fen_str;
}
export {
    Pieces,
    Files,
    Ranks,
    Colors,
    Squares,
    Castling,

    bitboard_t,
    undo_t,
    board_t,
    piece_t,
    position_t,

    FILE_RANK_TO_SQUARE,
    SQ120,
    SQ64,
    FLIP64,
    SQUARE_ON_BOARD,
    IS_VALID_PIECE,
    SQUARE_COLOR,
    PIECE_INDEX,
    SQ64BB,

    newBoard,
    getTurn,
    mirrorBoard,
    clearBoard,
    checkBoard,

    boardToPosition_t,
    boardToASCII,
    boardToANSI,
    boardToFen,
    fenToBoard,
    bitboardToString,

    squareToAlgebraic,
    algebraicToSquare,
}