const path = require('path');

const loadLoggerModule = () => {
  jest.resetModules();
  return require('../../utils/logger');
};

const createResponse = (statusCode = 200) => {
  const listeners = {};

  return {
    statusCode,
    once: jest.fn((event, callback) => {
      listeners[event] = callback;
    }),
    on: jest.fn((event, callback) => {
      listeners[event] = callback;
    }),
    finish: () => listeners.finish(),
    setHeader: jest.fn(),
  };
};

describe('Logger Utility', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('builds structured JSON log entries with a consistent schema', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    const { buildStructuredLogEntry } = loadLoggerModule();
    const entry = buildStructuredLogEntry('info', 'Structured log', {
      requestId: 'req-123',
      traceId: 'trace-123',
      feature: 'auth',
    });

    expect(entry).toMatchObject({
      level: 'info',
      message: 'Structured log',
      service: 'soromint-server',
      environment: 'test',
      requestId: 'req-123',
      error: null,
      metadata: expect.objectContaining({
        feature: 'auth',
        identifiers: expect.objectContaining({
          requestId: 'req-123',
          traceId: 'trace-123',
        }),
      }),
    });
    expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
  });

  it('serializes direct Error arguments and nested error metadata with stacks', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    const { buildStructuredLogEntry } = loadLoggerModule();
    const error = new Error('boom');
    error.code = 'E_BOOM';

    const directEntry = buildStructuredLogEntry('error', 'Direct error', error);
    const nestedEntry = buildStructuredLogEntry('error', 'Nested error', { error });

    expect(directEntry.error).toMatchObject({
      name: 'Error',
      message: 'boom',
      code: 'E_BOOM',
    });
    expect(directEntry.error.stack).toContain('boom');
    expect(nestedEntry.error).toMatchObject({
      name: 'Error',
      message: 'boom',
      code: 'E_BOOM',
    });
    expect(nestedEntry.error.stack).toContain('boom');
  });

  it('sets correlationId, requestId, and X-Correlation-ID header', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    const { correlationIdMiddleware } = loadLoggerModule();
    const req = {
      headers: {
        'x-correlation-id': 'req-456',
      },
    };
    const res = {
      setHeader: jest.fn(),
    };
    const next = jest.fn();

    correlationIdMiddleware(req, res, next);

    expect(req.correlationId).toBe('req-456');
    expect(req.requestId).toBe('req-456');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'req-456');
    expect(next).toHaveBeenCalled();
  });

  it('logs HTTP requests with requestId and duration metadata', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      HTTP_LOG_SUCCESS_SAMPLE_RATE: '1',
    };

    const { httpLoggerMiddleware, logger } = loadLoggerModule();
    const originalHttp = logger.http;
    logger.http = jest.fn();

    const req = {
      method: 'GET',
      originalUrl: '/api/health',
      requestId: 'req-789',
      correlationId: 'req-789',
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      get: jest.fn(() => 'JestAgent'),
    };
    const res = createResponse(200);

    httpLoggerMiddleware(req, res, jest.fn());
    res.finish();

    expect(logger.http).toHaveBeenCalledWith(
      'HTTP Request',
      expect.objectContaining({
        requestId: 'req-789',
        correlationId: 'req-789',
        method: 'GET',
        url: '/api/health',
        statusCode: 200,
        durationMs: expect.any(Number),
        ip: '127.0.0.1',
        userAgent: 'JestAgent',
      })
    );

    logger.http = originalHttp;
  });

  it('creates separate exact-level daily rotate transports', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    const { logger, createExactLevelFilter } = loadLoggerModule();
    const fileTransportNames = logger.transports
      .filter((transport) => transport.filename)
      .map((transport) => path.basename(transport.filename));

    expect(fileTransportNames).toEqual(
      expect.arrayContaining([
        'server-%DATE%.log',
        'error-%DATE%.log',
        'warn-%DATE%.log',
        'info-%DATE%.log',
      ])
    );

    const warnFilter = createExactLevelFilter('warn');
    expect(warnFilter.transform({ level: 'warn', message: 'warn' })).toEqual(
      expect.objectContaining({ level: 'warn' })
    );
    expect(warnFilter.transform({ level: 'error', message: 'error' })).toBe(false);
  });

  it('logs startup and database events through the shared logger', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    };

    const {
      logger,
      logStartupInfo,
      logDatabaseConnection,
      logRouteRegistration,
    } = loadLoggerModule();
    const originalInfo = logger.info;
    const originalError = logger.error;
    const originalDebug = logger.debug;

    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.debug = jest.fn();

    logStartupInfo(5000, 'Futurenet');
    logDatabaseConnection(false, new Error('Connection failed'));
    logRouteRegistration('GET', '/api/tokens');

    expect(logger.info).toHaveBeenCalledWith(
      'Server starting',
      expect.objectContaining({ port: 5000, network: 'Futurenet', nodeEnv: 'test' })
    );
    expect(logger.error).toHaveBeenCalledWith(
      'MongoDB Connection Error',
      expect.objectContaining({ error: expect.any(Error) })
    );
    expect(logger.debug).toHaveBeenCalledWith(
      'Route registered',
      expect.objectContaining({ method: 'GET', path: '/api/tokens' })
    );

    logger.info = originalInfo;
    logger.error = originalError;
    logger.debug = originalDebug;
  });
});
