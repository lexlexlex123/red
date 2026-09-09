/** OBJ insert — React host (no legacy iframe). */
export async function insertModel3d() {
  const { editorApi } = await import('../editor/editorApi.js');
  return editorApi.addModel3dFromFile();
}

export default { insertModel3d };
