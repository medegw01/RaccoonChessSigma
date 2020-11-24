import * as api from '../rcsigma/ui/api/api'

describe("Perft", function () {
    let perfts = [
        {
            fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
            depth: 5, nodes: BigInt("15833292")
        },
        {
            fen: '8/PPP4k/8/8/8/8/4Kppp/8 w - - 0 1',
            depth: 4, nodes: BigInt("89363")
        },
        {
            fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
            depth: 4, nodes: BigInt("43238")
        },
        {
            fen: 'rnbqkbnr/p3pppp/2p5/1pPp4/3P4/8/PP2PPPP/RNBQKBNR w KQkq b6 0 4',
            depth: 3, nodes: BigInt("23509")
        },
    ];

    perfts.forEach(function (perft) {
        let game = new api.Raccoon();
        game.load(perft.fen);

        it(perft.fen, function () {
            let nodes = game.perft(perft.depth);
            expect(nodes).toBe(perft.nodes);
        });

    });
});

describe("Load", function () {
    let positions = [
        { fen: '8/8/8/8/8/8/8/8 w - - 0 1', result: true },
        { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', result: true },
        { fen: '1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2', result: true },
        { fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', result: true },

        // incomplete FEN string 
        { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBN w KQkq - 0 1', result: false },

        // Illegal character 9
        { fen: 'rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', result: false },

        // Illegal character X 
        { fen: '1nbqkbn1/pppp1ppX/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 1 2', result: false },

        // Half move cannot be a negative integer
        { fen: '1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - -1 2', result: false },

        // Full move must be greater than 0 
        { fen: '1nbqkbn1/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/1NBQKBN1 b - - 10 0', result: false },
    ];
    positions.forEach(function (position) {
        it(position.fen + ' (' + position.result + ')', function () {
            let game = new api.Raccoon();
            game.load(position.fen);
            expect(game.fen() === position.fen === position.result).toBe(true);
        });

    });

});

describe("Poly Keys", function () {
    const start_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    let positions = [
        {
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            result: BigInt("0x463b96181691fc9c"),
            moves: []
        },
        {
            fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
            result: BigInt("0x823c9b50fd114196"),
            moves: ['e2e4']
        },
        {
            fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
            result: BigInt("0x0756b94461c50fb0"),
            moves: ['e2e4', 'd7d5']
        },
        {
            fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2',
            result: BigInt("0x662fafb965db29d4"),
            moves: ['e2e4', 'd7d5', 'e4e5']
        },
        {
            fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3',
            result: BigInt("0x22a48b5a8e47ff78"),
            moves: ['e2e4', 'd7d5', 'e4e5', 'f7f5']
        },
        {
            fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPPKPPP/RNBQ1BNR b kq - 0 3',
            result: BigInt("0x652a607ca3f242c1"),
            moves: ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2']
        },
        {
            fen: 'rnbq1bnr/ppp1pkpp/8/3pPp2/8/8/PPPPKPPP/RNBQ1BNR w - - 0 4',
            result: BigInt("0x00fdd303c946bdd9"),
            moves: ['e2e4', 'd7d5', 'e4e5', 'f7f5', 'e1e2', 'e8f7']
        },
        {
            fen: 'rnbqkbnr/p1pppppp/8/8/PpP4P/8/1P1PPPP1/RNBQKBNR b KQkq c3 0 3',
            result: BigInt("0x3c8123ea7b067637"),
            moves: ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4']
        },
        {
            fen: 'rnbqkbnr/p1pppppp/8/8/P6P/R1p5/1P1PPPP1/1NBQKBNR b Kkq - 0 4',
            result: BigInt("0x5c3f9b829b279560"),
            moves: ['a2a4', 'b7b5', 'h2h4', 'b5b4', 'c2c4', 'b4c3', 'a1a3']
        },
    ];
    positions.forEach(function (position) {
        let game = new api.Raccoon();
        it(position.fen, function () {
            game.load(position.fen);
            let by_fen = game.polyglot();
            game.load(start_fen);
            for (let mv of position.moves) {
                game.move(mv);
            }
            let by_move = game.polyglot(true);
            expect(by_fen).toBe(position.result);
            expect(by_move).toBe(by_fen);
        });
    });


});