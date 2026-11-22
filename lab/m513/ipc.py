import pathlib, json, uuid, time, sys

root = pathlib.Path(sys.argv[1])
msg = {
    "id": str(uuid.uuid4()),
    "op": sys.argv[2],
    "data": sys.argv[3] if len(sys.argv) > 3 else "",
    "wait": float(sys.argv[4]) if len(sys.argv) > 4 else 1,
}
if msg["op"] == "finish":
    msg["guest_safe"] = True
p = root / "request.tmp"
p.write_text(json.dumps(msg))
p.replace(root / "request.json")
for _ in range(350):
    time.sleep(0.1)
    p = root / "response.json"
    if p.exists():
        response = json.loads(p.read_text())
        if response["id"] == msg["id"]:
            print(response["output"])
            break
else:
    raise SystemExit("Timeout; do not replay")
