// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as board_ from './board'
import * as bitboard_ from './bitboard'
import * as state_ from './state'
import * as attack_ from './attack'
import * as thread_ from '../search/thread'
import * as search_ from '../search/search'

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
    NORMAL: 0x0,
    ENPASS: 0x40000,
    PAWN_START: 0x80000,
    CASTLE: 0x1000000,
    CAPTURED: 0x7C000,
    PROMOTED: 0xF00000,
};

const NO_MOVE: move_t = 0;
const NULL_MOVE = 11;
/*****************************************************************************
 * MACRO
 ****************************************************************************/
function MOVE(from: util_.Squares, to: util_.Squares, cap: util_.Pieces, prom: util_.Pieces, flag: number) { return ((from) | (to << 7) | (cap << 14) | (prom << 20) | (flag)); }
function FROM_SQUARE(move: move_t): number { return ((move) & 0x7F); }
function TO_SQUARE(move: move_t): number { return (((move) >> 7) & 0x7F); }
function CAPTURED(move: move_t) { return (((move) >> 14) & 0xF); }
function PROMOTED(move: move_t): number { return (((move) >> 20) & 0xF); }

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

        const from = util_.FILE_RANK_TO_SQUARE(cleanedSmith[0].charCodeAt(0) - 'a'.charCodeAt(0), cleanedSmith[1].charCodeAt(0) - '1'.charCodeAt(0));
        const to = util_.FILE_RANK_TO_SQUARE(cleanedSmith[2].charCodeAt(0) - 'a'.charCodeAt(0), cleanedSmith[3].charCodeAt(0) - '1'.charCodeAt(0));

        if (util_.SQUARE_ON_BOARD(from) && util_.SQUARE_ON_BOARD(to)) {
            const moves = generateLegalMoves(board);
            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                if (FROM_SQUARE(move) === from && TO_SQUARE(move) === to) {
                    const promotionPiece = PROMOTED(move);
                    if (promotionPiece !== util_.Pieces.EMPTY) {
                        if ((cleanedSmith[4] === (util_.pieceToAscii[promotionPiece]).toLowerCase())
                            || (cleanedSmith[4] === (util_.pieceToAscii[promotionPiece]).toUpperCase())) {
                            return moves[i];
                        }
                        continue;
                    }
                    return moves[i];
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
            if (to === util_.Squares.G8 || to === util_.Squares.G1) {
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
        tmpMove = moves[i];
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

    if (util_.SQUARE_ON_BOARD(from) && util_.SQUARE_ON_BOARD(to)) {
        if ((move & MOVE_FLAG.CASTLE) !== 0) {//--castling move
            switch (to) {
                case util_.Squares.C1:
                    san = "O-O-O";
                    break;
                case util_.Squares.C8:
                    san = "O-O-O";
                    break;
                case util_.Squares.G1:
                    san = "O-O";
                    break;
                case util_.Squares.G8:
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
                const th = thread_.create(1)
                if (makeMove(move, board, th[0])) {
                    if (state_.inCheckmate(board)) {
                        san += "#";
                    }
                    else if (state_.inCheck(board)) {
                        san += "+";
                    }
                    takeMove(board, th[0]);
                }

            }
        }

    }
    return san;
}

function sanToMove(san: string, board: board_.board_t): number {
    const cleaned_san = san.replace(/[+#]?[?!]*$/, '').replace(/e.p./, '');
    const legal = generateLegalMoves(board);
    let move: move_t;
    for (move of legal) {
        if (cleaned_san == moveToSan(move, board, false)) return move;
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
function addNormal(moves: move_t[], attacks: bitboard_.bitboard_t, sq: number, pieceList: number[]) {
    const bb = { v: attacks }
    while (bb.v) {
        const to120 = util_.SQ120(bitboard_.poplsb(bb));
        moves.push(MOVE(util_.SQ120(sq), to120, pieceList[to120], util_.Pieces.EMPTY, MOVE_FLAG.NORMAL))
    }
    return moves;

}

function addJumper(f: (sq: number) => bitboard_.bitboard_t, moves: move_t[], pieces: bitboard_.bitboard_t, targets: bitboard_.bitboard_t, pieceList: number[]) {
    const bb = { v: pieces }
    while (bb.v) {
        const sq = bitboard_.poplsb(bb)
        moves = addNormal(moves, f(sq) & targets, sq, pieceList);
    }

    return moves;
}

function buildSlider(f: (sq: number, occ: bitboard_.bitboard_t) => bitboard_.bitboard_t, moves: move_t[], pieces: bitboard_.bitboard_t, targets: bitboard_.bitboard_t, occupied: bitboard_.bitboard_t, pieceList: number[]) {
    const bb = { v: pieces }
    while (bb.v) {
        const sq = bitboard_.poplsb(bb)
        moves = addNormal(moves, f(sq, occupied) & targets, sq, pieceList);
    }
    return moves;
}


function addPawn(moves: move_t[], attacks: bitboard_.bitboard_t, delta: number, pieces: number[]) {
    const bb = { v: attacks }
    while (bb.v) {
        const toSq = bitboard_.poplsb(bb)
        const flag = (Math.abs(delta / 8) == 2) ? MOVE_FLAG.PAWN_START : MOVE_FLAG.NORMAL
        moves.push(MOVE(util_.SQ120(toSq - delta), util_.SQ120(toSq), pieces[util_.SQ120(toSq)], util_.Pieces.EMPTY, flag))
    }

    return moves;
}

function addPromotion(board: board_.board_t, moves: move_t[], attacks: bitboard_.bitboard_t, delta: number) {
    const bb = { v: attacks }
    while (bb.v) {
        const tosq = bitboard_.poplsb(bb)
        moves.push(MOVE(util_.SQ120(tosq - delta), util_.SQ120(tosq), board.pieces[util_.SQ120(tosq)], util_.ptToP(board.turn, util_.PieceType.QUEEN), 0))
        moves.push(MOVE(util_.SQ120(tosq - delta), util_.SQ120(tosq), board.pieces[util_.SQ120(tosq)], util_.ptToP(board.turn, util_.PieceType.KNIGHT), 0))
        moves.push(MOVE(util_.SQ120(tosq - delta), util_.SQ120(tosq), board.pieces[util_.SQ120(tosq)], util_.ptToP(board.turn, util_.PieceType.BISHOP), 0))
        moves.push(MOVE(util_.SQ120(tosq - delta), util_.SQ120(tosq), board.pieces[util_.SQ120(tosq)], util_.ptToP(board.turn, util_.PieceType.ROOK), 0))
    }

    return moves;

}
function addEnpass(moves: move_t[], attacks: bitboard_.bitboard_t, epsq64: number) {
    const bb = { v: attacks }
    while (bb.v) {
        moves.push(MOVE(util_.SQ120(bitboard_.poplsb(bb)), util_.SQ120(epsq64), util_.Pieces.EMPTY, util_.Pieces.EMPTY, MOVE_FLAG.ENPASS))
    }

    return moves;
}


function generateQuiet(board: board_.board_t, moves: move_t[]): number {
    const start = moves.length
    const UP = bitboard_.pawnPush(board.turn)
    const rank3BB = bitboard_.ranks[util_.relativeRank(board.turn, 2)];

    const occupied = bitboard_.getPieces(board.turn, board) | bitboard_.getPieces(board.turn ^ 1, board);
    let castles = 0n;
    if (board.turn == util_.Colors.WHITE) {
        castles |= (board.castlingRight & util_.Castling.WHITE_CASTLE_OO) ? bitboard_.bit(util_.SQ64(util_.Squares.H1)) : 0n
        castles |= (board.castlingRight & util_.Castling.WHITE_CASTLE_OOO) ? bitboard_.bit(util_.SQ64(util_.Squares.A1)) : 0n
    } else {
        castles |= (board.castlingRight & util_.Castling.BLACK_CASTLE_OO) ? bitboard_.bit(util_.SQ64(util_.Squares.H8)) : 0n
        castles |= (board.castlingRight & util_.Castling.BLACK_CASTLE_OOO) ? bitboard_.bit(util_.SQ64(util_.Squares.A8)) : 0n
    }

    const myPawns = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.PAWN)];
    const myKnights = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.KNIGHT)];
    const myBishops = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.BISHOP)] | board.piecesBB[util_.ptToP(board.turn, util_.PieceType.QUEEN)];
    const myRooks = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.ROOK)] | board.piecesBB[util_.ptToP(board.turn, util_.PieceType.QUEEN)];
    const myKing = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.KING)];

    const kingAttackers = attack_.allAttackersToSquare(board, occupied, util_.SQ64(board.kingSquare[board.turn])) & bitboard_.getPieces(board.turn ^ 1, board)

    // Double checks can only be evaded by moving the King
    if (bitboard_.several(kingAttackers)) {
        addJumper(bitboard_.kingAttacks, moves, myKing, BigInt.asUintN(64, ~occupied), board.pieces)
        return moves.length - start
    }

    // When checked, we must block the checker with non-King pieces
    const destinations = (!kingAttackers) ? BigInt.asUintN(64, ~occupied)
        : bitboard_.squaresBetween(bitboard_.lsb(myKing), bitboard_.lsb(kingAttackers))

    // Compute bitboards for each type of Pawn movement
    const pawnForwardOne = bitboard_.pawnAdvance(myPawns, occupied, board.turn) & BigInt.asUintN(64, ~bitboard_.promotionRanks);
    const pawnForwardTwo = bitboard_.pawnAdvance(pawnForwardOne & rank3BB, occupied, board.turn);

    // Generate moves for all the pawns, so long as they are quiet
    moves = addPawn(moves, pawnForwardOne & destinations, UP, board.pieces);
    moves = addPawn(moves, pawnForwardTwo & destinations, UP * 2, board.pieces);

    // Generate moves for the remainder of the pieces, so long as they are quiet
    moves = addJumper(bitboard_.knightAttacks, moves, myKnights, destinations, board.pieces);
    moves = buildSlider(bitboard_.bishopAttacks, moves, myBishops, destinations, occupied, board.pieces);
    moves = buildSlider(bitboard_.rookAttacks, moves, myRooks, destinations, occupied, board.pieces);
    moves = addJumper(bitboard_.kingAttacks, moves, myKing, BigInt.asUintN(64, ~occupied), board.pieces);

    // Attempt to generate a castle move for each rook
    const cBB = { v: castles }
    while (cBB.v && !kingAttackers) {
        // Figure out which pieces are moving to which squares
        const rook = bitboard_.poplsb(cBB), king = bitboard_.lsb(myKing);
        const rookTo = castleRookTo(king, rook);
        const kingTo = castleKingTo(king, rook);

        let attacked = 0;

        // Castle is illegal if we would go over a piece
        let mask = bitboard_.squaresBetween(king, kingTo) | bitboard_.bit(kingTo);
        mask |= bitboard_.squaresBetween(rook, rookTo) | bitboard_.bit(rookTo);
        mask &= BigInt.asUintN(64, ~(bitboard_.bit(king) | bitboard_.bit(rook)));

        if (occupied & mask) continue;
        // Castle is illegal if we move through a checking threat
        const maskBB = { v: bitboard_.squaresBetween(king, kingTo) };
        while (maskBB.v) {
            if (attack_.squareIsAttacked(bitboard_.poplsb(maskBB), board.turn, board)) {
                attacked = 1;
                break;
            }
        }
        if (attacked) continue;

        // All conditions have been met. Identify which side we are castling to
        moves.push(MOVE(util_.SQ120(king), util_.SQ120(kingTo), util_.Pieces.EMPTY, util_.Pieces.EMPTY, MOVE_FLAG.CASTLE))
    }

    return moves.length - start;
}


