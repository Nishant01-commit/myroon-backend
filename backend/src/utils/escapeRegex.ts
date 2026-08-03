/** Escapes regex special characters so untrusted input can be safely used inside a RegExp. */
export const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
