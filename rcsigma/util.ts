
import * as board_ from './game/board'
import * as hash_ from './game/hash'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const NAME = "rcSigma";
export const CHECKMATE = 32000;
export const INFINITE = 32001;
export const MAX_MOVES = 2048;
export const MAX_MOVES_POSITION = 256;
export const BOARD_SQUARE_NUM = 120;
export const MAX_DEPTH = 64;

export enum PHASE { MG, EG }


export interface evaluation_fn { (arg: board_.board_t): number }

export function ASSERT(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg)
    }
}

export function COUNT_BITS(b: board_.bitboard_t) {
    let num_bits = 0;
    while (b) {
        num_bits++;
        b &= b - 1n;
    }
    return num_bits;
}

export function SET_BIT(b: board_.bitboard_t, pos: number) {
    return (b | 1n << BigInt(pos))
}

export function CLEAR_BIT(b: board_.bitboard_t, pos: number) {
    return (b & ~(1n << BigInt(pos)))
}

export function ISKthBIT_SET(b: board_.bitboard_t, k: number) { return ((b >> BigInt(k)) & 1n) === 1n }

//===========================================================//
// Game Globals
//===========================================================//
export const square64_to_square120 = new Array<number>(64);
export const square120_to_square64 = new Array<number>(BOARD_SQUARE_NUM);
export const castle_permission = new Array<number>(120);

export const piece_to_ascii = ".PBNRQKpbnrqk";
export const castle64_hash = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];

export const is_big_piece = [false, false, true, true, true, true, true, false, true, true, true, true, true];
export const is_major_piece = [false, false, false, false, true, true, true, false, false, false, true, true, true];
export const is_minor_piece = [false, false, true, true, false, false, false, false, true, true, false, false, false];
export const is_pawn = [false, true, false, false, false, false, false, true, false, false, false, false, false];
export const is_knight = [false, false, false, true, false, false, false, false, false, true, false, false, false];
export const is_bishop = [false, false, true, false, false, false, false, false, true, false, false, false, false];
export const is_king = [false, false, false, false, false, false, true, false, false, false, false, false, true];
export const is_queen = [false, false, false, false, false, true, false, false, false, false, false, true, false];
export const is_rook = [false, false, false, false, true, false, false, false, false, false, true, false, false];
export const is_rook_or_queen = [false, false, false, false, true, true, false, false, false, false, true, true, false];
export const is_bishop_or_queen = [false, false, true, false, false, true, false, false, true, false, false, true, false];
export const is_slide_piece = [false, false, true, false, true, true, false, false, true, false, true, true, false];
export const is_white_piece = [false, true, true, true, true, true, true, false, false, false, false, false, false];

export const color_pieceflip = [
    [board_.PIECES.WHITEPAWN, board_.PIECES.WHITEKNIGHT, board_.PIECES.WHITEBISHOP, board_.PIECES.WHITEROOK, board_.PIECES.WHITEQUEEN, board_.PIECES.WHITEKING],
    [board_.PIECES.BLACKPAWN, board_.PIECES.BLACKKNIGHT, board_.PIECES.BLACKBISHOP, board_.PIECES.BLACKROOK, board_.PIECES.BLACKQUEEN, board_.PIECES.BLACKKING]
];

export const get_color_piece = [
    board_.COLORS.BOTH, board_.COLORS.WHITE, board_.COLORS.WHITE, board_.COLORS.WHITE, board_.COLORS.WHITE, board_.COLORS.WHITE,
    board_.COLORS.WHITE, board_.COLORS.BLACK, board_.COLORS.BLACK, board_.COLORS.BLACK, board_.COLORS.BLACK, board_.COLORS.BLACK, board_.COLORS.BLACK, board_.COLORS.BOTH,
];

export const get_value_piece = [//-- get_value_piece[PHASE][board_.PIECES]
    [0, 128, 825, 781, 1276, 2538, 0, 128, 825, 781, 1276, 2538, 0, 0],
    [0, 213, 915, 854, 1380, 2682, 0, 213, 915, 854, 1380, 2682, 0, 0]
];

export const get_poly_piece = [
    -1, 1, 5, 3, 7, 9, 11, 0, 4, 2, 6, 8, 10
];

