module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  testRegex: "(/tests/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  testPathIgnorePatterns: ["/lib/", "/node_modules/", "/build"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  coverageReporters: ["json-summary", "lcov", "text"],
  collectCoverageFrom: [
       "rcsigma/**/*.ts", 
       "!rcsigma/**/entrypoint.ts" // entrypoint components have been thoroughly tested already.
    ],
};
