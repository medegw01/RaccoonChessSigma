// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as bitboard_ from './bitboard'
import * as util_ from '../util'
import * as hash_ from './hash'
import * as move_ from './move'

type undo_t = {
    move: move_.move_t;

    enpassant: util_.Squares;
    turn: util_.Colors;
    halfMoves: number;
    castlingRight: number;

    ply: number;
    fullMoves: number;
    currentPolyglotKey: bitboard_.bitboard_t;

    materialEg: number[];
    materialMg: number[];
}
type board_t = {
    pieces: util_.Pieces[];
    kingSquare: util_.Squares[];

    enpassant: util_.Squares;
    turn: util_.Colors;
    halfMoves: number;
    fullMoves: number;
    castlingRight: number;

    ply: number;

    currentPolyglotKey: bitboard_.bitboard_t;

    materialEg: number[];
    materialMg: number[];

    piecesBB: bitboard_.bitboard_t[];

    numberPieces: number[];
    numberBigPieces: number[];
    numberMajorPieces: number[];
    numberMinorPieces: number[];

    pieceList: util_.Squares[];
    pawnEvalHash: util_.LRUCache<bitboard_.bitboard_t, pawnEntry_t>;
}
interface evaluationFN { (arg: board_t): number }
type piece_t = { type: string, color: string };
type position_t = {
    board: (piece_t | null)[][]; // chessboard
    castling: [boolean, boolean, boolean, boolean];// castling right: [K, Q, k, q]
    enpassant: string  // enpassant
    turn: string // side to move
    moveCount: [number, number] // move counts: [half move, full, move]
}

