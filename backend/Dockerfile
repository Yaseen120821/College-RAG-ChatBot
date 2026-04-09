FROM python:3.11.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create db and data directories
RUN mkdir -p /var/data/db /var/data/data

EXPOSE 10000

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"
