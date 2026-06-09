# AI Agent Modules

Per-project toolchains layered on top of the [AI Agent Stack](ai-agent-stack.md) base. **Not part of the base** — install only what a given project actually uses, via the OS's native package manager.

| Module             | Tools                                                  | When                                                         |
|--------------------|--------------------------------------------------------|--------------------------------------------------------------|
| **web**            | `fnm` (Node), `composer` (PHP), `wp-cli`               | JS/TS or PHP projects; WordPress automation                  |
| **data**           | `psql`, `mysql`, `sqlite3`                             | direct DB queries from the agent                             |
| **mobile/desktop** | `flutter`, Android SDK + `adb`, `qt`/`pyside6`/`tauri` | cross-platform apps                                          |
| **containers/ops** | `docker` + `docker compose`, `kubectl` + `k9s`         | containerized services; k8s only when deploying to a cluster |

## web

```text
fnm        # Node version manager (faster than nvm, cross-platform)
composer   # PHP dependencies
wp-cli     # WordPress: plugin list, option get, cache flush — no dashboard needed
```

## data

```text
psql  mysql  sqlite3
```

Agents work well when they can run queries directly instead of navigating a UI.

## mobile/desktop

Cross-platform first, so the agent targets one codebase instead of per-OS forks.

```text
flutter                # mobile + desktop, single codebase; `flutter doctor` verifies setup
android SDK + adb      # Android builds on any OS
xcode                  # iOS/macOS builds — macOS only (hard constraint: signing needs macOS)
qt / pyside6 / tauri   # native desktop UIs (Python/Rust/TS)
```

## containers/ops

```text
docker  docker compose      # containerize services; agents handle Compose better than mixed local setups
kubectl  k9s                # cluster deploys only; k9s is the agent/human-friendly TUI (pair with kind/minikube locally)
```
