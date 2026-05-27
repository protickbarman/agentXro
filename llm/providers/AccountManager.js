const logger = require('../../config/logger');

class AccountManager {
  constructor(accounts = []) {
    this.accounts = accounts.map(acc => ({
      accountId: acc.accountId,
      apiToken: acc.apiToken,
      model: acc.model || null,
      isFree: acc.isFree !== false,
      healthy: true,
      lastError: null,
      errorCount: 0,
      cooldownUntil: 0,
    }));
    this.currentIndex = 0;
    this.cooldownMs = 60000;
    this.maxErrorsBeforeCooldown = 3;
  }

  getNextAccount() {
    const startIndex = this.currentIndex;
    const n = this.accounts.length;
    if (n === 0) return null;

    for (let i = 0; i < n; i++) {
      const idx = (startIndex + i) % n;
      const acc = this.accounts[idx];
      if (acc.healthy && Date.now() >= acc.cooldownUntil) {
        this.currentIndex = (idx + 1) % n;
        return acc;
      }
    }

    if (this._allUnhealthy()) {
      this._resetAll();
      const acc = this.accounts[0];
      if (acc) {
        this.currentIndex = 1 % n;
        return acc;
      }
    }
    return null;
  }

  markFailed(account) {
    if (!account) return;
    account.errorCount++;
    account.lastError = new Date().toISOString();
    if (account.errorCount >= this.maxErrorsBeforeCooldown) {
      account.healthy = false;
      account.cooldownUntil = Date.now() + this.cooldownMs;
      logger.warn(`Cloudflare account ${maskAccount(account.accountId)} marked unhealthy (cooldown ${this.cooldownMs}ms)`);
    }
  }

  markHealthy(account) {
    if (!account) return;
    account.healthy = true;
    account.errorCount = 0;
    account.cooldownUntil = 0;
    account.lastError = null;
  }

  getStatus() {
    return {
      total: this.accounts.length,
      currentIndex: this.currentIndex,
      accounts: this.accounts.map(acc => ({
        accountId: maskAccount(acc.accountId),
        model: acc.model,
        isFree: acc.isFree,
        healthy: acc.healthy,
        errorCount: acc.errorCount,
        lastError: acc.lastError,
        cooldownUntil: acc.cooldownUntil,
      })),
    };
  }

  hasHealthyAccounts() {
    return this.accounts.some(a => a.healthy && Date.now() >= a.cooldownUntil) || this.accounts.length > 0;
  }

  _allUnhealthy() {
    return this.accounts.every(a => !a.healthy);
  }

  _resetAll() {
    this.accounts.forEach(a => {
      a.healthy = true;
      a.errorCount = 0;
      a.cooldownUntil = 0;
    });
    this.currentIndex = 0;
    logger.info('All Cloudflare accounts reset to healthy');
  }
}

function maskAccount(id) {
  if (!id || id.length < 8) return id || 'unknown';
  return id.slice(0, 4) + '...' + id.slice(-4);
}

module.exports = AccountManager;
