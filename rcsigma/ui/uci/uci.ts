// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as search_ from '../../search/search'
import * as move_ from '../../game/move'

const VERSION = "0.1.0";
const NAME = "RaccoonChessSigma";

type stdoutFn_t = (msg: string) => void;
type uci_report_t = {
    run_search: boolean;
    run_setoption: boolean;
};

function getNumber(token: string, re: RegExp, dflt: number): number {
    const r = re.exec(token);
    return r ? +r[1] : dflt;
}

function uci_print(info: search_.info_t, stdoutFn: stdoutFn_t): void {
    stdoutFn('id name ' + NAME + ' ' + VERSION);
    stdoutFn('id author Michael Edegware');
    //stdoutFn('option name OwnBook type check default ' + info.useBook);
    stdoutFn(`option name MultiPV type spin default ${info.multiPV} min 1 max 3`);
    stdoutFn(`option name UCI_AnalyseMode type check default ${String(info.analyzingMode)}`);
    stdoutFn(`option name UCI_Opponent type string default ${info.opponent}`);
    stdoutFn(`option name Ponder type check default ${String(info.ponder)}`);
    stdoutFn(`option name UseBook type check default ${String(info.useBook)}`);
    stdoutFn(`option name BookFile type string default ${String(info.bookFile)}`);
    stdoutFn('uciok');
}
function uci_go(token: string, info: search_.info_t, turn: string): void {
    info.timeSet = false;
    info.startTime = util_.get_time_ms();
    info.depth = getNumber(token, /depth (\d+)/, util_.MAX_DEPTH);
    info.infinite = token.includes('infinite');
    info.nodes = 0;
    info.maxNodes = getNumber(token, /nodes (\d+)/, 0);


    info.mate = getNumber(token, /mate (\d+)/, 0);
    info.ponder = token.includes('ponder');

    const r = /searchmoves\s*(.*)/.exec(token);
    info.searchMoves = r ? r[1].split(' ') : [];

    const movetime = getNumber(token, /movetime (\d+)/, 0);
    let movestogo = getNumber(token, /movestogo (\d+)/, 32);
    let time = turn === 'w' ? getNumber(token, /wtime (\d+)/, -1) : getNumber(token, /btime (\d+)/, 0);
    const inc = turn === 'w' ? getNumber(token, /winc (\d+)/, 0) : getNumber(token, /binc (\d+)/, 0);

    if (movetime) {
        time = movetime;
        movestogo = 1;
    }

    if (time) {
        info.timeSet = true;
        time = Math.floor(movetime / movestogo);
        time -= 0x20;
        info.endTime = info.startTime + time + inc;
    }
    info.depth = info.mate !== 0 ? 2 * info.mate - 1 : info.depth;
}
function uci_position(position: board_.board_t, fen: string, moves: string[]): void {
    board_.fenToBoard(fen, position);
    for (let i = 0; i < moves.length; i++) {
        if (!move_.makeMove(move_.smithToMove(moves[i], position), position)) break;
    }

}
function uci_setoption(info: search_.info_t, name: string, value: string): boolean {
    if (name === "BookFile") {
        info.bookFile = value;
    } else if (name === "UseBook") {
        info.useBook = (value).includes('true');
    } else if (name === "MultiPV") {
        info.multiPV = parseInt(value);
    } else if (name === "UCI_AnalyseMode") {
        info.analyzingMode = (value).includes('true');
    } else if (name === "Ponder") {
        info.analyzingMode = (value).includes('true');
    } else if (name === "UCI_Opponent") {
        info.opponent = value;
    } else {
        return false;
    }
    return true;
}

function uciParser(data: string, position: board_.board_t, info: search_.info_t, stdoutFn: stdoutFn_t): uci_report_t {
    const report: uci_report_t = {
        run_search: false,
        run_setoption: false
    };
    (/^(.*?)\n?$/).exec(data);
    const token = RegExp.$1;
    if (token === "quit") {
        info.uci_quit = true;
    } else if (token === "stop") {
        info.uci_stop = true;
    } else if (token === "ponderhit") {
        info.uci_ponderhit = true;
    } else if (token === 'ucinewgame') {
        board_.fenToBoard(util_.START_FEN, position);
    } else if (token === "disp") {// for debugging
        const piece = {
            white: '\u001b[30m',
            black: '\u001b[30m',
        };
        const square = {
            dark: '\u001b[41m',
            light: '\u001b[47m',
        };
        stdoutFn(board_.boardToANSI(position, piece.white, piece.black, square.light, square.dark, true));
    } else if (token === "uci") {
        uci_print(info, stdoutFn);
    } else if (token === "isready") {
        stdoutFn('readyok');
    } else if ((/^go /).exec(token)) {
        uci_go(token, info, board_.getTurn(position));
        report.run_search = true;
    } else if ((/^position (?:(startpos)|fen (.*?))\s*(?:moves\s*(.*))?$/).exec(token)) {
        const fen = (RegExp.$1 === 'startpos') ? util_.START_FEN : RegExp.$2;
        const moves = (RegExp.$3) ? (RegExp.$3).split(' ') : [];
        uci_position(position, fen, moves);
    } else if ((/setoption name (\S+) value\s*(.*)/).exec(token)) {
        if (uci_setoption(info, RegExp.$1, RegExp.$2)) {
            report.run_setoption = true;
        } else {
            stdoutFn('Unknown setoption command ' + token);
        }
    } else {
        stdoutFn('Unknown command ' + token);
    }
    return report;
}

export {
    uciParser
}