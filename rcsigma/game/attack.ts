const knight_direction = [-8, -19,-21, -12, 8, 19, 21, 12 ];
const rook_direction   = [-1, -10,	1, 10 ];
const bishop_direction = [ -9, -11, 11, 9 ];
const king_direction  = [-1, -10,	1, 10, -9, -11, 11, 9 ];

function pinned_direction(color: COLORS, sq:SQUARES, board: board_t) {
    let pce = board.pieces[sq];
    let tmp_sq, tmp_pce;
    if (pce === PIECES.EMPTY) return 0;
    let sign = (+(color === COLORS.WHITE) ^ +(is_white_piece[pce]))? -1: 1;
    let king_sq = board.king_square[color];
    let king_r = ranks_board[king_sq];
    let king_f = files_board[king_sq];

    let pce_r = ranks_board[sq];
    let pce_f = files_board[sq];

    if (sq === king_sq) return 0;
    function look(dir: number, rtn: number, pce_checker: boolean[]) {
        let seen = false;
        tmp_sq = king_sq + dir;
        while (SQUARE_ON_BOARD(tmp_sq)) {
            tmp_pce = board.pieces[tmp_sq];
            if (tmp_pce !== PIECES.EMPTY) {
                if (seen) {
                    if (pce_checker[tmp_pce] && (+(color === COLORS.WHITE) ^ +(is_white_piece[tmp_pce]))) return sign*rtn;
                    break;
                } else {
                    if (sq === tmp_sq) {
                        seen = true;
                    } else return 0;
                }
            }
            tmp_sq += dir;
        }
        return 0;
    }
    //-- horizontal return 1
    if (king_r === pce_r) {
        return look((pce_f > king_f) ? 1 : -1, 1, is_rook_or_queen);
    }
    //-- vertical return 3
    else if (king_f === pce_f) {
        return look((pce_r > king_r) ? 10 : -10, 3, is_rook_or_queen);
    }
    //-- top left to bottom right return 2
    else if ((king_f > pce_f && king_r < pce_r) || (king_f < pce_f && king_r > pce_r)) {
        return look((pce_f > king_f) ? -9 : 9, 2, is_bishop_or_queen);
    } else { //-- top-right to bottom-left return 4
        return look((pce_f > king_f) ? 11 : -11, 4, is_bishop_or_queen);
    }
}

function pinned(color: COLORS, sq: SQUARES, board: board_t) {
    if(board.pieces[sq] === PIECES.EMPTY) return 0;
    return pinned_direction(color, sq, board) > 0 ? 1 : 0;
}
function walker(color: COLORS, tmp_sq: SQUARES, dir: number, mj_checker: boolean[], mn_checker: boolean[], board: board_t, t_sq=SQUARES.OFF_BOARD) {
    let pce, is_pinned;
    while(SQUARE_ON_BOARD(tmp_sq)){
        pce = board.pieces[tmp_sq];
        is_pinned = pinned(color, tmp_sq, board);
        if (pce === PIECES.EMPTY){
            tmp_sq += dir;
            continue;
        }

        else if(!mj_checker[pce] || (is_pinned || pinned(color^1, tmp_sq, board))){
            break;
        }
        else if (mn_checker[pce] && !(+(color === COLORS.WHITE) ^ +(is_white_piece[pce]))) {
            return (t_sq===SQUARES.OFF_BOARD)? +(!is_pinned): +(!is_pinned && tmp_sq === t_sq);
        }
        tmp_sq += dir;
    }
    return 0;
}
function slide_attack(color: COLORS, sq: SQUARES, mj_pce_check: boolean[], pce_check: boolean[], board: board_t) {
    let v = 0;
    let tmp_sq, i;
    for(i = 0; i<4; i++) {
        tmp_sq = sq + rook_direction[i];
        v += walker(color, tmp_sq, rook_direction[i], mj_pce_check, pce_check, board);
    }
    return v;
}
const DIR= {//-- white pov
    UP:0,
    DOWN:1,
    LEFT:2,
    RIGHT:3,
    UP_LEFT:4,
    UP_RIGHT:5,
    DOWN_LEFT:6,
    DOWN_RIGHT:7,
    SAME:8,
};
function get_direction(from: SQUARES, to: SQUARES) {
    let from_r = ranks_board[from];
    let from_f = files_board[from];
    let to_f = files_board[to];
    let to_r = ranks_board[to];
    if(from === to) return DIR.SAME;
    else if(from_r === to_r) return (from_f > to_f)? DIR.LEFT: DIR.RIGHT;
    else if(from_f === to_f) return (from_r > to_r)? DIR.DOWN: DIR.UP;
    else if(from_r > to_r) return  (from_f > to_f)? DIR.DOWN_LEFT: DIR.DOWN_RIGHT;
    return (from_f > to_f)? DIR.UP_LEFT: DIR.UP_RIGHT;
}
function same_diagonal(a: SQUARES, b: SQUARES){
    return Math.abs(files_board[a]-files_board[b]) === Math.abs(ranks_board[a]-ranks_board[b])
}
function diagonal_attack(color: COLORS, sq: SQUARES, mj_pce_checker: boolean[], pce_checker: boolean[], board: board_t) {
    let v = 0;
    let tmp_sq, i;
    for(i = 0; i<8; i++) {
        tmp_sq = sq + bishop_direction[i];
        v += walker(color, tmp_sq, bishop_direction[i], mj_pce_checker, pce_checker, board);
    }
    return v;
}

