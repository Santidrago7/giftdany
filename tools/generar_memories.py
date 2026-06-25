"""
Generador opcional de data/memories.js.

Uso:
    python tools/generar_memories.py

Este script escanea la carpeta photos/ y crea una lista básica de recuerdos.
Después puedes editar títulos y mensajes manualmente en data/memories.js.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PHOTOS_DIR = ROOT / "photos"
OUTPUT = ROOT / "data" / "memories.js"

VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"}
COLORS = [
    "#ff6ec7",
    "#ffd166",
    "#ff8a64",
    "#8f5cff",
    "#6ee7ff",
    "#ff4fc3",
    "#f7b267",
    "#80ffdb",
]


def title_from_filename(path: Path) -> str:
    words = path.stem.replace("-", " ").replace("_", " ").split()
    return " ".join(word.capitalize() for word in words) or "Recuerdo"


def main() -> None:
    images = sorted(
        path for path in PHOTOS_DIR.iterdir()
        if path.is_file() and path.suffix.lower() in VALID_EXTENSIONS
    )

    memories = []
    for index, image in enumerate(images, start=1):
        safe_id = image.stem.lower().replace(" ", "-")
        memories.append({
            "id": safe_id,
            "title": title_from_filename(image),
            "image": f"photos/{image.name}",
            "message": "Escribe aquí el mensaje especial de este recuerdo",
            "clickable": True,
            "color": COLORS[(index - 1) % len(COLORS)],
        })

    js = "// Archivo generado por tools/generar_memories.py\n"
    js += "// Puedes editar títulos, mensajes, colores y clickable manualmente.\n\n"
    js += "window.MEMORIES = "
    js += json.dumps(memories, ensure_ascii=False, indent=2)
    js += ";\n"

    OUTPUT.write_text(js, encoding="utf-8")
    print(f"Listo: se generaron {len(memories)} recuerdos en {OUTPUT}")


if __name__ == "__main__":
    main()
