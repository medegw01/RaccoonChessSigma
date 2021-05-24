
// -------------------------------------------------------------------------------------------------
// Copyright (c) 2020 Michael Edegware
// Licensed under the MIT License (MIT). See LICENSE in the repo root for license information.
// -------------------------------------------------------------------------------------------------

const VERSION = "0.1.0";
const NAME = "RaccoonChessSigma";
const AUTHOR = "Michael Edegware"

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const INFINITE = 32001;
const MAX_MOVES = 256;
const MAX_PLY = 128;
const CHECKMATE = 32000 + MAX_PLY;
const TBWIN = 31000 + MAX_PLY;
const NO_VALUE = CHECKMATE + 1;

const BOARD_SQUARE_NUM = 120;
const SQUARE_NB = 64;
const COLOUR_NB = 2;

enum Phase { MG, EG }

enum Castling {
    WHITE_CASTLE_OO = 1 << 0,
    WHITE_CASTLE_OOO = 1 << 1,
    BLACK_CASTLE_OO = 1 << 2,
    BLACK_CASTLE_OOO = 1 << 3
}

enum Pieces {
    EMPTY,
    WHITEPAWN,
    WHITEBISHOP,
    WHITEKNIGHT,
    WHITEROOK,
    WHITEQUEEN,
    WHITEKING,
    BLACKPAWN,
    BLACKBISHOP,
    BLACKKNIGHT,
    BLACKROOK,
    BLACKQUEEN,
    BLACKKING,
    OFF_BOARD_PIECE
}
enum Files { A_FILE, B_FILE, C_FILE, D_FILE, E_FILE, F_FILE, G_FILE, H_FILE, NONE_FILE }
enum Ranks {
    FIRST_RANK,
    SECOND_RANK,
    THIRD_RANK,
    FOURTH_RANK,
    FIFTH_RANK,
    SIXTH_RANK,
    SEVENTH_RANK,
    EIGHTH_RANK,
    NONE_RANK
}
enum Colors { WHITE, BLACK, BOTH }
enum Squares {
    A1 = 21, B1, C1, D1, E1, F1, G1, H1,
    A2 = 31, B2, C2, D2, E2, F2, G2, H2,
    A3 = 41, B3, C3, D3, E3, F3, G3, H3,
    A4 = 51, B4, C4, D4, E4, F4, G4, H4,
    A5 = 61, B5, C5, D5, E5, F5, G5, H5,
    A6 = 71, B6, C6, D6, E6, F6, G6, H6,
    A7 = 81, B7, C7, D7, E7, F7, G7, H7,
    A8 = 91, B8, C8, D8, E8, F8, G8, H8, OFF_SQUARE, OFF_BOARD, ALL
}

enum PieceType {
    NO_PIECE_TYPE, PAWN, BISHOP, KNIGHT, ROOK, QUEEN, KING,
}


const getColorPiece = [
    Colors.BOTH, Colors.WHITE, Colors.WHITE, Colors.WHITE, Colors.WHITE, Colors.WHITE,
    Colors.WHITE, Colors.BLACK, Colors.BLACK, Colors.BLACK, Colors.BLACK, Colors.BLACK, Colors.BLACK, Colors.BOTH,
];

const isOfType = <T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
    varToBeChecked: any,
    propertyToCheckFor: keyof T
): varToBeChecked is T =>
    (varToBeChecked as T)[propertyToCheckFor] !== undefined;

export function ASSERT(condition: boolean, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg)
    }
}

class LRUCache<TKey, TValue> {
    private cache: Map<TKey, TValue>;
    private maxEntries: number;

    constructor(maxEntries = 20) {
        this.maxEntries = maxEntries;
        this.cache = new Map<TKey, TValue>();
    }

    public has(key: TKey): boolean {
        return this.cache.has(key);
    }

    public get(key: TKey): TValue | undefined {
        const hasKey = this.has(key);
        let entry: TValue | undefined = undefined;
        if (hasKey) {// refresh key
            entry = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, entry!);
        }

        return entry;
    }

    public set(key: TKey, value: TValue): void {
        if (this.cache.has(key)) this.cache.delete(key); // refresh key
        else if (this.cache.size >= this.maxEntries) this.cache.delete(this.first()); // evict oldest
        this.cache.set(key, value);
    }

    public first(): TKey {
        return (<IteratorResult<TKey, TKey>>this.cache.keys().next()).value;
    }

}

/*****************************************************************************
 * MACRO
 ****************************************************************************/
function SQUARE_ON_BOARD(sq: Squares): boolean { return (filesBoard[(sq)] !== Squares.OFF_BOARD); }
function IS_VALID_PIECE(pce: Pieces): boolean { return ((pce) >= Pieces.WHITEPAWN && (pce) <= Pieces.BLACKKING) }
//function IS_VALID_TURN(turn: Colors) { return ((turn) == Colors.WHITE || (turn) == Colors.BLACK) }
//function IS_VALID_FILE_RANK(fr: number) { return ((fr) >= 0 && (fr) <= 7) }

function SQUARE_COLOR(sq: Squares): Colors { return (ranksBoard[(sq)] + filesBoard[(sq)]) % 2 === 0 ? Colors.BLACK : Colors.WHITE; }
function PIECE_INDEX(piece: number, piece_num: number): number { return (piece * 10 + piece_num) }
function PIECE_COLOR(piece: number): Colors {
    return (piece < Pieces.WHITEPAWN) ? Colors.BOTH
        : (piece < Pieces.BLACKPAWN) ? Colors.WHITE
            : Colors.BLACK
}

//pbnrq
function ptToP(color: Colors, pce: number): Pieces {
    ASSERT(pce <= PieceType.KING && pce >= PieceType.NO_PIECE_TYPE)
    return pce + 6 * color
}
function pToPt(pce: Pieces): PieceType {
    ASSERT(pce <= Pieces.BLACKKING && pce >= Pieces.EMPTY)
    return (pce < 7) ? pce : (pce % 7) + 1
}

//===========================================================//
// Game Globals
//===========================================================//
const square64ToSquare120 = new Array<number>(64);
const square120ToSquare64 = new Array<number>(BOARD_SQUARE_NUM);
const castlePermission = new Array<number>(120);

const pieceToAscii = ".PBNRQKpbnrqk";
const pieceToUnicode = [
    '\u2800',
    '\u2659', '\u2657', '\u2658', '\u2656', '\u2655', '\u2654',
    '\u265f', '\u265d', '\u265e', '\u265c', '\u265b', '\u265a'
];
const pieceAnsi = {
    white: '\u001b[30m',
    black: '\u001b[30m',
};
const squareAnsi = {
    dark: '\u001b[41m',
    light: '\u001b[47m',
};
const castle64Hash = [0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n, 0n];

