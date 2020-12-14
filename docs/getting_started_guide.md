## Getting Started Guidelines

This document steps through the deployment and configuration of RaccoonChessSigma

### Prerequisites

The following are prerequisites for building and deploying:

- [TypeScript >= 3.2](https://www.typescriptlang.org/) - JavaScript that scales. We need at least version
- [Jest](https://jestjs.io/) - Delightful JavaScript Testing
- [ts-jest](https://kulshekhar.github.io/ts-jest) - Jest processor for TypeScript
- Either:
  - [nodejs >= 13.x](https://github.com/nodesource/distributions)
  - [yarn](https://github.com/yarnpkg/yarn)

The above requirements can be installed as follows:

#### yarn

`yarn add -D typescript ts-loader webpack-cli webpack jest ts-jest @types/jest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-sonarjs`

#### npm

`npm i -D typescript ts-loader webpack-cli webpack jest ts-jest @types/jest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-sonarjs`

### Building RaccoonChessSigma

Document how to fully build new project

### Deploying RaccoonChessSigma

Document how to deploy project if need be

### Testing RaccoonChessSigma

Assuming the perquisites have been installed, from the root directory where the repo was cloned, the unit tests and coverage can be executed as follows:
| | npm | yarn |
|-------------|---------------------|-------------------|
| Unit Test | `npm run test` | `yarn test` |
| Coverage | `npm run coverage` | `yarn coverage` |
