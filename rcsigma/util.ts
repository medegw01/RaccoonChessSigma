const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const NAME = "rcSigma";
const CHECKMATE = 32000;
const INFINITE = 32001;
const MAX_MOVES = 2048;
const MAX_MOVES_POSITION = 256;
const BOARD_SQUARE_NUM = 120;
const MAX_DEPTH = 64;

function ASSERT(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg)
    }
}

function COUNT_BITS(b: bitboard_t) {
    let num_bits = 0;
    while (b) {
        num_bits++;
        b &= b - 1n;
    }
    return num_bits;
}

function SET_BIT(b: bitboard_t, pos: number) {
    return (b | 1n << BigInt(pos))
}

function CLEAR_BIT(b: bitboard_t, pos: number) {
    return (b & ~(1n << BigInt(pos)))
}

function ISKthBIT_SET(b: bitboard_t, k: number) { return ((b >> BigInt(k)) & 1n) === 1n }

//===========================================================//
// Game Globals
//===========================================================//
let square64_to_square120 = new Array(64);
let square120_to_square64 = new Array(BOARD_SQUARE_NUM);
let castle_permission = new Array(120);

let piece_to_ascii = ".PBNRQKpbnrqk";
let castle64_hash = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];

const is_big_piece = [false, false, true, true, true, true, true, false, true, true, true, true, true];
const is_major_piece = [false, false, false, false, true, true, true, false, false, false, true, true, true];
const is_minor_piece = [false, false, true, true, false, false, false, false, true, true, false, false, false];
const is_pawn = [false, true, false, false, false, false, false, true, false, false, false, false, false];
const is_knight = [false, false, false, true, false, false, false, false, false, true, false, false, false];
const is_bishop = [false, false, true, false, false, false, false, false, true, false, false, false, false];
const is_king = [false, false, false, false, false, false, true, false, false, false, false, false, true];
const is_queen = [false, false, false, false, false, true, false, false, false, false, false, true, false];
const is_rook = [false, false, false, false, true, false, false, false, false, false, true, false, false];
const is_rook_or_queen = [false, false, false, false, true, true, false, false, false, false, true, true, false];
const is_bishop_or_queen = [false, false, true, false, false, true, false, false, true, false, false, true, false];
const is_slide_piece = [false, false, true, false, true, true, false, false, true, false, true, true, false];
const is_white_piece = [false, true, true, true, true, true, true, false, false, false, false, false, false];

const color_pieceflip = [
    [PIECES.WHITEPAWN, PIECES.WHITEKNIGHT, PIECES.WHITEBISHOP, PIECES.WHITEROOK, PIECES.WHITEQUEEN, PIECES.WHITEKING],
    [PIECES.BLACKPAWN, PIECES.BLACKKNIGHT, PIECES.BLACKBISHOP, PIECES.BLACKROOK, PIECES.BLACKQUEEN, PIECES.BLACKKING]
];
const get_color_piece = [
    COLORS.BOTH, COLORS.WHITE, COLORS.WHITE, COLORS.WHITE, COLORS.WHITE, COLORS.WHITE,
    COLORS.WHITE, COLORS.BLACK, COLORS.BLACK, COLORS.BLACK, COLORS.BLACK, COLORS.BLACK, COLORS.BLACK
];
const get_value_piece = [//-- get_value_piece[PHASE][PIECES]
    [0, 128, 825, 781, 1276, 2538, 0, 128, 825, 781, 1276, 2538, 0],
    [0, 213, 915, 854, 1380, 1380, 0, 213, 915, 854, 1380, 1380, 0]
];

const get_poly_piece = [
    -1, 1, 5, 3, 7, 9, 11, 0, 4, 2, 6, 8, 10
];

const is_color_bishop = [
    [false, false, true, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, true, false, false, false, false]
];
const is_color_knight = [
    [false, false, false, true, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, true, false, false, false]
];
const is_color_rook = [
    [false, false, false, false, true, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, true, false, false]
];
const is_color_queen = [
    [false, false, false, false, false, true, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, true, false]
];
const is_color_pawn = [
    [false, true, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, true, false, false, false, false, false]
];



const flip = [
    56, 57, 58, 59, 60, 61, 62, 63,
    48, 49, 50, 51, 52, 53, 54, 55,
    40, 41, 42, 43, 44, 45, 46, 47,
    32, 33, 34, 35, 36, 37, 38, 39,
    24, 25, 26, 27, 28, 29, 30, 31,
    16, 17, 18, 19, 20, 21, 22, 23,
    8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7,
];

let files_board = new Array(BOARD_SQUARE_NUM);
let ranks_board = new Array(BOARD_SQUARE_NUM);

// functions
function initialize_files_rank_array() {
    for (let i = 0; i < BOARD_SQUARE_NUM; i++) {
        files_board[i] = SQUARES.OFF_BOARD;
        ranks_board[i] = SQUARES.OFF_BOARD;
    }
    for (let rank = RANKS.FIRST_RANK; rank <= RANKS.EIGHTH_RANK; ++rank) {
        for (let file = FILES.A_FILE; file <= FILES.H_FILE; ++file) {
            let square_120 = FILE_RANK_TO_SQUARE(file, rank);
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

    for (rank = RANKS.FIRST_RANK; rank <= RANKS.EIGHTH_RANK; ++rank) {
        for (file = FILES.A_FILE; file <= FILES.H_FILE; file++) {
            let sq = FILE_RANK_TO_SQUARE(file, rank);
            square64_to_square120[sq_64] = sq;
            square120_to_square64[sq] = sq_64;
            sq_64++;
        }
    }
}

function initialize_hash_key() {
    for (let flag = 0; flag < 16; flag++) {
        for (let i = 0; i < 4; i++) {
            if ((flag & (1 << i)) !== 0) castle64_hash[flag] ^= random64_poly[random_castle + i];
        }
    }

    for (let j = 0; j < 120; j++) castle_permission[j] = 0xF;
    castle_permission[SQUARES.E1] &= ~CASTLING.WHITE_CASTLE_OO;
    castle_permission[SQUARES.H1] &= ~CASTLING.WHITE_CASTLE_OO;

    castle_permission[SQUARES.E1] &= ~CASTLING.WHITE_CASTLE_OOO;
    castle_permission[SQUARES.A1] &= ~CASTLING.WHITE_CASTLE_OOO;

    castle_permission[SQUARES.E8] &= ~CASTLING.BLACK_CASTLE_OO;
    castle_permission[SQUARES.H8] &= ~CASTLING.BLACK_CASTLE_OO;

    castle_permission[SQUARES.E8] &= ~CASTLING.BLACK_CASTLE_OOO;
    castle_permission[SQUARES.A8] &= ~CASTLING.BLACK_CASTLE_OOO;
}

function initialize_params() {
    initialize_square120_to_square64();
    initialize_hash_key();
    initialize_files_rank_array();
}
