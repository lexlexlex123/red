// Proper underlines and strike-thrus implementation
export function renderTextLabel(label, options) {
  const el = document.createElement('div');
  el.textContent = label;
  
  // Apply underline functionality based on options
  if (options.underline) {
    el.style.textDecoration = 'underline';
  }
  
  // Apply strike-through functionality based on options
  if (options.strike) {
    el.style.textDecoration = 'line-through';
  }
  
  // Handle combined underline and strike
  if (options.underline && options.strike) {
    el.style.textDecoration = 'underline line-through';
  }
  
  return el;
}