// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 - 2021 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------


import * as tb_ from '../rcsigma/search/tbase';

describe("Hash Table Tests", () => {
    beforeEach(() => {
        tb_.resize(1);
    });

    it("Success: Found Saved Entry", function () {
        const bound = tb_.BOUND.LOWER
        const value = 20019
        const depth = 11
        const evaln = 6211
        const move = 69

        const hash64 = 452n

        tb_.save(hash64, move, value, evaln, depth, bound)
        const e = tb_.probe(hash64)

        expect(e.found).toBe(true);
        expect(e.entry.bound).toBe(bound);
        expect(e.entry.depth).toBe(depth);
        expect(e.entry.eval).toBe(evaln);
        expect(e.entry.move).toBe(move);
        expect(e.entry.value).toBe(value);

    });

    it("Failed: Found to fined unsaved Entry", function () {
        const hash64 = 45312n

        const e = tb_.probe(hash64)

        expect(e.found).toBe(false);
    });

});