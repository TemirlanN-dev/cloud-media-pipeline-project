# 1. Start with a lightweight Linux Python environment
FROM python:3.10-slim

# 2. Install FFmpeg into the Linux container
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Copy your dependency blueprint and install the Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy your actual processing script into the container
COPY process.py .

# 6. Command to run the script when the container starts
CMD ["python", "process.py"]