import json
from io import BytesIO
from unittest.mock import patch

import pytest
from urllib.error import HTTPError

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
        text = await tools["reply"].ainvoke(
            {"thread_id": "t1", "body": "push back", "quote_post_id": "p1"}
        )
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
