// Ignore separator punctuation so model labels such as CP-25 also match CP25.
const normalize = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export function findManuals(records, {query = '', brand = '', category = '', order = 'relevance'} = {}) {
  const terms = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  const phrase = normalize(query);
  return records.filter(r => (!brand || r.brand === brand) && (!category || r.category === category))
    .map(r => {
      const model = (r.models || []).map(normalize);
      const title = normalize(r.title);
      const haystack = normalize([r.title, r.brand, ...(r.models || [])].join(' '));
      return {record: r, match: terms.every(t => haystack.includes(t)), score: phrase ? (model.includes(phrase) ? 100 : 0) + (title.startsWith(phrase) ? 30 : 0) + (title.includes(phrase) ? 10 : 0) : 0};
    }).filter(r => r.match).sort((a, b) => {
      if (order === 'recent') return (b.record.savedAt || 0) - (a.record.savedAt || 0) || String(a.record.title).localeCompare(String(b.record.title));
      if (order === 'brand') return String(a.record.brand).localeCompare(String(b.record.brand)) || String(a.record.title).localeCompare(String(b.record.title));
      if (order === 'relevance' && a.score !== b.score) return b.score - a.score;
      return String(a.record.title).localeCompare(String(b.record.title), 'en', {numeric: true});
    }).map(r => r.record);
}
