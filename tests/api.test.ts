// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as api_ from '../rcsigma/ui/api/api';
import * as move_ from '../rcsigma/game/move';
import * as board_ from '../rcsigma/game/board';
import * as util_ from '../rcsigma/util';


describe("API Tests", () => {
    const game = new api_.Raccoon();
    beforeEach(() => {
        game.clearBoard()
    });

    it("Success: Constructor loads fen", function () {
        const test_fen = '8/7K/8/8/1R6/k7/1R1p4/8 b - - 0 1';
        const game2 = new api_.Raccoon({ startFEN: test_fen });
        game.loadFEN(test_fen);
        expect(game.getFEN()).toBe(game2.getFEN());
    });
});

describe("Game Tests", () => {
    describe("Load Fen & Get fen Test", function () {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it("Success: No Enpass; fen: startFEN", function () {
            const result = game.loadFEN(util_.START_FEN);
            expect(result.value).toBe(true)
            expect(game.getFEN()).toBe(util_.START_FEN);
        });
        it("Success: No Castling; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2", function () {
            const result = game.loadFEN('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2');
            expect(result.value).toBe(true)
            expect(game.getFEN()).toBe('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2');
        });
        it("Success: With EnPass; fen: start_e2e4_fen", function () {
            const start_e2e4_fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
            const result = game.loadFEN(start_e2e4_fen);
            expect(result.value).toBe(true)
            expect(game.getFEN()).toBe(start_e2e4_fen);
        });
        it("Failure: Empty fen provided; fen: ", function () {
            const result = game.loadFEN("");
            expect(result.value).toBe(false)
            expect(result.error.includes("Empty fen provided")).toBe(true)
        });
        it("Failure: Illegal character 9; fen: rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function () {
            const result = game.loadFEN('rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(result.value).toBe(false)
            expect(result.error.includes("Illegal character 9")).toBe(true)
        });
        it("Failure: Half move cannot be a negative integer; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - -1 2", function () {
            const result = game.loadFEN('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - -1 2');
            expect(result.value).toBe(false)
            expect(result.error.includes("Half move cannot be")).toBe(true);
        });
        it("Failure: Full move must be greater than 0; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 10 0", function () {
            const result = game.loadFEN('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 10 0');
            expect(result.value).toBe(false)
            expect(result.error.includes("Full move must be")).toBe(true);
        });
        it("Failure: Empty Board; fen: 8/8/8/8/8/8/8/8 w - - 0 1", function () {
            const result = game.loadFEN('8/8/8/8/8/8/8/8 w - - 0 1');
            expect(result.value).toBe(false)
            expect(game.getFEN()).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
        });
    });
    describe("Print Board Test", () => {
        const fen_print = 'rnbqkbnr/p1pppppp/8/8/P1pP3P/R7/1P2PPP1/1NBQKBNR b Kkq d3 0 5';
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it("Fen: startFEN; Default, i.e ASCII", function () {
            const expected = (
                "   A B C D E F G H   \n\n" +
                "8  r n b q k b n r  8\n" +
                "7  p p p p p p p p  7\n" +
                "6  - = - = - = - =  6\n" +
                "5  = - = - = - = -  5\n" +
                "4  - = - = - = - =  4\n" +
                "3  = - = - = - = -  3\n" +
                "2  P P P P P P P P  2\n" +
                "1  R N B Q K B N R  1\n\n" +
                "   A B C D E F G H   \n");
            game.loadFEN(util_.START_FEN)
            expect(game.boardASCII()).toBe(expected);
        });
        it("Fen: startFEN; ASCII and info", function () {
            game.loadFEN(fen_print);
            const expected = (
                "   A B C D E F G H   \n\n" +
                "8  r n b q k b n r  8\n" +
                "7  p - p p p p p p  7\n" +
                "6  - = - = - = - =  6\n" +
                "5  = - = - = - = -  5\n" +
                "4  P = p P - = - P  4\n" +
                "3  R - = - = - = -  3\n" +
                "2  - P - = P P P =  2\n" +
                "1  = N B Q K B N R  1\n\n" +
                "   A B C D E F G H   \n" +
                "INFO:\n" +
                "turn: b\n" +
                "enpass: d3\n" +
                "castling: Kkq\n" +
                "poly key: 0x8edef0e518b9d296\n");
            expect(game.boardASCII(true)).toBe(expected);
        });
        it("Fen: startFEN; UNI_CODE", function () {
            game.loadFEN(fen_print);
            const config = {
                pieces: ["♙", "♗", "♘", "♖", "♕", "♔", "♟", "♝", "♞", "♜", "♛", "♚"],
                light_square: " ",
                dark_square: "x"
            }
            const expected = (
                "   A B C D E F G H   \n\n" +
                "8  ♜ ♞ ♝ ♛ ♚ ♝ ♞ ♜  8\n" +
                "7  ♟   ♟ ♟ ♟ ♟ ♟ ♟  7\n" +
                "6    x   x   x   x  6\n" +
                "5  x   x   x   x    5\n" +
                "4  ♙ x ♟ ♙   x   ♙  4\n" +
                "3  ♖   x   x   x    3\n" +
                "2    ♙   x ♙ ♙ ♙ x  2\n" +
                "1  x ♘ ♗ ♕ ♔ ♗ ♘ ♖  1\n\n" +
                "   A B C D E F G H   \n");
            expect(game.boardASCII(false, config)).toBe(expected);
        });
        it("Fen: startFEN; ANSI", function () {
            game.loadFEN(util_.START_FEN);
            const t = game.boardANSI();

            const output = `    a  b  c  d  e  f  g  h
 8 [47m[30m ♜ [0m[41m[30m ♞ [0m[47m[30m ♝ [0m[41m[30m ♛ [0m[47m[30m ♚ [0m[41m[30m ♝ [0m[47m[30m ♞ [0m[41m[30m ♜ [0m 8
 7 [41m[30m ♟ [0m[47m[30m ♟ [0m[41m[30m ♟ [0m[47m[30m ♟ [0m[41m[30m ♟ [0m[47m[30m ♟ [0m[41m[30m ♟ [0m[47m[30m ♟ [0m 7
 6 [47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m 6
 5 [41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m 5
 4 [47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m 4
 3 [41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m[41m[30m ⠀ [0m[47m[30m ⠀ [0m 3
 2 [47m[30m ♙ [0m[41m[30m ♙ [0m[47m[30m ♙ [0m[41m[30m ♙ [0m[47m[30m ♙ [0m[41m[30m ♙ [0m[47m[30m ♙ [0m[41m[30m ♙ [0m 2
 1 [41m[30m ♖ [0m[47m[30m ♘ [0m[41m[30m ♗ [0m[47m[30m ♕ [0m[41m[30m ♔ [0m[47m[30m ♗ [0m[41m[30m ♘ [0m[47m[30m ♖ [0m 1
    a  b  c  d  e  f  g  h\n\n`;
            expect(t).toBe(output);
        });
    });

    describe("Make Move & Undo Move Test", () => {
        const test_fen = "2n1b3/1P1kr3/3p4/3N4/4N3/2R1K3/2P5/8 w - - 0 1";
        const expectedMove: move_.verboseMove_t = {
            from: "b7",
            to: "c8",
            color: "w",
            pieces: "p",
            flag: "pc",
            smith: "b7c8q",
            san: "bxc8=Q#",
            promoted: "q",
            captured: "n"
        }

        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it("Success: Legal smith move: b7c8q", function () {
            game.loadFEN(test_fen);
            expect(game.makeMove("b7c8q")).toStrictEqual(expectedMove);
            expect(game.undoMove()).toStrictEqual(expectedMove);
        });
        it("Success: Legal verbose smith move: Pb7xc8Q", function () {
            game.loadFEN(test_fen);
            expect(game.makeMove("Pb7xc8Q")).toStrictEqual(expectedMove);
            expect(game.undoMove()).toStrictEqual(expectedMove);
        });
        it("Success: Legal san move: bxc8=Q+", function () {
            game.loadFEN(test_fen);
            expect(game.makeMove("bxc8=Q+")).toStrictEqual(expectedMove);
            expect(game.undoMove()).toStrictEqual(expectedMove);
        });
        it("Success: Legal object move", function () {
            game.loadFEN(test_fen);
            expect(game.makeMove({ from: "b7", to: "c8", promotion: "q" })).toStrictEqual(expectedMove);
            expect(game.undoMove()).toStrictEqual(expectedMove);
        });
        it("Failure: illegal move due to wrong turn", function () {
            game.loadFEN(test_fen);
            expect(game.makeMove("d7e6")).toBe(null);// try to move black king
            expect(game.undoMove()).toBe(null);
        });
        it("Failure: illegal move due to of pin", function () {
            game.loadFEN(test_fen);
            expect(game.makeMove("e4f6")).toBe(null);// try to move white pinned piece
            expect(game.undoMove()).toBe(null);
        });
        it("Failure: illegal move due to of pin object", function () {
            game.loadFEN(test_fen);
            expect(game.makeMove({ from: "e4", to: "f6" })).toBe(null);// try to move white pinned piece
            expect(game.undoMove()).toBe(null);
        });
    });
    describe("Get Moves Test", () => {
        const test_fen = "Bn1K4/NP1P1k2/1N1n4/pP1P4/P1r5/8/8/8 w - - 0 1";
        const expected_str: string[] = ['Nc6', 'Nac8', 'Nbc8', 'Nxc4'].sort()
        const expectedMove: move_.verboseMove_t[] = [
            {
                from: "a7",
                to: "c6",
                color: "w",
                pieces: "n",
                flag: "n",
                smith: "a7c6",
                san: "Nc6",
            },
            {
                from: "a7",
                to: "c8",
                color: "w",
                pieces: "n",
                flag: "n",
                smith: "a7c8",
                san: "Nac8",
            },
            {
                from: "b6",
                to: "c8",
                color: "w",
                pieces: "n",
                flag: "n",
                smith: "b6c8",
                san: "Nbc8",
            },
            {
                from: "b6",
                to: "c4",
                color: "w",
                pieces: "n",
                flag: "c",
                smith: "b6c4",
                san: "Nxc4",
                captured: "r"
            }
        ].sort((a, b) => (a.san > b.san) ? 1 : -1);

        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it("Pass: get all moves on board", function () {
            game.loadFEN(test_fen);
            expect(game.getMoves().sort()).toStrictEqual(expected_str); // Default in san format
            const verbo = game.getMoves({ verbose: true });
            const verbo_sorted = (verbo as move_.verboseMove_t[]).sort((a, b) => (a.san > b.san) ? 1 : -1);
            expect(verbo_sorted).toStrictEqual(expectedMove);// verbose
        });
        it("Pass: get all from a7", function () {
            game.loadFEN(test_fen);
            expect(game.getMoves({ square: 'a7' }).sort()).toStrictEqual(['Nc6', 'Nac8'].sort());
        });
        it("Pass: capture only", function () {
            game.loadFEN(test_fen);
            expect(game.getMoves({ capture_only: true })).toStrictEqual(['Nxc4']);
        });
        it("Failure: square", function () {
            game.loadFEN(test_fen);
            expect(game.getMoves({ square: 'a2' })).toStrictEqual([]);// valid square but no move available
            expect(game.getMoves({ square: 'a9' })).toStrictEqual([]);// invalid square
        });
        it("Failure: stalemate", function () {
            game.loadFEN("5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10");
            expect(game.getMoves()).toStrictEqual([]);
        });
    });


    describe("Checkmate/Check Test", () => {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it("Success: Q-R mate", function () {
            game.loadFEN('8/5r2/4K1q1/4p3/3k4/8/8/8 w - - 0 7');
            expect(game.inCheckmate()).toBe(true);
            expect(game.gameOver()).toBe(true);
            expect(game.inCheck()).toBe(true);
        });
        it("Success: Q-N mate", function () {
            game.loadFEN('4r2r/p6p/1pnN2p1/kQp5/3pPq2/3P4/PPP3PP/R5K1 b - - 0 2');
            expect(game.insufficientMaterial()).toBe(false);
            expect(game.inCheckmate()).toBe(true);
            expect(game.inCheck()).toBe(true);
            expect(game.gameOver()).toBe(true);
        });
        it("Success: Pinned mate", function () {
            game.loadFEN('r3k2r/ppp2p1p/2n1p1p1/8/2B2P1q/2NPb1n1/PP4PP/R2Q3K w kq - 0 8');
            expect(game.insufficientMaterial()).toBe(false);
            expect(game.inCheckmate()).toBe(true);
            expect(game.inCheck()).toBe(true);
            expect(game.gameOver()).toBe(true);
        });
        it("Success: Pawn", function () {
            game.loadFEN('8/6R1/pp1r3p/6p1/P3R1Pk/1P4P1/7K/8 b - - 0 4');
            expect(game.inCheckmate()).toBe(true);
            expect(game.inCheck()).toBe(true);
            expect(game.gameOver()).toBe(true);
        });
        it("Failure: stalemate", function () {
            game.loadFEN('1R6/8/8/8/8/8/7R/k6K b - - 0 1');
            expect(game.inCheckmate()).toBe(false)
            expect(game.inCheck()).toBe(false);
            expect(game.gameOver()).toBe(true);
        });
        it("Failure: king can't move but other piece can", function () {
            game.loadFEN('5bnr/4p1pq/4Qpkr/7p/2P2r1P/3B4/PP1PPPP1/RNB1K1NR b KQ - 0 1');
            expect(game.inCheckmate()).toBe(false);
            expect(game.inCheck()).toBe(true);
            expect(game.gameOver()).toBe(false);
        });
    });

    describe("Stalemate/Not Check/Draw Test", () => {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it("Success: caged", function () {
            game.loadFEN('1R6/8/8/8/8/8/7R/k6K b - - 0 1');
            expect(game.inStalemate()).toBe(true);
            expect(game.inCheck()).toBe(false);
            expect(game.inDraw()).toBe(true);
            expect(game.gameOver()).toBe(true);
        });
        it("Success: locked in", function () {
            game.loadFEN('5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10');
            expect(game.inStalemate()).toBe(true);
            expect(game.inCheck()).toBe(false);
            expect(game.inDraw()).toBe(true);
            expect(game.gameOver()).toBe(true);
        });
        it("Failure: checkmate", function () {
            game.loadFEN('2R5/8/8/8/3B4/8/7R/k6K b - - 0 1');
            expect(game.inStalemate()).toBe(false);
            expect(game.inCheck()).toBe(true);
            expect(game.inDraw()).toBe(false);
        });
        it("Failure: king can capture R", function () {
            game.loadFEN('8/8/5k2/p4p1p/P4K1P/4r3/8/8 w - - 0 2');
            expect(game.inStalemate()).toBe(false);
            expect(game.inCheck()).toBe(false);
            expect(game.inDraw()).toBe(false);
        });
    });

    describe("Insufficient Material/Draw Test", () => {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it("Success: 8/8/8/8/8/8/8/k6K w - - 0 1", function () {
            game.loadFEN('8/8/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(true);
            expect(game.inDraw()).toBe(true);
            expect(game.gameOver()).toBe(true);
        });
        it("Success: 8/2N5/8/8/8/8/8/k6K w - - 0 1", function () {
            game.loadFEN('8/2N5/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(true);
            expect(game.inDraw()).toBe(true);
        });
        it("Success: 88/2b5/8/8/8/8/8/k6K w - - 0 1", function () {
            game.loadFEN('8/2b5/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(true);
            expect(game.inDraw()).toBe(true);
        });
        it("Success: 8/b7/3B4/8/8/8/8/k6K w - - 0 1", function () {
            game.loadFEN('8/b7/3B4/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(true);
            expect(game.inDraw()).toBe(true);
        });
        it("Success: 8/b7/B7/8/8/8/8/k6K w - - 0 1", function () {
            game.loadFEN('8/b7/B7/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(true);
            expect(game.inDraw()).toBe(true);
        });
        it("Failure: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function () {
            game.loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(game.insufficientMaterial()).toBe(false);
            expect(game.inDraw()).toBe(false);
        });
        it("Failure: 8/2p5/8/8/8/8/8/k6K w - - 0 1", function () {
            game.loadFEN('8/2p5/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(false);
            expect(game.inDraw()).toBe(false);
        });
        it("Failure: 8/b1B1b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1", function () {
            game.loadFEN('8/b1B1b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(false);
            expect(game.inDraw()).toBe(false);
        });
        it("Failure: 8/bB2b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1", function () {
            game.loadFEN('8/bB2b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1');
            expect(game.insufficientMaterial()).toBe(false);
            expect(game.inDraw()).toBe(false);
            expect(game.gameOver()).toBe(false);
        });
    });

    describe("Threefold Repetition/Draw Test", () => {
        const positions = [
            {
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                moves: ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']
            },

            // Fischer - Petrosian, Buenos Aires, 1971
            {
                fen: '8/pp3p1k/2p2q1p/3r1P2/5R2/7P/P1P1QP2/7K b - - 2 30',
                moves: ['Qe5', 'Qh5', 'Qf6', 'Qe2', 'Re5', 'Qd3', 'Rd5', 'Qe2']
            },
        ];
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it(`Success: ${positions[0].fen} `, function () {
            game.loadFEN(positions[0].fen);
            for (const move of positions[0].moves) {
                game.makeMove(move);
            }
            expect(game.inThreefoldRepetition()).toBe(true);
            expect(game.inDraw()).toBe(true);
        });
        it(`Success: ${positions[1].fen} `, function () {
            game.loadFEN(positions[1].fen);
            for (const move of positions[1].moves) {
                game.makeMove(move);
            }
            expect(game.inThreefoldRepetition()).toBe(true);
            expect(game.inDraw()).toBe(true);
        });
    });

    describe("Get, Set, and Pop Piece Test", () => {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
            game.loadFEN(util_.START_FEN)
        });

        it(`Success: SET, GET, POP`, function () {
            const piece = { type: "q", color: "w" } // white queen
            const sq = 'd1';
            expect(game.getPiece(sq)).toStrictEqual(piece); // white queen starts in d1 in standard chess
            expect(game.getPiece('a8')).toStrictEqual({ type: "r", color: "b" });

            game.clearBoard(); // board is empty now
            expect(game.getPiece(sq)).toBe(null); // should be null since board is empty
            expect(game.setPiece(piece, sq)).toBe(true);
            expect(game.popPiece(sq)).toStrictEqual(piece); // remove and return piece
            expect(game.getPiece(sq)).toBe(null); // should be null since board is empty
        });

        it('Failure: Set extra king', function () {
            expect(game.setPiece({ type: "k", color: "w" }, "e4")).toBe(false);
            expect(game.setPiece({ type: "k", color: "b" }, "e4")).toBe(false);
            expect(game.setPiece({ type: "k", color: "w" }, "e1")).toBe(true); // no error since it' the same square as old king
            expect(game.setPiece({ type: "k", color: "b" }, "e8")).toBe(true); // no error since it' the same square as old king
        });
        it('Failure: bad square, piece and color', function () {
            const sq = "hello world"
            expect(game.getPiece(sq)).toBe(null);
            expect(game.popPiece(sq)).toBe(null);
            expect(game.getPiece(sq)).toBe(null);
            expect(game.setPiece({ type: "k", color: "w" }, sq)).toBe(false);
            expect(game.setPiece({ type: "x", color: "b" }, "e4")).toBe(false);// bad piece
            expect(game.setPiece({ type: "r", color: "t" }, "e4")).toBe(false);// bad color
        });
    });


    describe("MICS Test", () => {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
            game.loadFEN(util_.START_FEN)
        });

        it('Get Turn', function () {
            expect(game.getTurn()).toBe('w')
            game.makeMove('e4');
            expect(game.getTurn()).toBe('b')
            game.clearBoard(); // clear board an no one has a turn
            expect(game.getTurn()).toBe('w')
        });

        it('Square color', function () {
            expect(game.squareColor('h8')).toBe('dark');
            expect(game.squareColor('a3')).toBe('dark');
            expect(game.squareColor('e5')).toBe('dark');
            expect(game.squareColor('g1')).toBe('dark');
            expect(game.squareColor('h1')).toBe('light');
            expect(game.squareColor('d1')).toBe('light');
            expect(game.squareColor('g8')).toBe('light');
            expect(game.squareColor('c8')).toBe('light');
            expect(game.squareColor('c9')).toBe(null); // bad square
        });
    });

    describe("Reset and Clear board, and Move History Test", () => {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it('Clear Board & Move History', function () {
            const empty_fen = "8/8/8/8/8/8/8/8 w - - 0 1";
            game.clearBoard();
            expect(game.getFEN()).toBe(empty_fen);
            expect(game.moveHistory()).toStrictEqual([]);
        });
        it('Reset Board & Move History', function () {
            const intial_fen = "8/pp3p1k/2p2q1p/3r1P2/5R2/7P/P1P1QP2/7K b - - 2 30";
            const moves_str = ['Qe5', 'Qh5', 'Qf6', 'Qe2', 'Re5'];
            const moves_verbo: move_.verboseMove_t[] = [
                {
                    color: "b",
                    flag: "n",
                    from: "f6",
                    pieces: "q",
                    san: "Qe5",
                    smith: "f6e5",
                    to: "e5",
                },
                {
                    color: "w",
                    flag: "n",
                    from: "e2",
                    pieces: "q",
                    san: "Qh5",
                    smith: "e2h5",
                    to: "h5",
                },
                {
                    color: "b",
                    flag: "n",
                    from: "e5",
                    pieces: "q",
                    san: "Qf6",
                    smith: "e5f6",
                    to: "f6",
                },
                {
                    color: "w",
                    flag: "n",
                    from: "h5",
                    pieces: "q",
                    san: "Qe2",
                    smith: "h5e2",
                    to: "e2",
                },
                {
                    color: "b",
                    flag: "n",
                    from: "d5",
                    pieces: "r",
                    san: "Re5",
                    smith: "d5e5",
                    to: "e5",
                },
            ];
            game.loadFEN(intial_fen);
            for (const mv of moves_str) {
                game.makeMove(mv);
            }
            expect(game.moveHistory({ verbose: true })).toStrictEqual(moves_verbo)
            expect(game.moveHistory()).toStrictEqual(moves_str);
            game.resetBoard();
            expect(game.getFEN()).toBe(intial_fen);
            expect(game.moveHistory()).toStrictEqual([]);
            expect(game.moveHistory({ verbose: true })).toStrictEqual([]);
        });
    });
    describe("Get Board Test", () => {
        const game = new api_.Raccoon();
        beforeEach(() => {
            game.clearBoard()
        });

        it('Get Empty Board', function () {
            const position: board_.position_t = {
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                turn: "w",
                moveCount: [0, 1],
                enpassant: "-",
                castling: [false, false, false, false]
            };
            game.clearBoard();
            expect(game.getBoard()).toStrictEqual(position);
        });
        it('Get Board from startFEN', function () {
            const P = (p: string, b: string): { type: string, color: string } => { return { type: p, color: b } };
            const position: board_.position_t = {
                board: [
                    [null, null, null, null, null, null, null, null],
                    [P('p', 'b'), P('p', 'b'), null, null, null, P('p', 'b'), null, P('k', 'b')],
                    [null, null, P('p', 'b'), null, null, P('q', 'b'), null, P('p', 'b')],
                    [null, null, null, P('r', 'b'), null, P('p', 'w'), null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, P('p', 'w')],
                    [P('p', 'w'), null, P('p', 'w'), null, P('q', 'w'), P('p', 'w'), null, null],
                    [P('r', 'w'), null, null, null, P('k', 'w'), null, null, P('r', 'w')]
                ],
                turn: "b",
                moveCount: [2, 30],
                enpassant: "-",
                castling: [true, true, false, false]
            };
            game.loadFEN('8/pp3p1k/2p2q1p/3r1P2/8/7P/P1P1QP2/R3K2R b KQ - 2 30');
            expect(game.getBoard()).toStrictEqual(position);
        });

    });
});


describe("Evaluation Tests", () => {
    const game = new api_.Raccoon();
    beforeEach(() => {
        game.clearBoard()
    });
    it("rc: the same evaluation for specific position(idempotent)", function () {
        const test_fen = 'kqrR4/rp1R1B1K/p1Np4/3P4/3B4/8/3p4/8 b - - 0 1';
        game.loadFEN(test_fen);
        const eval_score1 = game.evaluateBoard();

        game.loadFEN(test_fen);
        const eval_score2 = game.evaluateBoard();

        expect(eval_score1).toBe(eval_score2);
    });

    it("rc: the same evaluation for white and black(basic)", function () {
        const test_fen = 'kqrR4/rp1R1B1K/p1Np4/3P4/3B4/8/3p4/8 b - - 0 1';
        game.loadFEN(test_fen);
        const eval_score = game.evaluateBoard();
        game.flipBoard();
        expect(game.evaluateBoard()).toBe(-eval_score);
    });
    it("rc: the same evaluation for white and black(complex)", function () {
        const test_fen = '4k2r/1bB2n2/p2p1R2/P1pNp1P1/1pNpP1P1/1Pp3q1/2P2QP1/R3K2R w - - 1 4'
        game.loadFEN(test_fen);
        const eval_score = game.evaluateBoard();
        game.flipBoard();
        expect(game.evaluateBoard()).toBe(-eval_score);
    });
    it("rc: cached pawn evaluation", function () {
        const a: number[] = [];
        const b: number[] = [];

        const average = (arr: number[]) => arr.reduce((acc, v) => acc + v) / arr.length;
        const performance = (rep: number) => {
            for (let i = 0; i < rep; i++) {
                const test_fen = '6k1/5pp1/1p1pp2p/pP6/2P1P3/P6P/5PP1/6K1 b - - 0 1' // only pawns fen
                game.loadFEN(test_fen);

                let now = util_.getTimeMs()
                game.evaluateBoard();
                a.push(util_.getTimeMs() - now)

                now = util_.getTimeMs()
                game.evaluateBoard(); // should be faster, chashed
                b.push(util_.getTimeMs() - now)
            }
        }

        performance(10000);
        expect(average(a)).toBeGreaterThan(average(b))
    });
    it("rc0: the same evaluation for white and black", function () {
        game.loadFEN(util_.START_FEN);
        const eval_score = game.evaluateBoard({ use_nnue: true });
        game.flipBoard();
        expect(game.evaluateBoard({ use_nnue: true })).toBe(eval_score);
    });
});