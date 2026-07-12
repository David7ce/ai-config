# claude-skills-sync — backup y sync de skills + plugins de Claude Code entre máquinas

STATUS: active

Las skills de usuario (`~/.claude/skills/`) y los plugins (`~/.claude/plugins/`) viven
fuera de todo repo — se pierden al formatear o cambiar de sistema. Esto los convierte en
un **store versionado dentro de este repo**: git es la DB (historial, sync entre
máquinas), `manifest.json` es el índice consultable.

```
claude-skills-sync/
├─ skills-sync.ps1    # backup | restore | list | remove
├─ manifest.json      # índice generado: skills (nombre, descripción) + plugins (versión)
└─ store/             # TODO en una carpeta — export/import = copiar esta carpeta
   ├─ skills/         #   espejo de ~/.claude/skills (contenido completo — irreemplazable)
   ├─ plugins/        #   SOLO los 2 registros: installed_plugins.json + known_marketplaces.json
   └─ config/         #   settings.json + statusline-combined.ps1
```

**Nunca** entra al store: `.credentials.json` (secretos — jamás a git), `history.jsonl`
ni estado runtime.

Los plugins **no** se copian enteros: cache/marketplaces/data son regenerables (cientos
de ficheros de ruido). Los 2 registros bastan — dicen qué plugin, qué versión y de qué
repo git viene cada marketplace; el contenido se re-descarga al restaurar.

## Uso

```powershell
./skills-sync.ps1              # list: índice + drift live↔store
./skills-sync.ps1 backup       # ~/.claude/{skills,plugins} -> store/ + regenera manifest
./skills-sync.ps1 restore      # store/ -> ~/.claude/{skills,plugins} (máquina nueva)
./skills-sync.ps1 remove <n>   # borra una SKILL de store Y live (plugins: /plugin)
```

## Flujo entre máquinas

1. Tras crear/editar skill o instalar plugin: `backup` → `git commit` → `git push`.
2. Máquina nueva (Windows o Linux, pwsh 7): clonar repo → `restore`.
   - `restore` reescribe las rutas **absolutas** de los registros y de `settings.json`
     (`installPath`, `installLocation`, statusLine) al `$HOME` nuevo — sin eso rompen
     al migrar. En Linux además: statusLine invoca `powershell`, ajustar a `pwsh` a mano.
   - Los plugins se re-descargan de sus marketplaces (git) al arrancar Claude Code;
     verificar con `/plugin`.
3. Borrar skill en todas partes: `remove <nombre>` → commit → push; resto de máquinas
   `git pull` → `restore`.

## Semántica DB

- **Insert/Update** = `backup` (espejo: lo nuevo entra, lo editado se actualiza).
- **Delete** = `remove` (skills) o `/plugin` uninstall + `backup` (plugins).
- **Historial/rollback** = git log / git checkout — cada versión queda.
- `backup` y `restore` son **espejo**: extras en destino se borran. El lado origen manda.
  Conflicto entre máquinas = conflicto git normal, se resuelve ahí.

## Skill sources — where to download or add more

- **Official marketplace** — already configured (`claude-plugins-official`). Browse and
  install in-app with `/plugin`, or CLI: `claude plugin install <name>@claude-plugins-official`.
- **Official skills repo** — [github.com/anthropics/skills](https://github.com/anthropics/skills):
  Anthropic's collection (docx, pdf, pptx, xlsx, …). Copy a skill folder into
  `~/.claude/skills/` or add the repo as a marketplace.
- **Any GitHub marketplace** — `claude plugin marketplace add <owner>/<repo>` (this is how
  `ponytail` → DietrichGebert/ponytail and `caveman` → juliusbrussee/caveman got here),
  then `claude plugin install <name>@<marketplace>`.
- **Write your own** — `claude plugin init <name>` scaffolds at `~/.claude/skills/<name>/`
  (auto-loads next session), or just drop a folder containing a `SKILL.md` with
  `name:` + `description:` frontmatter into `~/.claude/skills/`.
- **Keep updated** — `claude plugin marketplace update` (all marketplaces), then
  `claude plugin update <plugin>@<marketplace>` per plugin. Restart Claude Code to apply.
- After adding/updating anything: `./skills-sync.ps1 backup` → commit → push.

## Notas

- Las skills de proyecto ya viven en sus repos — fuera de alcance.
- `restore` de plugins necesita red (re-clona marketplaces). Las skills no.
- Para extender a `~/.claude/agents` o `keybindings.json`: añadir a `$ConfigFiles`
  (ficheros) o nuevo par Live/Store (carpetas) en el script.
- `manifest.json` se regenera — no editarlo a mano.
