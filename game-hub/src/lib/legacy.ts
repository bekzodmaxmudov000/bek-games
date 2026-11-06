// One-time carry-over: data saved under the app's previous storage prefix moves to the BEK GAMES prefix.
// Safe to delete once nobody has data under the old prefix any more.
const OLD = 'playverse:';
const NEW = 'bekgames:';

try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(OLD)) continue;
    const next = NEW + key.slice(OLD.length);
    if (localStorage.getItem(next) === null) localStorage.setItem(next, localStorage.getItem(key) ?? '');
    localStorage.removeItem(key);
  }
} catch { /* storage unavailable */ }

export {};
