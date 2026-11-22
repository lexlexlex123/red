export function textAlignSelf(align) {
  const value = String(align || '').trim().toLowerCase();
  if (value === 'center') return 'center';
  if (value === 'right' || value === 'end') return 'flex-end';
  if (value === 'left' || value === 'start') return 'flex-start';
  return 'stretch';
}
