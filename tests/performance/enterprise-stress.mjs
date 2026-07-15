import process from "node:process";

const baseUrl = process.env.STRESS_BASE_URL || "http://localhost:3000/api/v1";
const path = process.env.STRESS_PATH || "/monitoring/health";
const timeoutMs = Number(process.env.STRESS_TIMEOUT_MS || 12_000);
const warmupRequests = Number(process.env.STRESS_WARMUP_REQUESTS || 20);
const levels = (process.env.STRESS_LEVELS || "100,500,1000")
  .split(",")
  .map((v) => Number(v.trim()))
  .filter((v) => Number.isFinite(v) && v > 0);

const endpoint = `${baseUrl}${path}`;

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function oneRequest(id) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "x-stress-id": String(id),
      },
      signal: controller.signal,
    });

    const end = performance.now();
    return {
      ok: response.ok,
      status: response.status,
      durationMs: end - start,
    };
  } catch (error) {
    const end = performance.now();
    return {
      ok: false,
      status: 0,
      durationMs: end - start,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function oneRequestWithRetry(id, retries = 1) {
  let last = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const result = await oneRequest(id);
    last = result;
    if (result.ok || result.status !== 0) return result;
    await new Promise((resolve) => setTimeout(resolve, 15 + Math.floor(Math.random() * 35)));
  }
  return last;
}

async function runBatch(concurrency) {
  const jobs = [];
  for (let i = 0; i < concurrency; i += 1) {
    jobs.push(oneRequestWithRetry(i + 1, 1));
  }

  const startedAt = performance.now();
  const results = await Promise.all(jobs);
  const endedAt = performance.now();

  const success = results.filter((r) => r.ok).length;
  const failed = results.length - success;
  const latencies = results.map((r) => r.durationMs);

  return {
    concurrency,
    total: results.length,
    success,
    failed,
    elapsedMs: endedAt - startedAt,
    minMs: Math.min(...latencies),
    avgMs: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    p99Ms: percentile(latencies, 99),
    maxMs: Math.max(...latencies),
    statusBreakdown: results.reduce((acc, r) => {
      const key = String(r.status);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  };
}

async function warmup() {
  const tasks = [];
  for (let i = 0; i < warmupRequests; i += 1) {
    tasks.push(oneRequest(i + 1));
  }
  await Promise.all(tasks);
}

async function main() {
  console.log(`Stress target: ${endpoint}`);
  console.log(`Levels: ${levels.join(", ")}`);
  console.log(`Warmup requests: ${warmupRequests}`);

  await warmup();

  const report = [];
  for (const level of levels) {
    const result = await runBatch(level);
    report.push(result);
    console.log(`\n[Concurrency ${level}]`);
    console.log(`Success/Failed: ${result.success}/${result.failed}`);
    console.log(`Latency ms (min/avg/p95/p99/max): ${result.minMs.toFixed(2)} / ${result.avgMs.toFixed(2)} / ${result.p95Ms.toFixed(2)} / ${result.p99Ms.toFixed(2)} / ${result.maxMs.toFixed(2)}`);
    console.log(`Total elapsed: ${result.elapsedMs.toFixed(2)} ms`);
    console.log(`Status breakdown: ${JSON.stringify(result.statusBreakdown)}`);
  }

  const hasFailure = report.some((r) => r.failed > 0);
  if (hasFailure) {
    process.exitCode = 1;
  }
}

void main();
