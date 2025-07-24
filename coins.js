
const fs = require('fs');
const path = require('path');

// Simple file-based database for coin storage
const COINS_FILE = path.join(__dirname, 'coins.json');
const HISTORY_FILE = path.join(__dirname, 'history.json');

class CoinManager {
  constructor() {
    this.coins = this.loadCoins();
    this.history = this.loadHistory();
  }

  loadCoins() {
    try {
      if (fs.existsSync(COINS_FILE)) {
        const data = fs.readFileSync(COINS_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading coins:', error);
    }
    return {};
  }

  saveCoins() {
    try {
      fs.writeFileSync(COINS_FILE, JSON.stringify(this.coins, null, 2));
    } catch (error) {
      console.error('Error saving coins:', error);
    }
  }

  loadHistory() {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
    return {};
  }

  saveHistory() {
    try {
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  addTransaction(userId, action, amount, adminId, oldBalance, newBalance) {
    if (!this.history[userId]) {
      this.history[userId] = [];
    }
    
    this.history[userId].push({
      action,
      amount,
      adminId,
      oldBalance,
      newBalance,
      timestamp: new Date().toISOString()
    });
    
    this.saveHistory();
  }

  getHistory(userId, limit = 10) {
    if (!this.history[userId]) {
      return [];
    }
    
    return this.history[userId]
      .slice(-limit)
      .reverse();
  }

  getBalance(userId) {
    return this.coins[userId] || 0;
  }

  addCoins(userId, amount, adminId = null) {
    const oldBalance = this.getBalance(userId);
    this.coins[userId] = oldBalance + amount;
    this.saveCoins();
    
    if (adminId) {
      this.addTransaction(userId, 'give', amount, adminId, oldBalance, this.coins[userId]);
    }
    
    return this.coins[userId];
  }

  removeCoins(userId, amount, adminId = null) {
    const oldBalance = this.getBalance(userId);
    const newBalance = Math.max(0, oldBalance - amount);
    this.coins[userId] = newBalance;
    this.saveCoins();
    
    if (adminId) {
      this.addTransaction(userId, 'remove', amount, adminId, oldBalance, newBalance);
    }
    
    return newBalance;
  }

  setCoins(userId, amount, adminId = null) {
    const oldBalance = this.getBalance(userId);
    this.coins[userId] = Math.max(0, amount);
    this.saveCoins();
    
    if (adminId) {
      this.addTransaction(userId, 'set', amount, adminId, oldBalance, this.coins[userId]);
    }
    
    return this.coins[userId];
  }

  getLeaderboard(limit = 10) {
    return Object.entries(this.coins)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  }
}

module.exports = CoinManager;
