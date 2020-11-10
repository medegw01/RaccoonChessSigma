[![Build Status](https://travis-ci.org/medegw01/raccoon.js.svg?branch=master)](https://travis-ci.org/medegw01/raccoon.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/medegw01/RaccoonChessSigma/blob/main/LICENSE)

# RaccoonChessSigma

<p align="center">
  <img width="200" src="https://github.com/aerogear/graphback/raw/master/website/static/img/logo.png">
  <br/> 
  ♔ ♕ ♖ ♗ ♘ ♙<br/>
  TypeScript Chess Library and Engine
</p>

[RaccoonChessSigma](httSp://rcsigma.org/) is a free, powerful chess engine written in TypeScript. It is primarily inspired by [Vice](https://www.youtube.com/watch?v=bGAfaepBco4&list=PLZ1QII7yudbc-Ky058TEaOstZHVbT-2hg), [Stockfish](https://stockfishchess.org/), [LeelaChessZero](https://lczero.org/), and a number of open source projects and aims to serve as both reference for other authors and a high-end engine.

RaccoonChessSigma evaluates chess positions using either of the following evaluation algorithm:

* [raccoon](./rcsigma/evaluate/rc/rc.md): uses  the classical evaluation based on handcrafted terms. It runs efficiently on most CPU architecture
* [raccoonZero](./rcsigma/evaluate/rc0/rc0.md): uses a deep convolutional neural network(NN)

By following the [Getting Started Guide](./docs/getting_started_guide.md), a user can utilize either of the engines as a [UCI-compliant Chess Engine](./rcsigma/ui/uci/uci.md) or as an extensive [JavaScript Chess Library](./rcsigma/ui/api/api.md).  

## Table of Contents

- [Code of Conduct](./docs/code_of_conduct.md)
- Guides
  - [Maintainers Guide](./docs/maintainers.md)
  - [Contributing Guide](./docs/contributing.md)
  - [Getting Started Guide](./docs/getting_started_guide.md)
- [Development](#development)
- [Architecture](./docs/architecture.md)
- [Versioning](#versioning)
- [Security](./docs/security.md) 

## Development

TODO

## Architecture
To understand project, it's imperative you understand the [architecture](./docs/architecture.md)

## Versioning
RaccoonChessSigma uses `x.y.z` where `x`, `y`, and `z` are integers representing `major.minor.patch`.

* Major is incremented when the release contains breaking changes, all other numbers are set to 0. That is, from `x.y.z` to `{x+1}.0.0`.
* Minor is incremented when the release contains new non-breaking features, patch is set to 0. That is, from `x.y.z` to `x.{y+1}.0`.
* Patch is incremented when the release only contains bugfixes and very minor/trivial features considered necessary. That is, from `x.y.z` to `x.y.{z+1}`.

Please refer to [sematic versioning](https://semver.org/) for more information.
