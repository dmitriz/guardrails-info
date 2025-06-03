# Integration Examples
## Real-World Implementation Patterns

**Last Updated:** June 4, 2025

---

## 🏗️ Architecture Patterns

### 1. Express.js + REST API

#### Complete Implementation
```javascript
// server.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { analyzeInput } = require('./security/prompt-injection');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Rate limiting for security
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Security middleware
async function securityGuard(req, res, next) {
  try {
    const userInput = req.body.message || req.body.input;
    
    if (!userInput) return next();
    
    const analysis = await analyzeInput(userInput, {
      userRole: req.user?.role || 'anonymous',
      applicationDomain: 'chat_api'
    });
    
    // Log security events
    if (analysis.risk !== 'LOW') {
      console.log(`[SECURITY] ${analysis.risk} risk detected`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        input: userInput.substring(0, 100),
        patterns: analysis.detectedPatterns,
        timestamp: new Date().toISOString()
      });
    }
    
    // Block high-risk inputs
    if (analysis.risk === 'HIGH') {
      return res.status(400).json({
        error: 'Input rejected for security reasons',
        code: 'SECURITY_VIOLATION',
        details: {
          risk: analysis.risk,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning
        }
      });
    }
    
    req.securityAnalysis = analysis;
    next();
    
  } catch (error) {
    console.error('[SECURITY] Analysis failed:', error);
    // Fail-safe: continue but log error
    req.securityAnalysis = { risk: 'ERROR', confidence: 0 };
    next();
  }
}

// Apply security to all routes
app.use('/api', securityGuard);

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  const security = req.securityAnalysis;
  
  try {
    // Your AI processing here
    const aiResponse = await processWithAI(message);
    
    res.json({
      response: aiResponse,
      metadata: {
        security: {
          risk: security.risk,
          confidence: security.confidence,
          processingTime: security.processingTime
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[AI] Processing failed:', error);
    res.status(500).json({ error: 'AI processing failed' });
  }
});

// Health check with security stats
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    security: 'active',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🛡️ Security guardrails active`);
});

