/**
 * Advanced Prompt Injection Detection System
 * Based on 2025 AI security research and production patterns
 */

class PromptInjectionDetector {
  constructor(config = {}) {
    this.config = {
      sensitivityLevel: config.sensitivityLevel || 'medium',
      enablePatternMatching: config.enablePatternMatching !== false,
      enableSemanticAnalysis: config.enableSemanticAnalysis !== false,
      ...config
    };

    this.injectionPatterns = this.loadInjectionPatterns();
    this.suspiciousInstructions = this.loadSuspiciousInstructions();
  }

  async analyze(input, context = {}) {
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

      // 1. Pattern-based detection
      if (this.config.enablePatternMatching) {
        const patternResults = this.detectPatterns(input);
        analysis.detectedPatterns = patternResults.patterns;
        analysis.suspiciousElements.push(...patternResults.elements);
        
        if (patternResults.riskLevel > 0.7) {
          analysis.risk = 'HIGH';
          analysis.confidence = Math.max(analysis.confidence, patternResults.riskLevel);
          analysis.reasoning.push('High-risk injection patterns detected');
        }
      }

      // 2. Instruction override detection
      const instructionResults = this.detectInstructionOverrides(input);
      if (instructionResults.detected) {
        analysis.risk = analysis.risk === 'LOW' ? 'MEDIUM' : 'HIGH';
        analysis.confidence = Math.max(analysis.confidence, instructionResults.confidence);
        analysis.reasoning.push('Potential instruction override detected');
        analysis.suspiciousElements.push(...instructionResults.elements);
      }

      // 3. Role confusion detection
      const roleResults = this.detectRoleConfusion(input);
      if (roleResults.detected) {
        analysis.risk = analysis.risk === 'LOW' ? 'MEDIUM' : analysis.risk;
        analysis.confidence = Math.max(analysis.confidence, roleResults.confidence);
        analysis.reasoning.push('Role confusion attempt detected');
      }

      // 4. Context pollution check
      const contextResults = this.detectContextPollution(input, context);
      if (contextResults.detected) {
        analysis.risk = analysis.risk === 'LOW' ? 'MEDIUM' : analysis.risk;
        analysis.confidence = Math.max(analysis.confidence, contextResults.confidence);
        analysis.reasoning.push('Context manipulation detected');
      }

      // 5. Encoding/obfuscation detection
      const encodingResults = this.detectEncodingAttempts(input);
      if (encodingResults.detected) {
        analysis.risk = 'HIGH';
        analysis.confidence = Math.max(analysis.confidence, encodingResults.confidence);
        analysis.reasoning.push('Obfuscation/encoding attempt detected');
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

  detectPatterns(input) {
    const inputLower = input.toLowerCase();
    const detectedPatterns = [];
    const suspiciousElements = [];
    let maxRisk = 0;

    for (const pattern of this.injectionPatterns) {
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

  detectInstructionOverrides(input) {
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

  detectRoleConfusion(input) {
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

  detectContextPollution(input, context) {
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

  detectEncodingAttempts(input) {
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

  loadInjectionPatterns() {
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

  loadSuspiciousInstructions() {
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
}

module.exports = { PromptInjectionDetector };
