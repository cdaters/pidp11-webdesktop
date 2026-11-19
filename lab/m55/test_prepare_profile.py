"""Offline failure-path checks using temporary ordinary files, never Pi paths."""
import tempfile
from pathlib import Path
import unittest

from prepare_profile import LISTENER, SOURCE_BOOT_SHA256, prepare, render, sha256

BOOT = Path(__file__).with_name("original-boot.ini").read_bytes()
MAP = b"0000\tidled\n0001\tunix7\n# preserve this comment\n0211\t211bsd\n"


class ProfilePreparationTests(unittest.TestCase):
    def test_one_line_change_and_original_bytes_preserved(self):
        candidate, selections = render(BOOT, MAP)
        self.assertEqual(candidate.replace(LISTENER, b"", 1), BOOT)
        self.assertEqual(candidate.count(LISTENER), 1)
        self.assertEqual(candidate, Path(__file__).with_name("boot.ini").read_bytes())
        self.assertEqual(Path(__file__).with_name("selection-entry.txt").read_bytes(), b"0017\tunix7-web-pilot\n")
        self.assertEqual(candidate.count(b"set realcons "), 4)
        self.assertEqual(selections, MAP + b"0017\tunix7-web-pilot\n")
        self.assertEqual(sha256(BOOT), SOURCE_BOOT_SHA256)

    def test_conflicts_aliases_malformed_and_drift_refused(self):
        for selections in [MAP + b"0017\tother\n", MAP + b"000017\tother\n",
                           MAP + b"0002\tunix7-web-pilot\n", MAP + b"000001\talias\n",
                           MAP + b"0008\tbad\n", MAP + b"0016\t../escape\n",
                           MAP + b"\xff\n", b"", b"0000\tother\n", b"x" * 65537]:
            with self.subTest(selections=selections[:80]), self.assertRaises(ValueError):
                render(BOOT, selections)
        with self.assertRaises(ValueError):
            render(BOOT + b"; drift\n", MAP)

    def test_local_package_exclusive_and_sources_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            boot, selections, out = root / "source.ini", root / "map", root / "package"
            boot.write_bytes(BOOT)
            selections.write_bytes(MAP)
            prepare(boot, selections, out)
            before = {p.name: p.read_bytes() for p in out.iterdir()}
            with self.assertRaises(FileExistsError):
                prepare(boot, selections, out)
            self.assertEqual(before, {p.name: p.read_bytes() for p in out.iterdir()})
            self.assertEqual(boot.read_bytes(), BOOT)
            self.assertEqual(selections.read_bytes(), MAP)
            self.assertEqual(out.stat().st_mode & 0o777, 0o700)
            for path in out.iterdir():
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_invalid_inputs_create_no_package(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            boot, selections, out = root / "source.ini", root / "map", root / "package"
            boot.write_bytes(BOOT)
            selections.write_bytes(MAP + b"0017\toccupied\n")
            with self.assertRaises(ValueError):
                prepare(boot, selections, out)
            self.assertFalse(out.exists())
            selections.write_bytes(MAP)
            linked = root / "symlink.ini"
            linked.symlink_to(boot)
            with self.assertRaises(OSError):
                prepare(linked, selections, out)
            self.assertFalse(out.exists())

    def test_missing_final_newline_preserves_prefix(self):
        _, proposed = render(BOOT, MAP.rstrip(b"\n"))
        self.assertEqual(proposed, MAP + b"0017\tunix7-web-pilot\n")


if __name__ == "__main__":
    unittest.main()
