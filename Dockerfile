FROM python:3.12-slim-bookworm

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv \
 && uv sync --frozen --no-install-project \
 && uv pip install --no-cache-dir granian

COPY src/ .

ENV PORT=80
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose for Traefik
EXPOSE 80

# Launch with Granian
CMD ["uv", "run", "granian", "--interface", "wsgi", "--port", "80", "--host", "0.0.0.0", "--workers", "5", ".:application"]