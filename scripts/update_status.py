"""Gera o painel SVG do README a partir dos estados no roadmap."""

import argparse
from collections import Counter
from dataclasses import dataclass
from html import escape
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
ROADMAP = ROOT / "ROADMAP_LIBRASIA.md"
OUTPUT = ROOT / "assets" / "status.svg"
STATUS_COLORS = {
    "A fazer": ("#23274a", "#d1d8ff"),
    "A testar": ("#3d2d19", "#ffd893"),
    "Pronto": ("#193832", "#a0f2cc"),
}
MILESTONE_ROW = re.compile(r"^\|\s*\*\*(M\d+) · (.+?)\*\*\s*\|\s*([^|]+)\|")


@dataclass(frozen=True)
class Milestone:
    code: str
    title: str
    status: str


def read_milestones():
    milestones = []
    seen = set()
    for number, line in enumerate(ROADMAP.read_text(encoding="utf-8").splitlines(), 1):
        if not line.startswith("| **M"):
            continue
        match = MILESTONE_ROW.match(line)
        if not match:
            raise ValueError(f"Linha {number} do roadmap: formato de marco inválido.")
        code, title, status = (value.strip() for value in match.groups())
        if code in seen:
            raise ValueError(f"Linha {number} do roadmap: código repetido ({code}).")
        if not title or status not in STATUS_COLORS:
            raise ValueError(f"Linha {number} do roadmap: título ou status inválido ({code}).")
        milestones.append(Milestone(code, title, status))
        seen.add(code)
    if not milestones:
        raise ValueError("Nenhum marco encontrado nas tabelas do roadmap.")
    return milestones


def render(milestones):
    counts = Counter(milestone.status for milestone in milestones)
    summary = ", ".join(f"{counts[status]} {status.lower()}" for status in STATUS_COLORS)
    first_row = 158
    row_step = 37
    height = first_row + row_step * len(milestones) + 20
    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="{height}" '
        f'viewBox="0 0 640 {height}" role="img" aria-labelledby="title description">',
        '  <title id="title">Status do projeto LibrasIA</title>',
        f'  <desc id="description">Resumo dos marcos: {escape(summary)}.</desc>',
        '  <!-- Gerado por scripts/update_status.py a partir de ROADMAP_LIBRASIA.md. -->',
        f'  <rect x="0.5" y="0.5" width="639" height="{height - 1}" rx="18" '
        'fill="#151329" stroke="#3e385d"/>',
        '  <g font-family="system-ui, DejaVu Sans, sans-serif">',
        '    <text x="28" y="43" fill="#f8f6ff" font-size="25" '
        'font-weight="700">Status do projeto</text>',
    ]
    for index, (status, (background, foreground)) in enumerate(STATUS_COLORS.items()):
        x = 28 + index * 200
        svg.extend([
            f'    <rect x="{x}" y="62" width="184" height="57" rx="10" fill="{background}"/>',
            f'    <text x="{x + 15}" y="96" font-size="16" fill="{foreground}">{status}</text>',
            f'    <text x="{x + 169}" y="100" text-anchor="end" font-size="27" '
            f'font-weight="700" fill="{foreground}">{counts[status]}</text>',
        ])
    svg.append('    <text x="28" y="146" fill="#d6d0ed" font-size="14" font-weight="600">Marcos</text>')
    for index, milestone in enumerate(milestones):
        y = first_row + index * row_step
        background, foreground = STATUS_COLORS[milestone.status]
        svg.extend([
            f'    <rect x="28" y="{y}" width="584" height="32" rx="7" fill="#211d38"/>',
            f'    <text x="40" y="{y + 21}" fill="#c6b8eb" font-family="monospace" '
            f'font-size="13">{milestone.code}</text>',
            f'    <text x="80" y="{y + 22}" fill="#f5f2ff" font-size="16">{escape(milestone.title)}</text>',
            f'    <rect x="516" y="{y + 4}" width="90" height="24" rx="12" fill="{background}"/>',
            f'    <text x="561" y="{y + 21}" text-anchor="middle" fill="{foreground}" '
            f'font-weight="600" font-size="13">{milestone.status}</text>',
        ])
    return "\n".join([*svg, "  </g>", "</svg>", ""])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verifica o SVG existente.")
    args = parser.parse_args()
    try:
        svg = render(read_milestones())
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")

    if args.check:
        if not OUTPUT.is_file() or OUTPUT.read_text(encoding="utf-8") != svg:
            parser.exit(1, "Painel desatualizado. Rode python3 scripts/update_status.py.\n")
        print("O painel corresponde ao roadmap.")
    else:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(svg, encoding="utf-8")
        print(f"Painel atualizado em {OUTPUT.relative_to(ROOT)}.")


if __name__ == "__main__":
    main()
