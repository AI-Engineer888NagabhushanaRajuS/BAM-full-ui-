# =============================================================================
# File: services/watcher.py — Watchdog folder watch for SOW / MoMs
# =============================================================================
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import queue
import shutil
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

LOG = logging.getLogger(__name__)

# Mockable or configurable settings for standalone operation
class Settings:
    inbox_dir: Path = Path("./inbox")
    processed_dir: Path = Path("./processed")
    failed_dir: Path = Path("./failed")
    watch_list: List[str] = ["*.pdf", "*.docx", "*.xlsx", "*.step", "*.stp", "*.zip"]
    debounce_seconds: float = 2.0
    auto_start_temporal_validation: bool = True

settings = Settings()

class PipelineResult:
    def __init__(self, manifests: Optional[List[str]] = None, errors: Optional[List[str]] = None):
        self.manifests = manifests or []
        self.errors = errors or []

    def as_dict(self) -> Dict[str, Any]:
        return {"manifests": self.manifests, "errors": self.errors}

class DummyPipeline:
    async def process(self, path: Path, start_temporal: bool = False) -> PipelineResult:
        LOG.info("Processing candidate document %s (Temporal=%s)", path.name, start_temporal)
        # Atomic ingest simulation:
        await asyncio.sleep(0.5)
        return PipelineResult(manifests=[f"manifest_{path.stem}.json"], errors=[])

pipeline = DummyPipeline()


class SOWFolderHandler(FileSystemEventHandler):
    """Debounced, thread-safe inbox watcher for air-gapped corporate firewalls."""

    def __init__(self, work_queue: "queue.Queue[Path]") -> None:
        super().__init__()
        self.q = work_queue
        self._seen: dict[Path, float] = {}
        self._lock = threading.Lock()

    # ---------------------------------------------------------------- internals
    def _is_candidate(self, path: Path) -> bool:
        if path.name.startswith(("~$", ".")):
            return False
        return any(path.match(p) for p in settings.watch_list)

    def _debounce(self, path: Path) -> bool:
        now = time.monotonic()
        with self._lock:
            last = self._seen.get(path)
            self._seen[path] = now
            return last is None or (now - last) >= settings.debounce_seconds

    def _enqueue(self, raw_path: str) -> None:
        path = Path(raw_path)
        if not self._is_candidate(path) or not path.exists():
            return
        if not self._debounce(path):
            return
        LOG.info("Watchdog detected: %s", path.name)
        self.q.put(path)

    def scan_existing(self, root: Path) -> None:
        """Queue candidate files already present before the observer started."""
        if not root.exists():
            root.mkdir(parents=True, exist_ok=True)
        for path in root.rglob("*"):
            if path.is_file():
                self._enqueue(str(path))

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue(event.src_path)

    def on_moved(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue(getattr(event, "dest_path", event.src_path))

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._enqueue(event.src_path)


class WatchdogSOWService:
    """Runs the Observer + an asyncio consumer loop that drives the pipeline."""

    def __init__(self) -> None:
        self.q: "queue.Queue[Path]" = queue.Queue()
        self.handler = SOWFolderHandler(self.q)
        self.observer = Observer()
        self._stop = threading.Event()

    # ---------------------------------------------------------------- consumer
    async def _consume(self) -> None:
        while not self._stop.is_set():
            try:
                path: Path = await asyncio.to_thread(self.q.get, True, 1.0)
            except queue.Empty:
                continue

            try:
                await self._wait_until_stable(path)
                result: PipelineResult = await pipeline.process(
                    path,
                    start_temporal=settings.auto_start_temporal_validation,
                )
                await self._archive(path, result)
            except Exception:  # noqa: BLE001
                LOG.exception("Unhandled failure processing %s", path)
                self._move(path, settings.failed_dir)
            finally:
                self.q.task_done()

    @staticmethod
    async def _wait_until_stable(path: Path, stable_for: float = 1.5) -> None:
        """Wait until the file stops growing (handles slow SMB/network copies)."""
        last_size, stable_since = -1, time.monotonic()
        while True:
            try:
                size = path.stat().st_size
            except FileNotFoundError:
                await asyncio.sleep(0.5)
                continue
            if size == last_size:
                if time.monotonic() - stable_since >= stable_for:
                    return
            else:
                last_size, stable_since = size, time.monotonic()
            await asyncio.sleep(0.5)

    @staticmethod
    async def _archive(path: Path, result: PipelineResult) -> None:
        target_dir = settings.processed_dir if not result.errors else settings.failed_dir
        WatchdogSOWService._move(path, target_dir)
        LOG.info("Processed %s → %s (%d skills)", path.name, target_dir.name, len(result.manifests))

    @staticmethod
    def _move(path: Path, target_dir: Path) -> None:
        target_dir.mkdir(parents=True, exist_ok=True)
        try:
            shutil.move(str(path), str(target_dir / path.name))
        except Exception as exc:  # noqa: BLE001
            LOG.warning("Could not move %s: %s", path, exc)

    # ---------------------------------------------------------------- lifecycle
    async def run(self) -> None:
        settings.inbox_dir.mkdir(parents=True, exist_ok=True)
        self.observer.schedule(self.handler, str(settings.inbox_dir), recursive=True)
        self.observer.start()
        self.handler.scan_existing(settings.inbox_dir)
        LOG.info("Watching %s for %s", settings.inbox_dir.resolve(), settings.watch_list)
        try:
            await self._consume()
        finally:
            self.observer.stop()
            self.observer.join(timeout=5)


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="srim-isatvon",
        description="ISATVON 1.4 SOW-to-Skill pipeline & Air-gapped Watchdog service",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("watch",  help="Watch the inbox folder and run the full pipeline")
    sub.add_parser("api",    help="Run the FastAPI/Refine backend")
    sub.add_parser("worker", help="Run the Temporal worker")
    sub.add_parser("mcp",    help="Run the FastMCP skill palette server")

    sftp = sub.add_parser("sftp", help="Fetch client files via SFTP into the inbox and push back processed artifacts")
    sftp.add_argument(
        "--loop",
        action="store_true",
        help="Run continuously, polling every SRIM_SFTP_POLL_SECONDS (default: single cron-friendly cycle)",
    )

    once = sub.add_parser("once", help="Process a single document")
    once.add_argument("path")
    once.add_argument(
        "--temporal",
        action="store_true",
        help="Start a Temporal validation workflow for each generated skill",
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(name)-22s | %(message)s",
    )

    if args.cmd == "watch":
        asyncio.run(WatchdogSOWService().run())

    elif args.cmd == "api":
        print("API endpoint: Refine.dev + Uppy + TUSD Gateway")

    elif args.cmd == "worker":
        print("Temporal Worker running on localhost:7233")

    elif args.cmd == "mcp":
        print("FastMCP Server active")

    elif args.cmd == "sftp":
        print("SFTP Sync running")

    elif args.cmd == "once":
        result = asyncio.run(pipeline.process(Path(args.path), start_temporal=args.temporal))
        print(json.dumps(result.as_dict(), indent=2, default=str))


if __name__ == "__main__":
    main()
