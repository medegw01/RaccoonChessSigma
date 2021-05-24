import * as util_ from '../rcsigma/util'
import * as board_ from '../rcsigma/game/board'
import * as bitboard_ from '../rcsigma/game/bitboard'
import * as thread_ from '../rcsigma/search/thread';

import { perft } from '../rcsigma/game/perft'

describe("Perft Test", () => {
    const startFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    util_.init();
    bitboard_.init();
    let board: board_.board_t

    let nodes: bigint
    let thread: thread_.thread_t;

    beforeEach(() => {
        board = board_.clearBoard();
        nodes = 0n;
        thread = thread_.create(1)[0];
    });

    // see below link for perft table:
    //   https://www.chessprogramming.org/Perft_Results
    //

    it('Initiail Position', function () {
        board_.fenToBoard(startFEN, board);
        nodes = perft(4, board, thread)
        expect(nodes).toBe(197281n);
    });

    it('Position 2', function () {
        board_.fenToBoard('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', board);
        nodes = perft(4, board, thread)
        expect(nodes).toBe(4085603n);
    });
    it('Position 3', function () {
        board_.fenToBoard('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', board);
        nodes = perft(4, board, thread)
        expect(nodes).toBe(43238n);
    });
    it('Position 4 ', function () {
        board_.fenToBoard('r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1', board);
        nodes = perft(3, board, thread)
        expect(nodes).toBe(9467n);
    });

    it('Position 5', function () {
        board_.fenToBoard('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', board);
        nodes = perft(3, board, thread)
        expect(nodes).toBe(62379n);
    });
});