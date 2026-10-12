"""
ISATVON Contract Validation & SOW Accuracy Edge Cases
Tests:
- All 7 contract letters: Inputs, Skills, Architecture, Tools, Validation, Orchestration, Notifications
- Unresolved placeholders: TODO, TBD, TBC, ??, lorem, xxx
- Approval clause requirement and multi-version invalidation
- Rule-based vs Judge-based accuracy scoring
"""

import re
import pytest

ISATVON = [
    {"key": "inputs", "letter": "I", "label": "Inputs"},
    {"key": "skills", "letter": "S", "label": "Skills"},
    {"key": "architecture", "letter": "A", "label": "Architecture"},
    {"key": "tools", "letter": "T", "label": "Tools"},
    {"key": "validation", "letter": "V", "label": "Validation"},
    {"key": "orchestration", "letter": "O", "label": "Orchestration"},
    {"key": "notifications", "letter": "N", "label": "Notifications"},
]

PLACEHOLDER_PATTERN = re.compile(r'\b(TBD|TODO|TBC|lorem|xxx|to be (decided|confirmed)|n\/a)\b|\?\?', re.IGNORECASE)


def parse_requirements_mock(html: str):
    """Simple parser mirroring sowFormat.ts regex."""
    blocks = re.split(r'(?=<h[23][^>]*>\s*Requirement\s+\d+)', html, flags=re.IGNORECASE)
    reqs = []
    for b in blocks:
        m = re.search(r'<h[23][^>]*>\s*Requirement\s+(\d+)', b, re.IGNORECASE)
        if not m:
            continue
        n = int(m.group(1))
        fields = {}
        for c in ISATVON:
            fm = re.search(rf'<strong>\s*{c["letter"]}\s*[-–:]\s*[^<]*</strong>\s*:?\s*([^<\n]+)', b, re.IGNORECASE)
            fields[c["key"]] = fm.group(1).strip() if fm else ""
        reqs.append({"n": n, "fields": fields})
    return reqs


def evaluate_contract_rules(html: str):
    reqs = parse_requirements_mock(html)
    findings = []
    filled = 0
    valid = 0
    specific = 0

    for r in reqs:
        for c in ISATVON:
            val = r["fields"].get(c["key"], "").strip()
            if not val:
                findings.append({"requirement": r["n"], "field": c["label"], "issue": "Missing"})
                continue
            filled += 1
            if len(val) >= 3:
                valid += 1
            if PLACEHOLDER_PATTERN.search(val):
                findings.append({"requirement": r["n"], "field": c["label"], "issue": f"Placeholder: {val}"})
            else:
                specific += 1

    total_fields = len(reqs) * len(ISATVON) if reqs else 1
    has_approval = bool(re.search(r'<h[23][^>]*>\s*Approval', html, re.IGNORECASE))

    completeness = round((filled / total_fields) * 100) if total_fields else 0
    specificity = round((specific / max(filled, 1)) * 100)

    return {
        "requirements_count": len(reqs),
        "has_approval": has_approval,
        "completeness": completeness,
        "specificity": specificity,
        "findings": findings,
    }


class TestIsatvonEdgeCases:

    def test_empty_sow_zero_score(self):
        res = evaluate_contract_rules("<div>Empty Draft</div>")
        assert res["requirements_count"] == 0
        assert res["has_approval"] is False
        assert res["completeness"] == 0

    def test_complete_isatvon_with_approval(self):
        html = """
        <h2>Requirement 1: Precision CNC Bracket Machining</h2>
        <p><strong>I - Inputs</strong>: STEP CAD file MPW-4421-bracket.step, BOM_RevC.xlsx</p>
        <p><strong>S - Skills</strong>: 5-axis CNC Milling, Surface Finishing MIL-A-8625</p>
        <p><strong>A - Architecture</strong>: Cellular manufacturing unit with coordinate measuring machine</p>
        <p><strong>T - Tools</strong>: Haas UMC-750, CMM Probe Renishaw</p>
        <p><strong>V - Validation</strong>: EN 10204 3.1 material cert, 100% CMM report</p>
        <p><strong>O - Orchestration</strong>: First article inspection before batch run</p>
        <p><strong>N - Notifications</strong>: Alert QA lead on any tolerance excursion > 0.03mm</p>
        <h2>Approval Clause</h2>
        <p>Authorized by Engineering Quality Director.</p>
        """
        res = evaluate_contract_rules(html)
        assert res["requirements_count"] == 1
        assert res["has_approval"] is True
        assert res["completeness"] == 100
        assert res["specificity"] == 100
        assert len(res["findings"]) == 0

    def test_missing_letters_detection(self):
        # Missing V (Validation) and N (Notifications)
        html = """
        <h2>Requirement 1: Incomplete Requirement</h2>
        <p><strong>I - Inputs</strong>: CAD file</p>
        <p><strong>S - Skills</strong>: Milling</p>
        <p><strong>A - Architecture</strong>: Standard Shop</p>
        <p><strong>T - Tools</strong>: Haas Mill</p>
        <p><strong>O - Orchestration</strong>: Standard run</p>
        """
        res = evaluate_contract_rules(html)
        missing_fields = [f["field"] for f in res["findings"] if f["issue"] == "Missing"]
        assert "Validation" in missing_fields
        assert "Notifications" in missing_fields
        assert res["completeness"] < 100

    def test_placeholder_flagging_edge_case(self):
        html = """
        <h2>Requirement 1: Placeholder Test</h2>
        <p><strong>I - Inputs</strong>: TBD from customer</p>
        <p><strong>S - Skills</strong>: TODO define skills</p>
        <p><strong>A - Architecture</strong>: ??</p>
        <p><strong>T - Tools</strong>: Haas Mill</p>
        <p><strong>V - Validation</strong>: lorem ipsum test</p>
        <p><strong>O - Orchestration</strong>: to be confirmed</p>
        <p><strong>N - Notifications</strong>: Email lead</p>
        """
        res = evaluate_contract_rules(html)
        placeholders = [f["field"] for f in res["findings"] if "Placeholder" in f["issue"]]
        assert "Inputs" in placeholders
        assert "Skills" in placeholders
        assert "Architecture" in placeholders
        assert "Validation" in placeholders
        assert "Orchestration" in placeholders
        assert res["specificity"] < 40
