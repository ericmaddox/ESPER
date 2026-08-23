#!/usr/bin/env python3
"""
ESPER Enterprise Ralph Loop Dashboard
Web dashboard for monitoring and managing Ralph Loop automation
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
from pathlib import Path
import yaml
import aiohttp
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import pandas as pd
import dash
from dash import dcc, html, Input, Output, State
import dash_bootstrap_components as dbc
import redis
import kubernetes.client
from kubernetes import config

# Initialize Dash app
app = dash.Dash(__name__, external_stylesheets=[dbc.themes.DARKLY])
app.title = "ESPER Enterprise Ralph Loop Dashboard"

# Global variables
redis_client = None
k8s_client = None
api_base_url = "http://ralph-api:8081"

# Initialize connections
async def initialize_connections():
    """Initialize Redis and Kubernetes connections"""
    global redis_client, k8s_client
    
    # Initialize Redis
    try:
        redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)
        await asyncio.sleep(0.1)  # Give Redis time to connect
    except Exception as e:
        logging.error(f"Failed to connect to Redis: {e}")
    
    # Initialize Kubernetes
    try:
        config.load_incluster_config()  # For running in cluster
        k8s_client = kubernetes.client.CoreV1Api()
    except Exception as e:
        logging.error(f"Failed to connect to Kubernetes: {e}")

# Layout components
def create_header():
    """Create dashboard header"""
    return dbc.Navbar(
        dbc.Container([
            dbc.NavbarBrand("ESPER Enterprise Ralph Loop", className="text-white"),
            dbc.NavbarToggler(id="navbar-toggler", n_clicks=0),
            dbc.Collapse(
                dbc.Nav([
                    dbc.NavItem(dbc.NavLink("Overview", href="#", active=True)),
                    dbc.NavItem(dbc.NavLink("Tasks", href="#")),
                    dbc.NavItem(dbc.NavLink("Health", href="#")),
                    dbc.NavItem(dbc.NavLink("Performance", href="#")),
                    dbc.NavItem(dbc.NavLink("Security", href="#")),
                    dbc.NavItem(dbc.NavLink("Database", href="#")),
                ], navbar=True, pills=True),
                id="navbar-collapse",
                is_open=False,
                navbar=True,
            ),
        ]),
        color="dark",
        dark=True,
        sticky="top",
    )

def create_overview_cards():
    """Create overview dashboard cards"""
    return dbc.Row([
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H4("System Status", className="card-title"),
                html.H2("Healthy", className="text-success"),
                html.P("All systems operational", className="card-text")
            ])
        ], color="dark", inverse=True), width=3),
        
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H4("Active Tasks", className="card-title"),
                html.H2("12", className="text-primary"),
                html.P("Running and pending tasks", className="card-text")
            ])
        ], color="dark", inverse=True), width=3),
        
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H4("Alerts", className="card-title"),
                html.H2("3", className="text-warning"),
                html.P("2 warnings, 1 info", className="card-text")
            ])
        ], color="dark", inverse=True), width=3),
        
        dbc.Col(dbc.Card([
            dbc.CardBody([
                html.H4("Last Run", className="card-title"),
                html.H2("2m ago", className="text-info"),
                html.P("Master orchestrator last run", className="card-text")
            ])
        ], color="dark", inverse=True), width=3),
    ], className="mb-4")

def create_task_table():
    """Create task monitoring table"""
    return dbc.Card([
        dbc.CardHeader([
            html.H5("Task Queue", className="card-title"),
            html.P("Current task status and execution", className="card-text")
        ]),
        dbc.CardBody([
            dash.datatable.DataTable(
                id='task-table',
                columns=[
                    {'name': 'Task ID', 'id': 'task_id'},
                    {'name': 'Name', 'id': 'name'},
                    {'name': 'Worker', 'id': 'worker'},
                    {'name': 'Status', 'id': 'status'},
                    {'name': 'Priority', 'id': 'priority'},
                    {'name': 'Started', 'id': 'started'},
                    {'name': 'Duration', 'id': 'duration'},
                ],
                data=[],
                page_size=10,
                style_table={'overflowX': 'auto'},
                style_cell={'textAlign': 'left', 'color': 'white'},
                style_header={'backgroundColor': 'rgb(30, 30, 30)', 'color': 'white'},
                style_data_conditional=[
                    {
                        'if': {'filter_query': '{status} = completed'},
                        'backgroundColor': '#28a745',
                    },
                    {
                        'if': {'filter_query': '{status} = failed'},
                        'backgroundColor': '#dc3545',
                    },
                    {
                        'if': {'filter_query': '{status} = running'},
                        'backgroundColor': '#007bff',
                    },
                    {
                        'if': {'filter_query': '{status} = pending'},
                        'backgroundColor': '#6c757d',
                    }
                ]
            )
        ])
    ], color="dark", inverse=True)

def create_health_dashboard():
    """Create health monitoring dashboard"""
    return dbc.Card([
        dbc.CardHeader([
            html.H5("System Health", className="card-title"),
            html.P("Real-time system health monitoring", className="card-text")
        ]),
        dbc.CardBody([
            dcc.Graph(id='health-chart'),
            html.Hr(),
            dcc.Graph(id='service-health-chart')
        ])
    ], color="dark", inverse=True)

def create_performance_dashboard():
    """Create performance monitoring dashboard"""
    return dbc.Card([
        dbc.CardHeader([
            html.H5("Performance Metrics", className="card-title"),
            html.P("System performance and optimization metrics", className="card-text")
        ]),
        dbc.CardBody([
            dcc.Graph(id='performance-chart'),
            html.Hr(),
            dcc.Graph(id='resource-chart')
        ])
    ], color="dark", inverse=True)

def create_security_dashboard():
    """Create security monitoring dashboard"""
    return dbc.Card([
        dbc.CardHeader([
            html.H5("Security Status", className="card-title"),
            html.P("Security scan results and vulnerabilities", className="card-text")
        ]),
        dbc.CardBody([
            dcc.Graph(id='security-chart'),
            html.Hr(),
            html.Div(id='security-alerts')
        ])
    ], color="dark", inverse=True)

def create_database_dashboard():
    """Create database monitoring dashboard"""
    return dbc.Card([
        dbc.CardHeader([
            html.H5("Database Status", className="card-title"),
            html.P("Database health and maintenance status", className="card-text")
        ]),
        dbc.CardBody([
            dcc.Graph(id='database-chart'),
            html.Hr(),
            html.Div(id='database-status')
        ])
    ], color="dark", inverse=True)

# Main layout
def create_layout():
    """Create main dashboard layout"""
    return dbc.Container([
        create_header(),
        create_overview_cards(),
        
        dbc.Tabs([
            dbc.Tab(label="Overview", children=[
                create_overview_cards(),
                dbc.Row([
                    dbc.Col(create_health_dashboard(), width=6),
                    dbc.Col(create_performance_dashboard(), width=6),
                ]),
                dbc.Row([
                    dbc.Col(create_security_dashboard(), width=6),
                    dbc.Col(create_database_dashboard(), width=6),
                ]),
            ]),
            
            dbc.Tab(label="Tasks", children=[
                create_task_table(),
                dbc.Row([
                    dbc.Col(dbc.Card([
                        dbc.CardBody([
                            html.H5("Task Statistics", className="card-title"),
                            dcc.Graph(id='task-stats-chart')
                        ])
                    ], color="dark", inverse=True), width=6),
                    dbc.Col(dbc.Card([
                        dbc.CardBody([
                            html.H5("Task Timeline", className="card-title"),
                            dcc.Graph(id='task-timeline-chart')
                        ])
                    ], color="dark", inverse=True), width=6),
                ])
            ]),
            
            dbc.Tab(label="Health", children=[
                create_health_dashboard()
            ]),
            
            dbc.Tab(label="Performance", children=[
                create_performance_dashboard()
            ]),
            
            dbc.Tab(label="Security", children=[
                create_security_dashboard()
            ]),
            
            dbc.Tab(label="Database", children=[
                create_database_dashboard()
            ]),
        ], active_tab="overview", id="tabs"),
        
        # Auto-refresh interval
        dcc.Interval(
            id='interval-component',
            interval=30*1000,  # 30 seconds
            n_intervals=0
        )
    ], fluid=True)

# Callbacks
@app.callback(
    [Output('task-table', 'data'),
     Output('health-chart', 'figure'),
     Output('performance-chart', 'figure'),
     Output('security-chart', 'figure'),
     Output('database-chart', 'figure')],
    [Input('interval-component', 'n_intervals')]
)
async def update_dashboard(n):
    """Update dashboard data"""
    try:
        # Get task data
        tasks_data = await get_tasks_data()
        
        # Get health data
        health_data = await get_health_data()
        
        # Get performance data
        performance_data = await get_performance_data()
        
        # Get security data
        security_data = await get_security_data()
        
        # Get database data
        database_data = await get_database_data()
        
        return (
            tasks_data,
            create_health_chart(health_data),
            create_performance_chart(performance_data),
            create_security_chart(security_data),
            create_database_chart(database_data)
        )
    except Exception as e:
        logging.error(f"Error updating dashboard: {e}")
        return [], {}, {}, {}, {}

async def get_tasks_data():
    """Get task data from API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_base_url}/tasks") as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('tasks', [])
                else:
                    return []
    except Exception as e:
        logging.error(f"Error getting tasks data: {e}")
        return []

