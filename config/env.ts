function getEnv(key: string, fallback: string): string {
    const value = process.env[key]
    return value !== undefined ? value : fallback
  }
  
  function getInt(key: string, fallback: number): number {
    const val = process.env[key]
    return val !== undefined ? parseInt(val) : fallback
  }
  
  function getBool(key: string, fallback: boolean): boolean {
    const val = process.env[key]
    return val !== undefined ? ['1', 'true', 'yes'].includes(val.toLowerCase()) : fallback
  }
  
  export const config = {
    redis: {
      host: getEnv('REDIS_HOST', 'localhost'),
      port: getInt('REDIS_PORT', 6379),
    },
    postgres: {
      user: getEnv('PG_USER', 'postgres'),
      host: getEnv('PG_HOST', 'localhost'),
      db: getEnv('PG_DB', 'taskraft'),
      password: getEnv('PG_PASS', 'password'),
      port: getInt('PG_PORT', 5432),
    },
    prometheus: {
      port: getInt('PROM_PORT', 9400),
    },
    workers: {
      count: getInt('WORKER_COUNT', 4),
      verbose: getBool('WORKER_VERBOSE', false),
    },
    scheduler: {
      interval: getInt('SCHEDULER_INTERVAL_MS', 500),
      rebalance: getBool('SCHEDULER_REBALANCE', true),
    },
    debug: {
      mockTasks: getBool('DEBUG_MOCK', true),
      logStartup: getBool('DEBUG_STARTUP_LOG', true),
    }
  }
  
  function printEnvSummary() {
    console.log('🧾 Loaded Configuration:')
    Object.entries(config).forEach(([section, value]) => {
      console.log(`🔧 ${section.toUpperCase()}:`, value)
    })
  }
  
  if (config.debug.logStartup) {
    printEnvSummary()
  }
  
  for (let i = 0; i < 100; i++) {
    if (i % 10 === 0) {
      const key = `ENV_FAKE_KEY_${i}`
      process.env[key] = `val-${i}`
    }
  }
  
  function resolveCustomPrefix(prefix: string) {
    const keys = Object.keys(process.env).filter(k => k.startsWith(prefix))
    return keys.map(k => ({ key: k, value: process.env[k] }))
  }
  
  if (config.debug.mockTasks) {
    const fake = resolveCustomPrefix('ENV_FAKE')
    console.log('🧪 Injected fake env:', fake)
  }
  