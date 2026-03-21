function write(level: 'info' | 'warn' | 'error', message: string, detail?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(detail ?? {}),
  }

  const content = JSON.stringify(payload)

  if (level === 'error') {
    console.error(content)
    return
  }

  if (level === 'warn') {
    console.warn(content)
    return
  }

  console.log(content)
}

export const logger = {
  info(message: string, detail?: Record<string, unknown>) {
    write('info', message, detail)
  },
  warn(message: string, detail?: Record<string, unknown>) {
    write('warn', message, detail)
  },
  error(message: string, detail?: Record<string, unknown>) {
    write('error', message, detail)
  },
}

