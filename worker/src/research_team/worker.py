"""Poll Neon jobs and run agent ticks."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys

from typing import Any

from research_team import db
from research_team.config import TICK_HARD_TIMEOUT_S
from research_team.tick import fail_open_tick, run_tick

log = logging.getLogger("forum-worker")


async def _run_claimed(job: dict[str, Any]) -> None:
    try:
        await asyncio.wait_for(run_tick(job), timeout=TICK_HARD_TIMEOUT_S)
    except TimeoutError:
        log.error("tick hung for job %s", job["id"])
        fail_open_tick(job, "TimeoutError: tick timed out")
    except Exception:
        log.exception("tick crashed for job %s", job["id"])
        fail_open_tick(job, "tick crashed")


async def poll(interval: float = 2.0) -> None:
    log.info("worker up pid=%s, polling jobs", os.getpid())
    while True:
        job = db.claim_job()
        if job is None:
            await asyncio.sleep(interval)
            continue
        payload = job.get("payload")
        log.info("claimed %s payload=%s", job["id"], payload)
        await _run_claimed(job)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Forum agent worker")
    parser.add_argument("--once", action="store_true", help="Claim at most one job")
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        stream=sys.stdout,
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    lock = db.acquire_worker_lock()
    if lock is None:
        log.error("another forum worker already holds the job lock; exiting")
        sys.exit(1)
    released = db.unlock_abandoned_jobs()
    if released:
        log.warning("unlocked abandoned jobs %s", released)
    try:
        if args.once:
            job = db.claim_job()
            if job is None:
                log.info("no due jobs")
                return
            asyncio.run(run_tick(job))
            return
        asyncio.run(poll())
    finally:
        lock.close()


if __name__ == "__main__":
    main(sys.argv[1:])
