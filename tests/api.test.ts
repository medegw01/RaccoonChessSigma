import * as api from '../rcsigma/ui/api/api'

describe("Game Tests", () => {
    describe("Perft", () => {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });

        it("Fen: start_fen; depth: 1", function () {
            game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const nodes = game.perft(1);
            expect(nodes).toBe(BigInt("20"));
        });
        it('Fen: start_fen; depth: 2', function () {
            game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const nodes = game.perft(2);
            expect(nodes).toBe(BigInt("400"));
        });
        it('Fen: start_fen; depth: 4', function () {
            game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            const nodes = game.perft(4);
            expect(nodes).toBe(BigInt("197281"));
        });
        it('rnbqkbnr/p3pppp/2p5/1pPp4/3P4/8/PP2PPPP/RNBQKBNR w KQkq b6 0 4', function () {
            game.load('rnbqkbnr/p3pppp/2p5/1pPp4/3P4/8/PP2PPPP/RNBQKBNR w KQkq b6 0 4');
            const nodes = game.perft(3);
            expect(nodes).toBe(BigInt("23509"));
        });
        it('8/PPP4k/8/8/8/8/4Kppp/8 w - - 0 1', function () {
            game.load('8/PPP4k/8/8/8/8/4Kppp/8 w - - 0 1');
            const nodes = game.perft(4);
            expect(nodes).toBe(BigInt("89363"));
        });
        it('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', function () {
            game.load('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
            const nodes = game.perft(4);
            expect(nodes).toBe(BigInt("43238"));
        });
        it('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', function () {
            game.load('r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1');
            const nodes = game.perft(5);
            expect(nodes).toBe(BigInt("15833292"));
        });
    });
    describe("Poly Keys", function () {
        let game: api.Raccoon;
        const start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        beforeEach(() => {
            game = new api.Raccoon();
        });
        it("Fen: start_fen; moves: []", function () {
            game.load(start_fen);
            const by_fen = game.polyglot();
            game.load(start_fen);
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x463b96181691fc9c"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4']", function () {
            game.load("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1");
            const by_fen = game.polyglot();
            const moves = ['e2e4'];
            game.load(start_fen);
            for (const mv of moves) {
                game.move(mv);
            }
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x823c9b50fd114196"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5']", function () {
            game.load("rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2");
            const by_fen = game.polyglot();
            const moves = ['e2e4', 'd7d5'];
            game.load(start_fen);
            for (const mv of moves) {
                game.move(mv);
            }
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x0756b94461c50fb0"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5', 'e4e5']", function () {
            game.load("rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2");
            const by_fen = game.polyglot();
            const moves = ['e2e4', 'd7d5', 'e4e5'];
            game.load(start_fen);
            for (const mv of moves) {
                game.move(mv);
            }
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x662fafb965db29d4"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5', 'e4e5', 'f7f5']", function () {
            game.load("rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3");
            const by_fen = game.polyglot();
            const moves = ['e2e4', 'd7d5', 'e4e5', 'f7f5'];
            game.load(start_fen);
            for (const mv of moves) {
                game.move(mv);
            }
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x22a48b5a8e47ff78"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2', 'e8f7']", function () {
            game.load("rnbq1bnr/ppp1pkpp/8/3pPp2/8/8/PPPPKPPP/RNBQ1BNR w - - 0 4");
            const by_fen = game.polyglot();
            const moves = ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2', 'e8f7'];
            game.load(start_fen);
            for (const mv of moves) {
                game.move(mv);
            }
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x00fdd303c946bdd9"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4']", function () {
            game.load("rnbqkbnr/p1pppppp/8/8/PpP4P/8/1P1PPPP1/RNBQKBNR b KQkq c3 0 3");
            const by_fen = game.polyglot();
            const moves = ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4'];
            game.load(start_fen);
            for (const mv of moves) {
                game.move(mv);
            }
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x3c8123ea7b067637"));
            expect(by_move).toBe(by_fen);
        });
        it("Fen: start_fen; moves: ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4', 'b4c3', 'a1a3']", function () {
            game.load("rnbqkbnr/p1pppppp/8/8/P6P/R1p5/1P1PPPP1/1NBQKBNR b Kkq - 0 4");
            const by_fen = game.polyglot();
            const moves = ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4', 'b4c3', 'a1a3'];
            game.load(start_fen);
            for (const mv of moves) {
                game.move(mv);
            }
            const by_move = game.polyglot(true);
            expect(by_fen).toBe(BigInt("0x5c3f9b829b279560"));
            expect(by_move).toBe(by_fen);
        });
    });
    describe("Load", function () {
        let game: api.Raccoon;
        beforeEach(() => {
            game = new api.Raccoon();
        });
        it("Failure: Empty Board; fen: 8/8/8/8/8/8/8/8 w - - 0 1", function () {
            const result = game.load('8/8/8/8/8/8/8/8 w - - 0 1');
            expect(result.value).toBe(false)
            expect(game.fen()).toBe('8/8/8/8/8/8/8/8 w - - 0 1');
        });
        it("Success: No Enpass; fen: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function () {
            const result = game.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(result.value).toBe(true)
            expect(game.fen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        });
        it("Success: No Castling; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2", function () {
            const result = game.load('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2');
            expect(result.value).toBe(true)
            expect(game.fen()).toBe('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2');
        });
        it("Success: With EnPass; fen: rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", function () {
            const result = game.load('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
            expect(result.value).toBe(true)
            expect(game.fen()).toBe('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        });
        it("Failure: Empty fen provided; fen: ", function () {
            const result = game.load("");
            expect(result.value).toBe(false)
            expect(result.error.includes("Empty fen provided")).toBe(true)
        });
        it("Failure: Illegal character 9; fen: rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", function () {
            const result = game.load('rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
            expect(result.value).toBe(false)
            expect(result.error.includes("Illegal character 9")).toBe(true)
        });
        it("Failure: Half move cannot be a negative integer; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - -1 2", function () {
            const result = game.load('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - -1 2');
            expect(result.value).toBe(false)
            expect(result.error.includes("Half move cannot be")).toBe(true);
        });
        it("Failure: Full move must be greater than 0; fen: 1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 10 0", function () {
            const result = game.load('1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 10 0');
            expect(result.value).toBe(false)
            expect(result.error.includes("Full move must be")).toBe(true);
        });

    });
});