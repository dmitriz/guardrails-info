/**
 * Advanced Prompt Injection Detection System - Functional Design
 * Based on 2025 AI security research and production patterns
 */

const crypto = require('crypto');

// Default configuration
const DEFAULT_CONFIG = {
  sensitivityLevel: 'medium',
  enablePatternMatching: true,
  enableSemanticAnalysis: true,
  enableAuditLogging: true,
  enableCaching: true,
  auditLogger: null
};

// Global cache for analysis results
const analysisCache = new Map();

// Create detector configuration
function createDetectorConfig(userConfig = {}) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    auditLogger: userConfig.auditLogger || defaultAuditLogger
  };
}

// Main analysis function
async function analyzeInput(input, context = {}, config = DEFAULT_CONFIG) {
  const startTime = Date.now();
  
  try {
    const analysis = {
      risk: 'LOW',
      confidence: 0,
      detectedPatterns: [],
      suspiciousElements: [],
      reasoning: [],
      processingTime: 0
    };

    // Check cache
    const cacheKey = getCacheKey(input, context);
    if (config.enableCaching && analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey);
    }

    // 1. Pattern-based detection
    if (config.enablePatternMatching) {
      const patternResults = detectPatterns(input);
      analysis.detectedPatterns = patternResults.patterns;
      analysis.suspiciousElements.push(...patternResults.elements);
      
      if (patternResults.riskLevel > 0.7) {
        analysis.risk = 'HIGH';
        analysis.confidence = Math.max(analysis.confidence, patternResults.riskLevel);
        analysis.reasoning.push('High-risk injection patterns detected');
      }
    }

    // 2. Instruction override detection
    const instructionResults = detectInstructionOverrides(input);
    if (instructionResults.detected) {
      analysis.risk = analysis.risk === 'LOW' ? 'MEDIUM' : 'HIGH';
      analysis.confidence = Math.max(analysis.confidence, instructionResults.confidence);
      analysis.reasoning.push('Potential instruction override detected');
      analysis.suspiciousElements.push(...instructionResults.elements);
    }

    // 3. Role confusion detection
    const roleResults = detectRoleConfusion(input);
    if (roleResults.detected) {
      analysis.risk = analysis.risk === 'LOW' ? 'MEDIUM' : analysis.risk;
      analysis.confidence = Math.max(analysis.confidence, roleResults.confidence);
      analysis.reasoning.push('Role confusion attempt detected');
    }

    // 4. Context pollution check
    const contextResults = detectContextPollution(input, context);
    if (contextResults.detected) {
      analysis.risk = analysis.risk === 'LOW' ? 'MEDIUM' : analysis.risk;
      analysis.confidence = Math.max(analysis.confidence, contextResults.confidence);
      analysis.reasoning.push('Context manipulation detected');
    }

    // 5. Encoding/obfuscation detection
    const encodingResults = detectEncodingAttempts(input);
    if (encodingResults.detected) {
      analysis.risk = 'HIGH';
      analysis.confidence = Math.max(analysis.confidence, encodingResults.confidence);
      analysis.reasoning.push('Obfuscation/encoding attempt detected');
    }

    // 6. Semantic analysis
    if (config.enableSemanticAnalysis) {
      const semanticResults = await performSemanticAnalysis(input);
      if (semanticResults.risk !== 'LOW') {
        analysis.risk = semanticResults.risk;
        analysis.confidence = Math.max(analysis.confidence, semanticResults.confidence);
        analysis.reasoning.push('Semantic analysis detected threats');
      }
    }

    // Log analysis
    if (config.enableAuditLogging && config.auditLogger) {
      config.auditLogger({
        input,
        context,
        analysis,
        timestamp: new Date().toISOString()
      });
    }

    // Cache result
    if (config.enableCaching) {
      analysisCache.set(cacheKey, analysis);
    }

    analysis.processingTime = Date.now() - startTime;
    return analysis;

  } catch (error) {
    return {
      risk: 'ERROR',
      confidence: 0,
      error: error.message,
      processingTime: Date.now() - startTime
    };
  }
}

