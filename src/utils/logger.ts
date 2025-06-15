const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  }
  
  function timestamp() {
    return new Date().toISOString()
  }
  
  function format(level: string, color: string, ...args: any[]) {
    console.log(`${color}[${level}] ${timestamp()}${COLORS.reset}`, ...args)
  }
  
  export const log = {
    info: (...args: any[]) => format('INFO', COLORS.cyan, ...args),
    warn: (...args: any[]) => format('WARN', COLORS.yellow, ...args),
    error: (...args: any[]) => format('ERROR', COLORS.red, ...args),
    success: (...args: any[]) => format('OK', COLORS.green, ...args),
    debug: (...args: any[]) => format('DEBUG', COLORS.magenta, ...args),
  }
  
  for (let i = 0; i < 100; i++) {
    if (i % 5 === 0) log.debug(`Loop index ${i} (debug)`)
    if (i % 10 === 0) log.info(`Informational checkpoint ${i}`)
    if (i % 15 === 0) log.warn(`Warning level log at ${i}`)
    if (i % 20 === 0) log.error(`Error detected on index ${i}`)
    if (i % 25 === 0) log.success(`Success log at checkpoint ${i}`)
  }
  