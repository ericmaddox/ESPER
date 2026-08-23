#!/bin/bash

set -e

# Ralph Loop Docker Entrypoint Script

echo "Starting Ralph Loop service..."

# Wait for dependencies
echo "Waiting for dependencies..."
until python -c "import requests; requests.get('http://prometheus:9090/-/healthy')" 2>/dev/null; do
    echo "Waiting for Prometheus..."
    sleep 2
done

until python -c "import requests; requests.get('http://grafana:3000/api/health')" 2>/dev/null; do
    echo "Waiting for Grafana..."
    sleep 2
done

# Check if configuration exists
if [ ! -f "/app/config/ralph-loop-config.yml" ]; then
    echo "Error: Ralph Loop configuration not found"
    exit 1
fi

# Set environment variables
export PYTHONPATH="/app"
export LOG_LEVEL="${LOG_LEVEL:-INFO}"
export CONFIG_PATH="/app/config/ralph-loop-config.yml"

# Initialize logging
mkdir -p /app/logs
touch /app/logs/ralph-service.log

# Start the appropriate service
case "$1" in
    "ralph-master")
        echo "Starting Ralph Master Orchestrator..."
        exec python scripts/ralph-master.py --daemon --config "$CONFIG_PATH"
        ;;
    "health-check")
        echo "Starting Health Check Sub-Agent..."
        exec python scripts/sub-agents.py --agent health --config /app/config/sub-agents-config.yml
        ;;
    "performance")
        echo "Starting Performance Optimization Sub-Agent..."
        exec python scripts/sub-agents.py --agent performance --config /app/config/sub-agents-config.yml
        ;;
    "security")
        echo "Starting Security Scan Sub-Agent..."
        exec python scripts/sub-agents.py --agent security --config /app/config/sub-agents-config.yml
        ;;
    "database")
        echo "Starting Database Maintenance Sub-Agent..."
        exec python scripts/sub-agents.py --agent database --config /app/config/sub-agents-config.yml
        ;;
    "ralph-api")
        echo "Starting Ralph Loop API Gateway..."
        exec python scripts/ralph-api.py
        ;;
    "ralph-dashboard")
        echo "Starting Ralph Loop Dashboard..."
        exec python scripts/ralph-dashboard.py
        ;;
    "ralph-notifications")
        echo "Starting Ralph Loop Notification Service..."
        exec python scripts/ralph-notifications.py
        ;;
    "ralph-data-processor")
        echo "Starting Ralph Loop Data Processing Service..."
        exec python scripts/ralph-data-processor.py
        ;;
    "ralph-analytics")
        echo "Starting Ralph Loop Analytics Service..."
        exec python scripts/ralph-analytics.py
        ;;
    *)
        echo "Usage: $0 {ralph-master|health-check|performance|security|database|ralph-api|ralph-dashboard|ralph-notifications|ralph-data-processor|ralph-analytics}"
        exit 1
        ;;
esac