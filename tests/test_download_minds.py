from io import BytesIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

from scripts.download_minds import candidates, extract, fetch_range, sha256


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


if __name__ == "__main__":
    unittest.main()
