import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.resolve(__dirname, '../../../logs');
const LOG_FILE = path.join(LOG_DIR, 'llm.log');

function ensureDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logLLMCall(entry: {
  npcId: string;
  npcName: string;
  attempt: number;
  systemPromptTokens: number;
  userPromptTokens: number;
  response?: string;
  latencyMs: number;
  success: boolean;
  parseSuccess?: boolean;
  error?: string;
  planSummary?: string;
}): void {
  ensureDir();
  const lines: string[] = [
    `--- ${new Date().toISOString()} ---`,
    `NPC: ${entry.npcName} (${entry.npcId})`,
    `Attempt: ${entry.attempt} | Latency: ${entry.latencyMs}ms`,
    `Prompt: sys=${entry.systemPromptTokens}chars user=${entry.userPromptTokens}chars`,
  ];

  if (entry.response) {
    lines.push(`Response (${entry.response.length}chars): ${entry.response.slice(0, 500)}`);
  }
  if (entry.error) {
    lines.push(`Error: ${entry.error}`);
  }
  if (entry.parseSuccess !== undefined) {
    lines.push(`Parse: ${entry.parseSuccess ? 'OK' : 'FAIL'}`);
  }
  if (entry.planSummary) {
    lines.push(`Plan: ${entry.planSummary}`);
  }

  lines.push(''); // trailing newline
  fs.appendFileSync(LOG_FILE, lines.join('\n'), 'utf8');
}
