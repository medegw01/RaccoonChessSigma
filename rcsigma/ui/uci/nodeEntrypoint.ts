// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as board_ from '../../game/board'
import * as search_ from '../../search/search'
import * as uci_ from './uci'
import * as book_ from '../../game/book'

import { Worker, isMainThread, parentPort } from 'worker_threads';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';

type searchParam_t = {
    position: board_.board_t;
    info: search_.info_t;
}

util_.initializeGame();

if (isMainThread) {
    let position = board_.newBoard();
    let info = {} as search_.info_t;

    info.useBook = false;
    info.analyzingMode = false;
    info.opponent = "Guest";
    info.multiPV = 1;
    info.bookFile = "book.bin";

    const worker = new Worker(__filename);
    worker.on('error', (err: Error) => { throw err; });
    worker.on('exit', () => { process.stdout.write("Worker crashes" + '\n'); });
    worker.on('message', (msg: string) => { process.stdout.write(msg + '\n'); });

    /*
        array[0] -> stop
        array[1] -> ponderhit
    */
    const number_triggers = 2;
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * number_triggers);
    const sharedArray = new Int32Array(sharedBuffer);
    worker.postMessage(sharedBuffer);

    createInterface({
        input: process.stdin,
        output: process.stdout,
    }).on("line", (line: string) => {
        if (line) {
            sharedArray[0] = 0; // set stop to false
            sharedArray[1] = 0; // set ponderhit to false

            if (line === "quit" || line === "exit") {
                worker.terminate();
                process.exit();
            } else if (line === "stop") {
                sharedArray[0] = 1;
            } else if (line == "ponderhit") {
                sharedArray[1] = 1;
            } else {
                const report = uci_.uciParser(
                    line, position, info,
                    (msg: string): void => {
                        process.stdout.write(msg + '\n');
                    });
                if (report.run_search) {
                    worker.postMessage({
                        position: position,
                        info: info
                    });
                }
            }
        }
    }).setPrompt("");
}
else {
    let sharedArray: Int32Array;
    let bookIsOpenned = false;

    const stopSearch = (): boolean => {
        return sharedArray[0] === 1;
    }
    const isPonderhit = (): boolean => {
        return sharedArray[1] === 1;
    }
    const messageMain = (msg: string): void => {
        parentPort?.postMessage(msg)
    }
    const bookOpen = (filePath: string): { success: boolean, error: string } => {
        try {
            const data = readFileSync(filePath);
            if (data && book_.bookAdd(util_.bufferToArrayBuffer(data))) {
                return { success: true, error: "" }
            }
        } catch (err) {
            return { success: false, error: (err as Error).message };
        }
        return { success: false, error: "Unknown" };
    }

    parentPort?.on('message', (data: searchParam_t | SharedArrayBuffer) => {
        if (util_.isOfType<searchParam_t>(data, 'position')) {
            data.info.stopSearch = stopSearch;
            data.info.isPonderhit = isPonderhit;

            if (!bookIsOpenned && data.info.useBook) {
                const bookResult = bookOpen(data.info.bookFile);
                if (bookResult.success) {
                    bookIsOpenned = true;
                } else {
                    data.info.useBook = false;
                    messageMain(bookResult.error);
                }
            }

            search_.search(data.position, data.info, messageMain);
        } else {
            sharedArray = new Int32Array(data);
        }
    });
}