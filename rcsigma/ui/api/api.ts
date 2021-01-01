// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as perft_ from '../../game/perft'
import * as hash_ from '../../game/hash'
import * as move_ from '../../game/move'
import * as state_ from '../../game/state'
import * as rc0_eval_ from '../../evaluate/rc0/backend/nn'
import * as rc_eval_ from '../../evaluate/rc/eval'


export class Raccoon {
    private board: board_.board_t;
    //private evalFN: util_.evaluationFN
    private startFEN: string
    //private book_path: string
    private movesHistory: move_.verboseMove_t[]

    public constructor(config?: {
        evaluateFN?: string;
        startFEN?: string;
        book_path?: string | ArrayBufferLike;
    }) {
        util_.initializeGame();

        this.board = board_.newBoard();
        this.movesHistory = [];
        //this.evalFN = ((typeof config !== 'undefined') && ('evaluateFN' in config)) ? config.evaluateFN! : rc_eval_.raccoonEvaluate;
        this.startFEN = ((typeof config !== 'undefined') && ('startFEN' in config)) ? config.startFEN! : util_.START_FEN;
        //this.book_path = ((typeof config !== 'undefined') && ('book_path' in config)) ? config.book_path! : "No book path provided";
        board_.fenToBoard(this.startFEN, this.board)
    }

    // Game Board
    public loadFEN(fen: string): { value: boolean, error: string } {
        try {
            board_.fenToBoard(fen, this.board);
        }
        catch (err) {
            return { value: false, error: (err as Error).message };
        }
        this.startFEN = fen; // stores last load for resetting board
        this.movesHistory = [];
        return { value: true, error: "No error!" }
    }
    public getFEN(): string {
        return board_.boardToFen(this.board);
    }
    public getPolyglot(byMove = false): bigint {
        if (byMove) {
            return this.board.currentPolyglotKey;
        }
        return hash_.polyglotKey(this.board);
    }
    public boardASCII(show_info = false, config = {
        pieces: ["P", "B", "N", "R", "Q", "K", "p", "b", "n", "r", "q", "k"],
        light_square: "-",
        dark_square: "="
    }): string {
        return board_.boardToASCII(this.board, config.pieces, config.light_square, config.dark_square, show_info);
    }
    public boardANSI(show_info = false, color_config = {
        piece: {
            white: util_.pieceAnsi.white,
            black: util_.pieceAnsi.black,
        },
        square: {
            dark: util_.squareAnsi.dark,
            light: util_.squareAnsi.light,
        }
    }): string {

        return board_.boardToANSI(this.board, color_config.piece.white, color_config.piece.black, color_config.square.light, color_config.square.dark, show_info);
    }
    public clearBoard(): void {
        board_.clearBoard(this.board);
        this.movesHistory = [];
    }
    public getBoard(): board_.position_t {
        return board_.boardToPosition_t(this.board);
    }
    public resetBoard(): void {
        board_.fenToBoard(this.startFEN, this.board);
        this.movesHistory = []; // history is overwritten 
    }
    public flipBoard(): void {
        board_.mirrorBoard(this.board)
    }


    // Game Moves
    public makeMove(move: string | { from: string, to: string, promotion?: string }): move_.verboseMove_t | null {
        let mv = move_.NO_MOVE;
        if (typeof move === 'string') {
            mv = move_.smithToMove(move, this.board);
            if (mv === move_.NO_MOVE) {
                mv = move_.sanToMove(move, this.board);
            }
        } else {
            let tmp = move.from + move.to;
            if ('promotion' in move) {
                tmp += move.promotion;
            }
            mv = move_.smithToMove(tmp, this.board);
        }

        const move_veb = move_.moveToVerboseMove(mv, this.board);
        if (move_.makeMove(mv, this.board)) {
            this.movesHistory.push(move_veb);
            return move_veb;
        }
        return null;
    }
    public undoMove(): move_.verboseMove_t | null {
        if (move_.takeMove(this.board)) {
            return this.movesHistory.pop()!;
        } else {
            return null;
        }
    }
    public getMoves(option?: { square?: string, verbose?: boolean, capture_only?: boolean }): string[] | move_.verboseMove_t[] {
        const square = ((typeof option !== 'undefined') && ('square' in option)) ? board_.algebraicToSquare(option.square!) : board_.Squares.ALL;
        const verbose = (typeof option !== 'undefined') && ('verbose' in option) && option.verbose;
        const capture_only = (typeof option !== 'undefined') && ('capture_only' in option) && option.capture_only;

        const moves_score = move_.generateLegalMoves(this.board, capture_only, square);
        const rlt_str_list: string[] = [];
        const rlt_ver_list: move_.verboseMove_t[] = [];
        for (const mv of moves_score) {
            const verb_mv = move_.moveToVerboseMove(mv.move, this.board);
            if (verbose) {
                rlt_ver_list.push(verb_mv);
            } else {
                rlt_str_list.push(verb_mv.san);
            }
        }
        return (verbose) ? rlt_ver_list : rlt_str_list;
    }

