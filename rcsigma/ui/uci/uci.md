# Universal Chess Interface<!-- omit in toc -->
For more information on UCI Protocol, visit [UCIProtocol](http://wbec-ridderkerk.nl/html/UCIProtocol.html).

## Table of Contents<!-- omit in toc -->
- [Building](#building)
  - [raccoon:](#raccoon)
    - [Javascript: `raccoon-uci.js`](#javascript-raccoon-ucijs)
  - [raccoonZero:](#raccoonzero)
- [Usage](#usage)
  - [raccoon:](#raccoon-1)
  - [raccoonZero:](#raccoonzero-1)
- [Configuration](#configuration)

## Building
### raccoon:
#### Javascript: `raccoon-uci.js`

### raccoonZero:
TODO

## Usage
### raccoon:
`raccoon` is not a complete chess program and requires a UCI-compatible graphical user interface (GUI) (e.g. Shredder, XBoard with PolyGlot, Scid, Cute Chess, eboard, Arena, Sigma Chess, Chess Partner or Fritz) in order to be used comfortably. Read the documentation for your GUI of choice for information on how to use chess engine wih it.
For instance, if `raccoon` is compiled into a JavaScript UCI chess engine as  `raccoon-uci.js`, you can use a worker to run this engine.

```js
let raccoon = new Worker('raccoon-uci.js');

raccoon.onmessage = function (e) {
  console.log(e.data); // e.data is the message recieved from the engine
};

/* send UCI commands as in below */
raccoon.postMessage('uci');         
raccoon.postMessage('ucinewgame'); 
raccoon.postMessage('position startpos');
raccoon.postMessage('go depth 10'); 
```
And excellent chess grapical interface to use with the engine is [chessboard.js](http://chessboardjs.com)

### raccoonZero:


## Configuration
TODO