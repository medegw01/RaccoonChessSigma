import * as move_ from '../game/move'
import * as book_ from '../game/book'
import * as board_ from '../game/board'

export type info_t = {
    startTime: number;
    endTime: number;
    depth: number;
    depthSet: number;
    timeSet: boolean;
    moveToGo: number;
    infinite: boolean;
    mate: number;

    nodes: number;
    maxNodes: number;

    stopSearch: () => boolean;
    isPonderhit: () => boolean;
    uci_stop: boolean;
    uci_ponderhit: boolean;
    uci_quit: boolean;


    ponder: boolean;
    searchMoves: string[];

    // UCI Options
    multiPV: number;
    analyzingMode: boolean;
    opponent: string;
    useBook: boolean;
    bookFile: string;

    is_pondering: boolean;

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
    search
}