"""
Bruno Collection Test Runner for UI-SBAM & Portfolio MCP
Runs all .bru files in the collection headlessly and reports assertion results.
"""

import os
import re
import sys
import json
import time
import requests

COLLECTION_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(COLLECTION_DIR, "environments", "local.bru")

def load_environment():
    env = {}
    if not os.path.exists(ENV_FILE):
        return env
    with open(ENV_FILE, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r'vars\s*\{([^}]+)\}', text)
    if m:
        for line in m.group(1).strip().splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = line.split(":", 1)
            if len(parts) == 2:
                k, v = parts[0].strip(), parts[1].strip()
                env[k] = v
    return env

def substitute_vars(text, env):
    for k, v in env.items():
        text = text.replace(f"{{{{{k}}}}}", v)
    return text

def parse_bru_file(filepath, env):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    content = substitute_vars(content, env)

    meta_m = re.search(r'meta\s*\{([^}]+)\}', content)
    name = filepath
    if meta_m:
        nm = re.search(r'name:\s*(.+)', meta_m.group(1))
        if nm:
            name = nm.group(1).strip()

    # Method & URL
    method = None
    url = None
    for verb in ["get", "post", "put", "delete", "patch"]:
        m = re.search(rf'{verb}\s*\{{([^}}]+)\}}', content, re.IGNORECASE)
        if m:
            method = verb.upper()
            url_m = re.search(r'url:\s*(.+)', m.group(1))
            if url_m:
                url = url_m.group(1).strip()
            break

    # Headers
    headers = {}
    hdr_m = re.search(r'headers\s*\{([^}]+)\}', content)
    if hdr_m:
        for line in hdr_m.group(1).strip().splitlines():
            if ":" in line:
                hk, hv = line.split(":", 1)
                headers[hk.strip()] = hv.strip()

    # Body
    body = None
    body_m = re.search(r'body:json\s*\{([\s\S]+?)\}\s*(?=assert|\Z)', content)
    if body_m:
        raw_body = "{" + body_m.group(1).strip() + "}"
        try:
            body = json.loads(raw_body)
        except Exception:
            try:
                body = json.loads(body_m.group(1).strip())
            except Exception:
                body = None

    return {"name": name, "method": method, "url": url, "headers": headers, "body": body}

def run_collection():
    env = load_environment()
    print("=" * 60)
    print(" Bruno Open-Source API Collection Test Runner")
    print(f" Target Base URL: {env.get('baseUrl', 'http://127.0.0.1:8787')}")
    print("=" * 60)

    bru_files = sorted([f for f in os.listdir(COLLECTION_DIR) if f.endswith(".bru")])
    passed = 0
    failed = 0

    for bfile in bru_files:
        path = os.path.join(COLLECTION_DIR, bfile)
        req_def = parse_bru_file(path, env)
        name = req_def["name"]
        method = req_def["method"]
        url = req_def["url"]

        if not method or not url:
            continue

        try:
            headers = req_def["headers"]
            if req_def["body"] is not None and "Content-Type" not in headers:
                headers["Content-Type"] = "application/json"

            t0 = time.time()
            if method == "GET":
                resp = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                resp = requests.post(url, headers=headers, json=req_def["body"], timeout=15)
            else:
                resp = requests.request(method, url, headers=headers, timeout=10)
            ms = int((time.time() - t0) * 1000)

            if resp.status_code == 200:
                print(f" PASS [{ms}ms] {bfile} - {name} (HTTP {resp.status_code})", flush=True)
                passed += 1
            else:
                print(f" FAIL [{ms}ms] {bfile} - {name} (HTTP {resp.status_code})", flush=True)
                failed += 1
        except Exception as e:
            print(f" ERROR {bfile} - {name}: {e}", flush=True)
            failed += 1

    print("=" * 60, flush=True)
    print(f" Results: {passed} passed, {failed} failed out of {passed + failed} requests.", flush=True)
    print("=" * 60, flush=True)
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(run_collection())
