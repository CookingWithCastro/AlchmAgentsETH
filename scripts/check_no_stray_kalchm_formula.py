"""Python AST half of the cross-runtime Kalchm formula gate."""

import ast
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
# Every first-party tree that can ship or generate Python. `backend` alone left
# the fixture generator under pa-rust-backend/tests unpoliced, and that
# generator is what produces the Rust golden vectors — a stray formula there
# would have been pinned as authoritative by a green test.
SOURCE_ROOTS = ("backend", "scripts", "pa-rust-backend")
CANONICAL = pathlib.Path("backend/thermodynamics.py")
LIST_ONLY = "--list" in sys.argv


def normalized(node: ast.AST) -> str:
    return ast.dump(node, annotate_fields=True, include_attributes=False)


def is_self_exponentiation(node: ast.AST) -> bool:
    if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Pow):
        return normalized(node.left) == normalized(node.right)
    if not isinstance(node, ast.Call) or len(node.args) != 2:
        return False
    function = node.func
    is_pow = (
        isinstance(function, ast.Name)
        and function.id == "pow"
        or isinstance(function, ast.Attribute)
        and isinstance(function.value, ast.Name)
        and function.value.id == "math"
        and function.attr == "pow"
    )
    return is_pow and normalized(node.args[0]) == normalized(node.args[1])


EXCLUDED_PARTS = {".venv", "venv", "__pycache__", "node_modules", "site-packages", "target"}

files = sorted(
    path
    for root in SOURCE_ROOTS
    for path in (ROOT / root).rglob("*.py")
    if not EXCLUDED_PARTS & set(path.parts)
)
if not files:
    raise SystemExit("✗ PYTHON COVERAGE FAILED: zero Python files scanned")

# Per-root coverage, so adding a root that silently matches nothing fails loudly
# instead of reporting a clean zero.
for root in SOURCE_ROOTS:
    if not any(str(path.relative_to(ROOT)).startswith(f"{root}/") for path in files):
        raise SystemExit(f"✗ PYTHON COVERAGE FAILED: zero files scanned under {root}/")

hits: list[tuple[pathlib.Path, int, str]] = []
for path in files:
    source = path.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(path))
    for node in ast.walk(tree):
        if is_self_exponentiation(node):
            hits.append(
                (
                    path.relative_to(ROOT),
                    node.lineno,
                    ast.get_source_segment(source, node) or normalized(node),
                )
            )

canonical_hits = [hit for hit in hits if hit[0] == CANONICAL]
if len(canonical_hits) != 4:
    raise SystemExit(
        f"✗ PYTHON CONTROL FAILED: expected 4 canonical sites, found {len(canonical_hits)}"
    )

stray_hits = [hit for hit in hits if hit[0] != CANONICAL]
if LIST_ONLY:
    print(f"canonical Python control {CANONICAL}: {len(canonical_hits)} sites")
    for path, line, source in stray_hits:
        print(f"{path}:{line} {source}")
    print(f"✓ scanned {len(files)} Python files across {', '.join(SOURCE_ROOTS)}")
    raise SystemExit(0)

if stray_hits:
    print("✗ self-exponentiation outside the canonical Python adapter", file=sys.stderr)
    for path, line, source in stray_hits:
        print(f"{path}:{line} {source}", file=sys.stderr)
    raise SystemExit(1)

print(f"✓ canonical Python adapter: 4 sites in {CANONICAL}")
print("✓ no self-exponentiation outside the canonical Python adapter")
