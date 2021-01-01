# Application Programming Interface<!-- omit in toc -->

To use `rcSigma` as a JavaScript chess library, It MUST be built and configure to point to one of the engines. As at now, only `raccoon` engine is supported.

## Table of Contents<!-- omit in toc -->

- [Building](#building)
- [Usage](#usage)
- [API](#api)
  - [Constructor: Raccoon(config?)](#constructor-raccoonconfig)
  - [.load(FEN)](#loadfen)

## Building

Please see [Getting Started Guide](../../../docs/getting_started_guide.md)

## Usage

The code below will randomely plays a complete game of chess.

```js
let { Raccoon } = require("./raccoon.api.js");
let raccoon = new Raccoon();

while (!raccoon.gameOver()) {
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
  evaluateFN: "raccoonEvaluate" /* Default */,
  startFEN:
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" /* Default */,
  bookFile: "pathTochess_book/<book_name>.bin",
  nnue_file: "pathTonnue_file/<book_name>.nnue",
};
```

- `evaluateFN`: is the evaluation function that will be used while searching for best move. The other choice is `"raccoonZeroEvaluate"`. If this is specified, you MUST also provide `nnue_file`. See [README](../../../README.md) for more information
- `startFEN`: is the the board configuration in [Forsyth-Edwards Notation](http://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation)
- `book_path`: is the path to a chess book. If not provided, engine calculates opening moves instead of playing book moves.
- `nnue_file`: is the path to the the NNUE evaluation parameters(for instance, `nn-c157e0a5755b.nnue`). ONLY provided when `evaluateFN` is `"raccoonZeroEvaluate"`

### Constructor: Raccoon(config?)

The Raccoon() constructor takes an optional parameter which specifies the configuration of `raccoon`.

```js
// Raccoon is configured to the default values explained above when called without a parameter
let raccoon = new Raccoon();

let raccoon = new Raccoon({
  evaluateFN: "raccoonZeroEvaluate",
  startFEN:
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

#### ANSI Color

[MORE INFO](https://github.com/drudru/ansi_up)

<details>
   <summary>Ansi Square Color Table</summary>
   <ul>
      <li>Background Black: \u001b[40m</li>
      <li>Background Red: \u001b[41m</li>
      <li>Background Green: \u001b[42m</li>
      <li>Background Yellow: \u001b[43m</li>
      <li>Background Blue: \u001b[44m</li>
      <li>Background Magenta: \u001b[45m</li>
      <li>Background Cyan: \u001b[46m</li>
      <li>Background White: \u001b[47m</li>
   </ul>
   <ul>
      <li>Background Bright Black: \u001b[40;1m</li>
      <li>Background Bright Red: \u001b[41;1m</li>
      <li>Background  Bright Green: \u001b[42;1m</li>
      <li>Background Bright Yellow: \u001b[43;1m</li>
      <li>Background Bright Blue: \u001b[44;1m</li>
      <li>Background Bright Magenta: \u001b[45;1m</li>
      <li>Background Bright Cyan: \u001b[46;1m</li>
      <li>Background Bright White: \u001b[47;1m</li>
   </ul>
</details>
<details>
   <summary>Ansi Piece Color Table</summary>
   <ul>
      <li>Black: \u001b[30m</li>
      <li>Red: \u001b[31m</li>
      <li>Green: \u001b[32m</li>
      <li>Yellow: \u001b[33m</li>
      <li>Blue: \u001b[34m</li>
      <li>Magenta: \u001b[35m</li>
      <li>Cyan: \u001b[36m</li>
      <li>White: \u001b[37m</li>
   </ul>
   <ul>
      <li>Bright Black: \u001b[30;1m</li>
      <li>Bright Red: \u001b[31;1m</li>
      <li>Bright Green: \u001b[32;1m</li>
      <li>Bright Yellow: \u001b[33;1m</li>
      <li>Bright Blue: \u001b[34;1m</li>
      <li>Bright Magenta: \u001b[35;1m</li>
      <li>Bright Cyan: \u001b[36;1m</li>
      <li>Bright White: \u001b[37;1m</li>
   </ul>
</details>
