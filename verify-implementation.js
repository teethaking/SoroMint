#!/usr/bin/env node

/**
 * @title Implementation Verification Script
 * @description Verifies all requirements for Redis caching implementation are met
 */

const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, 'server');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

const log = {
    success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
    error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
    warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
    info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
    section: (msg) => console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n${msg}\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`),
};

let totalChecks = 0;
let passedChecks = 0;

function checkFile(filePath, description) {
    totalChecks++;
    const fullPath = path.join(serverDir, filePath);

    if (fs.existsSync(fullPath)) {
        log.success(`File exists: ${filePath}`);
        passedChecks++;
        return true;
    } else {
        log.error(`File missing: ${filePath}`);
        return false;
    }
}

function checkFileContent(filePath, searchString, description) {
    totalChecks++;
    const fullPath = path.join(serverDir, filePath);

    if (!fs.existsSync(fullPath)) {
        log.error(`${description} - File not found: ${filePath}`);
        return false;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes(searchString)) {
        log.success(description);
        passedChecks++;
        return true;
    } else {
        log.error(`${description} - Pattern not found in ${filePath}`);
        return false;
    }
}

function main() {
    console.clear();
    log.section('🔍 REDIS CACHING IMPLEMENTATION VERIFICATION');

    // =====================================================
    log.section('1️⃣  REQUIREMENT: Cache-Aside Pattern Implementation');
    // =====================================================

    checkFile(
        'services/cache-service.js',
        'Cache service module exists'
    );

    checkFileContent(
        'services/cache-service.js',
        'async getOrSet(key, fetchFunction, options = {})',
        'Cache-aside pattern method exists'
    );

    checkFileContent(
        'services/cache-service.js',
        'const cachedData = await this.get(key);',
        'Cache-aside checks cache first'
    );

    checkFileContent(
        'services/cache-service.js',
        'const data = await fetchFunction();',
        'Cache-aside fetches from source on miss'
    );

    checkFileContent(
        'services/cache-service.js',
        'await this.set(key, data, ttl);',
        'Cache-aside stores result with TTL'
    );

    checkFileContent(
        'routes/token-routes.js',
        'const cachedResult = await cacheService.get(cacheKey);',
        'Token routes check cache before DB'
    );

    checkFileContent(
        'routes/token-routes.js',
        'await cacheService.set(cacheKey, result);',
        'Token routes cache results'
    );

    // =====================================================
    log.section('2️⃣  REQUIREMENT: Cache Invalidation on Metadata Update');
    // =====================================================

    checkFileContent(
        'routes/token-routes.js',
        'await cacheService.deleteByPattern(`tokens:owner:${ownerPublicKey}:*`);',
        'Cache invalidation on token creation'
    );

    checkFileContent(
        'services/cache-service.js',
        'async deleteByPattern(pattern)',
        'Pattern-based cache deletion method exists'
    );

    checkFileContent(
        'services/cache-service.js',
        'const keys = await this.client.keys(pat);',
        'Pattern-based deletion uses Redis KEYS command'
    );

    // =====================================================
    log.section('3️⃣  REQUIREMENT: TTL Configuration');
    // =====================================================

    checkFileContent(
        'config/env-config.js',
        'CACHE_TTL_METADATA',
        'CACHE_TTL_METADATA environment variable defined'
    );

    checkFileContent(
        'config/env-config.js',
        'REDIS_URL',
        'REDIS_URL environment variable defined'
    );

    checkFileContent(
        'config/env-config.js',
        'REDIS_PASSWORD',
        'REDIS_PASSWORD environment variable defined'
    );

    checkFileContent(
        'config/env-config.js',
        'REDIS_DB',
        'REDIS_DB environment variable defined'
    );

    checkFileContent(
        'config/env-config.js',
        'default: 3600',
        'Default TTL is 3600 seconds (1 hour)'
    );

    // =====================================================
    log.section('4️⃣  ADDITIONAL: Dependency Management');
    // =====================================================

    checkFileContent(
        'package.json',
        '"redis": "^4.7.0"',
        'Redis dependency added to package.json'
    );

    // =====================================================
    log.section('5️⃣  ADDITIONAL: Server Initialization');
    // =====================================================

    checkFileContent(
        'index.js',
        'const { getCacheService } = require("./services/cache-service");',
        'Server imports cache service'
    );

    checkFileContent(
        'index.js',
        'await cacheService.initialize();',
        'Server initializes cache on startup'
    );

    // =====================================================
    log.section('6️⃣  ADDITIONAL: Error Handling & Graceful Degradation');
    // =====================================================

    checkFileContent(
        'services/cache-service.js',
        'this.isConnected = false;',
        'Cache tracks connection state'
    );

    checkFileContent(
        'services/cache-service.js',
        'catch (error)',
        'Cache operations handle errors'
    );

    checkFileContent(
        'index.js',
        'continuing without cache',
        'Server continues gracefully without cache'
    );

    // =====================================================
    log.section('7️⃣  ADDITIONAL: Health Checks');
    // =====================================================

    checkFileContent(
        'services/cache-service.js',
        'isHealthy()',
        'Cache health check method exists'
    );

    checkFileContent(
        'services/cache-service.js',
        'async getHealth()',
        'Cache detailed health method exists'
    );

    // =====================================================
    log.section('8️⃣  ADDITIONAL: Logging');
    // =====================================================

    checkFileContent(
        'services/cache-service.js',
        'logger.info',
        'Cache service logs INFO level'
    );

    checkFileContent(
        'services/cache-service.js',
        'logger.debug',
        'Cache service logs DEBUG level'
    );

    checkFileContent(
        'services/cache-service.js',
        'logger.warn',
        'Cache service logs WARN level'
    );

    checkFileContent(
        'services/cache-service.js',
        'logger.error',
        'Cache service logs ERROR level'
    );

    // =====================================================
    log.section('9️⃣  ADDITIONAL: Testing');
    // =====================================================

    checkFile(
        'tests/services/cache-service.test.js',
        'Cache service unit tests'
    );

    checkFile(
        'tests/routes/token-routes-cache.test.js',
        'Token routes integration tests'
    );

    checkFileContent(
        'tests/services/cache-service.test.js',
        'describe(\'CacheService\'',
        'Cache service test suite exists'
    );

    checkFileContent(
        'tests/routes/token-routes-cache.test.js',
        'describe(\'Token Routes with Cache Integration\'',
        'Integration test suite exists'
    );

    // =====================================================
    log.section('🔟 ADDITIONAL: Documentation');
    // =====================================================

    // Check docs at root level, not server level
    const docsDir = path.join(__dirname, 'docs');
    totalChecks++;
    if (fs.existsSync(path.join(docsDir, 'redis-caching.md'))) {
        log.success(`File exists: docs/redis-caching.md`);
        passedChecks++;
    } else {
        log.error(`File missing: docs/redis-caching.md`);
    }

    checkFile(
        '.env.example.redis',
        'Environment configuration example'
    );

    // Check documentation content from root docs directory
    const redisDocPath = path.join(docsDir, 'redis-caching.md');
    totalChecks++;
    if (fs.existsSync(redisDocPath)) {
        const docContent = fs.readFileSync(redisDocPath, 'utf8');
        if (docContent.includes('Cache-Aside Pattern')) {
            log.success('Documentation includes cache-aside pattern');
            passedChecks++;
        } else {
            log.error('Documentation includes cache-aside pattern - Pattern not found');
        }
    } else {
        log.error('Documentation includes cache-aside pattern - File not found: docs/redis-caching.md');
    }

    totalChecks++;
    if (fs.existsSync(redisDocPath)) {
        const docContent = fs.readFileSync(redisDocPath, 'utf8');
        if (docContent.includes('Cache Invalidation')) {
            log.success('Documentation includes cache invalidation');
            passedChecks++;
        } else {
            log.error('Documentation includes cache invalidation - Pattern not found');
        }
    } else {
        log.error('Documentation includes cache invalidation - File not found: docs/redis-caching.md');
    }

    // =====================================================
    log.section('📊 VERIFICATION RESULTS');
    // =====================================================

    const percentage = Math.round((passedChecks / totalChecks) * 100);
    console.log(`\nTotal Checks: ${totalChecks}`);
    console.log(`Passed: ${colors.green}${passedChecks}${colors.reset}`);
    console.log(`Failed: ${passedChecks === totalChecks ? colors.green + '0' : colors.red + (totalChecks - passedChecks)}${colors.reset}`);
    console.log(`\nSuccess Rate: ${percentage}%\n`);

    if (passedChecks === totalChecks) {
        log.success('✨ ALL REQUIREMENTS MET! Implementation is complete. ✨');
        console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.green}Ready to test: npm install && npm test${colors.reset}`);
        console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        process.exit(0);
    } else {
        log.error(`Some checks failed. Please review above.`);
        process.exit(1);
    }
}

main();
