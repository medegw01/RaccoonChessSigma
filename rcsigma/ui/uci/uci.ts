// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as search_ from '../../search/search'
import * as move_ from '../../game/move'

type stdoutFn_t = (msg: string) => void;
type uciReport_t = {
    runSearch: boolean;
    runSetOption: boolean;
};


function getNumber(token: string, re: RegExp, dflt: number): number {
    const r = re.exec(token);
    return r ? +r[1] : dflt;
}

function uciPrint(info: search_.info_t, stdoutFn: stdoutFn_t): void {
    stdoutFn(`id name ${util_.NAME} ${util_.VERSION}`);
    stdoutFn(`id author ${util_.AUTHOR}`);
    //stdoutFn('option name OwnBook type check default ' + info.useBook);
    stdoutFn(`option name MultiPV type spin default ${info.multiPV} min 1 max 3`);
    stdoutFn(`option name UCI_AnalyseMode type check default ${String(info.analyzingMode)}`);
    stdoutFn(`option name UCI_Opponent type string default ${info.opponent}`);
    stdoutFn(`option name Ponder type check default ${String(info.ponder)}`);
    stdoutFn(`option name UseBook type check default ${String(info.useBook)}`);
    stdoutFn(`option name BookFile type string default ${String(info.bookFile)}`);
    stdoutFn('uciok');
}
function uciGO(token: string, info: search_.info_t, turn: string): boolean {
    if (!info.searchInitialized) return false;

    // parse token
    const ponder = token.includes('ponder');
    const infinite = token.includes('infinite');

    const depth = getNumber(token, /depth (\d+)/, -1);
    const mate = getNumber(token, /mate (\d+)/, -1);
    const mtg = getNumber(token, /movestogo (\d+)/, -1);
    const node = getNumber(token, /nodes (\d+)/, -1);
    const time = turn === 'w' ? getNumber(token, /wtime (\d+)/, 0) : getNumber(token, /btime (\d+)/, 0);
    const inc = turn === 'w' ? getNumber(token, /winc (\d+)/, 0) : getNumber(token, /binc (\d+)/, 0);
    const movetime = getNumber(token, /movetime (\d+)/, -1);

    const r = /searchmoves\s*(.*)/.exec(token);
    info.searchMoves = r ? r[1].split(' ') : [];
    info.ponder = ponder;

    // Initialize limits for the search
    info.limitedByNone = infinite;
    info.limitedByTime = movetime != -1;
    info.limitedByDepth = depth != -1 || mate != -1;
    info.limitedByNodes = node != -1;
    info.limitedBySelf = !info.limitedByNone && !info.limitedByTime && !info.limitedByDepth && !info.limitedByNodes;
    info.limitedByMoves = info.searchMoves.length > 0;

    if (info.limitedByDepth) info.allotment = (depth != -1) ? depth : 2 * mate - 1;
    else if (info.limitedByTime) info.allotment = movetime;
    else if (info.limitedByNodes) info.allotment = node;

    info.uciLevel = {
        startTime: util_.get_time_ms(),
        inc: inc,
        mtg: mtg,
        time: time,
    }

    return true;
}

function uciPosition(position: board_.board_t, fen: string, moves: string[]): void {
    board_.fenToBoard(fen, position);
    for (let i = 0; i < moves.length; i++) {
        if (!move_.makeMove(move_.smithToMove(moves[i], position), position)) break;
    }
}

function uciSetOption(info: search_.info_t, name: string, value: string): boolean {
    if (name === "BookFile") info.bookFile = value;
    else if (name === "UseBook") info.useBook = (value).includes('true');
    else if (name === "MultiPV") info.multiPV = parseInt(value);
    else if (name === "UCI_AnalyseMode") info.analyzingMode = (value).includes('true');
    else if (name === "UCI_Opponent") info.opponent = value;
    else return false;

    return true;
}

function uciParser(data: string, position: board_.board_t, info: search_.info_t, stdoutFn: stdoutFn_t): uciReport_t {
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
    const report: uciReport_t = {
        runSearch: false,
        runSetOption: false
    };

    (/^(.*?)\n?$/).exec(data);
    const token = RegExp.$1;

    if (token === "quit") info.uciQuit = true;
    else if (token === "stop") info.uciStop = true;
    else if (token === "ponderhit") info.uciPonderHit = true;
    else if (token === 'ucinewgame') info.searchInitialized = search_.clear();
    else if (token === "uci") uciPrint(info, stdoutFn);
    else if (token === "isready") stdoutFn('readyok');
    else if ((/^go /).exec(token)) report.runSearch = (uciGO(token, info, board_.getTurn(position)));
    else if ((/^position (?:(startpos)|fen (.*?))\s*(?:moves\s*(.*))?$/).exec(token)) {
        const fen = (RegExp.$1 === 'startpos') ? util_.START_FEN : RegExp.$2;
        const moves = (RegExp.$3) ? (RegExp.$3).split(' ') : [];
        uciPosition(position, fen, moves);
    }
    else if ((/setoption name (\S+) value\s*(.*)/).exec(token)) {
        if (uciSetOption(info, RegExp.$1, RegExp.$2)) report.runSetOption = true;
        else stdoutFn('Unknown setoption command: ' + token);
    }
    /* 
    Additional custom non-UCI commands, mainly for debugging Debugging/Testing
    DO NOT USE for search, or in UCI GUI
     */
    else if (token === "print") stdoutFn(board_.boardToANSI(position, util_.pieceAnsi.white, util_.pieceAnsi.black, util_.squareAnsi.light, util_.squareAnsi.dark, true));
    else if (token === 'fen') stdoutFn(board_.boardToFen(position));
    else stdoutFn('Unknown command ' + token);

    return report;
}

export {
    uciParser,
    stdoutFn_t,
    uciReport_t
}