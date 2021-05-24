// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as api_ from '../rcsigma/ui/api/api';
import * as util_ from '../rcsigma/util';

describe("Poly Keys Test", function () {
    const game = new api_.Raccoon();
    beforeEach(() => {
        game.clearBoard()
    });

    it("starting position", function () {
        game.loadFEN(util_.START_FEN);
        const by_fen = game.getPolyglot();
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x463b96181691fc9c").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));


    });
    it("position after e2e4", function () {
        game.loadFEN("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['e2e4'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x823c9b50fd114196").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));

    });
    it("position after e2e4 d7d5", function () {
        game.loadFEN("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['e2e4', 'd7d5'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x0756b94461c50fb0").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));

    });
    it("position after e2e4 d7d5 e4e5", function () {
        game.loadFEN("rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['e2e4', 'd7d5', 'e4e5'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x662fafb965db29d4").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));
    });
    it("position after e2e4 d7d5 e4e5 f7f5", function () {
        game.loadFEN("rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['e2e4', 'd7d5', 'e4e5', 'f7f5'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x22a48b5a8e47ff78").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));
    });
    it("position after e2e4 d7d5 e4e5 f7f5 e1e2", function () {
        game.loadFEN("rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPPKPPP/RNBQ1BNR b kq - 0 3");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x652a607ca3f242c1").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));

    });
    it("position after e2e4 d7d5 e4e5 f7f5 e1e2 e8f7", function () {
        game.loadFEN("rnbq1bnr/ppp1pkpp/8/3pPp2/8/8/PPPPKPPP/RNBQ1BNR w - - 0 4");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2', 'e8f7'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x00fdd303c946bdd9").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));

    });
    it("position after a2a4 b7b5 h2h4 b5b4 c2c4", function () {
        game.loadFEN("rnbqkbnr/p1pppppp/8/8/PpP4P/8/1P1PPPP1/RNBQKBNR b KQkq c3 0 3");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x3c8123ea7b067637").toString(16));
        expect(by_fen.toString(16)).toBe(byMove.toString(16));
    });
    it("position after a2a4 b7b5 h2h4 b5b4 c2c4 b4c3 a1a3", function () {
        game.loadFEN("rnbqkbnr/p1pppppp/8/8/P6P/R1p5/1P1PPPP1/1NBQKBNR b Kkq - 0 4");
        const by_fen = game.getPolyglot();

        game.loadFEN(util_.START_FEN);
        const moves = ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4', 'b4c3', 'a1a3'];
        moves.forEach((mv: string) => { game.makeMove(mv) });
        const byMove = game.getPolyglot(true);

        expect(by_fen.toString(16)).toBe(BigInt("0x5c3f9b829b279560").toString(16));
        expect(byMove.toString(16)).toBe(by_fen.toString(16));
    });
});