// Pattern detection functions
function detectPatterns(input) {
  const inputLower = input.toLowerCase();
  const detectedPatterns = [];
  const suspiciousElements = [];
  let maxRisk = 0;

  const injectionPatterns = getInjectionPatterns();

  for (const pattern of injectionPatterns) {
    if (pattern.regex.test(inputLower)) {
      detectedPatterns.push({
        name: pattern.name,
        risk: pattern.risk,
        matched: pattern.regex.exec(inputLower)?.[0]
      });
      maxRisk = Math.max(maxRisk, pattern.risk);
      suspiciousElements.push(pattern.name);
    }
  }

  return {
    patterns: detectedPatterns,
    elements: suspiciousElements,
    riskLevel: maxRisk
  };
}

function detectInstructionOverrides(input) {
  const overrideIndicators = [
    'ignore previous instructions',
    'disregard above',
    'new instructions',
    'override system',
    'forget everything',
    'new role',
    'act as',
    'pretend to be',
    'you are now',
    'instead of',
    'don\'t follow'
  ];

  const detected = overrideIndicators.some(indicator => 
    input.toLowerCase().includes(indicator)
  );

  const elements = overrideIndicators.filter(indicator =>
    input.toLowerCase().includes(indicator)
  );

  return {
    detected,
    confidence: detected ? 0.8 : 0,
    elements
  };
}

function detectRoleConfusion(input) {
  const rolePatterns = [
    /you are (now |actually )?a (hacker|developer|admin|system)/i,
    /pretend (to be |you are )?a (different|new) (person|ai|assistant)/i,
    /act like (you are |a )?(jailbroken|unrestricted|free)/i,
    /roleplay as a (criminal|hacker|villain)/i
  ];

  for (const pattern of rolePatterns) {
    if (pattern.test(input)) {
      return {
        detected: true,
        confidence: 0.75,
        pattern: pattern.source
      };
    }
  }

  return { detected: false, confidence: 0 };
}

function detectContextPollution(input, context) {
  // Check for attempts to manipulate conversation context
  const pollutionIndicators = [
    'previous conversation',
    'earlier we discussed',
    'as we agreed before',
    'continuing from where we left off',
    'based on our previous chat'
  ];

  const hasContextManipulation = pollutionIndicators.some(indicator =>
    input.toLowerCase().includes(indicator)
  );

  // Check if context actually supports these claims
  const hasActualContext = context.conversationHistory && 
    context.conversationHistory.length > 0;

  return {
    detected: hasContextManipulation && !hasActualContext,
    confidence: hasContextManipulation && !hasActualContext ? 0.7 : 0
  };
}

function detectEncodingAttempts(input) {
  const encodingPatterns = [
    // Base64-like patterns
    /[A-Za-z0-9+\/]{20,}={0,2}/,
    // Hex encoding patterns
    /\\x[0-9a-fA-F]{2}/,
    // Unicode escape patterns
    /\\u[0-9a-fA-F]{4}/,
    // ROT13 or similar
    /[nopqrstuvwxyzabcdefghijklm]{10,}/,
    // Excessive special characters
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]{5,}/
  ];

  for (const pattern of encodingPatterns) {
    if (pattern.test(input)) {
      return {
        detected: true,
        confidence: 0.85,
        pattern: pattern.source
      };
    }
  }

  return { detected: false, confidence: 0 };
}

