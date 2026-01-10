# Luban

Luban is a standalone AI code editor app with a web frontend and a local Rust server.

- UI: `web/` (served by `crates/luban_server`)
- Desktop wrapper: `crates/luban_tauri` (Tauri)

## Development

This project uses `just` to manage all common dev commands.

```bash
just -l
```

### Run

```bash
just run
```

### Codex CLI

The Agent chat panel streams events from the Codex CLI.

Install Codex CLI and ensure `codex` is available in `PATH`.

Optionally, set `LUBAN_CODEX_BIN` to override the executable path.

### Build

```bash
just build
```
