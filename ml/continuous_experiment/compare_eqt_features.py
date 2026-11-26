"""Compara o mesmo vídeo EQT em duas extrações sem inferir ordem por convenção."""

import argparse
from io import BytesIO
import json
from pathlib import Path
from zipfile import ZipFile

import numpy as np

from .acquire_eqt import HAND_DIRECTORY


MEMBER = HAND_DIRECTORY + "138_A  luz caiu em alguns cômodos/INFORMANTE 3/IMG_3311.npy"


def compare(archive_path, browser):
    with ZipFile(archive_path) as archive:
        eqt = np.load(BytesIO(archive.read(MEMBER)), allow_pickle=False).reshape(82, 2, 21, 3)
    app = np.zeros_like(eqt)
    if len(browser["frames"]) != len(eqt):
        raise ValueError("A extração no navegador deve conter 82 quadros.")
    for index, hands in enumerate(browser["frames"]):
        if len(hands) != 2:
            raise ValueError("Cada quadro deve apresentar dois canais de mão.")
        for side, points in enumerate(hands):
            if points:
                app[index, side] = points

    present_eqt = np.any(eqt != 0, axis=(2, 3))
    report = {}
    for name, trial in (("left_then_right", app), ("right_then_left", app[:, ::-1])):
        present = np.any(trial != 0, axis=(2, 3))
        paired = present_eqt & present
        errors = np.abs(eqt[paired] - trial[paired]).reshape(-1, 3)
        report[name] = {
            "presence_agreement": float(np.mean(present_eqt == present)),
            "mismatched_frame_hands": int(np.count_nonzero(present_eqt != present)),
            "compared_frame_hands": int(np.count_nonzero(paired)),
            "mean_absolute_xyz": errors.mean(axis=0).tolist() if errors.size else None,
            "p95_absolute_xyz": np.percentile(errors, 95, axis=0).tolist() if errors.size else None,
        }
    return {
        "eqt_member": MEMBER,
        "rgb_member": "138_A  luz caiu em alguns cômodos./INFORMANTE 3/IMG_3311.mp4",
        "frames": len(eqt),
        "browser_input": {field: browser[field] for field in ("width", "height", "fps")},
        "orders": report,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("browser", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    browser = json.loads(args.browser.read_text(encoding="utf-8"))
    report = json.dumps(compare(args.archive, browser), ensure_ascii=False, indent=2) + "\n"
    args.output.write_text(report, encoding="utf-8")
    print(report, end="")


if __name__ == "__main__":
    main()
