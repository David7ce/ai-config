# claude-skills-sync — dotfiles para Claude Code (skills + plugins + settings.json)

STATUS: active

Las skills de usuario (`~/.claude/skills/`) y los plugins (`~/.claude/plugins/`) viven
fuera de todo repo — se pierden al formatear o cambiar de sistema. Esta carpeta es su
**dotfiles repo**: `store/` es la fuente de verdad, git es la DB (historial, sync entre
máquinas), `manifest.json` es el índice consultable. Cada máquina aplica el store con
`import`; cualquier cambio hecho en vivo (instalar un plugin, crear una skill a mano)
se sube al store con `export` antes de commitear.

```
claude-skills-sync/
├─ skills-sync.ps1    # import | export | list | remove
├─ manifest.json      # índice generado: skills (nombre, descripción) + plugins (versión)
└─ store/             # fuente de verdad — TODO en una carpeta, import/export = copiarla
   ├─ skills/         #   espejo de ~/.claude/skills (contenido completo — irreemplazable)
   ├─ plugins/        #   SOLO los 2 registros: installed_plugins.json + known_marketplaces.json
   └─ config/         #   settings.json + statusline-combined.ps1
```

**Nunca** entra al store: `.credentials.json` (secretos — jamás a git), `history.jsonl`
ni estado runtime.

Los plugins **no** se copian enteros: cache/marketplaces/data son regenerables (cientos
de ficheros de ruido). Los 2 registros bastan — dicen qué plugin, qué versión y de qué
repo git viene cada marketplace; el contenido se re-descarga al importar.

## Uso

```powershell
./skills-sync.ps1              # list: índice + drift repo(store)<->system(live) — skills, plugins, settings.json
./skills-sync.ps1 import       # store/ -> ~/.claude/{skills,plugins,settings.json} — acción principal, cualquier máquina
./skills-sync.ps1 export       # ~/.claude/{skills,plugins,settings.json} -> store/ + regenera manifest
./skills-sync.ps1 remove <n>   # borra una SKILL de store Y live (plugins: /plugin)
```

`list` solo reporta el drift (qué le falta al sistema respecto al repo, y qué tiene el
sistema que el repo no) — no aplica nada.

## Flujo entre máquinas

1. Añadir algo nuevo: crea la skill en `store/skills/`, o instala el plugin en vivo +
   `export`, o edita `store/config/settings.json` directamente → `git commit` → `git push`.
2. Cada máquina (esta incluida): `git pull` → `import` para aplicar el store.
   - `import` reescribe las rutas **absolutas** de los registros y de `settings.json`
     (`installPath`, `installLocation`, statusLine) al `$HOME` de esa máquina — sin eso
     rompen al migrar. En Linux además: statusLine invoca `powershell`, ajustar a `pwsh`
     a mano.
   - Los plugins se re-descargan de sus marketplaces (git) al arrancar Claude Code;
     verificar con `/plugin`.
3. Borrar skill en todas partes: `remove <nombre>` → commit → push; resto de máquinas
   `git pull` → `import`.

## Semántica DB

- **Insert/Update** = `export` (espejo: lo nuevo entra, lo editado se actualiza).
- **Delete** = `remove` (skills) o `/plugin` uninstall + `export` (plugins).
- **Historial/rollback** = git log / git checkout — cada versión queda.
- `import` y `export` son **espejo**: extras en destino se borran. El lado origen manda.
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
- After adding/updating anything: `./skills-sync.ps1 export` → commit → push.

## Notas

- Las skills de proyecto ya viven en sus repos — fuera de alcance.
- `import` de plugins necesita red (re-clona marketplaces). Las skills no.
- Para extender a `~/.claude/agents` o `keybindings.json`: añadir a `$ConfigFiles`
  (ficheros) o nuevo par Live/Store (carpetas) en el script.
- `manifest.json` se regenera — no editarlo a mano.
