class ClientError extends Error {
  constructor(message) {
    super(message);

    this.name = 'ClientError';
  }
}

module.exports = ClientError;
