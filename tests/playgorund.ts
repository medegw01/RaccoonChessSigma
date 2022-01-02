import * as util_ from '../rcsigma/util'
import * as board_ from '../rcsigma/game/board'
import * as bitboard_ from '../rcsigma/game/bitboard'
//import * as move_ from '../rcsigma/game/move'
import * as thread_ from '../rcsigma/search/thread'
import * as search_ from '../rcsigma/search/search'
import * as tb_ from '../rcsigma/search/tbase'
//import * as evl_ from '../rcsigma/evaluate/rc/eval'

import * as uci_ from '../rcsigma/ui/uci/uci'

//import { perft } from '../rcsigma/game/perft'
/*import * as state_ from '../rcsigma/game/state'
import * as thread_ from '../rcsigma/search/thread'*/


const hashSize = 32;
util_.init();
bitboard_.init();
tb_.resize(hashSize);
search_.init();

const board = board_.clearBoard();
const threads = thread_.create(1);

// Initialize
const info: search_.info_t = {} as search_.info_t;
info.useBook = false;
info.analyzingMode = false;
info.opponent = "Guest";
info.multiPV = 2;
info.bookFile = "raccoon.bin";
info.evalFile = "raccoon.nuue";
info.searchInitialized = true;
info.allowPonder = true;
info.SIGNAL = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
info.hashSize = 32;
info.nThreads = 1;
info.moveOverhead = 19;
info.limitedByNone = false;

const out = (str: string) => {
    console.log(str);
}

/*board_.fenToBoard("r2q1rk1/1ppnbppp/p2p1nb1/3Pp3/2P1P1P1/2N2N1P/PPB1QP2/R1B2RK1 b - - 0 1", board);
out(`${board_.boardToFen(board)}`)
out(`${evl_.evaluate(board, threads[0])}`)
out(`${evl_.evaluateCached(board, threads[0])}`)

board_.mirrorBoard(board)

out(`${board_.boardToFen(board)}`)
out(`${evl_.evaluate(board, threads[0])}`)
out(`${evl_.evaluateCached(board, threads[0])}`)*/
// r1bk3r/ppp2pp1/2np1qn1/2b1p2p/1P2P3/2PP1NP1/P3QPBP/RNB1K2R w KQ - 1 9
// r1bk3r/ppp2pp1/2np1q2/2b1p2p/1P2PP1P/2PP1N2/P3QPB1/RNB1K2R b KQ - 0 10
board_.fenToBoard("kQr5/pp3ppr/N7/3p2n1/3bb3/8/n3PPP1/4R1K1 b - - 3 2", board);
console.log(uci_.uciParser("go depth 10", board, info, out, threads))
info.stdoutFn = out;
search_.search(board, info, threads);

/*
board_.fenToBoard("1k1r4/pp3R2/6pp/4p3/b1B5/8/PPPQ1B2/3K4 b - - 2 3", board);
console.log(evl_.evaluateCached(board, threads[0]))
board_.fenToBoard("1k1r4/pp3R2/6pp/4p3/b7/3BQ3/PPP2B2/3K4 b - - 2 3", board);
console.log(evl_.evaluateCached(board, threads[0]))*/
/*
// genrate moves  r1bk3r/ppp2pp1/2np1q2/2b1p2p/1P2PP1P/2PP1N2/P3QPB1/RNB1K2R b KQ - 0 10
board_.fenToBoard("r1bk3r/ppp2pp1/2np1q2/2b1p2p/1P2PP1P/2PP1N2/P3QPB1/RNB1K2R b KQ - 0 10", board);
console.log(move_.pseudoLegal(board, 40001))
console.log(move_.pseudoLegal(board, 23617))*/


