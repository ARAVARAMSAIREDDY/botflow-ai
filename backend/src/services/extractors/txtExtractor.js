export async function extractTxtText(buffer) {
  const text = buffer.toString('utf-8');
  return {
    text,
    charCount: text.length
  };
}
