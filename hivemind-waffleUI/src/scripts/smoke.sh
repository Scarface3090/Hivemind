
#!/usr/bin/env bash
set -euo pipefail

# Config (can override via env)
BASE="${BASE:-http://localhost:8787}"
UID="${UID:-devuser-$(LC_ALL=C tr -dc a-z0-9 </dev/urandom | head -c 6)}"
WAIT_SEC="${WAIT_SEC:-70}"       # works well if GAME_DURATION_MS=60000
RUN_REVEAL="${RUN_REVEAL:-1}"

echo "Smoke test against $BASE as user $UID"

command -v jq >/dev/null 2>&1 || { echo "jq is required. Install jq and re-run."; exit 1; }

tmpdir="$(mktemp -d)"
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT

api_ok() {
  local method="$1"; shift
  local path="$1"; shift
  local body="${1:-}"; shift || true
  local with_auth="${1:-yes}"
  local out="$tmpdir/out.json"

  local headers=(-H "Content-Type: application/json")
  if [ "$with_auth" = "yes" ]; then headers+=(-H "X-User-Id: $UID"); fi

  local status
  if [ -n "$body" ]; then
    status="$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$BASE$path" "${headers[@]}" -d "$body")"
  else
    status="$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$BASE$path" "${headers[@]}")"
  fi

  if [[ "$status" -lt 200 || "$status" -ge 300 ]]; then
    echo "Request failed ($method $path) status=$status"
    cat "$out" || true
    exit 1
  fi

  echo "$out"
}

api_expect_error() {
  local method="$1"; shift
  local path="$1"; shift
  local expected_status="$1"; shift
  local expected_code="$1"; shift
  local body="${1:-}"; shift || true
  local with_auth="${1:-yes}"
  local out="$tmpdir/err.json"

  local headers=(-H "Content-Type: application/json")
  if [ "$with_auth" = "yes" ]; then headers+=(-H "X-User-Id: $UID"); fi

  local status
  if [ -n "$body" ]; then
    status="$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$BASE$path" "${headers[@]}" -d "$body")"
  else
    status="$(curl -sS -o "$out" -w "%{http_code}" -X "$method" "$BASE$path" "${headers[@]}")"
  fi

  if [ "$status" != "$expected_status" ]; then
    echo "Expected status $expected_status but got $status for $method $path"
    cat "$out" || true
    exit 1
  fi

  local code
  code="$(jq -r '.code // empty' < "$out")"
  if [ "$code" != "$expected_code" ]; then
    echo "Expected error code '$expected_code' but got '$code' for $method $path"
    cat "$out" || true
    exit 1
  fi
  echo "$out"
}

# 0) Health
echo "Step 0: Health"
out="$(api_ok GET /healthz)"
jq -e '.ok == true' < "$out" >/dev/null

# 1) Create Draft
echo "Step 1: Create Draft"
out="$(api_ok POST /api/drafts '{}')"
draft_id="$(jq -r '.draftId' < "$out")"
jq -e '.draftId and .spectrum.left and .spectrum.right and (.secretTarget|type=="number")' < "$out" >/dev/null
echo "  draftId=$draft_id"

# 2) Create Game from Draft
echo "Step 2: Create Game"
out="$(api_ok POST /api/games "{\"draftId\":\"$draft_id\",\"clue\":\"A spicy clue\"}")"
game_id="$(jq -r '.gameId' < "$out")"
jq -e '.gameId and .phase=="GUESSING" and (.guesses|type=="array") and (has("secretTarget")|not) and (has("medianGuess")|not)' < "$out" >/dev/null
echo "  gameId=$game_id"

# 2b) Draft reuse should fail (either 404 or 409 depending on implementation)
echo "Step 2b: Draft reuse yields error"
api_expect_error POST /api/games 404 DRAFT_NOT_FOUND "{\"draftId\":\"$draft_id\",\"clue\":\"Another\"}" || \
api_expect_error POST /api/games 409 DRAFT_CONSUMED "{\"draftId\":\"$draft_id\",\"clue\":\"Another\"}"

# 3) Feed lists the game
echo "Step 3: Feed lists the game"
out="$(api_ok GET /api/feed)"
jq -e 'type=="array"' < "$out" >/dev/null

# 4) Game details (GUESSING)
echo "Step 4: Game details (GUESSING)"
out="$(api_ok GET "/api/games/$game_id")"
jq -e '.phase=="GUESSING" and (.guesses|type=="array") and (has("secretTarget")|not) and (has("medianGuess")|not)' < "$out" >/dev/null

# 5) Submit guess once
echo "Step 5: Submit first guess"
out="$(api_ok POST "/api/games/$game_id/guesses" "{\"value\":72,\"justification\":\"vibes\"}")"
jq -e '.ok==true' < "$out" >/dev/null

# 6) Duplicate guess rejected
echo "Step 6: Duplicate guess rejected"
api_expect_error POST "/api/games/$game_id/guesses" 409 DUPLICATE_GUESS "{\"value\":72,\"justification\":\"vibes again\"}"

# 7) Out-of-range guess rejected
echo "Step 7: Out-of-range guess rejected"
api_expect_error POST "/api/games/$game_id/guesses" 400 GUESS_OUT_OF_RANGE "{\"value\":101,\"justification\":\"oops\"}"

# 8) Optional: Verify reveal after short wait (set GAME_DURATION_MS=60000 on server)
if [ "$RUN_REVEAL" = "1" ]; then
  echo "Step 8: Waiting $WAIT_SEC seconds for reveal (requires short GAME_DURATION_MS on server)"
  sleep "$WAIT_SEC"
  out="$(api_ok GET "/api/games/$game_id")"
  phase="$(jq -r '.phase' < "$out")"
  if [ "$phase" = "REVEAL" ]; then
    jq -e '.secretTarget as $s | .medianGuess as $m | ($s|type=="number") and ($m|type=="number") and (.guesses|type=="array")' < "$out" >/dev/null
    echo "  Revealed successfully."
  else
    echo "  Still in GUESSING (server may not be using a short duration)."
  fi
fi

echo "All checks passed."
