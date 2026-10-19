# dsh-tokmeter

Live model decode speed (tok/s) pill for the DeepSeek Harness Web UI.

The stock status bar shows a session-average decode speed that only updates
after an assistant step settles. **dsh-tokmeter** adds a small lightning pill
that tracks the speed of the **currently streaming** response in real time,
next to the native pills in the composer dock:

```
[ 1 turns 33 steps · 76 tok/s ] [ ⚡ 75.9 tok/s ]   ← live, updates every stream delta
```

The pill appears while the model is generating (text, reasoning, or
tool-call arguments) and fades out ~2.5 s after the stream stops.

## How it works

It is a standard DSH client plugin (slot entry in
`conversation.composer.dock`, session scope). The chat client exposes the
live partial assistant step as `useChat(s => s.legacy.partial)`; while that
is non-null, the pill samples the growing block content every 250 ms and
converts character growth into an estimated token rate (~4 chars per token),
smoothed with an exponential moving average:

```
rate = 0.7 * previous + 0.3 * (Δchars / 4) / Δt
```

The figure is an **estimate** derived from stream text growth — the client
does not receive per-token timestamps, so long tool-call streams may show
slightly different numbers than the provider-side metrics.

## Installation

Requires DSH (DeepSeek Harness) with a Web UI profile.

```sh
# from a git checkout (or a published registry):
dsh plugin --profile web add <your-url-or-package>
```

The installer links the package into the profile and appends
`@local/dsh-tokmeter` to `dsh.profile.bundles` in the profile's
`package.json`. A restart of the Web UI server picks the bundle up (client
module edits of an already-linked package are hot-reloaded without a
restart).

### Requirements

- DSH ≥ 0.2.1-rc with the Web UI bundle (`@deepseek-ai/dsh-web-app`).
- The chat client (`@deepseek-ai/dsh-client-ui-chat`) must be part of the
  composition so the session-scope slot receives the `useChat` hook.

## Development

The plugin is a plain package — no build step.

| File | Purpose |
| --- | --- |
| `index.js` | Host entry point (empty; all work happens client-side). |
| `client.js` | Client module: slot registration + the React pill. |
| `cordis.patch.yml` | Bundle composition patch (inserts the entry). |
| `icon.svg` | Plugin icon (plugin manager UI). |

Local test loop:

```sh
dsh plugin --profile web add /path/to/dsh-tokmeter
dsh --profile web --dump-config   # must list '@local/dsh-tokmeter'
```

Then open the Web UI and ask the model for a long answer — the ⚡ pill in
the bottom bar tracks the live decode speed.

## Notes

- The pill renders only in sessions with a chat view; it is invisible when
  nothing is streaming.
- Colors and metrics use the standard `--dsw-alias-*` theme tokens, so it
  follows light/dark themes automatically.
- The pill text is intentionally language-neutral (`tok/s`).
