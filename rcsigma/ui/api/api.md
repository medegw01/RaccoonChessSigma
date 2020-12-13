# Application Programming Interface<!-- omit in toc -->

To use `rcSigma` as a JavaScript chess library, It MUST be built and configure to point to one of the engines. As at now, only `raccoon` engine is supported.

## Table of Contents<!-- omit in toc -->

- [Building](#building)
- [Usage](#usage)
- [API](#api)
  - [Constructor: Raccoon(config?)](#constructor-raccoonconfig)
  - [.load(FEN)](#loadfen)

## Building

`raccoon-api.js`
TODO

## Usage

The code below will randomely plays a complete game of chess.

```js
let { Raccoon } = require("./raccoon-api.js");
let raccoon = new Raccoon();

while (!raccoon.game_over()) {
  let moves = raccoon.moves();
  let move = moves[Math.floor(Math.random() * moves.length)];
  raccoon.move(move);
  console.log(raccoon.ascii());
}
```

See [Chess Library](#api) for more APIs

## API

Although it is optional, **RaccoonChessSigma** can be configured with the following object:

```js
config = {
  evaluate_fn: "raccoon_evaluate" /* Default */,
  start_fen:
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" /* Default */,
  book_file: "path_to_chess_book/<book_name>.bin",
  nnue_file: "path_to_nnue_file/<book_name>.nnue",
};
```

- `evaluate_fn`: is the evaluation function that will be used while searching for best move. The other choice is `"raccoonZero_evaluate"`. If this is specified, you MUST also provide `nnue_file`. See [README](../../../README.md) for more information
- `start_fen`: is the the board configuration in [Forsyth-Edwards Notation](http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- `book_path`: is the path to a chess book. If not provided, engine calculates opening moves instead of playing book moves.
- `nnue_file`: is the path to the the NNUE evaluation parameters(for instance, `nn-c157e0a5755b.nnue`). ONLY provided when `evaluate_fn` is `"raccoonZero_evaluate"`

### Constructor: Raccoon(config?)

The Raccoon() constructor takes an optional parameter which specifies the configuration of `raccoon`.

```js
// Raccoon is configured to the default values explained above when called without a parameter
let raccoon = new Raccoon();

let raccoon = new Raccoon({
  evaluate_fn: "raccoonZero_evaluate",
  start_fen:
    "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
  nnue_file: "lol.nnue",
});
```

### .load(FEN)

Clear the board and set the position to `FEN`. Returns `{value: true, error: "No error!"}` if the position was
successfully loaded, otherwise `{value: false, error: "the-specific-error-message"}`.

```js
let raccoon = new Raccoon();
raccoon.load("8/b7/B7/8/8/8/8/k6K w - - 0 1");
// <. {value: true, error: "No error!"}

raccoon.load("8/T7/B7/8/8/8/8/k6K w - - 0 1");
// => {value: false, error: "Illegal character T"}
```