type pawnEntry_t = {
    pawnSpan: bitboard_.bitboard_t[];
    passedPawn: bitboard_.bitboard_t[];
    attacked: bitboard_.bitboard_t[];
    attacked2: bitboard_.bitboard_t[];
    attackedBy: bitboard_.bitboard_t[];
    kingAttackCount: number[];
    kingAttackersCount: number[];
    kingAttackWeight: number[];
    boardStaticEval: util_.staticEval_c;
}

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

    // check piece lists
    for (let p = util_.Pieces.WHITEPAWN; p <= util_.Pieces.BLACKKING; ++p) {
        for (let p_num = 0; p_num < position.numberPieces[p]; ++p_num) {
            const SQ120: number = position.pieceList[util_.PIECE_INDEX(p, p_num)]
            util_.ASSERT(position.pieces[SQ120] == p, `BoardErr: Piece List Mismatch\n Got: ${util_.pieceToAscii[position.pieces[SQ120]]} Expect: ${util_.pieceToAscii[p]}`);
        }
    }

    // check piece count and other counters
    for (let square64 = 0; square64 < 64; ++square64) {
        const sq120 = util_.SQ120(square64);
        const p = position.pieces[sq120];
        tmpNumberPiece[p]++;
        tmpPieceBB[p] |= bitboard_.bit(square64);
        const color = util_.getColorPiece[p];
        if (util_.isBigPiece[p]) tmpNumberbigPiece[color]++;
        if (util_.isMinorPiece[p]) tmpNumberminorPiece[color]++;
        if (util_.isMajorPiece[p]) tmpNumbermajorPiece[color]++;

        tmpMaterialEg[color] += util_.getValuePiece[util_.Phase.EG][p];
        tmpMaterialMg[color] += util_.getValuePiece[util_.Phase.MG][p];
    }

    for (let p = util_.Pieces.WHITEPAWN; p <= util_.Pieces.BLACKKING; ++p) {
        util_.ASSERT(tmpNumberPiece[p] == position.numberPieces[p], `BoardErr: no. of util_.Pieces Mismatch\n Got: ${position.numberPieces[p]} Expect: ${tmpNumberPiece[p]}`);
        util_.ASSERT(tmpPieceBB[p] == position.piecesBB[p], `BoardErr: no. of ${util_.pieceToAscii[p]} util_.Pieces BB Mismatch\n Got: ${position.piecesBB[p]} Expect: ${tmpPieceBB[p]}`);
        util_.ASSERT(position.numberPieces[p] == bitboard_.popcount({ v: position.piecesBB[p] }), `BoardErr: no. of ${util_.pieceToAscii[p]} util_.Pieces BB Mismatch no ${util_.pieceToAscii[p]} util_.Pieces\n Got: ${bitboard_.popcount({ v: position.piecesBB[p] })} Expect: ${position.numberPieces[p]}`);
    }

    util_.ASSERT(tmpMaterialEg[util_.Colors.WHITE] == position.materialEg[util_.Colors.WHITE], `BoardErr: White eg Material imbalance. Got: ${position.materialEg[util_.Colors.WHITE]} Expect: ${tmpMaterialEg[util_.Colors.WHITE]}`);
    util_.ASSERT(tmpMaterialMg[util_.Colors.WHITE] == position.materialMg[util_.Colors.WHITE], `BoardErr: White mg Material imbalance. Got: ${position.materialMg[util_.Colors.WHITE]} Expect: ${tmpMaterialMg[util_.Colors.WHITE]}`);
    util_.ASSERT(tmpMaterialEg[util_.Colors.BLACK] == position.materialEg[util_.Colors.BLACK], `BoardErr: BLACK eg Material imbalance. Got: ${position.materialEg[util_.Colors.BLACK]} Expect: ${tmpMaterialEg[util_.Colors.BLACK]}`);
    util_.ASSERT(tmpMaterialMg[util_.Colors.BLACK] == position.materialMg[util_.Colors.BLACK], `BoardErr: BLACK mg Material imbalance. Got: ${position.materialMg[util_.Colors.BLACK]} Expect: ${tmpMaterialMg[util_.Colors.BLACK]}`);

    util_.ASSERT(tmpNumberminorPiece[util_.Colors.WHITE] == position.numberMinorPieces[util_.Colors.WHITE], `BoardErr: no. White minor piece Mismatch\n Got: ${position.numberMinorPieces[util_.Colors.WHITE]} Expect: ${tmpNumberminorPiece[util_.Colors.WHITE]}`);
    util_.ASSERT(tmpNumberminorPiece[util_.Colors.BLACK] == position.numberMinorPieces[util_.Colors.BLACK], `BoardErr: no. Black minor piece Mismatch\n Got: ${position.numberMinorPieces[util_.Colors.BLACK]} Expect: ${tmpNumberminorPiece[util_.Colors.BLACK]}`);
    util_.ASSERT(tmpNumbermajorPiece[util_.Colors.WHITE] == position.numberMajorPieces[util_.Colors.WHITE], `BoardErr: no. White major piece Mismatch\n Got: ${position.numberMajorPieces[util_.Colors.WHITE]} Expect: ${tmpNumbermajorPiece[util_.Colors.WHITE]}`)
    util_.ASSERT(tmpNumbermajorPiece[util_.Colors.BLACK] == position.numberMajorPieces[util_.Colors.BLACK], `BoardErr: no. Black major piece Mismatch\n Got: ${position.numberMajorPieces[util_.Colors.BLACK]} Expect: ${tmpNumbermajorPiece[util_.Colors.BLACK]}`);
    util_.ASSERT(tmpNumberbigPiece[util_.Colors.WHITE] == position.numberBigPieces[util_.Colors.WHITE], `BoardErr: no. White big piece Mismatch\n Got: ${position.numberBigPieces[util_.Colors.WHITE]} Expect: ${tmpNumberbigPiece[util_.Colors.WHITE]}`)
    util_.ASSERT(tmpNumberbigPiece[util_.Colors.BLACK] == position.numberBigPieces[util_.Colors.BLACK], `BoardErr: no. White big piece Mismatch\n Got: ${position.numberBigPieces[util_.Colors.BLACK]} Expect: ${tmpNumberbigPiece[util_.Colors.BLACK]}`);

    util_.ASSERT(position.turn == util_.Colors.WHITE || position.turn == util_.Colors.BLACK);
    util_.ASSERT(hash_.polyglotKey(position) == position.currentPolyglotKey, `BoardErr: no. Poly Key Mismatch\n Got: ${position.currentPolyglotKey} Expect: ${hash_.polyglotKey(position)}`);

    util_.ASSERT(position.enpassant == util_.Squares.OFF_SQUARE || (util_.ranksBoard[position.enpassant] == util_.Ranks.SIXTH_RANK && position.turn == util_.Colors.WHITE)
        || (util_.ranksBoard[position.enpassant] == util_.Ranks.THIRD_RANK && position.turn == util_.Colors.BLACK), `BoardErr: eg Wrong empassant square`);

    util_.ASSERT(position.pieces[position.kingSquare[util_.Colors.WHITE]] == util_.Pieces.WHITEKING, `BoardErr: Wrong White king square`);
    util_.ASSERT(position.pieces[position.kingSquare[util_.Colors.BLACK]] == util_.Pieces.BLACKKING, `BoardErr: Wrong Black king square`);
}

