#!/usr/bin/env bash
# Configura assinatura release estável após `expo prebuild`.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
KEYSTORE_SRC="$ROOT_DIR/credentials/liteus-release.keystore"
ANDROID_APP="$ROOT_DIR/android/app"
BUILD_GRADLE="$ANDROID_APP/build.gradle"
KEYSTORE_DST="$ANDROID_APP/liteus-release.keystore"

export STORE_PASSWORD="${LITEUS_STORE_PASSWORD:-liteus2026sync}"
export KEY_ALIAS="${LITEUS_KEY_ALIAS:-liteus}"
export KEY_PASSWORD="${LITEUS_KEY_PASSWORD:-liteus2026sync}"
export BUILD_GRADLE

if [ ! -f "$KEYSTORE_SRC" ]; then
  echo "Keystore não encontrado: $KEYSTORE_SRC"
  exit 1
fi

if [ ! -f "$BUILD_GRADLE" ]; then
  echo "android/app/build.gradle não encontrado. Rode expo prebuild antes."
  exit 1
fi

cp "$KEYSTORE_SRC" "$KEYSTORE_DST"

if grep -q "liteus-release.keystore" "$BUILD_GRADLE"; then
  echo "Assinatura Liteus já configurada em build.gradle"
  exit 0
fi

python3 <<'PY'
from pathlib import Path
import os
import re

path = Path(os.environ["BUILD_GRADLE"])
text = path.read_text(encoding="utf-8")

store_password = os.environ["STORE_PASSWORD"]
key_alias = os.environ["KEY_ALIAS"]
key_password = os.environ["KEY_PASSWORD"]

signing_block = f"""
    signingConfigs {{
        release {{
            storeFile file('liteus-release.keystore')
            storePassword '{store_password}'
            keyAlias '{key_alias}'
            keyPassword '{key_password}'
        }}
    }}
"""

marker = "    buildTypes {"
if marker not in text:
    raise SystemExit("Não achei buildTypes no build.gradle")

if "liteus-release.keystore" not in text:
    text = text.replace(marker, signing_block + "\n" + marker, 1)

text2, n = re.subn(
    r"(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug",
    r"\1signingConfig signingConfigs.release",
    text,
    count=1,
    flags=re.S,
)
if n == 0:
    text2, n = re.subn(
        r"(release\s*\{)",
        r"\1\n            signingConfig signingConfigs.release",
        text,
        count=1,
    )
    if n == 0:
        raise SystemExit("Não consegui definir signingConfig release")

path.write_text(text2, encoding="utf-8")
print("Assinatura release Liteus aplicada em", path)
PY
