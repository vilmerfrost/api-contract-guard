import { Difference } from '@/types';

export function deepCompare(obj1: unknown, obj2: unknown): Difference[] {
  const differences: Difference[] = [];

  function compare(a: unknown, b: unknown, path: string = '') {
    // Handle null/undefined
    if (a === null || a === undefined || b === null || b === undefined) {
      if (a !== b) {
        differences.push({
          path: path || 'root',
          expected: a,
          actual: b,
          type: 'changed',
        });
      }
      return;
    }
    
    // Handle primitives
    if (typeof a !== 'object' || typeof b !== 'object') {
      if (a !== b) {
        differences.push({
          path: path || 'root',
          expected: a,
          actual: b,
          type: 'changed',
        });
      }
      return;
    }
    
    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) {
        differences.push({
          path: `${path}.length`,
          expected: a.length,
          actual: b.length,
          type: 'changed',
        });
      }
      
      const maxLength = Math.max(a.length, b.length);
      for (let i = 0; i < maxLength; i++) {
        compare(a[i], b[i], `${path}[${i}]`);
      }
      return;
    }
    
    // Handle objects
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(aObj || {}), ...Object.keys(bObj || {})]);

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key;

      if (!(key in aObj)) {
        differences.push({
          path: newPath,
          expected: undefined,
          actual: bObj[key],
          type: 'added',
        });
      } else if (!(key in bObj)) {
        differences.push({
          path: newPath,
          expected: aObj[key],
          actual: undefined,
          type: 'removed',
        });
      } else {
        compare(aObj[key], bObj[key], newPath);
      }
    }
  }
  
  compare(obj1, obj2);
  return differences;
}

export function stripMetaFields(data: unknown, fieldsToIgnore: string[] = []): unknown {
  const defaultFields = ['id', '_id', 'createdAt', 'updatedAt', 'created_at', 'updated_at', 'timestamp'];
  const metaFields = [...defaultFields, ...fieldsToIgnore];
  
  if (Array.isArray(data)) {
    return data.map(item => stripMetaFields(item, fieldsToIgnore));
  }
  
  if (typeof data === 'object' && data !== null) {
    const cleaned: Record<string, unknown> = { ...(data as Record<string, unknown>) };
    metaFields.forEach(field => delete cleaned[field]);

    // Recursively clean nested objects
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'object') {
        cleaned[key] = stripMetaFields(cleaned[key], fieldsToIgnore);
      }
    });

    return cleaned;
  }
  
  return data;
}
