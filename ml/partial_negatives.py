"""Liga recortes temporais negativos aos vídeos de treino que os originaram."""

from collections import defaultdict

from dataset import LABELS, digest, load_features


WINDOWS = ("prefix", "suffix")


def load_partial_negatives(path, base_index, rows, labels=LABELS):
    index, clips = load_features(path, {"train"}, labels, training_negatives=True)
    if any(index[key] != base_index[key] for key in ("recipe", "modelSha256", "preprocess")):
        raise ValueError("A extração dos recortes deve usar a mesma receita dos vídeos completos.")
    parents = {row.checksum: row for row in rows if row.label == 0 and row.partition == "train"}
    base_hashes = {item["sha256"] for item in base_index["clips"]}
    grouped = defaultdict(dict)
    for clip in clips:
        item = index["clips"][clip.index]
        parent = parents.get(item["parentSha256"])
        window = item["window"]
        if (parent is None or parent.signer != clip.signer or parent.source_label != clip.source_label
                or window not in WINDOWS or clip.checksum in base_hashes):
            raise ValueError("Recorte negativo sem vínculo válido com o vídeo de origem.")
        if window in grouped[parent.index]:
            raise ValueError("Mais de um recorte da mesma posição para um vídeo.")
        grouped[parent.index][window] = clip
    if set(grouped) != {row.index for row in parents.values()} or any(
        set(pair) != set(WINDOWS) for pair in grouped.values()
    ):
        raise ValueError("Cada vídeo negativo de treino precisa dos dois recortes previstos.")
    return {parent: {window: pair[window] for window in WINDOWS} for parent, pair in grouped.items()}, {
        "featuresManifestSha256": digest(path),
        "sourceManifestSha256": index["sourceManifestSha256"],
        "parentClips": len(parents),
        "windows": len(clips),
        "eligibleWindows": sum(clip.values is not None for clip in clips),
    }
