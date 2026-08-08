// TSM Enterprise Command Interface
module.exports = {
  execute(command) {
    return {
      command,
      status: "processing"
    };
  }
};