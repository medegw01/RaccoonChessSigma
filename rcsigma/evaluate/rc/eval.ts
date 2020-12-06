// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from '../../game/board'

export function raccoon_evaluate(board: board_.board_t): number {
    return board.material_eg[board.turn] + board.material_mg[board.turn];
}