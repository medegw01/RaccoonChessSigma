// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../../util'
import * as bitboard_ from '../../game/bitboard'
import * as board_ from '../../game/board'
import * as search_ from '../../search/search'
import * as uci_ from './uci'
import * as book_ from '../../game/book'

import { isMainThread, parentPort } from 'worker_threads';
import { Worker as WorkerNode } from 'worker_threads';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';

enum Environment {
    nodeJS,
    WebWorker,
}

type entrypointConfig_t = {
    postMainThread: (msg: string) => void;
    postWorkerThread: (data: searchParam_t | SharedArrayBuffer) => void;

    postExternalThread: (msg: string) => void;
    bookOpen: (filePath: string) => { success: boolean, error: string };
    exitMain: () => void;

    isMainThread: boolean;
    environment: Environment;
}
type searchParam_t = {
    position: board_.board_t;
    info: search_.info_t;
}

util_.initUtil();
bitboard_.initBitBoard();

const config = {} as entrypointConfig_t;
(function entrypoint() {
    if (typeof global !== "undefined" && Object.prototype.toString.call(global.process) === "[object process]") {// Node JS
        config.environment = Environment.nodeJS;
        config.isMainThread = isMainThread;
        config.postExternalThread = (msg: string) => {
            process.stdout.write(msg + '\n');
        }
        config.exitMain = () => {
            process.exit();
        }

    }
    else {
        //if (typeof onmessage !== "undefined" && (typeof window === "undefined" || typeof window.document === "undefined")) {//WebWorker
        config.environment = Environment.WebWorker;
        config.isMainThread = (typeof window.document === "undefined");
        config.postExternalThread = (msg: string) => {
            postMessage(msg + '\n');
        }
        config.exitMain = () => {
            close();
        }
    }
})();

if (config.isMainThread) {
    // eslint-disable-next-line prefer-const
    let position = board_.clearBoard();
    board_.fenToBoard(util_.START_FEN, position);
    // eslint-disable-next-line prefer-const
    let info = {} as search_.info_t;

    info.useBook = false;
    info.analyzingMode = false;
    info.opponent = "Guest";
    info.multiPV = 1;
    info.bookFile = "raccoon.bin";
    info.searchInitialized = false;

    /*
    array[0] -> stop
    array[1] -> ponderhit
    */
    const number_triggers = 2;
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * number_triggers);
    const sharedArray = new Int32Array(sharedBuffer);

    const runMainThread = (line: string) => {
        if (info.uciQuit || line === "exit") {
            config.exitMain();
        }
        info.uciPonderHit = false;
        info.uciQuit = false;
        info.uciStop = false;

        sharedArray[0] = 0; // set stop to false
        sharedArray[1] = 0; // set ponderhit to false

        const report = uci_.uciParser(line, position, info, config.postExternalThread);

        if (info.uciStop) {
            sharedArray[0] = 1;
        } else if (info.uciPonderHit) {
            if (!info.ponder) config.postExternalThread("Error: I'm not pondering");
            else {
                info.ponder = false;
                sharedArray[1] = 1;
            }
        } else {
            if (report.runSearch) {
                config.postWorkerThread({
                    position: position,
                    info: info
                });
            }
        }
    }

    if (config.environment === Environment.nodeJS) {
        const worker: WorkerNode = new WorkerNode(__filename);
        worker.on('error', (err: Error) => { throw err; });
        worker.on('exit', () => { config.postExternalThread("Worker crashes"); });
        worker.on('message', (msg: string) => { config.postExternalThread(msg) });

        config.postWorkerThread = (data: searchParam_t | SharedArrayBuffer) => {
            worker.postMessage(data);
        }
        config.postWorkerThread(sharedBuffer);

        createInterface({
            input: process.stdin,
            output: process.stdout,
        }).on("line", (line: string) => {
            if (line) {
                runMainThread(line);
            }
        }).setPrompt("");

    } else if (config.environment === Environment.WebWorker) {
        const worker: Worker = new Worker(__filename); // web_Worker
        worker.onerror = function () { worker.terminate(); }
        worker.onmessage = function (e) { config.postExternalThread(e.data) }

        config.postWorkerThread = (data: searchParam_t | SharedArrayBuffer) => {
            worker.postMessage(data);
        }
        config.postWorkerThread(sharedBuffer);

        onmessage = function (e) {
            if (e.data) {
                runMainThread(e.data);
            }
        }
    }
}
else {
    let sharedArray: Int32Array;
    let bookIsOpened = false;

    const stopSearch = (): boolean => {
        return sharedArray[0] === 1;
    }
    const isPonderHit = (): boolean => {
        return sharedArray[1] === 1;
    }

    const runChildThread = (data: searchParam_t | SharedArrayBuffer) => {
        if (util_.isOfType<searchParam_t>(data, 'position')) {
            data.info.stopSearch = stopSearch;
            data.info.isPonderHit = isPonderHit;

            if (!bookIsOpened && data.info.useBook) {
                const bookResult = config.bookOpen(data.info.bookFile);
                if (bookResult.success) {
                    bookIsOpened = true;
                } else {
                    data.info.useBook = false;
                    config.postMainThread(bookResult.error);
                }
            }

            search_.search(data.position, data.info, config.postMainThread);
        } else {
            sharedArray = new Int32Array(data);
        }
    }
    switch (config.environment) {
        case Environment.nodeJS:
            config.postMainThread = (msg: string): void => {
                parentPort?.postMessage(msg)
            }
            config.bookOpen = (filePath: string): { success: boolean, error: string } => {
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
                runChildThread(data);
            });
            break;
        case Environment.WebWorker:
            config.postMainThread = (msg: string): void => {
                postMessage(msg);
            }
            config.bookOpen = (filePath: string): { success: boolean, error: string } => {
                const request = new XMLHttpRequest();
                request.open('GET', filePath, false);
                request.responseType = 'arraybuffer';
                request.send(null);

                if (request.status === 200 && book_.bookAdd(util_.bufferToArrayBuffer(request.response))) {
                    return { success: true, error: "" }
                } else {
                    return { success: false, error: `${request.status}: ${request.statusText}` };
                }
            }
            break;
        default:
            console.log("unsupported");
            break;
    }
}