async def get_health_data():
    """Get health data from API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_base_url}/health/check") as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    return {}
    except Exception as e:
        logging.error(f"Error getting health data: {e}")
        return {}

async def get_performance_data():
    """Get performance data from API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_base_url}/performance/metrics") as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    return {}
    except Exception as e:
        logging.error(f"Error getting performance data: {e}")
        return {}

async def get_security_data():
    """Get security data from API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_base_url}/security/vulnerabilities") as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    return {}
    except Exception as e:
        logging.error(f"Error getting security data: {e}")
        return {}

async def get_database_data():
    """Get database data from API"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{api_base_url}/database/backup") as response:
                if response.status == 200:
                    data = await response.json()
                    return data
                else:
                    return {}
    except Exception as e:
        logging.error(f"Error getting database data: {e}")
        return {}

def create_health_chart(data):
    """Create health monitoring chart"""
    if not data:
        return go.Figure()
    
    # Create gauge chart for overall health
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=100 if data.get('overall_status') == 'healthy' else 50,
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': "System Health"},
        delta={'reference': 100},
        gauge={
            'axis': {'range': [None, 100]},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [0, 50], 'color': "lightgray"},
                {'range': [50, 80], 'color': "gray"},
                {'range': [80, 100], 'color': "lightgreen"}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 90
            }
        }
    ))
    
    return fig

