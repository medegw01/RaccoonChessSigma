// -------------------------------------------------------------------------------------------------
// Copyright (c) 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../rcsigma/util'
import * as bitboard_ from '../rcsigma/game/bitboard'
import * as board_ from '../rcsigma/game/board'
import * as search_ from '../rcsigma/search/search'
import * as uci_ from '../rcsigma/ui/uci/uci'
import * as thread_ from '../rcsigma/search/thread'

const getInfo = (): search_.info_t => {
    const info: search_.info_t = {} as search_.info_t;

    info.useBook = false;
    info.analyzingMode = false;
    info.opponent = "Guest";
    info.multiPV = 1;
    info.bookFile = "raccoon.bin";
    info.evalFile = "raccoon.nuue";
    info.searchInitialized = false;
    info.allowPonder = true;
    info.SIGNAL = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
    info.hashSize = 32;
    info.nThreads = 1;
    info.moveOverhead = 19;

    return info;
}

const log = console.log;

describe("UCI Initialization Test", () => {
    const threads = thread_.create(1);

    beforeEach(() => {
        util_.init();
        bitboard_.init();
        console.log = jest.fn();
    });
    afterAll(() => {
        console.log = log;
    });

    it("unknown command", function () {
        uci_.uciParser("chess960", board_.clearBoard(), getInfo(), console.log, threads);
        expect(console.log).toHaveBeenCalledWith('error: unknown command chess960');
    });
    it("isready", function () {
        uci_.uciParser("isready", board_.clearBoard(), getInfo(), console.log, threads);
        expect(console.log).toHaveBeenCalledWith('readyok');
    });
    it("uci", function () {
        const info = getInfo();
        uci_.uciParser("uci", board_.clearBoard(), info, console.log, threads);

        expect(console.log).toHaveBeenCalledWith(`id name ${util_.NAME} ${util_.VERSION}`);
        expect(console.log).toHaveBeenCalledWith(`id author ${util_.AUTHOR}`);
        expect(console.log).toHaveBeenCalledWith(`option name MultiPV type spin default ${info.multiPV} min 1 max 256`);
        expect(console.log).toHaveBeenCalledWith(`option name MoveOverhead type spin default ${info.moveOverhead} min 0 max 1000`);
        expect(console.log).toHaveBeenCalledWith(`option name Hash type spin default ${info.hashSize} min 1 max 128`);
        expect(console.log).toHaveBeenCalledWith(`option name Threads type spin default ${info.nThreads} min 1 max 2048`);
        expect(console.log).toHaveBeenCalledWith(`option name UCI_AnalyseMode type check default ${String(info.analyzingMode)}`);
        expect(console.log).toHaveBeenCalledWith(`option name UCI_Opponent type string default ${info.opponent}`);
        expect(console.log).toHaveBeenCalledWith(`option name Ponder type check default ${String(info.allowPonder)}`);
        expect(console.log).toHaveBeenCalledWith(`option name UseBook type check default ${String(info.useBook)}`);
        expect(console.log).toHaveBeenCalledWith(`option name UseNNUE type check default ${String(info.useNNUE)}`);
        expect(console.log).toHaveBeenCalledWith(`option name BookFile type string default ${String(info.bookFile)}`);
        expect(console.log).toHaveBeenCalledWith(`option name EvalFile type string default ${String(info.evalFile)}`);
        expect(console.log).toHaveBeenCalledWith('uciok');
    });
    it("ucinewgame", function () {
        const info = getInfo();
        expect(info.searchInitialized).toBe(false);
        uci_.uciParser("ucinewgame", board_.clearBoard(), info, console.log, threads);
        expect(info.searchInitialized).toBe(true);
    });
    it("ponderhit", function () {
        const info = getInfo();
        const signal = new Int32Array(info.SIGNAL);

        signal[1] = 0;
        uci_.uciParser("ponderhit", board_.clearBoard(), info, console.log, threads);
        expect(console.log).toHaveBeenCalledWith("error: raccoon not pondering");

        signal[1] = 1;
        uci_.uciParser("ponderhit", board_.clearBoard(), info, console.log, threads);
        expect(signal[1]).toBe(0);
    });
    it("stop", function () {
        const info = getInfo();
        const signal = new Int32Array(info.SIGNAL)
        signal[0] = 0;
        uci_.uciParser("stop", board_.clearBoard(), info, console.log, threads);
        expect(signal[0]).toBe(1);
    });
    it("quit", function () {
        const info = getInfo();
        info.uciQuit = false;
        uci_.uciParser("quit", board_.clearBoard(), info, console.log, threads);
        expect(info.uciQuit).toBe(true);
    });

});


