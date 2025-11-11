// Helpers to normalize numeric strings and payloads before sending to the server.
// Aim: convert values like "1.234,56" or "1 234.56" to a stable numeric string/number
// but avoid corrupting values that contain letters (e.g. "19L5").

function normalizeNumberString(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'number') return val;
  if (typeof val !== 'string') return val;
  const s = val.trim();
  if (s === '') return s;
  // Remove non-breaking spaces and normal spaces used as thousand separators
  let t = s.replace(/\u00A0/g, '').replace(/\s+/g, '');
  // If contains letters, do not attempt numeric normalization
  if (/[A-Za-z]/.test(t)) return val;
  // If comma used as decimal separator (e.g. 1.234,56) — replace last comma with dot
  // Heuristic: if there's both '.' and ',' assume dot is thousand and comma decimal
  if (t.indexOf('.') !== -1 && t.indexOf(',') !== -1) {
    t = t.replace(/\./g, ''); // remove thousand separators
    t = t.replace(/,/g, '.');
  } else if (t.indexOf(',') !== -1 && t.indexOf('.') === -1) {
    // only commas present: treat comma as decimal separator
    t = t.replace(/,/g, '.');
  } else {
    // only dots present or none — remove any grouping (spaces already removed)
    // leave dots as decimal point
  }
  // If after cleaning it parses as a number, return numeric value; else return original
  const n = Number(t);
  if (!Number.isNaN(n)) return n;
  return val;
}

function normalizePayloadNumbers(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === null || v === undefined) {
      out[k] = v;
      continue;
    }
    // For nested objects/arrays, recurse
    if (typeof v === 'object') out[k] = normalizePayloadNumbers(v);
    else if (typeof v === 'string') out[k] = normalizeNumberString(v);
    else out[k] = v;
  }
  return out;
}

// Normalize only the specified field names in the payload (non-recursive for fields at top level,
// recursive for nested objects). This avoids accidentally transforming text fields that are not numeric.
function normalizePayloadForFields(obj, fields = []) {
  if (!obj || typeof obj !== 'object') return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === null || v === undefined) {
      out[k] = v;
      continue;
    }
    if (typeof v === 'object') {
      // Recurse into nested objects/arrays but keep field filter for nested keys
      out[k] = normalizePayloadForFields(v, fields);
    } else if (typeof v === 'string') {
      if (fields.includes(k)) out[k] = normalizeNumberString(v);
      else out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Named exports for ES module import
export { normalizeNumberString, normalizePayloadNumbers, normalizePayloadForFields };