async function processWithAI(message) {
  // Your AI integration (OpenAI, Anthropic, etc.)
  return "AI response based on secure input processing";
}
```

---

### 2. Next.js API Routes

#### API Route Implementation
```javascript
// pages/api/chat.js (or app/api/chat/route.js for App Router)
import { analyzeInput } from '../../lib/security/prompt-injection';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { message, context } = await request.json();
    
    // Security analysis
    const security = await analyzeInput(message, {
      ...context,
      applicationDomain: 'nextjs_chat'
    });
    
    // Handle security threats
    if (security.risk === 'HIGH') {
      return NextResponse.json(
        {
          error: 'Message rejected for security reasons',
          security: {
            risk: security.risk,
            reasoning: security.reasoning
          }
        },
        { status: 400 }
      );
    }
    
    // Log medium risks for monitoring
    if (security.risk === 'MEDIUM') {
      console.warn('[SECURITY] Medium risk detected:', {
        message: message.substring(0, 50),
        patterns: security.detectedPatterns,
        confidence: security.confidence
      });
    }
    
    // Process with AI (your implementation)
    const aiResponse = await generateAIResponse(message);
    
    return NextResponse.json({
      response: aiResponse,
      metadata: {
        security: security,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateAIResponse(message) {
  // Your AI service integration
  return "Secure AI response";
}
```

#### Client-Side Integration
```typescript
// lib/api.ts
interface ChatResponse {
  response: string;
  metadata: {
    security: {
      risk: 'LOW' | 'MEDIUM' | 'HIGH';
      confidence: number;
      processingTime: number;
    };
    timestamp: string;
  };
}

export async function sendMessage(message: string): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      message,
      context: {
        userRole: 'user',
        conversationId: 'session-123'
      }
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    if (error.security) {
      throw new SecurityError(error.error, error.security);
    }
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}

class SecurityError extends Error {
  constructor(message: string, public security: any) {
    super(message);
    this.name = 'SecurityError';
  }
}
```

---

### 3. WebSocket Real-time Chat

#### WebSocket Server with Security
```javascript
// websocket-server.js
const WebSocket = require('ws');
const { analyzeInput } = require('./security/prompt-injection');

class SecureWebSocketServer {
  constructor(port = 8080) {
    this.wss = new WebSocket.Server({ port });
    this.clients = new Map(); // Track client sessions
    
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
    
    console.log(`🔌 WebSocket server running on port ${port}`);
    console.log(`🛡️ Real-time security active`);
  }
  
  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    
    this.clients.set(clientId, {
      ws,
      ip: req.socket.remoteAddress,
      connectedAt: new Date(),
      messageCount: 0,
      threatCount: 0
    });
    
    console.log(`[CLIENT] ${clientId} connected from ${req.socket.remoteAddress}`);
    
    ws.on('message', async (data) => {
      await this.handleMessage(clientId, data);
    });
    
    ws.on('close', () => {
      this.clients.delete(clientId);
      console.log(`[CLIENT] ${clientId} disconnected`);
    });
  }
  
  async handleMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    try {
      const message = JSON.parse(data.toString());
      client.messageCount++;
      
      // Security analysis
      const security = await analyzeInput(message.content, {
        clientId,
        messageCount: client.messageCount,
        applicationDomain: 'websocket_chat'
      });
      
      // Track threats per client
      if (security.risk !== 'LOW') {
        client.threatCount++;
        
        console.log(`[SECURITY] ${security.risk} risk from ${clientId}`, {
          message: message.content.substring(0, 50),
          patterns: security.detectedPatterns,
          threatCount: client.threatCount
        });
      }
      
      // Disconnect clients with too many threats
      if (client.threatCount >= 5) {
        console.log(`[SECURITY] Disconnecting ${clientId} for repeated violations`);
        client.ws.close(1008, 'Too many security violations');
        return;
      }
      
      // Block high-risk messages
      if (security.risk === 'HIGH') {
        client.ws.send(JSON.stringify({
          type: 'security_block',
          error: 'Message blocked for security reasons',
          risk: security.risk,
          reasoning: security.reasoning
        }));
        return;
      }
      
      // Process safe messages
      const response = await this.processMessage(message.content);
      
      client.ws.send(JSON.stringify({
        type: 'message_response',
        response,
        security: {
          risk: security.risk,
          confidence: security.confidence
        },
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error(`[ERROR] Processing message from ${clientId}:`, error);
      client.ws.send(JSON.stringify({
        type: 'error',
        message: 'Message processing failed'
      }));
    }
  }
  
  async processMessage(content) {
    // Your AI processing logic
    return "AI response to: " + content;
  }
  
  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Get server statistics
  getStats() {
    const clients = Array.from(this.clients.values());
    return {
      connectedClients: clients.length,
      totalMessages: clients.reduce((sum, c) => sum + c.messageCount, 0),
      totalThreats: clients.reduce((sum, c) => sum + c.threatCount, 0),
      avgMessagesPerClient: clients.length > 0 
        ? Math.round(clients.reduce((sum, c) => sum + c.messageCount, 0) / clients.length)
        : 0
    };
  }
}

// Start server
const server = new SecureWebSocketServer(8080);

// Log stats every 5 minutes
setInterval(() => {
  console.log('[STATS]', server.getStats());
}, 5 * 60 * 1000);
```

---

### 4. React Component Integration

#### Chat Component with Security
```tsx
// components/SecureChat.tsx
import React, { useState, useEffect } from 'react';
import { sendMessage } from '../lib/api';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  security?: {
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    confidence: number;
  };
}

export const SecureChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [securityAlert, setSecurityAlert] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setSecurityAlert(null);
    
    try {
      const response = await sendMessage(input);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response,
        sender: 'ai',
        timestamp: new Date(response.metadata.timestamp),
        security: response.metadata.security
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Show security alert for medium/high risk
      if (response.metadata.security.risk !== 'LOW') {
        setSecurityAlert(
          `Security Notice: ${response.metadata.security.risk} risk input detected`
        );
      }
      
    } catch (error) {
      if (error instanceof SecurityError) {
        setSecurityAlert(error.message);
      } else {
        console.error('Chat error:', error);
        // Add error message
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: 'Sorry, I encountered an error processing your message.',
          sender: 'ai',
          timestamp: new Date()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="chat-container">
      {/* Security Alert */}
      {securityAlert && (
        <div className="security-alert">
          ⚠️ {securityAlert}
          <button onClick={() => setSecurityAlert(null)}>×</button>
        </div>
      )}
      
      {/* Messages */}
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="content">{message.content}</div>
            <div className="metadata">
              <span className="timestamp">
                {message.timestamp.toLocaleTimeString()}
              </span>
              {message.security && message.security.risk !== 'LOW' && (
                <span className={`security-badge ${message.security.risk}`}>
                  {message.security.risk} ({Math.round(message.security.confidence * 100)}%)
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          maxLength={1000}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

// CSS styles
const styles = `
.chat-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.security-alert {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.messages {
  height: 400px;
  overflow-y: auto;
  border: 1px solid #ddd;
  padding: 10px;
  margin-bottom: 20px;
}

.message {
  margin-bottom: 15px;
  padding: 10px;
  border-radius: 8px;
}

.message.user {
  background: #007bff;
  color: white;
  margin-left: 20%;
}

.message.ai {
  background: #f8f9fa;
  margin-right: 20%;
}

.metadata {
  font-size: 0.8em;
  margin-top: 5px;
  opacity: 0.7;
}

.security-badge {
  margin-left: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
}

.security-badge.MEDIUM {
  background: #ffeaa7;
  color: #856404;
}

.security-badge.HIGH {
  background: #fab1a0;
  color: #d63031;
}

.input-form {
  display: flex;
  gap: 10px;
}

.input-form input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.input-form button {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.input-form button:disabled {
  background: #6c757d;
  cursor: not-allowed;
}
`;
```

---

### 5. Python Flask Integration

#### Flask App with Security
```python
# app.py
from flask import Flask, request, jsonify
import subprocess
import json
import time

app = Flask(__name__)

class SecurityAnalyzer:
    def __init__(self):
        # Path to the JavaScript security module
        self.js_analyzer = 'src/security/analyzer.js'
    
    def analyze_input(self, user_input, context=None):
        """Analyze input using the JavaScript module via subprocess"""
        try:
            # Prepare data for analysis
            data = {
                'input': user_input,
                'context': context or {},
                'timestamp': time.time()
            }
            
            # Call JavaScript analyzer
            result = subprocess.run([
                'node', '-e',
                f'''
                const {{ analyzeInput }} = require('./{self.js_analyzer}');
                const data = {json.dumps(data)};
                analyzeInput(data.input, data.context)
                  .then(result => console.log(JSON.stringify(result)))
                  .catch(error => console.log(JSON.stringify({{
                    risk: 'ERROR',
                    confidence: 0,
                    error: error.message
                  }})));
                '''
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                return json.loads(result.stdout.strip())
            else:
                return {
                    'risk': 'ERROR',
                    'confidence': 0,
                    'error': 'Analysis failed'
                }
                
        except Exception as e:
            return {
                'risk': 'ERROR',
                'confidence': 0,
                'error': str(e)
            }

# Initialize security analyzer
security = SecurityAnalyzer()

@app.before_request
def security_middleware():
    """Apply security analysis to all POST requests"""
    if request.method == 'POST' and request.is_json:
        data = request.get_json()
        user_input = data.get('message') or data.get('input')
        
        if user_input:
            # Analyze for security threats
            analysis = security.analyze_input(
                user_input,
                {
                    'ip': request.remote_addr,
                    'user_agent': request.user_agent.string,
                    'endpoint': request.endpoint
                }
            )
            
            # Store analysis in request context
            request.security_analysis = analysis
            
            # Block high-risk inputs
            if analysis['risk'] == 'HIGH':
                return jsonify({
                    'error': 'Input rejected for security reasons',
                    'security': {
                        'risk': analysis['risk'],
                        'confidence': analysis['confidence'],
                        'reasoning': analysis.get('reasoning', [])
                    }
                }), 400

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        
        # Get security analysis from middleware
        security_analysis = getattr(request, 'security_analysis', {
            'risk': 'UNKNOWN',
            'confidence': 0
        })
        
        # Log security events
        if security_analysis['risk'] != 'LOW':
            app.logger.warning(f"Security alert: {security_analysis['risk']} risk detected", 
                             extra={
                                 'message': message[:100],
                                 'analysis': security_analysis,
                                 'ip': request.remote_addr
                             })
        
        # Process with AI (your implementation)
        ai_response = process_with_ai(message)
        
        return jsonify({
            'response': ai_response,
            'metadata': {
                'security': security_analysis,
                'timestamp': time.time()
            }
        })
        
    except Exception as e:
        app.logger.error(f"Chat processing error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def process_with_ai(message):
    """Your AI processing logic"""
    return f"AI response to: {message}"

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'security': 'active',
        'timestamp': time.time()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

#### JavaScript Security Module for Python
```javascript
// src/security/analyzer.js - Bridge for Python integration
const { analyzeInput } = require('./prompt-injection');

// Command-line interface for Python integration
if (require.main === module) {
  const args = process.argv.slice(2);
  const input = args[0];
  const context = args[1] ? JSON.parse(args[1]) : {};
  
  analyzeInput(input, context)
    .then(result => {
      console.log(JSON.stringify(result));
      process.exit(0);
    })
    .catch(error => {
      console.log(JSON.stringify({
        risk: 'ERROR',
        confidence: 0,
        error: error.message
      }));
      process.exit(1);
    });
}

module.exports = { analyzeInput };
```

---

## 🔧 Configuration Examples

### Environment-Specific Configs

#### Development Configuration
```javascript
// config/security.dev.js
module.exports = {
  security: {
    sensitivityLevel: 'medium',
    performanceMode: 'thorough',
    enableCaching: true,
    logLevel: 'debug',
    blockOnHigh: false, // Allow high-risk for testing
    includeEvidence: true
  },
  monitoring: {
    enableStats: true,
    logInterval: 30000, // 30 seconds
    includePatterns: true
  }
};
```

#### Production Configuration
```javascript
// config/security.prod.js
module.exports = {
  security: {
    sensitivityLevel: 'high',
    performanceMode: 'fast',
    enableCaching: true,
    logLevel: 'warn',
    blockOnHigh: true,
    includeEvidence: false // Reduce response size
  },
  monitoring: {
    enableStats: true,
    logInterval: 300000, // 5 minutes
    includePatterns: false,
    alertThreshold: 0.05 // Alert if >5% threat rate
  }
};
```

---

## 📊 Monitoring & Analytics

### Complete Monitoring Setup
```javascript
// monitoring/security-monitor.js
const { analyzeInput } = require('../security/prompt-injection');

class SecurityMonitor {
  constructor(options = {}) {
    this.stats = {
      requests: 0,
      threats: 0,
      patterns: {},
      latencies: [],
      errors: 0
    };
    
    this.options = {
      logInterval: options.logInterval || 60000,
      alertThreshold: options.alertThreshold || 0.1,
      maxLatencyHistory: options.maxLatencyHistory || 1000,
      ...options
    };
    
    // Start periodic logging
    this.startMonitoring();
  }
  
  async analyze(input, context = {}) {
    const start = Date.now();
    this.stats.requests++;
    
    try {
      const result = await analyzeInput(input, context);
      const latency = Date.now() - start;
      
      this.updateStats(result, latency);
      return result;
      
    } catch (error) {
      this.stats.errors++;
      throw error;
    }
  }
  
  updateStats(result, latency) {
    // Track latency
    this.stats.latencies.push(latency);
    if (this.stats.latencies.length > this.options.maxLatencyHistory) {
      this.stats.latencies.shift();
    }
    
    // Track threats
    if (result.risk !== 'LOW') {
      this.stats.threats++;
      
      // Track patterns
      result.detectedPatterns?.forEach(pattern => {
        this.stats.patterns[pattern.name] = 
          (this.stats.patterns[pattern.name] || 0) + 1;
      });
    }
  }
  
  getMetrics() {
    const latencies = this.stats.latencies;
    const threatRate = this.stats.requests > 0 
      ? this.stats.threats / this.stats.requests 
      : 0;
    
    return {
      requests: this.stats.requests,
      threats: this.stats.threats,
      threatRate: Math.round(threatRate * 10000) / 100, // Percentage
      errors: this.stats.errors,
      performance: {
        avgLatency: latencies.length > 0 
          ? Math.round(latencies.reduce((a, b) => a + b) / latencies.length)
          : 0,
        p95Latency: latencies.length > 0 
          ? this.percentile(latencies, 0.95)
          : 0,
        maxLatency: latencies.length > 0 
          ? Math.max(...latencies)
          : 0
      },
      topPatterns: Object.entries(this.stats.patterns)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    };
  }
  
  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * p);
    return sorted[index] || 0;
  }
  
  startMonitoring() {
    setInterval(() => {
      const metrics = this.getMetrics();
      
      console.log(`[SECURITY METRICS]`, {
        timestamp: new Date().toISOString(),
        ...metrics
      });
      
      // Alert on high threat rate
      if (metrics.threatRate > this.options.alertThreshold * 100) {
        console.error(`[SECURITY ALERT] High threat rate: ${metrics.threatRate}%`);
      }
      
      // Alert on high latency
      if (metrics.performance.p95Latency > 100) {
        console.warn(`[PERFORMANCE ALERT] High latency: ${metrics.performance.p95Latency}ms`);
      }
      
    }, this.options.logInterval);
  }
}

module.exports = { SecurityMonitor };
```

---

**🚀 Ready for Production!** These examples provide comprehensive, production-ready implementations for any technology stack.

**Next:** See [API Documentation](API_DOCUMENTATION.md) for detailed function reference.
