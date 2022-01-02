// -------------------------------------------------------------------------------------------------
// Copyright (c) 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../rcsigma/util'
import * as bitboard_ from '../rcsigma/game/bitboard'
import * as board_ from '../rcsigma/game/board'

describe("General Test", () => {
  util_.init();
  bitboard_.init();

  it("Bitboard pretty", function () {
    const fen = "3qkb2/pppp1ppp/n1b1p2r/4P3/2B2N2/2N5/PPPP1PPP/R3KB1R w KQkq - 2 2";
    const pos = board_.clearBoard();
    board_.fenToBoard(fen, pos);

    const wp = `  +---+---+---+---+---+---+---+---+
8 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
7 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
6 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
5 |   |   |   |   | X |   |   |   | 
  +---+---+---+---+---+---+---+---+
4 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
3 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
2 | X | X | X | X |   | X | X | X | 
  +---+---+---+---+---+---+---+---+
1 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
    a   b   c   d   e   f   g   h
`;

    const bp = `  +---+---+---+---+---+---+---+---+
8 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
7 | X | X | X | X |   | X | X | X | 
  +---+---+---+---+---+---+---+---+
6 |   |   |   |   | X |   |   |   | 
  +---+---+---+---+---+---+---+---+
5 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
4 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
3 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
2 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
1 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
    a   b   c   d   e   f   g   h
`;
    expect(bitboard_.pretty(pos.piecesBB[util_.Pieces.WHITEPAWN])).toBe(wp);
    expect(bitboard_.pretty(pos.piecesBB[util_.Pieces.BLACKPAWN])).toBe(bp);
  });

  it("test must be running in debugging mode pretty", function () {
    expect(util_.DEBUGGING).toBe(true);
  });

});