function bishop_xray_attack(color: COLORS, sq: SQUARES, board: board_t, b_sq=SQUARES.OFF_BOARD, xray=true) {
    let mj = (xray)? is_bishop_or_queen: is_color_bishop[color];
    if (b_sq !== SQUARES.OFF_BOARD) {//-- determine direction
        let b = (color === COLORS.WHITE)? PIECES.WHITEBISHOP: PIECES.BLACKBISHOP;
        if (b !== board.pieces[b_sq]) return 0;
        let dir = get_direction(sq, b_sq);
        if(dir >= DIR.UP_LEFT && dir < DIR.SAME){
            let dir_tmp = [9, 11, -11, -9][dir - 4];
            return (same_diagonal(sq, b_sq))? walker(color, sq + dir_tmp, dir_tmp, mj, is_bishop, board, b_sq): 0;
        }
        return 0;
    }
    return diagonal_attack(color, sq, mj, is_bishop, board);
}
function rook_xray_attack(color: COLORS, sq: SQUARES, board: board_t, r_sq=SQUARES.OFF_BOARD, xray=true){
    let mj = (xray)? is_rook_or_queen: is_color_rook[color];
    if(r_sq !== SQUARES.OFF_BOARD){
        let r = (color === COLORS.WHITE)? PIECES.WHITEROOK: PIECES.BLACKROOK;
        if (r !== board.pieces[r_sq]) return 0;
        let dir = get_direction(sq, r_sq);
        if(dir < DIR.UP_LEFT){
            let dir_tmp = [10, -10, -1, 1][dir];
            return walker(color, sq + dir_tmp, dir_tmp, mj, is_rook, board, r_sq);
        }
        return 0;
    }
    return slide_attack(color, sq, mj, is_rook, board);
}
function queen_attack(color: COLORS, sq: SQUARES, board: board_t, q_sq=SQUARES.OFF_BOARD){
    if (q_sq !== SQUARES.OFF_BOARD) {//-- determine direction
        if(!is_color_queen[color][board.pieces[q_sq]]) return 0;
        let dir = get_direction(sq, q_sq);
        let dir_tmp;
        if (dir >= DIR.UP_LEFT && dir < DIR.SAME){
            dir_tmp  = [9, 11, -11, -9][dir - 4];
            if (!same_diagonal(sq, q_sq)) return 0;
        }
        else dir_tmp  = [10, -10, -1, 1][dir];
        return walker(color, sq + dir_tmp, dir_tmp, is_color_queen[color], is_queen, board, q_sq);
    }
    let v = 0;
    v += slide_attack(color, sq, is_color_queen[color], is_queen, board);
    v += diagonal_attack(color, sq, is_color_queen[color], is_queen, board);
    return v;
}

