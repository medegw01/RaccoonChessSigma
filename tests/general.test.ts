import * as util_ from '../rcsigma/util'
import * as bitboard_ from '../rcsigma/game/bitboard'
import * as board_ from '../rcsigma/game/board'

describe("General Test", () => {
  util_.init();
  bitboard_.init();

  it("Bitboard pretty", function () {
    const fen = "3qkb2/pppp1ppp/n1b1p2r/4P3/2B2N2/2N5/PPPP1PPP/R3KB1R w KQkq - 2 2";
    const pos = board_.clearBoard();
    board_.fenToBoard(fen, pos);

    const wp = `  +---+---+---+---+---+---+---+---+
8 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
7 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
6 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
5 |   |   |   |   | X |   |   |   | 
  +---+---+---+---+---+---+---+---+
4 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
3 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
2 | X | X | X | X |   | X | X | X | 
  +---+---+---+---+---+---+---+---+
1 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
    a   b   c   d   e   f   g   h
`;

    const bp = `  +---+---+---+---+---+---+---+---+
8 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
7 | X | X | X | X |   | X | X | X | 
  +---+---+---+---+---+---+---+---+
6 |   |   |   |   | X |   |   |   | 
  +---+---+---+---+---+---+---+---+
5 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
4 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
3 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
2 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
1 |   |   |   |   |   |   |   |   | 
  +---+---+---+---+---+---+---+---+
    a   b   c   d   e   f   g   h
`;
    expect(bitboard_.pretty(pos.piecesBB[util_.Pieces.WHITEPAWN])).toBe(wp);
    expect(bitboard_.pretty(pos.piecesBB[util_.Pieces.BLACKPAWN])).toBe(bp);
  });

});

/*
char switchCase(unsigned char c)
{
    return static_cast<char>(std::isupper(c) ? std::tolower(c) : std::toupper(c));
}
std::string flipFenString(const std::string& fen)
{
    std::string f, token;
    std::stringstream ss(fen);

    for (auto i = 0; i < 8; i++)
    {
        std::getline(ss, token, i < 7 ? '/' : ' ');
        std::transform(token.begin(), token.end(), token.begin(), switchCase);
        f.insert(0, token + (i ? "/" : " "));
    }

    ss >> token; // Side to move
    f += (token == "w" ? "b " : "w ");

    ss >> token; // Castling flags
    std::transform(token.begin(), token.end(), token.begin(), switchCase);
    f += token + " ";

    ss >> token; // En-passant square
    f += (token == "-" ? token : token.replace(1, 1, token[1] == '3' ? "6" : "3"));

    std::getline(ss, token); // Full and half moves
    f += token;

    return f;
}

bool Testing::testReversedEval() const
{
    Evaluation evaluation;

    for (const auto& s : positions)
    {
        Position pos(s);
        Position pos2(flipFenString(s));
        const auto score = evaluation.evaluate(pos);
        const auto flippedScore = evaluation.evaluate(pos2);

        if (score != flippedScore)
        {
            return false;
        }
    }

    return true;
}

bool Testing::testPseudoLegal() const
{
    for (const auto& s : positions)
    {
        Position pos(s);
        MoveList moveList, moveList2;
        const auto inCheck = pos.inCheck();

        inCheck ? MoveGen::generateLegalEvasions(pos, moveList)
                : MoveGen::generatePseudoLegalMoves(pos, moveList);

        for (uint16_t i = 0; i < std::numeric_limits<uint16_t>::max(); ++i)
        {
            if (pos.pseudoLegal(i, inCheck))
            {
                moveList2.emplace_back(i);
            }
        }

        if (moveList.size() != moveList2.size())
        {
            return false;
        }
    }

    return true;
}
*/