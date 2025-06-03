#!/usr/bin/env node

/**
 * Enterprise AI Safety Framework
 * Production-ready guardrails for custom GPT and multi-agent systems
 * Based on 2025 AI safety research and compliance standards
 */

const { PromptInjectionDetector } = require('./detectors/prompt-injection');
const { ContentSafetyPipeline } = require('./pipelines/content-safety');
const { BiasDetectionEngine } = require('./detectors/bias-detection');
const { ComplianceFramework } = require('./compliance/framework');
const { AuditLogger } = require('./audit/logger');

class EnterpriseGuardrails {
  constructor(config = {}) {
    this.config = {
      strictMode: config.strictMode || false,
      enableAudit: config.enableAudit !== false,
      complianceLevel: config.complianceLevel || 'enterprise',
      performanceMode: config.performanceMode || 'balanced',
      ...config
    };

    this.promptInjectionDetector = new PromptInjectionDetector(this.config);
    this.contentSafetyPipeline = new ContentSafetyPipeline(this.config);
    this.biasDetectionEngine = new BiasDetectionEngine(this.config);
    this.complianceFramework = new ComplianceFramework(this.config);
    this.auditLogger = new AuditLogger(this.config);
  }

  /**
   * Primary guardrail evaluation method
   * Processes input through all safety layers
   */
  async evaluateInput(input, context = {}) {
    const startTime = Date.now();
    const evaluationId = this.generateEvaluationId();

    try {
      // Multi-layer defense evaluation
      const results = {
        evaluationId,
        timestamp: new Date().toISOString(),
        input: this.config.enableAudit ? input : '[REDACTED]',
        context,
        safety: {
          promptInjection: null,
          contentSafety: null,
          biasDetection: null,
          compliance: null
        },
        decision: 'PENDING',
        confidence: 0,
        processingTime: 0
      };

      // 1. Prompt Injection Detection (Critical)
      results.safety.promptInjection = await this.promptInjectionDetector.analyze(input, context);
      if (results.safety.promptInjection.risk === 'HIGH') {
        results.decision = 'BLOCK';
        results.confidence = results.safety.promptInjection.confidence;
        return this.finalizeEvaluation(results, startTime);
      }

      // 2. Content Safety Pipeline
      results.safety.contentSafety = await this.contentSafetyPipeline.evaluate(input, context);
      if (results.safety.contentSafety.overall_score < 0.7) {
        results.decision = 'MODERATE';
        results.confidence = results.safety.contentSafety.confidence;
      }

      // 3. Bias Detection
      results.safety.biasDetection = await this.biasDetectionEngine.analyze(input, context);
      if (results.safety.biasDetection.bias_detected && this.config.strictMode) {
        results.decision = results.decision === 'PENDING' ? 'REVIEW' : results.decision;
      }

      // 4. Compliance Check
      results.safety.compliance = await this.complianceFramework.validate(input, context);
      if (!results.safety.compliance.compliant) {
        results.decision = 'BLOCK';
        results.confidence = 0.95;
      }

      // Final decision if still pending
      if (results.decision === 'PENDING') {
        results.decision = 'ALLOW';
        results.confidence = Math.min(
          results.safety.promptInjection.confidence,
          results.safety.contentSafety.confidence,
          results.safety.biasDetection.confidence
        );
      }

      return this.finalizeEvaluation(results, startTime);

    } catch (error) {
      const errorResult = {
        evaluationId,
        timestamp: new Date().toISOString(),
        error: error.message,
        decision: 'ERROR',
        confidence: 0,
        processingTime: Date.now() - startTime
      };
      
      await this.auditLogger.logError(errorResult);
      return errorResult;
    }
  }

  /**
   * Evaluate AI output before delivery
   */
  async evaluateOutput(output, originalInput, context = {}) {
    const startTime = Date.now();
    const evaluationId = this.generateEvaluationId();

    try {
      const results = {
        evaluationId,
        timestamp: new Date().toISOString(),
        output: this.config.enableAudit ? output : '[REDACTED]',
        originalInput: this.config.enableAudit ? originalInput : '[REDACTED]',
        context,
        safety: {
          contentSafety: null,
          biasDetection: null,
          compliance: null,
          factualAccuracy: null
        },
        decision: 'PENDING',
        confidence: 0,
        processingTime: 0
      };

      // Output-specific safety checks
      results.safety.contentSafety = await this.contentSafetyPipeline.evaluate(output, context);
      results.safety.biasDetection = await this.biasDetectionEngine.analyze(output, context);
      results.safety.compliance = await this.complianceFramework.validateOutput(output, originalInput, context);

      // Decision logic for output
      if (results.safety.contentSafety.overall_score < 0.8) {
        results.decision = 'FILTER';
      } else if (!results.safety.compliance.compliant) {
        results.decision = 'BLOCK';
      } else if (results.safety.biasDetection.bias_detected && this.config.strictMode) {
        results.decision = 'REVIEW';
      } else {
        results.decision = 'ALLOW';
      }

      results.confidence = Math.min(
        results.safety.contentSafety.confidence,
        results.safety.biasDetection.confidence,
        results.safety.compliance.confidence || 0.9
      );

      return this.finalizeEvaluation(results, startTime);

    } catch (error) {
      const errorResult = {
        evaluationId,
        timestamp: new Date().toISOString(),
        error: error.message,
        decision: 'ERROR',
        confidence: 0,
        processingTime: Date.now() - startTime
      };
      
      await this.auditLogger.logError(errorResult);
      return errorResult;
    }
  }

  /**
   * Enterprise policy enforcement
   */
  async enforcePolicy(policyName, content, context = {}) {
    const policy = await this.complianceFramework.getPolicy(policyName);
    if (!policy) {
      throw new Error(`Policy not found: ${policyName}`);
    }

    const evaluation = await this.evaluateInput(content, { ...context, policy: policyName });
    
    if (policy.strictEnforcement && evaluation.decision !== 'ALLOW') {
      throw new PolicyViolationError(`Content violates policy: ${policyName}`, evaluation);
    }

    return evaluation;
  }

  /**
   * Batch processing for high-throughput scenarios
   */
  async evaluateBatch(inputs, context = {}) {
    const results = await Promise.all(
      inputs.map((input, index) => 
        this.evaluateInput(input, { ...context, batchIndex: index })
      )
    );

    const summary = {
      total: results.length,
      allowed: results.filter(r => r.decision === 'ALLOW').length,
      blocked: results.filter(r => r.decision === 'BLOCK').length,
      moderated: results.filter(r => r.decision === 'MODERATE').length,
      errors: results.filter(r => r.decision === 'ERROR').length,
      averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
    };

    return { results, summary };
  }

  /**
   * Real-time monitoring dashboard data
   */
  async getMonitoringMetrics(timeRange = '1h') {
    return await this.auditLogger.getMetrics(timeRange);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(timeRange = '24h') {
    return await this.complianceFramework.generateReport(timeRange);
  }

  // Private methods
  finalizeEvaluation(results, startTime) {
    results.processingTime = Date.now() - startTime;
    
    if (this.config.enableAudit) {
      this.auditLogger.logEvaluation(results);
    }

    return results;
  }

  generateEvaluationId() {
    return `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

class PolicyViolationError extends Error {
  constructor(message, evaluation) {
    super(message);
    this.name = 'PolicyViolationError';
    this.evaluation = evaluation;
  }
}

module.exports = {
  EnterpriseGuardrails,
  PolicyViolationError
};
