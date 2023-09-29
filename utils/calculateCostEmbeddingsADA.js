const { encode } = require("gpt-3-encoder");

const calculateCostEmbeddingsADA = (texts) => {
  const totalTokens = texts.reduce((acc, text) => acc + encode(text).length, 0);
  const costPer1000Tokens = 0.0001;
  const cost = ((totalTokens * costPer1000Tokens) / 1000).toFixed(5);
  return cost;
};

module.exports = calculateCostEmbeddingsADA;
