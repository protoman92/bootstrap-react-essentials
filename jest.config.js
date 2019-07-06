module.exports = {
  roots: ["<rootDir>", "<rootDir>/src"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  testRegex: ".*.(test|spec)\\.(jsx?|tsx?)$",
  collectCoverage: true,
  modulePaths: ["src"],
  setupFiles: ["<rootDir>/setupTests.js"]
};