function getTurn(board: board_t): string {
    return "wb-"[board.turn];
}

function clearBoard(board: board_t = {} as board_t): board_t {
    board.pieces = new Array<util_.Pieces>(util_.BOARD_SQUARE_NUM).fill(util_.Pieces.OFF_BOARD_PIECE);
    for (let i = 0; i < 64; i++) {
        board.pieces[util_.SQ120(i)] = util_.Pieces.EMPTY;
    }

    board.kingSquare = new Array<util_.Squares>(2).fill(util_.Squares.OFF_SQUARE);

    board.enpassant = util_.Squares.OFF_SQUARE;
    board.turn = util_.Colors.WHITE; // Generally cleared board sets turn to white
    board.halfMoves = 0;
    board.fullMoves = 1;
    board.castlingRight = 0;

    board.ply = 0;

    board.currentPolyglotKey = 0n;

    board.materialEg = new Array<number>(2).fill(0);
    board.materialMg = new Array<number>(2).fill(0);

    board.piecesBB = new Array<bitboard_.bitboard_t>(13).fill(0n);

    board.numberPieces = new Array<number>(13).fill(0);
    board.numberBigPieces = new Array<number>(2).fill(0);
    board.numberMajorPieces = new Array<number>(2).fill(0);
    board.numberMinorPieces = new Array<number>(2).fill(0);

    board.pieceList = new Array<util_.Squares>(13 * 10).fill(0);

    board.pawnEvalHash = new util_.LRUCache(util_.MAX_PLY)

    return board;
}

function updateMaterialList(board: board_t) {
    for (let square = 0; square < util_.BOARD_SQUARE_NUM; square++) {
        const piece = board.pieces[square];
        if (util_.SQUARE_ON_BOARD(square) && piece !== util_.Pieces.OFF_BOARD_PIECE && piece !== util_.Pieces.EMPTY) {
            const color = util_.getColorPiece[piece];

            if (util_.isBigPiece[piece]) board.numberBigPieces[color]++;
            if (util_.isMajorPiece[piece]) board.numberMajorPieces[color]++;
            if (util_.isMinorPiece[piece]) board.numberMinorPieces[color]++;

            board.materialMg[color] += util_.getValuePiece[util_.Phase.MG][piece];
            board.materialEg[color] += util_.getValuePiece[util_.Phase.EG][piece];
            board.pieceList[(util_.PIECE_INDEX(piece, board.numberPieces[piece]))] = square;
            board.numberPieces[piece]++;

            board.piecesBB[piece] |= bitboard_.bit(util_.SQ64(square));

            if (piece === util_.Pieces.WHITEKING) board.kingSquare[util_.Colors.WHITE] = square;
            if (piece === util_.Pieces.BLACKKING) board.kingSquare[util_.Colors.BLACK] = square;
        }
    }
}