/*board.pawnEvalHash.put(1n, {} as board_.pawnEntry_t)
board.pawnEvalHash.put(2n, {} as board_.pawnEntry_t)
console.log(board)
console.log(board_.copyBoard(board))
// r1bk3r/ppp2pp1/2nq2n1/4p3/4P2p/2PP1NB1/P1Q2PBP/RNP1K2R b - - 1 12 -- pawn error
*/
//1k1r4 / pp3R2 / 6pp / 4p3 / b1B5 / 8 / PPPQ1B2 / 3K4 b - - 2 3
//1k1r4/pp3R2/6pp/4p3/b7/3BQ3/PPP2B2/3K4 b - - 2 3


//[ 120224, 125092, 124622, 141910 ]
//[ 5536, 125092, 124622, 141910 ]
//[ 120224, 125092, 124622, 141910 ]

/*board_.fenToBoard("r1bk3r/ppp2pp1/2np1qn1/2b1p2p/1P2P3/2PP1NP1/P3QPBP/RNB1K2R w KQ - 1 9", board);
console.log(board_.boardToFen(board))
const moves: number[] = []
console.log(move_.generateNoisy(board, moves))
console.log(moves)
for (let i = 0; i < moves.length; i++) {
    out(`${move_.moveToSmith(moves[i])} ${moves[i]} ${util_.pieceToAscii[move_.CAPTURED(moves[i])]}`)
}
console.log(board_.boardToFen(board))*/
/*console.log(`${move_.moveToSmith(40001)} ${40001} ${util_.pieceToAscii[move_.CAPTURED(40001)]}`)

[ 139188, 123054 ] ​​​​​at ​​​moves​​​ ​tests/playgorund.ts:95:0
b4c5 139188 b ​​​​​at ​​​str​​​ ​tests/playgorund.ts:43:4
f3e5 123054 p ​​​​​at ​​​str​​​ ​tests/playgorund.ts:43:4
r1bk3r/ppp2pp1/2np1qn1/2b1p2p/1P2P3/2PP1NP1/P3QPBP/RNB1K2R w KQ - 1 9
  at ​​​board_.boardToFen(board)


r1bk3r/ppp2pp1/2np1qn1/2b1p2p/1P2P3/2PP1NP1/P3QPBP/RNB1K2R w KQ - 1 9
r1bk3r/ppp2pp1/2np1qn1/2b1p2p/1P2P3/2PP1NB1/P3QPBP/RNB1K2R w KQ - 1 9

console.time("1")
console.log(perft(4, board, thread))
console.timeEnd("1")*/

/*console.time("1")
const moves = move_.generateLegalMoves(board)
console.timeEnd("1")
const mvStr: string[] = []
const mv: number[] = []
for (const move of moves) {
    mvStr.push(move_.moveToSmith(move.move))
    mv.push(move.move)
    move_.makeMove(move.move, board, thread)
    move_.takeMove(board, thread)
}

console.time("2")
const moves2: number[] = move_.generateLegalMoves2(board)
console.timeEnd("2")
const mvStr2: string[] = []
for (let i = 0; i < moves2.length; i++) {
    mvStr2.push(move_.moveToSmith(moves2[i]))
    move_.makeMove(moves2[i], board, thread)
    move_.takeMove(board, thread)
}

console.log(mvStr.sort())
console.log(mvStr2.sort())

console.log(mv.sort())
console.log(moves2.sort())*/

//console.log(thread.undoStack)

/*
uci
ucinewgame
position fen 1k1r4/pp3R2/6pp/4p3/2B3b1/4Q3/PPP2B2/3K4 w - - 1 3
go infinite


uci
ucinewgame
position fen 1k1r4/pp3R2/6pp/4p3/2B3b1/4Q3/PPP2B2/2K5 b - - 2 3
go infinite



*/

// check move generator on This
// r1bk3r/ppp2pp1/2np1q2/2b1p2p/1P2PP1P/2PP1N2/P3QPB1/RNB1K2R b KQ - 0 10

// position fen 8/7Q/4N2K/3pp1R1/3pk3/7N/1b1PP3/8 b - - 0 3



//--- did not see white can check with another piece