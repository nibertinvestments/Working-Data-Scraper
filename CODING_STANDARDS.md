# Coding Standards

These standards ensure every contribution—frontend, backend, infrastructure, or automation—is production ready, secure, and maintainable. Treat this document as the canonical checklist before opening a pull request.

## 1. Engineering principles

- **Security first** – Secrets live in `.env` (never in code). Run `node scripts/agent.mjs env:check` before executing automation or tests.
- **Automation over repetition** – Prefer CLI scripts or repeatable commands for setup, testing, and deployment.
- **Fail fast** – Lint, type-check, and test locally before pushing.
- **Infrastructure as code** – Represent cloud resources declaratively (Terraform, Bicep, Pulumi) with environments (`dev`, `staging`, `prod`).
- **Observability** – Instrument code with logs and metrics by default; prove observability in reviews.

## 2. Repository conventions

| Area | Requirement |
| --- | --- |
| Branching | Use trunk-based development with short-lived feature branches. Prefix with `feat/`, `fix/`, `chore/`, `docs/`. |
| Commits | Imperative tense, scoped (`feat(api): add invoice webhook`). One logical change per commit. |
| Pull requests | Include summary, testing evidence, and any rollout/rollback considerations. Link to tracking issues. |
| Documentation | Update `README.md`, `AGENT.md`, and ADRs whenever behavior or setup changes. |

## 3. Language guidelines

### TypeScript / JavaScript

- **Runtime**: Target Node.js ≥ 22 LTS (Hydrogen) and modern evergreen browsers.
- **Module format**: Use ES modules (`type: module` in `package.json`).
- **Style**: Enforce with ESLint (`eslint:recommended`, `@typescript-eslint`), Prettier, and EditorConfig.
- **Types**: All code must pass `tsc --noEmit`. Avoid `any`; reach for `unknown` + narrowing.
- **Error handling**: Throw `Error` subtypes with descriptive messages. Never swallow rejections.
- **Async**: Prefer `async/await`. Avoid mixing `.then` chains with `await`.

### Python

- **Version**: Python 3.11+ with `uv` or `pip-tools` for dependency management.
- **Style**: `ruff` for linting/formatting, `pyright` for type checking.
- **Structure**: Package modules under `src/` with explicit `__all__` exports.
- **Testing**: `pytest` with `pytest-cov`, `hypothesis` for property-based tests when suitable.

### Frontend (React / Next.js)

- Enforce strict TypeScript (`"strict": true` in `tsconfig.json`).
- Use functional components with hooks; avoid legacy class components.
- Keep state minimal; prefer React Query or SWR for server cache.
- Accessibility is required: semantic HTML, ARIA attributes, focus management, keyboard navigation in tests.
- Internationalization ready: pull strings from localized resources.

### Infrastructure & DevOps

- Preferred stack: Terraform with `terraform fmt` + `terraform validate` in CI.
- Support multiple workspaces per environment. Use remote state with backend locking.
- No hard-coded secrets; integrate with Azure Key Vault or AWS Secrets Manager.
- Document every new resource in an Architecture Decision Record (ADR).

### Database

- Schema migrations via Prisma Migrate, Flyway, or Liquibase depending on stack.
- All migrations are idempotent and reversible.
- Include seed scripts for non-production environments.
- Index analysis for new tables; document performance expectations.

## 4. Testing requirements

| Layer | Expectations |
| --- | --- |
| Unit | ≥ 90% coverage on pure logic modules. Write both happy-path and edge-case tests. |
| Integration | Cover external integrations (APIs, databases) with sandbox or mocked services. |
| End-to-end | Automate critical user journeys with Playwright or Cypress. Run nightly at minimum. |
| Performance | Provide load/regression benchmarks for critical code paths. |
| Security | Static analysis (SAST) and dependency scanning on every commit. |

## 5. Continuous integration

Every pull request must, at minimum, run:

1. `node scripts/agent.mjs env:check`
2. Lint/format (`npm run lint`, `ruff check`, `terraform fmt -check`, etc.)
3. Type checking (`tsc --noEmit`, `pyright`, etc.)
4. Tests (`npm test`, `pytest`, `terraform validate`)

Configure GitHub Actions with required status checks before merge.

## 6. Code review checklist

- [ ] All secrets pulled from `process.env` / `os.environ` with fallback handling.
- [ ] API inputs validated (zod, Joi, Pydantic) with error responses documented.
- [ ] No direct mutation of shared state; leverage immutable patterns or transactions.
- [ ] Logs use structured format (JSON) with correlation IDs.
- [ ] Telemetry, metrics, and tracing added or updated.
- [ ] Documentation updates included.
- [ ] Tests cover new functionality and regressions; snapshots reviewed.

## 7. Security practices

- Enforce least privilege for GitHub tokens (`secrets:write`, `actions:write`).
- Rotate Azure client secrets at least every 90 days.
- Use Dependabot or Renovate for dependency upgrades.
- Verify third-party packages for license compliance and supply-chain risk.
- Enable branch protection with signed commits and required reviews.

## 8. Local developer experience

- Configure `.editorconfig` when languages are introduced (2 spaces for JSON/YAML, 4 for Python).
- Install pre-commit hooks (Husky or `pre-commit`) to run lint/test suites on staged files.
- Prefer containerized dev environments (Dev Containers or Codespaces) with reproducible toolchains.
- Document non-obvious setup steps in `README.md` or `docs/` recipes.

## 9. Deployment checklist

- Environment variables verified via `node scripts/agent.mjs env:check` in the pipeline.
- Build artifacts reproducible (`npm ci`, `pip install --require-hashes`).
- Blue/green or canary rollout strategy documented per service.
- Post-deploy smoke tests automated.
- Observability dashboards updated (logging, metrics, uptime).

---

**Enforcement**: CI must fail if lint, type, or test steps fail. Reviewers should block merges until this guide is satisfied. Update this document as the stack evolves.
