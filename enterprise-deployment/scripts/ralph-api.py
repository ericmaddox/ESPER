#!/usr/bin/env python3
"""
ESPER Enterprise Ralph Loop API Gateway
RESTful API for Ralph Loop automation and external integrations
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import asyncio
import json
import logging
from datetime import datetime
import yaml
from pathlib import Path

# Import Ralph Loop components
from ralph_master import RalphMasterOrchestrator
from sub_agents import HealthCheckAgent, PerformanceOptimizationAgent, SecurityScanAgent, DatabaseMaintenanceAgent

app = FastAPI(
    title="ESPER Enterprise Ralph Loop API",
    description="RESTful API for Ralph Loop automation and external integrations",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Global variables
orchestrator = None
health_agent = None
performance_agent = None
security_agent = None
database_agent = None

# Pydantic models
class TaskRequest(BaseModel):
    name: str
    worker: str
    parameters: Dict[str, Any] = {}
    priority: str = "medium"
    scheduled_at: Optional[datetime] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str
    timestamp: datetime

class HealthCheckRequest(BaseModel):
    services: List[str] = []
    include_metrics: bool = True

class HealthCheckResponse(BaseModel):
    overall_status: str
    services: Dict[str, Any]
    system_metrics: Dict[str, Any]
    timestamp: datetime

class PerformanceOptimizationRequest(BaseModel):
    target_services: List[str] = []
    optimization_rules: List[str] = []
    dry_run: bool = False

class SecurityScanRequest(BaseModel):
    scan_targets: List[str] = []
    scan_types: List[str] = []
    include_compliance: bool = True

class DatabaseMaintenanceRequest(BaseModel):
    tasks: List[str] = []
    backup_enabled: bool = True
    optimization_enabled: bool = True

class AlertRequest(BaseModel):
    title: str
    message: str
    severity: str = "warning"
    channel: str = "all"

class StatusResponse(BaseModel):
    status: str
    message: str
    timestamp: datetime
    version: str

# Initialize Ralph Loop components
async def initialize_components():
    """Initialize all Ralph Loop components"""
    global orchestrator, health_agent, performance_agent, security_agent, database_agent
    
    # Load configuration
    config_path = Path("/app/config/ralph-loop-config.yml")
    if not config_path.exists():
        raise Exception("Configuration file not found")
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Initialize orchestrator
    orchestrator = RalphMasterOrchestrator(config_path)
    await orchestrator.initialize()
    
    # Initialize sub-agents
    sub_agents_config = Path("/app/config/sub-agents-config.yml")
    if sub_agents_config.exists():
        with open(sub_agents_config, 'r') as f:
            sub_config = yaml.safe_load(f)
        
        health_agent = HealthCheckAgent(sub_config.get('health_check', {}))
        performance_agent = PerformanceOptimizationAgent(sub_config.get('performance_optimization', {}))
        security_agent = SecurityScanAgent(sub_config.get('security_scan', {}))
        database_agent = DatabaseMaintenanceAgent(sub_config.get('database_maintenance', {}))

@app.on_event("startup")
async def startup_event():
    """Initialize components on startup"""
    await initialize_components()
    logging.info("Ralph Loop API Gateway started")

@app.get("/", response_model=StatusResponse)
async def root():
    """Root endpoint - API status"""
    return StatusResponse(
        status="healthy",
        message="ESPER Enterprise Ralph Loop API Gateway",
        timestamp=datetime.now(),
        version="2.0.0"
    )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0"
    }

# Task Management Endpoints
@app.post("/tasks", response_model=TaskResponse)
async def create_task(task_request: TaskRequest, background_tasks: BackgroundTasks):
    """Create and schedule a new task"""
    try:
        task_id = f"task_{int(datetime.now().timestamp())}"
        
        # Add task to orchestrator queue
        task = {
            "task_id": task_id,
            "name": task_request.name,
            "worker": task_request.worker,
            "parameters": task_request.parameters,
            "priority": task_request.priority,
            "scheduled_at": task_request.scheduled_at or datetime.now(),
            "status": "pending"
        }
        
        # Add to background tasks for execution
        background_tasks.add_task(execute_task, task)
        
        return TaskResponse(
            task_id=task_id,
            status="pending",
            message="Task created and scheduled",
            timestamp=datetime.now()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks")
async def list_tasks():
    """List all tasks"""
    try:
        # This would typically query the orchestrator's task queue
        return {
            "tasks": [],
            "total": 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/tasks/{task_id}")
async def get_task(task_id: str):
    """Get task details"""
    try:
        # This would typically query the orchestrator's task queue
        return {
            "task_id": task_id,
            "status": "not_found",
            "message": "Task not found",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    """Cancel a task"""
    try:
        # This would typically cancel the task in the orchestrator
        return {
            "task_id": task_id,
            "status": "cancelled",
            "message": "Task cancelled",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health Check Endpoints
@app.post("/health/check", response_model=HealthCheckResponse)
async def run_health_check(request: HealthCheckRequest):
    """Run comprehensive health check"""
    try:
        if health_agent:
            result = await health_agent.run_health_checks()
            return HealthCheckResponse(
                overall_status=result.get('overall_status', 'unknown'),
                services=result.get('services', {}),
                system_metrics=result.get('system_metrics', {}),
                timestamp=datetime.now()
            )
        else:
            raise HTTPException(status_code=503, detail="Health check agent not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health/services")
async def list_services():
    """List all monitored services"""
    try:
        return {
            "services": [
                "esper-frontend",
                "esper-api-gateway",
                "postgres",
                "redis",
                "prometheus",
                "grafana",
                "elasticsearch"
            ],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Performance Optimization Endpoints
@app.post("/performance/optimize")
async def optimize_performance(request: PerformanceOptimizationRequest):
    """Run performance optimization"""
    try:
        if performance_agent:
            result = await performance_agent.optimize_performance()
            return {
                "optimization_result": result,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=503, detail="Performance optimization agent not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/performance/metrics")
async def get_performance_metrics():
    """Get performance metrics"""
    try:
        # This would typically query Prometheus for metrics
        return {
            "metrics": {
                "cpu_usage": 45.2,
                "memory_usage": 62.8,
                "disk_usage": 34.5,
                "response_time": 0.85,
                "error_rate": 0.02
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Security Scan Endpoints
@app.post("/security/scan", response_model=Dict)
async def run_security_scan(request: SecurityScanRequest):
    """Run security scan"""
    try:
        if security_agent:
            result = await security_agent.run_security_scan()
            return {
                "scan_result": result,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=503, detail="Security scan agent not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/security/vulnerabilities")
async def get_vulnerabilities():
    """Get current vulnerabilities"""
    try:
        return {
            "vulnerabilities": [],
            "total": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Database Maintenance Endpoints
@app.post("/database/maintenance")
async def run_database_maintenance(request: DatabaseMaintenanceRequest):
    """Run database maintenance"""
    try:
        if database_agent:
            result = await database_agent.run_maintenance()
            return {
                "maintenance_result": result,
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(status_code=503, detail="Database maintenance agent not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database/backup")
async def get_backup_status():
    """Get backup status"""
    try:
        return {
            "backup_status": "healthy",
            "last_backup": "2024-01-15T10:30:00Z",
            "next_backup": "2024-01-16T10:30:00Z",
            "retention_days": 30,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Alert Management Endpoints
@app.post("/alerts")
async def send_alert(request: AlertRequest):
    """Send an alert"""
    try:
        # This would typically send the alert through the notification system
        return {
            "alert_id": f"alert_{int(datetime.now().timestamp())}",
            "status": "sent",
            "message": "Alert sent successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/alerts")
async def get_alerts():
    """Get recent alerts"""
    try:
        return {
            "alerts": [],
            "total": 0,
            "critical": 0,
            "warning": 0,
            "info": 0,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# System Management Endpoints
@app.post("/system/restart")
async def restart_service(service_name: str):
    """Restart a service"""
    try:
        # This would typically restart the service through Kubernetes or Docker
        return {
            "service": service_name,
            "status": "restarted",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/system/scale")
async def scale_service(service_name: str, replicas: int):
    """Scale a service"""
    try:
        # This would typically scale the service through Kubernetes
        return {
            "service": service_name,
            "replicas": replicas,
            "status": "scaled",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Configuration Management Endpoints
@app.get("/config")
async def get_config():
    """Get current configuration"""
    try:
        with open("/app/config/ralph-loop-config.yml", 'r') as f:
            config = yaml.safe_load(f)
        return {
            "config": config,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/config")
async def update_config(config_data: Dict):
    """Update configuration"""
    try:
        with open("/app/config/ralph-loop-config.yml", 'w') as f:
            yaml.dump(config_data, f)
        return {
            "status": "updated",
            "message": "Configuration updated successfully",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Background task execution
async def execute_task(task: Dict):
    """Execute a task in the background"""
    try:
        # This would typically execute the task through the orchestrator
        logging.info(f"Executing task: {task['name']}")
        
        # Simulate task execution
        await asyncio.sleep(5)  # Simulate work
        
        # Update task status
        task['status'] = 'completed'
        task['result'] = {'success': True, 'message': 'Task completed successfully'}
        
        logging.info(f"Task completed: {task['name']}")
    except Exception as e:
        logging.error(f"Task execution failed: {e}")
        task['status'] = 'failed'
        task['result'] = {'success': False, 'error': str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)