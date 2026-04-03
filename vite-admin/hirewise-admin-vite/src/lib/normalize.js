export const toArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const candidateKeys = [
    'data',
    'rows',
    'items',
    'applications',
    'candidates',
    'results',
    'records',
  ];

  for (const key of candidateKeys) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  for (const key of candidateKeys) {
    const nested = payload[key];
    if (!nested || typeof nested !== 'object') continue;
    for (const nestedKey of candidateKeys) {
      if (Array.isArray(nested[nestedKey])) return nested[nestedKey];
    }
  }

  return [];
};

export const toObjectPayload = (payload) => {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload;
  return {};
};
