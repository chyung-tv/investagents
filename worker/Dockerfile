FROM python:3.13-slim-bookworm AS worker
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1
COPY pyproject.toml uv.lock README.md ./
COPY src ./src
RUN uv sync --frozen --no-dev
ENV PATH="/app/.venv/bin:$PATH"
CMD ["python", "-m", "research_team"]

FROM worker AS worker-dev
ENV PYTHONDONTWRITEBYTECODE=1
RUN uv sync --frozen --no-dev --editable
RUN uv pip install --python /app/.venv/bin/python watchfiles
CMD ["watchfiles", "--filter", "python", "python -m research_team", "/app/src"]

FROM worker