function mirrorBoard(board: board_t): void {
    const tempPiecesArray = new Array<util_.Pieces>(64);
    const tempSide = board.turn ^ 1;
    const SwapPiece = [
        util_.Pieces.EMPTY,
        util_.Pieces.BLACKPAWN,
        util_.Pieces.BLACKBISHOP,
        util_.Pieces.BLACKKNIGHT,
        util_.Pieces.BLACKROOK,
        util_.Pieces.BLACKQUEEN,
        util_.Pieces.BLACKKING,
        util_.Pieces.WHITEPAWN,
        util_.Pieces.WHITEBISHOP,
        util_.Pieces.WHITEKNIGHT,
        util_.Pieces.WHITEROOK,
        util_.Pieces.WHITEQUEEN,
        util_.Pieces.WHITEKING,
        util_.Pieces.OFF_BOARD_PIECE
    ];
    let tempCastlePerm = 0;
    let tempEnPas = util_.Squares.OFF_SQUARE;

    let sq: util_.Squares;
    let tp: util_.Pieces;

    if (board.castlingRight & util_.Castling.WHITE_CASTLE_OO) tempCastlePerm |= util_.Castling.BLACK_CASTLE_OO;
    if (board.castlingRight & util_.Castling.WHITE_CASTLE_OOO) tempCastlePerm |= util_.Castling.BLACK_CASTLE_OOO;

    if ((board.castlingRight & util_.Castling.BLACK_CASTLE_OO) !== 0) tempCastlePerm |= util_.Castling.WHITE_CASTLE_OO;
    if ((board.castlingRight & util_.Castling.BLACK_CASTLE_OOO) !== 0) tempCastlePerm |= util_.Castling.WHITE_CASTLE_OOO;

    if (board.enpassant !== util_.Squares.OFF_SQUARE) {
        tempEnPas = util_.SQ120(util_.FLIP64(util_.SQ64(board.enpassant)));
    }

    for (sq = 0; sq < 64; sq++) {
        tempPiecesArray[sq] = board.pieces[util_.SQ120(util_.FLIP64(sq))];
    }
    const ply = board.ply;
    const half = board.halfMoves;

    clearBoard(board);

    for (sq = 0; sq < 64; sq++) {
        tp = SwapPiece[tempPiecesArray[sq]];
        board.pieces[util_.SQ120(sq)] = tp;
    }

    board.turn = tempSide;
    board.castlingRight = tempCastlePerm;
    board.enpassant = tempEnPas;
    board.halfMoves = half;
    board.ply = ply;
    board.currentPolyglotKey = hash_.polyglotKey(board);

    updateMaterialList(board);
}

function getInfo(board: board_t): string {
    let ascii_t = "INFO:\n";
    ascii_t += "turn: " + (getTurn(board)) + '\n';
    ascii_t += "enpass: " + ((board.enpassant === util_.Squares.OFF_SQUARE) ? "-" : squareToAlgebraic(board.enpassant)) + '\n';
    ascii_t += "castling: "
        + (((board.castlingRight & util_.Castling.WHITE_CASTLE_OO) !== 0) ? util_.pieceToAscii[util_.Pieces.WHITEKING] : '')
        + (((board.castlingRight & util_.Castling.WHITE_CASTLE_OOO) !== 0) ? util_.pieceToAscii[util_.Pieces.WHITEQUEEN] : '')
        + (((board.castlingRight & util_.Castling.BLACK_CASTLE_OO) !== 0) ? util_.pieceToAscii[util_.Pieces.BLACKKING] : '')
        + (((board.castlingRight & util_.Castling.BLACK_CASTLE_OOO) !== 0) ? util_.pieceToAscii[util_.Pieces.BLACKQUEEN] : '');
    ascii_t += ("\npoly key: 0x" + board.currentPolyglotKey.toString(16) + "\n");
    return ascii_t
}