function generateNoisy(board: board_.board_t, moves: move_t[]): number {
    const start = moves.length
    const rank7BB = bitboard_.ranks[util_.relativeRank(board.turn, 6)];

    const UpLeft = (board.turn == util_.Colors.WHITE) ? bitboard_.Direction.NORTH_WEST : bitboard_.Direction.SOUTH_EAST;
    const UpRight = (board.turn == util_.Colors.WHITE) ? bitboard_.Direction.NORTH_EAST : bitboard_.Direction.SOUTH_WEST;
    const UP = bitboard_.pawnPush(board.turn);

    const US = bitboard_.getPieces(board.turn, board)
    const THEM = bitboard_.getPieces(board.turn ^ 1, board)
    const occupied = US | THEM;

    const myPawns = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.PAWN)];
    const myKnights = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.KNIGHT)];
    const myBishops = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.BISHOP)] | board.piecesBB[util_.ptToP(board.turn, util_.PieceType.QUEEN)];
    const myRooks = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.ROOK)] | board.piecesBB[util_.ptToP(board.turn, util_.PieceType.QUEEN)];
    const myKing = board.piecesBB[util_.ptToP(board.turn, util_.PieceType.KING)];

    const kingAttackers = attack_.allAttackersToSquare(board, occupied, util_.SQ64(board.kingSquare[board.turn])) & bitboard_.getPieces(board.turn ^ 1, board)

    // Double checks can only be evaded by moving the King
    if (bitboard_.several(kingAttackers)) {
        addJumper(bitboard_.kingAttacks, moves, myKing, THEM, board.pieces)
        return moves.length - start
    }

    // When checked, we may only uncheck by capturing the checker
    const destinations = kingAttackers ? kingAttackers : THEM;

    const pawnsOn7 = myPawns & rank7BB;
    const pawnsNotOn7 = myPawns & BigInt.asUintN(64, ~rank7BB);

    // Promotions and underpromotions
    if (pawnsOn7) {
        const b1 = bitboard_.shift(UpRight, pawnsOn7) & destinations;
        const b2 = bitboard_.shift(UpLeft, pawnsOn7) & destinations;
        const b3 = bitboard_.shift(UP, pawnsOn7) & BigInt.asUintN(64, ~occupied);

        moves = addPromotion(board, moves, b1, UpRight)
        moves = addPromotion(board, moves, b2, UpLeft)
        moves = addPromotion(board, moves, b3, UP)
    }

    // Standard and en passant captures
    let b1 = bitboard_.shift(UpRight, pawnsNotOn7) & destinations;
    const b2 = bitboard_.shift(UpLeft, pawnsNotOn7) & destinations;
    moves = addPawn(moves, b1, UpRight, board.pieces);
    moves = addPawn(moves, b2, UpLeft, board.pieces);

    if (board.enpassant !== util_.Squares.OFF_SQUARE) {
        b1 = pawnsNotOn7 & bitboard_.pawnAttacks(board.turn ^ 1, util_.SQ64(board.enpassant))
        moves = addEnpass(moves, b1, util_.SQ64(board.enpassant))
    }

    // Generate moves for the remainder of the pieces, so long as they are quiet
    moves = addJumper(bitboard_.knightAttacks, moves, myKnights, destinations, board.pieces);
    moves = buildSlider(bitboard_.bishopAttacks, moves, myBishops, destinations, occupied, board.pieces);
    moves = buildSlider(bitboard_.rookAttacks, moves, myRooks, destinations, occupied, board.pieces);
    moves = addJumper(bitboard_.kingAttacks, moves, myKing, THEM, board.pieces);

    return moves.length - start;
}

