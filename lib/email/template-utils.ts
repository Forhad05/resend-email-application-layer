export interface TemplateVariableMap {
  [key: string]: string;
}

/**
 * Interpolates variables within a string using {{variable_name}} syntax.
 * Safe for use in both Server and Client Components.
 */
export function interpolateTemplate(
  content: string,
  variables: TemplateVariableMap
): string {
  if (!content) return "";
  return content.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : match;
  });
}

