/** PPTX import — React path (JSZip in host). */
export async function importPptxFile(file) {
  if (!file) return false;
  const { importPptxFile: run } = await import('../editor/pptxImport.js');
  return run(file);
}

export default { importPptxFile };
