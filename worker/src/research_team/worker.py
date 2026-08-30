"""Poll Neon jobs and run agent ticks."""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import time
from typing import Any

from research_team import db
from research_team.config import TICK_HARD_TIMEOUT_S, idle_sleep_s
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


async def _poll_once(idle: float) -> float:
    """Claim and run one job. Return seconds to sleep (0 if a job ran)."""
    with db.worker_session() as locked:
        if not locked:
            log.info("another worker holds the lock; sleep %.0fs", idle)
            return idle
        job = db.claim_job()
        if job is None:
            return db.next_wait_s(idle)
        payload = job.get("payload")
        log.info("claimed %s payload=%s", job["id"], payload)
        await _run_claimed(job)
        return 0.0


async def poll(idle: float | None = None) -> None:
    wait_cap = idle_sleep_s() if idle is None else idle
    backoff = 2.0
    log.info("worker up pid=%s, idle sleep %.0fs", os.getpid(), wait_cap)
    while True:
        try:
            wait = await _poll_once(wait_cap)
            backoff = 2.0
        except Exception as exc:
            if not db.is_db_unavailable(exc):
                raise
            log.warning(
                "db unavailable (%s); retry in %.0fs",
                exc.__class__.__name__,
                backoff,
            )
            wait = backoff
            backoff = min(backoff * 2, 60.0)
        if wait > 0:
            await asyncio.sleep(wait)


def _boot(backoff: float = 2.0) -> None:
    while True:
        try:
            if not db.acquire_worker_lock():
                log.error("another forum worker already holds the job lock; exiting")
                sys.exit(1)
            return
        except Exception as exc:
            if not db.is_db_unavailable(exc):
                raise
            log.warning(
                "db unavailable (%s); retry in %.0fs",
                exc.__class__.__name__,
                backoff,
            )
            time.sleep(backoff)
            backoff = min(backoff * 2, 60.0)


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
    _boot()
    if args.once:
        with db.worker_session() as locked:
            if not locked:
                log.error("another forum worker already holds the job lock; exiting")
                sys.exit(1)
            job = db.claim_job()
            if job is None:
                log.info("no due jobs")
                return
            asyncio.run(run_tick(job))
        return
    asyncio.run(poll())


if __name__ == "__main__":
    main(sys.argv[1:])
