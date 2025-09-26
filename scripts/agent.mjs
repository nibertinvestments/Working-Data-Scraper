#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import process from 'node:process';

const ENV_PATH = resolve(process.cwd(), '.env');
const TEMPLATE_PATH = resolve(process.cwd(), '.env.example');

const REQUIRED_KEYS = [
  {
    key: 'OPENAI_API_KEY',
    description: 'API key with `Write` scope for OpenAI-compatible foundation models',
  },
  {
    key: 'AZURE_CLIENT_ID',
    description: 'Azure AD application (client) ID used for service principal auth',
  },
  {
    key: 'AZURE_CLIENT_SECRET',
    description: 'Azure AD application secret used together with the client ID',
  },
  {
    key: 'AZURE_TENANT_ID',
    description: 'Azure Active Directory tenant identifier for the service principal',
  },
  {
    key: 'AZURE_SUBSCRIPTION_ID',
    description: 'Subscription carrying infrastructure resources managed by the agent',
  },
  {
    key: 'GITHUB_TOKEN',
    description: 'Fine-grained GitHub token with repository and secret management permissions',
  },
  {
    key: 'GITHUB_REPO_OWNER',
    description: 'Owner or organization slug hosting the GitHub repository',
  },
  {
    key: 'GITHUB_REPO_NAME',
    description: 'Target GitHub repository name the agent will operate against',
  },
];

const COMMANDS = {
  'env:list': {
    description: 'Display all environment keys and whether they are populated',
    handler: handleEnvList,
  },
  'env:get': {
    description: 'Print the raw value for a specific environment key',
    handler: handleEnvGet,
  },
  'env:set': {
    description: 'Persist a key/value pair into the .env file (creates the file if missing)',
    handler: handleEnvSet,
  },
  'env:check': {
    description: 'Validate required secrets are populated with non-placeholder values',
    handler: handleEnvCheck,
  },
  'env:sync': {
    description: 'Ensure .env contains every key from .env.example while keeping existing values',
    handler: handleEnvSync,
  },
  help: {
    description: 'Show command usage information',
    handler: showHelp,
  },
};

