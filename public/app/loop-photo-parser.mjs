/**
 * Conservative transcription suggestions, never a confirmed loop inventory.
 * The Protec allocation display establishes Add/Map columns, not cable order.
 * Every source line is kept, including rows this parser cannot associate safely.
 */
const HEADER = /\b(device\s+address|address|addr\.?|add|map(?:\s+(?:node|number|no\.?|position))?|state|status|s\s*\/\s*n|serial(?:\s+(?:number|no\.?))?|type|ver(?:sion)?|firmware|location(?:\s+text)?|label|description|device|zone)\b/gi;
const SUMMARY = /^\s*(?:logged|unallocated|missing|scan\s*time|panel\s*\d|loop\s*\d)\b|^\s*\d+\s+of\s+\d+\s*$/i;
const numeric = value => /^\d{1,6}$/.test(value || '');
const possiblyNumeric = value => /^[0-9OoIl?._-]{1,6}$/.test(value || '');
const kind = value => /^(?:device\s+address|address|addr\.?|add)$/i.test(value) ? 'address'
  : /^map\b/i.test(value) ? 'map' : /^(?:location|label|description|device)\b/i.test(value) ? 'locationText' : 'other';

function readHeader(line, lineNumber) {
  const matches = [...line.matchAll(HEADER)];
  if (!matches.some(m => kind(m[0]) === 'address') || !matches.some(m => kind(m[0]) === 'map')) return null;
  // Unknown header labels invalidate token-position inference. A numeric column
  // omitted here could otherwise turn a serial number or version into an address.
  let cursor = 0;
  for (const match of matches) {
    if (!/^[\s|,:;]*$/.test(line.slice(cursor, match.index))) return null;
    cursor = match.index + match[0].length;
  }
  if (!/^[\s|,:;]*$/.test(line.slice(cursor))) return null;
  const columns = matches.map(match => ({name:match[0],kind:kind(match[0]),offset:match.index}));
  if (columns.filter(c => c.kind === 'address').length !== 1 || columns.filter(c => c.kind === 'map').length !== 1) return null;
  return {lineNumber,rawLine:line,columns,delimiter:line.includes('|')?'|':line.includes('\t')?'\t':null};
}

function rowCells(line, header) {
  let cells;
  if (header.delimiter) {
    cells = line.split(header.delimiter).map(value => value.trim());
    if (header.delimiter === '|') {
      if (cells[0] === '') cells.shift();
      if (cells.at(-1) === '') cells.pop();
    }
  } else cells = line.trim().split(/\s+/);
  const count = header.columns.length;
  if (cells.length > count && header.columns.at(-1).kind === 'locationText') {
    cells = [...cells.slice(0,count-1),cells.slice(count-1).join(' ')];
  }
  // Never shift a missing middle column left. Preserve the unparsed source row.
  return cells.length === count ? cells : null;
}

export function parseLoopListText(rawText, {sourcePhotoId='',confidence=null} = {}) {
  const text = String(rawText ?? '');
  const suggestions = [], unparsedLines = [], headers = [], warnings = [];
  let header = null;
  text.split(/\r?\n/).forEach((rawLine,index) => {
    const lineNumber = index+1;
    if (!rawLine.trim()) return;
    const nextHeader = readHeader(rawLine,lineNumber);
    if (nextHeader) { header = nextHeader; headers.push(nextHeader); return; }
    const keep = reason => unparsedLines.push({lineNumber,rawLine,sourcePhotoId,reason});
    if (/\b(?:address|addr|add)\b/i.test(rawLine) && /\bmap\b/i.test(rawLine)) {
      header=null;keep('A possible column header was ambiguous; the previous column association is not reused.');return;
    }
    if (!header) { keep('No verified Address/Add and Map column header on this photo.'); return; }
    if (SUMMARY.test(rawLine)) { keep('Panel metadata or summary, not a device row.'); return; }
    const cells = rowCells(rawLine,header);
    if (!cells) { keep('Column count is ambiguous; transcribe this row against the original photo.'); return; }
    const addressText = cells[header.columns.findIndex(c => c.kind === 'address')];
    const mapText = cells[header.columns.findIndex(c => c.kind === 'map')];
    if ((!numeric(addressText) && !possiblyNumeric(addressText)) || (!numeric(mapText) && !possiblyNumeric(mapText) && mapText !== '')) {
      keep('Address or Map cannot be read as an unambiguous number.'); return;
    }
    const issues = [];
    if (!numeric(addressText)) issues.push('Confirm the Address from the photo; OCR text has not been converted into a number.');
    if (!numeric(mapText)) issues.push('Confirm the Map from the photo; OCR text has not been converted into a number.');
    if (confidence !== null && confidence < 80) issues.push('Low OCR confidence: check every value against the photo.');
    const locationIndex = header.columns.findIndex(c => c.kind === 'locationText');
    suggestions.push({id:`${sourcePhotoId || 'text'}:line-${lineNumber}`,sourcePhotoId,lineNumber,
      address:numeric(addressText)?addressText:'',map:numeric(mapText)?mapText:'',
      rawAddress:addressText,rawMap:mapText,locationText:locationIndex<0?'':cells[locationIndex],
      rawLine,confidence,reviewRequired:true,issues,headerLineNumber:header.lineNumber,
      sourceColumns:header.columns.map((column,i)=>({name:column.name,value:cells[i]}))});
  });
  if (!headers.length) warnings.push('No clear Address/Add and Map header was read. Review the photo and enter the rows manually.');
  else if (!suggestions.length) warnings.push('No device rows could be associated safely with the columns. Review and transcribe the original photo.');
  if (suggestions.length) warnings.push('OCR suggestions need your approval. Repeated Map values are allowed and do not establish device order within that Map.');
  return {suggestions,unparsedLines,headers,warnings};
}
