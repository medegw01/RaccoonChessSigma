// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from '../../../game/board'

export function raccoonZeroEvaluate(board: board_.board_t): number {
    return (
        (board.materialEg[board_.Colors.WHITE] + board.materialMg[board_.Colors.WHITE])
        - (board.materialEg[board_.Colors.BLACK] + board.materialMg[board_.Colors.BLACK])
    );
}