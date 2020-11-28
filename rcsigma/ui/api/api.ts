import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as perft_ from '../../game/perft'
import * as hash_ from '../../game/hash'
//import * as rc_eval_ from '../../evaluate/rc/eval'
import * as move_ from '../../game/move'

type raccoon_config_t = {
    evaluate_fn?: util_.evaluation_fn;
    start_fen?: string;
    book_path?: string;
}

class Raccoon {
    private board: board_.board_t;
    //private eval_fn: util_.evaluation_fn
    private start_fen: string
    //private book_path: string

    public constructor(config?: raccoon_config_t) {
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


        //this.eval_fn = ((typeof config !== 'undefined') && ('evaluate_fn' in config)) ? config.evaluate_fn! : rc_eval_.raccoon_evaluate;
        this.start_fen = ((typeof config !== 'undefined') && ('start_fen' in config)) ? config.start_fen! : util_.START_FEN;
        //this.book_path = ((typeof config !== 'undefined') && ('book_path' in config)) ? config.book_path! : "No book path provided";

        board_.fen_to_board(this.start_fen, this.board)
    }

    public load(fen: string) {
        try {
            board_.fen_to_board(fen, this.board);
        }
        catch (err) {
            return { value: false, error: err.message }
        }
        return { value: true, error: "No error!" }
    }

    public fen() {
        return board_.board_to_fen(this.board);
    }

    public polyglot(by_move = false) {
        if (by_move) {
            return this.board.current_polyglot_key;
        }
        return hash_.polyglot_key(this.board);
    }

    public perft(depth: number) {
        return perft_.perft(depth, this.board);
    }

    public perft_summary(depth: number) {// TEST case TODO
        return perft_.perft_summary(depth, this.board);
    }

    public move(move: any) {// TEST case TODO
        let mv = move_.NO_MOVE;
        if (typeof move === 'string') {
            let maybe_smith = move_.clean_smith(move);
            if (maybe_smith !== "") {
                mv = move_.smith_to_move(maybe_smith, this.board);
            }
            else {
                mv = move_.san_to_move(move, this.board);
            }
        }
        else if (typeof move === 'object') {
            let tmp = move.from + move.to;
            if ('promotion' in move) {
                tmp += move.promotion;
            }
            mv = move_.smith_to_move(tmp, this.board);
        }

        if (move_.make_move(mv, this.board)) {
            return move_.move_to_verbose_move(mv, this.board, true);
        }
        return null;
    }

    public ascii() {
        return board_.board_to_ascii(this.board);
    }
}

export { Raccoon }
export { raccoon_config_t }
