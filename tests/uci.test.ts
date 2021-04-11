import * as util_ from '../rcsigma/util'
import * as bitboard_ from '../rcsigma/game/bitboard'
import * as board_ from '../rcsigma/game/board'
import * as search_ from '../rcsigma/search/search'
import * as uci_ from '../rcsigma/ui/uci/uci'

const getInfo = (): search_.info_t => {
    const info: search_.info_t = {} as search_.info_t;

    info.useBook = false;
    info.analyzingMode = false;
    info.opponent = "Guest";
    info.multiPV = 1;
    info.bookFile = "raccoon.bin";
    info.searchInitialized = false;

    return info;
}

const log = console.log;

describe("UCI Initialization Test", () => {
    beforeEach(() => {
        util_.initUtil();
        bitboard_.initBitBoard();
        console.log = jest.fn();
    });
    afterAll(() => {
        console.log = log;
    });

    it("unknown command", function () {
        uci_.uciParser("chess960", board_.clearBoard(), getInfo(), console.log);
        expect(console.log).toHaveBeenCalledWith('Unknown command chess960');
    });
    it("isready", function () {
        uci_.uciParser("isready", board_.clearBoard(), getInfo(), console.log);
        expect(console.log).toHaveBeenCalledWith('readyok');
    });
    it("uci", function () {
        const info: search_.info_t = getInfo();
        uci_.uciParser("uci", board_.clearBoard(), info, console.log);

        expect(console.log).toHaveBeenCalledWith(`id name ${util_.NAME} ${util_.VERSION}`);
        expect(console.log).toHaveBeenCalledWith(`id author ${util_.AUTHOR}`);
        expect(console.log).toHaveBeenCalledWith(`option name MultiPV type spin default ${info.multiPV} min 1 max 3`);
        expect(console.log).toHaveBeenCalledWith(`option name UCI_AnalyseMode type check default ${String(info.analyzingMode)}`);
        expect(console.log).toHaveBeenCalledWith(`option name UCI_Opponent type string default ${info.opponent}`);
        expect(console.log).toHaveBeenCalledWith(`option name Ponder type check default ${String(info.ponder)}`);
        expect(console.log).toHaveBeenCalledWith(`option name UseBook type check default ${String(info.useBook)}`);
        expect(console.log).toHaveBeenCalledWith(`option name BookFile type string default ${String(info.bookFile)}`);
        expect(console.log).toHaveBeenCalledWith('uciok');
    });
    it("ucinewgame", function () {
        const info: search_.info_t = getInfo();
        expect(info.searchInitialized).toBe(false);
        uci_.uciParser("ucinewgame", board_.clearBoard(), info, console.log);
        expect(info.searchInitialized).toBe(true);
    });
    it("ponderhit", function () {
        const info: search_.info_t = getInfo();
        info.uciPonderHit = false;
        uci_.uciParser("ponderhit", board_.clearBoard(), info, console.log);
        expect(info.uciPonderHit).toBe(true);
    });
    it("stop", function () {
        const info: search_.info_t = getInfo();
        info.uciStop = false;
        uci_.uciParser("stop", board_.clearBoard(), info, console.log);
        expect(info.uciStop).toBe(true);
    });
    it("quit", function () {
        const info: search_.info_t = getInfo();
        info.uciQuit = false;
        uci_.uciParser("quit", board_.clearBoard(), info, console.log);
        expect(info.uciQuit).toBe(true);
    });

});


describe("UCI setoption name[value] Test", () => {
    let info: search_.info_t;
    beforeEach(() => {
        util_.initUtil();
        bitboard_.initBitBoard();
        console.log = jest.fn();
        info = getInfo();
    });
    afterAll(() => {
        console.log = log;
    });


    it("MultiPV", function () {
        uci_.uciParser("setoption name MultiPV value 23", board_.clearBoard(), info, console.log);
        expect(info.multiPV).toBe(23);
    });
    it("UCI_AnalyseMode", function () {
        uci_.uciParser("setoption name UCI_AnalyseMode value true", board_.clearBoard(), info, console.log);
        expect(info.analyzingMode).toBe(true);
    });
    it("UCI_Opponent", function () {
        uci_.uciParser("setoption name UCI_Opponent value GMMagnus", board_.clearBoard(), info, console.log);
        expect(info.opponent).toBe("GMMagnus");
    });
    it("UseBook", function () {
        uci_.uciParser("setoption name UseBook value true", board_.clearBoard(), info, console.log);
        expect(info.useBook).toBe(true);
    });
    it("BookFile", function () {
        uci_.uciParser("setoption name BookFile value testing.bin", board_.clearBoard(), info, console.log);
        expect(info.bookFile).toBe("testing.bin");
    });
    it("UnknownName", function () {
        uci_.uciParser("setoption name UnknownName value true", board_.clearBoard(), info, console.log);
        expect(console.log).toHaveBeenCalledWith("Unknown setoption command: setoption name UnknownName value true");
    });
});

