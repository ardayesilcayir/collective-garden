#!/usr/bin/env bash
# Kontratı aktif Sui ortamına yayınlar, bir bahçe oluşturur ve
# frontend/.env.local ile deployments/<ortam>.json dosyalarını yazar.
#
# Kullanım:  ./scripts/deploy.sh
# Parametreler ortam değişkeniyle değiştirilebilir, ör.:
#   GARDEN_NAME="Kampüs Bahçesi" COOLDOWN_MS=60000 ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONTRACT="$ROOT/contract"
FRONTEND="$ROOT/frontend"

GARDEN_NAME="${GARDEN_NAME:-Kolektif Bahçe}"
MAX_STAGE="${MAX_STAGE:-5}"                 # olgunlaşma aşaması
WATER_PER_STAGE="${WATER_PER_STAGE:-5}"     # aşama başına gereken sulama
MIN_STAGE_MS="${MIN_STAGE_MS:-120000}"      # aşamalar arası en az 2 dk
COOLDOWN_MS="${COOLDOWN_MS:-30000}"         # adres başına 30 sn bekleme
BASE_POINTS="${BASE_POINTS:-10}"
DAILY_POINT_CAP="${DAILY_POINT_CAP:-200}"
DIMINISH_AFTER="${DIMINISH_AFTER:-10}"
LATE_STAGE_DIVISOR="${LATE_STAGE_DIVISOR:-2}"

ENV_NAME="$(sui client active-env | tail -n1 | tr -d '[:space:]')"
SENDER="$(sui client active-address | tail -n1 | tr -d '[:space:]')"
echo "Ortam: $ENV_NAME  Adres: $SENDER"

# JSON çıktısından alan çeken küçük yardımcı (jq gerektirmez).
json_pick() {
  node -e '
    let s = require("fs").readFileSync(0, "utf8");
    s = s.slice(s.indexOf("{"));
    const out = JSON.parse(s);
    const status = out.effects?.status?.status ?? out.effects?.V2?.status ?? "success";
    if (status !== "success" && status?.status !== "success" && typeof status === "string")
      { console.error("İşlem başarısız:", JSON.stringify(out.effects?.status)); process.exit(1); }
    const changes = out.objectChanges ?? [];
    const kind = process.argv[1];
    const suffix = process.argv[2];
    const hit = kind === "published"
      ? changes.find((c) => c.type === "published")?.packageId
      : changes.find((c) => c.type === "created" && c.objectType?.endsWith(suffix))?.objectId;
    if (!hit) { console.error("Bulunamadı:", kind, suffix ?? ""); process.exit(1); }
    console.log(hit);
  ' "$@"
}

echo "1/3 Kontrat yayınlanıyor…"
case "$ENV_NAME" in
  testnet|mainnet)
    PUBLISH_CMD=(sui client publish --json) ;;
  *)
    # localnet/devnet: Move.toml'da kalıcı ortam yok, geçici yayın yapılır.
    rm -f "$CONTRACT/Pub.$ENV_NAME.toml"
    PUBLISH_CMD=(sui client test-publish --json --build-env testnet --pubfile-path "Pub.$ENV_NAME.toml") ;;
esac
if ! PUBLISH_OUT="$(cd "$CONTRACT" && "${PUBLISH_CMD[@]}" 2>&1)"; then
  echo "$PUBLISH_OUT" >&2
  exit 1
fi
PACKAGE_ID="$(printf '%s' "$PUBLISH_OUT" | json_pick published)"
ADMIN_CAP_ID="$(printf '%s' "$PUBLISH_OUT" | json_pick created "::garden::AdminCap")"
echo "    Paket:    $PACKAGE_ID"
echo "    AdminCap: $ADMIN_CAP_ID"

echo "2/3 Bahçe oluşturuluyor…"
CREATE_OUT="$(sui client call --json \
  --package "$PACKAGE_ID" --module garden --function create \
  --args "$ADMIN_CAP_ID" "$GARDEN_NAME" "$MAX_STAGE" "$WATER_PER_STAGE" "$MIN_STAGE_MS" \
         "$COOLDOWN_MS" "$BASE_POINTS" "$DAILY_POINT_CAP" "$DIMINISH_AFTER" "$LATE_STAGE_DIVISOR" 0x6 \
  2>/dev/null)"
GARDEN_ID="$(printf '%s' "$CREATE_OUT" | json_pick created "::garden::Garden")"
echo "    Bahçe:    $GARDEN_ID"

echo "3/3 Yapılandırma yazılıyor…"
cat > "$FRONTEND/.env.local" <<EOF
NEXT_PUBLIC_SUI_NETWORK=$ENV_NAME
NEXT_PUBLIC_PACKAGE_ID=$PACKAGE_ID
NEXT_PUBLIC_GARDEN_ID=$GARDEN_ID
EOF

mkdir -p "$ROOT/deployments"
cat > "$ROOT/deployments/$ENV_NAME.json" <<EOF
{
  "network": "$ENV_NAME",
  "publisher": "$SENDER",
  "packageId": "$PACKAGE_ID",
  "adminCapId": "$ADMIN_CAP_ID",
  "gardenId": "$GARDEN_ID",
  "params": {
    "name": "$GARDEN_NAME",
    "maxStage": $MAX_STAGE,
    "waterPerStage": $WATER_PER_STAGE,
    "minStageDurationMs": $MIN_STAGE_MS,
    "cooldownMs": $COOLDOWN_MS,
    "basePoints": $BASE_POINTS,
    "dailyPointCap": $DAILY_POINT_CAP,
    "diminishAfter": $DIMINISH_AFTER,
    "lateStageDivisor": $LATE_STAGE_DIVISOR
  }
}
EOF

echo "Tamam. frontend/.env.local ve deployments/$ENV_NAME.json güncellendi."
