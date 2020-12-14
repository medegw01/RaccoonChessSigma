// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as api from '../rcsigma/ui/api/api'
import { verbose_move_t } from '../rcsigma/game/move';
import { position_t } from '../rcsigma/game/board';
import { START_FEN } from '../rcsigma/util';

describe("API Tests", () => {
    let game: api.Raccoon;
    beforeEach(() => {
        game = new api.Raccoon();
    });

    it("Success: Constructor loads fen", function () {
        const test_fen = '8/7K/8/8/1R6/k7/1R1p4/8 b - - 0 1';
        const game2 = new api.Raccoon({ start_fen: test_fen });
        game.load_fen(test_fen);
        expect(game.get_fen()).toBe(game2.get_fen());
    });
});

describe("Game Tests", () => {
    const start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    describe("Perft Test", () => {
        let game: api.Raccoon;
        let nodes: bigint
        beforeEach(() => {
            game = new api.Raccoon();
            nodes = 0n;
        });
        /*
        see below link for perft table:
          https://www.chessprogramming.org/Perft_Results
        */

        it('Initiail Position', function () {
            game.load_fen(start_fen);
            nodes = game.perft(4);
            expect(nodes).toBe(197281n);
        });

        it('Position 2', function () {
            game.load_fen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1');
            nodes = game.perft(4);
            expect(nodes).toBe(4085603n);
        });
        it('Position 3', function () {
            game.load_fen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
            nodes = game.perft(4);
            expect(nodes).toBe(43238n);
        });
        it('Position 4 ', function () {
            game.load_fen('r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1 ');
            nodes = game.perft(3);
            expect(nodes).toBe(9467n);
        });

        it('Position 5', function () {
            game.load_fen('rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8 ');
            nodes = game.perft(3);
            expect(nodes).toBe(62379n);
        });
    });
    describe("Poly Keys Test", function () {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });
        it("Fen: start_fen; moves: []", function () {
            game.load_fen(start_fen);
            const by_fen = game.get_polyglot();
            game.load_fen(start_fen);
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x463b96181691fc9c"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4']", function () {
            game.load_fen("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
            const by_fen = game.get_polyglot();
            const moves = ['e2e4'];
            game.load_fen(start_fen);
            for (const mv of moves) {
                game.make_move(mv);
            }
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x823c9b50fd114196"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5']", function () {
            game.load_fen("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2");
            const by_fen = game.get_polyglot();
            const moves = ['e2e4', 'd7d5'];
            game.load_fen(start_fen);
            for (const mv of moves) {
                game.make_move(mv);
            }
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x0756b94461c50fb0"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5', 'e4e5']", function () {
            game.load_fen("rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2");
            const by_fen = game.get_polyglot();
            const moves = ['e2e4', 'd7d5', 'e4e5'];
            game.load_fen(start_fen);
            for (const mv of moves) {
                game.make_move(mv);
            }
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x662fafb965db29d4"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5', 'e4e5', 'f7f5']", function () {
            game.load_fen("rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3");
            const by_fen = game.get_polyglot();
            const moves = ['e2e4', 'd7d5', 'e4e5', 'f7f5'];
            game.load_fen(start_fen);
            for (const mv of moves) {
                game.make_move(mv);
            }
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x22a48b5a8e47ff78"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2', 'e8f7']", function () {
            game.load_fen("rnbq1bnr/ppp1pkpp/8/3pPp2/8/8/PPPPKPPP/RNBQ1BNR w - - 0 4");
            const by_fen = game.get_polyglot();
            const moves = ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2', 'e8f7'];
            game.load_fen(start_fen);
            for (const mv of moves) {
                game.make_move(mv);
            }
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x00fdd303c946bdd9"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4']", function () {
            game.load_fen("rnbqkbnr/p1pppppp/8/8/PpP4P/8/1P1PPPP1/RNBQKBNR b KQkq c3 0 3");
            const by_fen = game.get_polyglot();
            const moves = ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4'];
            game.load_fen(start_fen);
            for (const mv of moves) {
                game.make_move(mv);
            }
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x3c8123ea7b067637"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4', 'b4c3', 'a1a3']", function () {
            game.load_fen("rnbqkbnr/p1pppppp/8/8/P6P/R1p5/1P1PPPP1/1NBQKBNR b Kkq - 0 4");
            const by_fen = game.get_polyglot();
            const moves = ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4', 'b4c3', 'a1a3'];
            game.load_fen(start_fen);
            for (const mv of moves) {
                game.make_move(mv);
            }
            const by_move = game.get_polyglot(true);
            expect(by_fen).toBe(BigInt("0x5c3f9b829b279560"));
            expect(by_move).toBe(by_fen);
        });
    });
    describe("Load Fen & Get fen Test", function () {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it("Success: No Enpass; fen: start_fen", function () {
            const result = game.load_fen(start_fen);
            expect(result.value).toBe(true)
            expect(game.get_fen()).toBe(start_fen);
        });
        it("Success: No Castling; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2", function () {
            const result = game.load_fen('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2');
            expect(result.value).toBe(true)
            expect(game.get_fen()).toBe('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2');
        });
        it("Success: With EnPass; fen: start_e2e4_fen", function () {
            const start_e2e4_fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
            const result = game.load_fen(start_e2e4_fen);
            expect(result.value).toBe(true)
            expect(game.get_fen()).toBe(start_e2e4_fen);
        });
        it("Failure: Empty fen provided; fen: ", function () {
            const result = game.load_fen("");
            expect(result.value).toBe(false)
            expect(result.error.includes("Empty fen provided")).toBe(true)
        });
        it("Failure: Illegal character 9; fen: rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function () {
            const result = game.load_fen('rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(result.value).toBe(false)
            expect(result.error.includes("Illegal character 9")).toBe(true)
        });
        it("Failure: Half move cannot be a negative integer; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - -1 2", function () {
            const result = game.load_fen('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - -1 2');
            expect(result.value).toBe(false)
            expect(result.error.includes("Half move cannot be")).toBe(true);
        });
        it("Failure: Full move must be greater than 0; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 10 0", function () {
            const result = game.load_fen('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 10 0');
            expect(result.value).toBe(false)
            expect(result.error.includes("Full move must be")).toBe(true);
        });
        it("Failure: Empty Board; fen: 8/8/8/8/8/8/8/8 w - - 0 1", function () {
            const result = game.load_fen('8/8/8/8/8/8/8/8 w - - 0 1');
            expect(result.value).toBe(false)
            expect(game.get_fen()).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
        });
    });
    describe("Print Board Test", () => {
        let game: api.Raccoon;
        const fen_print = 'rnbqkbnr/p1pppppp/8/8/P1pP3P/R7/1P2PPP1/1NBQKBNR b Kkq d3 0 5';
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it("Fen: start_fen; Default, i.e ASCII", function () {
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
            game.load_fen(start_fen)
            expect(game.print_board()).toBe(expected);
        });
        it("Fen: start_fen; ASCII and info", function () {
            game.load_fen(fen_print);
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
                "        INFO         \n" +
                "turn: b\n" +
                "enpass: d3\n" +
                "castling: Kkq\n" +
                "poly key: 0x8edef0e518b9d296\n");
            expect(game.print_board(true)).toBe(expected);
        });
        it("Fen: start_fen; UNI_CODE", function () {
            game.load_fen(fen_print);
            const parser = {
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
            expect(game.print_board(false, parser)).toBe(expected);
        });
    });

    describe("Make Move & Undo Move Test", () => {
        let game: api.Raccoon;
        const test_fen = "2n1b3/1P1kr3/3p4/3N4/4N3/2R1K3/2P5/8 w - - 0 1";
        const expected_move: verbose_move_t = {
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

        beforeEach(() => {
            game = new api.Raccoon();
        });
        it("Success: Legal smith move: b7c8q", function () {
            game.load_fen(test_fen);
            expect(game.make_move("b7c8q")).toStrictEqual(expected_move);
            expect(game.undo_move()).toStrictEqual(expected_move);
        });
        it("Success: Legal verbose smith move: Pb7xc8Q", function () {
            game.load_fen(test_fen);
            expect(game.make_move("Pb7xc8Q")).toStrictEqual(expected_move);
            expect(game.undo_move()).toStrictEqual(expected_move);
        });
        it("Success: Legal san move: bxc8=Q+", function () {
            game.load_fen(test_fen);
            expect(game.make_move("bxc8=Q+")).toStrictEqual(expected_move);
            expect(game.undo_move()).toStrictEqual(expected_move);
        });
        it("Success: Legal object move", function () {
            game.load_fen(test_fen);
            expect(game.make_move({ from: "b7", to: "c8", promotion: "q" })).toStrictEqual(expected_move);
            expect(game.undo_move()).toStrictEqual(expected_move);
        });
        it("Failure: illegal move due to wrong turn", function () {
            game.load_fen(test_fen);
            expect(game.make_move("d7e6")).toBe(null);// try to move black king
            expect(game.undo_move()).toBe(null);
        });
        it("Failure: illegal move due to of pin", function () {
            game.load_fen(test_fen);
            expect(game.make_move("e4f6")).toBe(null);// try to move white pinned piece
            expect(game.undo_move()).toBe(null);
        });
        it("Failure: illegal move due to of pin object", function () {
            game.load_fen(test_fen);
            expect(game.make_move({ from: "e4", to: "f6" })).toBe(null);// try to move white pinned piece
            expect(game.undo_move()).toBe(null);
        });
    });
    describe("Get Moves Test", () => {
        let game: api.Raccoon;
        const test_fen = "Bn1K4/NP1P1k2/1N1n4/pP1P4/P1r5/8/8/8 w - - 0 1";
        const expected_str: string[] = ['Nc6', 'Nac8', 'Nbc8', 'Nxc4'].sort()
        const expected_move: verbose_move_t[] = [
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

        beforeEach(() => {
            game = new api.Raccoon();
        });

        it("Pass: get all moves on board", function () {
            game.load_fen(test_fen);
            expect(game.get_moves().sort()).toStrictEqual(expected_str); // Default in san format
            const verbo = game.get_moves({ verbose: true });
            const verbo_sorted = (verbo as verbose_move_t[]).sort((a, b) => (a.san > b.san) ? 1 : -1);
            expect(verbo_sorted).toStrictEqual(expected_move);// verbose
        });
        it("Pass: get all from a7", function () {
            game.load_fen(test_fen);
            expect(game.get_moves({ square: 'a7' }).sort()).toStrictEqual(['Nc6', 'Nac8'].sort());
        });
        it("Pass: capture only", function () {
            game.load_fen(test_fen);
            expect(game.get_moves({ capture_only: true })).toStrictEqual(['Nxc4']);
        });
        it("Failure: square", function () {
            game.load_fen(test_fen);
            expect(game.get_moves({ square: 'a2' })).toStrictEqual([]);// valid square but no move available
            expect(game.get_moves({ square: 'a9' })).toStrictEqual([]);// invalid square
        });
        it("Failure: stalemate", function () {
            game.load_fen("5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10");
            expect(game.get_moves()).toStrictEqual([]);
        });
    });


    describe("Checkmate/Check Test", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it("Success: Q-R mate", function () {
            game.load_fen('8/5r2/4K1q1/4p3/3k4/8/8/8 w - - 0 7');
            expect(game.in_checkmate()).toBe(true);
            expect(game.game_over()).toBe(true);
            expect(game.in_check()).toBe(true);
        });
        it("Success: Q-N mate", function () {
            game.load_fen('4r2r/p6p/1pnN2p1/kQp5/3pPq2/3P4/PPP3PP/R5K1 b - - 0 2');
            expect(game.insufficient_material()).toBe(false);
            expect(game.in_checkmate()).toBe(true);
            expect(game.in_check()).toBe(true);
            expect(game.game_over()).toBe(true);
        });
        it("Success: Pinned mate", function () {
            game.load_fen('r3k2r/ppp2p1p/2n1p1p1/8/2B2P1q/2NPb1n1/PP4PP/R2Q3K w kq - 0 8');
            expect(game.insufficient_material()).toBe(false);
            expect(game.in_checkmate()).toBe(true);
            expect(game.in_check()).toBe(true);
            expect(game.game_over()).toBe(true);
        });
        it("Success: Pawn", function () {
            game.load_fen('8/6R1/pp1r3p/6p1/P3R1Pk/1P4P1/7K/8 b - - 0 4');
            expect(game.in_checkmate()).toBe(true);
            expect(game.in_check()).toBe(true);
            expect(game.game_over()).toBe(true);
        });
        it("Failure: stalemate", function () {
            game.load_fen('1R6/8/8/8/8/8/7R/k6K b - - 0 1');
            expect(game.in_checkmate()).toBe(false)
            expect(game.in_check()).toBe(false);
            expect(game.game_over()).toBe(true);
        });
        it("Failure: king can't move but other piece can", function () {
            game.load_fen('5bnr/4p1pq/4Qpkr/7p/2P2r1P/3B4/PP1PPPP1/RNB1K1NR b KQ - 0 1');
            expect(game.in_checkmate()).toBe(false);
            expect(game.in_check()).toBe(true);
            expect(game.game_over()).toBe(false);
        });
    });

    describe("Stalemate/Not Check/Draw Test", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it("Success: caged", function () {
            game.load_fen('1R6/8/8/8/8/8/7R/k6K b - - 0 1');
            expect(game.in_stalemate()).toBe(true);
            expect(game.in_check()).toBe(false);
            expect(game.in_draw()).toBe(true);
            expect(game.game_over()).toBe(true);
        });
        it("Success: locked in", function () {
            game.load_fen('5bnr/4p1pq/4Qpkr/7p/2P4P/8/PP1PPPP1/RNB1KBNR b KQ - 0 10');
            expect(game.in_stalemate()).toBe(true);
            expect(game.in_check()).toBe(false);
            expect(game.in_draw()).toBe(true);
            expect(game.game_over()).toBe(true);
        });
        it("Failure: checkmate", function () {
            game.load_fen('2R5/8/8/8/3B4/8/7R/k6K b - - 0 1');
            expect(game.in_stalemate()).toBe(false);
            expect(game.in_check()).toBe(true);
            expect(game.in_draw()).toBe(false);
        });
        it("Failure: king can capture R", function () {
            game.load_fen('8/8/5k2/p4p1p/P4K1P/4r3/8/8 w - - 0 2');
            expect(game.in_stalemate()).toBe(false);
            expect(game.in_check()).toBe(false);
            expect(game.in_draw()).toBe(false);
        });
    });

    describe("Insufficient Material/Draw Test", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it("Success: 8/8/8/8/8/8/8/k6K w - - 0 1", function () {
            game.load_fen('8/8/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficient_material()).toBe(true);
            expect(game.in_draw()).toBe(true);
            expect(game.game_over()).toBe(true);
        });
        it("Success: 8/2N5/8/8/8/8/8/k6K w - - 0 1", function () {
            game.load_fen('8/2N5/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficient_material()).toBe(true);
            expect(game.in_draw()).toBe(true);
        });
        it("Success: 88/2b5/8/8/8/8/8/k6K w - - 0 1", function () {
            game.load_fen('8/2b5/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficient_material()).toBe(true);
            expect(game.in_draw()).toBe(true);
        });
        it("Success: 8/b7/3B4/8/8/8/8/k6K w - - 0 1", function () {
            game.load_fen('8/b7/3B4/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficient_material()).toBe(true);
            expect(game.in_draw()).toBe(true);
        });
        it("Success: 8/b7/B7/8/8/8/8/k6K w - - 0 1", function () {
            game.load_fen('8/b7/B7/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficient_material()).toBe(true);
            expect(game.in_draw()).toBe(true);
        });
        it("Failure: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function () {
            game.load_fen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(game.insufficient_material()).toBe(false);
            expect(game.in_draw()).toBe(false);
        });
        it("Failure: 8/2p5/8/8/8/8/8/k6K w - - 0 1", function () {
            game.load_fen('8/2p5/8/8/8/8/8/k6K w - - 0 1');
            expect(game.insufficient_material()).toBe(false);
            expect(game.in_draw()).toBe(false);
        });
        it("Failure: 8/b1B1b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1", function () {
            game.load_fen('8/b1B1b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1');
            expect(game.insufficient_material()).toBe(false);
            expect(game.in_draw()).toBe(false);
        });
        it("Failure: 8/bB2b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1", function () {
            game.load_fen('8/bB2b1B1/1b1B1b1B/8/8/8/8/1k5K w - - 0 1');
            expect(game.insufficient_material()).toBe(false);
            expect(game.in_draw()).toBe(false);
            expect(game.game_over()).toBe(false);
        });
    });

    describe("Threefold Repetition/Draw Test", () => {
        let game: api.Raccoon;
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
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it(`Success: ${positions[0].fen} `, function () {
            game.load_fen(positions[0].fen);
            for (const move of positions[0].moves) {
                game.make_move(move);
            }
            expect(game.in_threefold_repetition()).toBe(true);
            expect(game.in_draw()).toBe(true);
        });
        it(`Success: ${positions[1].fen} `, function () {
            game.load_fen(positions[1].fen);
            for (const move of positions[1].moves) {
                game.make_move(move);
            }
            expect(game.in_threefold_repetition()).toBe(true);
            expect(game.in_draw()).toBe(true);
        });
    });

    describe("Get, Set, and Pop Piece Test", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it(`Success: SET, GET, POP`, function () {
            const piece = { type: "q", color: "w" } // white queen
            const sq = 'd1';
            expect(game.get_piece(sq)).toStrictEqual(piece); // white queen starts in d1 in standard chess
            expect(game.get_piece('a8')).toStrictEqual({ type: "r", color: "b" });

            game.clear_board(); // board is empty now
            expect(game.get_piece(sq)).toBe(null); // should be null since board is empty
            expect(game.set_piece(piece, sq)).toBe(true);
            expect(game.pop_piece(sq)).toStrictEqual(piece); // remove and return piece
            expect(game.get_piece(sq)).toBe(null); // should be null since board is empty
        });

        it('Failure: Set extra king', function () {
            expect(game.set_piece({ type: "k", color: "w" }, "e4")).toBe(false);
            expect(game.set_piece({ type: "k", color: "b" }, "e4")).toBe(false);
            expect(game.set_piece({ type: "k", color: "w" }, "e1")).toBe(true); // no error since it' the same square as old king
            expect(game.set_piece({ type: "k", color: "b" }, "e8")).toBe(true); // no error since it' the same square as old king
        });
        it('Failure: bad square, piece and color', function () {
            const sq = "hello world"
            expect(game.get_piece(sq)).toBe(null);
            expect(game.pop_piece(sq)).toBe(null);
            expect(game.get_piece(sq)).toBe(null);
            expect(game.set_piece({ type: "k", color: "w" }, sq)).toBe(false);
            expect(game.set_piece({ type: "x", color: "b" }, "e4")).toBe(false);// bad piece
            expect(game.set_piece({ type: "r", color: "t" }, "e4")).toBe(false);// bad color
        });
    });

    describe("MICS Test", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it('Get Turn', function () {
            expect(game.get_turn()).toBe('w')
            game.make_move('e4');
            expect(game.get_turn()).toBe('b')
            game.clear_board(); // clear board an no one has a turn
            expect(game.get_turn()).toBe('w')
        });

        it('Square color', function () {
            expect(game.square_color('h8')).toBe('dark');
            expect(game.square_color('a3')).toBe('dark');
            expect(game.square_color('e5')).toBe('dark');
            expect(game.square_color('g1')).toBe('dark');
            expect(game.square_color('h1')).toBe('light');
            expect(game.square_color('d1')).toBe('light');
            expect(game.square_color('g8')).toBe('light');
            expect(game.square_color('c8')).toBe('light');
            expect(game.square_color('c9')).toBe(null); // bad square
        });
    });

    describe("Reset and Clear board, and Move History Test", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it('Clear Board & Move History', function () {
            const empty_fen = "8/8/8/8/8/8/8/8 w - - 0 1";
            game.clear_board();
            expect(game.get_fen()).toBe(empty_fen);
            expect(game.move_history()).toStrictEqual([]);
        });
        it('Reset Board & Move History', function () {
            const intial_fen = "8/pp3p1k/2p2q1p/3r1P2/5R2/7P/P1P1QP2/7K b - - 2 30";
            const moves_str = ['Qe5', 'Qh5', 'Qf6', 'Qe2', 'Re5'];
            const moves_verbo: verbose_move_t[] = [
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
            game.load_fen(intial_fen);
            for (const mv of moves_str) {
                game.make_move(mv);
            }
            expect(game.move_history({ verbose: true })).toStrictEqual(moves_verbo)
            expect(game.move_history()).toStrictEqual(moves_str);
            game.reset_board();
            expect(game.get_fen()).toBe(intial_fen);
            expect(game.move_history()).toStrictEqual([]);
            expect(game.move_history({ verbose: true })).toStrictEqual([]);
        });
    });
    describe("Get Board Test", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it('Get Empty Board', function () {
            const position: position_t = {
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
                move_count: [0, 1],
                enpassant: "-",
                castling: [false, false, false, false]
            };
            game.clear_board();
            expect(game.get_board()).toStrictEqual(position);
        });
        it('Get Board from start_fen', function () {
            const P = (p: string, b: string): { type: string, color: string } => { return { type: p, color: b } };
            const position: position_t = {
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
                move_count: [2, 30],
                enpassant: "-",
                castling: [true, true, false, false]
            };
            game.load_fen('8/pp3p1k/2p2q1p/3r1P2/8/7P/P1P1QP2/R3K2R b KQ - 2 30');
            expect(game.get_board()).toStrictEqual(position);
        });

    });
});


describe("Evaluation Tests", () => {
    let game: api.Raccoon;
    beforeEach(() => {
        game = new api.Raccoon();
    });

    it("rc: the same evaluation for white and black", function () {
        const test_fen = '8/7K/8/8/1R6/k7/1R1p4/8 b - - 0 1';
        game.load_fen(test_fen);
        const eval_score = game.evaluate_board();
        game.flip_board();
        expect(game.evaluate_board()).toBe(eval_score);
    });
    it("rc0: the same evaluation for white and black", function () {
        game.load_fen(START_FEN);
        const eval_score = game.evaluate_board({ use_nnue: true });
        game.flip_board();
        expect(game.evaluate_board({ use_nnue: true })).toBe(eval_score);
    });
});