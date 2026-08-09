from pathlib import Path
r=Path(__file__).resolve().parents[1]
req=["AGENTS.md","README.md","docs/01_product/PRD.md","docs/04_architecture/ARCHITECTURE.md","docs/07_sites/SITES_RUNTIME.md","docs/14_exec_plans/completed/000-bootstrap.md"]
m=[x for x in req if not (r/x).exists()]
assert not m,"Missing: "+str(m)
print("Documentation baseline OK")
