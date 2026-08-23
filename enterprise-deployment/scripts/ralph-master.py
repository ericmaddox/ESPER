#!/usr/bin/env python3
"""
ESPER Enterprise Ralph Loop Master Orchestrator
Coordinates all enterprise automation tasks and sub-agents
"""

import asyncio
import logging
import yaml
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import argparse
import sys
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/ralph-master.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class RalphMasterOrchestrator:
    """Master orchestrator for ESPER enterprise automation"""
    
    def __init__(self, config_path: str = "/app/config/ralph-loop-config.yml"):
        self.config = self._load_config(config_path)
        self.task_queue = asyncio.Queue()
        self.workers = {}
        self.alert_manager = AlertManager(self.config.get('alerts', {}))
        self.monitoring_client = MonitoringClient(self.config.get('monitoring', {}))
        self.task_scheduler = TaskScheduler(self.config.get('schedules', {}))
        self.enterprise_metrics = EnterpriseMetrics()
        
    def _load_config(self, config_path: str) -> Dict:
        """Load Ralph Loop configuration"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            logger.error(f"Config file not found: {config_path}")
            sys.exit(1)
        except yaml.YAMLError as e:
            logger.error(f"Error parsing config file: {e}")
            sys.exit(1)
    
    async def initialize(self):
        """Initialize orchestrator and workers"""
        logger.info("Initializing Ralph Master Orchestrator")
        
        # Initialize monitoring
        await self.monitoring_client.initialize()
        
        # Initialize alert manager
        await self.alert_manager.initialize()
        
        # Initialize task scheduler
        await self.task_scheduler.initialize()
        
        # Initialize workers
        await self._initialize_workers()
        
        logger.info("Ralph Master Orchestrator initialized successfully")
    
    async def _initialize_workers(self):
        """Initialize all worker agents"""
        worker_configs = self.config.get('workers', {})
        
        for worker_name, config in worker_configs.items():
            logger.info(f"Initializing worker: {worker_name}")
            worker = WorkerAgent(worker_name, config)
            await worker.initialize()
            self.workers[worker_name] = worker
    
    async def run_master_loop(self):
        """Main master orchestrator loop"""
        logger.info("Starting Ralph Master Loop")
        
        # Schedule initial tasks
        await self.task_scheduler.schedule_initial_tasks()
        
        # Main orchestration loop
        while True:
            try:
                # Check for scheduled tasks
                scheduled_tasks = await self.task_scheduler.get_scheduled_tasks()
                for task in scheduled_tasks:
                    await self.task_queue.put(task)
                
                # Process task queue
                await self._process_task_queue()
                
                # Monitor system health
                await self._monitor_system_health()
                
                # Check for alerts
                await self._check_alerts()
                
                # Wait for next iteration
                await asyncio.sleep(self.config.get('global', {}).get('master_interval', 1800))
                
            except Exception as e:
                logger.error(f"Error in master loop: {e}")
                await self.alert_manager.send_alert(
                    "Ralph Loop Error",
                    f"Master orchestrator error: {str(e)}",
                    severity="critical"
                )
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _process_task_queue(self):
        """Process tasks from the queue"""
        logger.info("Processing task queue")
        
        while not self.task_queue.empty():
            try:
                task = await self.task_queue.get()
                
                # Get appropriate worker
                worker_name = task.get('worker')
                if worker_name not in self.workers:
                    logger.error(f"Unknown worker: {worker_name}")
                    continue
                
                worker = self.workers[worker_name]
                
                # Execute task
                logger.info(f"Executing task: {task.get('name')} with worker: {worker_name}")
                result = await worker.execute_task(task)
                
                # Record metrics
                await self.enterprise_metrics.record_task_execution(
                    task_name=task.get('name'),
                    worker_name=worker_name,
                    result=result,
                    duration=time.time() - task.get('scheduled_at', time.time())
                )
                
                # Handle task completion
                await self._handle_task_completion(task, result)
                
            except Exception as e:
                logger.error(f"Error processing task: {e}")
                await self.alert_manager.send_alert(
                    "Task Processing Error",
                    f"Error processing task {task.get('name')}: {str(e)}",
                    severity="error"
                )
    
    async def _handle_task_completion(self, task: Dict, result: Dict):
        """Handle task completion and trigger dependent tasks"""
        task_name = task.get('name')
        worker_name = task.get('worker')
        
        # Log completion
        logger.info(f"Task completed: {task_name} by {worker_name}")
        
        # Check for task failures
        if result.get('status') == 'failed':
            await self._handle_task_failure(task, result)
            return
        
        # Trigger dependent tasks
        dependencies = self.config.get('orchestration', {}).get('dependencies', {})
        if worker_name in dependencies:
            for dependent_task in dependencies[worker_name]:
                dependent_task_config = self._create_dependent_task(dependent_task, task)
                await self.task_queue.put(dependent_task_config)
    
    async def _handle_task_failure(self, task: Dict, result: Dict):
        """Handle task failure with retry logic"""
        task_name = task.get('name')
        worker_name = task.get('worker')
        
        logger.error(f"Task failed: {task_name} by {worker_name}")
        
        # Check retry policy
        retry_config = self.config.get('retry_policies', {})
        max_retries = retry_config.get('max_retries', 3)
        current_retries = task.get('retries', 0) + 1
        
        if current_retries <= max_retries:
            # Schedule retry
            retry_delay = retry_config.get('retry_delay', '1m')
            retry_task = {
                **task,
                'retries': current_retries,
                'scheduled_at': time.time() + self._parse_time_delay(retry_delay)
            }
            await self.task_queue.put(retry_task)
            logger.info(f"Scheduled retry for task: {task_name} (attempt {current_retries}/{max_retries})")
        else:
            # Max retries exceeded - escalate
            await self.alert_manager.send_alert(
                "Task Failure",
                f"Task {task_name} failed after {max_retries} retries: {result.get('error')}",
                severity="critical"
            )
    
    async def _monitor_system_health(self):
        """Monitor overall system health"""
        logger.info("Monitoring system health")
        
        # Collect system metrics
        metrics = await self.monitoring_client.collect_metrics()
        
        # Check thresholds
        thresholds = self.config.get('global', {}).get('alert_thresholds', {})
        
        for metric_name, threshold in thresholds.items():
            current_value = metrics.get(metric_name)
            if current_value and current_value > threshold:
                await self.alert_manager.send_alert(
                    f"High {metric_name}",
                    f"{metric_name} is {current_value} (threshold: {threshold})",
                    severity="warning"
                )
        
        # Update enterprise metrics
        await self.enterprise_metrics.update_system_metrics(metrics)
    
    async def _check_alerts(self):
        """Check for and trigger alerts"""
        logger.info("Checking for alerts")
        
        # Get current alerts from monitoring
        alerts = await self.monitoring_client.get_alerts()
        
        for alert in alerts:
            await self.alert_manager.process_alert(alert)
    
    def _create_dependent_task(self, task_name: str, parent_task: Dict) -> Dict:
        """Create a dependent task configuration"""
        return {
            'name': task_name,
            'worker': task_name.split('_')[0] + '_worker',
            'scheduled_at': time.time(),
            'parent_task': parent_task.get('name'),
            'parent_result': parent_task.get('result')
        }
    
    def _parse_time_delay(self, delay_str: str) -> float:
        """Parse time delay string to seconds"""
        if delay_str.endswith('m'):
            return float(delay_str[:-1]) * 60
        elif delay_str.endswith('h'):
            return float(delay_str[:-1]) * 3600
        else:
            return float(delay_str)

class WorkerAgent:
    """Individual worker agent for specific tasks"""
    
    def __init__(self, name: str, config: Dict):
        self.name = name
        self.config = config
        self.command = config.get('command')
        self.environment = config.get('environment', {})
        self.retries = config.get('retries', 3)
        self.timeout = config.get('timeout', '30m')
        self.alert_on_failure = config.get('alert_on_failure', False)
        
    async def initialize(self):
        """Initialize worker agent"""
        logger.info(f"Initializing worker agent: {self.name}")
        # Worker-specific initialization logic here
        
    async def execute_task(self, task: Dict) -> Dict:
        """Execute a specific task"""
        logger.info(f"Worker {self.name} executing task: {task.get('name')}")
        
        start_time = time.time()
        result = {
            'status': 'success',
            'worker': self.name,
            'task': task.get('name'),
            'timestamp': datetime.now().isoformat(),
            'error': None
        }
        
        try:
            # Execute the task command
            process = await asyncio.create_subprocess_shell(
                self.command,
                env={**self.environment, **task.get('environment', {})},
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=self._parse_timeout(self.timeout)
            )
            
            if process.returncode != 0:
                result['status'] = 'failed'
                result['error'] = stderr.decode('utf-8')
                if self.alert_on_failure:
                    await self._send_failure_alert(task, result)
            
            result['output'] = stdout.decode('utf-8')
            result['duration'] = time.time() - start_time
            
        except asyncio.TimeoutError:
            result['status'] = 'failed'
            result['error'] = f"Task timeout after {self.timeout}"
            if self.alert_on_failure:
                await self._send_failure_alert(task, result)
                
        except Exception as e:
            result['status'] = 'failed'
            result['error'] = str(e)
            if self.alert_on_failure:
                await self._send_failure_alert(task, result)
        
        return result
    
    def _parse_timeout(self, timeout_str: str) -> float:
        """Parse timeout string to seconds"""
        if timeout_str.endswith('m'):
            return float(timeout_str[:-1]) * 60
        elif timeout_str.endswith('h'):
            return float(timeout_str[:-1]) * 3600
        else:
            return float(timeout_str)
    
    async def _send_failure_alert(self, task: Dict, result: Dict):
        """Send alert for task failure"""
        logger.error(f"Worker {self.name} task failed: {task.get('name')}")
        # Implementation for sending alerts

class AlertManager:
    """Alert management system"""
    
    def __init__(self, alert_config: Dict):
        self.alert_config = alert_config
        self.notification_channels = {}
        
    async def initialize(self):
        """Initialize alert manager"""
        logger.info("Initializing Alert Manager")
        # Initialize notification channels
        
    async def send_alert(self, title: str, message: str, severity: str = "warning"):
        """Send an alert"""
        logger.warning(f"ALERT [{severity.upper()}]: {title} - {message}")
        
        # Send to configured channels
        alert_config = self.alert_config.get(severity, [])
        for channel_config in alert_config:
            await self._send_to_channel(channel_config, title, message)
    
    async def process_alert(self, alert: Dict):
        """Process incoming alert"""
        title = alert.get('title')
        message = alert.get('message')
        severity = alert.get('severity', 'warning')
        
        await self.send_alert(title, message, severity)
    
    async def _send_to_channel(self, channel_config: Dict, title: str, message: str):
        """Send alert to specific channel"""
        channel_type = channel_config.get('type')
        
        if channel_type == 'email':
            await self._send_email(channel_config, title, message)
        elif channel_type == 'slack':
            await self._send_slack(channel_config, title, message)
        elif channel_type == 'pagerduty':
            await self._send_pagerduty(channel_config, title, message)

class MonitoringClient:
    """Monitoring and metrics collection client"""
    
    def __init__(self, monitoring_config: Dict):
        self.config = monitoring_config
        self.prometheus_client = None
        self.grafana_client = None
        
    async def initialize(self):
        """Initialize monitoring client"""
        logger.info("Initializing Monitoring Client")
        # Initialize Prometheus and Grafana clients
        
    async def collect_metrics(self) -> Dict:
        """Collect system metrics"""
        metrics = {}
        
        # Collect Prometheus metrics
        if self.config.get('metrics', {}).get('prometheus', {}).get('enabled', False):
            prometheus_metrics = await self._collect_prometheus_metrics()
            metrics.update(prometheus_metrics)
        
        return metrics
    
    async def get_alerts(self) -> List[Dict]:
        """Get current alerts"""
        alerts = []
        
        # Get Prometheus alerts
        if self.config.get('metrics', {}).get('prometheus', {}).get('enabled', False):
            prometheus_alerts = await self._get_prometheus_alerts()
            alerts.extend(prometheus_alerts)
        
        return alerts

class TaskScheduler:
    """Task scheduling system"""
    
    def __init__(self, schedule_config: Dict):
        self.config = schedule_config
        self.scheduled_tasks = {}
        
    async def initialize(self):
        """Initialize task scheduler"""
        logger.info("Initializing Task Scheduler")
        # Load scheduled tasks from config
        
    async def schedule_initial_tasks(self):
        """Schedule initial tasks"""
        logger.info("Scheduling initial tasks")
        
        for schedule_name, schedule_config in self.config.items():
            if schedule_config.get('enabled', False):
                await self._schedule_recurring_task(schedule_name, schedule_config)
    
    async def get_scheduled_tasks(self) -> List[Dict]:
        """Get tasks that are due for execution"""
        due_tasks = []
        
        current_time = datetime.now()
        
        for task_name, task_config in self.scheduled_tasks.items():
            if current_time >= task_config.get('next_run'):
                due_tasks.append(task_config)
                # Schedule next run
                await self._schedule_next_run(task_name, task_config)
        
        return due_tasks

class EnterpriseMetrics:
    """Enterprise metrics tracking"""
    
    def __init__(self):
        self.metrics = {}
        self.task_executions = []
        
    async def record_task_execution(self, task_name: str, worker_name: str, result: Dict, duration: float):
        """Record task execution metrics"""
        execution_record = {
            'timestamp': datetime.now().isoformat(),
            'task_name': task_name,
            'worker_name': worker_name,
            'result': result,
            'duration': duration
        }
        
        self.task_executions.append(execution_record)
        
        # Keep only recent executions
        if len(self.task_executions) > 1000:
            self.task_executions = self.task_executions[-1000:]
    
    async def update_system_metrics(self, metrics: Dict):
        """Update system metrics"""
        self.metrics.update(metrics)
    
    async def get_metrics_summary(self) -> Dict:
        """Get metrics summary"""
        return {
            'system_metrics': self.metrics,
            'task_executions_count': len(self.task_executions),
            'recent_executions': self.task_executions[-10:]
        }

async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='ESPER Enterprise Ralph Master Orchestrator')
    parser.add_argument('--config', default='/app/config/ralph-loop-config.yml', 
                       help='Path to Ralph Loop configuration file')
    parser.add_argument('--daemon', action='store_true', 
                       help='Run as daemon')
    
    args = parser.parse_args()
    
    # Initialize orchestrator
    orchestrator = RalphMasterOrchestrator(args.config)
    await orchestrator.initialize()
    
    # Run master loop
    if args.daemon:
        await orchestrator.run_master_loop()
    else:
        # Run single iteration
        await orchestrator._process_task_queue()
        await orchestrator._monitor_system_health()
        await orchestrator._check_alerts()

if __name__ == "__main__":
    asyncio.run(main())