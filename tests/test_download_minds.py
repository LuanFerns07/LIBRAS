from io import BytesIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from scripts.download_minds import EXPANDED, ZIP32_LIMIT, candidates, extract, fetch_range, recover_zip32_offsets, sha256


class FakeResponse(BytesIO):
    def __init__(self, data, content_range, status=206):
        super().__init__(data)
        self.headers = {"Content-Range": content_range}
        self.status = status


class DownloadMindsTests(unittest.TestCase):
    def test_range_mismatch_is_rejected(self):
        with patch("scripts.download_minds.urlopen", return_value=FakeResponse(b"567", "bytes 5-7/13")):
            with self.assertRaisesRegex(ValueError, "Content-Range"):
                fetch_range("https://example.test/data.zip", 2, 4)

    def test_selection_preserves_one_archive_per_signer_and_matches_source_codes(self):
        members = [
            zipfile.ZipInfo("Sinalizador01/Canon/03AmareloSinalizador01-2.mp4"),
            zipfile.ZipInfo("Sinalizador01/Canon/03AmareloSinalizador01-1.mp4"),
            zipfile.ZipInfo("Sinalizador01/Canon/09BarulhoSinalizador01-1.mp4"),
            zipfile.ZipInfo("Sinalizador01/Canon/12EspelhoSinalizador03-1.mp4"),
            zipfile.ZipInfo("__MACOSX/Sinalizador01/Canon/._03AmareloSinalizador01-1.mp4"),
        ]
        selection = list(candidates(1, members, reps=1, negatives=1))
        self.assertEqual([(code, rep) for code, rep, _ in selection], [("03", 1), ("09", 1)])
        members += [zipfile.ZipInfo("Sinalizador01/Canon/02AlunoSinalizador01-1.mp4")]
        expanded = list(candidates(1, members, reps=1, negatives=1, labels=EXPANDED))
        self.assertEqual([item[0] for item in expanded], ["03", "02", "09"])

    def test_extract_validates_and_recovers_one_member(self):
        for compression in (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED):
            with self.subTest(compression=compression), tempfile.TemporaryDirectory() as work:
                archive_bytes = BytesIO()
                name = "Sinalizador07/Canon/10CincoSinalizador07-1.mp4"
                clip = b"not a video, just a ZIP fixture" * 2048
                with zipfile.ZipFile(archive_bytes, "w", compression) as archive:
                    archive.writestr("readme.txt", b"metadata")
                    archive.writestr(name, clip)
                encoded = archive_bytes.getvalue()
                with zipfile.ZipFile(BytesIO(encoded)) as archive:
                    info = archive.getinfo(name)

                def response(_url, start, end):
                    return BytesIO(encoded[start:end + 1]), start, len(encoded)

                path = Path(work) / "clip.mp4"
                with patch("scripts.download_minds.fetch_range", side_effect=response):
                    self.assertEqual(extract(7, len(encoded), info, path), sha256(path))
                self.assertEqual(path.read_bytes(), clip)
                self.assertFalse(path.with_suffix(".part").exists())

                info.CRC ^= 1
                with patch("scripts.download_minds.fetch_range", side_effect=response):
                    with self.assertRaisesRegex(ValueError, "CRC"):
                        extract(7, len(encoded), info, path)
                self.assertEqual(path.read_bytes(), clip)
                self.assertFalse(path.with_suffix(".part").exists())

    def test_large_legacy_archives_recover_offsets_before_and_after_wraparound(self):
        directory = [zipfile.ZipInfo(name) for name in ("first", "before", "after")]
        for info, offset, size in zip(directory, (0, ZIP32_LIMIT - 200, 500), (100, 400, 100)):
            info.header_offset = ZIP32_LIMIT + offset
            info.compress_size = size
        recover_zip32_offsets(directory, ZIP32_LIMIT + 1400)
        self.assertEqual([info.header_offset for info in directory], [0, ZIP32_LIMIT - 200, ZIP32_LIMIT + 500])

if __name__ == "__main__":
    unittest.main()
