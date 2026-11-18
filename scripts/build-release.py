"""Package the Foundry module and its release manifest without development files."""

import argparse
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


def build_release(output: Path, tag: str):
    root = Path(__file__).resolve().parent.parent
    manifest = json.loads((root / "module.json").read_text(encoding="utf-8"))
    base = manifest["url"] + "/releases"
    manifest["manifest"] = base + "/latest/download/module.json"
    manifest["download"] = base + f"/download/{tag}/dsa5-charexv2.zip"
    output.mkdir(parents=True, exist_ok=True)
    manifest_text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    (output / "module.json").write_text(manifest_text, encoding="utf-8")
    with ZipFile(output / "dsa5-charexv2.zip", "w", ZIP_DEFLATED) as archive:
        archive.writestr("module.json", manifest_text)
        for name in ("assets", "lang", "lib", "scripts", "styles", "templates", "LICENSE", "README.md"):
            path = root / name
            for file in sorted(path.rglob("*")) if path.is_dir() else [path]:
                if file.is_file() and "__pycache__" not in file.parts:
                    archive.write(file, file.relative_to(root))
    (output / "release-notes.md").write_text(
        f"Automatic build of CharEx v{manifest['version']}.\n\n"
        f"Foundry manifest: {manifest['manifest']}\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--tag", required=True)
    args = parser.parse_args()
    build_release(args.output, args.tag)