export const is_color_bishop = [
    [false, false, true, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, true, false, false, false, false]
];

export const is_color_knight = [
    [false, false, false, true, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, true, false, false, false]
];

export const is_color_rook = [
    [false, false, false, false, true, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, true, false, false]
];

export const is_color_queen = [
    [false, false, false, false, false, true, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, true, false]
];

export const is_color_pawn = [
    [false, true, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, true, false, false, false, false, false]
];

export const flip = [
    56, 57, 58, 59, 60, 61, 62, 63,
    48, 49, 50, 51, 52, 53, 54, 55,
    40, 41, 42, 43, 44, 45, 46, 47,
    32, 33, 34, 35, 36, 37, 38, 39,
    24, 25, 26, 27, 28, 29, 30, 31,
    16, 17, 18, 19, 20, 21, 22, 23,
    8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7,
];

export const files_board = new Array(BOARD_SQUARE_NUM);
export const ranks_board = new Array(BOARD_SQUARE_NUM);

// functions
// Export each of these functions so that you can test each of them individually 
function initialize_files_rank_array() {
    for (let i = 0; i < BOARD_SQUARE_NUM; i++) {
        files_board[i] = board_.SQUARES.OFF_BOARD;
        ranks_board[i] = board_.SQUARES;
    }
    for (let rank = board_.RANKS.FIRST_RANK; rank <= board_.RANKS.EIGHTH_RANK; ++rank) {
        for (let file = board_.FILES.A_FILE; file <= board_.FILES.H_FILE; ++file) {
            const square_120 = board_.FILE_RANK_TO_SQUARE(file, rank);
            files_board[square_120] = file;
            ranks_board[square_120] = rank;
        }
    }
}
function initialize_square120_to_square64() {
    let sq_64 = 0;
    let i, rank, file;
    for (i = 0; i < BOARD_SQUARE_NUM; ++i) {
        square120_to_square64[i] = 65;
    }
    for (i = 0; i < 64; ++i) {
        square64_to_square120[i] = 120;
    }

    for (rank = board_.RANKS.FIRST_RANK; rank <= board_.RANKS.EIGHTH_RANK; ++rank) {
        for (file = board_.FILES.A_FILE; file <= board_.FILES.H_FILE; file++) {
            const sq = board_.FILE_RANK_TO_SQUARE(file, rank);
            square64_to_square120[sq_64] = sq;
            square120_to_square64[sq] = sq_64;
            sq_64++;
        }
    }
}

function initialize_hash_key() {
    for (let flag = 0; flag < 16; flag++) {
        for (let i = 0; i < 4; i++) {
            if ((flag & (1 << i)) !== 0) castle64_hash[flag] ^= hash_.random64_poly[hash_.random_castle + i];
        }
    }

    for (let j = 0; j < 120; j++) castle_permission[j] = 0xF;
    castle_permission[board_.SQUARES.E1] &= ~board_.CASTLING.WHITE_CASTLE_OO;
    castle_permission[board_.SQUARES.H1] &= ~board_.CASTLING.WHITE_CASTLE_OO;

    castle_permission[board_.SQUARES.E1] &= ~board_.CASTLING.WHITE_CASTLE_OOO;
    castle_permission[board_.SQUARES.A1] &= ~board_.CASTLING.WHITE_CASTLE_OOO;

    castle_permission[board_.SQUARES.E8] &= ~board_.CASTLING.BLACK_CASTLE_OO;
    castle_permission[board_.SQUARES.H8] &= ~board_.CASTLING.BLACK_CASTLE_OO;

    castle_permission[board_.SQUARES.E8] &= ~board_.CASTLING.BLACK_CASTLE_OOO;
    castle_permission[board_.SQUARES.A8] &= ~board_.CASTLING.BLACK_CASTLE_OOO;
}


// You can have this where you bring everything together in another file.
// However, this seems to be central to your game and should not be in a util file 
// Util is basicaly utility and should be something that I can export to another differnt
// project not about chess altogether. 
export function initialize_game() {
    initialize_square120_to_square64();
    initialize_hash_key();
    initialize_files_rank_array();
}

export function get_time_ms() {
    return new Date().getTime();
}