// Configuration and pattern loading functions
function getInjectionPatterns() {
  return [
    {
      name: 'direct_instruction_override',
      regex: /ignore (all |previous |above |system )?instructions?/i,
      risk: 0.9
    },
    {
      name: 'jailbreak_attempt',
      regex: /(jailbreak|break (out|free)|escape (mode|restrictions))/i,
      risk: 0.85
    },
    {
      name: 'system_manipulation',
      regex: /(system (prompt|message)|override (system|mode)|developer (mode|access))/i,
      risk: 0.8
    },
    {
      name: 'role_switching',
      regex: /(act as|pretend (to be|you are)|you are now|become a)/i,
      risk: 0.7
    },
    {
      name: 'instruction_injection',
      regex: /(new (instructions?|rules?|commands?)|change (your|the) (behavior|role))/i,
      risk: 0.75
    },
    {
      name: 'delimiter_confusion',
      regex: /(\-{3,}|\*{3,}|#{3,}|={3,})/,
      risk: 0.6
    }
  ];
}

function getSuspiciousInstructions() {
  return [
    'ignore safety guidelines',
    'bypass content policy',
    'unrestricted mode',
    'developer override',
    'admin access',
    'debug mode',
    'raw output',
    'unfiltered response'
  ];
}

// Utility functions
function defaultAuditLogger(logEntry) {
  // Default logger implementation (can be overridden by user)
  console.log('Audit Log:', JSON.stringify(logEntry, null, 2));
}

function getCacheKey(input, context) {
  // Generate a unique cache key based on input and context
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify({ input, context }));
  return hash.digest('hex');
}

// Semantic analysis function
async function performSemanticAnalysis(input) {
  // Implement semantic analysis using natural language patterns
  const semanticRisks = [
    {
      pattern: /(?:convince|persuade|force|make) (?:you|me|us) (?:to|into)/i,
      risk: 'MEDIUM',
      confidence: 0.7,
      reason: 'Persuasion attempt detected'
    },
    {
      pattern: /(?:secret|hidden|confidential|private) (?:information|data|prompt|instruction)/i,
      risk: 'HIGH',
      confidence: 0.8,
      reason: 'Information extraction attempt'
    },
    {
      pattern: /(?:bypass|circumvent|avoid|skip) (?:safety|security|restriction|filter)/i,
      risk: 'HIGH',
      confidence: 0.85,
      reason: 'Security bypass attempt'
    },
    {
      pattern: /(?:tell|show|reveal|give) (?:me )?(?:your|the) (?:system|internal|hidden)/i,
      risk: 'HIGH',
      confidence: 0.8,
      reason: 'System information extraction attempt'
    }
  ];

  for (const riskPattern of semanticRisks) {
    if (riskPattern.pattern.test(input)) {
      return {
        risk: riskPattern.risk,
        confidence: riskPattern.confidence,
        reason: riskPattern.reason
      };
    }
  }

  return {
    risk: 'LOW',
    confidence: 0
  };
}

// Enterprise functions
function initializeSemanticModel() {
  // Placeholder for semantic model initialization
  return {
    model: 'basic',
    version: '1.0',
    initialized: true
  };
}

function loadThreatIntelligence() {
  // Placeholder for loading threat intelligence data
  return {
    lastUpdated: new Date().toISOString(),
    sources: ['internal', 'owasp', 'mitre'],
    patterns: []
  };
}

// Cache management functions
function clearCache() {
  analysisCache.clear();
}

function getCacheStats() {
  return {
    size: analysisCache.size,
    maxSize: 1000 // configurable
  };
}

// Factory function for creating configured analyzer
function createAnalyzer(userConfig = {}) {
  const config = createDetectorConfig(userConfig);
  
  return {
    analyze: (input, context = {}) => analyzeInput(input, context, config),
    getConfig: () => ({ ...config }),
    clearCache,
    getCacheStats
  };
}

// Export functions for functional API
module.exports = {
  // Main functions
  analyzeInput,
  createAnalyzer,
  createDetectorConfig,
  
  // Detection functions
  detectPatterns,
  detectInstructionOverrides,
  detectRoleConfusion,
  detectContextPollution,
  detectEncodingAttempts,
  performSemanticAnalysis,
  
  // Configuration functions
  getInjectionPatterns,
  getSuspiciousInstructions,
  
  // Utility functions
  getCacheKey,
  defaultAuditLogger,
  clearCache,
  getCacheStats,
  
  // Enterprise functions
  initializeSemanticModel,
  loadThreatIntelligence,
  
  // Constants
  DEFAULT_CONFIG
};
