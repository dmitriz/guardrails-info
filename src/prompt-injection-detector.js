/**
 * Advanced Prompt Injection Detection System
 * Enterprise-grade detection for various prompt injection techniques
 */

class PromptInjectionDetector {
    constructor(config = {}) {
        this.sensitivity = config.sensitivity || 'medium'; // low, medium, high
        this.patterns = this.initializePatterns();
        this.mlModel = config.mlModel || null; // Optional ML model integration
    }

    initializePatterns() {
        return {
            // Direct injection patterns
            direct: [
                /ignore\s+(?:previous|all|above)\s+(?:instructions?|prompts?|rules?)/i,
                /forget\s+(?:everything|all|previous)\s+(?:instructions?|prompts?)/i,
                /disregard\s+(?:previous|all|above)\s+(?:instructions?|prompts?)/i,
                /override\s+(?:system|previous)\s+(?:instructions?|prompts?)/i
            ],
            
            // Role manipulation
            roleManipulation: [
                /you\s+are\s+now\s+(?:a|an)\s+(?:assistant|helper|bot)/i,
                /act\s+as\s+(?:if\s+you\s+are|a|an)\s+(?:different|new)/i,
                /pretend\s+(?:to\s+be|you\s+are)/i,
                /imagine\s+you\s+are\s+(?:a|an|now)/i
            ],
            
            // System message manipulation
            systemManipulation: [
                /system\s*:\s*(?:ignore|forget|disregard)/i,
                /\[system\]\s*(?:ignore|forget|override)/i,
                /assistant\s*:\s*(?:i\s+will\s+ignore|forget)/i
            ],
            
            // Context switching
            contextSwitching: [
                /new\s+(?:conversation|session|context)/i,
                /start\s+(?:over|fresh|new)/i,
                /reset\s+(?:conversation|context|memory)/i
            ],
            
            // Encoding attacks
            encoding: [
                /&#x[0-9a-f]+;/i, // HTML entities
                /%[0-9a-f]{2}/i,  // URL encoding
                /\\u[0-9a-f]{4}/i, // Unicode escapes
                /base64\s*:\s*[a-zA-Z0-9+/]+=*/i
            ],
            
            // Template injection
            template: [
                /\{\{\s*[^}]+\s*\}\}/,  // Template literals
                /\$\{[^}]+\}/,          // JavaScript template strings
                /%\([^)]+\)s/,          // Python string formatting
            ]
        };
    }

    /**
     * Analyze input for prompt injection attempts
     * @param {string} input - User input to analyze
     * @param {Object} context - Additional context for analysis
     * @returns {Object} Detection result with risk assessment
     */
    detect(input, context = {}) {
        const result = {
            isInjection: false,
            riskLevel: 'low', // low, medium, high, critical
            confidence: 0,
            detectedPatterns: [],
            recommendations: [],
            metadata: {
                inputLength: input.length,
                analysisTimestamp: new Date().toISOString(),
                detectorVersion: '1.0.0'
            }
        };

        // Pattern-based detection
        const patternResults = this.analyzePatterns(input);
        
        // Behavioral analysis
        const behaviorResults = this.analyzeBehavior(input, context);
        
        // Statistical analysis
        const statResults = this.analyzeStatistics(input);
        
        // ML model analysis (if available)
        const mlResults = this.mlModel ? this.analyzeMlModel(input) : null;

        // Combine results
        result.detectedPatterns = [
            ...patternResults.patterns,
            ...behaviorResults.patterns,
            ...statResults.patterns
        ];

        if (mlResults) {
            result.detectedPatterns.push(...mlResults.patterns);
        }

        // Calculate overall risk
        const scores = [
            patternResults.score,
            behaviorResults.score,
            statResults.score,
            mlResults?.score || 0
        ];

        const maxScore = Math.max(...scores);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

        result.confidence = Math.round(avgScore * 100);
        result.riskLevel = this.calculateRiskLevel(maxScore);
        result.isInjection = result.riskLevel !== 'low';

        // Generate recommendations
        result.recommendations = this.generateRecommendations(result);

        return result;
    }

    analyzePatterns(input) {
        const result = { patterns: [], score: 0 };
        let totalMatches = 0;

        for (const [category, patterns] of Object.entries(this.patterns)) {
            for (const pattern of patterns) {
                const matches = input.match(pattern);
                if (matches) {
                    result.patterns.push({
                        type: 'pattern',
                        category,
                        pattern: pattern.source,
                        match: matches[0],
                        severity: this.getPatternSeverity(category)
                    });
                    totalMatches++;
                }
            }
        }

        // Score based on number and severity of matches
        result.score = Math.min(totalMatches * 0.2, 1.0);
        return result;
    }

    analyzeBehavior(input, context) {
        const result = { patterns: [], score: 0 };
        let behaviorFlags = 0;

        // Check for unusual patterns
        const suspiciousBehaviors = [
            {
                name: 'excessive_capitalization',
                check: () => (input.match(/[A-Z]/g) || []).length / input.length > 0.3,
                severity: 'low'
            },
            {
                name: 'unusual_punctuation',
                check: () => (input.match(/[!@#$%^&*()]/g) || []).length > 10,
                severity: 'medium'
            },
            {
                name: 'repeated_phrases',
                check: () => {
                    const words = input.toLowerCase().split(/\s+/);
                    const uniqueWords = new Set(words);
                    return words.length / uniqueWords.size > 2;
                },
                severity: 'medium'
            },
            {
                name: 'context_mismatch',
                check: () => {
                    if (!context.expectedTopic) return false;
                    return !input.toLowerCase().includes(context.expectedTopic.toLowerCase());
                },
                severity: 'high'
            }
        ];

        for (const behavior of suspiciousBehaviors) {
            if (behavior.check()) {
                result.patterns.push({
                    type: 'behavior',
                    name: behavior.name,
                    severity: behavior.severity
                });
                behaviorFlags++;
            }
        }

        result.score = Math.min(behaviorFlags * 0.15, 0.8);
        return result;
    }

    analyzeStatistics(input) {
        const result = { patterns: [], score: 0 };
        
        // Statistical anomaly detection
        const stats = {
            length: input.length,
            wordCount: input.split(/\s+/).length,
            uniqueChars: new Set(input).size,
            entropy: this.calculateEntropy(input)
        };

        // Check for anomalies
        if (stats.length > 5000) {
            result.patterns.push({
                type: 'statistical',
                name: 'excessive_length',
                value: stats.length,
                severity: 'medium'
            });
        }

        if (stats.entropy > 4.5) {
            result.patterns.push({
                type: 'statistical',
                name: 'high_entropy',
                value: stats.entropy,
                severity: 'high'
            });
        }

        if (stats.uniqueChars / stats.length < 0.3) {
            result.patterns.push({
                type: 'statistical',
                name: 'low_character_diversity',
                value: stats.uniqueChars / stats.length,
                severity: 'medium'
            });
        }

        result.score = result.patterns.length * 0.1;
        return result;
    }

    calculateEntropy(str) {
        const freq = {};
        for (const char of str) {
            freq[char] = (freq[char] || 0) + 1;
        }

        let entropy = 0;
        const len = str.length;
        for (const count of Object.values(freq)) {
            const p = count / len;
            entropy -= p * Math.log2(p);
        }

        return entropy;
    }

    getPatternSeverity(category) {
        const severityMap = {
            direct: 'critical',
            roleManipulation: 'high',
            systemManipulation: 'critical',
            contextSwitching: 'medium',
            encoding: 'high',
            template: 'high'
        };
        return severityMap[category] || 'medium';
    }

    calculateRiskLevel(score) {
        if (score >= 0.8) return 'critical';
        if (score >= 0.6) return 'high';
        if (score >= 0.3) return 'medium';
        return 'low';
    }

    generateRecommendations(result) {
        const recommendations = [];

        if (result.riskLevel === 'critical') {
            recommendations.push('Block request immediately');
            recommendations.push('Log incident for security review');
            recommendations.push('Consider rate limiting user');
        } else if (result.riskLevel === 'high') {
            recommendations.push('Apply strict content filtering');
            recommendations.push('Require human review');
            recommendations.push('Monitor user activity');
        } else if (result.riskLevel === 'medium') {
            recommendations.push('Apply enhanced monitoring');
            recommendations.push('Consider warning user');
        }

        // Pattern-specific recommendations
        const patterns = result.detectedPatterns.map(p => p.category || p.name);
        
        if (patterns.includes('encoding')) {
            recommendations.push('Decode and re-analyze content');
        }
        
        if (patterns.includes('roleManipulation')) {
            recommendations.push('Reinforce system instructions');
        }

        return [...new Set(recommendations)]; // Remove duplicates
    }

    /**
     * Update detection patterns based on new threats
     * @param {Array} newPatterns - New patterns to add
     */
    updatePatterns(newPatterns) {
        for (const pattern of newPatterns) {
            if (!this.patterns[pattern.category]) {
                this.patterns[pattern.category] = [];
            }
            this.patterns[pattern.category].push(new RegExp(pattern.regex, pattern.flags || 'i'));
        }
    }

    /**
     * Get detection statistics
     * @returns {Object} Statistics about the detector
     */
    getStats() {
        return {
            totalPatterns: Object.values(this.patterns).reduce((sum, patterns) => sum + patterns.length, 0),
            categories: Object.keys(this.patterns),
            sensitivity: this.sensitivity,
            hasMLModel: !!this.mlModel
        };
    }
}

module.exports = PromptInjectionDetector;
