set shell := ["bash", "-eu", "-o", "pipefail", "-c"]

# List available recipes
default:
    @just --list

# Run Codex in Docker container
[arg("args", help="Command arguments")]
codex *args:
    @docker compose run --rm codex {{ args }}

# Run Claude in Docker container
[arg("args", help="Command arguments")]
claude *args:
    @docker compose run --rm claude {{ args }}

# Run Playwright in Docker container
[arg("args", help="Command arguments")]
playwright *args:
    @docker compose run --rm --user "$(id -u):$(id -g)" --env HOME=/tmp playwright {{ args }}

# Run tests
test:
    @just playwright npm test

# Print example book project to PDF
example-pdf:
    @npm run example:install
    @just playwright npm run example:pdf

# Pack and install into another project without saving it as a dependency
[arg("project", help="Path to the target project")]
pack-into project:
    @./scripts/pack-into.sh {{ quote(project) }}
