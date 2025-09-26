# Agent Operations Guide

This document explains how to bootstrap and operate the local automation agent using the project CLI wrapper and the secrets stored in `.env`.

## Prerequisites

- **Node.js 22 LTS or newer** (the CLI helper is a plain ECMAScript module executed with `node`)
- PowerShell 7.4 LTS or newer on Windows, or any POSIX-compliant shell (bash, zsh, fish) on macOS/Linux
- Access to the credentials listed in the environment reference table below

> **Tip:** Install [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) to manage multiple Node versions and confirm with `node --version` that you are on v22.x. On Windows, run `pwsh --version` to ensure PowerShell 7.4+ is active; upgrade via `winget upgrade --id Microsoft.Powershell` when needed.

## 1. Configure the environment file

1. Copy the template and fill in every placeholder value:
   ```powershell
   Copy-Item .env.example .env
   ```
   > On macOS/Linux run `cp .env.example .env` instead.
2. Open `.env` in your editor and replace placeholder tokens (`your-…`, `000000…`, `changeme`) with real secrets.
3. Keep `.env` out of version control—`.gitignore` already covers it.

### Environment key reference

| Key | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | OpenAI-compatible API key used for completion and embedding workloads. |
| `AZURE_CLIENT_ID` | Azure Active Directory application (client) ID for the automation principal. |
| `AZURE_CLIENT_SECRET` | Secret backing the Azure AD application above. |
| `AZURE_TENANT_ID` | Azure tenant that owns the service principal. |
| `AZURE_SUBSCRIPTION_ID` | Subscription where infrastructure is created and managed. |
| `GITHUB_TOKEN` | Fine-grained token with `contents:write`, `actions:write`, `secrets:write`, and `pull_requests:write` scopes. |
| `GITHUB_REPO_OWNER` | GitHub user or organization name hosting the repository. |
| `GITHUB_REPO_NAME` | Repository slug that the agent will operate against. |
| `NODE_ENV` | Runtime profile (`development`, `staging`, `production`). Default: `development`. |
| `APP_BASE_URL` | Canonical base URL for generated front-end links. |
| `DATABASE_URL` | Connection string to the primary backing store (PostgreSQL, MySQL, etc.). |

## 2. Use the CLI helper

The repository ships with a lightweight helper (`scripts/agent.mjs`) that manipulates the `.env` file, validates secrets, and prepares the agent runtime.

### Quick syntax

```powershell
node scripts/agent.mjs <command> [options]
```

Available commands:

| Command | Description |
| --- | --- |
| `env:list` | Display all secrets and mark whether they are populated. |
| `env:get <KEY>` | Print the raw value of a single secret. |
| `env:set <KEY> <VALUE>` | Persist or update a secret in `.env`. |
| `env:check` | Validate that every required secret is present and not a placeholder. |
| `env:sync` | Ensure `.env` contains every key found in `.env.example`. |

#### Examples

```powershell
# Inspect which keys still need values
node scripts/agent.mjs env:list

# Populate the OpenAI API key securely (history safe in PowerShell)
node scripts/agent.mjs env:set OPENAI_API_KEY "$(Read-Host -AsSecureString | ConvertFrom-SecureString)"

# Validate readiness before running automation jobs
node scripts/agent.mjs env:check
```

> When using bash/zsh, replace the PowerShell secure input with `read -s OPENAI_API_KEY && node scripts/agent.mjs env:set OPENAI_API_KEY "$OPENAI_API_KEY"`.

### Keeping secrets out of logs

- Prefer `env:set` so the key never needs to be opened manually.
- Avoid echoing secrets in terminals or CI logs—use secure input prompts (`Read-Host` on Windows, `read -s` on POSIX).
- Rotate tokens regularly and store them in an enterprise vault (1Password, Azure Key Vault, HashiCorp Vault). The `.env` file should be treated as ephemeral.

## 3. Running automation jobs

Once `.env` is healthy (`env:check` passes), downstream automation can safely call SDKs and CLIs using `process.env` (Node), `os.environ` (Python), or deployment manifests. Reference the same key names in your application code to maintain parity between documentation and runtime.

A typical execution loop for the agent might look like:

1. `node scripts/agent.mjs env:check`
2. `npm run lint && npm test` *(project-specific)*
3. `node ./dist/agent.js --plan` *(build artifact executed with the verified secrets)*

Document any additional workflows in `README.md` so the automation team can evolve usage patterns without editing this guide.

## 4. Secret rotation workflow

1. Rotate the credential in the upstream provider (Azure, GitHub, database, etc.).
2. Run `node scripts/agent.mjs env:set <KEY> <NEW_VALUE>` to capture the update locally.
3. Execute `node scripts/agent.mjs env:check` to ensure nothing regressed.
4. If distributed teams are involved, communicate the rotation in your shared runbook and vault solution.

## 5. Troubleshooting

| Symptom | Resolution |
| --- | --- |
| CLI reports `Key "XYZ" not found in .env.` | Add the key with `env:set` or copy it from `.env.example`. |
| `env:check` fails with placeholder warnings | Replace `your-…` or `000000…` values with real credentials. |
| Secrets disappear between runs | Confirm you are editing `.env`, not `.env.example`, and verify no clean-up script deletes it. |
| Automation crashes with missing env vars | Run `env:list`, populate missing keys, and rerun the failing job. |

---

Keep this guide updated whenever new secrets or automation capabilities are introduced. A disciplined `.env` workflow prevents production incidents and enables the agent to ship full-stack changes safely.
