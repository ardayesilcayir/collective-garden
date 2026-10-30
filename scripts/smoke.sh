#!/usr/bin/env bash
# CLI ile uçtan uca akış testi: water → grow → fund → claim (+ beklenen hatalar).
# deploy.sh ile oluşturulan bahçeyi kullanır. Bahçeyi olgunlaştırır, bu yüzden
# kısa süreli parametrelerle kurulmuş bir test bahçesinde çalıştır.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_NAME="$(sui client active-env | tail -n1 | tr -d '[:space:]')"
DEPLOY="$ROOT/deployments/$ENV_NAME.json"
[ -f "$DEPLOY" ] || { echo "$DEPLOY yok; önce scripts/deploy.sh çalıştır." >&2; exit 1; }

read_json() { node -e 'const d=require(process.argv[1]); console.log(process.argv[2].split(".").reduce((o,k)=>o[k],d))' "$DEPLOY" "$1"; }
PKG="$(read_json packageId)"
GARDEN="$(read_json gardenId)"
MAX_STAGE="$(read_json params.maxStage)"
WATER_PER_STAGE="$(read_json params.waterPerStage)"
COOLDOWN_S="$(( $(read_json params.cooldownMs) / 1000 + 1 ))"
STAGE_S="$(( $(read_json params.minStageDurationMs) / 1000 + 1 ))"
ME="$(sui client active-address | tail -n1 | tr -d '[:space:]')"

# Bir PTB çalıştırır; başarı/başarısızlık durumunu döner.
ptb() { { sui client ptb "$@" --json 2>&1 || true; } | node -e '
  let s=require("fs").readFileSync(0,"utf8"); const i=s.indexOf("{");
  if(i<0){console.log("ERROR " + s.trim().split("\n").pop()); process.exit(0);}
  const o=JSON.parse(s.slice(i)); const st=o.effects?.status;
  console.log(st?.status==="success" ? "OK" : "ERROR " + JSON.stringify(st?.error ?? st));'; }

expect_ok()   { local r; r="$("$@")"; [[ "$r" == OK* ]] || { echo "  ✗ beklenmeyen hata: $r"; exit 1; }; }
expect_fail() { local code="$1"; shift; local r; r="$("$@")"; [[ "$r" == ERROR* && "$r" =~ $code([^0-9]|$) ]] && echo "  ✓ beklenen abort ($code)" || { echo "  ✗ abort $code bekleniyordu: $r"; exit 1; }; }

water() { ptb --move-call "$PKG::garden::water" "@$GARDEN" @0x6; }
grow()  { ptb --move-call "$PKG::garden::grow" "@$GARDEN" @0x6; }
fund()  { ptb --split-coins gas "[$1]" --assign c --move-call "$PKG::garden::fund" "@$GARDEN" c.0; }
claim() { ptb --move-call "$PKG::garden::claim" "@$GARDEN" --assign r --transfer-objects "[r]" "@$ME"; }

echo "Bahçe: $GARDEN ($ENV_NAME)"
echo "- Fonlama (0,5 SUI)"; expect_ok fund 500000000
echo "- Sıfır fon reddedilmeli"; expect_fail "code 6" fund 0
echo "- Olgunlaşmadan claim reddedilmeli"; expect_fail "code 3" claim

for stage in $(seq 1 "$MAX_STAGE"); do
  for _ in $(seq 1 "$WATER_PER_STAGE"); do
    expect_ok water
    if [ "$stage" -eq 1 ] && [ -z "${COOLDOWN_CHECKED:-}" ]; then
      echo "- Bekleme süresi dolmadan sulama reddedilmeli"; expect_fail "code 1" water
      COOLDOWN_CHECKED=1
    fi
    sleep "$COOLDOWN_S"
  done
  sleep "$STAGE_S"
  echo "- Aşama $stage"; expect_ok grow
done

echo "- Olgun bahçede sulama reddedilmeli"; expect_fail "code 2" water
echo "- Claim"; expect_ok claim
echo "- İkinci claim reddedilmeli"; expect_fail "code 7" claim
echo "Uçtan uca akış tamam."