async function main() {
  const [, , rawCommand, ...args] = process.argv;
  const command = rawCommand ?? 'help';

  if (!COMMANDS[command]) {
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exitCode = 1;
    return;
  }

  try {
    await COMMANDS[command].handler(args);
  } catch (error) {
    console.error('Command failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

function ensureEnvFile() {
  if (existsSync(ENV_PATH)) {
    return;
  }

  const dir = dirname(ENV_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (existsSync(TEMPLATE_PATH)) {
    writeFileSync(ENV_PATH, readFileSync(TEMPLATE_PATH, 'utf8'));
    console.log('Created `.env` from `.env.example`. Update the placeholder values before rerunning.');
  } else {
    writeFileSync(ENV_PATH, '# Auto-generated .env file\n');
    console.log('Created empty `.env`. Populate it with the required secrets before rerunning.');
  }
}

function loadEnvTokens() {
  ensureEnvFile();
  const raw = readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
  return raw.map((line) => {
    if (/^\s*$/.test(line)) {
      return { type: 'blank', raw: line };
    }
    if (/^\s*#/.test(line)) {
      return { type: 'comment', raw: line };
    }
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      return { type: 'comment', raw: `# ${line}` };
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1);
    return { type: 'entry', key, value };
  });
}

function writeEnvTokens(tokens) {
  const content = tokens
    .map((token) => {
      if (token.type === 'entry') {
        return `${token.key}=${token.value ?? ''}`;
      }
      return token.raw ?? '';
    })
    .join('\n');
  writeFileSync(ENV_PATH, content.endsWith('\n') ? content : `${content}\n`);
}

function getEnvMap(tokens) {
  return tokens.reduce((acc, token) => {
    if (token.type === 'entry') {
      acc[token.key] = token.value ?? '';
    }
    return acc;
  }, {});
}

async function handleEnvList() {
  const tokens = loadEnvTokens();
  const env = getEnvMap(tokens);
  const rows = Object.entries(env).map(([key, value]) => ({
    key,
    status: value ? 'SET' : 'EMPTY',
    sample: value ? obfuscate(value) : '',
  }));

  if (rows.length === 0) {
    console.log('No environment variables found in `.env`.');
    return;
  }

  console.table(rows);
}

async function handleEnvGet(args) {
  const [key] = args;
  if (!key) {
    console.error('Usage: node scripts/agent.mjs env:get <KEY>');
    process.exitCode = 1;
    return;
  }

  const tokens = loadEnvTokens();
  const env = getEnvMap(tokens);
    if (env[key] === undefined) {
      console.error(`Key "${key}" not found in .env.`);
    process.exitCode = 1;
    return;
  }

  console.log(env[key]);
}

async function handleEnvSet(args) {
  const [key, ...valueParts] = args;
  if (!key || valueParts.length === 0) {
    console.error('Usage: node scripts/agent.mjs env:set <KEY> <VALUE>');
    process.exitCode = 1;
    return;
  }
  const value = valueParts.join(' ');

  const tokens = loadEnvTokens();
  const index = tokens.findIndex((token) => token.type === 'entry' && token.key === key);
  if (index >= 0) {
    tokens[index].value = value;
  } else {
    if (tokens.length > 0 && tokens[tokens.length - 1].type !== 'blank') {
      tokens.push({ type: 'blank', raw: '' });
    }
    tokens.push({ type: 'entry', key, value });
  }

  writeEnvTokens(tokens);
  console.log(`Updated ${key} in .env.`);
}

async function handleEnvCheck() {
  const tokens = loadEnvTokens();
  const env = getEnvMap(tokens);

  const issues = [];
  for (const requirement of REQUIRED_KEYS) {
    const value = env[requirement.key];
    if (!value || isPlaceholderValue(value)) {
      issues.push({
        key: requirement.key,
        status: 'MISSING',
        description: requirement.description,
      });
    }
  }

  if (issues.length === 0) {
    console.log('All required secrets look healthy.');
    return;
  }

  console.log('The following environment variables must be populated:');
  console.table(issues);
  process.exitCode = 1;
}

async function handleEnvSync() {
  if (!existsSync(TEMPLATE_PATH)) {
    console.error('Unable to locate `.env.example` to sync from.');
    process.exitCode = 1;
    return;
  }

  const tokens = loadEnvTokens();
  const env = getEnvMap(tokens);

  const templateLines = readFileSync(TEMPLATE_PATH, 'utf8').split(/\r?\n/);
  let added = 0;

  for (const line of templateLines) {
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      continue;
    }
    const equalsIndex = line.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }
    const key = line.slice(0, equalsIndex).trim();
    const value = line.slice(equalsIndex + 1);
    if (env[key] !== undefined) {
      continue;
    }
    tokens.push({ type: 'entry', key, value });
    env[key] = value;
    added += 1;
  }

  if (added > 0) {
    writeEnvTokens(tokens);
    console.log(`Synced ${added} new key(s) from .env.example into .env.`);
  } else {
    console.log('`.env` already contains all keys from `.env.example`.');
  }
}

function showHelp() {
  console.log('Agent CLI helper');
  console.log('Usage: node scripts/agent.mjs <command> [options]\n');
  for (const [name, meta] of Object.entries(COMMANDS)) {
    if (name === 'help') {
      continue;
    }
    console.log(`${name.padEnd(12)} ${meta.description}`);
  }
  console.log('\nAdditional commands:');
  console.log('help         Show this help message');
}

function isPlaceholderValue(value) {
  return (
    value.trim() === '' ||
    /^your-/i.test(value.trim()) ||
    value.includes('00000000-0000-0000-0000-000000000000') ||
    value.includes('changeme')
  );
}

function obfuscate(value) {
  if (!value) {
    return '';
  }
  if (value.length <= 6) {
    return '*'.repeat(value.length);
  }
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

await main();
