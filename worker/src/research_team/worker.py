"""Poll Neon jobs and run agent ticks."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys

from research_team import db
from research_team.tick import run_tick

log = logging.getLogger("forum-worker")


async def poll(interval: float = 2.0) -> None:
    log.info("worker up pid=%s, polling jobs", os.getpid())
    while True:
        job = db.claim_job()
        if job is None:
            await asyncio.sleep(interval)
            continue
        payload = job.get("payload")
        log.info("claimed %s payload=%s", job["id"], payload)
        try:
            await run_tick(job)
        except Exception:
            log.exception("tick crashed for job %s", job["id"])
            db.complete_job(job["id"], "tick crashed")


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
