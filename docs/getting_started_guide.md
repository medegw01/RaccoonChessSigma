## Getting Started Guidelines

This document steps through the deployment and configuration of RaccoonChessSigma

### Prerequisites

The following are prerequisites for building and deploying:

- [TypeScript >= 3.2](https://www.typescriptlang.org/) - JavaScript that scales. We need at least version
- [Jest](https://jestjs.io/) - Delightful JavaScript Testing
- [ts-jest](https://kulshekhar.github.io/ts-jest) - Jest processor for TypeScript

Either [nodejs >= 13.x](https://github.com/nodesource/distributions) or [yarn](https://github.com/yarnpkg/yarn) is need for developing this project. When either package manager has been installed, the above requirements can be installed by running either of the following:

|      | command                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| npm  | `npm i -D typescript ts-loader webpack-cli webpack jest ts-jest @types/jest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-sonarjs`    |
| yarn | `yarn add -D typescript ts-loader webpack-cli webpack jest ts-jest @types/jest eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-plugin-sonarjs` |

### Building RaccoonChessSigma

RaccoonChessSigma can be built and used as a [UCI-compliant Chess Engine](./rcsigma/ui/uci/uci.md) or as an extensive [JavaScript Chess Library](./rcsigma/ui/api/api.md).
If the perquisites have been installed, from the root directory where the repo was cloned, the execute:

#### JavaScript Chess Library

|       | npm                 | yarn             |
| ----- | ------------------- | ---------------- |
| Build | `npm run build:api` | `yarn build:api` |

The above script will create `raccoon-api.js` in `/build`. [See Usage](./rcsigma/ui/api/api.md) for more info.

### Deploying RaccoonChessSigma

Document how to deploy project if need be

### Testing RaccoonChessSigma

Assuming the perquisites have been installed, from the root directory where the repo was cloned, the unit tests and coverage can be executed as follows:

|           | npm                | yarn            |
| --------- | ------------------ | --------------- |
| Unit Test | `npm run test`     | `yarn test`     |
| Coverage  | `npm run coverage` | `yarn coverage` |