def create_performance_chart(data):
    """Create performance monitoring chart"""
    if not data:
        return go.Figure()
    
    # Create line chart for performance metrics
    df = pd.DataFrame({
        'timestamp': pd.date_range(start='2024-01-01', periods=24, freq='H'),
        'cpu': [45, 52, 48, 55, 62, 58, 65, 70, 68, 72, 75, 78, 80, 82, 85, 83, 80, 78, 75, 72, 68, 65, 60, 55],
        'memory': [60, 62, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90, 92, 95, 93, 90, 88, 85, 82, 80, 78, 75, 72],
        'response_time': [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.1, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    })
    
    fig = make_subplots(
        rows=3, cols=1,
        subplot_titles=('CPU Usage', 'Memory Usage', 'Response Time'),
        vertical_spacing=0.1
    )
    
    fig.add_trace(
        go.Scatter(x=df['timestamp'], y=df['cpu'], name='CPU %'),
        row=1, col=1
    )
    
    fig.add_trace(
        go.Scatter(x=df['timestamp'], y=df['memory'], name='Memory %'),
        row=2, col=1
    )
    
    fig.add_trace(
        go.Scatter(x=df['timestamp'], y=df['response_time'], name='Response Time (s)'),
        row=3, col=1
    )
    
    fig.update_layout(height=600, showlegend=False)
    
    return fig

def create_security_chart(data):
    """Create security monitoring chart"""
    if not data:
        return go.Figure()
    
    # Create pie chart for vulnerability distribution
    fig = go.Figure(data=[
        go.Pie(
            labels=['Critical', 'High', 'Medium', 'Low', 'None'],
            values=[1, 3, 7, 12, 100],
            hole=0.3
        )
    ])
    
    fig.update_layout(
        title="Vulnerability Distribution",
        showlegend=True
    )
    
    return fig

def create_database_chart(data):
    """Create database monitoring chart"""
    if not data:
        return go.Figure()
    
    # Create gauge chart for database health
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=95,
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': "Database Health"},
        delta={'reference': 100},
        gauge={
            'axis': {'range': [None, 100]},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [0, 70], 'color': "lightgray"},
                {'range': [70, 90], 'color': "gray"},
                {'range': [90, 100], 'color': "lightgreen"}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': 85
            }
        }
    ))
    
    return fig

# Main execution
async def main():
    """Main execution function"""
    await initialize_connections()
    
    # Set up the app layout
    app.layout = create_layout()
    
    # Run the app
    app.run_server(host="0.0.0.0", port=8082, debug=False)

if __name__ == "__main__":
    asyncio.run(main())