#!/usr/bin/env bash
# Gate de SPEC-casa-malva-encadenar-cobros.
# LO CORRE EL AUDITOR Y EL LOOP, NUNCA EL CONSTRUCTOR (inviolable 3).
#
# QUE PROTEGE
# `prueba:cobros` existe desde hace semanas y NADIE la corre: no esta encadenada
# en `verificar` ni en `verificar:nube`. Una prueba que nadie corre no protege
# nada — es el anti-patron A de protocolos/CODIGO.md, el guardian que no guarda.
#
# LA TRAMPA QUE ESTE GATE VIGILA
# Hay DOS pruebas huerfanas, y solo UNA debe encadenarse. `prueba:meta` esta
# fuera A PROPOSITO: su propia cabecera dice "No es un gate de la cadena
# verificar: necesita red y credenciales". Meterla romperia `verificar` en
# cualquier maquina sin token de Meta.
#
# Por eso G2 existe: **hacer de mas es tan fallo como hacer de menos.**
#
# Uso:  bash docs/specs/verificar-cadena-pruebas.sh
#       (desde la raiz de ~/proyectos/casa-malva, con shell de login para node)

set -uo pipefail

FALLOS=0
falla() { echo "FALLO  $1"; shift; for L in "$@"; do echo "       $L"; done; FALLOS=$((FALLOS+1)); }
pasa()  { echo "ok     $1"; }

if [ ! -f package.json ]; then
  falla "no hay package.json aqui." "Correlo desde la raiz de casa-malva."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  falla "node no esta en el PATH." \
        "Necesita shell de login (nvm):  bash -lc '...'" \
        "Un gate que no puede correr NO es un gate verde: es un gate que no corrio."
  exit 1
fi

# ── G3 primero: si el JSON esta roto, lo demas no se puede leer ───────────────
if node -e 'JSON.parse(require("fs").readFileSync("package.json","utf8"))' 2>/dev/null; then
  pasa "package.json es JSON valido"
else
  falla "package.json ya no es JSON valido." \
        "Se rompio al editarlo. Nada mas se puede comprobar."
  exit 1
fi

LEE='const s=JSON.parse(require("fs").readFileSync("package.json","utf8")).scripts||{};'

# ── G1 · prueba:cobros TIENE que estar encadenada en verificar ────────────────
if node -e "$LEE process.exit((s['verificar']||'').includes('prueba:cobros')?0:1)"; then
  pasa "G1 — prueba:cobros encadenada en verificar"
else
  falla "G1 — prueba:cobros sigue sin estar en la cadena 'verificar'." \
        "El archivo scripts/prueba-cobros.ts existe y pasa 8 casos, y nadie lo corre." \
        "Una prueba que nadie corre no protege nada."
fi

# ── G2 · prueba:meta NO puede entrar. Esta fuera a proposito ──────────────────
EN_VER="$(node -e "$LEE console.log((s['verificar']||'').includes('prueba:meta')?'si':'no')")"
EN_NUBE="$(node -e "$LEE console.log((s['verificar:nube']||'').includes('prueba:meta')?'si':'no')")"
if [ "$EN_VER" = "no" ] && [ "$EN_NUBE" = "no" ]; then
  pasa "G2 — prueba:meta sigue fuera de las cadenas, como debe"
else
  falla "G2 — prueba:meta se encadeno, y no debia." \
        "verificar: $EN_VER · verificar:nube: $EN_NUBE" \
        "Su propia cabecera lo dice: 'No es un gate de la cadena verificar:" \
        "necesita red y credenciales'. Encadenarla rompe verificar en cualquier" \
        "maquina sin token de Meta." \
        "HACER DE MAS ES TAN FALLO COMO HACER DE MENOS."
fi

# ── G4 · no se perdio ningun script por el camino ─────────────────────────────
N="$(node -e "$LEE console.log(Object.keys(s).filter(k=>k.startsWith('prueba:')).length)")"
if [ "$N" = "20" ]; then
  pasa "G4 — los 20 scripts prueba:* siguen definidos"
else
  falla "G4 — habia 20 scripts 'prueba:*' y ahora hay $N." \
        "Editar la cadena no puede borrar ni renombrar pruebas."
fi

# ── G5 · el EFECTO, no el codigo de salida: la prueba corre de verdad ─────────
SALIDA="$(npm run prueba:cobros 2>&1)"
if echo "$SALIDA" | grep -q "Todas las pruebas pasaron"; then
  OKS="$(echo "$SALIDA" | grep -c '✅')"
  pasa "G5 — prueba:cobros corre y pasa ($OKS casos en verde)"
else
  falla "G5 — prueba:cobros no termina en verde." \
        "$(echo "$SALIDA" | tail -6)"
fi

echo ""
if [ "$FALLOS" -gt 0 ]; then
  echo "$FALLOS gate(s) en rojo. NO se entrega."
  exit 1
fi
echo "Gate automatico en verde."
exit 0
