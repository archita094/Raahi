function getHealthStatus(req, res) {
  res.json({
    status: 'ok',
    service: 'Raahi CTU Bus Planner Backend',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getHealthStatus
};

