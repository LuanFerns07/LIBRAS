from hashlib import sha256
from pathlib import Path
from shutil import copyfile
import subprocess
import sys
import tempfile
import unittest


LAUNCHER = Path(__file__).resolve().parents[1] / "scripts" / "servir-previa.py"


class PackagedPreviewTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.package = Path(self.temp.name)
        copyfile(LAUNCHER, self.package / "iniciar.py")
        self.index = self.package / "site" / "index.html"
        self.index.parent.mkdir()
        self.index.write_text("<title>LibrasIA</title>", encoding="utf-8")
        self.checksums = self.package / "SHA256SUMS"
        self.checksums.write_text(
            f"{sha256(self.index.read_bytes()).hexdigest()}  site/index.html\n", encoding="utf-8",
        )

    def launch(self, *args):
        return subprocess.run(
            [sys.executable, self.package / "iniciar.py", *args],
            capture_output=True, text=True, timeout=5,
        )

    def test_verifies_contents_from_another_working_directory(self):
        result = self.launch("--verificar")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("Integridade do pacote verificada", result.stdout)

    def test_detects_altered_and_missing_files_before_serving(self):
        self.index.write_text("arquivo alterado", encoding="utf-8")
        altered = self.launch()
        self.assertEqual(altered.returncode, 1)
        self.assertIn("arquivos ausentes ou alterados", altered.stderr)
        self.index.unlink()
        self.assertEqual(self.launch("--verificar").returncode, 1)

    def test_explicit_verification_requires_a_manifest(self):
        self.checksums.unlink()
        result = self.launch("--verificar")
        self.assertEqual(result.returncode, 1)
        self.assertIn("SHA256SUMS", result.stderr)
