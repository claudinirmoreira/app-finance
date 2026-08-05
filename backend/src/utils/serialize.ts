type JsonObjectLike = Record<string, unknown>;

function convert(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && (value as { _isDecimal?: boolean })._isDecimal === true) {
    return (value as { toNumber(): number }).toNumber();
  }
  if (Array.isArray(value)) return value.map(convert);
  if (Object.prototype.toString.call(value) === '[object Object]') {
    const out: JsonObjectLike = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = convert(item);
    }
    return out;
  }
  return value;
}

export function serializePrisma<T>(value: T): T {
  return convert(value) as T;
}