/// pseudoLegal takes a random move and tests whether the move is
/// pseudo legal. It is used to validate moves from TT that can be corrupted
/// due to SMP concurrent access or hash position key aliasing.

function pseudoLegal(board: board_.board_t, move: move_t): boolean {
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);
    const fType = util_.pToPt(board.pieces[from]);

    const friendly = bitboard_.getPieces(board.turn, board);
    const enemy = bitboard_.getPieces(board.turn ^ 1, board);
    const occupied = friendly | enemy;
    let castles = 0n;
    if (board.turn == util_.Colors.WHITE) {
        castles |= (board.castlingRight & util_.Castling.WHITE_CASTLE_OO) ? bitboard_.bit(util_.SQ64(util_.Squares.H1)) : 0n
        castles |= (board.castlingRight & util_.Castling.WHITE_CASTLE_OOO) ? bitboard_.bit(util_.SQ64(util_.Squares.A8)) : 0n
    } else {
        castles |= (board.castlingRight & util_.Castling.BLACK_CASTLE_OO) ? bitboard_.bit(util_.SQ64(util_.Squares.H8)) : 0n
        castles |= (board.castlingRight & util_.Castling.BLACK_CASTLE_OOO) ? bitboard_.bit(util_.SQ64(util_.Squares.A8)) : 0n
    }

    let attacks = 0n;
    let forward = 0n;
    let kingAttackers: bitboard_.bitboard_t, cBB: bitboard_.bitboardObj_t


    if ((move == NO_MOVE || move == NULL_MOVE)
        || (util_.PIECE_COLOR(board.pieces[from]) != board.turn)
        || (!!(PROMOTED(move)) && !!(move & MOVE_FLAG.ENPASS))
        || (!!(PROMOTED(move)) && !!(move & MOVE_FLAG.PAWN_START))
        || (!!(PROMOTED(move)) && !!(move & MOVE_FLAG.CASTLE)))
        return false;

    switch (fType) {
        case util_.PieceType.KNIGHT:
            return !!(move & MOVE_FLAG.NORMAL) && bitboard_.isSet(bitboard_.knightAttacks(util_.SQ64(from)) & BigInt.asUintN(64, ~friendly), util_.SQ64(to))
        case util_.PieceType.BISHOP:
            return !!(move & MOVE_FLAG.NORMAL) && bitboard_.isSet(bitboard_.bishopAttacks(util_.SQ64(from), occupied) & BigInt.asUintN(64, ~friendly), util_.SQ64(to))
        case util_.PieceType.ROOK:
            return !!(move & MOVE_FLAG.NORMAL) && bitboard_.isSet(bitboard_.rookAttacks(util_.SQ64(from), occupied) & BigInt.asUintN(64, ~friendly), util_.SQ64(to))
        case util_.PieceType.QUEEN:
            return !!(move & MOVE_FLAG.NORMAL) && bitboard_.isSet(bitboard_.queenAttacks(util_.SQ64(from), occupied) & BigInt.asUintN(64, ~friendly), util_.SQ64(to))
        case util_.PieceType.PAWN:
            if (move & MOVE_FLAG.CASTLE) false;

            attacks = bitboard_.pawnAttacks(board.turn, util_.SQ64(from));

            if (move & MOVE_FLAG.ENPASS)
                return to == board.enpassant && bitboard_.isSet(attacks, util_.SQ64(to));

            forward = bitboard_.pawnAdvance(bitboard_.bit(util_.SQ64(from)), occupied, board.turn);

            if (move & MOVE_FLAG.PROMOTED)
                return bitboard_.isSet(bitboard_.promotionRanks & ((attacks & enemy) | forward), util_.SQ64(to))

            forward |= bitboard_.pawnAdvance(forward & (!board.turn ? bitboard_.ranks[2] : bitboard_.ranks[5]), occupied, board.turn);
            return bitboard_.isSet(BigInt.asUintN(64, ~bitboard_.promotionRanks) & ((attacks & enemy) | forward), util_.SQ64(to))

        case util_.PieceType.KING:
            if (move & MOVE_FLAG.NORMAL) return bitboard_.isSet(bitboard_.kingAttacks(util_.SQ64(from)) & BigInt.asUintN(64, ~friendly), util_.SQ64(to));
            if (!(move & MOVE_FLAG.CASTLE)) return false;

            // Attempt to generate a castle move for each rook
            kingAttackers = attack_.allAttackersToSquare(board, occupied, util_.SQ64(board.kingSquare[board.turn]))
            cBB = { v: castles }
            while (cBB.v && !kingAttackers) {
                // Figure out which pieces are moving to which squares
                const rook = bitboard_.poplsb(cBB), king = util_.SQ64(from);
                const rookTo = castleRookTo(king, rook);
                const kingTo = castleKingTo(king, rook);

                if (move != MOVE(util_.SQ120(king), util_.SQ120(rook), util_.Pieces.EMPTY, util_.Pieces.EMPTY, MOVE_FLAG.CASTLE)) continue;

                // Castle is illegal if we would go over a piece
                let mask = bitboard_.squaresBetween(king, kingTo) | bitboard_.bit(kingTo);
                mask |= bitboard_.squaresBetween(rook, rookTo) | bitboard_.bit(rookTo);
                mask &= ~(bitboard_.bit(king) | bitboard_.bit(rook));
                if (occupied & mask) return false;

                // Castle is illegal if we move through a checking threat
                const maskBB = { v: bitboard_.squaresBetween(king, kingTo) };
                while (maskBB.v)
                    if (attack_.squareIsAttacked(bitboard_.poplsb(maskBB), board.turn, board)) return false;


                return true;
            }
            return false;

        default:
            return false
    }
}

