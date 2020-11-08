# Application Programming Interface<!-- omit in toc -->
To use `rcSigma` as a JavaScript chess library, It MUST be built and configure to point to one of the engines. As at now, only `raccoon` engine is supported.

## Table of Contents<!-- omit in toc -->
- [Building](#building)
- [Usage](#usage)
- [API](#api)

## Building
 `raccoon-api.js`
 TODO

## Usage
The code below will randomely plays a complete game of chess.

```js
let { Raccoon } = require('./raccoon-api.js');
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
TODO