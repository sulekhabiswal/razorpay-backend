// Feature mapping based on product number
export const featureMap = {
  1: ["feature_A", "feature_B"],
  2: ["feature_C"],
  3: ["feature_X", "feature_Y", "feature_Z"],
};


// Feature expiry time in milliseconds
export const featureExpiryMap = {
  1: 2 * 60 * 1000, // 2 minutes
  2: 5 * 60 * 1000, // 5 minutes
  3: 10 * 60 * 1000 // 10 minutes
};