function generateLegalMoves(board: board_.board_t): move_t[] {
    const thread = thread_.create(1)[0];
    const rlt: move_t[] = []

    const pseudoMoves = generateAllMoves(board);
    for (const move of pseudoMoves) {
        if (!makeMove(move, board, thread)) {
            continue;
        }
        rlt.push(move);
        takeMove(board, thread);
    }
    return rlt;
}


function generateAllMoves(board: board_.board_t): move_t[] {
    const pseudoMoves: move_t[] = []
    generateNoisy(board, pseudoMoves);
    generateQuiet(board, pseudoMoves);
    return pseudoMoves
}

/*****************************************************************************
* MOVE MAKE
****************************************************************************/
function clearPieces(sq: util_.Squares, board: board_.board_t): void {
    if (util_.SQUARE_ON_BOARD(sq)) {
        const pce = board.pieces[sq];
        const col = util_.getColorPiece[pce];
        let index;
        let t_pceNum = -1;

        board.pieces[sq] = util_.Pieces.EMPTY;

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

        for (index = 0; index < board.numberPieces[pce]; ++index) {
            if (board.pieceList[util_.PIECE_INDEX(pce, index)] === sq) {
                t_pceNum = index;
                break;
            }
        }

        board.numberPieces[pce]--;
        board.piecesBB[pce] ^= bitboard_.bit(util_.SQ64(sq));
        board.pieceList[util_.PIECE_INDEX(pce, t_pceNum)] = board.pieceList[util_.PIECE_INDEX(pce, board.numberPieces[pce])];

        board.currentPolyglotKey ^= (util_.random64Poly[util_.randomPiece + (util_.getPolyPiece[pce]) * 64 + util_.SQ64(sq)]);

    }
}

