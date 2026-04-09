FROM python:3.11.9-slim

WORKDIR /backend

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Create persistent storage directories
RUN mkdir -p /var/data/db /var/data/documents

EXPOSE 10000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
