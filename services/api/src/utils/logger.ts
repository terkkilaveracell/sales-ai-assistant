enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

let currentLogLevel: LogLevel = LogLevel.INFO;

// Set log level dynamically
export const setLogLevel = (level: LogLevel) => {
  currentLogLevel = level;
};

const log = (level: LogLevel, message: string, ...args: any[]) => {
  if (level <= currentLogLevel) {
    const output = level === LogLevel.ERROR ? console.error : console.log;
    output(`[${LogLevel[level]}] ${message}`, ...args);
  }
};

export const logger = {
  info: (message: string, ...args: any[]) =>
    log(LogLevel.INFO, message, ...args),
  warn: (message: string, ...args: any[]) =>
    log(LogLevel.WARN, message, ...args),
  error: (message: string, ...args: any[]) =>
    log(LogLevel.ERROR, message, ...args),
  debug: (message: string, ...args: any[]) =>
    log(LogLevel.DEBUG, message, ...args),
};
