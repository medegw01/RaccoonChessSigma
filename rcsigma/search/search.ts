import * as move_ from '../game/move'
import * as book_ from '../game/book'
import * as board_ from '../game/board'

type info_t = {
    stopSearch: () => boolean;
    isPonderHit: () => boolean;

    uciStop: boolean;
    uciPonderHit: boolean;
    uciQuit: boolean;

    ponder: boolean;

    // UCI Options
    multiPV: number;
    analyzingMode: boolean;
    opponent: string;
    useBook: boolean;
    bookFile: string;

    searchInitialized: boolean;

    // limits
    limitedByNone: boolean;
    limitedByNodes: boolean;
    limitedByDepth: boolean;
    limitedByTime: boolean;
    limitedBySelf: boolean;
    limitedByMoves: boolean;

    uciLevel: {
        startTime: number;
        time: number;
        inc: number;
        mtg: number;
    }

    allotment: number;
    searchMoves: string[];
}

function clear(): boolean {
    return true;
}

function search(board: board_.board_t, info: info_t, stdoutFn: (msg: string) => void): void {
    stdoutFn(JSON.stringify(info));
    let bestMove = move_.NO_MOVE;
    if (info.useBook) {
        bestMove = book_.bookMove(board);
        stdoutFn(`found ${bestMove.toString()}`);
    }
    const bestMoveStr = move_.moveToSmith(bestMove);
    stdoutFn('bestmove ' + bestMoveStr);
}

export {
    info_t,

    search,
    clear,
}