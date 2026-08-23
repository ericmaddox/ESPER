#!/usr/bin/env python3
"""
ESPER Enterprise Ralph Loop Data Processing Service
Handles data ingestion, processing, and analytics for Ralph Loop
"""

import asyncio
import logging
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import yaml
import redis
import elasticsearch
from elasticsearch import Elasticsearch
import aiohttp
import kubernetes.client
from kubernetes import config
import matplotlib.pyplot as plt
import seaborn as sns
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataType(Enum):
    METRICS = "metrics"
    LOGS = "logs"
    ALERTS = "alerts"
    TASKS = "tasks"
    PERFORMANCE = "performance"
    SECURITY = "security"
    DATABASE = "database"

@dataclass
class DataPoint:
    timestamp: datetime
    data_type: DataType
    source: str
    value: Union[float, int, str, Dict]
    metadata: Optional[Dict[str, Any]] = None

class DataProcessor:
    """Main data processing service"""
    
    def __init__(self, config_path: str = "/app/config/sub-agents-config.yml"):
        self.config = self._load_config(config_path)
        self.redis_client = None
        self.elasticsearch_client = None
        self.processing_queue = asyncio.Queue()
        self.aggregated_data = {}
        
        # Initialize clients
        self._initialize_clients()
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return {}
    
    def _initialize_clients(self):
        """Initialize data processing clients"""
        # Initialize Redis
        try:
            self.redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
        
        # Initialize Elasticsearch
        try:
            self.elasticsearch_client = Elasticsearch(
                hosts=[{'host': 'elasticsearch', 'port': 9200}],
                timeout=30
            )
            logger.info("Connected to Elasticsearch")
        except Exception as e:
            logger.error(f"Failed to connect to Elasticsearch: {e}")
    
    async def initialize(self):
        """Initialize data processor"""
        logger.info("Initializing Data Processing Service")
        
        # Create necessary indices
        await self._create_elasticsearch_indices()
        
        # Start data processing
        asyncio.create_task(self._process_data())
        
        logger.info("Data Processing Service initialized")
    
    async def _create_elasticsearch_indices(self):
        """Create Elasticsearch indices"""
        indices = [
            'ralph-metrics',
            'ralph-logs',
            'ralph-alerts',
            'ralph-tasks',
            'ralph-performance',
            'ralph-security',
            'ralph-database'
        ]
        
        for index in indices:
            if not self.elasticsearch_client.indices.exists(index=index):
                try:
                    self.elasticsearch_client.indices.create(index=index)
                    logger.info(f"Created index: {index}")
                except Exception as e:
                    logger.error(f"Failed to create index {index}: {e}")
    
    async def process_data(self, data_point: DataPoint):
        """Process a data point"""
        await self.processing_queue.put(data_point)
    
    async def _process_data(self):
        """Process data from queue"""
        logger.info("Starting data processing")
        
        while True:
            try:
                data_point = await self.processing_queue.get()
                
                # Process based on data type
                if data_point.data_type == DataType.METRICS:
                    await self._process_metrics(data_point)
                elif data_point.data_type == DataType.LOGS:
                    await self._process_logs(data_point)
                elif data_point.data_type == DataType.ALERTS:
                    await self._process_alerts(data_point)
                elif data_point.data_type == DataType.TASKS:
                    await self._process_tasks(data_point)
                elif data_point.data_type == DataType.PERFORMANCE:
                    await self._process_performance(data_point)
                elif data_point.data_type == DataType.SECURITY:
                    await self._process_security(data_point)
                elif data_point.data_type == DataType.DATABASE:
                    await self._process_database(data_point)
                
                # Mark task as done
                self.processing_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error processing data: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def _process_metrics(self, data_point: DataPoint):
        """Process metrics data"""
        try:
            # Store in Elasticsearch
            doc = {
                'timestamp': data_point.timestamp.isoformat(),
                'source': data_point.source,
                'metric_name': data_point.metadata.get('metric_name'),
                'value': data_point.value,
                'unit': data_point.metadata.get('unit'),
                'tags': data_point.metadata.get('tags', {})
            }
            
            self.elasticsearch_client.index(
                index='ralph-metrics',
                body=doc
            )
            
            # Store in Redis for real-time access
            redis_key = f"metrics:{data_point.source}:{data_point.metadata.get('metric_name')}"
            await self.redis_client.lpush(redis_key, json.dumps(doc))
            await self.redis_client.expire(redis_key, 3600)  # 1 hour
            
            # Update aggregated data
            self._update_aggregated_data('metrics', data_point)
            
        except Exception as e:
            logger.error(f"Error processing metrics: {e}")
    
    async def _process_logs(self, data_point: DataPoint):
        """Process logs data"""
        try:
            doc = {
                'timestamp': data_point.timestamp.isoformat(),
                'source': data_point.source,
                'level': data_point.metadata.get('level'),
                'message': data_point.value,
                'service': data_point.metadata.get('service'),
                'host': data_point.metadata.get('host')
            }
            
            self.elasticsearch_client.index(
                index='ralph-logs',
                body=doc
            )
            
            # Store in Redis
            redis_key = f"logs:{data_point.source}:{data_point.metadata.get('level')}"
            await self.redis_client.lpush(redis_key, json.dumps(doc))
            await self.redis_client.expire(redis_key, 3600)
            
        except Exception as e:
            logger.error(f"Error processing logs: {e}")
    
    async def _process_alerts(self, data_point: DataPoint):
        """Process alerts data"""
        try:
            doc = {
                'timestamp': data_point.timestamp.isoformat(),
                'source': data_point.source,
                'title': data_point.metadata.get('title'),
                'message': data_point.value,
                'severity': data_point.metadata.get('severity'),
                'channel': data_point.metadata.get('channel'),
                'resolved': data_point.metadata.get('resolved', False)
            }
            
            self.elasticsearch_client.index(
                index='ralph-alerts',
                body=doc
            )
            
            # Store in Redis
            redis_key = f"alerts:{data_point.source}:{data_point.metadata.get('severity')}"
            await self.redis_client.lpush(redis_key, json.dumps(doc))
            await self.redis_client.expire(redis_key, 86400)  # 24 hours
            
            # Update aggregated data
            self._update_aggregated_data('alerts', data_point)
            
        except Exception as e:
            logger.error(f"Error processing alerts: {e}")
    
    async def _process_tasks(self, data_point: DataPoint):
        """Process tasks data"""
        try:
            doc = {
                'timestamp': data_point.timestamp.isoformat(),
                'task_id': data_point.metadata.get('task_id'),
                'name': data_point.metadata.get('name'),
                'worker': data_point.metadata.get('worker'),
                'status': data_point.value,
                'priority': data_point.metadata.get('priority'),
                'duration': data_point.metadata.get('duration')
            }
            
            self.elasticsearch_client.index(
                index='ralph-tasks',
                body=doc
            )
            
            # Store in Redis
            redis_key = f"tasks:{data_point.metadata.get('worker')}"
            await self.redis_client.lpush(redis_key, json.dumps(doc))
            await self.redis_client.expire(redis_key, 3600)
            
            # Update aggregated data
            self._update_aggregated_data('tasks', data_point)
            
        except Exception as e:
            logger.error(f"Error processing tasks: {e}")
    
    async def _process_performance(self, data_point: DataPoint):
        """Process performance data"""
        try:
            doc = {
                'timestamp': data_point.timestamp.isoformat(),
                'source': data_point.source,
                'metric_name': data_point.metadata.get('metric_name'),
                'value': data_point.value,
                'unit': data_point.metadata.get('unit'),
                'service': data_point.metadata.get('service')
            }
            
            self.elasticsearch_client.index(
                index='ralph-performance',
                body=doc
            )
            
            # Store in Redis
            redis_key = f"performance:{data_point.source}:{data_point.metadata.get('metric_name')}"
            await self.redis_client.lpush(redis_key, json.dumps(doc))
            await self.redis_client.expire(redis_key, 3600)
            
            # Update aggregated data
            self._update_aggregated_data('performance', data_point)
            
        except Exception as e:
            logger.error(f"Error processing performance data: {e}")
    
    async def _process_security(self, data_point: DataPoint):
        """Process security data"""
        try:
            doc = {
                'timestamp': data_point.timestamp.isoformat(),
                'source': data_point.source,
                'scan_type': data_point.metadata.get('scan_type'),
                'target': data_point.metadata.get('target'),
                'vulnerabilities': data_point.value,
                'severity': data_point.metadata.get('severity'),
                'compliance': data_point.metadata.get('compliance')
            }
            
            self.elasticsearch_client.index(
                index='ralph-security',
                body=doc
            )
            
            # Store in Redis
            redis_key = f"security:{data_point.source}:{data_point.metadata.get('scan_type')}"
            await self.redis_client.lpush(redis_key, json.dumps(doc))
            await self.redis_client.expire(redis_key, 86400)
            
            # Update aggregated data
            self._update_aggregated_data('security', data_point)
            
        except Exception as e:
            logger.error(f"Error processing security data: {e}")
    
    async def _process_database(self, data_point: DataPoint):
        """Process database data"""
        try:
            doc = {
                'timestamp': data_point.timestamp.isoformat(),
                'source': data_point.source,
                'operation': data_point.metadata.get('operation'),
                'status': data_point.value,
                'duration': data_point.metadata.get('duration'),
                'size': data_point.metadata.get('size'),
                'backup_status': data_point.metadata.get('backup_status')
            }
            
            self.elasticsearch_client.index(
                index='ralph-database',
                body=doc
            )
            
            # Store in Redis
            redis_key = f"database:{data_point.source}:{data_point.metadata.get('operation')}"
            await self.redis_client.lpush(redis_key, json.dumps(doc))
            await self.redis_client.expire(redis_key, 3600)
            
            # Update aggregated data
            self._update_aggregated_data('database', data_point)
            
        except Exception as e:
            logger.error(f"Error processing database data: {e}")
    
    def _update_aggregated_data(self, data_type: str, data_point: DataPoint):
        """Update aggregated data"""
        if data_type not in self.aggregated_data:
            self.aggregated_data[data_type] = {
                'count': 0,
                'latest': None,
                'min_value': float('inf'),
                'max_value': float('-inf'),
                'avg_value': 0
            }
        
        agg_data = self.aggregated_data[data_type]
        agg_data['count'] += 1
        agg_data['latest'] = data_point.timestamp
        
        if isinstance(data_point.value, (int, float)):
            agg_data['min_value'] = min(agg_data['min_value'], data_point.value)
            agg_data['max_value'] = max(agg_data['max_value'], data_point.value)
            agg_data['avg_value'] = (agg_data['avg_value'] * (agg_data['count'] - 1) + data_point.value) / agg_data['count']
    
    async def get_aggregated_data(self, data_type: str) -> Dict:
        """Get aggregated data for a specific data type"""
        return self.aggregated_data.get(data_type, {})
    
    async def get_time_series_data(self, data_type: str, metric_name: str, hours: int = 24) -> List[Dict]:
        """Get time series data for a specific metric"""
        try:
            query = {
                'query': {
                    'bool': {
                        'must': [
                            {'term': {'metric_name': metric_name}},
                            {'range': {'timestamp': {'gte': f"now-{hours}h"}}}
                        ]
                    }
                },
                'sort': [{'timestamp': {'order': 'asc'}}],
                'size': 1000
            }
            
            response = self.elasticsearch_client.search(
                index=f'ralph-{data_type}',
                body=query
            )
            
            return [hit['_source'] for hit in response['hits']['hits']]
            
        except Exception as e:
            logger.error(f"Error getting time series data: {e}")
            return []
    
    async def generate_report(self, report_type: str, time_range: str = '24h') -> Dict:
        """Generate a data report"""
        try:
            report = {
                'report_type': report_type,
                'time_range': time_range,
                'generated_at': datetime.now().isoformat(),
                'data': {}
            }
            
            if report_type == 'system_overview':
                report['data'] = await self._generate_system_overview(time_range)
            elif report_type == 'performance_summary':
                report['data'] = await self._generate_performance_summary(time_range)
            elif report_type == 'security_summary':
                report['data'] = await self._generate_security_summary(time_range)
            elif report_type == 'database_summary':
                report['data'] = await self._generate_database_summary(time_range)
            else:
                raise ValueError(f"Unknown report type: {report_type}")
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return {}
    
    async def _generate_system_overview(self, time_range: str) -> Dict:
        """Generate system overview report"""
        try:
            # Get aggregated data for all data types
            overview = {}
            
            for data_type in DataType:
                agg_data = await self.get_aggregated_data(data_type.value)
                overview[data_type.value] = agg_data
            
            # Get recent alerts
            alerts_query = {
                'query': {
                    'range': {'timestamp': {'gte': f"now-{time_range}"}}
                },
                'sort': [{'timestamp': {'order': 'desc'}}],
                'size': 10
            }
            
            alerts_response = self.elasticsearch_client.search(
                index='ralph-alerts',
                body=alerts_query
            )
            
            overview['recent_alerts'] = [hit['_source'] for hit in alerts_response['hits']['hits']]
            
            return overview
            
        except Exception as e:
            logger.error(f"Error generating system overview: {e}")
            return {}
    
    async def _generate_performance_summary(self, time_range: str) -> Dict:
        """Generate performance summary report"""
        try:
            # Get performance metrics
            metrics = await self.get_time_series_data('performance', 'cpu_usage', int(time_range[:-1]))
            memory_metrics = await self.get_time_series_data('performance', 'memory_usage', int(time_range[:-1]))
            response_time_metrics = await self.get_time_series_data('performance', 'response_time', int(time_range[:-1]))
            
            # Calculate statistics
            cpu_stats = self._calculate_statistics([m['value'] for m in metrics])
            memory_stats = self._calculate_statistics([m['value'] for m in memory_metrics])
            response_time_stats = self._calculate_statistics([m['value'] for m in response_time_metrics])
            
            return {
                'cpu_usage': cpu_stats,
                'memory_usage': memory_stats,
                'response_time': response_time_stats,
                'time_range': time_range
            }
            
        except Exception as e:
            logger.error(f"Error generating performance summary: {e}")
            return {}
    
    async def _generate_security_summary(self, time_range: str) -> Dict:
        """Generate security summary report"""
        try:
            # Get security metrics
            security_query = {
                'query': {
                    'range': {'timestamp': {'gte': f"now-{time_range}"}}
                },
                'aggs': {
                    'severity_counts': {
                        'terms': {'field': 'severity'}
                    },
                    'scan_types': {
                        'terms': {'field': 'scan_type'}
                    }
                }
            }
            
            response = self.elasticsearch_client.search(
                index='ralph-security',
                body=security_query
            )
            
            return {
                'severity_distribution': response['aggregations']['severity_counts']['buckets'],
                'scan_types': response['aggregations']['scan_types']['buckets'],
                'total_scans': response['hits']['total']['value']
            }
            
        except Exception as e:
            logger.error(f"Error generating security summary: {e}")
            return {}
    
    async def _generate_database_summary(self, time_range: str) -> Dict:
        """Generate database summary report"""
        try:
            # Get database metrics
            database_query = {
                'query': {
                    'range': {'timestamp': {'gte': f"now-{time_range}"}}
                },
                'aggs': {
                    'operation_counts': {
                        'terms': {'field': 'operation'}
                    },
                    'status_counts': {
                        'terms': {'field': 'status'}
                    }
                }
            }
            
            response = self.elasticsearch_client.search(
                index='ralph-database',
                body=database_query
            )
            
            return {
                'operation_distribution': response['aggregations']['operation_counts']['buckets'],
                'status_distribution': response['aggregations']['status_counts']['buckets'],
                'total_operations': response['hits']['total']['value']
            }
            
        except Exception as e:
            logger.error(f"Error generating database summary: {e}")
            return {}
    
    def _calculate_statistics(self, values: List[float]) -> Dict:
        """Calculate basic statistics for a list of values"""
        if not values:
            return {}
        
        return {
            'count': len(values),
            'min': min(values),
            'max': max(values),
            'avg': sum(values) / len(values),
            'median': np.median(values),
            'std': np.std(values),
            'p95': np.percentile(values, 95),
            'p99': np.percentile(values, 99)
        }

# Main execution
async def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='ESPER Enterprise Ralph Loop Data Processing Service')
    parser.add_argument('--config', default='/app/config/sub-agents-config.yml',
                       help='Path to data processing configuration')
    
    args = parser.parse_args()
    
    # Initialize data processor
    processor = DataProcessor(args.config)
    await processor.initialize()
    
    # Start the service
    logger.info("Data Processing Service started")
    
    # Keep the service running
    try:
        while True:
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        logger.info("Data Processing Service stopped")

if __name__ == "__main__":
    asyncio.run(main())