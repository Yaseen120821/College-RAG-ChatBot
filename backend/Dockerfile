FROM python:3.11.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --only-binary=:all: -r requirements.txt || \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Create persistent storage directories
RUN mkdir -p /var/data/db /var/data/data

EXPOSE 10000

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"
