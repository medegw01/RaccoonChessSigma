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
    let r = re.exec(token);
    return r ? +r[1] : dflt;
}

function uciParser(data: string, position: board_.board_t, info: search_.info_t, stdoutFn: stdoutFn_t): uci_report_t {
    let report: uci_report_t = {
        run_search: false,
        run_setoption: false
    };
    // stop, or quit are handled outside here
    (/^(.*?)\n?$/).exec(data);
    let token = RegExp.$1;
    if (token === 'ucinewgame') {
        board_.fenToBoard(util_.START_FEN, position);
    }
    else if (token === "print") {
        const parser = {
            pieces: ["P", "B", "N", "R", "Q", "K", "p", "b", "n", "r", "q", "k"],
            light_square: "-",
            dark_square: "="
        }
        stdoutFn(board_.boardToPrintable(position, parser.pieces, parser.light_square, parser.dark_square, true));
    }
    else if (token === "uci") {
        stdoutFn('id name ' + NAME + ' ' + VERSION);
        stdoutFn('id author Michael Edegware');
        //stdoutFn('option name OwnBook type check default ' + info.useBook);
        stdoutFn('option name MultiPV type spin default ' + info.multiPV + ' min 1 max 3');
        stdoutFn('option name UCI_AnalyseMode type check default ' + info.analyzingMode);
        stdoutFn('option name UCI_Opponent type string default ' + info.opponent);
        stdoutFn('option name Ponder type check default ' + info.ponder);
        stdoutFn('option name UseBook type check default ' + info.useBook);
        stdoutFn('option name BookFile type string default ' + info.bookFile);
        stdoutFn('uciok');
    }
    else if (token === "isready") {
        stdoutFn('readyok');
    }
    else if ((/^go /).exec(token)) {
        info.timeSet = false;
        info.startTime = util_.get_time_ms();
        info.depth = getNumber(token, /depth (\d+)/, util_.MAX_DEPTH);
        info.infinite = token.includes('infinite');
        info.nodes = 0;
        info.maxNodes = getNumber(token, /nodes (\d+)/, 0);


        info.mate = getNumber(token, /mate (\d+)/, 0);
        info.ponder = token.includes('ponder');

        let r = /searchmoves\s*(.*)/.exec(token);
        info.searchMoves = r ? r[1].split(' ') : [];

        let movetime = getNumber(token, /movetime (\d+)/, 0);
        let movestogo = getNumber(token, /movestogo (\d+)/, 32);
        let time = board_.getTurn(position) === 'w' ? getNumber(token, /wtime (\d+)/, -1) : getNumber(token, /btime (\d+)/, 0);
        let inc = board_.getTurn(position) === 'w' ? getNumber(token, /winc (\d+)/, 0) : getNumber(token, /binc (\d+)/, 0);

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
        report.run_search = true;

    }
    else if ((/^position (?:(startpos)|fen (.*?))\s*(?:moves\s*(.*))?$/).exec(token)) {
        let fen = (RegExp.$1 === 'startpos') ? util_.START_FEN : RegExp.$2;
        board_.fenToBoard(fen, position);
        if (RegExp.$3) {
            let moves = (RegExp.$3).split(' ');
            for (let i = 0; i < moves.length; i++) {
                if (!move_.makeMove(move_.smithToMove(moves[i], position), position)) break;
            }
        }
    }
    else if ((/setoption name (\S+) value\s*(.*)/).exec(token)) {
        report.run_setoption = true;
        if (RegExp.$1 === "BookFile") {
            info.bookFile = RegExp.$2;
        } else if (RegExp.$1 === "UseBook") {
            info.useBook = (RegExp.$2).includes('true');
        } else if (RegExp.$1 === "MultiPV") {
            info.multiPV = parseInt(RegExp.$2);
        } else if (RegExp.$1 === "UCI_AnalyseMode") {
            info.analyzingMode = (RegExp.$2).includes('true');
        } else if (RegExp.$1 === "Ponder") {
            info.analyzingMode = (RegExp.$2).includes('true');
        } else if (RegExp.$1 === "UCI_Opponent") {
            info.opponent = RegExp.$2;
        } else {
            report.run_setoption = false;
            stdoutFn('Unknown setoption command ' + token);
        }
    }
    else {
        stdoutFn('Unknown command ' + token);
    }
    return report;
}
export {
    uciParser
}