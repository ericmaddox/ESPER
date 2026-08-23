# Production Deployment Script for ESPER Enterprise
# This script sets up the complete enterprise deployment including Ralph Loop

#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if required environment variables are set
check_env() {
    print_status "Checking environment variables..."
    
    required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "GRAFANA_PASSWORD"
        "RABBITMQ_USER"
        "RABBITMQ_PASSWORD"
        "MAPBOX_TOKEN"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        print_status "Please create a .env file with the following variables:"
        for var in "${missing_vars[@]}"; do
            echo "  $var=your_secure_value"
        done
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Create environment file
create_env_file() {
    print_status "Creating environment file..."
    
    if [ ! -f .env ]; then
        cat > .env << EOF
# Database Configuration
POSTGRES_PASSWORD=secure_password_here
REDIS_PASSWORD=redis_password_here

# Monitoring Configuration
GRAFANA_PASSWORD=grafana_password_here

# Message Queue Configuration
RABBITMQ_USER=rabbitmq_user
RABBITMQ_PASSWORD=rabbitmq_password_here

# External Services
MAPBOX_TOKEN=your_mapbox_token_here

# Ralph Loop Configuration
RALPH_CONFIG_PATH=/app/config/ralph-loop-config.yml
RALPH_API_URL=http://ralph-api:8081
RALPH_DASHBOARD_URL=http://ralph-dashboard:8082
EOF
        print_success "Created .env file"
    else
        print_status ".env file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    directories=(
        "config"
        "scripts"
        "nginx/conf.d"
        "prometheus"
        "grafana/provisioning/dashboards"
        "grafana/provisioning/datasources"
        "logs"
        "backups"
        "data/postgres"
        "data/redis"
        "data/elasticsearch"
        "data/prometheus"
        "data/grafana"
        "data/rabbitmq"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
    done
    
    print_success "Created all necessary directories"
}

# Generate configuration files
generate_configs() {
    print_status "Generating configuration files..."
    
    # Generate Prometheus configuration
    cat > prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'esper-frontend'
    static_configs:
      - targets: ['esper-frontend:3000']
  
  - job_name: 'esper-api-gateway'
    static_configs:
      - targets: ['esper-api-gateway:8080']
  
  - job_name: 'ralph-api'
    static_configs:
      - targets: ['ralph-api:8081']
  
  - job_name: 'ralph-dashboard'
    static_configs:
      - targets: ['ralph-dashboard:8082']
  
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']
  
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
  
  - job_name: 'elasticsearch'
    static_configs:
      - targets: ['elasticsearch:9200']
  
  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['rabbitmq:15672']
EOF
    
    # Generate Grafana datasources
    cat > grafana/provisioning/datasources/prometheus.yml << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
EOF
    
    # Generate Grafana dashboards
    cat > grafana/provisioning/dashboards/dashboard.yml << EOF
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF
    
    # Generate Nginx configuration
    cat > nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name localhost;
    
    # Frontend
    location / {
        proxy_pass http://esper-frontend:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API Gateway
    location /api/ {
        proxy_pass http://esper-api-gateway:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # Ralph Loop API
    location /ralph-api/ {
        proxy_pass http://ralph-api:8081/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Ralph Loop Dashboard
    location /ralph-dashboard/ {
        proxy_pass http://ralph-dashboard:8082/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health checks
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF
    
    print_success "Generated all configuration files"
}

# Build Docker images
build_images() {
    print_status "Building Docker images..."
    
    # Build frontend image
    docker-compose -f docker-compose.production.yml build esper-frontend
    
    # Build API Gateway image
    docker-compose -f docker-compose.production.yml build esper-api-gateway
    
    # Build Ralph Loop images
    docker-compose -f docker-compose.production.yml build ralph-master
    docker-compose -f docker-compose.production.yml build ralph-api
    docker-compose -f docker-compose.production.yml build ralph-dashboard
    docker-compose -f docker-compose.production.yml build ralph-notifications
    docker-compose -f docker-compose.production.yml build ralph-data-processor
    
    print_success "Built all Docker images"
}

# Start services
start_services() {
    print_status "Starting services..."
    
    # Start all services
    docker-compose -f docker-compose.production.yml up -d
    
    print_success "Started all services"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    services=(
        "postgres:5432"
        "redis:6379"
        "elasticsearch:9200"
        "prometheus:9090"
        "grafana:3000"
        "rabbitmq:5672"
        "esper-frontend:3000"
        "esper-api-gateway:8080"
        "ralph-api:8081"
        "ralph-dashboard:8082"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r service_name port <<< "$service"
        print_status "Waiting for $service_name on port $port..."
        
        timeout=60
        while [ $timeout -gt 0 ]; do
            if docker-compose -f docker-compose.production.yml exec -T "$service_name" nc -z localhost "$port" 2>/dev/null; then
                print_success "$service_name is ready"
                break
            fi
            
            sleep 2
            timeout=$((timeout - 2))
            
            if [ $timeout -eq 0 ]; then
                print_error "Timeout waiting for $service_name"
                exit 1
            fi
        done
    done
    
    print_success "All services are ready"
}

# Run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Check frontend
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
    fi
    
    # Check API Gateway
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        print_success "API Gateway health check passed"
    else
        print_error "API Gateway health check failed"
    fi
    
    # Check Ralph Loop API
    if curl -f http://localhost:8081/health > /dev/null 2>&1; then
        print_success "Ralph Loop API health check passed"
    else
        print_error "Ralph Loop API health check failed"
    fi
    
    # Check Ralph Loop Dashboard
    if curl -f http://localhost:8082/health > /dev/null 2>&1; then
        print_success "Ralph Loop Dashboard health check passed"
    else
        print_error "Ralph Loop Dashboard health check failed"
    fi
    
    print_success "All health checks completed"
}

# Display deployment information
display_info() {
    print_status "Deployment Information:"
    echo "====================================="
    echo "Frontend URL: http://localhost:3000"
    echo "API Gateway URL: http://localhost:8080"
    echo "Ralph Loop API URL: http://localhost:8081"
    echo "Ralph Loop Dashboard URL: http://localhost:8082"
    echo "Grafana URL: http://localhost:3001"
    echo "Prometheus URL: http://localhost:9090"
    echo "RabbitMQ Management: http://localhost:15672"
    echo ""
    echo "Default Grafana credentials: admin / $GRAFANA_PASSWORD"
    echo "Default RabbitMQ credentials: $RABBITMQ_USER / $RABBITMQ_PASSWORD"
    echo ""
    echo "To view logs: docker-compose -f docker-compose.production.yml logs -f"
    echo "To stop services: docker-compose -f docker-compose.production.yml down"
    echo "To restart services: docker-compose -f docker-compose.production.yml restart"
    echo "====================================="
}

# Main deployment function
main() {
    print_status "Starting ESPER Enterprise deployment..."
    
    check_docker
    check_env
    create_env_file
    create_directories
    generate_configs
    build_images
    start_services
    wait_for_services
    run_health_checks
    display_info
    
    print_success "ESPER Enterprise deployment completed successfully!"
}

# Run main function
main "$@"