"""Reproduz os negativos externos na Área livre em Chromium, em WebAssembly."""

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[2]
MANIFESTS = {
    "clad": "ml/external_eval/evidence/variants/manifest.json",
    "didactic": "ml/fresh_eval/evidence-negatives/manifest.json",
}
FILTER = "scale=640:-2,fps=30,tpad=start_duration=0.5:color=lime:stop_mode=clone:stop_duration=0.5"
TRANSCRIPT = "Texto de controle."


def sha256(path):
    with path.open("rb") as media:
        return hashlib.file_digest(media, "sha256").hexdigest()


def replay(clip, sources, destination, url):
    clip_id = clip["id"]
    source = sources / clip["group"] / clip["file"]
    if sha256(source) != clip["sha256"]:
        raise ValueError(f"SHA-256 divergente para {source}")
    fixture = destination / f"{clip_id}.y4m"
    report = destination / f"{clip_id}.json"
    log = destination / f"{clip_id}.log"
    subprocess.run([
        "ffmpeg", "-nostdin", "-v", "error", "-y", "-filter_threads", "1",
        "-i", str(source), "-an", "-vf", FILTER, "-pix_fmt", "yuv420p", str(fixture),
    ], check=True)
    environment = {key: value for key, value in os.environ.items() if not key.startswith("LIBRASIA_TEST_")}
    environment.update(
        LIBRASIA_TEST_URL=url, LIBRASIA_TEST_RECOGNITION="1", LIBRASIA_TEST_SYNC="1",
        LIBRASIA_TEST_AUDIT_NEGATIVE="1", LIBRASIA_TEST_START_OFFSET_MS="500",
        LIBRASIA_TEST_CAPTURE_MS=str(clip["durationMs"]), LIBRASIA_TEST_VIDEO=str(fixture),
        LIBRASIA_TEST_TRANSCRIPT_PREFIX=TRANSCRIPT, LIBRASIA_TEST_REPORT=str(report),
    )
    with log.open("wb") as output:
        process = subprocess.run(["node", "--test", "tests/e2e/recognition.test.mjs"],
                                 cwd=ROOT, env=environment, stdout=output, stderr=subprocess.STDOUT)
    if process.returncode:
        raise RuntimeError(f"A reprodução de {clip_id} falhou. Consulte {log}")
    evidence = json.loads(report.read_text())
    decision, = evidence["decisions"]
    timing = decision["timing"]
    result = {
        "id": clip_id, "group": clip["group"], "stratum": clip["stratum"],
        "sourceLabel": clip["sourceLabel"], "clipSha256": clip["sha256"], "fixtureSha256": sha256(fixture),
        "captureMs": clip["durationMs"],
        "observedWindowMs": [decision["window"]["offsetMs"], decision["window"]["endMs"]],
        "state": decision["state"], "reason": decision.get("reason"), "classifierCalls": timing["classifierCalls"],
        "extractedFrames": len(timing["extractionMs"]), "transcript": decision["transcript"],
    }
    print(f'{clip_id} · {result["state"]} · {result["classifierCalls"]} chamada(s)', flush=True)
    return evidence["build"], evidence["environment"]["browser"], result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://127.0.0.1:4177", help="URL do pacote local")
    parser.add_argument("--sources", type=Path, default=Path("data/isolated-negative-audit"))
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    destination = args.out.resolve()
    destination.mkdir(parents=True, exist_ok=True)
    sources = args.sources.resolve()
    clips = [dict(clip, group=group) for group, manifest in MANIFESTS.items()
             for clip in json.loads((ROOT / manifest).read_text())["clips"]]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        runs = list(pool.map(lambda clip: replay(clip, sources, destination, args.url), clips))
    build, browser, _ = runs[0]
    if any((item_build, item_browser) != (build, browser) for item_build, item_browser, _ in runs):
        raise RuntimeError("A compilação, o modelo ou o navegador mudou durante a reprodução.")
    results = [result for _, _, result in runs]
    by_stratum = {}
    for stratum in sorted({item["stratum"] for item in results}):
        items = [item for item in results if item["stratum"] == stratum]
        by_stratum[stratum] = {
            "total": len(items), "classifierReached": sum(item["classifierCalls"] > 0 for item in items),
            "falseAcceptances": sum(item["state"] == "accepted" for item in items),
        }
    ffmpeg = subprocess.check_output(["ffmpeg", "-version"], text=True).splitlines()[0]
    report = {
        "scope": "external-negative-recorded-camera", "build": build, "browser": browser, "ffmpeg": ffmpeg,
        "sourceManifests": MANIFESTS, "fixtureTransform": FILTER, "markerOffsetMs": 500, "transcriptPrefix": TRANSCRIPT,
        "states": dict(Counter(item["state"] for item in results)), "byStratum": by_stratum, "results": results,
    }
    (destination / "summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
