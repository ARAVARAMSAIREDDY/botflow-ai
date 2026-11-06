export async function extractCsvText(buffer) {
  const content = buffer.toString('utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return { text: '', rowCount: 0 };
  }

  const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const rowDetails = header.map((col, idx) => `${col}: ${values[idx] || 'N/A'}`).join(' | ');
    records.push(`Row ${i}: ${rowDetails}`);
  }

  return {
    text: records.join('\n'),
    rowCount: lines.length - 1,
    headers: header
  };
}
