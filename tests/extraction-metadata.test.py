#!/usr/bin/env python3
"""验证生成元数据始终来自工作簿与公式模型。"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "spreadsheets" / "冰心计算器Excel版-暗影千机v1.4.xlsm"
FORMULA_MODEL = ROOT / "src" / "generated" / "formula-model.js"
DATE_PATTERN = re.compile(r"(?<!\d)(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?!\d)")


def javascript_payload(path: Path, prefix: str) -> dict:
    source = path.read_text(encoding="utf-8")
    return json.loads(source.removeprefix(prefix).removesuffix(";\n"))


with tempfile.TemporaryDirectory() as temporary_directory:
    generated_data = Path(temporary_directory) / "data.js"
    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "extract_xlsm.py"), str(SOURCE), str(generated_data)],
        check=True,
    )
    generated_payload = javascript_payload(generated_data, "window.APP_DATA = ")

workbook = openpyxl.load_workbook(SOURCE, data_only=True, keep_vba=True)
update_match = DATE_PATTERN.search(str(workbook["全局设置"]["B10"].value))
if not update_match:
    raise AssertionError("源工作簿更新说明缺少日期")
year, month, day = (int(part) for part in update_match.groups())
expected_date = f"{year:04d}-{month:02d}-{day:02d}"

formula_model = javascript_payload(FORMULA_MODEL, "window.BINGXIN_FORMULA_MODEL = ")
expected_formula_metrics = {
    "formulaAnchorCount": sum(
        "f" in cell
        for sheet in formula_model["sheets"].values()
        for cell in sheet["cells"].values()
    ),
    "namedExpressionCount": len(formula_model["names"]),
    "sheetCount": len(formula_model["sheets"]),
}

assert generated_payload["meta"]["version"] == workbook["全局设置"]["A2"].value
assert generated_payload["meta"]["updatedAt"] == expected_date
assert generated_payload["main"]["score"] == workbook["角色属性"]["V15"].value
assert generated_payload["meta"]["formulaModel"] == expected_formula_metrics

print(json.dumps({
    "version": generated_payload["meta"]["version"],
    "updatedAt": generated_payload["meta"]["updatedAt"],
    "score": generated_payload["main"]["score"],
    **expected_formula_metrics,
}, ensure_ascii=False, indent=2))
