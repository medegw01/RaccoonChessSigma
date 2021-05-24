// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as search_ from '../../search/search'
import * as thread_ from '../../search/thread'
import * as tb_ from '../../search/tbase'
import * as move_ from '../../game/move'

type stdoutFn_t = (msg: string) => void;

function getNumber(token: string, re: RegExp, dflt: number): number {
    const r = re.exec(token);
    return r ? +r[1] : dflt;
}

function uciPrint(info: search_.info_t, stdoutFn: stdoutFn_t): void {
    stdoutFn(`id name ${util_.NAME} ${util_.VERSION}`);
    stdoutFn(`id author ${util_.AUTHOR}`);
    //stdoutFn('option name OwnBook type check default ' + info.useBook);
    stdoutFn(`option name MultiPV type spin default ${info.multiPV} min 1 max 256`);
    stdoutFn(`option name MoveOverhead type spin default ${info.moveOverhead} min 0 max 1000`);
    stdoutFn(`option name Hash type spin default ${info.hashSize} min 1 max 128`);
    stdoutFn(`option name Threads type spin default ${info.nThreads} min 1 max 2048`);
    stdoutFn(`option name UCI_AnalyseMode type check default ${String(info.analyzingMode)}`);
    stdoutFn(`option name UCI_Opponent type string default ${info.opponent}`);
    stdoutFn(`option name Ponder type check default ${String(info.allowPonder)}`);
    stdoutFn(`option name UseBook type check default ${String(info.useBook)}`);
    stdoutFn(`option name UseNNUE type check default ${String(info.useNNUE)}`);
    stdoutFn(`option name BookFile type string default ${String(info.bookFile)}`);
    stdoutFn(`option name EvalFile type string default ${String(info.evalFile)}`);
    stdoutFn('uciok');
}
function uciGO(token: string, info: search_.info_t, turn: string, stdoutFn: stdoutFn_t,): boolean {
    if (!info.searchInitialized) return false;

    const sharedArray = new Int32Array(info.SIGNAL);
    sharedArray[1] = 0;

    const infinite = token.includes('infinite');

    const depth = getNumber(token, /depth (\d+)/, -1);
    const mate = getNumber(token, /mate (\d+)/, -1);
    const mtg = getNumber(token, /movestogo (\d+)/, -1);
    const node = getNumber(token, /nodes (\d+)/, -1);
    const time = turn === 'w' ? getNumber(token, /wtime (\d+)/, -1) : getNumber(token, /btime (\d+)/, -1);
    const inc = turn === 'w' ? getNumber(token, /winc (\d+)/, -1) : getNumber(token, /binc (\d+)/, -1);
    const movetime = getNumber(token, /movetime (\d+)/, -1);

    const r = /searchmoves\s*(.*)/.exec(token);
    info.searchMovesStr = r ? r[1].split(' ') : [];

    // Initialize limits for the search
    info.limitedByNone = infinite;
    info.limitedByTime = movetime != -1;
    info.limitedByDepth = depth != -1 || mate != -1;
    info.limitedByNodes = node != -1;
    info.limitedBySelf = !info.limitedByNone && !info.limitedByTime && !info.limitedByDepth && !info.limitedByNodes;
    info.limitedByMoves = info.searchMovesStr.length > 0;

    if (token.includes('ponder')) {
        if (!info.allowPonder) stdoutFn("error: ponder was disabled")
        else sharedArray[1] = 1;
    }
    if (info.limitedByDepth) info.allotment = (depth != -1) ? depth : 2 * mate - 1;
    else if (info.limitedByTime) info.allotment = movetime;
    else if (info.limitedByNodes) info.allotment = node;

    info.uciLevel = {
        startTime: util_.getTimeMs(),
        inc: inc,
        mtg: mtg,
        time: time,
    }

    return true;
}

function uciPosition(position: board_.board_t, fen: string, moves: string[]): void {
    board_.fenToBoard(fen, position);
    const thread = thread_.create(1);
    for (let i = 0; i < moves.length; i++) {
        if (!move_.makeMove(move_.smithToMove(moves[i], position), position, thread[0])) break;
    }
}

