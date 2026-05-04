import { z } from 'zod';

/**
 * Contrato para el servicio que redacta textos clínicos (narrativa, estructura de protocolo, etc.).
 * La implementación concreta puede usar distintos proveedores técnicos.
 */
export interface RedactorService {
  buildPrompt(systemPrompt: string, userPrompt: string): string;

  /** Interpreta texto de salida y valida contra un schema Zod */
  parseResponse<T>(response: string, schema: z.ZodSchema<T>): T;

  sendMessage<T>(
    systemPrompt: string,
    userPrompt: string,
    responseSchema: z.ZodSchema<T>
  ): Promise<T>;

  /** Texto libre (p. ej. narrativa de historia clínica) */
  sendMessageText(systemPrompt: string, userPrompt: string): Promise<string>;
}
