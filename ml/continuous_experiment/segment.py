"""Candidatos temporais por atividade manual e referência de glosas do ELAN."""

from itertools import product
from pathlib import PurePosixPath
from xml.etree import ElementTree

import numpy as np

from .metrics import Segment, Segmentation


IOU_THRESHOLDS = (0.25, 0.5, 0.75)


def read_eaf(path, tier_id, media_name, duration_ms):
    root = ElementTree.parse(path).getroot()
    descriptors = {PurePosixPath(item.attrib["MEDIA_URL"]).name: float(item.attrib.get("TIME_ORIGIN", 0))
                   for item in root.findall("./HEADER/MEDIA_DESCRIPTOR")}
    if media_name not in descriptors:
        raise ValueError(f"Vídeo ausente dos metadados ELAN: {media_name}")
    offset = descriptors[media_name]
    times = {slot.attrib["TIME_SLOT_ID"]: int(slot.attrib["TIME_VALUE"])
             for slot in root.findall("./TIME_ORDER/TIME_SLOT") if "TIME_VALUE" in slot.attrib}
    tiers = [tier for tier in root.findall("./TIER") if tier.attrib["TIER_ID"] == tier_id]
    if len(tiers) != 1:
        raise ValueError(f"Trilha ELAN inexistente ou ambígua: {tier_id}")
    intervals = []
    for annotation in tiers[0].findall("./ANNOTATION/ALIGNABLE_ANNOTATION"):
        start = max(0, times[annotation.attrib["TIME_SLOT_REF1"]] - offset)
        end = min(duration_ms, times[annotation.attrib["TIME_SLOT_REF2"]] - offset)
        if end > start:
            intervals.append(Segment(start, end, annotation.findtext("./ANNOTATION_VALUE", "").strip()))
    return sorted(intervals, key=lambda segment: segment.start_ms)


def hand_motion(timestamps, coordinates):
    """Velocidade robusta em larguras de mão por segundo, independente da distância à câmera."""
    if len(timestamps) < 2 or coordinates.shape != (len(timestamps), 2, 21, 2):
        raise ValueError("São necessários ao menos dois quadros com dois canais de mãos de 21 pontos xy.")
    intervals = np.diff(timestamps)
    if np.any(intervals <= 0):
        raise ValueError("Timestamps precisam ser crescentes.")
    is_seen = np.isfinite(coordinates).all(axis=(2, 3))
    present = is_seen[1:] & is_seen[:-1]
    scale = np.linalg.norm(coordinates[1:, :, 5, :] - coordinates[1:, :, 17, :], axis=-1)
    displacement = np.linalg.norm(np.diff(coordinates, axis=0), axis=-1)
    speed = np.median(displacement, axis=-1) * 1000 / (np.maximum(scale, 0.01) * intervals[:, None])
    activity = np.where(present, speed, 0).max(axis=1)
    padded = np.pad(activity, (1, 1), mode="edge")
    return np.convolve(padded, [0.25, 0.5, 0.25], mode="valid")


def segment_motion(timestamps, motion, *, threshold, min_ms, bridge_ms):
    if len(motion) != len(timestamps) - 1 or threshold <= 0 or min_ms < 0 or bridge_ms < 0:
        raise ValueError("Parâmetros incompatíveis com a linha de tempo.")
    active = np.flatnonzero(motion >= threshold)
    if not len(active):
        return []
    intervals = []
    start = int(active[0])
    last = start
    for index in active[1:]:
        if timestamps[index] - timestamps[last + 1] > bridge_ms:
            if timestamps[last + 1] - timestamps[start] >= min_ms:
                intervals.append(Segment(float(timestamps[start]), float(timestamps[last + 1])))
            start = int(index)
        last = int(index)
    if timestamps[last + 1] - timestamps[start] >= min_ms:
        intervals.append(Segment(float(timestamps[start]), float(timestamps[last + 1])))
    return intervals


def segment_scores(reference, guessed):
    results = []
    for cutoff in IOU_THRESHOLDS:
        score = Segmentation(cutoff)
        score.add(reference, guessed)
        results.append(score.report())
    return results


def select_on_dev(reference, timestamps, motion):
    best = None
    selected = None
    for cutoff, min_ms, bridge in product((0.5, 0.8, 1.2, 1.8, 2.5, 3.5), (100, 160, 230), (0, 65, 125)):
        config = {"threshold": cutoff, "min_ms": min_ms, "bridge_ms": bridge}
        guess = segment_motion(timestamps, motion, **config)
        score = Segmentation(0.5)
        score.add(reference, guess)
        result = score.report()
        key = (result["f1"] or 0, result["matched_mean_iou"] or 0, -abs(len(guess) - len(reference)))
        if best is None or key > best:
            best = key
            selected = config
    return selected
