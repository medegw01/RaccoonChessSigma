import * as board_ from '../../../game/board'

export function raccoonZero_evaluate(board: board_.board_t) {
    let score = board.material_eg[board.turn] + board.material_mg[board.turn]
    return score;
}