function addPiece(sq: util_.Squares, pce: util_.Pieces, board: board_.board_t): void {
    if (util_.SQUARE_ON_BOARD(sq) && util_.IS_VALID_PIECE(pce)) {
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

        board.materialEg[col] += util_.getValuePiece[util_.Phase.EG][pce];
        board.materialMg[col] += util_.getValuePiece[util_.Phase.MG][pce];

        board.pieceList[util_.PIECE_INDEX(pce, board.numberPieces[pce]++)] = sq;

        board.piecesBB[pce] |= bitboard_.bit(util_.SQ64(sq));

        board.currentPolyglotKey ^= util_.random64Poly[util_.randomPiece + (polyPiece) * 64 + util_.SQ64(sq)];

    }
}

function movePiece(from: util_.Squares, to: util_.Squares, board: board_.board_t): boolean {
    let rcd = false;
    if (util_.SQUARE_ON_BOARD(from) && util_.SQUARE_ON_BOARD(to)) {
        const pce = board.pieces[from];
        board.pieces[from] = util_.Pieces.EMPTY;
        board.pieces[to] = pce;

        board.piecesBB[pce] ^= bitboard_.bit(util_.SQ64(from));
        board.piecesBB[pce] |= bitboard_.bit(util_.SQ64(to));

        for (let index = 0; index < board.numberPieces[pce]; ++index) {
            if (board.pieceList[util_.PIECE_INDEX(pce, index)] === from) {
                board.pieceList[util_.PIECE_INDEX(pce, index)] = to;
                rcd = true;
                break;
            }
        }
        const pce_ind = util_.randomPiece + util_.getPolyPiece[pce] * 64;
        board.currentPolyglotKey ^= util_.random64Poly[pce_ind + util_.SQ64(from)] ^ util_.random64Poly[pce_ind + util_.SQ64(to)];
    }
    return rcd;
}

