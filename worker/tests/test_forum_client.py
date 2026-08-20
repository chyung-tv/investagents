import json
from io import BytesIO
from unittest.mock import patch

import pytest
from urllib.error import HTTPError, URLError

from research_team.forum_client import ForumClient


class _Resp:
    def __init__(self, payload: dict, status: int = 200):
        self._raw = json.dumps(payload).encode()
        self.status = status

    def read(self):
        return self._raw

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


@pytest.mark.asyncio
async def test_forum_client_records_writes():
    client = ForumClient(base_url="http://forum.test", token="aif_bull_dev")
    with patch(
        "research_team.forum_client.urllib.request.urlopen",
        return_value=_Resp({"threadId": "t1", "postId": "p1"}),
    ):
        raw = await client.request(
            "POST",
            "/api/forum/threads",
            payload={"title": "Hi", "body": "hello"},
        )
    ids = client._ids_from(raw)
    client._record_open(ids["threadId"])
    client.written.append(ids["threadId"])
    client.post_ids.append(ids["postId"])
    assert client.post_ids == ["p1"]
    assert "t1" in client.opened


@pytest.mark.asyncio
async def test_forum_client_reply_and_react_tools():
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}

    with patch(
        "research_team.forum_client.urllib.request.urlopen",
        return_value=_Resp({"postId": "p2"}),
    ):
        text = await tools["reply"].ainvoke({
            "thread_id": "t1",
            "body": "push back",
            "quote_post_id": "p1",
        })
    assert "p2" in text
    assert client.post_ids == ["p2"]
    assert client.notes == ["replied t1"]

    with patch(
        "research_team.forum_client.urllib.request.urlopen",
        return_value=_Resp({"value": "up", "threadId": "t1"}),
    ):
        await tools["react_post"].ainvoke({"post_id": "p2", "value": "up"})
    assert client.reaction_count == 1


@pytest.mark.asyncio
async def test_propose_and_vote_motion_tools():
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}
    seen: dict = {}

    def fake_open(req, timeout=30):
        seen["url"] = req.full_url
        seen["body"] = json.loads(req.data.decode())
        return _Resp({"threadId": "t9", "postId": "p9", "motionId": "m1"})

    with patch(
        "research_team.forum_client.urllib.request.urlopen", side_effect=fake_open
    ):
        await tools["propose_motion"].ainvoke({
            "title": "Buy AMZN",
            "body": "size down",
            "ticker": "AMZN",
            "choice": "buy",
            "qty": 10,
            "limit": 180,
        })
    assert "/api/forum/portfolio/motions" in seen["url"]
    assert seen["body"]["ticker"] == "AMZN"
    assert seen["body"]["limit"] == 180
    assert isinstance(seen["body"]["limit"], (int, float))
    assert client.post_ids[-1] == "p9"
    assert client.vote_count == 0

    with patch(
        "research_team.forum_client.urllib.request.urlopen", side_effect=fake_open
    ):
        await tools["vote_motion"].ainvoke({
            "motion_id": "m1",
            "choice": "buy",
            "qty": 5,
            "limit": 240,
        })
    assert "/api/forum/portfolio/votes" in seen["url"]
    assert seen["body"]["limit"] == 240
    assert isinstance(seen["body"]["limit"], (int, float))
    assert client.vote_count == 1


@pytest.mark.asyncio
async def test_create_thread_sends_optional_sources():
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}
    seen: dict = {}

    def fake_open(req, timeout=30):
        seen["body"] = json.loads(req.data.decode())
        return _Resp({"threadId": "t1", "postId": "p1"})

    with patch(
        "research_team.forum_client.urllib.request.urlopen", side_effect=fake_open
    ):
        await tools["create_thread"].ainvoke({
            "title": "Hi",
            "body": "hello",
            "board": "equities",
            "sources": [{"url": "https://sec.gov/a", "title": "10-K"}],
        })
    assert seen["body"]["sources"] == [{"url": "https://sec.gov/a", "title": "10-K"}]

    with patch(
        "research_team.forum_client.urllib.request.urlopen", side_effect=fake_open
    ):
        await tools["create_thread"].ainvoke({"title": "Hi", "body": "hello"})
    assert "sources" not in seen["body"]


@pytest.mark.asyncio
async def test_reply_sends_optional_sources():
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}
    seen: dict = {}

    def fake_open(req, timeout=30):
        seen["body"] = json.loads(req.data.decode())
        return _Resp({"postId": "p2"})

    with patch(
        "research_team.forum_client.urllib.request.urlopen", side_effect=fake_open
    ):
        await tools["reply"].ainvoke({
            "thread_id": "t1",
            "body": "push back",
            "sources": [{"url": "https://example.com/n"}],
        })
    assert seen["body"]["sources"] == [{"url": "https://example.com/n"}]


def test_create_and_reply_sources_schema_has_url_and_title():
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}
    for name in ("create_thread", "reply"):
        schema = tools[name].tool_call_schema.model_json_schema()
        item = schema["$defs"]["PostSource"]
        assert "url" in item["properties"]
        assert "title" in item["properties"]
        assert item["required"] == ["url"]


@pytest.mark.asyncio
async def test_read_thread_records_open_on_success():
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}
    with patch(
        "research_team.forum_client.urllib.request.urlopen",
        return_value=_Resp({"id": "t1", "title": "Hi"}),
    ):
        await tools["read_thread"].ainvoke({"thread_id": "t1"})
    assert client.opened == ["t1"]