const isBigPiece = [false, false, true, true, true, true, true, false, true, true, true, true, true];
const isMajorPiece = [false, false, false, false, true, true, true, false, false, false, true, true, true];
const isMinorPiece = [false, false, true, true, false, false, false, false, true, true, false, false, false];
const isPawn = [false, true, false, false, false, false, false, true, false, false, false, false, false];
const isKnight = [false, false, false, true, false, false, false, false, false, true, false, false, false];
const isBishop = [false, false, true, false, false, false, false, false, true, false, false, false, false];
const isKing = [false, false, false, false, false, false, true, false, false, false, false, false, true];
const isQueen = [false, false, false, false, false, true, false, false, false, false, false, true, false];
const is_rook = [false, false, false, false, true, false, false, false, false, false, true, false, false];
const isRookOrQueen = [false, false, false, false, true, true, false, false, false, false, true, true, false];
const isBishopOrQueen = [false, false, true, false, false, true, false, false, true, false, false, true, false];
const isSlidePiece = [false, false, true, false, true, true, false, false, true, false, true, true, false];
const isWhitePiece = [false, true, true, true, true, true, true, false, false, false, false, false, false];

const getValuePiece = [//-- getValuePiece[Phase][Pieces]
    [0, 128, 825, 781, 1276, 2538, 0, 128, 825, 781, 1276, 2538, 0, 0],
    [0, 213, 915, 854, 1380, 2682, 0, 213, 915, 854, 1380, 2682, 0, 0]
];

const getPolyPiece = [
    -1, 1, 5, 3, 7, 9, 11, 0, 4, 2, 6, 8, 10
];

const isColorBishop = [
    [false, false, true, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, true, false, false, false, false]
];

const isColorKnight = [
    [false, false, false, true, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, true, false, false, false]
];

const isColorRook = [
    [false, false, false, false, true, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, true, false, false]
];

const isColorQueen = [
    [false, false, false, false, false, true, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, true, false]
];

const isColorPawn = [
    [false, true, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, true, false, false, false, false, false]
];

const flip = [
    56, 57, 58, 59, 60, 61, 62, 63,
    48, 49, 50, 51, 52, 53, 54, 55,
    40, 41, 42, 43, 44, 45, 46, 47,
    32, 33, 34, 35, 36, 37, 38, 39,
    24, 25, 26, 27, 28, 29, 30, 31,
    16, 17, 18, 19, 20, 21, 22, 23,
    8, 9, 10, 11, 12, 13, 14, 15,
    0, 1, 2, 3, 4, 5, 6, 7,
];


const randomPiece = 0;
const randomCastle = 768;
const randomEnpass = 772;
const randomTurn = 780;

