// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020- 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as bitboard_ from '../../game/bitboard'
import * as board_ from '../../game/board'
import * as search_ from '../../search/search'
import * as uci_ from './uci'
import * as book_ from '../../game/book'
import * as tb_ from '../../search/tbase'
import * as thread_ from '../../search/thread'
import * as util_ from '../../util'


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
    postWorkerThread: (data: searchParam_t) => void;

    postExternalThread: (msg: string) => void;
    bookOpen: (filePath: string) => { success: boolean, error: string };
    exitMain: () => void;
    newWorker: () => void;

    isMainThread: boolean;
    environment: Environment;

}
type searchParam_t = {
    position: board_.board_t;
    info: search_.info_t;
    threads: thread_.thread_t[];
}

const hashSize = 32;

util_.init();
bitboard_.init();
tb_.resize(hashSize);
search_.init();


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

    const threads = thread_.create(1)
    info.useBook = false;
    info.analyzingMode = false;
    info.opponent = "Guest";
    info.multiPV = 1;
    info.bookFile = "raccoon.bin";
    info.evalFile = "raccoon.nuue";
    info.searchInitialized = false;
    info.hashSize = hashSize;
    info.nThreads = 1;
    info.moveOverhead = 100;
    info.useNNUE = false;
    info.SIGNAL = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);

    // uciMain calls UCI
    const uciMain = (line: string) => {
        if (info.uciQuit || line === "exit") {
            config.exitMain();
        }

        info.uciQuit = false;
        if (uci_.uciParser(line, position, info, config.postExternalThread, threads)) {
            // Create new thread to run search in the background and leave main thread active
            config.newWorker();
            config.postWorkerThread({
                position: position,
                info: info,
                threads: threads
            });
        }
    }

    if (config.environment === Environment.nodeJS) {
        config.newWorker = () => {
            const worker: WorkerNode = new WorkerNode(__filename);
            worker.on('error', (err: Error) => { throw err; });
            worker.on('exit', () => { config.postExternalThread("Worker crashes"); });
            worker.on('message', (msg: string) => { config.postExternalThread(msg) });

            config.postWorkerThread = (data: searchParam_t) => {
                worker.postMessage(data);
            }
        }

        createInterface({
            input: process.stdin,
            output: process.stdout,
        }).on("line", (line: string) => {
            if (line) {
                uciMain(line);
            }
        }).setPrompt("");
    }
    else if (config.environment === Environment.WebWorker) {
        config.newWorker = () => {
            const worker: Worker = new Worker(__filename);
            worker.onerror = function () { worker.terminate(); }
            worker.onmessage = function (e) { config.postExternalThread(e.data) }

            config.postWorkerThread = (data: searchParam_t) => {
                worker.postMessage(data);
            }
        }

        onmessage = function (e) {
            if (e.data) {
                uciMain(e.data);
            }
        }
    }
}
else {
    let bookIsOpened = false;

    const execSearch = (data: searchParam_t) => {
        if (util_.isOfType<searchParam_t>(data, 'position')) {
            data.info.stdoutFn = config.postMainThread;

            if (!bookIsOpened && data.info.useBook) {
                const bookResult = config.bookOpen(data.info.bookFile);
                if (bookResult.success) {
                    bookIsOpened = true;
                } else {
                    data.info.useBook = false;
                    config.postMainThread(bookResult.error);
                }
            }

            // for now, workers does not copy function, so recreating the function class this way
            // resolves 'e.pawnEvalHash.contains is not a function' error
            data.position = board_.copyBoard(data.position) // hack

            search_.search(data.position, data.info, data.threads);
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
            parentPort?.on('message', (data: searchParam_t) => {
                execSearch(data);
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

