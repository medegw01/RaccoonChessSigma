// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as board_ from './board'
import * as state_ from './state'
import * as hash_ from './hash'
import * as attack_ from './attack'

type move_t = number

type moveScore_t = {
    move: move_t;
    score: number;
}

type verboseMove_t = {
    from: string;
    to: string;
    color: string;
    pieces: string;
    flag: string;
    san: string;
    smith: string;
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
const numberDirections = [0, 0, 4, 8, 4, 8, 8, 0, 4, 8, 4, 8, 8];
const slider = [
    board_.Pieces.WHITEBISHOP, board_.Pieces.WHITEROOK, board_.Pieces.WHITEQUEEN, -1, board_.Pieces.BLACKBISHOP,
    board_.Pieces.BLACKROOK, board_.Pieces.BLACKQUEEN, -1
];
const nonslider = [board_.Pieces.WHITEKNIGHT, board_.Pieces.WHITEKING, -1, board_.Pieces.BLACKKNIGHT, board_.Pieces.BLACKKING, -1];
const piecesDirections = [
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
function MOVE(from: board_.Squares, to: board_.Squares, cap: board_.Pieces, prom: board_.Pieces, flag: number) { return ((from) | (to << 7) | (cap << 14) | (prom << 20) | (flag)); }
function FROM_SQUARE(move: move_t) { return ((move) & 0x7F); }
function TO_SQUARE(move: move_t) { return (((move) >> 7) & 0x7F); }
function CAPTURED(move: move_t) { return (((move) >> 14) & 0xF); }
function PROMOTED(move: move_t) { return (((move) >> 20) & 0xF); }

/*****************************************************************************
 * MOVE PARSER
****************************************************************************/
function smithToMove(smith: string, board: board_.board_t): move_t {
    const cleanedSmith = cleanSmith(smith);
    if (cleanedSmith != "") {
        if (cleanedSmith[1].charCodeAt(0) > '8'.charCodeAt(0) || cleanedSmith[1].charCodeAt(0) < '1'.charCodeAt(0)) return NO_MOVE;
        if (cleanedSmith[3].charCodeAt(0) > '8'.charCodeAt(0) || cleanedSmith[3].charCodeAt(0) < '1'.charCodeAt(0)) return NO_MOVE;
        if (cleanedSmith[0].charCodeAt(0) > 'h'.charCodeAt(0) || cleanedSmith[0].charCodeAt(0) < 'a'.charCodeAt(0)) return NO_MOVE;
        if (cleanedSmith[2].charCodeAt(0) > 'h'.charCodeAt(0) || cleanedSmith[2].charCodeAt(0) < 'a'.charCodeAt(0)) return NO_MOVE;

        const from = board_.FILE_RANK_TO_SQUARE(cleanedSmith[0].charCodeAt(0) - 'a'.charCodeAt(0), cleanedSmith[1].charCodeAt(0) - '1'.charCodeAt(0));
        const to = board_.FILE_RANK_TO_SQUARE(cleanedSmith[2].charCodeAt(0) - 'a'.charCodeAt(0), cleanedSmith[3].charCodeAt(0) - '1'.charCodeAt(0));

        if (board_.SQUARE_ON_BOARD(from) && board_.SQUARE_ON_BOARD(to)) {
            const moves = generateLegalMoves(board);
            for (let i = 0; i < moves.length; i++) {
                const move = moves[i].move;
                if (FROM_SQUARE(move) === from && TO_SQUARE(move) === to) {
                    const promotionPiece = PROMOTED(move);
                    if (promotionPiece !== board_.Pieces.EMPTY) {
                        if ((cleanedSmith[4] === (util_.pieceToAscii[promotionPiece]).toLowerCase())
                            || (cleanedSmith[4] === (util_.pieceToAscii[promotionPiece]).toUpperCase())) {
                            return move;
                        }
                        continue;
                    }
                    return move;
                }
            }
        }
    }
    return NO_MOVE;
}

function moveToSmith(move: move_t): string {
    if (move != NO_MOVE) {
        const fileFrom = util_.filesBoard[FROM_SQUARE(move)];
        const rankFrom = util_.ranksBoard[FROM_SQUARE(move)];

        const fileTo = util_.filesBoard[TO_SQUARE(move)];
        const rankTo = util_.ranksBoard[TO_SQUARE(move)];

        const promoted = PROMOTED(move);
        let rlt = (String.fromCharCode('a'.charCodeAt(0) + fileFrom) + String.fromCharCode('1'.charCodeAt(0)
            + rankFrom) + String.fromCharCode('a'.charCodeAt(0) + fileTo) + String.fromCharCode('1'.charCodeAt(0)
                + rankTo)
        );
        if (promoted) {
            let tmp = 'q';
            if (util_.isKnight[promoted]) {
                tmp = 'n';
            } else if (util_.isRookOrQueen[promoted] && !util_.isBishopOrQueen[promoted]) {
                tmp = 'r';
            } else if (!util_.isRookOrQueen[promoted] && util_.isBishopOrQueen[promoted]) {
                tmp = 'b';
            }
            rlt += tmp;
        }
        return rlt;
    }
    return "";

}

function moveToVerboseMove(move: move_t, board: board_.board_t): verboseMove_t {
    const rlt = {} as verboseMove_t;
    if (move !== NO_MOVE) {
        const from = FROM_SQUARE(move);
        const to = TO_SQUARE(move);
        rlt.from = board_.squareToAlgebraic(from);
        rlt.to = board_.squareToAlgebraic(to);
        rlt.color = "wb-"[board.turn];
        rlt.pieces = (util_.pieceToAscii[board.pieces[from]]).toLowerCase();
        rlt.flag = "";

        if ((move & MOVE_FLAG.PROMOTED) !== 0) {
            rlt.flag += 'p';
            rlt.promoted = (util_.pieceToAscii[PROMOTED(move)]).toLowerCase();
        }
        if ((move & MOVE_FLAG.CAPTURED) !== 0) {
            rlt.flag += 'c';
            rlt.captured = (util_.pieceToAscii[CAPTURED(move)]).toLowerCase();
        }
        if ((move & MOVE_FLAG.ENPASS) !== 0) {
            rlt.flag += 'e';
        }
        if ((move & MOVE_FLAG.CASTLE) !== 0) {
            if (to === board_.Squares.G8 || to === board_.Squares.G1) {
                rlt.flag += 'k';
            }
            else {
                rlt.flag += 'q';
            }
        }
        if ((move & MOVE_FLAG.PAWN_START) !== 0) {
            rlt.flag += 'b';
        }

        rlt.flag += (rlt.flag === "") ? 'n' : "";
        rlt.smith = moveToSmith(move);
        rlt.san = moveToSan(move, board);
    }
    return rlt
}

function disambiguator(move: move_t, board: board_.board_t) {
    let diamb = "";

    const moves = generateAllMoves(board);

    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);
    const piece = board.pieces[from];

    let ambiguities = 0;
    let same_rank = 0;
    let same_file = 0;

    let i, tmpMove, tmpFrom, tmpTo, tmpPiece;

    for (i = 0; i < moves.length; ++i) {
        tmpMove = moves[i].move;
        tmpFrom = FROM_SQUARE(tmpMove);
        tmpTo = TO_SQUARE(tmpMove);
        tmpPiece = board.pieces[tmpFrom];

        //-- http://cfajohnson.com/chess/SAN/
        if (piece === tmpPiece && from !== tmpFrom && to === tmpTo) {
            ambiguities++;
            if (util_.ranksBoard[from] === util_.ranksBoard[tmpFrom]) same_rank++;
            if (util_.filesBoard[from] === util_.filesBoard[tmpFrom]) same_file++;
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
            diamb += board_.squareToAlgebraic(FROM_SQUARE(move));
        }
        else if (same_file > 0) {
            diamb += board_.squareToAlgebraic(from).charAt(1);
        }
        else {
            diamb += board_.squareToAlgebraic(from).charAt(0);
        }
    }
    return diamb;
}

function moveToSan(move: move_t, board: board_.board_t, verbose = true): string {
    let san = "";
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    if (board_.SQUARE_ON_BOARD(from) && board_.SQUARE_ON_BOARD(to)) {
        if ((move & MOVE_FLAG.CASTLE) !== 0) {//--castling move
            switch (to) {
                case board_.Squares.C1:
                    san = "O-O-O";
                    break;
                case board_.Squares.C8:
                    san = "O-O-O";
                    break;
                case board_.Squares.G1:
                    san = "O-O";
                    break;
                case board_.Squares.G8:
                    san = "O-O";
                    break;
                default: break;
            }
        } else {
            const diam = disambiguator(move, board);
            if (!util_.isPawn[board.pieces[from]]) {
                san += (util_.pieceToAscii[board.pieces[from]]).toUpperCase();
                san += diam;
            }
            if ((move & (MOVE_FLAG.CAPTURED | MOVE_FLAG.ENPASS)) !== 0) {
                if (util_.isPawn[board.pieces[from]]) {
                    san += String.fromCharCode('a'.charCodeAt(0) + util_.filesBoard[from]);
                }
                san += 'x';
            }
            san += board_.squareToAlgebraic(to);
            if ((move & MOVE_FLAG.PROMOTED) !== 0) {
                san += '=';
                san += (util_.pieceToAscii[PROMOTED(move)]).toUpperCase();
            }
            if (verbose) {
                if ((move & MOVE_FLAG.ENPASS) !== 0) {
                    san += "e.p.";
                }
                if (makeMove(move, board)) {
                    if (state_.inCheckmate(board)) {
                        san += "#";
                    }
                    else if (state_.inCheck(board)) {
                        san += "+";
                    }
                    takeMove(board);
                }

            }
        }

    }
    return san;
}

function sanToMove(san: string, board: board_.board_t): number {
    const cleaned_san = san.replace(/[+#]?[?!]*$/, '').replace(/e.p./, '');
    const legal = generateLegalMoves(board);
    let move: moveScore_t;
    for (move of legal) {
        if (cleaned_san == moveToSan(move.move, board, false)) return move.move;
    }
    return NO_MOVE;
}

function cleanSmith(smith: string): string {
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
function addQuietMove(move: move_t, moves: moveScore_t[]) {
    moves.push({ move: move, score: 0 });
}
function addCaptureMove(move: move_t, moves: moveScore_t[]) {
    moves.push({ move: move, score: CAPTURE_BONUS });
}
function addEnpassantMove(move: move_t, moves: moveScore_t[]) {
    const score = ENPASS_BONUS + CAPTURE_BONUS;
    moves.push({ move: move, score: score });
}
function addWhitePawCaptureMove(from: board_.Squares, to: board_.Squares, cap: board_.Pieces, moves: moveScore_t[]) {
    if (util_.ranksBoard[from] == board_.Ranks.SEVENTH_RANK) {
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.WHITEQUEEN, 0), moves);
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.WHITEROOK, 0), moves);
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.WHITEBISHOP, 0), moves);
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.WHITEKNIGHT, 0), moves);
    }
    else {
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.EMPTY, 0), moves);
    }
}
function addWhitePawnMove(from: board_.Squares, to: board_.Squares, moves: moveScore_t[]) {
    if (util_.ranksBoard[from] == board_.Ranks.SEVENTH_RANK) {
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.WHITEQUEEN, 0), moves);
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.WHITEROOK, 0), moves);
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.WHITEBISHOP, 0), moves);
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.WHITEKNIGHT, 0), moves);
    }
    else {
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.EMPTY, 0), moves);
    }
}
function addPlackPawnCaptureMove(from: board_.Squares, to: board_.Squares, cap: board_.Pieces, moves: moveScore_t[]) {
    if (util_.ranksBoard[from] === board_.Ranks.SECOND_RANK) {
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.BLACKQUEEN, 0), moves);
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.BLACKROOK, 0), moves);
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.BLACKBISHOP, 0), moves);
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.BLACKKNIGHT, 0), moves);
    }
    else {
        addCaptureMove(MOVE(from, to, cap, board_.Pieces.EMPTY, 0), moves);
    }
}
function addPlackPawnMove(from: board_.Squares, to: board_.Squares, moves: moveScore_t[]) {
    if (util_.ranksBoard[from] === board_.Ranks.SECOND_RANK) {
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.BLACKQUEEN, 0), moves);
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.BLACKROOK, 0), moves);
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.BLACKBISHOP, 0), moves);
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.BLACKKNIGHT, 0), moves);
    }
    else {
        addQuietMove(MOVE(from, to, board_.Pieces.EMPTY, board_.Pieces.EMPTY, 0), moves);
    }
}
function generateWhiteHelperMoves(board: board_.board_t, moves: moveScore_t[], onlyCapture = false, square = board_.Squares.ALL) {
    //-- generate white pawn moves
    for (let p = 0; p < board.numberPieces[board_.Pieces.WHITEPAWN]; p++) {
        const sq = board.pieceList[board_.PIECE_INDEX(board_.Pieces.WHITEPAWN, p)];
        if (square === board_.Squares.ALL || square === sq) {
            //-- forward move
            if ((board.pieces[sq + 10] === board_.Pieces.EMPTY) && !onlyCapture) {
                addWhitePawnMove(sq, sq + 10, moves);

                if (util_.ranksBoard[sq] === board_.Ranks.SECOND_RANK && board.pieces[sq + 20] === board_.Pieces.EMPTY) {
                    addQuietMove(MOVE(sq, sq + 20, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.PAWN_START), moves);
                }
            }
            //-- capture move
            if (board_.SQUARE_ON_BOARD(sq + 9) && util_.getColorPiece[board.pieces[sq + 9]] === board_.Colors.BLACK) {
                addWhitePawCaptureMove(sq, sq + 9, board.pieces[sq + 9], moves);
            }
            if (board_.SQUARE_ON_BOARD(sq + 11) && util_.getColorPiece[board.pieces[sq + 11]] === board_.Colors.BLACK) {
                addWhitePawCaptureMove(sq, sq + 11, board.pieces[sq + 11], moves);
            }

            if (board.enpassant !== board_.Squares.OFF_SQUARE) {
                if (sq + 9 === board.enpassant) {
                    addEnpassantMove(MOVE(sq, sq + 9, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
                if (sq + 11 === board.enpassant) {
                    addEnpassantMove(MOVE(sq, sq + 11, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
            }
        }

    }

    //-- castling
    if (square === board_.Squares.ALL || square === board.kingSquare[board_.Colors.WHITE]) {
        if ((((board.castlingRight & board_.Castling.WHITE_CASTLE_OO) !== 0) && !onlyCapture)
            && (board.pieces[board_.Squares.F1] === board_.Pieces.EMPTY && board.pieces[board_.Squares.G1] === board_.Pieces.EMPTY)
            && (!attack_.isSquareAttacked(board_.Squares.E1, board_.Colors.BLACK, board) && !attack_.isSquareAttacked(board_.Squares.F1, board_.Colors.BLACK, board))) {
            addQuietMove(MOVE(board_.Squares.E1, board_.Squares.G1, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.CASTLE), moves);
        }
        if ((((board.castlingRight & board_.Castling.WHITE_CASTLE_OOO) !== 0) && !onlyCapture)
            && (board.pieces[board_.Squares.D1] === board_.Pieces.EMPTY && board.pieces[board_.Squares.C1] === board_.Pieces.EMPTY
                && board.pieces[board_.Squares.B1] === board_.Pieces.EMPTY)
            && (!attack_.isSquareAttacked(board_.Squares.E1, board_.Colors.BLACK, board) && !attack_.isSquareAttacked(board_.Squares.D1, board_.Colors.BLACK, board))) {
            addQuietMove(MOVE(board_.Squares.E1, board_.Squares.C1, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.CASTLE), moves);
        }
    }
}
function generateBlackHelperMoves(board: board_.board_t, moves: moveScore_t[], onlyCapture = false, square = board_.Squares.ALL) {
    //generate black pawn moves
    for (let p = 0; p < board.numberPieces[board_.Pieces.BLACKPAWN]; p++) {
        const sq = board.pieceList[board_.PIECE_INDEX(board_.Pieces.BLACKPAWN, p)];
        if (square === board_.Squares.ALL || square === sq) {
            //-- forward move
            if ((board.pieces[sq - 10] === board_.Pieces.EMPTY) && !onlyCapture) {
                addPlackPawnMove(sq, sq - 10, moves);
                if (util_.ranksBoard[sq] === board_.Ranks.SEVENTH_RANK && board.pieces[sq - 20] === board_.Pieces.EMPTY) {
                    addQuietMove(MOVE(sq, sq - 20, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.PAWN_START), moves);
                }
            }
            //-- capture move
            if (board_.SQUARE_ON_BOARD(sq - 9) && util_.getColorPiece[board.pieces[sq - 9]] === board_.Colors.WHITE) {
                addPlackPawnCaptureMove(sq, sq - 9, board.pieces[sq - 9], moves);
            }
            if (board_.SQUARE_ON_BOARD(sq - 11) && util_.getColorPiece[board.pieces[sq - 11]] === board_.Colors.WHITE) {
                addPlackPawnCaptureMove(sq, sq - 11, board.pieces[sq - 11], moves);
            }

            if (board.enpassant !== board_.Squares.OFF_SQUARE) {
                if (sq - 9 === board.enpassant) {
                    addEnpassantMove(MOVE(sq, sq - 9, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
                if (sq - 11 === board.enpassant) {
                    addEnpassantMove(MOVE(sq, sq - 11, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.ENPASS), moves);
                }
            }
        }
    }

    //-- castling
    if (square === board_.Squares.ALL || square === board.kingSquare[board_.Colors.BLACK]) {
        if ((((board.castlingRight & board_.Castling.BLACK_CASTLE_OO) !== 0) && !onlyCapture)
            && (board.pieces[board_.Squares.F8] === board_.Pieces.EMPTY && board.pieces[board_.Squares.G8] === board_.Pieces.EMPTY)
            && (!attack_.isSquareAttacked(board_.Squares.E8, board_.Colors.WHITE, board) && !attack_.isSquareAttacked(board_.Squares.F8, board_.Colors.WHITE, board))) {
            addQuietMove(MOVE(board_.Squares.E8, board_.Squares.G8, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.CASTLE), moves);
        }
        if ((((board.castlingRight & board_.Castling.BLACK_CASTLE_OOO) !== 0) && !onlyCapture)
            && (board.pieces[board_.Squares.D8] === board_.Pieces.EMPTY && board.pieces[board_.Squares.C8] === board_.Pieces.EMPTY
                && board.pieces[board_.Squares.B8] === board_.Pieces.EMPTY)
            && (!attack_.isSquareAttacked(board_.Squares.E8, board_.Colors.WHITE, board) && !attack_.isSquareAttacked(board_.Squares.D8, board_.Colors.WHITE, board))) {
            addQuietMove(MOVE(board_.Squares.E8, board_.Squares.C8, board_.Pieces.EMPTY, board_.Pieces.EMPTY, MOVE_FLAG.CASTLE), moves);


        }
    }

}
function generateSliderMoves(board: board_.board_t, moves: moveScore_t[], onlyCapture = false, square = board_.Squares.ALL) {
    const turn = board.turn;
    let i = turn * 4;
    let p = slider[i++];
    while (p !== -1) {
        for (let pceNum = 0; pceNum < board.numberPieces[p]; ++pceNum) {
            const sq = board.pieceList[board_.PIECE_INDEX(p, pceNum)];
            if (square === board_.Squares.ALL || square === sq && (board_.SQUARE_ON_BOARD(sq))) {
                for (let i = 0; i < numberDirections[p]; i++) {
                    const dir = piecesDirections[p][i];
                    let to_square = sq + dir;
                    while (board_.SQUARE_ON_BOARD(to_square)) {
                        if (board.pieces[to_square] !== board_.Pieces.EMPTY) {
                            if (util_.getColorPiece[board.pieces[to_square]] === (turn ^ 1)) {
                                addCaptureMove(MOVE(sq, to_square, board.pieces[to_square], board_.Pieces.EMPTY, 0), moves);
                            }
                            break;
                        }
                        if (!onlyCapture) {
                            addQuietMove(MOVE(sq, to_square, board_.Pieces.EMPTY, board_.Pieces.EMPTY, 0), moves);
                        }
                        to_square += dir;
                    }
                }

            }
        }
        p = slider[i++];
    }
}
function generateNonsliderMoves(board: board_.board_t, moves: moveScore_t[], onlyCapture = false, square = board_.Squares.ALL) {
    const turn = board.turn;
    let i = turn * 3;
    let p = nonslider[i++];
    while (p !== -1) {
        for (let pceNum = 0; pceNum < board.numberPieces[p]; ++pceNum) {
            const sq = board.pieceList[board_.PIECE_INDEX(p, pceNum)];
            if (square === board_.Squares.ALL || square === sq && board_.SQUARE_ON_BOARD(sq)) {
                for (let i = 0; i < numberDirections[p]; i++) {
                    const dir = piecesDirections[p][i];
                    const to_square = sq + dir;

                    if (!board_.SQUARE_ON_BOARD(to_square)) {
                        continue;
                    }
                    if (board.pieces[to_square] !== board_.Pieces.EMPTY) {
                        if (util_.getColorPiece[board.pieces[to_square]] === (turn ^ 1)) {
                            addCaptureMove(MOVE(sq, to_square, board.pieces[to_square], board_.Pieces.EMPTY, 0), moves);
                        }
                        continue;
                    }
                    if (!onlyCapture) {
                        addQuietMove(MOVE(sq, to_square, board_.Pieces.EMPTY, board_.Pieces.EMPTY, 0), moves);
                    }
                }

            }
        }
        p = nonslider[i++];
    }
}

function generateAllMoves(board: board_.board_t, onlyCapture = false, square = board_.Squares.ALL): moveScore_t[] {
    const moves = [] as moveScore_t[];
    const turn = board.turn;

    if (turn === board_.Colors.WHITE) {
        generateWhiteHelperMoves(board, moves, onlyCapture, square);
    } else {
        generateBlackHelperMoves(board, moves, onlyCapture, square);
    }

    generateSliderMoves(board, moves, onlyCapture, square);
    generateNonsliderMoves(board, moves, onlyCapture, square);

    return moves;
}

function generateLegalMoves(board: board_.board_t, onlyCapture = false, square = board_.Squares.ALL): moveScore_t[] {
    const moves = generateAllMoves(board, onlyCapture, square);
    const rlt = [] as moveScore_t[];
    let move: moveScore_t;
    for (move of moves) {
        if (!makeMove(move.move, board)) {
            continue;
        }
        rlt.push(move);
        takeMove(board);
    }
    return rlt;

}

/*****************************************************************************
* MOVE MAKE
****************************************************************************/
function clearPieces(sq: board_.Squares, board: board_.board_t): void {
    if (board_.SQUARE_ON_BOARD(sq)) {
        const pce = board.pieces[sq];
        const col = util_.getColorPiece[pce];
        let index;
        let t_pceNum = -1;

        board.pieces[sq] = board_.Pieces.EMPTY;

        board.materialMg[col] -= util_.getValuePiece[util_.Phase.MG][pce];
        board.materialEg[col] -= util_.getValuePiece[util_.Phase.EG][pce];

        if (util_.isBigPiece[pce]) {
            board.numberBigPieces[col]--;
            if (util_.isMajorPiece[pce]) {
                board.numberMajorPieces[col]--;
            } else {
                board.numberMinorPieces[col]--;
            }
        }
        else {
            board.pawns[col] = util_.CLEAR_BIT(board.pawns[col], board_.SQ64(sq));
            board.pawns[board_.Colors.BOTH] = util_.CLEAR_BIT(board.pawns[board_.Colors.BOTH], board_.SQ64(sq));
        }

        for (index = 0; index < board.numberPieces[pce]; ++index) {
            if (board.pieceList[board_.PIECE_INDEX(pce, index)] === sq) {
                t_pceNum = index;
                break;
            }
        }

        board.numberPieces[pce]--;
        board.pieceList[board_.PIECE_INDEX(pce, t_pceNum)] = board.pieceList[board_.PIECE_INDEX(pce, board.numberPieces[pce])];
        board.currentPolyglotKey ^= (hash_.random64Poly[hash_.randomPiece + (util_.getPolyPiece[pce]) * 64 + board_.SQ64(sq)]);

    }
}

function addPiece(sq: board_.Squares, pce: board_.Pieces, board: board_.board_t): void {
    if (board_.SQUARE_ON_BOARD(sq) && board_.IS_VALID_PIECE(pce)) {
        const col = util_.getColorPiece[pce];
        const polyPiece = util_.getPolyPiece[pce];

        board.pieces[sq] = pce;

        if (util_.isBigPiece[pce]) {
            board.numberBigPieces[col]++;
            if (util_.isMajorPiece[pce]) {
                board.numberMajorPieces[col]++;
            } else {
                board.numberMinorPieces[col]++;
            }
        }
        else {
            board.pawns[col] = util_.SET_BIT(board.pawns[col], board_.SQ64(sq));
            board.pawns[board_.Colors.BOTH] = util_.SET_BIT(board.pawns[board_.Colors.BOTH], board_.SQ64(sq));
        }

        board.materialEg[col] += util_.getValuePiece[util_.Phase.EG][pce];
        board.materialMg[col] += util_.getValuePiece[util_.Phase.MG][pce];

        board.pieceList[board_.PIECE_INDEX(pce, board.numberPieces[pce]++)] = sq;

        board.currentPolyglotKey ^= hash_.random64Poly[hash_.randomPiece + (polyPiece) * 64 + board_.SQ64(sq)];

    }
}

function movePiece(from: board_.Squares, to: board_.Squares, board: board_.board_t): boolean {
    let rcd = false;
    if (board_.SQUARE_ON_BOARD(from) && board_.SQUARE_ON_BOARD(to)) {
        //console.log(`board entering movePiece: ${board_.boardToascii(board)}`)
        const pce = board.pieces[from];
        const col = util_.getColorPiece[pce];

        board.pieces[from] = board_.Pieces.EMPTY;
        board.pieces[to] = pce;


        if (!util_.isBigPiece[pce]) {
            // -- clear
            board.pawns[col] = util_.CLEAR_BIT(board.pawns[col], board_.SQ64(from));
            board.pawns[board_.Colors.BOTH] = util_.CLEAR_BIT(board.pawns[board_.Colors.BOTH], board_.SQ64(from));
            //-- set
            board.pawns[col] = util_.SET_BIT(board.pawns[col], board_.SQ64(to));
            board.pawns[board_.Colors.BOTH] = util_.SET_BIT(board.pawns[board_.Colors.BOTH], board_.SQ64(to));
        }

        for (let index = 0; index < board.numberPieces[pce]; ++index) {
            if (board.pieceList[board_.PIECE_INDEX(pce, index)] === from) {
                board.pieceList[board_.PIECE_INDEX(pce, index)] = to;
                rcd = true;
                break;
            }
        }
        const pce_ind = hash_.randomPiece + util_.getPolyPiece[pce] * 64;
        board.currentPolyglotKey ^= hash_.random64Poly[pce_ind + board_.SQ64(from)] ^ hash_.random64Poly[pce_ind + board_.SQ64(to)];
    }
    return rcd;
}

function makeMove(move: move_t, board: board_.board_t): boolean {
    if (move === NO_MOVE) return false
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    const me = board.turn;
    const opp = me ^ 1;

    // initialise undo
    const undo = {} as board_.undo_t;
    undo.currentPolyglotKey = board.currentPolyglotKey;

    undo.turn = board.turn;
    undo.move = move;

    undo.halfMoves = board.halfMoves;
    undo.fullMoves = board.fullMoves;
    undo.historyPly = board.historyPly;
    undo.ply = board.ply;

    undo.enpassant = board.enpassant;
    undo.castlingRight = board.castlingRight;
    undo.materialEg = board.materialEg;
    undo.materialMg = board.materialMg;

    // update board
    board.turn = opp;
    board.currentPolyglotKey ^= hash_.random64Poly[hash_.randomTurn];

    const old_right = board.castlingRight;
    const new_right = old_right & util_.castlePermission[from] & util_.castlePermission[to];

    board.castlingRight = new_right;
    board.currentPolyglotKey ^= util_.castle64Hash[old_right ^ new_right]; //hack

    if (board.enpassant !== board_.Squares.OFF_SQUARE) {
        board.currentPolyglotKey ^= hash_.random64Poly[hash_.randomEnpass + util_.filesBoard[board.enpassant]];
        board.enpassant = board_.Squares.OFF_SQUARE;
    }

    board.moveHistory[board.historyPly] = undo;
    board.historyPly++;
    board.ply++;
    board.halfMoves++;
    board.fullMoves += (me === board_.Colors.BLACK) ? 1 : 0;

    if (util_.isPawn[board.pieces[from]]) {
        board.halfMoves = 0;
        if ((move & MOVE_FLAG.ENPASS) !== 0) {
            if (me === board_.Colors.WHITE) {
                clearPieces(to - 10, board);
            } else {
                clearPieces(to + 10, board);
            }
        }

        else if (((move & MOVE_FLAG.PAWN_START) !== 0)
            && ((board_.SQUARE_ON_BOARD(to - 1) && util_.isColorPawn[opp][board.pieces[to - 1]])
                || (board_.SQUARE_ON_BOARD(to + 1) && util_.isColorPawn[opp][board.pieces[to + 1]]))) {
            if (me === board_.Colors.WHITE) {
                board.enpassant = from + 10;
            } else {
                board.enpassant = from - 10;
            }
            board.currentPolyglotKey ^= hash_.random64Poly[hash_.randomEnpass + util_.filesBoard[board.enpassant]];
        }

    }
    else if ((move & MOVE_FLAG.CASTLE) !== 0) {
        switch (to) {
            case board_.Squares.C1:
                movePiece(board_.Squares.A1, board_.Squares.D1, board);
                break;
            case board_.Squares.C8:
                movePiece(board_.Squares.A8, board_.Squares.D8, board);
                break;
            case board_.Squares.G1:
                movePiece(board_.Squares.H1, board_.Squares.F1, board);
                break;
            case board_.Squares.G8:
                movePiece(board_.Squares.H8, board_.Squares.F8, board);
                break;
            default:
                board.currentPolyglotKey = undo.currentPolyglotKey;
                return false;
        }
    }

    const captured = CAPTURED(move);
    if (captured !== board_.Pieces.EMPTY) {
        clearPieces(to, board);
        board.halfMoves = 0;
    }

    //console.log(`board before movePiece: ${board_.boardToascii(board)}`)
    movePiece(from, to, board);
    //console.log(`board after movePiece: ${board_.boardToascii(board)}`)

    const prPce = PROMOTED(move);
    if (prPce !== board_.Pieces.EMPTY) {
        clearPieces(to, board);
        addPiece(to, prPce, board);
    }

    if (util_.isKing[board.pieces[to]]) {
        board.kingSquare[me] = to;
    }

    if (attack_.isSquareAttacked(board.kingSquare[me], opp, board)) {
        takeMove(board);
        return false;
    }
    return true;
}

function takeMove(board: board_.board_t): boolean {
    if (board.historyPly === 0) return false;
    board.historyPly--;
    board.ply--;
    board.fullMoves -= (board.turn === board_.Colors.WHITE) ? 1 : 0;

    const move = board.moveHistory[board.historyPly].move;
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    board.turn ^= 1;

    if ((MOVE_FLAG.ENPASS & move) !== 0) {
        if (board.turn === board_.Colors.WHITE) {
            addPiece(to - 10, board_.Pieces.BLACKPAWN, board);
        } else {
            addPiece(to + 10, board_.Pieces.WHITEPAWN, board);
        }
    } else if ((MOVE_FLAG.CASTLE & move) !== 0) {
        switch (to) {
            case board_.Squares.C1: movePiece(board_.Squares.D1, board_.Squares.A1, board); break;
            case board_.Squares.C8: movePiece(board_.Squares.D8, board_.Squares.A8, board); break;
            case board_.Squares.G1: movePiece(board_.Squares.F1, board_.Squares.H1, board); break;
            case board_.Squares.G8: movePiece(board_.Squares.F8, board_.Squares.H8, board); break;
            default: break;
        }
    }
    movePiece(to, from, board);

    if (util_.isKing[board.pieces[from]]) {
        board.kingSquare[board.turn] = from;
    }

    const captured = CAPTURED(move);
    if (captured !== board_.Pieces.EMPTY) {
        addPiece(to, captured, board);
    }

    if (PROMOTED(move) !== board_.Pieces.EMPTY) {
        clearPieces(from, board);
        addPiece(from, (util_.getColorPiece[PROMOTED(move)] === board_.Colors.WHITE ? board_.Pieces.WHITEPAWN : board_.Pieces.BLACKPAWN), board);
    }

    board.currentPolyglotKey = board.moveHistory[board.historyPly].currentPolyglotKey; //Hack
    board.turn = board.moveHistory[board.historyPly].turn;
    board.castlingRight = board.moveHistory[board.historyPly].castlingRight;
    board.halfMoves = board.moveHistory[board.historyPly].halfMoves;
    board.enpassant = board.moveHistory[board.historyPly].enpassant;
    board.turn = board.moveHistory[board.historyPly].turn;
    board.materialEg = board.moveHistory[board.historyPly].materialEg;
    board.materialMg = board.moveHistory[board.historyPly].materialMg;
    return true;
}

export {
    move_t,
    moveScore_t,
    verboseMove_t,

    NO_MOVE,

    smithToMove,
    moveToSmith,
    moveToVerboseMove,
    moveToSan,
    sanToMove,
    generateAllMoves,
    generateLegalMoves,
    clearPieces,
    addPiece,
    movePiece,
    makeMove,
    takeMove
}