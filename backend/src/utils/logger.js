export const logger = {
  info: (msg, ...args) => {
    console.log(`\x1b[36m[INFO]\x1b[0m \x1b[90m${new Date().toISOString()}\x1b[0m ${msg}`, ...args);
  },
  success: (msg, ...args) => {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m \x1b[90m${new Date().toISOString()}\x1b[0m ${msg}`, ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`\x1b[33m[WARN]\x1b[0m \x1b[90m${new Date().toISOString()}\x1b[0m ${msg}`, ...args);
  },
  error: (msg, ...args) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m \x1b[90m${new Date().toISOString()}\x1b[0m ${msg}`, ...args);
  }
};
