type api_config_t = {
    evaluate_fn: string;
    start_fen?: string;
}

let API = function (config: api_config_t) {
    initialize_game();

    //-- declare board
    let board: board_t = {
        pieces: new Array<PIECES>(BOARD_SQUARE_NUM),
        king_square: new Array<SQUARES>(2),
        pawns: new Array<bitboard_t>(3),

        enpassant: SQUARES.OFF_BOARD,
        turn: COLORS.BOTH,
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

        piece_list: new Array<SQUARES>(13 * 10),
        move_history: new Array<undo_t>(MAX_MOVES),
    };

    //-- set up board
    let start_fen = ('start_fen' in config) ? config.start_fen! : START_FEN
    console.log(start_fen);
    fen_to_board(start_fen, board)



    return {
        load: function (fen: string) {
            return fen_to_board(fen, board);
        },
        fen: function () {
            return board_to_fen(board);
        },
        polyglot: function (by_move = false) {
            if (by_move) {
                return board.current_polyglot_key;
            }
            return polyglot_key(board);
        },
        perft: function (depth: number) {
            return perft(depth, board);
        },
        perft_summary: function (depth: number) {
            return perft_summary(depth, board);
        },
    }
}

export { API as RaccoonChessSigmaAPI }
