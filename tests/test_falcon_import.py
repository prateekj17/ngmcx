import tempfile
import unittest
import zipfile
from pathlib import Path
from scripts.falcon_import import stage, COLUMNS

def fixture(close=300, volume=100, symbol="NATURALGAS"):
    values=["26 Nov 2026","FUTCOM",symbol,"25JAN2027",299,305,295,close,298,volume,200]
    return ("<table><thead><tr>"+"".join(f"<th>{v}</th>" for v in COLUMNS)+"</tr></thead><tbody><tr>"+"".join(f"<td>{v}</td>" for v in values)+"</tr></tbody></table>").encode()

class ImportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name)
    def file(self,name,raw):
        p=self.root/name
        p.write_bytes(raw)
        return p
    def test_html(self):
        result=stage([self.file("a.xls",fixture())])
        self.assertEqual(result["unique_rows"],1)
        self.assertEqual(result["flagged_rows"],0)
    def test_duplicate(self):
        result=stage([self.file("a.xls",fixture()),self.file("b.xls",fixture())])
        self.assertEqual(result["duplicates"],1)
    def test_conflict(self):
        with self.assertRaisesRegex(ValueError,"Conflicting"):
            stage([self.file("a.xls",fixture()),self.file("b.xls",fixture(301))])
    def test_zero_volume(self):
        row=stage([self.file("a.xls",fixture(volume=0))])["records"][0]["observation"]
        self.assertIsNone(row["open"])
    def test_anomaly(self):
        self.assertEqual(stage([self.file("a.xls",fixture(310))])["flagged_rows"],1)
    def test_mixed_zip(self):
        p=self.root/"mixed.zip"
        with zipfile.ZipFile(p,"w") as z:
            z.writestr("standard/a.xls",fixture())
            z.writestr("mini/b.xls",fixture(symbol="NATGASMINI"))
        self.assertEqual(stage([p])["unique_rows"],2)
    def test_empty(self):
        with self.assertRaises(ValueError):
            stage([])
if __name__=="__main__":
    unittest.main()
