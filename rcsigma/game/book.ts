// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as board_ from '../game/board'
import * as bitboard_ from '../game/bitboard'
import * as move_ from '../game/move'

/*****************************************************************************
  * OPENING BOOK
****************************************************************************/
let bookFile: DataView;
let bookSize: number;
type entry_t = {
    key: bitboard_.bitboard_t;
    move: number;
    weight: number;
    learn: number;
}

function bookAdd(arrayBuffer: ArrayBuffer): boolean {
    bookFile = new DataView(arrayBuffer);
    bookSize = Math.floor(bookFile.byteLength / 16);
    return bookFile !== null;
}
function findKey(key: bitboard_.bitboard_t) {
    let left = 0, mid, right = bookSize - 1;
    const entry: entry_t = {
        key: 0n,
        move: move_.NO_MOVE,
        weight: 0,
        learn: 0
    }
    while (left < right) {
        mid = Math.floor((left + right) / 2);
        readEntry(entry, mid);
        if (key <= entry.key) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }
    readEntry(entry, left);
    return (entry.key === key) ? left : bookSize;
}
function readEntry(entry: entry_t, index: number) {
    const offset = index * 16;
    entry.key = bookFile.getBigUint64(offset);
    entry.move = bookFile.getUint16(offset + 8);
    entry.weight = bookFile.getUint16(offset + 10);//use later in search
    entry.learn = bookFile.getUint32(offset + 12); // use later in search or eval
}

function polyToSmith(polyMove: number) {
    let smith = "";
    smith += String.fromCharCode('a'.charCodeAt(0) + ((polyMove >> 6) & 7));
    smith += String.fromCharCode('1'.charCodeAt(0) + ((polyMove >> 9) & 7));
    smith += String.fromCharCode('a'.charCodeAt(0) + ((polyMove >> 0) & 7));
    smith += String.fromCharCode('1'.charCodeAt(0) + ((polyMove >> 3) & 7));
    const promotion = (polyMove >> 12) & 7;
    if (promotion !== 0) {
        let pp = 'q';
        switch (promotion) {
            case 1: pp = 'n'; break;
            case 2: pp = 'b'; break;
            case 3: pp = 'r'; break;
        }
        smith += pp;
    }
    return smith;
}
function myRandom(n: number) {
    return Math.floor(Math.random() * (n));
}

function bookMove(board: board_.board_t): move_.move_t {
    if (bookFile !== null && bookSize !== 0) {
        let bestMovePoly = move_.NO_MOVE;
        let best_score = 0;
        const entry: entry_t = {
            key: 0n,
            move: 0,
            weight: 0,
            learn: 0
        }
        for (let pos = findKey(board.currentPolyglotKey); pos < bookSize; pos++) {
            readEntry(entry, pos);
            if (entry.key !== board.currentPolyglotKey) {
                break;
            }
            const score = entry.weight;
            best_score += score;
            if (myRandom(best_score) < score) bestMovePoly = entry.move;
        }
        if (bestMovePoly !== move_.NO_MOVE) {
            const smithMove = polyToSmith(bestMovePoly);
            const bestMove = move_.smithToMove(smithMove, board);
            if (bestMove !== move_.NO_MOVE) {
                return bestMove;
            }
        }
    }
    return move_.NO_MOVE;
}

/*****************************************************************************
  * NOOB PROBE BOOK
****************************************************************************/
// https://www.chessdb.cn/cloudbookc_api_en.html
type noobprobe_t = {
    option: string;
    value: string;
}
interface noobprobeCallback { (arg: string): void }

function fetchNoob(action: string, params: noobprobe_t[], board: board_.board_t, callback: noobprobeCallback): void {
    //http://www.chessdb.cn/cdb.php?action=[ACTION]{&[OPTION1]=[VALUE1]...&[OPTIONn]=[VALUEn]}
    const fen = board_.boardToFen(board);
    let params_str = "";
    for (const param of params) {
        params_str += `&${param.option}=${param.value}`;
    }

    const url = `http://www.chessdb.cn/cdb.php?action=${action}${params_str}&board=${fen}`

    const Http = new XMLHttpRequest();
    Http.onreadystatechange = function () {
        if (Http.readyState == 4 && Http.status == 200) {
            callback(Http.responseText)
        }
    }
    Http.open("GET", url, true);
    Http.send(null);
}

export {
    fetchNoob,
    noobprobe_t,
    bookMove,
    bookAdd
};
