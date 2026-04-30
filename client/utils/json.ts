export const safeJsonParse = <T>(
  value: string | null,
  fallback: T,
  label = 'json'
): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[safeJsonParse] ${label} 解析失败:`, error);
    return fallback;
  }
};

export const safeJsonParseNullable = <T>(
  value: string | null,
  label = 'json'
): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[safeJsonParseNullable] ${label} 解析失败:`, error);
    return null;
  }
};