function makeMove(move: move_t, board: board_.board_t, thread: thread_.thread_t): boolean {
    if (move === NO_MOVE) return false
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    const me = board.turn;
    const opp = me ^ 1;

    // initialise undo
    const undo = {} as board_.undo_t;
    undo.currentPolyglotKey = board.currentPolyglotKey;

    undo.turn = me;
    undo.move = move;

    undo.halfMoves = board.halfMoves;
    undo.fullMoves = board.fullMoves;
    undo.ply = board.ply;

    undo.enpassant = board.enpassant;
    undo.castlingRight = board.castlingRight;
    undo.materialEg = board.materialEg;
    undo.materialMg = board.materialMg;

    thread.undoStack[thread.height] = undo;

    // update board
    board.turn = opp;
    board.currentPolyglotKey ^= util_.random64Poly[util_.randomTurn];

    const old_right = board.castlingRight;
    const new_right = old_right & util_.castlePermission[from] & util_.castlePermission[to];

    board.castlingRight = new_right;
    board.currentPolyglotKey ^= util_.castle64Hash[old_right ^ new_right]; //hack

    if (board.enpassant != util_.Squares.OFF_SQUARE) {
        board.currentPolyglotKey ^= util_.random64Poly[util_.randomEnpass + util_.filesBoard[board.enpassant]];
        board.enpassant = util_.Squares.OFF_SQUARE;
    }

    thread.height++;
    board.ply++;
    board.halfMoves++;
    board.fullMoves += (me === util_.Colors.BLACK) ? 1 : 0;

    if (util_.isPawn[board.pieces[from]]) {
        board.halfMoves = 0;
        if ((move & MOVE_FLAG.ENPASS) !== 0) {
            if (me === util_.Colors.WHITE) {
                clearPieces(to - 10, board);
            } else {
                clearPieces(to + 10, board);
            }
        }

        else if (((move & MOVE_FLAG.PAWN_START) !== 0)
            && ((util_.SQUARE_ON_BOARD(to - 1) && util_.isColorPawn[opp][board.pieces[to - 1]])
                || (util_.SQUARE_ON_BOARD(to + 1) && util_.isColorPawn[opp][board.pieces[to + 1]]))) {
            if (me === util_.Colors.WHITE) {
                board.enpassant = from + 10;
            } else {
                board.enpassant = from - 10;
            }
            board.currentPolyglotKey ^= util_.random64Poly[util_.randomEnpass + util_.filesBoard[board.enpassant]];
        }

    }
    else if ((move & MOVE_FLAG.CASTLE) !== 0) {
        switch (to) {
            case util_.Squares.C1:
                movePiece(util_.Squares.A1, util_.Squares.D1, board);
                break;
            case util_.Squares.C8:
                movePiece(util_.Squares.A8, util_.Squares.D8, board);
                break;
            case util_.Squares.G1:
                movePiece(util_.Squares.H1, util_.Squares.F1, board);
                break;
            case util_.Squares.G8:
                movePiece(util_.Squares.H8, util_.Squares.F8, board);
                break;
            default:
                board.currentPolyglotKey = undo.currentPolyglotKey;
                return false;
        }
    }

    const captured = CAPTURED(move);
    if (captured !== util_.Pieces.EMPTY) {
        clearPieces(to, board);
        board.halfMoves = 0;
    }

    movePiece(from, to, board);

    const prPce = PROMOTED(move);
    if (prPce !== util_.Pieces.EMPTY) {
        clearPieces(to, board);
        addPiece(to, prPce, board);
    }

    if (util_.isKing[board.pieces[to]]) {
        board.kingSquare[me] = to;
    }

    if (attack_.isSquareAttacked(board.kingSquare[me], opp, board)) {
        takeMove(board, thread);
        return false;
    }

    return true;
}

