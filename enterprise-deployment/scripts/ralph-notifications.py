#!/usr/bin/env python3
"""
ESPER Enterprise Ralph Loop Notification Service
Handles alerts and notifications across multiple channels
"""

import asyncio
import logging
import smtplib
import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import yaml
from pathlib import Path
import redis
from dataclasses import dataclass
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AlertSeverity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class NotificationChannel(Enum):
    EMAIL = "email"
    SLACK = "slack"
    PAGERDUTY = "pagerduty"
    WEBHOOK = "webhook"
    SMS = "sms"

@dataclass
class Alert:
    id: str
    title: str
    message: str
    severity: AlertSeverity
    channel: NotificationChannel
    timestamp: datetime
    resolved: bool = False
    acknowledged: bool = False
    assignee: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationService:
    """Main notification service for Ralph Loop"""
    
    def __init__(self, config_path: str = "/app/config/sub-agents-config.yml"):
        self.config = self._load_config(config_path)
        self.redis_client = None
        self.alert_queue = asyncio.Queue()
        self.alert_history = []
        self.notification_handlers = {}
        
        # Initialize notification handlers
        self._initialize_handlers()
    
    def _load_config(self, config_path: str) -> Dict:
        """Load configuration"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            return {}
    
    def _initialize_handlers(self):
        """Initialize notification handlers"""
        # Email handler
        if self.config.get('notification_settings', {}).get('email', {}).get('enabled', False):
            self.notification_handlers[NotificationChannel.EMAIL] = EmailHandler(
                self.config['notification_settings']['email']
            )
        
        # Slack handler
        if self.config.get('notification_settings', {}).get('slack', {}).get('enabled', False):
            self.notification_handlers[NotificationChannel.SLACK] = SlackHandler(
                self.config['notification_settings']['slack']
            )
        
        # PagerDuty handler
        if self.config.get('notification_settings', {}).get('pagerduty', {}).get('enabled', False):
            self.notification_handlers[NotificationChannel.PAGERDUTY] = PagerDutyHandler(
                self.config['notification_settings']['pagerduty']
            )
        
        # Webhook handler
        if self.config.get('notification_settings', {}).get('webhook', {}).get('enabled', False):
            self.notification_handlers[NotificationChannel.WEBHOOK] = WebhookHandler(
                self.config['notification_settings']['webhook']
            )
    
    async def initialize(self):
        """Initialize notification service"""
        logger.info("Initializing Notification Service")
        
        # Initialize Redis
        try:
            self.redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
            await asyncio.sleep(0.1)  # Give Redis time to connect
            logger.info("Connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
        
        # Start notification processor
        asyncio.create_task(self._process_notifications())
        
        logger.info("Notification Service initialized")
    
    async def send_alert(self, alert: Alert):
        """Send an alert"""
        logger.info(f"Sending alert: {alert.title} ({alert.severity.value})")
        
        # Add to queue for processing
        await self.alert_queue.put(alert)
        
        # Store in history
        self.alert_history.append(alert)
        
        # Keep only recent alerts
        if len(self.alert_history) > 1000:
            self.alert_history = self.alert_history[-1000:]
        
        # Store in Redis
        if self.redis_client:
            await self._store_alert_redis(alert)
    
    async def _process_notifications(self):
        """Process notifications from queue"""
        logger.info("Starting notification processor")
        
        while True:
            try:
                alert = await self.alert_queue.get()
                
                # Process alert based on severity
                await self._process_alert(alert)
                
                # Mark task as done
                self.alert_queue.task_done()
                
            except Exception as e:
                logger.error(f"Error processing notification: {e}")
                await asyncio.sleep(5)  # Wait before retrying
    
    async def _process_alert(self, alert: Alert):
        """Process a single alert"""
        # Determine which channels to use
        channels = self._determine_channels(alert)
        
        # Send to each channel
        for channel in channels:
            if channel in self.notification_handlers:
                try:
                    await self.notification_handlers[channel].send(alert)
                    logger.info(f"Alert sent via {channel.value}: {alert.title}")
                except Exception as e:
                    logger.error(f"Failed to send alert via {channel.value}: {e}")
    
    def _determine_channels(self, alert: Alert) -> List[NotificationChannel]:
        """Determine which channels to use for an alert"""
        channels = []
        
        # Default channels based on severity
        if alert.severity == AlertSeverity.CRITICAL:
            channels.extend([
                NotificationChannel.SLACK,
                NotificationChannel.PAGERDUTY,
                NotificationChannel.EMAIL
            ])
        elif alert.severity == AlertSeverity.HIGH:
            channels.extend([
                NotificationChannel.SLACK,
                NotificationChannel.EMAIL
            ])
        elif alert.severity == AlertSeverity.MEDIUM:
            channels.extend([
                NotificationChannel.SLACK,
                NotificationChannel.EMAIL
            ])
        elif alert.severity == AlertSeverity.LOW:
            channels.extend([
                NotificationChannel.EMAIL
            ])
        else:
            channels.extend([
                NotificationChannel.SLACK
            ])
        
        # Check if channel is enabled
        enabled_channels = []
        for channel in channels:
            if channel in self.notification_handlers:
                enabled_channels.append(channel)
        
        return enabled_channels
    
    async def _store_alert_redis(self, alert: Alert):
        """Store alert in Redis"""
        try:
            alert_key = f"alert:{alert.id}"
            alert_data = {
                'id': alert.id,
                'title': alert.title,
                'message': alert.message,
                'severity': alert.severity.value,
                'channel': alert.channel.value,
                'timestamp': alert.timestamp.isoformat(),
                'resolved': alert.resolved,
                'acknowledged': alert.acknowledged,
                'assignee': alert.assignee,
                'metadata': alert.metadata
            }
            
            await self.redis_client.hset(alert_key, mapping=alert_data)
            await self.redis_client.expire(alert_key, 86400 * 30)  # 30 days
            
        except Exception as e:
            logger.error(f"Failed to store alert in Redis: {e}")
    
    async def get_alert_history(self, limit: int = 100) -> List[Alert]:
        """Get alert history"""
        return self.alert_history[-limit:]
    
    async def get_active_alerts(self) -> List[Alert]:
        """Get active (unresolved) alerts"""
        return [alert for alert in self.alert_history if not alert.resolved]

class EmailHandler:
    """Email notification handler"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.smtp_server = config.get('smtp_server')
        self.smtp_port = config.get('smtp_port', 587)
        self.username = config.get('username')
        self.password = config.get('password')
        self.from_address = config.get('from_address')
        self.to_addresses = config.get('to_addresses', [])
    
    async def send(self, alert: Alert):
        """Send email notification"""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.from_address
            msg['To'] = ', '.join(self.to_addresses)
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            # Create email body
            body = self._create_email_body(alert)
            msg.attach(MIMEText(body, 'html'))
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.username, self.password)
                server.send_message(msg)
                
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            raise
    
    def _create_email_body(self, alert: Alert) -> str:
        """Create email body HTML"""
        severity_colors = {
            AlertSeverity.CRITICAL: '#dc3545',
            AlertSeverity.HIGH: '#fd7e14',
            AlertSeverity.MEDIUM: '#ffc107',
            AlertSeverity.LOW: '#28a745',
            AlertSeverity.INFO: '#17a2b8'
        }
        
        color = severity_colors.get(alert.severity, '#6c757d')
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto;">
                <div style="background-color: {color}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 18px;">{alert.title}</h2>
                    <p style="margin: 5px 0 0 0; font-size: 14px;">Severity: {alert.severity.value.upper()}</p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
                    <h3 style="color: {color}; margin-top: 0;">Alert Details</h3>
                    <p style="margin: 10px 0;"><strong>Message:</strong></p>
                    <p style="background-color: white; padding: 10px; border-radius: 3px; border-left: 4px solid {color};">{alert.message}</p>
                    
                    <p style="margin: 10px 0;"><strong>Timestamp:</strong> {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S')}</p>
                    <p style="margin: 10px 0;"><strong>Channel:</strong> {alert.channel.value}</p>
                </div>
                
                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; text-align: center;">
                    <p style="margin: 0; color: #6c757d; font-size: 12px;">
                        This is an automated notification from ESPER Enterprise Ralph Loop
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html

class SlackHandler:
    """Slack notification handler"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.webhook_url = config.get('webhook_url')
        self.channel = config.get('channel')
        self.username = config.get('username', 'Ralph Loop')
    
    async def send(self, alert: Alert):
        """Send Slack notification"""
        try:
            # Create Slack message
            message = {
                'channel': self.channel,
                'username': self.username,
                'icon_emoji': self._get_emoji(alert.severity),
                'attachments': [{
                    'color': self._get_color(alert.severity),
                    'title': alert.title,
                    'text': alert.message,
                    'fields': [
                        {
                            'title': 'Severity',
                            'value': alert.severity.value.upper(),
                            'short': True
                        },
                        {
                            'title': 'Timestamp',
                            'value': alert.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                            'short': True
                        }
                    ],
                    'footer': 'ESPER Enterprise Ralph Loop',
                    'ts': int(alert.timestamp.timestamp())
                }]
            }
            
            # Send message
            response = requests.post(
                self.webhook_url,
                json=message,
                timeout=30
            )
            
            if response.status_code != 200:
                raise Exception(f"Slack API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
            raise
    
    def _get_emoji(self, severity: AlertSeverity) -> str:
        """Get emoji for severity"""
        emoji_map = {
            AlertSeverity.CRITICAL: ':rotating_light:',
            AlertSeverity.HIGH: ':warning:',
            AlertSeverity.MEDIUM: ':large_yellow_circle:',
            AlertSeverity.LOW: ':large_green_circle:',
            AlertSeverity.INFO: ':information_source:'
        }
        return emoji_map.get(severity, ':question:')
    
    def _get_color(self, severity: AlertSeverity) -> str:
        """Get color for severity"""
        color_map = {
            AlertSeverity.CRITICAL: 'danger',
            AlertSeverity.HIGH: 'warning',
            AlertSeverity.MEDIUM: 'warning',
            AlertSeverity.LOW: 'good',
            AlertSeverity.INFO: '#36a64f'
        }
        return color_map.get(severity, '#36a64f')

class PagerDutyHandler:
    """PagerDuty notification handler"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.service_key = config.get('service_key')
        self.api_key = config.get('api_key')
        self.escalation_policy = config.get('escalation_policy')
    
    async def send(self, alert: Alert):
        """Send PagerDuty notification"""
        try:
            # Create PagerDuty event
            event = {
                'service_key': self.service_key,
                'event_type': 'trigger',
                'incident_key': f"ralph-alert-{alert.id}",
                'description': alert.title,
                'details': {
                    'message': alert.message,
                    'severity': alert.severity.value,
                    'timestamp': alert.timestamp.isoformat(),
                    'channel': alert.channel.value
                },
                'client': 'ESPER Enterprise Ralph Loop',
                'client_url': 'http://ralph-dashboard:8082'
            }
            
            # Send event
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f"Token {self.api_key}"
            }
            
            response = requests.post(
                'https://events.pagerduty.com/v2/enqueue',
                json=event,
                headers=headers,
                timeout=30
            )
            
            if response.status_code != 202:
                raise Exception(f"PagerDuty API error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send PagerDuty notification: {e}")
            raise

