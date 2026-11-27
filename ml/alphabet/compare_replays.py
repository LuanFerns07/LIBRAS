"""Compara as letras exibidas nas mesmas janelas com e sem reiniciar a câmera."""

import argparse
import json
from pathlib import Path


def displayed(run, start_ms, end_ms):
    changes = [(time, None) for time in run["clearedAtMs"]]
    changes.extend((item["afterVideoMs"], item["letter"]) for item in run["readings"])
    changes.sort(key=lambda change: change[0])
    current = None
    seen = []
    cursor = start_ms
    for time, letter in changes:
        if time >= end_ms:
            break
        if time > cursor and current and current not in seen:
            seen.append(current)
        current = letter
        cursor = max(cursor, time)
    if current and current not in seen:
        seen.append(current)
    return seen


def window_key(window):
    return window["label"], window["startMs"], window["endMs"]


def summarize(rows, field):
    return {
        "windows": len(rows),
        "expectedShown": sum(row["label"] in row[field] for row in rows),
        "onlyExpected": sum(row[field] == [row["label"]] for row in rows),
        "withoutReading": sum(not row[field] for row in rows),
    }


def compare(continuous, isolated):
    if continuous["build"] != isolated["build"] or not continuous.get("sameCamera") or isolated.get("sameCamera"):
        raise ValueError("Use um replay na mesma câmera e outro por recortes, da mesma compilação.")
    if continuous["manifests"] != isolated["manifests"] or continuous.get("crop") != isolated.get("crop"):
        raise ValueError("Use os mesmos manifestos e o mesmo enquadramento nas duas condições.")
    clips = {(row["source"], *window_key(row)): row for row in isolated["results"]}
    results = []
    for run in continuous["results"]:
        source = run["source"]
        rows = []
        for window in run["windows"]:
            label, start_ms, end_ms = window_key(window)
            clip = clips.pop((source, label, start_ms, end_ms), None)
            if clip is None:
                raise ValueError(f"O recorte {source}/{label} está ausente ou duplicado.")
            rows.append({
                **window,
                "sameCamera": displayed(run, start_ms - run["startMs"], end_ms - run["startMs"]),
                "isolated": displayed(clip, 0, end_ms - start_ms),
            })
        results.append({
            "source": source,
            "sameCamera": summarize(rows, "sameCamera"),
            "isolated": summarize(rows, "isolated"),
            "windows": rows,
        })
    if clips or sum(len(result["windows"]) for result in results) != len(isolated["results"]):
        raise ValueError("Os dois replays devem conter as mesmas janelas.")
    return {"build": continuous["build"], "results": results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("same_camera", type=Path)
    parser.add_argument("isolated", type=Path)
    args = parser.parse_args()
    continuous, isolated = (json.loads(path.read_text(encoding="utf-8")) for path in (args.same_camera, args.isolated))
    print(json.dumps(compare(continuous, isolated), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