function takeMove(board: board_.board_t, thread: thread_.thread_t): boolean {
    if (thread.height === 0) return false;
    thread.height--;
    board.ply--;
    board.fullMoves -= (board.turn === util_.Colors.WHITE) ? 1 : 0;

    const move = thread.undoStack[thread.height].move;
    const from = FROM_SQUARE(move);
    const to = TO_SQUARE(move);

    board.turn ^= 1;

    if ((MOVE_FLAG.ENPASS & move) !== 0) {
        if (board.turn === util_.Colors.WHITE) {
            addPiece(to - 10, util_.Pieces.BLACKPAWN, board);
        } else {
            addPiece(to + 10, util_.Pieces.WHITEPAWN, board);
        }
    } else if ((MOVE_FLAG.CASTLE & move) !== 0) {
        switch (to) {
            case util_.Squares.C1:
                movePiece(util_.Squares.D1, util_.Squares.A1, board);
                break;
            case util_.Squares.C8:
                movePiece(util_.Squares.D8, util_.Squares.A8, board);
                break;
            case util_.Squares.G1:
                movePiece(util_.Squares.F1, util_.Squares.H1, board);
                break;
            case util_.Squares.G8:
                movePiece(util_.Squares.F8, util_.Squares.H8, board);
                break;
            default: break;
        }
    }
    movePiece(to, from, board);

    if (util_.isKing[board.pieces[from]]) {
        board.kingSquare[board.turn] = from;
    }

    const captured = CAPTURED(move);
    if (captured !== util_.Pieces.EMPTY) {
        addPiece(to, captured, board);
    }

    if (PROMOTED(move) !== util_.Pieces.EMPTY) {
        clearPieces(from, board);
        const pc = (util_.getColorPiece[PROMOTED(move)] === util_.Colors.WHITE ? util_.Pieces.WHITEPAWN : util_.Pieces.BLACKPAWN)
        addPiece(from, pc, board);
    }

    board.currentPolyglotKey = thread.undoStack[thread.height].currentPolyglotKey; //Hack
    board.turn = thread.undoStack[thread.height].turn;
    board.castlingRight = thread.undoStack[thread.height].castlingRight;
    board.halfMoves = thread.undoStack[thread.height].halfMoves;
    board.enpassant = thread.undoStack[thread.height].enpassant;
    board.materialEg = thread.undoStack[thread.height].materialEg;
    board.materialMg = thread.undoStack[thread.height].materialMg;
    return true;
}

function makeNullMove(board: board_.board_t, thread: thread_.thread_t) {
    const undo = {} as board_.undo_t;

    undo.currentPolyglotKey = board.currentPolyglotKey;
    undo.enpassant = board.enpassant;
    undo.halfMoves = board.halfMoves++;
    undo.fullMoves = board.fullMoves++;
    undo.ply = board.ply++;
    undo.materialMg = board.materialMg;
    undo.materialEg = board.materialEg;

    thread.undoStack[thread.height] = undo;

    board.turn = board.turn ^ 1;
    board.currentPolyglotKey ^= util_.random64Poly[util_.randomTurn];

    board.currentPolyglotKey ^= util_.random64Poly[util_.randomEnpass + util_.filesBoard[board.enpassant]];
    if (board.enpassant != util_.Squares.OFF_SQUARE) {
        board.currentPolyglotKey ^= util_.random64Poly[util_.randomEnpass + util_.filesBoard[board.enpassant]];
        board.enpassant = util_.Squares.OFF_SQUARE;
    }

    thread.height++;
}


function make(move: move_t, board: board_.board_t, thread: thread_.thread_t): boolean {
    if (move == NULL_MOVE) {
        thread.movesStack[thread.height] = NULL_MOVE;
        makeNullMove(board, thread);
    }
    else {
        // Track some move information for history lookups
        thread.movesStack[thread.height] = move;
        thread.pieceStack[thread.height] = board.pieces[FROM_SQUARE(move)];

        // Apply the move and reject if illegal
        if (!makeMove(move, board, thread)) {
            return false
        }
    }
    return true;
}

