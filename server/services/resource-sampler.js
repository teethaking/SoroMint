const os = require('os');
const { logger } = require('../utils/logger');

const cpuPercent = () => {
  const cpus = os.cpus();
  let idle = 0, total = 0;
  for (const cpu of cpus) {
    for (const val of Object.values(cpu.times)) total += val;
    idle += cpu.times.idle;
  }
  return parseFloat(((1 - idle / total) * 100).toFixed(1));
};

const memStats = () => {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return {
    totalGb: parseFloat((total / 1e9).toFixed(2)),
    usedGb: parseFloat((used / 1e9).toFixed(2)),
    freeGb: parseFloat((free / 1e9).toFixed(2)),
    usedPercent: parseFloat(((used / total) * 100).toFixed(1)),
  };
};

const diskStats = () => {
  if (process.env.NODE_ENV === 'test') return null;
  try {
    const { execSync } = require('child_process');
    const raw = execSync('df -k / --output=size,used,avail 2>/dev/null || df -k /', { timeout: 2000 }).toString().trim().split('\n');
    const [size, used, avail] = raw[raw.length - 1].trim().split(/\s+/).map(Number);
    return {
      totalGb: parseFloat((size / 1e6).toFixed(2)),
      usedGb: parseFloat((used / 1e6).toFixed(2)),
      freeGb: parseFloat((avail / 1e6).toFixed(2)),
      usedPercent: parseFloat(((used / size) * 100).toFixed(1)),
    };
  } catch { return null; }
};

class ResourceSampler {
  constructor() { this._latest = null; this._timer = null; }
  get latest() { return this._latest; }
  start() {
    if (process.env.NODE_ENV === 'test') return;
    this._collect();
    const env = require('../config/env-config').getEnv();
    this._timer = setInterval(() => this._collect(), env.METRICS_INTERVAL_MS);
    if (this._timer.unref) this._timer.unref();
    logger.info('ResourceSampler started');
  }
  stop() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  _collect() {
    const env = require('../config/env-config').getEnv();
    const cpu = cpuPercent();
    const memory = memStats();
    const disk = diskStats();
    this._latest = { sampledAt: new Date().toISOString(), cpu: { usedPercent: cpu, loadAvg: os.loadavg() }, memory, disk };
  }
}

const sampler = new ResourceSampler();
module.exports = { sampler };
