FROM python:3.12-slim
ARG PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 120 --retries 5 -r requirements.txt
COPY app ./app
RUN mkdir -p /app/data
