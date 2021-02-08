<h1 align="center">RaccoonChessSigma</h1>
<p align="center">
  <img width="300" src="https://raw.githubusercontent.com/medegw01/RaccoonChessSigma-website/main/static/img/rcsigma%20logo.png">
  <br/>
  ♔ ♕ ♖ ♗ ♘ ♙<br/>
  TypeScript Chess Library and Engine
</p>

<p align="center">
    <a href="https://github.com/medegw01/RaccoonChessSigma/actions" ><img alt="GitHub Workflow Status (branch)" src="https://img.shields.io/github/workflow/status/medegw01/RaccoonChessSigma/CLI%20Build/main?logo=GitHUB"></a>
    <a href='https://coveralls.io/github/medegw01/RaccoonChessSigma?branch=main'><img src='https://coveralls.io/repos/github/medegw01/RaccoonChessSigma/badge.svg?branch=main' alt='Coverage Status' /></a>
    <a href="https://github.com/medegw01/RaccoonChessSigma/blob/main/LICENSE" ><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
    <a href="https://github.com/medegw01/RaccoonChessSigma/releases/latest" ><img alt="GitHub release (latest by date including pre-releases)" src="https://img.shields.io/github/v/release/medegw01/RaccoonChessSigma?include_prereleases&label=latest&style=flat"></a>
    <a href="http://www.typescriptlang.org/" ><img alt="TypeScript" src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg"></a> 
    <a href="https://github.com/facebook/jest" ><img alt="tested with jest" src="https://img.shields.io/badge/tested_with-jest-99424f.svg"></a>    
</p>

[RaccoonChessSigma](httSp://rcsigma.org/) is a free, powerful chess engine written in TypeScript. It is primarily inspired by [Vice](https://www.youtube.com/user/BlueFeverSoft/aboutg), [Hakkapeliitta](https://github.com/mAarnos/Hakkapeliitta), [Ethereal](https://github.com/AndyGrant/Ethereal), [Stockfish](https://stockfishchess.org/), [LeelaChessZero](https://lczero.org/), and a number of open source projects and aims to serve as both reference for other authors and a high-end engine.

RaccoonChessSigma evaluates chess positions using either of the following evaluation algorithm:

- [raccoon](./rcsigma/evaluate/rc/rc.md): uses the classical evaluation based on handcrafted terms. It runs efficiently on most CPU architecture
- [raccoonZero](./rcsigma/evaluate/rc0/rc0.md): uses a deep convolutional neural network(NN)

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

To understand project, it's imperative you understand [RaccoonChessSigma architecture](./docs/architecture.md).

## Versioning

RaccoonChessSigma uses `x.y.z` where `x`, `y`, and `z` are integers representing `major.minor.patch`.

- Major is incremented when the release contains breaking changes, all other numbers are set to 0. That is, from `x.y.z` to `{x+1}.0.0`.
- Minor is incremented when the release contains new non-breaking features, patch is set to 0. That is, from `x.y.z` to `x.{y+1}.0`.
- Patch is incremented when the release only contains bugfixes and very minor/trivial features considered necessary. That is, from `x.y.z` to `x.y.{z+1}`.

Please refer to [sematic versioning](https://semver.org/) for more information.
