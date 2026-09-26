
export type EvaluationProduct = {
  _id: string;
  name: string;
  category: string;
};

export type EvaluationResult = {
  k: number;
  precisionAtK: number;
  hitRateAtK: number;
  recommendedProducts: string[];
  relevantProducts: string[];
};

export function evaluateRecommendations(
  recommendations: EvaluationProduct[],
  relevantProducts: EvaluationProduct[],
  k: number = 4
): EvaluationResult {
  const topK = recommendations.slice(0, k);

  const relevantIds = new Set(
    relevantProducts.map((product) => product._id)
  );

  const relevantRecommendedCount = topK.filter((product) =>
    relevantIds.has(product._id)
  ).length;

  const precisionAtK =
    topK.length === 0
      ? 0
      : relevantRecommendedCount / topK.length;

  const hitRateAtK =
    relevantRecommendedCount > 0 ? 1 : 0;

  return {
    k,
    precisionAtK: Number(precisionAtK.toFixed(2)),
    hitRateAtK,
    recommendedProducts: topK.map(
      (product) => product.name
    ),
    relevantProducts: relevantProducts.map(
      (product) => product.name
    )
  };
}