const random64Poly: bigint[] = [ //-- http://hgm.nubati.net/book_format.html
    BigInt("0x9D39247E33776D41"), BigInt("0x2AF7398005AAA5C7"), BigInt("0x44DB015024623547"), BigInt("0x9C15F73E62A76AE2"),
    BigInt("0x75834465489C0C89"), BigInt("0x3290AC3A203001BF"), BigInt("0x0FBBAD1F61042279"), BigInt("0xE83A908FF2FB60CA"),
    BigInt("0x0D7E765D58755C10"), BigInt("0x1A083822CEAFE02D"), BigInt("0x9605D5F0E25EC3B0"), BigInt("0xD021FF5CD13A2ED5"),
    BigInt("0x40BDF15D4A672E32"), BigInt("0x011355146FD56395"), BigInt("0x5DB4832046F3D9E5"), BigInt("0x239F8B2D7FF719CC"),
    BigInt("0x05D1A1AE85B49AA1"), BigInt("0x679F848F6E8FC971"), BigInt("0x7449BBFF801FED0B"), BigInt("0x7D11CDB1C3B7ADF0"),
    BigInt("0x82C7709E781EB7CC"), BigInt("0xF3218F1C9510786C"), BigInt("0x331478F3AF51BBE6"), BigInt("0x4BB38DE5E7219443"),
    BigInt("0xAA649C6EBCFD50FC"), BigInt("0x8DBD98A352AFD40B"), BigInt("0x87D2074B81D79217"), BigInt("0x19F3C751D3E92AE1"),
    BigInt("0xB4AB30F062B19ABF"), BigInt("0x7B0500AC42047AC4"), BigInt("0xC9452CA81A09D85D"), BigInt("0x24AA6C514DA27500"),
    BigInt("0x4C9F34427501B447"), BigInt("0x14A68FD73C910841"), BigInt("0xA71B9B83461CBD93"), BigInt("0x03488B95B0F1850F"),
    BigInt("0x637B2B34FF93C040"), BigInt("0x09D1BC9A3DD90A94"), BigInt("0x3575668334A1DD3B"), BigInt("0x735E2B97A4C45A23"),
    BigInt("0x18727070F1BD400B"), BigInt("0x1FCBACD259BF02E7"), BigInt("0xD310A7C2CE9B6555"), BigInt("0xBF983FE0FE5D8244"),
    BigInt("0x9F74D14F7454A824"), BigInt("0x51EBDC4AB9BA3035"), BigInt("0x5C82C505DB9AB0FA"), BigInt("0xFCF7FE8A3430B241"),
    BigInt("0x3253A729B9BA3DDE"), BigInt("0x8C74C368081B3075"), BigInt("0xB9BC6C87167C33E7"), BigInt("0x7EF48F2B83024E20"),
    BigInt("0x11D505D4C351BD7F"), BigInt("0x6568FCA92C76A243"), BigInt("0x4DE0B0F40F32A7B8"), BigInt("0x96D693460CC37E5D"),
    BigInt("0x42E240CB63689F2F"), BigInt("0x6D2BDCDAE2919661"), BigInt("0x42880B0236E4D951"), BigInt("0x5F0F4A5898171BB6"),
    BigInt("0x39F890F579F92F88"), BigInt("0x93C5B5F47356388B"), BigInt("0x63DC359D8D231B78"), BigInt("0xEC16CA8AEA98AD76"),
    BigInt("0x5355F900C2A82DC7"), BigInt("0x07FB9F855A997142"), BigInt("0x5093417AA8A7ED5E"), BigInt("0x7BCBC38DA25A7F3C"),
    BigInt("0x19FC8A768CF4B6D4"), BigInt("0x637A7780DECFC0D9"), BigInt("0x8249A47AEE0E41F7"), BigInt("0x79AD695501E7D1E8"),
    BigInt("0x14ACBAF4777D5776"), BigInt("0xF145B6BECCDEA195"), BigInt("0xDABF2AC8201752FC"), BigInt("0x24C3C94DF9C8D3F6"),
    BigInt("0xBB6E2924F03912EA"), BigInt("0x0CE26C0B95C980D9"), BigInt("0xA49CD132BFBF7CC4"), BigInt("0xE99D662AF4243939"),
    BigInt("0x27E6AD7891165C3F"), BigInt("0x8535F040B9744FF1"), BigInt("0x54B3F4FA5F40D873"), BigInt("0x72B12C32127FED2B"),
    BigInt("0xEE954D3C7B411F47"), BigInt("0x9A85AC909A24EAA1"), BigInt("0x70AC4CD9F04F21F5"), BigInt("0xF9B89D3E99A075C2"),
    BigInt("0x87B3E2B2B5C907B1"), BigInt("0xA366E5B8C54F48B8"), BigInt("0xAE4A9346CC3F7CF2"), BigInt("0x1920C04D47267BBD"),
    BigInt("0x87BF02C6B49E2AE9"), BigInt("0x092237AC237F3859"), BigInt("0xFF07F64EF8ED14D0"), BigInt("0x8DE8DCA9F03CC54E"),
    BigInt("0x9C1633264DB49C89"), BigInt("0xB3F22C3D0B0B38ED"), BigInt("0x390E5FB44D01144B"), BigInt("0x5BFEA5B4712768E9"),
    BigInt("0x1E1032911FA78984"), BigInt("0x9A74ACB964E78CB3"), BigInt("0x4F80F7A035DAFB04"), BigInt("0x6304D09A0B3738C4"),
    BigInt("0x2171E64683023A08"), BigInt("0x5B9B63EB9CEFF80C"), BigInt("0x506AACF489889342"), BigInt("0x1881AFC9A3A701D6"),
    BigInt("0x6503080440750644"), BigInt("0xDFD395339CDBF4A7"), BigInt("0xEF927DBCF00C20F2"), BigInt("0x7B32F7D1E03680EC"),
    BigInt("0xB9FD7620E7316243"), BigInt("0x05A7E8A57DB91B77"), BigInt("0xB5889C6E15630A75"), BigInt("0x4A750A09CE9573F7"),
    BigInt("0xCF464CEC899A2F8A"), BigInt("0xF538639CE705B824"), BigInt("0x3C79A0FF5580EF7F"), BigInt("0xEDE6C87F8477609D"),
    BigInt("0x799E81F05BC93F31"), BigInt("0x86536B8CF3428A8C"), BigInt("0x97D7374C60087B73"), BigInt("0xA246637CFF328532"),
    BigInt("0x043FCAE60CC0EBA0"), BigInt("0x920E449535DD359E"), BigInt("0x70EB093B15B290CC"), BigInt("0x73A1921916591CBD"),
    BigInt("0x56436C9FE1A1AA8D"), BigInt("0xEFAC4B70633B8F81"), BigInt("0xBB215798D45DF7AF"), BigInt("0x45F20042F24F1768"),
    BigInt("0x930F80F4E8EB7462"), BigInt("0xFF6712FFCFD75EA1"), BigInt("0xAE623FD67468AA70"), BigInt("0xDD2C5BC84BC8D8FC"),
    BigInt("0x7EED120D54CF2DD9"), BigInt("0x22FE545401165F1C"), BigInt("0xC91800E98FB99929"), BigInt("0x808BD68E6AC10365"),
    BigInt("0xDEC468145B7605F6"), BigInt("0x1BEDE3A3AEF53302"), BigInt("0x43539603D6C55602"), BigInt("0xAA969B5C691CCB7A"),
    BigInt("0xA87832D392EFEE56"), BigInt("0x65942C7B3C7E11AE"), BigInt("0xDED2D633CAD004F6"), BigInt("0x21F08570F420E565"),
    BigInt("0xB415938D7DA94E3C"), BigInt("0x91B859E59ECB6350"), BigInt("0x10CFF333E0ED804A"), BigInt("0x28AED140BE0BB7DD"),
    BigInt("0xC5CC1D89724FA456"), BigInt("0x5648F680F11A2741"), BigInt("0x2D255069F0B7DAB3"), BigInt("0x9BC5A38EF729ABD4"),
    BigInt("0xEF2F054308F6A2BC"), BigInt("0xAF2042F5CC5C2858"), BigInt("0x480412BAB7F5BE2A"), BigInt("0xAEF3AF4A563DFE43"),
    BigInt("0x19AFE59AE451497F"), BigInt("0x52593803DFF1E840"), BigInt("0xF4F076E65F2CE6F0"), BigInt("0x11379625747D5AF3"),
    BigInt("0xBCE5D2248682C115"), BigInt("0x9DA4243DE836994F"), BigInt("0x066F70B33FE09017"), BigInt("0x4DC4DE189B671A1C"),
    BigInt("0x51039AB7712457C3"), BigInt("0xC07A3F80C31FB4B4"), BigInt("0xB46EE9C5E64A6E7C"), BigInt("0xB3819A42ABE61C87"),
    BigInt("0x21A007933A522A20"), BigInt("0x2DF16F761598AA4F"), BigInt("0x763C4A1371B368FD"), BigInt("0xF793C46702E086A0"),
    BigInt("0xD7288E012AEB8D31"), BigInt("0xDE336A2A4BC1C44B"), BigInt("0x0BF692B38D079F23"), BigInt("0x2C604A7A177326B3"),
    BigInt("0x4850E73E03EB6064"), BigInt("0xCFC447F1E53C8E1B"), BigInt("0xB05CA3F564268D99"), BigInt("0x9AE182C8BC9474E8"),
    BigInt("0xA4FC4BD4FC5558CA"), BigInt("0xE755178D58FC4E76"), BigInt("0x69B97DB1A4C03DFE"), BigInt("0xF9B5B7C4ACC67C96"),
    BigInt("0xFC6A82D64B8655FB"), BigInt("0x9C684CB6C4D24417"), BigInt("0x8EC97D2917456ED0"), BigInt("0x6703DF9D2924E97E"),
    BigInt("0xC547F57E42A7444E"), BigInt("0x78E37644E7CAD29E"), BigInt("0xFE9A44E9362F05FA"), BigInt("0x08BD35CC38336615"),
    BigInt("0x9315E5EB3A129ACE"), BigInt("0x94061B871E04DF75"), BigInt("0xDF1D9F9D784BA010"), BigInt("0x3BBA57B68871B59D"),
    BigInt("0xD2B7ADEEDED1F73F"), BigInt("0xF7A255D83BC373F8"), BigInt("0xD7F4F2448C0CEB81"), BigInt("0xD95BE88CD210FFA7"),
    BigInt("0x336F52F8FF4728E7"), BigInt("0xA74049DAC312AC71"), BigInt("0xA2F61BB6E437FDB5"), BigInt("0x4F2A5CB07F6A35B3"),
    BigInt("0x87D380BDA5BF7859"), BigInt("0x16B9F7E06C453A21"), BigInt("0x7BA2484C8A0FD54E"), BigInt("0xF3A678CAD9A2E38C"),
    BigInt("0x39B0BF7DDE437BA2"), BigInt("0xFCAF55C1BF8A4424"), BigInt("0x18FCF680573FA594"), BigInt("0x4C0563B89F495AC3"),
    BigInt("0x40E087931A00930D"), BigInt("0x8CFFA9412EB642C1"), BigInt("0x68CA39053261169F"), BigInt("0x7A1EE967D27579E2"),
    BigInt("0x9D1D60E5076F5B6F"), BigInt("0x3810E399B6F65BA2"), BigInt("0x32095B6D4AB5F9B1"), BigInt("0x35CAB62109DD038A"),
    BigInt("0xA90B24499FCFAFB1"), BigInt("0x77A225A07CC2C6BD"), BigInt("0x513E5E634C70E331"), BigInt("0x4361C0CA3F692F12"),
    BigInt("0xD941ACA44B20A45B"), BigInt("0x528F7C8602C5807B"), BigInt("0x52AB92BEB9613989"), BigInt("0x9D1DFA2EFC557F73"),
    BigInt("0x722FF175F572C348"), BigInt("0x1D1260A51107FE97"), BigInt("0x7A249A57EC0C9BA2"), BigInt("0x04208FE9E8F7F2D6"),
    BigInt("0x5A110C6058B920A0"), BigInt("0x0CD9A497658A5698"), BigInt("0x56FD23C8F9715A4C"), BigInt("0x284C847B9D887AAE"),
    BigInt("0x04FEABFBBDB619CB"), BigInt("0x742E1E651C60BA83"), BigInt("0x9A9632E65904AD3C"), BigInt("0x881B82A13B51B9E2"),
    BigInt("0x506E6744CD974924"), BigInt("0xB0183DB56FFC6A79"), BigInt("0x0ED9B915C66ED37E"), BigInt("0x5E11E86D5873D484"),
    BigInt("0xF678647E3519AC6E"), BigInt("0x1B85D488D0F20CC5"), BigInt("0xDAB9FE6525D89021"), BigInt("0x0D151D86ADB73615"),
    BigInt("0xA865A54EDCC0F019"), BigInt("0x93C42566AEF98FFB"), BigInt("0x99E7AFEABE000731"), BigInt("0x48CBFF086DDF285A"),
    BigInt("0x7F9B6AF1EBF78BAF"), BigInt("0x58627E1A149BBA21"), BigInt("0x2CD16E2ABD791E33"), BigInt("0xD363EFF5F0977996"),
    BigInt("0x0CE2A38C344A6EED"), BigInt("0x1A804AADB9CFA741"), BigInt("0x907F30421D78C5DE"), BigInt("0x501F65EDB3034D07"),
    BigInt("0x37624AE5A48FA6E9"), BigInt("0x957BAF61700CFF4E"), BigInt("0x3A6C27934E31188A"), BigInt("0xD49503536ABCA345"),
    BigInt("0x088E049589C432E0"), BigInt("0xF943AEE7FEBF21B8"), BigInt("0x6C3B8E3E336139D3"), BigInt("0x364F6FFA464EE52E"),
    BigInt("0xD60F6DCEDC314222"), BigInt("0x56963B0DCA418FC0"), BigInt("0x16F50EDF91E513AF"), BigInt("0xEF1955914B609F93"),
    BigInt("0x565601C0364E3228"), BigInt("0xECB53939887E8175"), BigInt("0xBAC7A9A18531294B"), BigInt("0xB344C470397BBA52"),
    BigInt("0x65D34954DAF3CEBD"), BigInt("0xB4B81B3FA97511E2"), BigInt("0xB422061193D6F6A7"), BigInt("0x071582401C38434D"),
    BigInt("0x7A13F18BBEDC4FF5"), BigInt("0xBC4097B116C524D2"), BigInt("0x59B97885E2F2EA28"), BigInt("0x99170A5DC3115544"),
    BigInt("0x6F423357E7C6A9F9"), BigInt("0x325928EE6E6F8794"), BigInt("0xD0E4366228B03343"), BigInt("0x565C31F7DE89EA27"),
    BigInt("0x30F5611484119414"), BigInt("0xD873DB391292ED4F"), BigInt("0x7BD94E1D8E17DEBC"), BigInt("0xC7D9F16864A76E94"),
    BigInt("0x947AE053EE56E63C"), BigInt("0xC8C93882F9475F5F"), BigInt("0x3A9BF55BA91F81CA"), BigInt("0xD9A11FBB3D9808E4"),
    BigInt("0x0FD22063EDC29FCA"), BigInt("0xB3F256D8ACA0B0B9"), BigInt("0xB03031A8B4516E84"), BigInt("0x35DD37D5871448AF"),
    BigInt("0xE9F6082B05542E4E"), BigInt("0xEBFAFA33D7254B59"), BigInt("0x9255ABB50D532280"), BigInt("0xB9AB4CE57F2D34F3"),
    BigInt("0x693501D628297551"), BigInt("0xC62C58F97DD949BF"), BigInt("0xCD454F8F19C5126A"), BigInt("0xBBE83F4ECC2BDECB"),
    BigInt("0xDC842B7E2819E230"), BigInt("0xBA89142E007503B8"), BigInt("0xA3BC941D0A5061CB"), BigInt("0xE9F6760E32CD8021"),
    BigInt("0x09C7E552BC76492F"), BigInt("0x852F54934DA55CC9"), BigInt("0x8107FCCF064FCF56"), BigInt("0x098954D51FFF6580"),
    BigInt("0x23B70EDB1955C4BF"), BigInt("0xC330DE426430F69D"), BigInt("0x4715ED43E8A45C0A"), BigInt("0xA8D7E4DAB780A08D"),
    BigInt("0x0572B974F03CE0BB"), BigInt("0xB57D2E985E1419C7"), BigInt("0xE8D9ECBE2CF3D73F"), BigInt("0x2FE4B17170E59750"),
    BigInt("0x11317BA87905E790"), BigInt("0x7FBF21EC8A1F45EC"), BigInt("0x1725CABFCB045B00"), BigInt("0x964E915CD5E2B207"),
    BigInt("0x3E2B8BCBF016D66D"), BigInt("0xBE7444E39328A0AC"), BigInt("0xF85B2B4FBCDE44B7"), BigInt("0x49353FEA39BA63B1"),
    BigInt("0x1DD01AAFCD53486A"), BigInt("0x1FCA8A92FD719F85"), BigInt("0xFC7C95D827357AFA"), BigInt("0x18A6A990C8B35EBD"),
    BigInt("0xCCCB7005C6B9C28D"), BigInt("0x3BDBB92C43B17F26"), BigInt("0xAA70B5B4F89695A2"), BigInt("0xE94C39A54A98307F"),
    BigInt("0xB7A0B174CFF6F36E"), BigInt("0xD4DBA84729AF48AD"), BigInt("0x2E18BC1AD9704A68"), BigInt("0x2DE0966DAF2F8B1C"),
    BigInt("0xB9C11D5B1E43A07E"), BigInt("0x64972D68DEE33360"), BigInt("0x94628D38D0C20584"), BigInt("0xDBC0D2B6AB90A559"),
    BigInt("0xD2733C4335C6A72F"), BigInt("0x7E75D99D94A70F4D"), BigInt("0x6CED1983376FA72B"), BigInt("0x97FCAACBF030BC24"),
    BigInt("0x7B77497B32503B12"), BigInt("0x8547EDDFB81CCB94"), BigInt("0x79999CDFF70902CB"), BigInt("0xCFFE1939438E9B24"),
    BigInt("0x829626E3892D95D7"), BigInt("0x92FAE24291F2B3F1"), BigInt("0x63E22C147B9C3403"), BigInt("0xC678B6D860284A1C"),
    BigInt("0x5873888850659AE7"), BigInt("0x0981DCD296A8736D"), BigInt("0x9F65789A6509A440"), BigInt("0x9FF38FED72E9052F"),
    BigInt("0xE479EE5B9930578C"), BigInt("0xE7F28ECD2D49EECD"), BigInt("0x56C074A581EA17FE"), BigInt("0x5544F7D774B14AEF"),
    BigInt("0x7B3F0195FC6F290F"), BigInt("0x12153635B2C0CF57"), BigInt("0x7F5126DBBA5E0CA7"), BigInt("0x7A76956C3EAFB413"),
    BigInt("0x3D5774A11D31AB39"), BigInt("0x8A1B083821F40CB4"), BigInt("0x7B4A38E32537DF62"), BigInt("0x950113646D1D6E03"),
    BigInt("0x4DA8979A0041E8A9"), BigInt("0x3BC36E078F7515D7"), BigInt("0x5D0A12F27AD310D1"), BigInt("0x7F9D1A2E1EBE1327"),
    BigInt("0xDA3A361B1C5157B1"), BigInt("0xDCDD7D20903D0C25"), BigInt("0x36833336D068F707"), BigInt("0xCE68341F79893389"),
    BigInt("0xAB9090168DD05F34"), BigInt("0x43954B3252DC25E5"), BigInt("0xB438C2B67F98E5E9"), BigInt("0x10DCD78E3851A492"),
    BigInt("0xDBC27AB5447822BF"), BigInt("0x9B3CDB65F82CA382"), BigInt("0xB67B7896167B4C84"), BigInt("0xBFCED1B0048EAC50"),
    BigInt("0xA9119B60369FFEBD"), BigInt("0x1FFF7AC80904BF45"), BigInt("0xAC12FB171817EEE7"), BigInt("0xAF08DA9177DDA93D"),
    BigInt("0x1B0CAB936E65C744"), BigInt("0xB559EB1D04E5E932"), BigInt("0xC37B45B3F8D6F2BA"), BigInt("0xC3A9DC228CAAC9E9"),
    BigInt("0xF3B8B6675A6507FF"), BigInt("0x9FC477DE4ED681DA"), BigInt("0x67378D8ECCEF96CB"), BigInt("0x6DD856D94D259236"),
    BigInt("0xA319CE15B0B4DB31"), BigInt("0x073973751F12DD5E"), BigInt("0x8A8E849EB32781A5"), BigInt("0xE1925C71285279F5"),
    BigInt("0x74C04BF1790C0EFE"), BigInt("0x4DDA48153C94938A"), BigInt("0x9D266D6A1CC0542C"), BigInt("0x7440FB816508C4FE"),
    BigInt("0x13328503DF48229F"), BigInt("0xD6BF7BAEE43CAC40"), BigInt("0x4838D65F6EF6748F"), BigInt("0x1E152328F3318DEA"),
    BigInt("0x8F8419A348F296BF"), BigInt("0x72C8834A5957B511"), BigInt("0xD7A023A73260B45C"), BigInt("0x94EBC8ABCFB56DAE"),
    BigInt("0x9FC10D0F989993E0"), BigInt("0xDE68A2355B93CAE6"), BigInt("0xA44CFE79AE538BBE"), BigInt("0x9D1D84FCCE371425"),
    BigInt("0x51D2B1AB2DDFB636"), BigInt("0x2FD7E4B9E72CD38C"), BigInt("0x65CA5B96B7552210"), BigInt("0xDD69A0D8AB3B546D"),
    BigInt("0x604D51B25FBF70E2"), BigInt("0x73AA8A564FB7AC9E"), BigInt("0x1A8C1E992B941148"), BigInt("0xAAC40A2703D9BEA0"),
    BigInt("0x764DBEAE7FA4F3A6"), BigInt("0x1E99B96E70A9BE8B"), BigInt("0x2C5E9DEB57EF4743"), BigInt("0x3A938FEE32D29981"),
    BigInt("0x26E6DB8FFDF5ADFE"), BigInt("0x469356C504EC9F9D"), BigInt("0xC8763C5B08D1908C"), BigInt("0x3F6C6AF859D80055"),
    BigInt("0x7F7CC39420A3A545"), BigInt("0x9BFB227EBDF4C5CE"), BigInt("0x89039D79D6FC5C5C"), BigInt("0x8FE88B57305E2AB6"),
    BigInt("0xA09E8C8C35AB96DE"), BigInt("0xFA7E393983325753"), BigInt("0xD6B6D0ECC617C699"), BigInt("0xDFEA21EA9E7557E3"),
    BigInt("0xB67C1FA481680AF8"), BigInt("0xCA1E3785A9E724E5"), BigInt("0x1CFC8BED0D681639"), BigInt("0xD18D8549D140CAEA"),
    BigInt("0x4ED0FE7E9DC91335"), BigInt("0xE4DBF0634473F5D2"), BigInt("0x1761F93A44D5AEFE"), BigInt("0x53898E4C3910DA55"),
    BigInt("0x734DE8181F6EC39A"), BigInt("0x2680B122BAA28D97"), BigInt("0x298AF231C85BAFAB"), BigInt("0x7983EED3740847D5"),
    BigInt("0x66C1A2A1A60CD889"), BigInt("0x9E17E49642A3E4C1"), BigInt("0xEDB454E7BADC0805"), BigInt("0x50B704CAB602C329"),
    BigInt("0x4CC317FB9CDDD023"), BigInt("0x66B4835D9EAFEA22"), BigInt("0x219B97E26FFC81BD"), BigInt("0x261E4E4C0A333A9D"),
    BigInt("0x1FE2CCA76517DB90"), BigInt("0xD7504DFA8816EDBB"), BigInt("0xB9571FA04DC089C8"), BigInt("0x1DDC0325259B27DE"),
    BigInt("0xCF3F4688801EB9AA"), BigInt("0xF4F5D05C10CAB243"), BigInt("0x38B6525C21A42B0E"), BigInt("0x36F60E2BA4FA6800"),
    BigInt("0xEB3593803173E0CE"), BigInt("0x9C4CD6257C5A3603"), BigInt("0xAF0C317D32ADAA8A"), BigInt("0x258E5A80C7204C4B"),
    BigInt("0x8B889D624D44885D"), BigInt("0xF4D14597E660F855"), BigInt("0xD4347F66EC8941C3"), BigInt("0xE699ED85B0DFB40D"),
    BigInt("0x2472F6207C2D0484"), BigInt("0xC2A1E7B5B459AEB5"), BigInt("0xAB4F6451CC1D45EC"), BigInt("0x63767572AE3D6174"),
    BigInt("0xA59E0BD101731A28"), BigInt("0x116D0016CB948F09"), BigInt("0x2CF9C8CA052F6E9F"), BigInt("0x0B090A7560A968E3"),
    BigInt("0xABEEDDB2DDE06FF1"), BigInt("0x58EFC10B06A2068D"), BigInt("0xC6E57A78FBD986E0"), BigInt("0x2EAB8CA63CE802D7"),
    BigInt("0x14A195640116F336"), BigInt("0x7C0828DD624EC390"), BigInt("0xD74BBE77E6116AC7"), BigInt("0x804456AF10F5FB53"),
    BigInt("0xEBE9EA2ADF4321C7"), BigInt("0x03219A39EE587A30"), BigInt("0x49787FEF17AF9924"), BigInt("0xA1E9300CD8520548"),
    BigInt("0x5B45E522E4B1B4EF"), BigInt("0xB49C3B3995091A36"), BigInt("0xD4490AD526F14431"), BigInt("0x12A8F216AF9418C2"),
    BigInt("0x001F837CC7350524"), BigInt("0x1877B51E57A764D5"), BigInt("0xA2853B80F17F58EE"), BigInt("0x993E1DE72D36D310"),
    BigInt("0xB3598080CE64A656"), BigInt("0x252F59CF0D9F04BB"), BigInt("0xD23C8E176D113600"), BigInt("0x1BDA0492E7E4586E"),
    BigInt("0x21E0BD5026C619BF"), BigInt("0x3B097ADAF088F94E"), BigInt("0x8D14DEDB30BE846E"), BigInt("0xF95CFFA23AF5F6F4"),
    BigInt("0x3871700761B3F743"), BigInt("0xCA672B91E9E4FA16"), BigInt("0x64C8E531BFF53B55"), BigInt("0x241260ED4AD1E87D"),
    BigInt("0x106C09B972D2E822"), BigInt("0x7FBA195410E5CA30"), BigInt("0x7884D9BC6CB569D8"), BigInt("0x0647DFEDCD894A29"),
    BigInt("0x63573FF03E224774"), BigInt("0x4FC8E9560F91B123"), BigInt("0x1DB956E450275779"), BigInt("0xB8D91274B9E9D4FB"),
    BigInt("0xA2EBEE47E2FBFCE1"), BigInt("0xD9F1F30CCD97FB09"), BigInt("0xEFED53D75FD64E6B"), BigInt("0x2E6D02C36017F67F"),
    BigInt("0xA9AA4D20DB084E9B"), BigInt("0xB64BE8D8B25396C1"), BigInt("0x70CB6AF7C2D5BCF0"), BigInt("0x98F076A4F7A2322E"),
    BigInt("0xBF84470805E69B5F"), BigInt("0x94C3251F06F90CF3"), BigInt("0x3E003E616A6591E9"), BigInt("0xB925A6CD0421AFF3"),
    BigInt("0x61BDD1307C66E300"), BigInt("0xBF8D5108E27E0D48"), BigInt("0x240AB57A8B888B20"), BigInt("0xFC87614BAF287E07"),
    BigInt("0xEF02CDD06FFDB432"), BigInt("0xA1082C0466DF6C0A"), BigInt("0x8215E577001332C8"), BigInt("0xD39BB9C3A48DB6CF"),
    BigInt("0x2738259634305C14"), BigInt("0x61CF4F94C97DF93D"), BigInt("0x1B6BACA2AE4E125B"), BigInt("0x758F450C88572E0B"),
    BigInt("0x959F587D507A8359"), BigInt("0xB063E962E045F54D"), BigInt("0x60E8ED72C0DFF5D1"), BigInt("0x7B64978555326F9F"),
    BigInt("0xFD080D236DA814BA"), BigInt("0x8C90FD9B083F4558"), BigInt("0x106F72FE81E2C590"), BigInt("0x7976033A39F7D952"),
    BigInt("0xA4EC0132764CA04B"), BigInt("0x733EA705FAE4FA77"), BigInt("0xB4D8F77BC3E56167"), BigInt("0x9E21F4F903B33FD9"),
    BigInt("0x9D765E419FB69F6D"), BigInt("0xD30C088BA61EA5EF"), BigInt("0x5D94337FBFAF7F5B"), BigInt("0x1A4E4822EB4D7A59"),
    BigInt("0x6FFE73E81B637FB3"), BigInt("0xDDF957BC36D8B9CA"), BigInt("0x64D0E29EEA8838B3"), BigInt("0x08DD9BDFD96B9F63"),
    BigInt("0x087E79E5A57D1D13"), BigInt("0xE328E230E3E2B3FB"), BigInt("0x1C2559E30F0946BE"), BigInt("0x720BF5F26F4D2EAA"),
    BigInt("0xB0774D261CC609DB"), BigInt("0x443F64EC5A371195"), BigInt("0x4112CF68649A260E"), BigInt("0xD813F2FAB7F5C5CA"),
    BigInt("0x660D3257380841EE"), BigInt("0x59AC2C7873F910A3"), BigInt("0xE846963877671A17"), BigInt("0x93B633ABFA3469F8"),
    BigInt("0xC0C0F5A60EF4CDCF"), BigInt("0xCAF21ECD4377B28C"), BigInt("0x57277707199B8175"), BigInt("0x506C11B9D90E8B1D"),
    BigInt("0xD83CC2687A19255F"), BigInt("0x4A29C6465A314CD1"), BigInt("0xED2DF21216235097"), BigInt("0xB5635C95FF7296E2"),
    BigInt("0x22AF003AB672E811"), BigInt("0x52E762596BF68235"), BigInt("0x9AEBA33AC6ECC6B0"), BigInt("0x944F6DE09134DFB6"),
    BigInt("0x6C47BEC883A7DE39"), BigInt("0x6AD047C430A12104"), BigInt("0xA5B1CFDBA0AB4067"), BigInt("0x7C45D833AFF07862"),
    BigInt("0x5092EF950A16DA0B"), BigInt("0x9338E69C052B8E7B"), BigInt("0x455A4B4CFE30E3F5"), BigInt("0x6B02E63195AD0CF8"),
    BigInt("0x6B17B224BAD6BF27"), BigInt("0xD1E0CCD25BB9C169"), BigInt("0xDE0C89A556B9AE70"), BigInt("0x50065E535A213CF6"),
    BigInt("0x9C1169FA2777B874"), BigInt("0x78EDEFD694AF1EED"), BigInt("0x6DC93D9526A50E68"), BigInt("0xEE97F453F06791ED"),
    BigInt("0x32AB0EDB696703D3"), BigInt("0x3A6853C7E70757A7"), BigInt("0x31865CED6120F37D"), BigInt("0x67FEF95D92607890"),
    BigInt("0x1F2B1D1F15F6DC9C"), BigInt("0xB69E38A8965C6B65"), BigInt("0xAA9119FF184CCCF4"), BigInt("0xF43C732873F24C13"),
    BigInt("0xFB4A3D794A9A80D2"), BigInt("0x3550C2321FD6109C"), BigInt("0x371F77E76BB8417E"), BigInt("0x6BFA9AAE5EC05779"),
    BigInt("0xCD04F3FF001A4778"), BigInt("0xE3273522064480CA"), BigInt("0x9F91508BFFCFC14A"), BigInt("0x049A7F41061A9E60"),
    BigInt("0xFCB6BE43A9F2FE9B"), BigInt("0x08DE8A1C7797DA9B"), BigInt("0x8F9887E6078735A1"), BigInt("0xB5B4071DBFC73A66"),
    BigInt("0x230E343DFBA08D33"), BigInt("0x43ED7F5A0FAE657D"), BigInt("0x3A88A0FBBCB05C63"), BigInt("0x21874B8B4D2DBC4F"),
    BigInt("0x1BDEA12E35F6A8C9"), BigInt("0x53C065C6C8E63528"), BigInt("0xE34A1D250E7A8D6B"), BigInt("0xD6B04D3B7651DD7E"),
    BigInt("0x5E90277E7CB39E2D"), BigInt("0x2C046F22062DC67D"), BigInt("0xB10BB459132D0A26"), BigInt("0x3FA9DDFB67E2F199"),
    BigInt("0x0E09B88E1914F7AF"), BigInt("0x10E8B35AF3EEAB37"), BigInt("0x9EEDECA8E272B933"), BigInt("0xD4C718BC4AE8AE5F"),
    BigInt("0x81536D601170FC20"), BigInt("0x91B534F885818A06"), BigInt("0xEC8177F83F900978"), BigInt("0x190E714FADA5156E"),
    BigInt("0xB592BF39B0364963"), BigInt("0x89C350C893AE7DC1"), BigInt("0xAC042E70F8B383F2"), BigInt("0xB49B52E587A1EE60"),
    BigInt("0xFB152FE3FF26DA89"), BigInt("0x3E666E6F69AE2C15"), BigInt("0x3B544EBE544C19F9"), BigInt("0xE805A1E290CF2456"),
    BigInt("0x24B33C9D7ED25117"), BigInt("0xE74733427B72F0C1"), BigInt("0x0A804D18B7097475"), BigInt("0x57E3306D881EDB4F"),
    BigInt("0x4AE7D6A36EB5DBCB"), BigInt("0x2D8D5432157064C8"), BigInt("0xD1E649DE1E7F268B"), BigInt("0x8A328A1CEDFE552C"),
    BigInt("0x07A3AEC79624C7DA"), BigInt("0x84547DDC3E203C94"), BigInt("0x990A98FD5071D263"), BigInt("0x1A4FF12616EEFC89"),
    BigInt("0xF6F7FD1431714200"), BigInt("0x30C05B1BA332F41C"), BigInt("0x8D2636B81555A786"), BigInt("0x46C9FEB55D120902"),
    BigInt("0xCCEC0A73B49C9921"), BigInt("0x4E9D2827355FC492"), BigInt("0x19EBB029435DCB0F"), BigInt("0x4659D2B743848A2C"),
    BigInt("0x963EF2C96B33BE31"), BigInt("0x74F85198B05A2E7D"), BigInt("0x5A0F544DD2B1FB18"), BigInt("0x03727073C2E134B1"),
    BigInt("0xC7F6AA2DE59AEA61"), BigInt("0x352787BAA0D7C22F"), BigInt("0x9853EAB63B5E0B35"), BigInt("0xABBDCDD7ED5C0860"),
    BigInt("0xCF05DAF5AC8D77B0"), BigInt("0x49CAD48CEBF4A71E"), BigInt("0x7A4C10EC2158C4A6"), BigInt("0xD9E92AA246BF719E"),
    BigInt("0x13AE978D09FE5557"), BigInt("0x730499AF921549FF"), BigInt("0x4E4B705B92903BA4"), BigInt("0xFF577222C14F0A3A"),
    BigInt("0x55B6344CF97AAFAE"), BigInt("0xB862225B055B6960"), BigInt("0xCAC09AFBDDD2CDB4"), BigInt("0xDAF8E9829FE96B5F"),
    BigInt("0xB5FDFC5D3132C498"), BigInt("0x310CB380DB6F7503"), BigInt("0xE87FBB46217A360E"), BigInt("0x2102AE466EBB1148"),
    BigInt("0xF8549E1A3AA5E00D"), BigInt("0x07A69AFDCC42261A"), BigInt("0xC4C118BFE78FEAAE"), BigInt("0xF9F4892ED96BD438"),
    BigInt("0x1AF3DBE25D8F45DA"), BigInt("0xF5B4B0B0D2DEEEB4"), BigInt("0x962ACEEFA82E1C84"), BigInt("0x046E3ECAAF453CE9"),
    BigInt("0xF05D129681949A4C"), BigInt("0x964781CE734B3C84"), BigInt("0x9C2ED44081CE5FBD"), BigInt("0x522E23F3925E319E"),
    BigInt("0x177E00F9FC32F791"), BigInt("0x2BC60A63A6F3B3F2"), BigInt("0x222BBFAE61725606"), BigInt("0x486289DDCC3D6780"),
    BigInt("0x7DC7785B8EFDFC80"), BigInt("0x8AF38731C02BA980"), BigInt("0x1FAB64EA29A2DDF7"), BigInt("0xE4D9429322CD065A"),
    BigInt("0x9DA058C67844F20C"), BigInt("0x24C0E332B70019B0"), BigInt("0x233003B5A6CFE6AD"), BigInt("0xD586BD01C5C217F6"),
    BigInt("0x5E5637885F29BC2B"), BigInt("0x7EBA726D8C94094B"), BigInt("0x0A56A5F0BFE39272"), BigInt("0xD79476A84EE20D06"),
    BigInt("0x9E4C1269BAA4BF37"), BigInt("0x17EFEE45B0DEE640"), BigInt("0x1D95B0A5FCF90BC6"), BigInt("0x93CBE0B699C2585D"),
    BigInt("0x65FA4F227A2B6D79"), BigInt("0xD5F9E858292504D5"), BigInt("0xC2B5A03F71471A6F"), BigInt("0x59300222B4561E00"),
    BigInt("0xCE2F8642CA0712DC"), BigInt("0x7CA9723FBB2E8988"), BigInt("0x2785338347F2BA08"), BigInt("0xC61BB3A141E50E8C"),
    BigInt("0x150F361DAB9DEC26"), BigInt("0x9F6A419D382595F4"), BigInt("0x64A53DC924FE7AC9"), BigInt("0x142DE49FFF7A7C3D"),
    BigInt("0x0C335248857FA9E7"), BigInt("0x0A9C32D5EAE45305"), BigInt("0xE6C42178C4BBB92E"), BigInt("0x71F1CE2490D20B07"),
    BigInt("0xF1BCC3D275AFE51A"), BigInt("0xE728E8C83C334074"), BigInt("0x96FBF83A12884624"), BigInt("0x81A1549FD6573DA5"),
    BigInt("0x5FA7867CAF35E149"), BigInt("0x56986E2EF3ED091B"), BigInt("0x917F1DD5F8886C61"), BigInt("0xD20D8C88C8FFE65F"),
    BigInt("0x31D71DCE64B2C310"), BigInt("0xF165B587DF898190"), BigInt("0xA57E6339DD2CF3A0"), BigInt("0x1EF6E6DBB1961EC9"),
    BigInt("0x70CC73D90BC26E24"), BigInt("0xE21A6B35DF0C3AD7"), BigInt("0x003A93D8B2806962"), BigInt("0x1C99DED33CB890A1"),
    BigInt("0xCF3145DE0ADD4289"), BigInt("0xD0E4427A5514FB72"), BigInt("0x77C621CC9FB3A483"), BigInt("0x67A34DAC4356550B"),
    BigInt("0xF8D626AAAF278509"),
];


