/**
 * Content Safety Pipeline
 * Enterprise-grade content moderation and safety evaluation
 */

class ContentSafetyPipeline {
  constructor(config = {}) {
    this.config = {
      toxicityThreshold: config.toxicityThreshold || 0.7,
      hateSpeechThreshold: config.hateSpeechThreshold || 0.8,
      violenceThreshold: config.violenceThreshold || 0.75,
      adultContentThreshold: config.adultContentThreshold || 0.85,
      enablePersonalDataDetection: config.enablePersonalDataDetection !== false,
      ...config
    };

    this.personalDataPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g // Phone number
    ];
  }

  async evaluate(content, context = {}) {
    const startTime = Date.now();

    try {
      const results = {
        content_type: this.detectContentType(content),
        toxicity_score: await this.evaluateToxicity(content),
        hate_speech_score: await this.evaluateHateSpeech(content),
        violence_score: await this.evaluateViolence(content),
        adult_content_score: await this.evaluateAdultContent(content),
        personal_data_detected: this.detectPersonalData(content),
        language_appropriateness: await this.evaluateLanguage(content),
        overall_score: 0,
        confidence: 0,
        processing_time: 0,
        flags: []
      };

      // Calculate overall safety score (weighted average)
      results.overall_score = this.calculateOverallScore(results);
      results.confidence = this.calculateConfidence(results);
      results.flags = this.generateFlags(results);
      results.processing_time = Date.now() - startTime;

      return results;

    } catch (error) {
      return {
        error: error.message,
        overall_score: 0,
        confidence: 0,
        processing_time: Date.now() - startTime,
        flags: ['EVALUATION_ERROR']
      };
    }
  }

  async evaluateToxicity(content) {
    // Simplified toxicity detection using keyword analysis
    const toxicKeywords = [
      'hate', 'stupid', 'idiot', 'moron', 'damn', 'hell',
      'kill', 'die', 'death', 'murder', 'violence'
    ];

    const words = content.toLowerCase().split(/\s+/);
    const toxicMatches = words.filter(word => 
      toxicKeywords.some(keyword => word.includes(keyword))
    );

    const toxicityScore = Math.min(toxicMatches.length / words.length * 10, 1);
    return 1 - toxicityScore; // Invert so higher is safer
  }

  async evaluateHateSpeech(content) {
    const hateSpeechPatterns = [
      /\b(racial|ethnic|religious)\s+(slur|attack|hatred)\b/i,
      /\b(nazi|fascist|supremacist)\b/i,
      /\b(terrorist|extremist)\b/i
    ];

    const hasHateSpeech = hateSpeechPatterns.some(pattern => pattern.test(content));
    return hasHateSpeech ? 0.2 : 0.95;
  }

  async evaluateViolence(content) {
    const violenceKeywords = [
      'assault', 'attack', 'bomb', 'weapon', 'gun', 'knife',
      'torture', 'abuse', 'harm', 'hurt', 'pain', 'blood'
    ];

    const words = content.toLowerCase().split(/\s+/);
    const violentMatches = words.filter(word => 
      violenceKeywords.some(keyword => word.includes(keyword))
    );

    const violenceScore = Math.min(violentMatches.length / words.length * 8, 1);
    return 1 - violenceScore;
  }

  async evaluateAdultContent(content) {
    const adultKeywords = [
      'sexual', 'explicit', 'nude', 'porn', 'adult',
      'intimate', 'erotic', 'graphic'
    ];

    const words = content.toLowerCase().split(/\s+/);
    const adultMatches = words.filter(word => 
      adultKeywords.some(keyword => word.includes(keyword))
    );

    const adultScore = Math.min(adultMatches.length / words.length * 12, 1);
    return 1 - adultScore;
  }

  detectPersonalData(content) {
    if (!this.config.enablePersonalDataDetection) {
      return { detected: false, types: [] };
    }

    const detectedTypes = [];
    
    if (this.personalDataPatterns[0].test(content)) detectedTypes.push('SSN');
    if (this.personalDataPatterns[1].test(content)) detectedTypes.push('CREDIT_CARD');
    if (this.personalDataPatterns[2].test(content)) detectedTypes.push('EMAIL');
    if (this.personalDataPatterns[3].test(content)) detectedTypes.push('PHONE');

    return {
      detected: detectedTypes.length > 0,
      types: detectedTypes,
      count: detectedTypes.length
    };
  }

  async evaluateLanguage(content) {
    // Basic profanity and inappropriate language detection
    const profanityWords = [
      'damn', 'hell', 'crap', 'stupid', 'idiot', 'moron',
      'shut up', 'screw', 'suck', 'dumb'
    ];

    const words = content.toLowerCase();
    const profanityCount = profanityWords.filter(word => words.includes(word)).length;
    
    return {
      appropriateness_score: Math.max(0, 1 - (profanityCount / 10)),
      profanity_detected: profanityCount > 0,
      profanity_count: profanityCount
    };
  }

  detectContentType(content) {
    if (content.length > 1000) return 'LONG_FORM';
    if (content.includes('?')) return 'QUESTION';
    if (content.includes('!')) return 'EXCLAMATION';
    if (/^[A-Z\s]+$/.test(content)) return 'SHOUTING';
    return 'STANDARD';
  }

  calculateOverallScore(results) {
    const weights = {
      toxicity: 0.25,
      hate_speech: 0.3,
      violence: 0.25,
      adult_content: 0.15,
      language: 0.05
    };

    let score = 0;
    score += results.toxicity_score * weights.toxicity;
    score += results.hate_speech_score * weights.hate_speech;
    score += results.violence_score * weights.violence;
    score += results.adult_content_score * weights.adult_content;
    score += results.language_appropriateness.appropriateness_score * weights.language;

    // Penalty for personal data detection
    if (results.personal_data_detected.detected) {
      score *= 0.8;
    }

    return Math.max(0, Math.min(1, score));
  }

  calculateConfidence(results) {
    // Higher confidence for clearer violations or clear safety
    const scores = [
      results.toxicity_score,
      results.hate_speech_score,
      results.violence_score,
      results.adult_content_score
    ];

    const extremeScores = scores.filter(score => score < 0.3 || score > 0.9);
    const baseConfidence = 0.7;
    const extremeBonus = extremeScores.length * 0.1;

    return Math.min(0.95, baseConfidence + extremeBonus);
  }

  generateFlags(results) {
    const flags = [];

    if (results.toxicity_score < this.config.toxicityThreshold) {
      flags.push('HIGH_TOXICITY');
    }
    if (results.hate_speech_score < this.config.hateSpeechThreshold) {
      flags.push('HATE_SPEECH');
    }
    if (results.violence_score < this.config.violenceThreshold) {
      flags.push('VIOLENCE_CONTENT');
    }
    if (results.adult_content_score < this.config.adultContentThreshold) {
      flags.push('ADULT_CONTENT');
    }
    if (results.personal_data_detected.detected) {
      flags.push('PERSONAL_DATA');
    }
    if (results.language_appropriateness.profanity_detected) {
      flags.push('PROFANITY');
    }

    return flags;
  }
}

module.exports = { ContentSafetyPipeline };
