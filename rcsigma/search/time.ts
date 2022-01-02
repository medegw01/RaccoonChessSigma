// -------------------------------------------------------------------------------------------------
// Copyright (c) 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

import * as util_ from '../util'
import * as search_ from './search'

function init(info: search_.info_t): void {
    info.pvFactor = 0; // Clear our stability time usage heuristic

    // Allocate time if Raccoon is handling the clock
    if (info.limitedBySelf) {
        // Playing using X / Y + Z time control
        if (info.uciLevel.mtg >= 0) {
            info.idealUsage = 0.67 * (info.uciLevel.time - info.moveOverhead) / (info.uciLevel.mtg + 5) + info.uciLevel.inc;
            info.maxAlloc = 4.00 * (info.uciLevel.time - info.moveOverhead) / (info.uciLevel.mtg + 7) + info.uciLevel.inc;
            info.maxUsage = 10.00 * (info.uciLevel.time - info.moveOverhead) / (info.uciLevel.mtg + 10) + info.uciLevel.inc;
        }
        // Playing using X + Y time controls
        else {
            info.idealUsage = 0.90 * ((info.uciLevel.time - info.moveOverhead) + 25 * info.uciLevel.inc) / 50;
            info.maxAlloc = 5.00 * ((info.uciLevel.time - info.moveOverhead) + 25 * info.uciLevel.inc) / 50;
            info.maxUsage = 10.00 * ((info.uciLevel.time - info.moveOverhead) + 25 * info.uciLevel.inc) / 50;
        }
        // Cap time allocations using the move overhead
        info.idealUsage = Math.min(info.idealUsage, info.uciLevel.time - info.moveOverhead);
        info.maxAlloc = Math.min(info.maxAlloc, info.uciLevel.time - info.moveOverhead);
        info.maxUsage = Math.min(info.maxUsage, info.uciLevel.time - info.moveOverhead);
    }

    // Interface told us to search for a predefined duration
    if (info.limitedByTime) {
        info.idealUsage = info.timeLimit;
        info.maxAlloc = info.timeLimit;
        info.maxUsage = info.timeLimit;
    }

}

function update(info: search_.info_t): void {
    const cv = info.values[info.depth];
    const lv = info.values[info.depth - 1];

    // Don't adjust time when we are at low depths, or if
    // we simply are not in control of our own time usage
    if (!info.limitedBySelf || info.depth < 4) return;

    // Increase our time if the score suddenly dropped
    if (lv > cv + 10) info.idealUsage *= 1.050;
    if (lv > cv + 20) info.idealUsage *= 1.050;
    if (lv > cv + 40) info.idealUsage *= 1.050;

    // Increase our time if the score suddenly jumped
    if (lv + 15 < cv) info.idealUsage *= 1.025;
    if (lv + 30 < cv) info.idealUsage *= 1.050;

    // Always scale back the PV time factor, but also look
    // to reset the PV time factor if the best move changed
    info.pvFactor = Math.max(0, info.pvFactor - 1);
    if (info.bestMoves[info.depth] != info.bestMoves[info.depth - 1])
        info.pvFactor = 9;
}

function elasped(info: search_.info_t): number {
    return util_.getTimeMs() - info.uciLevel.startTime;
}

function terminate(info: search_.info_t): boolean {
    // Adjust our ideal usage based on variance in the best move
    // between iterations of the search. We won't allow the new
    // usage value to exceed our maximum allocation. The cutoff
    // is reached if the elapsed time exceeds the ideal usage

    let cutoff = info.idealUsage;
    cutoff *= 1.00 + info.pvFactor * 0.105;
    return elasped(info) > Math.min(cutoff, info.maxAlloc);
}


export {
    init,
    update,
    elasped,
    terminate
}