@pytest.mark.asyncio
async def test_read_thread_404_does_not_record_open():
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}
    err = HTTPError(
        "http://forum.test/api/forum/threads/missing",
        404,
        "not found",
        hdrs=None,
        fp=BytesIO(b'{"error":"Thread not found."}'),
    )
    with patch("research_team.forum_client.urllib.request.urlopen", side_effect=err):
        text = await tools["read_thread"].ainvoke({"thread_id": "missing"})
    assert text.startswith("HTTP 404")
    assert client.opened == []


@pytest.mark.asyncio
async def test_forum_tools_omit_list_threads():
    client = ForumClient(base_url="http://forum.test", token="tok")
    names = {t.name for t in client.tools()}
    assert "list_threads" not in names
    assert names == {
        "read_thread",
        "create_thread",
        "reply",
        "react_post",
        "propose_motion",
        "vote_motion",
    }


@pytest.mark.asyncio
async def test_inbox_parses_items_and_fail_soft():
    client = ForumClient(base_url="http://forum.test", token="tok")
    with patch(
        "research_team.forum_client.urllib.request.urlopen",
        return_value=_Resp({"items": [{"threadId": "t1", "title": "Hi"}]}),
    ):
        items = await client.inbox()
    assert items == [{"threadId": "t1", "title": "Hi"}]

    err = HTTPError(
        "http://forum.test/api/forum/inbox",
        401,
        "nope",
        hdrs=None,
        fp=BytesIO(b'{"error":"Invalid bearer token."}'),
    )
    with patch("research_team.forum_client.urllib.request.urlopen", side_effect=err):
        assert await client.inbox() == []


@pytest.mark.asyncio
async def test_discover_requests_sample_query():
    client = ForumClient(base_url="http://forum.test", token="tok")
    seen: dict = {}

    def fake_open(req, timeout=30):
        seen["url"] = req.full_url
        return _Resp({"threads": [{"id": "t2", "title": "Other", "board": "lounge"}]})

    with patch(
        "research_team.forum_client.urllib.request.urlopen", side_effect=fake_open
    ):
        rows = await client.discover(10)
    assert "discover=10" in seen["url"]
    assert rows[0]["id"] == "t2"


@pytest.mark.asyncio
async def test_forum_client_http_error_is_string():
    client = ForumClient(base_url="http://forum.test", token="tok")
    err = HTTPError(
        "http://forum.test/api/forum/threads",
        401,
        "nope",
        hdrs=None,
        fp=BytesIO(b'{"error":"Invalid bearer token."}'),
    )
    with patch("research_team.forum_client.urllib.request.urlopen", side_effect=err):
        text = await client.request("GET", "/api/forum/threads")
    assert text.startswith("HTTP 401")
    assert "Invalid bearer token" in text


@pytest.mark.asyncio
async def test_read_thread_keeps_body_past_12k():
    posts = [
        {
            "id": f"p{i}",
            "floor": i,
            "body": ("anthropic ipo floor " * 80) + f" #{i}",
            "sources": [],
            "createdAt": "2026-08-17T00:00:00.000Z",
            "upCount": 0,
            "downCount": 0,
            "authorHandle": "lynch",
            "authorKind": "agent",
        }
        for i in range(1, 12)
    ]
    payload = {
        "id": "t1",
        "title": "Anthropic IPO",
        "totalFloors": 11,
        "posts": posts,
    }
    raw = json.dumps(payload)
    assert len(raw) > 12_000
    client = ForumClient(base_url="http://forum.test", token="tok")
    tools = {t.name: t for t in client.tools()}
    with patch(
        "research_team.forum_client.urllib.request.urlopen",
        return_value=_Resp(payload),
    ):
        text = await tools["read_thread"].ainvoke({"thread_id": "t1"})
    data = json.loads(text)
    assert data["totalFloors"] == 11
    assert len(data["posts"]) == 11
    assert data["posts"][-1]["floor"] == 11
    assert data["posts"][-1]["body"].endswith("#11")


@pytest.mark.asyncio
async def test_forum_http_retries_timeout_then_succeeds():
    client = ForumClient(base_url="http://forum.test", token="tok")
    calls = {"n": 0}

    def flaky(req, timeout=30):
        calls["n"] += 1
        if calls["n"] == 1:
            raise URLError("timed out")
        return _Resp({"id": "t1", "posts": []})

    with patch("research_team.forum_client.urllib.request.urlopen", side_effect=flaky):
        text = await client.request("GET", "/api/forum/threads/t1")
    assert calls["n"] == 2
    assert json.loads(text)["id"] == "t1"


@pytest.mark.asyncio
async def test_forum_http_retries_502_then_succeeds():
    client = ForumClient(base_url="http://forum.test", token="tok")
    calls = {"n": 0}

    def flaky(req, timeout=30):
        calls["n"] += 1
        if calls["n"] == 1:
            raise HTTPError(
                "http://forum.test/api/forum/threads",
                502,
                "bad gateway",
                hdrs=None,
                fp=BytesIO(b'{"error":"upstream"}'),
            )
        return _Resp({"threads": []})

    with patch("research_team.forum_client.urllib.request.urlopen", side_effect=flaky):
        text = await client.request("GET", "/api/forum/threads")
    assert calls["n"] == 2
    assert "threads" in json.loads(text)


@pytest.mark.asyncio
async def test_forum_http_does_not_retry_401():
    client = ForumClient(base_url="http://forum.test", token="tok")
    calls = {"n": 0}

    def once(req, timeout=30):
        calls["n"] += 1
        raise HTTPError(
            "http://forum.test/api/forum/threads",
            401,
            "nope",
            hdrs=None,
            fp=BytesIO(b'{"error":"Invalid bearer token."}'),
        )

    with patch("research_team.forum_client.urllib.request.urlopen", side_effect=once):
        text = await client.request("GET", "/api/forum/threads")
    assert calls["n"] == 1
    assert text.startswith("HTTP 401")
