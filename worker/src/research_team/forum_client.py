"""HTTP client for the forum API. Fail-soft strings, never raise into the loop."""

from __future__ import annotations

import asyncio
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Literal

from langchain_core.tools import BaseTool, StructuredTool
from pydantic import BaseModel, Field

FORUM_TOOL_NAMES = {
    "read_thread",
    "create_thread",
    "reply",
    "react_post",
}

HTTP_RETRIES = 2
HTTP_TIMEOUT_S = 30


class PostSource(BaseModel):
    url: str = Field(description="http(s) URL of the filing or article")
    title: str | None = Field(
        default=None, description="Short label; hostname is used if omitted"
    )


def _dump_sources(sources: list[PostSource] | None) -> list[dict[str, str]] | None:
    if not sources:
        return None
    rows: list[dict[str, str]] = []
    for item in sources:
        data = item.model_dump() if isinstance(item, BaseModel) else dict(item)
        url = str(data.get("url") or "").strip()
        if not url:
            continue
        row: dict[str, str] = {"url": url}
        title = str(data.get("title") or "").strip()
        if title:
            row["title"] = title
        rows.append(row)
    return rows or None


class ForumClient:
    def __init__(self, *, base_url: str, token: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.opened: list[str] = []
        self.post_ids: list[str] = []
        self.written: list[str] = []
        self.reaction_count = 0
        self.notes: list[str] = []

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        query: dict[str, str] | None = None,
    ) -> str:
        url = self.base_url + path
        if query:
            url += "?" + urllib.parse.urlencode({k: v for k, v in query.items() if v})
        data = None
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        }
        if payload is not None:
            data = json.dumps(payload).encode()
            headers["Content-Type"] = "application/json"
        last = "Forum request failed"
        for _ in range(1 + HTTP_RETRIES):
            req = urllib.request.Request(url, data=data, method=method, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT_S) as resp:
                    return resp.read().decode()
            except urllib.error.HTTPError as exc:
                body = exc.read().decode()[:800]
                last = f"HTTP {exc.code}: {body}"
                if exc.code < 500 or exc.code >= 600:
                    return last
            except (urllib.error.URLError, TimeoutError) as exc:
                last = f"Forum request failed: {exc.__class__.__name__}: {exc}"
            except Exception as exc:  # noqa: BLE001
                return f"Forum request failed: {exc.__class__.__name__}: {exc}"
        return last

    async def request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        query: dict[str, str] | None = None,
    ) -> str:
        return await asyncio.to_thread(self._request, method, path, payload, query)

    def _record_open(self, thread_id: str) -> None:
        if thread_id and thread_id not in self.opened:
            self.opened.append(thread_id)

    def _ids_from(self, raw: str) -> dict[str, str]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        if not isinstance(data, dict):
            return {}
        out: dict[str, str] = {}
        for key in ("threadId", "postId", "id"):
            value = data.get(key)
            if isinstance(value, str) and value:
                out[key] = value
        return out

    def _json_object(self, raw: str) -> dict[str, Any]:
        if raw.startswith("HTTP ") or raw.startswith("Forum request failed"):
            return {}
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return data if isinstance(data, dict) else {}

    async def inbox(self) -> list[dict[str, Any]]:
        data = self._json_object(await self.request("GET", "/api/forum/inbox"))
        items = data.get("items")
        if not isinstance(items, list):
            return []
        return [item for item in items if isinstance(item, dict)]

    async def discover(self, sample: int = 10) -> list[dict[str, Any]]:
        data = self._json_object(
            await self.request(
                "GET",
                "/api/forum/threads",
                query={"discover": str(sample)},
            )
        )
        threads = data.get("threads")
        if not isinstance(threads, list):
            return []
        return [item for item in threads if isinstance(item, dict)]

    def tools(self) -> list[BaseTool]:
        client = self

        async def read_thread(thread_id: str, page: int = 1) -> str:
            """Read one thread's floors. page is 1-based, 25 floors each."""
            tid = thread_id.strip()
            raw = await client.request(
                "GET",
                f"/api/forum/threads/{urllib.parse.quote(tid)}",
                query={"page": str(page)},
            )
            if not (raw.startswith("HTTP ") or raw.startswith("Forum request failed")):
                client._record_open(tid)
            return raw

        async def create_thread(
            title: str,
            body: str,
            board: str = "",
            ticker: str = "",
            sources: list[PostSource] | None = None,
        ) -> str:
            """Start a thread. body is the original post. board is lounge/equities/macro/crypto/bonds. sources is optional; prefer when you cite a filing or article."""
            payload: dict[str, Any] = {
                "title": title,
                "body": body,
                "board": board or None,
                "ticker": ticker or None,
            }
            dumped = _dump_sources(sources)
            if dumped:
                payload["sources"] = dumped
            raw = await client.request(
                "POST",
                "/api/forum/threads",
                payload=payload,
            )
            ids = client._ids_from(raw)
            thread_id = ids.get("threadId")
            post_id = ids.get("postId")
            if thread_id:
                client._record_open(thread_id)
                client.written.append(thread_id)
                client.notes.append(f"created {thread_id}: {title.strip()[:80]}")
            if post_id:
                client.post_ids.append(post_id)
            return raw

        async def reply(
            thread_id: str,
            body: str,
            quote_post_id: str = "",
            sources: list[PostSource] | None = None,
        ) -> str:
            """Reply in a thread. Set quote_post_id to quote that floor (use the OP id to quote the thread). sources is optional; prefer when you cite a filing or article."""
            tid = thread_id.strip()
            payload: dict[str, Any] = {"body": body}
            if quote_post_id.strip():
                payload["quotePostId"] = quote_post_id.strip()
            dumped = _dump_sources(sources)
            if dumped:
                payload["sources"] = dumped
            raw = await client.request(
                "POST",
                f"/api/forum/threads/{urllib.parse.quote(tid)}/posts",
                payload=payload,
            )
            ids = client._ids_from(raw)
            post_id = ids.get("postId")
            if post_id:
                client.post_ids.append(post_id)
                client._record_open(tid)
                client.written.append(tid)
                client.notes.append(f"replied {tid}")
            return raw

        async def react_post(post_id: str, value: Literal["up", "down"]) -> str:
            """Like (up) or dislike (down) a floor. Same value again clears the vote. Like a thread by voting on floor 1."""
            pid = post_id.strip()
            raw = await client.request(
                "POST",
                f"/api/forum/posts/{urllib.parse.quote(pid)}/reactions",
                payload={"value": value},
            )
            if raw.startswith("HTTP ") or raw.startswith("Forum request failed"):
                return raw
            client.reaction_count += 1
            client.notes.append(f"react {value} {pid}")
            return raw

        specs = [
            read_thread,
            create_thread,
            reply,
            react_post,
        ]

        tools: list[BaseTool] = []
        for fn in specs:
            tools.append(
                StructuredTool.from_function(
                    name=fn.__name__,
                    description=(fn.__doc__ or fn.__name__).strip(),
                    coroutine=fn,
                )
            )
        return tools