function boardToANSI(board: board_t, white_piece: string, black_piece: string, light_square: string, dark_square: string, show_info: boolean): string {
    let ansi_t = "    a  b  c  d  e  f  g  h\n";
    for (let rank = util_.Ranks.EIGHTH_RANK; rank >= util_.Ranks.FIRST_RANK; --rank) {
        ansi_t += ` ${(rank + 1).toString()} `;
        for (let file = util_.Files.A_FILE; file <= util_.Files.H_FILE; ++file) {
            const SQ120 = util_.FILE_RANK_TO_SQUARE(file, rank);
            const piece = board.pieces[SQ120];
            ansi_t += [
                (util_.SQUARE_COLOR(SQ120) === util_.Colors.WHITE) ? light_square : dark_square,
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
    for (let rank = util_.Ranks.EIGHTH_RANK; rank >= util_.Ranks.FIRST_RANK; --rank) {
        ascii_t += (rank + 1).toString() + "  ";
        for (let file = util_.Files.A_FILE; file <= util_.Files.H_FILE; ++file) {
            const SQ120 = util_.FILE_RANK_TO_SQUARE(file, rank);
            const piece = board.pieces[SQ120];
            if (piece === util_.Pieces.EMPTY) {
                ascii_t += (util_.SQUARE_COLOR(SQ120) === util_.Colors.WHITE) ? light_square + " " : dark_square + " ";
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
    for (let rank = util_.Ranks.EIGHTH_RANK; rank >= util_.Ranks.FIRST_RANK; --rank) {
        r_str = [];
        for (let file = util_.Files.A_FILE; file <= util_.Files.H_FILE; ++file) {
            const p = board.pieces[util_.FILE_RANK_TO_SQUARE(file, rank)];
            if (p === util_.Pieces.EMPTY) {
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
    position.enpassant = (board.enpassant === util_.Squares.OFF_SQUARE) ? "-" : squareToAlgebraic(board.enpassant);
    position.moveCount = [board.halfMoves, board.fullMoves];
    position.castling = [
        ((board.castlingRight & util_.Castling.WHITE_CASTLE_OO) !== 0),
        ((board.castlingRight & util_.Castling.WHITE_CASTLE_OOO) !== 0),
        ((board.castlingRight & util_.Castling.BLACK_CASTLE_OO) !== 0),
        ((board.castlingRight & util_.Castling.BLACK_CASTLE_OOO) !== 0)
    ];

    return position;
}

//-- square
function squareToAlgebraic(square: util_.Squares): string {
    const file = 'a'.charCodeAt(0) + util_.filesBoard[square];
    const rank = '1'.charCodeAt(0) + util_.ranksBoard[square];
    return String.fromCharCode(file) + String.fromCharCode(rank);
}
function algebraicToSquare(square: string): util_.Squares {
    if (square[1].charCodeAt(0) > '8'.charCodeAt(0) || square[1].charCodeAt(0) < '1'.charCodeAt(0)) return util_.Squares.OFF_BOARD;
    if (square[0].charCodeAt(0) > 'h'.charCodeAt(0) || square[0].charCodeAt(0) < 'a'.charCodeAt(0)) return util_.Squares.OFF_BOARD;
    return util_.FILE_RANK_TO_SQUARE(
        square[0].charCodeAt(0) - 'a'.charCodeAt(0), square[1].charCodeAt(0) - '1'.charCodeAt(0)
    );
}

/*****************************************************************************
 * FEN
 ****************************************************************************/
function fenToBoard(fen: string, board: board_t): void {
    let rank = util_.Ranks.EIGHTH_RANK;
    let file = util_.Files.A_FILE;
    const n = fen.length;
    let piece = 0;
    let count = 0;
    let square64_ = 0;
    let square_120_ = 0;
    let i = 0;
    util_.ASSERT(n != 0, "FenErr: Empty fen provided")

    clearBoard(board);

    while ((rank >= util_.Ranks.FIRST_RANK) && (i < n)) {
        count = 1;
        switch (fen[i]) {
            case 'p': piece = util_.Pieces.BLACKPAWN; break;
            case 'r': piece = util_.Pieces.BLACKROOK; break;
            case 'n': piece = util_.Pieces.BLACKKNIGHT; break;
            case 'b': piece = util_.Pieces.BLACKBISHOP; break;
            case 'k': piece = util_.Pieces.BLACKKING; break;
            case 'q': piece = util_.Pieces.BLACKQUEEN; break;
            case 'Q': piece = util_.Pieces.WHITEQUEEN; break;
            case 'K': piece = util_.Pieces.WHITEKING; break;
            case 'N': piece = util_.Pieces.WHITEKNIGHT; break;
            case 'R': piece = util_.Pieces.WHITEROOK; break;
            case 'B': piece = util_.Pieces.WHITEBISHOP; break;
            case 'P': piece = util_.Pieces.WHITEPAWN; break;

            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
                piece = util_.Pieces.EMPTY;
                count = fen[i].charCodeAt(0) - '0'.charCodeAt(0);
                break;
            case '/':
            case ' ':
                rank--;
                file = util_.Files.A_FILE;
                i++;
                continue;
            default:
                util_.ASSERT(false, `FenErr: Illegal character ${fen[i]}`);
        }
        for (let j = 0; j < count; j++) {
            square64_ = rank * 8 + file;
            square_120_ = util_.SQ120(square64_);
            if (piece !== util_.Pieces.EMPTY) {
                board.pieces[square_120_] = piece;
            }
            file++;
        }
        i++;
    }

    if (!(fen[i] === 'w' || fen[i] === 'b')) {
        util_.ASSERT(false, `FenErr: Side to move is invalid. It should be w or b`);
    }
    board.turn = (fen[i] === 'w') ? util_.Colors.WHITE : util_.Colors.BLACK;
    i += 2;

    for (let j = 0; j < 4; j++) {
        if (fen[i] === ' ') {
            break;
        }
        switch (fen[i]) {
            case 'K': board.castlingRight |= util_.Castling.WHITE_CASTLE_OO; break;
            case 'Q': board.castlingRight |= util_.Castling.WHITE_CASTLE_OOO; break;
            case 'k': board.castlingRight |= util_.Castling.BLACK_CASTLE_OO; break;
            case 'q': board.castlingRight |= util_.Castling.BLACK_CASTLE_OOO; break;
            default: break;
        }
        i++;
    }
    i++;

    if (fen[i] !== '-') {
        file = fen.charCodeAt(i) - 'a'.charCodeAt(0);
        rank = fen.charCodeAt(++i) - '1'.charCodeAt(0);

        if (!(file >= util_.Files.A_FILE && file <= util_.Files.H_FILE)
            || !(rank >= util_.Ranks.FIRST_RANK && rank <= util_.Ranks.EIGHTH_RANK)) {
            util_.ASSERT(false, `FenErr: Invalid en-passant square`);
        }
        board.enpassant = util_.FILE_RANK_TO_SQUARE(file, rank);
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
    board.ply = 0;
    board.fullMoves = fullMove;
    board.currentPolyglotKey = hash_.polyglotKey(board);

    updateMaterialList(board);
    try {
        checkBoard(board)
    }
    catch (err) {
        util_.ASSERT(false, `FenErr: Cannot not parse fen due to ${(err as Error).message} \n${(err as Error).stack!}`);
    }

}

function boardToFen(board: board_t): string {
    let fen_str = "";
    let empty = 0;

    for (let rank = util_.Ranks.EIGHTH_RANK; rank >= util_.Ranks.FIRST_RANK; --rank) {
        for (let file = util_.Files.A_FILE; file <= util_.Files.H_FILE; file++) {
            const sq = util_.FILE_RANK_TO_SQUARE(file, rank);
            const piece = board.pieces[sq];
            if (piece === util_.Pieces.EMPTY) {
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
        if (rank !== util_.Ranks.FIRST_RANK) fen_str += '/';
        empty = 0;
    }

    fen_str += (board.turn === util_.Colors.WHITE) ? " w " : " b ";
    let cflag = "";
    if ((board.castlingRight & util_.Castling.WHITE_CASTLE_OO) !== 0) {
        cflag += 'K';
    }
    if ((board.castlingRight & util_.Castling.WHITE_CASTLE_OOO) !== 0) {
        cflag += 'Q';
    }
    if ((board.castlingRight & util_.Castling.BLACK_CASTLE_OO) !== 0) {
        cflag += 'k';
    }
    if ((board.castlingRight & util_.Castling.BLACK_CASTLE_OOO) !== 0) {
        cflag += 'q';
    }

    fen_str += (cflag !== "") ? cflag : "-";
    fen_str += ' ';
    const en_sq = board.enpassant;
    fen_str += (en_sq !== util_.Squares.OFF_SQUARE) ? squareToAlgebraic(en_sq) : "-";
    fen_str += ' ';
    fen_str += board.halfMoves.toString();
    fen_str += ' ';
    fen_str += board.fullMoves.toString();

    return fen_str;
}
export {
    undo_t,
    board_t,
    piece_t,
    position_t,
    pawnEntry_t,
    evaluationFN,


    getTurn,
    mirrorBoard,
    clearBoard,
    checkBoard,

    boardToPosition_t,
    boardToASCII,
    boardToANSI,
    boardToFen,
    fenToBoard,

    squareToAlgebraic,
    algebraicToSquare,

}