const app = require('../app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`Server On... Express is running on http://localhost:${PORT}`);
});
