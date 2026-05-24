const logger = require('../config/logger');

/**
 * ConflictResolver - Resolves disagreements between agents
 * Part of Agent-to-Agent Communication skill
 */
class ConflictResolver {
  constructor() {
    this.strategies = {
      'evidence-based': this._resolveEvidenceBased.bind(this),
      'vote': this._resolveByVote.bind(this),
      'escalate-to-user': this._resolveByEscalation.bind(this),
      'weighted': this._resolveWeighted.bind(this),
    };
  }

  /**
   * Resolve a conflict between agents
   * @param {object} conflict - Conflict to resolve
   * @returns {Promise<object>}
   */
  async resolve(conflict) {
    const { issue, agents, resolutionStrategy = 'evidence-based', context } = conflict;

    if (!issue || !agents || Object.keys(agents).length < 2) {
      throw new Error('Conflict must have an issue and at least 2 agents with positions');
    }

    const strategy = this.strategies[resolutionStrategy] || this.strategies['evidence-based'];
    logger.info(`Resolving conflict: "${issue}" using ${resolutionStrategy}`);

    const decision = await strategy(issue, agents, context);
    logger.info(`Conflict resolved: "${issue}" → ${decision.decision}`);

    return decision;
  }

  async _resolveEvidenceBased(issue, agents, context) {
    const entries = Object.entries(agents);
    let bestScore = -1;
    let bestAgent = null;
    let reasoning = [];

    for (const [agentName, position] of entries) {
      const confidence = position.confidence || 0.5;
      const evidence = position.evidence || '';

      let score = confidence;
      if (!evidence) score *= 0.5;
      if (evidence.length > 100) score += 0.1;

      reasoning.push({
        agent: agentName,
        score,
        confidence,
        evidenceLength: evidence.length,
      });

      if (score > bestScore) {
        bestScore = score;
        bestAgent = agentName;
      }
    }

    reasoning.sort((a, b) => b.score - a.score);

    return {
      decision: agents[bestAgent].conclusion || agents[bestAgent].position,
      selectedAgent: bestAgent,
      confidence: bestScore,
      reasoning: reasoning.map(r =>
        `${r.agent} (score: ${r.score.toFixed(2)}, confidence: ${r.confidence})`
      ),
      method: 'evidence-based',
    };
  }

  async _resolveByVote(issue, agents, context) {
    const votes = {};
    for (const [agentName, position] of Object.entries(agents)) {
      const vote = position.vote || position.conclusion || position.position;
      if (!votes[vote]) votes[vote] = { count: 0, agents: [], totalConfidence: 0 };
      votes[vote].count++;
      votes[vote].agents.push(agentName);
      votes[vote].totalConfidence += position.confidence || 0.5;
      votes[vote].avgConfidence = votes[vote].totalConfidence / votes[vote].count;
    }

    const sortedVotes = Object.entries(votes).sort((a, b) => {
      const diff = b[1].count - a[1].count;
      return diff !== 0 ? diff : b[1].avgConfidence - a[1].avgConfidence;
    });

    const winner = sortedVotes[0];
    return {
      decision: winner[0],
      voteCount: winner[1].count,
      totalVotes: Object.keys(agents).length,
      confidence: winner[1].avgConfidence,
      breakdown: sortedVotes.map(([vote, info]) => ({
        option: vote,
        votes: info.count,
        agents: info.agents,
        avgConfidence: info.avgConfidence,
      })),
      method: 'vote',
    };
  }

  async _resolveByEscalation(issue, agents, context) {
    const summary = {
      issue,
      agents: Object.entries(agents).map(([name, pos]) => ({
        agent: name,
        position: pos.conclusion || pos.position,
        confidence: pos.confidence || 0.5,
        evidence: pos.evidence ? pos.evidence.substring(0, 200) + '...' : 'No evidence provided',
      })),
    };

    return {
      decision: 'ESCALATED_TO_USER',
      requiresUserInput: true,
      summary,
      message: 'Agents could not reach consensus. Please review the positions below and decide:',
      method: 'escalate-to-user',
    };
  }

  async _resolveWeighted(issue, agents, context) {
    const weights = context?.weights || {};

    const entries = Object.entries(agents).map(([name, pos]) => {
      const baseWeight = weights[name] || 1.0;
      const confidence = pos.confidence || 0.5;
      const weightedScore = baseWeight * confidence;

      return {
        agent: name,
        position: pos.conclusion || pos.position,
        weight: baseWeight,
        confidence,
        weightedScore,
      };
    });

    entries.sort((a, b) => b.weightedScore - a.weightedScore);
    const winner = entries[0];

    return {
      decision: winner.position,
      selectedAgent: winner.agent,
      confidence: winner.weightedScore / entries.reduce((s, e) => s + e.weight, 0),
      details: entries,
      method: 'weighted',
    };
  }
}

module.exports = new ConflictResolver();