function knight_attack(color:COLORS, sq: SQUARES, board: board_t, kn_sq=SQUARES.OFF_BOARD) {
    if(kn_sq !== SQUARES.OFF_BOARD && !is_knight[board.pieces[kn_sq]]) return 0;
    let v = 0;
    let pce, tmp_sq, i, is_pinned;
    for(i = 0; i<8; i++) {
        tmp_sq = sq + knight_direction[i];
        pce = board.pieces[tmp_sq];
        is_pinned = pinned(color, tmp_sq, board);
        if(SQUARE_ON_BOARD(tmp_sq)){
            if(kn_sq !== SQUARES.OFF_BOARD){
                if (tmp_sq === kn_sq) return +(!is_pinned);
            }
            else{
                if(is_knight[pce] && get_color_piece[pce] === color){
                    v += (is_pinned)? 0: 1;
                }
            }
        }
    }
    return (kn_sq === SQUARES.OFF_BOARD)? v: 0;
}

function pawn_attack(color: COLORS, sq: SQUARES, board: board_t, p_sq=SQUARES.OFF_BOARD) {
    let v   = 0;
    let pce = (color === COLORS.WHITE)? PIECES.WHITEPAWN: PIECES.BLACKPAWN;
    let sg  = (color === COLORS.WHITE)? -1: 1;
    if(p_sq !== SQUARES.OFF_BOARD){
        if (pce !== board.pieces[p_sq]) return 0;
        return +((p_sq === (sq + (sg*11))) || (p_sq === (sq + (sg*9))));
    }
    if (board.pieces[sq + (sg*11)] === pce) v++;
    if (board.pieces[sq + (sg*9)] === pce) v++;
    return v;
}
function king_attack(color:COLORS, sq: SQUARES, board: board_t, k_sq=SQUARES.OFF_BOARD) {
    let tmp_sq, i, pce;
    let v = 0;
    let k = (color === COLORS.WHITE)? PIECES.WHITEKING: PIECES.BLACKKING;
    if(k_sq !== SQUARES.OFF_BOARD && (k !== board.pieces[k_sq])) return 0;
    for(i = 0; i<8; i++) {
        tmp_sq = sq + king_direction[i];
        pce = board.pieces[tmp_sq];
        if(SQUARE_ON_BOARD(tmp_sq)){
            if(tmp_sq === k_sq || k === pce ) return ++v;
        }
    }
    return 0;
}

function attack(square: SQUARES, color: COLORS, board: board_t) {
    let v=0;
    v += pawn_attack(color, square, board);
    v += king_attack(color, square, board);
    v += knight_attack(color, square, board);
    v += bishop_xray_attack(color, square, board);
    v += rook_xray_attack(color, square, board);
    v += queen_attack(color, square, board);
    return v;
}

// function will be replaced by attack() WHEN attack is OPTIMIZED soon
function is_square_attacked(square: SQUARES, turn: COLORS, board: board_t) {
    let piece, direction, tmp_square;
    // pawns
    if(turn === COLORS.WHITE) {
        if(board.pieces[square-11] === PIECES.WHITEPAWN || board.pieces[square-9] === PIECES.WHITEPAWN){
            return true;
        }
    } else {
        if(board.pieces[square+11] === PIECES.BLACKPAWN || board.pieces[square+9] === PIECES.BLACKPAWN){
            return true;
        }
    }
    //knight and king
    for(let i = 0; i<8; i++){
        // check knight
        piece = board.pieces[square + knight_direction[i]];
        if(piece !== PIECES.OFF_BOARD_PIECE && is_knight[piece] && get_color_piece[piece] === turn){
            return true;
        }
        // check king
        piece = board.pieces[square + king_direction[i]];
        if(piece !== PIECES.OFF_BOARD_PIECE && is_king[piece] && get_color_piece[piece] === turn){
            return true;
        }
    }

    for (let v = 0; v < 2; v++){
        let direction_, is_piece;
        if (v === 0){ //rooks and queen
            direction_ = rook_direction;
            is_piece  = is_rook_or_queen;
        }
        else{
            direction_ = bishop_direction;
            is_piece   = is_bishop_or_queen;
        }
        for(let i = 0; i<4; i++){
            direction = direction_[i];
            tmp_square = square + direction;
            piece = board.pieces[tmp_square];
            while(piece !== PIECES.OFF_BOARD_PIECE){
                if(piece !== PIECES.EMPTY){
                    if(is_piece[piece] && (get_color_piece[piece] === turn)){
                        return true;
                    }
                    break;
                }
                tmp_square += direction;
                piece = board.pieces[tmp_square];
            }
        }
    }
    return false;
}
