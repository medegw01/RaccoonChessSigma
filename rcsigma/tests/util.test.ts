/* 
 Some best practices -> Test each individual function first 
 So each file will have its own unit tests 
 Have it on the same level as the file 
 In this case, util will have a tests folder and under it I will have the util.tests

 For example: under search, I will have search.ts and tests. Under tests, I will have 
 search.test.ts
*/

import { 
    square64_to_square120, 
    square120_to_square64,
    initialize_square120_to_square64 } from '../util';

describe('Testing Util functions', () => { 
    beforeEach(() => { 
        // Reinitialize values here. 
    });

    it('initialize_square120_to_square64', () => { 
        initialize_square120_to_square64(); 
        // Compare them to valid values here. I do not know what they are
        // but I hope you get the gist here
        expect(square120_to_square64).toEqual([])
        expect(square64_to_square120).toEqual([])
    });

    // If you ran another test that depended on square120_to_ssquare_64, you 
    // wouuld have to reset everything using the beforeEAch block.  
})