class staticEval_c {
    psqt: [number, number]; imbalance: [number, number]; pawns: [number, number];
    pieces: [number, number]; pieceValue: [number, number]; mobility: [number, number];
    threat: [number, number]; passed: [number, number]; space: [number, number]; kingSafety: [number, number];

    constructor() {
        this.psqt = [0, 0];
        this.imbalance = [0, 0];
        this.pawns = [0, 0];
        this.pieces = [0, 0];
        this.pieceValue = [0, 0];
        this.mobility = [0, 0];
        this.threat = [0, 0];
        this.passed = [0, 0];
        this.space = [0, 0];
        this.kingSafety = [0, 0];
    }
}

function FILE_RANK_TO_SQUARE(file: number, rank: number): number { return ((21 + (file)) + ((rank) * 10)); }
function SQ64(SQ120: number): number { return (square120ToSquare64[(SQ120)]); }
function SQ120(square64: number): number { return (square64ToSquare120[(square64)]); }
function FLIP64(sq: number): number { return (flip[(sq)]) }

/**
 * Return relative rank based on color pov
 * @param color 
 * @param rank 
 */
const relativeRank = (color: number, rank: number): number => {
    return rank ^ (color * 7);
}

const relativeSquare = (color: number, sq: number): number => {
    return sq ^ (color * 56);
}


