import { readFileSync, existsSync } from "fs";
import path from "path";

/**
 * Automatically load environment variables from .env.local into process.env
 * if not already set.
 */
export function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...values] = trimmed.split("=");
        const val = values.join("=").replace(/^["']|["']$/g, "");
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    }
  }
}

// Call immediately on import
loadEnv();

/**
 * ANSI Terminal Colors for zero-dependency high-clarity CLI logging
 */
export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bgRed: "\x1b[41m\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m",
  bgYellow: "\x1b[43m\x1b[30m",
};

export interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

/**
 * Print a high-visibility test runner banner
 */
export function printHeader(title: string, subtitle?: string): void {
  console.log("\n" + colors.cyan + colors.bold + "═".repeat(72) + colors.reset);
  console.log(` ${colors.bold}${title}${colors.reset}`);
  if (subtitle) {
    console.log(` ${colors.dim}${subtitle}${colors.reset}`);
  }
  console.log(colors.cyan + colors.bold + "═".repeat(72) + colors.reset + "\n");
}

/**
 * Measure execution time of an asynchronous function
 */
export async function measure<T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round((performance.now() - start) * 10) / 10;
  return { result, durationMs };
}

/**
 * Print structured test results and summary table
 */
export function printSummary(results: TestResult[], suiteName: string): boolean {
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  const totalDuration = results.reduce((acc, r) => acc + r.durationMs, 0);

  console.log("\n" + colors.bold + "📊 Test Execution Summary" + colors.reset);
  console.log(colors.gray + "─".repeat(72) + colors.reset);

  for (const r of results) {
    const statusIcon = r.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;
    const time = `${colors.dim}${r.durationMs}ms${colors.reset}`;
    const detail = r.details ? ` ${colors.gray}(${r.details})${colors.reset}` : "";
    console.log(`  ${statusIcon} [${r.category}] ${r.name} - ${time}${detail}`);
    if (r.error) {
      console.log(`    ${colors.red}Error: ${r.error}${colors.reset}`);
    }
  }

  console.log(colors.gray + "─".repeat(72) + colors.reset);
  console.log(
    `Total: ${results.length} | Passed: ${colors.green}${passed.length}${colors.reset} | Failed: ${
      failed.length > 0 ? colors.red + failed.length + colors.reset : "0"
    } | Duration: ${Math.round(totalDuration)}ms`
  );

  if (failed.length === 0) {
    console.log(
      `\n${colors.bgGreen} SUCCESS ${colors.reset} ${colors.green}${suiteName} passed with 100% confidence!${colors.reset}\n`
    );
    return true;
  } else {
    console.log(
      `\n${colors.bgRed} FAILURE ${colors.reset} ${colors.red}${suiteName} failed ${failed.length} test(s)!${colors.reset}\n`
    );
    return false;
  }
}

/**
 * Get target base application URL
 */
export function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
