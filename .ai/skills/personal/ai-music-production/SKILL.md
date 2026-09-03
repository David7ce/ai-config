---
name: ai-music-production
description: >-
  Use when the user wants to compose, arrange, notate, or produce music with
  AI assistance using this user's actual stack — Suno (generation), Bitwig
  Studio + FL Studio (DAWs), MuseScore 4 + Guitar Pro 8 (notation/tab) — each
  wired to Claude via its own MCP server. Covers what each server can and
  cannot do, the manual steps each needs before it responds, and the intended
  workflow: generate → produce → notate → record a live instrument on top.
---

# AI music production — this user's stack

Five MCP servers, four apps, one workflow. Each server has a **narrow, real
scope** — read it before promising the user something the tool can't do.

| App           | MCP server                              | Scope                                                                                     | Manual step before it works                                                                                                                                                          |
|---------------|-----------------------------------------|-------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Suno          | `suno` (AceDataCloud, remote HTTP)      | Full-track generation, lyrics, mashups, stems, persona voices — 24+ tools                 | OAuth sign-in on first use (`claude mcp list` shows auth status); pay-per-song billing                                                                                               |
| Bitwig Studio | `daw` (ptaczek/daw-mcp)                 | **Session view, MIDI clips only**                                                         | Bitwig running, "Bitwig MCP Bridge" controller added (Settings → Controllers)                                                                                                        |
| FL Studio     | `fl-studio` (karl-andres/fl-studio-mcp) | Transport, mixer, channels, plugin params, step sequencer, piano-roll scripting           | loopMIDI virtual port running, FL Studio's MIDI settings pointed at it with Controller type `FLStudioMCP`                                                                            |
| MuseScore 4   | `musescore` (ghchen99/mcp-musescore)    | Compose notes/rests/lyrics, navigate/select score, manage measures, multi-voice polyphony | MuseScore open with a score, then **Plugins → MuseScore API Server** run *before* the Python server can connect (WebSocket, port 8765)                                               |
| Guitar Pro 8  | `guitar-pro` (wegitor/guitar-pro-mcp)   | Load/save/edit tab files, tracks, notes, measures, MIDI export                            | **Only tested against .gp3/.gp4/.gp5** — GP8's native format is untested/unsupported; export to `.gp5` or MusicXML from Guitar Pro first if working from a native `.gp8`/`.gp7` file |

All five installed via this repo's `pkg-suno` / `pkg-daw-mcp` / `pkg-fl-studio-mcp` /
`pkg-musescore-mcp` / `pkg-guitar-pro-mcp` entries in `.ai/plugins.json`.

## Hard limits — don't overpromise

- **`daw` cannot record audio.** No arrangement view, no audio tracks, no
  input monitoring. A live instrument recorded "on top" of an AI-generated
  arrangement is a **manual step the user does by hand in Bitwig** — MCP
  can build the MIDI clips around it, not the recording itself.
- **`fl-studio` cannot load new plugins or create patterns from nothing** —
  it controls what's already in the project (mixer, existing channels,
  params). Same "manual step" boundary applies to audio recording there too.
- **Guitar Pro 8's native file format is not what `guitar-pro-mcp` was built
  against.** If a `.gp8` load/save fails or produces garbage, don't retry
  blindly — ask the user to re-export from Guitar Pro as `.gp5` or
  MusicXML, or route the file through MuseScore instead (which reads/writes
  a wider format range and has its own MCP tools for editing).
- **`musescore` needs MuseScore already running with the plugin started**
  before the Python server can do anything — a cold "tool not responding"
  usually means that step was skipped, not a bug.

## Typical workflow

1. **Generate** — Suno for a full draft (melody/chords/lyrics/vocal), or
   AIVA-style instrumental sketch if only MIDI is wanted (Suno covers this
   too via stems).
2. **Produce** — pull the idea into Bitwig (`daw`) or FL Studio
   (`fl-studio`) as MIDI clips; arrange, assign instruments, apply the
   existing plugin chain (Neural Amp Modeler, Kotelnikov, SPAN, Chow Tape,
   Valhalla Supermassive — see this user's `music/minimal-music-production-stack.md`
   in the AI+PC repo for the full plugin inventory).
3. **Notate** — MuseScore for general notation/lyrics/arrangement view of
   what got composed; Guitar Pro for guitar-specific tab work. Use MuseScore
   as the format bridge if Guitar Pro's native file gives the MCP trouble.
4. **Perform** — the user plays a live instrument (guitar, most often) on
   top, recorded by hand in Bitwig via the Scarlett 2i2 interface. Not
   MCP-drivable; don't attempt to script this step.

## Session-start checklist

Before touching any of these tools in a session, confirm what's actually
running — MCP connection state doesn't mean the underlying app is in the
right state:

- Bitwig/FL Studio open? Right project loaded?
- MuseScore open with the API Server plugin started (if `musescore` tools
  are needed)?
- Suno auth still valid (`claude mcp list` flags "Needs authentication" if not)?

If a tool call hangs or errors on first try, it's very often one of these
manual steps, not a config problem — check before troubleshooting further.