function takeNullMove(board: board_.board_t, thread: thread_.thread_t) {
    thread.height--;
    board.ply--;

    board.currentPolyglotKey = thread.undoStack[thread.height].currentPolyglotKey; //Hack
    board.castlingRight = thread.undoStack[thread.height].castlingRight;
    board.halfMoves = thread.undoStack[thread.height].halfMoves;
    board.enpassant = thread.undoStack[thread.height].enpassant;
    board.materialEg = thread.undoStack[thread.height].materialEg;
    board.materialMg = thread.undoStack[thread.height].materialMg;

    board.turn = board.turn ^ 1;
    return true;
}

function take(move: move_t, board: board_.board_t, thread: thread_.thread_t): boolean {
    if (move == NULL_MOVE) {
        return takeNullMove(board, thread)
    }
    else {
        return takeMove(board, thread)
    }
}


function bestCaseValue(board: board_.board_t): number {
    // Assume the opponent has at least a pawn
    let value = search_.SEEPieceValues[util_.PieceType.PAWN];

    // Check for a higher value target
    for (let piece = util_.PieceType.QUEEN; piece > util_.PieceType.PAWN; piece--)
        if (board.piecesBB[util_.ptToP(board.turn ^ 1, piece)]) { value = search_.SEEPieceValues[piece]; break; }

    // Check for a potential pawn promotion
    if (board.piecesBB[util_.ptToP(board.turn, util_.PieceType.PAWN)] & bitboard_.ranks[util_.relativeRank(board.turn, 6)])
        value += search_.SEEPieceValues[util_.PieceType.QUEEN] - search_.SEEPieceValues[util_.PieceType.PAWN];

    return value;
}

function castleKingTo(k: number, r: number) {
    return util_.squareOf(util_.rankOf(k), (r > k) ? 6 : 2);
}
function castleRookTo(k: number, r: number) {
    return util_.squareOf(util_.rankOf(k), (r > k) ? 5 : 3);
}


function estimatedValue(board: board_.board_t, move: move_t): number {
    // Start with the value of the piece on the target square
    let value = search_.SEEPieceValues[util_.pToPt(board.pieces[TO_SQUARE(move)])];

    // Factor in the new piece's value and remove our promoted pawn
    if (move & MOVE_FLAG.PROMOTED)
        value += search_.SEEPieceValues[util_.pToPt(PROMOTED(move))] - search_.SEEPieceValues[util_.PieceType.PAWN];

    // Target square is encoded as empty for enpass moves
    else if (move & MOVE_FLAG.ENPASS)
        value = search_.SEEPieceValues[util_.PieceType.PAWN];

    // We encode Castle moves as KxR, so the initial step is wrong
    else if (move & MOVE_FLAG.CASTLE)
        value = 0;

    return value;
}


function moveExaminedByMultiPV(thread: thread_.thread_t, move: move_t): number {
    // Check to see if this move was already selected as the
    // best move in a previous iteration of this search depth

    for (let i = 0; i < thread.multiPV; i++)
        if (thread.bestMoves[i] == move)
            return 1;
    return 0;
}

function moveIsInRootMoves(thread: thread_.thread_t, move: move_t): number {

    // We do two things: 1) Check to make sure we are not using a move which
    // has been flagged as excluded thanks to Syzygy probing. 2) Check to see
    // if we are doing a "go searchmoves <>"  command, in which case we have
    // to limit our search to the provided moves.

    for (let i = 0; i < util_.MAX_MOVES; i++)
        if (move == thread.searchInfo.excludedMoves[i])
            return 0;

    if (!thread.searchInfo.limitedByMoves)
        return 1;

    for (let i = 0; i < util_.MAX_MOVES; i++)
        if (move == thread.searchInfo.searchMoves[i])
            return 1;

    return 0;
}

function moveIsTactical(board: board_.board_t, move: move_t): boolean {
    // Check for captures, promotions, or enpassant. Castle moves may appear to be
    // tactical, since the King may move to its own square, or the rooks square
    return (board.pieces[TO_SQUARE(move)] != util_.Pieces.EMPTY && !(move && MOVE_FLAG.CASTLE))
        || !!(move & MOVE_FLAG.ENPASS & MOVE_FLAG.PROMOTED);
}

export {
    move_t,
    moveScore_t,
    verboseMove_t,

    NO_MOVE,
    NULL_MOVE,
    MOVE_FLAG,


    smithToMove,
    moveToSmith,
    moveToVerboseMove,
    moveToSan,
    sanToMove,

    generateLegalMoves,
    generateAllMoves,
    generateQuiet,
    generateNoisy,
    pseudoLegal,

    clearPieces,
    addPiece,
    movePiece,
    makeMove,
    takeMove,
    make,
    take,
    bestCaseValue,

    FROM_SQUARE,
    TO_SQUARE,
    PROMOTED,
    estimatedValue,

    moveExaminedByMultiPV,
    moveIsInRootMoves,
    moveIsTactical,
}