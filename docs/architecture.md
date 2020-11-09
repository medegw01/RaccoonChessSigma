# Architecture

RaccoonChessSigma consists of four microservices. Based on functionalities each of these microservices are further decomposed in to classes. They include:

- User Interface
  - [APIs](./../rcsigma/ui/api/api.md)
  - [UCI](./../rcsigma/ui/uci/uci.md)  
- [Search](#search)
- [Game](#game)
- Evaluate
  - [raccoon](./../rcsigma/evaluate/rc/rc.md)
  - [raccoonZero](./../rcsigma/evaluate/rc0/rc0.md)

## Search

The search will efficiently iterate down the game tree from a position to a specified depth. More information can be found on [Search Chess Programming wiki](https://www.chessprogramming.org/Search). For this projects, the following algorithms will be applied:

- [ ] Transposition table
- [ ] Static Exchange Evaluation(See)
- [ ] Quiescence search
- [ ] Alpha-beta search
  - [ ] Aspiration window
  - [ ] Interactive deepening
  - [ ] Null move reduction
  - [ ] Razoring pruning
  - [ ] Futility pruning
  - [ ] Late Move Reduction
  - [ ] Late move pruning
  - [ ] History futility pruning
- [ ] Move Ordering
  - [ ] Most value victim / Lowest Value Attacker
  - [ ] Killer moves
  - [ ] Butterfly history

## Game

Among others, this component includes the board representation; book or database; move generation or validation; piece placement or movement; check, checkmate, stalemate, and insufficient material detection.

## Diagram

<p align="center">
  <img width="600" src="https://github.com/medegw01/RaccoonChessSigma/blob/main/rcsigma%20diagram.PNG">
  <br/>
</p>

### Key
![#C4D79B](https://placehold.it/15/C4D79B/000000?text=+) — this means "something takes a lot of development (software engineering) time." <br/>
![#8faadc](https://placehold.it/15/8faadc/000000?text=+) — this means "requires considerable amount of computation both on CPU and on GPU." <br/>
![#ffe699](https://placehold.it/15/ffe699/000000?text=+) — this ia a weight file. It is a result of an effort. <br/>

