// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as perft_ from '../../game/perft'
import * as hash_ from '../../game/hash'
import * as state_ from '../../game/state'
//import * as rc_eval_ from '../../evaluate/rc/eval'
import * as move_ from '../../game/move'

class Raccoon {
    private board: board_.board_t;
    //private eval_fn: util_.evaluation_fn
    private start_fen: string
    //private book_path: string
    private moves_history: move_.verbose_move_t[]

    public constructor(config?: {
        evaluate_fn?: string;
        start_fen?: string;
        book_path?: string | ArrayBufferLike;
    }) {
        util_.initialize_game();

        this.board = {
            pieces: new Array<board_.PIECES>(util_.BOARD_SQUARE_NUM),
            king_square: new Array<board_.SQUARES>(2),
            pawns: new Array<board_.bitboard_t>(3),

            enpassant: board_.SQUARES.OFF_BOARD,
            turn: board_.COLORS.BOTH,
            half_moves: 0,
            full_moves: 0,
            castling_right: 0,

            ply: 0,
            history_ply: 0,

            current_polyglot_key: 0n,

            material_eg: new Array<number>(2),
            material_mg: new Array<number>(2),

            number_pieces: new Array<number>(13),
            number_big_pieces: new Array<number>(2),
            number_major_pieces: new Array<number>(2),
            number_minor_pieces: new Array<number>(2),

            piece_list: new Array<board_.SQUARES>(13 * 10),
            move_history: new Array<board_.undo_t>(util_.MAX_MOVES),
        };
        this.moves_history = [];
        //this.eval_fn = ((typeof config !== 'undefined') && ('evaluate_fn' in config)) ? config.evaluate_fn! : rc_eval_.raccoon_evaluate;
        this.start_fen = ((typeof config !== 'undefined') && ('start_fen' in config)) ? config.start_fen! : util_.START_FEN;
        //this.book_path = ((typeof config !== 'undefined') && ('book_path' in config)) ? config.book_path! : "No book path provided";
        board_.fen_to_board(this.start_fen, this.board)
    }

    // Game Board
    public load_fen(fen: string): { value: boolean, error: string } {
        try {
            board_.fen_to_board(fen, this.board);
        }
        catch (err) {
            return { value: false, error: (err as Error).message };
        }
        this.start_fen = fen; // stores last load for reseting board
        return { value: true, error: "No error!" }
    }
    public get_fen(): string {
        return board_.board_to_fen(this.board);
    }
    public get_polyglot(by_move = false): bigint {
        if (by_move) {
            return this.board.current_polyglot_key;
        }
        return hash_.polyglot_key(this.board);
    }
    public print_board(show_info = false, parser = {
        pieces: ["P", "B", "N", "R", "Q", "K", "p", "b", "n", "r", "q", "k"],
        light_square: "-",
        dark_square: "="
    }): string {
        return board_.board_to_printable(this.board, parser.pieces, parser.light_square, parser.dark_square, show_info);
    }
    // -> get_board() 2D array of board
    // -> clear board empty fen
    // reset board to last oaded fen


    // Game Moves
    public make_move(move: string | { from: string, to: string, promotion?: string }): move_.verbose_move_t | null {
        let mv = move_.NO_MOVE;
        if (typeof move === 'string') {
            mv = move_.smith_to_move(move, this.board);
            if (mv === move_.NO_MOVE) {
                mv = move_.san_to_move(move, this.board);
            }
        } else {
            let tmp = move.from + move.to;
            if ('promotion' in move) {
                tmp += move.promotion;
            }
            mv = move_.smith_to_move(tmp, this.board);
        }

        const move_veb = move_.move_to_verbose_move(mv, this.board);
        if (move_.make_move(mv, this.board)) {
            this.moves_history.push(move_veb);
            return move_veb;
        }
        return null;
    }
    public undo_move(): move_.verbose_move_t | null {
        if (move_.take_move(this.board)) {
            return this.moves_history.pop()!;
        } else {
            return null;
        }
    }
    public get_moves(option?: { square?: string, verbose?: boolean, capture_only?: boolean }): string[] | move_.verbose_move_t[] {
        const square = ((typeof option !== 'undefined') && ('square' in option)) ? board_.algebraic_to_square(option.square!) : board_.SQUARES.ALL;
        const verbose = ((typeof option !== 'undefined') && ('verbose' in option)) ? option.verbose! : false;
        const capture_only = ((typeof option !== 'undefined') && ('capture_only' in option)) ? option.capture_only! : false;

        const moves_score = move_.generate_legal_moves(this.board, capture_only, square);
        let rlt_str_list: string[] = [];
        let rlt_ver_list: move_.verbose_move_t[] = [];
        for (let mv of moves_score) {
            const verb_mv = move_.move_to_verbose_move(mv.move, this.board);
            if (verbose) {
                rlt_ver_list.push(verb_mv);
            } else {
                rlt_str_list.push(verb_mv.san);
            }
        }
        return (verbose) ? rlt_ver_list : rlt_str_list;
    }

    // move history (verbose) -> history

    // Game State
    public in_check(): boolean {
        return state_.in_check(this.board);
    }
    public in_checkmate(): boolean {
        return state_.in_checkmate(this.board);
    }
    public in_stalemate(): boolean {
        return state_.in_stalemate(this.board);
    }
    public in_threefold_repetition(): boolean {
        return state_.in_threefold_repetition(this.board);
    }
    public insufficient_material(): boolean {
        return state_.insufficient_material(this.board);
    }
    public in_draw(): boolean {
        return state_.in_draw(this.board);
    }
    //-> gameover()
    // evaluate_board()
    // search_board(option)
    // noob_book(noob_cmd)

    // Pieces
    // get_piece(sq) return piec in sq
    // set_piece(p, sq)
    // pop_piece(sq)


    // BOOK
    // set_book(arrayBuffer)

    // MICS
    // get_turn
    // pet_square_color()

    // Game debugging
    public perft(depth: number): bigint {
        return perft_.perft(depth, this.board);
    }
}

export { Raccoon }
