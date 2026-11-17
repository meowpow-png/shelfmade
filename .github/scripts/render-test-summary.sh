#!/bin/sh
set -eu

report=playwright-report/results.json

result() {
  if [ "$1" = "success" ]; then
    echo "✅ Passed"
  else
    echo "❌ Failed"
  fi
}

# playwright's json reporter calls passed tests "expected" and failed ones "unexpected"
count() {
  jq -er ".stats.$1" "$report" 2>/dev/null || echo "—"
}

TEST_RESULT=$(result "$TEST_OUTCOME")
SMOKE_RESULT=$(result "$SMOKE_OUTCOME")

PASSED=$(count expected)
FAILED=$(count unexpected)
FLAKY=$(count flaky)
SKIPPED=$(count skipped)

FOOTER=""
for outcome in "$TEST_OUTCOME" "$SMOKE_OUTCOME"; do
  if [ "$outcome" != "success" ]; then
    FOOTER="See [QUALITY.md](docs/QUALITY.md) for how to run these checks locally."
    break
  fi
done

sed \
  -e "s|\${TEST_RESULT}|$TEST_RESULT|g" \
  -e "s|\${SMOKE_RESULT}|$SMOKE_RESULT|g" \
  -e "s|\${PASSED}|$PASSED|g" \
  -e "s|\${FAILED}|$FAILED|g" \
  -e "s|\${FLAKY}|$FLAKY|g" \
  -e "s|\${SKIPPED}|$SKIPPED|g" \
  -e "s|\${FOOTER}|$FOOTER|g" \
  .github/templates/test-summary.md
