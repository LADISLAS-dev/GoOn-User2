const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const timestamp = () => new Date().toISOString();

const logger = {
  info: (msg) => {
    console.log(`${colors.cyan}[INFO]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${msg}`);
  },
  success: (msg) => {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${msg}`);
  },
  warn: (msg) => {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${msg}`);
  },
  error: (msg) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${colors.gray}${timestamp()}${colors.reset} ${msg}`);
  },
  debug: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${colors.gray}[DEBUG] ${timestamp()} ${msg}${colors.reset}`);
    }
  },
};

module.exports = logger;
