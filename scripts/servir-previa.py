"""Serve o pacote local do LibrasIA no endereço de loopback."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import subprocess


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--porta", type=int, default=4173)
    parser.add_argument("--verificar", action="store_true", help="Confere a integridade do pacote e encerra.")
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    checksums = directory / "SHA256SUMS"
    if args.verificar or checksums.is_file():
        if not checksums.is_file():
            parser.exit(1, "O pacote não contém SHA256SUMS. Gere uma nova cópia para verificar a integridade.\n")
        result = subprocess.run(
            ["sha256sum", "--check", "--strict", "--quiet", checksums.name],
            cwd=directory,
        )
        if result.returncode:
            parser.exit(1, "O pacote contém arquivos ausentes ou alterados.\n")
        if args.verificar:
            print("Integridade do pacote verificada.")
            return
    configuration = json.loads((directory / "vercel.json").read_text(encoding="utf-8"))

    class PreviewHandler(SimpleHTTPRequestHandler):
        extensions_map = {
            **SimpleHTTPRequestHandler.extensions_map,
            ".mjs": "text/javascript", ".wasm": "application/wasm",
            ".onnx": "application/octet-stream", ".task": "application/octet-stream",
        }

        def end_headers(self):
            for header in configuration["headers"][0]["headers"]:
                self.send_header(header["key"], header["value"])
            super().end_headers()

        def list_directory(self, path):
            self.send_error(404)
            return None

    handler = partial(PreviewHandler, directory=directory / "site")
    with ThreadingHTTPServer(("127.0.0.1", args.porta), handler) as server:
        print(f"Abra http://127.0.0.1:{server.server_port}/ no Chromium. Use Ctrl+C para encerrar.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