describe("position [fen  | startpos ]  moves  .... Test", () => {
    let position: board_.board_t;

    beforeEach(() => {
        util_.initUtil();
        bitboard_.initBitBoard();
        position = board_.clearBoard();
        console.log = jest.fn();
    });
    afterAll(() => {
        console.log = log;
    });
    it("startpos with no moves", function () {
        uci_.uciParser("position startpos moves", position, getInfo(), console.log);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log);
        expect(console.log).toHaveBeenCalledWith(util_.START_FEN);
    });

    it("startpos with moves", function () {
        uci_.uciParser("position startpos moves e2e4 e7e5 b1c3 d7d5 e4d5 c7c5", position, getInfo(), console.log);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log);
        expect(console.log).toHaveBeenCalledWith("rnbqkbnr/pp3ppp/8/2pPp3/8/2N5/PPPP1PPP/R1BQKBNR w KQkq c6 0 4");
    });


    it("fen with no moves", function () {
        uci_.uciParser(`position fen ${util_.START_FEN} moves`, position, getInfo(), console.log);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log);
        expect(console.log).toHaveBeenCalledWith(util_.START_FEN);
    });
    it("fen with moves", function () {
        uci_.uciParser(`position fen ${util_.START_FEN} moves e2e4 e7e5 b1c3 d7d5 e4d5 c7c5`, position, getInfo(), console.log);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log);
        expect(console.log).toHaveBeenCalledWith("rnbqkbnr/pp3ppp/8/2pPp3/8/2N5/PPPP1PPP/R1BQKBNR w KQkq c6 0 4");
    });
});

describe("go Test", () => {
    let info: search_.info_t;

    beforeEach(() => {
        util_.initUtil();
        bitboard_.initBitBoard();
        info = getInfo();
        info.searchInitialized = true;
    });

    it("searchmoves ...", function () {
        info.searchMoves = [];
        uci_.uciParser("go infinite searchmoves e2e4 d2d4", board_.clearBoard(), info, console.log);//have moves
        expect(info.searchMoves.sort()).toStrictEqual(['e2e4', 'd2d4'].sort());
    });

    it("ponder", function () {
        info.ponder = false;
        uci_.uciParser("go ponder", board_.clearBoard(), info, console.log);//EMPTY
        expect(info.ponder).toBe(true);
    });
    it("limitedBySelf Test", function () {
        const position = board_.clearBoard();

        info.limitedBySelf = false;
        info.uciLevel = {
            startTime: 0,
            inc: -1,
            mtg: -1,
            time: -1,
        }

        //wtime and winc
        position.turn = board_.Colors.WHITE;
        uci_.uciParser("go wtime 122000 btime 120000 winc 2000 binc 2000 movestogo 40", position, info, console.log);
        expect(info.uciLevel.time).toBe(122000);
        expect(info.uciLevel.inc).toBe(2000);
        expect(info.limitedBySelf).toBe(true);
        expect(info.uciLevel.mtg).toBe(40);

        //btime and binc
        position.turn = board_.Colors.BLACK;
        uci_.uciParser("go wtime 122000 btime 121111 winc 2000 binc 2898 movestogo 21", position, info, console.log);
        expect(info.uciLevel.time).toBe(121111);
        expect(info.uciLevel.inc).toBe(2898);
        expect(info.limitedBySelf).toBe(true);
        expect(info.uciLevel.mtg).toBe(21);

    });
    it("limitedByDepth Test", function () {
        info.limitedByDepth = false;
        info.allotment = -1;

        // depth
        uci_.uciParser("go depth 33", board_.clearBoard(), info, console.log);
        expect(info.limitedByDepth).toBe(true);
        expect(info.allotment).toBe(33);

        // mate
        uci_.uciParser("go mate 7", board_.clearBoard(), info, console.log);
        expect(info.limitedByDepth).toBe(true);
        expect(info.allotment).toBe(13); //2 * mate - 1

    });

    it("limitedByNodes Test", function () {
        info.limitedByNodes = false;
        info.allotment = -1;

        uci_.uciParser("go nodes 69", board_.clearBoard(), info, console.log);
        expect(info.limitedByNodes).toBe(true);
        expect(info.allotment).toBe(69);
    });

    it("limitedByNone Test", function () {
        info.limitedByNone = false;
        info.allotment = -1;

        uci_.uciParser("go infinite", board_.clearBoard(), info, console.log);
        expect(info.limitedByNone).toBe(true);
        expect(info.allotment).toBe(-1);
    });

    it("limitedByTime Test", function () {
        info.limitedByTime = false;
        info.allotment = -1;

        uci_.uciParser("go movetime 419", board_.clearBoard(), info, console.log);
        expect(info.limitedByTime).toBe(true);
        expect(info.allotment).toBe(419);
    });

});
