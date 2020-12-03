import * as board_ from '../../game/board'

export function raccoon_evaluate(board: board_.board_t){
    return board.material_eg[board.turn] + board.material_mg[board.turn];
}