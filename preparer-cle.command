#!/bin/bash
#
# Prépare la clé USB : construit l'application puis copie le fichier utilisable
# et le guide évaluateur sur la clé choisie.
#
# Utilisation : double-cliquer sur ce fichier dans le Finder.
#

# Se placer dans le dossier du projet (là où se trouve ce script)
cd "$(dirname "$0")" || exit 1

echo "============================================================"
echo "  Préparation de la clé USB — Grille d'évaluation pratique"
echo "============================================================"
echo ""

# 1) Dépendances
if [ ! -d "node_modules" ]; then
  echo "→ Première installation des dépendances (patientez)..."
  npm install || { echo "❌ Échec de l'installation."; read -r -p "Appuyez sur Entrée pour fermer."; exit 1; }
  echo ""
fi

# 2) Construction de l'application
echo "→ Construction de l'application..."
npm run build || { echo "❌ Échec de la construction."; read -r -p "Appuyez sur Entrée pour fermer."; exit 1; }
echo "✅ Application construite (dist/index.html)"
echo ""

# 3) Vérifier la présence des fichiers à copier
APP_FILE="dist/index.html"
GUIDE_FILE="docs/Guide-evaluateurs.html"

if [ ! -f "$APP_FILE" ]; then
  echo "❌ Introuvable : $APP_FILE"
  read -r -p "Appuyez sur Entrée pour fermer."
  exit 1
fi

# 4) Choix de la clé USB (volumes montés sous /Volumes)
echo "Clés / disques disponibles :"
echo ""

shopt -s nullglob
volumes=()
for v in /Volumes/*; do
  # Ignorer le disque système principal
  if [ "$v" != "/Volumes/Macintosh HD" ]; then
    volumes+=("$v")
  fi
done

if [ ${#volumes[@]} -eq 0 ]; then
  echo "❌ Aucune clé USB détectée. Branchez la clé puis relancez ce script."
  read -r -p "Appuyez sur Entrée pour fermer."
  exit 1
fi

select choice in "${volumes[@]}" "Annuler"; do
  if [ "$choice" = "Annuler" ] || [ -z "$choice" ]; then
    echo "Opération annulée."
    read -r -p "Appuyez sur Entrée pour fermer."
    exit 0
  fi
  DEST="$choice"
  break
done

echo ""
echo "→ Copie vers : $DEST"

# 5) Copie des fichiers
cp "$APP_FILE" "$DEST/index.html" || { echo "❌ Échec de la copie de l'application."; read -r -p "Appuyez sur Entrée pour fermer."; exit 1; }
echo "   ✅ index.html copié"

if [ -f "$GUIDE_FILE" ]; then
  cp "$GUIDE_FILE" "$DEST/Guide-evaluateurs.html" && echo "   ✅ Guide-evaluateurs.html copié"
fi

echo ""
echo "============================================================"
echo "  ✅ Terminé. La clé est prête à être distribuée."
echo "============================================================"
echo ""
echo "Rappel : sur chaque poste, régler une fois le dossier de"
echo "téléchargement du navigateur sur la clé (voir le guide)."
echo ""
read -r -p "Appuyez sur Entrée pour fermer."