function uciSetOption(info: search_.info_t, threads: thread_.thread_t[], name: string, value: string, stdoutFn: stdoutFn_t): boolean {
    if (name === "UseBook") info.useBook = (value).includes('true');
    else if (name === "Ponder") info.allowPonder = (value).includes('true');
    else if (name === "MultiPV") info.multiPV = parseInt(value);
    else if (name === "UCI_AnalyseMode") info.analyzingMode = (value).includes('true');
    else if (name === "UCI_Opponent") info.opponent = value;
    else if (name === "EvalFile") info.evalFile = value;
    else if (name === "BookFile") info.bookFile = value;
    else if (name === "Hash") {
        info.hashSize = parseInt(value);
        tb_.resize(info.hashSize);
    }
    else if (name === "Threads") {
        threads.length = 0
        info.nThreads = parseInt(value);
        threads.push(...thread_.create(info.nThreads))

    }
    else if (name == "MoveOverhead") info.moveOverhead = parseInt(value);
    else if (name === "UseNNUE") {
        info.useNNUE = (value).includes('true');
    }
    else return false;
    stdoutFn(`info string set ${name} to ${value}`)
    return true;
}

function uciParser(data: string, position: board_.board_t, info: search_.info_t, stdoutFn: stdoutFn_t, threads: thread_.thread_t[]): boolean {
    /*
    |------------|-----------------------------------------------------------------------|
    |  Commands  | Response. * denotes that the command blocks until no longer searching |
    |------------|-----------------------------------------------------------------------|
    |        uci |           Outputs the engine name, authors, and all available options |
    |    isready | *           Responds with readyok when no longer searching a position |
    | ucinewgame | *  Resets the TT and any Hueristics to ensure determinism in searches |
    |  setoption | *     Sets a given option and reports that the option was set if done |
    |   position | *  Sets the board position via an optional FEN and optional move list |
    |         go | *       Searches the current position with the provided time controls |
    |  ponderhit |          Flags the search to indicate that the ponder move was played |
    |       stop |            Signals the search threads to finish and report a bestmove |
    |       quit |             Exits the engine and any searches by killing the UCI loop |
    |      fen   |                   Custom command to print FEN of the current position |
    |      print |          Custom command to print an ANSI view of the current position |
    |------------|-----------------------------------------------------------------------|
    */
    const sharedArray = new Int32Array(info.SIGNAL);
    let runSearch = false;

    (/^(.*?)\n?$/).exec(data);
    const token = RegExp.$1;

    if (token === "quit") info.uciQuit = true;
    else if (token === "stop") sharedArray[0] = 1, sharedArray[1] = 0;
    else if (token === "ponderhit") {
        if (!sharedArray[1]) stdoutFn("error: raccoon not pondering")
        else sharedArray[1] = 0;
    }
    else if (token === 'ucinewgame') {
        thread_.clear(threads);
        tb_.resize(info.hashSize);
        info.searchInitialized = true;
    }

    else if (token === "uci") uciPrint(info, stdoutFn);
    else if (token === "isready") stdoutFn('readyok');
    else if ((/^go /).exec(token)) runSearch = (uciGO(token, info, board_.getTurn(position), stdoutFn));
    else if ((/^position (?:(startpos)|fen (.*?))\s*(?:moves\s*(.*))?$/).exec(token)) {
        const fen = (RegExp.$1 === 'startpos') ? util_.START_FEN : RegExp.$2;
        const moves = (RegExp.$3) ? (RegExp.$3).split(' ') : [];
        uciPosition(position, fen, moves);
    }
    else if ((/setoption name (\S+) value\s*(.*)/).exec(token)) {
        if (!uciSetOption(info, threads, RegExp.$1, RegExp.$2, stdoutFn)) stdoutFn('error: unknown setoption command: ' + token);
    }
    /* 
    Additional custom non-UCI commands, mainly for debugging Debugging/Testing
    DO NOT USE for search, or in UCI GUI
     */
    else if (token === "print") stdoutFn(board_.boardToANSI(position, util_.pieceAnsi.white, util_.pieceAnsi.black, util_.squareAnsi.light, util_.squareAnsi.dark, true));
    else if (token === 'fen') stdoutFn(board_.boardToFen(position));
    else stdoutFn('error: unknown command ' + token);

    return runSearch && !info.uciQuit;
}

export {
    uciParser,
    stdoutFn_t,
}