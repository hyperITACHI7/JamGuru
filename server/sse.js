// SSE connection manager — maps userId → Set of active SSE response objects (one per tab)
const connections = new Map();

function addConnection(userId, res) {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(res);
}

function removeConnection(userId, res) {
  const conns = connections.get(userId);
  if (!conns) return;
  conns.delete(res);
  if (conns.size === 0) connections.delete(userId);
}

function notify(userId, event, data) {
  const conns = connections.get(userId);
  if (!conns) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of conns) {
    try { res.write(payload); }
    catch (_) { conns.delete(res); }
  }
}

function notifyMany(userIds, event, data) {
  for (const userId of userIds) notify(userId, event, data);
}

module.exports = { addConnection, removeConnection, notify, notifyMany };