    public moveHistory(option?: { verbose: boolean }): string[] | move_.verboseMove_t[] {
        const verbose = (typeof option !== 'undefined') && ('verbose' in option) && option.verbose;
        const rlt_ver_list = this.movesHistory;
        return (verbose) ? rlt_ver_list : rlt_ver_list.map((verboseMove) => verboseMove.san);
    }


    // Game State
    public inCheck(): boolean {
        return state_.inCheck(this.board);
    }
    public inCheckmate(): boolean {
        return state_.inCheckmate(this.board);
    }
    public inStalemate(): boolean {
        return state_.inStalemate(this.board);
    }
    public inThreefoldRepetition(): boolean {
        return state_.inThreefoldRepetition(this.board);
    }
    public insufficientMaterial(): boolean {
        return state_.insufficientMaterial(this.board);
    }
    public inDraw(): boolean {
        return state_.inDraw(this.board);
    }
    public gameOver(): boolean {
        return state_.gameOver(this.board);
    }


    // Pieces
    private peekPiece(square: string, remove = false): null | board_.piece_t {
        const sq = board_.algebraicToSquare(square);
        let rlt: { type: string, color: string };
        if (board_.SQUARE_ON_BOARD(sq) && this.board.pieces[sq] !== board_.Pieces.EMPTY) {
            rlt = {
                type: util_.pieceToAscii[this.board.pieces[sq]].toLowerCase(),
                color: (util_.getColorPiece[this.board.pieces[sq]] === board_.Colors.WHITE) ? 'w' : 'b'
            };
            if (remove) move_.clearPieces(sq, this.board);
            return rlt;
        }
        return null;

    }
    public getPiece(square: string): null | board_.piece_t {
        return this.peekPiece(square);
    }
    public popPiece(square: string): null | board_.piece_t {
        return this.peekPiece(square, true);
    }
    public setPiece(piece: board_.piece_t, square: string): boolean {
        const sq = board_.algebraicToSquare(square);

        if (sq === board_.Squares.OFF_BOARD) return false;
        if (!"wb".includes(piece.color)) return false;

        const look = (piece.color === 'w') ? (piece.type).toUpperCase() : (piece.type).toLowerCase();
        let pce = board_.Pieces.OFF_BOARD_PIECE;
        for (let i = board_.Pieces.EMPTY; i < board_.Pieces.OFF_BOARD_PIECE; i++) {
            if (look === util_.pieceToAscii[i]) {
                pce = i;
                break;
            }
        }
        if (pce !== board_.Pieces.OFF_BOARD_PIECE) {
            if ((pce === board_.Pieces.WHITEKING || pce === board_.Pieces.BLACKKING)
                && (this.board.numberPieces[pce] > 0)
                && (this.board.kingSquare[util_.getColorPiece[pce]] !== sq)
            ) {
                return false
            }
            move_.addPiece(sq, pce, this.board);
            return true;
        }
        return false;
    }


    // MICS
    public getTurn(): string {
        return board_.getTurn(this.board);
    }
    public squareColor(square: string): null | string {
        const sq = board_.algebraicToSquare(square);
        if (board_.SQUARE_ON_BOARD(sq)) {
            return ((util_.ranksBoard[sq] + util_.filesBoard[sq]) % 2 === 0) ? "dark" : "light";
        } else {
            return null
        }

    }

    // Search and Evaluation
    // evaluateBoard()
    // searchBoard(option)
    // noob_book(noob_cmd)
    // set_book(arrayBuffer)
    public evaluateBoard(config?: { use_nnue: boolean }): number {
        if (config && config.use_nnue) {
            return rc0_eval_.raccoonZeroEvaluate(this.board)
        } else {
            return rc_eval_.raccoonEvaluate(this.board);
        }
    }

    // Game debugging
    public perft(depth: number): bigint {
        return perft_.perft(depth, this.board);
    }
}