const distance = (sq: number, sqq: number): number => {
    return Math.max(
        Math.abs(ranksBoard[SQ120(sq)] - ranksBoard[SQ120(sqq)]),
        Math.abs(filesBoard[SQ120(sq)] - filesBoard[SQ120(sqq)]),
    );
}
const rankOf = (sq64: number): number => {
    return sq64 >> 3;
}
const fileOf = (sq64: number): number => {
    return sq64 & 7;
}
const squareOf = (rank: number, file: number): number => {
    return rank * 8 + file;
}

function clamp(num: number, min: number, max: number): number {
    return Math.max(min, Math.min(num, max));
}

const filesBoard = new Array<number>(BOARD_SQUARE_NUM);
const ranksBoard = new Array<number>(BOARD_SQUARE_NUM);

// functions
// Export each of these functions so that you can test each of them individually 
function initializeFilesRankArray() {
    for (let i = 0; i < BOARD_SQUARE_NUM; i++) {
        filesBoard[i] = Squares.OFF_BOARD;
        ranksBoard[i] = Squares.OFF_BOARD;
    }
    for (let rank = Ranks.FIRST_RANK; rank <= Ranks.EIGHTH_RANK; ++rank) {
        for (let file = Files.A_FILE; file <= Files.H_FILE; ++file) {
            const square_120 = FILE_RANK_TO_SQUARE(file, rank);
            filesBoard[square_120] = file;
            ranksBoard[square_120] = rank;
        }
    }
}
function initializeSquare120ToSquare64() {
    let sq_64 = 0;
    let i, rank, file;
    for (i = 0; i < BOARD_SQUARE_NUM; ++i) {
        square120ToSquare64[i] = 65;
    }
    for (i = 0; i < 64; ++i) {
        square64ToSquare120[i] = 120;

    }

    for (rank = Ranks.FIRST_RANK; rank <= Ranks.EIGHTH_RANK; ++rank) {
        for (file = Files.A_FILE; file <= Files.H_FILE; file++) {
            const sq = FILE_RANK_TO_SQUARE(file, rank);
            square64ToSquare120[sq_64] = sq;
            square120ToSquare64[sq] = sq_64;
            sq_64++;
        }
    }
}


