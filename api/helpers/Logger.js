const winston = require('winston');

const {
  combine, timestamp, printf, colorize,
} = winston.format;

// Set default NYPL agreed upon log levels
// https://github.com/NYPL/engineering-general/blob/master/standards/logging.md
const nyplLogLevels = {
  levels: {
    emergency: 0,
    alert: 1,
    critical: 2,
    error: 3,
    warning: 4,
    notice: 5,
    info: 6,
    debug: 7,
  },
};

const getLogLevelCode = (levelString) => {
  switch (levelString) {
    case 'emergency':
      return 0;
    case 'alert':
      return 1;
    case 'critical':
      return 2;
    case 'error':
      return 3;
    case 'warning':
      return 4;
    case 'notice':
      return 5;
    case 'info':
      return 6;
    case 'debug':
      return 7;
    default:
      return 'n/a';
  }
};

/**
 * nyplFormat
 * This function is used for creating the logging object that will be printed
 * in the console and in a local file.
 */
const nyplFormat = printf((options) => {
  const result = {
    timestamp: options.timestamp,
    levelCode: getLogLevelCode(options.level),
    level: options.level.toUpperCase(),
    message: options.message.toString(),
    // This is specific to this app to make searching easy.
    appTag: 'dgx-patron-creator-service',
  };

  if (process.pid) {
    result.pid = process.pid.toString();
  }

  if (options.meta) {
    result.meta = JSON.stringify(options.meta);
  }

  return JSON.stringify(result);
});

const { File } = winston.transports;
const loggerTransports = [
  new File({
    filename: './log/dgx-patron-creator-service.log',
    handleExceptions: true,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    format: combine(timestamp(), nyplFormat),
  }),
];

// Don't show console messages while running tests.
if (process.env.NODE_ENV !== 'test') {
  const { Console } = winston.transports;
  loggerTransports.push(
    new Console({
      handleExceptions: true,
      format: combine(
        timestamp(),
        nyplFormat,
        colorize({
          all: true,
        }),
      ),
    }),
  );
}

// Create the logger that will be used in the app now that the configs are set up.
const CreateLogger = winston.createLogger;
const logger = new CreateLogger({
  levels: nyplLogLevels.levels,
  transports: loggerTransports,
  exitOnError: false,
});

// set the logger output level to one specified in the environment config
logger.level = process.env.LOG_LEVEL || 'debug';

module.exports = logger;
