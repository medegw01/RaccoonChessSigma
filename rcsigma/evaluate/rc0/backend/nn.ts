// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------
import * as util_ from '../../../util'
import * as board_ from '../../../game/board'

function evaluate(board: board_.board_t): number {
    return (
        (board.materialEg[util_.Colors.WHITE] + board.materialMg[util_.Colors.WHITE])
        - (board.materialEg[util_.Colors.BLACK] + board.materialMg[util_.Colors.BLACK])
    );
}

export {
    evaluate,
}