function initializeHashKey() {
    for (let flag = 0; flag < 16; flag++) {
        for (let i = 0; i < 4; i++) {
            if ((flag & (1 << i)) !== 0) castle64Hash[flag] ^= random64Poly[randomCastle + i];
        }
    }

    castlePermission.fill(0xF);
    castlePermission[Squares.E1] &= ~Castling.WHITE_CASTLE_OO;
    castlePermission[Squares.H1] &= ~Castling.WHITE_CASTLE_OO;

    castlePermission[Squares.E1] &= ~Castling.WHITE_CASTLE_OOO;
    castlePermission[Squares.A1] &= ~Castling.WHITE_CASTLE_OOO;

    castlePermission[Squares.E8] &= ~Castling.BLACK_CASTLE_OO;
    castlePermission[Squares.H8] &= ~Castling.BLACK_CASTLE_OO;

    castlePermission[Squares.E8] &= ~Castling.BLACK_CASTLE_OOO;
    castlePermission[Squares.A8] &= ~Castling.BLACK_CASTLE_OOO;
}


function init(): void {
    initializeSquare120ToSquare64();
    initializeHashKey();
    initializeFilesRankArray();
}


function getTimeMs(): number {
    return new Date().getTime();
}

function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}


export {
    START_FEN,
    NAME,
    VERSION,
    AUTHOR,
    CHECKMATE,
    TBWIN,
    INFINITE,
    NO_VALUE,
    MAX_PLY,
    MAX_MOVES,
    SQUARE_NB,
    BOARD_SQUARE_NUM,
    COLOUR_NB,
    getColorPiece,
    square64ToSquare120,
    square120ToSquare64,
    castlePermission,
    pieceToAscii,
    pieceToUnicode,
    castle64Hash,
    isBigPiece,
    isMajorPiece,
    isMinorPiece,
    isPawn,
    isKnight,
    isBishop,
    isKing,
    isQueen,
    is_rook,
    isRookOrQueen,
    isBishopOrQueen,
    isSlidePiece,
    isWhitePiece,
    getValuePiece,
    getPolyPiece,
    isColorBishop,
    isColorKnight,
    isColorRook,
    isColorQueen,
    isColorPawn,
    flip,
    filesBoard,
    ranksBoard,
    pieceAnsi,
    squareAnsi,
    randomPiece,
    randomCastle,
    randomEnpass,
    randomTurn,
    random64Poly,

    staticEval_c,
    Phase,
    LRUCache,
    Castling,
    Colors,
    Files,
    Ranks,
    PieceType,
    Pieces,
    Squares,

    bufferToArrayBuffer,
    getTimeMs,
    init,
    clamp,
    relativeRank,
    relativeSquare,
    distance,
    rankOf,
    fileOf,
    squareOf,
    isOfType,
    FILE_RANK_TO_SQUARE,
    SQ120,
    SQ64,
    FLIP64,
    SQUARE_ON_BOARD,
    IS_VALID_PIECE,
    SQUARE_COLOR,
    PIECE_INDEX,
    PIECE_COLOR,
    ptToP,
    pToPt,
}