class WebhookHandler:
    """Webhook notification handler"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.webhook_url = config.get('webhook_url')
        self.headers = config.get('headers', {})
        self.timeout = config.get('timeout', 30)
    
    async def send(self, alert: Alert):
        """Send webhook notification"""
        try:
            # Create webhook payload
            payload = {
                'alert_id': alert.id,
                'title': alert.title,
                'message': alert.message,
                'severity': alert.severity.value,
                'channel': alert.channel.value,
                'timestamp': alert.timestamp.isoformat(),
                'metadata': alert.metadata
            }
            
            # Send webhook
            response = requests.post(
                self.webhook_url,
                json=payload,
                headers=self.headers,
                timeout=self.timeout
            )
            
            if response.status_code != 200:
                raise Exception(f"Webhook error: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send webhook notification: {e}")
            raise

# Main execution
async def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(description='ESPER Enterprise Ralph Loop Notification Service')
    parser.add_argument('--config', default='/app/config/sub-agents-config.yml',
                       help='Path to notification service configuration')
    
    args = parser.parse_args()
    
    # Initialize notification service
    service = NotificationService(args.config)
    await service.initialize()
    
    # Start the service
    logger.info("Notification Service started")
    
    # Keep the service running
    try:
        while True:
            await asyncio.sleep(60)
    except KeyboardInterrupt:
        logger.info("Notification Service stopped")

if __name__ == "__main__":
    asyncio.run(main())