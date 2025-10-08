/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  transform: {}, // pure JS out of dist, or can use ts-jest later
  testMatch: ["**/*.test.js"],
  verbose: true,
};
