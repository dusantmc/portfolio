export interface EditElement {
  id: string;
  type: 'text' | 'signature';
  page: number;
  x: number;
  y: number;
  // Text-specific
  text?: string;
  fontSize?: number;
  bold?: boolean;
  color?: string;
  // Signature-specific
  signatureUrl?: string;
  width?: number;
  height?: number;
}
