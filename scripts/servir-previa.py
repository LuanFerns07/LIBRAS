"""Serve o pacote local do LibrasIA no endereço de loopback."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--porta", type=int, default=4173)
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
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