describe("UCI setoption name[value] Test", () => {
    let info: search_.info_t;
    const threads = thread_.create(1);

    beforeEach(() => {
        util_.init();
        bitboard_.init();
        console.log = jest.fn();
        info = getInfo();
    });
    afterAll(() => {
        console.log = log;
    });


    it("MultiPV", function () {
        uci_.uciParser("setoption name MultiPV value 23", board_.clearBoard(), info, console.log, threads);
        expect(info.multiPV).toBe(23);
    });
    it("UCI_AnalyseMode", function () {
        uci_.uciParser("setoption name UCI_AnalyseMode value true", board_.clearBoard(), info, console.log, threads);
        expect(info.analyzingMode).toBe(true);
    });
    it("UCI_Opponent", function () {
        uci_.uciParser("setoption name UCI_Opponent value GMMagnus", board_.clearBoard(), info, console.log, threads);
        expect(info.opponent).toBe("GMMagnus");
    });
    it("UseBook", function () {
        uci_.uciParser("setoption name UseBook value true", board_.clearBoard(), info, console.log, threads);
        expect(info.useBook).toBe(true);
    });
    it("BookFile", function () {
        uci_.uciParser("setoption name BookFile value testing.bin", board_.clearBoard(), info, console.log, threads);
        expect(info.bookFile).toBe("testing.bin");
    });
    it("Hash", function () {
        uci_.uciParser("setoption name Hash value 64", board_.clearBoard(), info, console.log, threads);
        expect(info.hashSize).toBe(64);
    });
    it("MoveOverhead", function () {
        uci_.uciParser("setoption name MoveOverhead value 420", board_.clearBoard(), info, console.log, threads);
        expect(info.moveOverhead).toBe(420);
    });
    it("Threads", function () {
        uci_.uciParser("setoption name Threads value 32", board_.clearBoard(), info, console.log, threads);
        expect(info.nThreads).toBe(32);
    });
    it("Ponder", function () {
        uci_.uciParser("setoption name Ponder value false", board_.clearBoard(), info, console.log, threads);
        expect(info.allowPonder).toBe(false);
    });
    it("UseNNUE", function () {
        uci_.uciParser("setoption name UseNNUE value false", board_.clearBoard(), info, console.log, threads);
        expect(info.useNNUE).toBe(false);
    });
    it("EvalFile", function () {
        uci_.uciParser("setoption name EvalFile value testing.nn", board_.clearBoard(), info, console.log, threads);
        expect(info.evalFile).toBe("testing.nn");
    });
    it("UnknownName", function () {
        uci_.uciParser("setoption name UnknownName value true", board_.clearBoard(), info, console.log, threads);
        expect(console.log).toHaveBeenCalledWith("error: unknown setoption command: setoption name UnknownName value true");
    });
});

describe("position [fen  | startpos ]  moves  .... Test", () => {
    let position: board_.board_t;
    const threads = thread_.create(1);

    beforeEach(() => {
        util_.init();
        bitboard_.init();
        position = board_.clearBoard();
        console.log = jest.fn();
    });
    afterAll(() => {
        console.log = log;
    });
    it("startpos with no moves", function () {
        uci_.uciParser("position startpos moves", position, getInfo(), console.log, threads);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log, threads);
        expect(console.log).toHaveBeenCalledWith(util_.START_FEN);
    });

    it("startpos with moves", function () {
        uci_.uciParser("position startpos moves e2e4 e7e5 b1c3 d7d5 e4d5 c7c5", position, getInfo(), console.log, threads);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log, threads);
        expect(console.log).toHaveBeenCalledWith("rnbqkbnr/pp3ppp/8/2pPp3/8/2N5/PPPP1PPP/R1BQKBNR w KQkq c6 0 4");
    });


    it("fen with no moves", function () {
        uci_.uciParser(`position fen ${util_.START_FEN} moves`, position, getInfo(), console.log, threads);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log, threads);
        expect(console.log).toHaveBeenCalledWith(util_.START_FEN);
    });
    it("fen with moves", function () {
        uci_.uciParser(`position fen ${util_.START_FEN} moves e2e4 e7e5 b1c3 d7d5 e4d5 c7c5`, position, getInfo(), console.log, threads);
        expect(console.log).not.toHaveBeenCalled();

        uci_.uciParser("fen", position, getInfo(), console.log, threads);
        expect(console.log).toHaveBeenCalledWith("rnbqkbnr/pp3ppp/8/2pPp3/8/2N5/PPPP1PPP/R1BQKBNR w KQkq c6 0 4");
    });
});

describe("go Test", () => {
    let info: search_.info_t;
    const threads = thread_.create(1);


    beforeEach(() => {
        util_.init();
        bitboard_.init();
        info = getInfo();
        info.searchInitialized = true;
        console.log = jest.fn();
    });
    afterAll(() => {
        console.log = log;
    });
    it("searchmoves ...", function () {
        info.searchMoves = [];
        uci_.uciParser("go infinite searchmoves e2e4 d2d4", board_.clearBoard(), info, console.log, threads);//have moves
        expect(info.searchMovesStr.sort()).toStrictEqual(['e2e4', 'd2d4'].sort());
    });

    it("ponder", function () {
        const signal = new Int32Array(info.SIGNAL)
        info.allowPonder = false;
        uci_.uciParser("go ponder", board_.clearBoard(), info, console.log, threads);
        expect(console.log).toHaveBeenCalledWith("error: ponder was disabled");

        info.allowPonder = true;
        signal[1] = 0;
        uci_.uciParser("go ponder", board_.clearBoard(), info, console.log, threads);
        expect(signal[1]).toBe(1);
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
        position.turn = util_.Colors.WHITE;
        uci_.uciParser("go wtime 122000 btime 120000 winc 2000 binc 2000 movestogo 40", position, info, console.log, threads);
        expect(info.uciLevel.time).toBe(122000);
        expect(info.uciLevel.inc).toBe(2000);
        expect(info.limitedBySelf).toBe(true);
        expect(info.uciLevel.mtg).toBe(40);

        //btime and binc
        position.turn = util_.Colors.BLACK;
        uci_.uciParser("go wtime 122000 btime 121111 winc 2000 binc 2898 movestogo 21", position, info, console.log, threads);
        expect(info.uciLevel.time).toBe(121111);
        expect(info.uciLevel.inc).toBe(2898);
        expect(info.limitedBySelf).toBe(true);
        expect(info.uciLevel.mtg).toBe(21);

    });
    it("limitedByDepth Test", function () {
        info.limitedByDepth = false;
        info.depthLimit = -1;

        // depth
        uci_.uciParser("go depth 33", board_.clearBoard(), info, console.log, threads);
        expect(info.limitedByDepth).toBe(true);
        expect(info.depthLimit).toBe(33);

        // mate
        uci_.uciParser("go mate 7", board_.clearBoard(), info, console.log, threads);
        expect(info.limitedByDepth).toBe(true);
        expect(info.depthLimit).toBe(13); //2 * mate - 1

    });

    it("limitedByNodes Test", function () {
        info.limitedByNodes = false;
        info.nodeLimit = -1;

        uci_.uciParser("go nodes 69", board_.clearBoard(), info, console.log, threads);
        expect(info.limitedByNodes).toBe(true);
        expect(info.nodeLimit).toBe(69);
    });

    it("limitedByNone Test", function () {
        info.limitedByNone = false;

        uci_.uciParser("go infinite", board_.clearBoard(), info, console.log, threads);
        expect(info.limitedByNone).toBe(true);
    });

    it("limitedByTime Test", function () {
        info.limitedByTime = false;
        info.timeLimit = -1;

        uci_.uciParser("go movetime 419", board_.clearBoard(), info, console.log, threads);
        expect(info.limitedByTime).toBe(true);
        expect(info.timeLimit).toBe(419);
    });

});
