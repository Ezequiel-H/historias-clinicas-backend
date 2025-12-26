import { z } from 'zod';

/**
 * Interfaz base para servicios de IA
 * Permite cambiar fácilmente entre diferentes proveedores (OpenAI, Anthropic, etc.)
 */
export interface IAIService {
  /**
   * Construye un prompt completo a partir de un system prompt y user prompt
   */
  buildPrompt(systemPrompt: string, userPrompt: string): string;

  /**
   * Parsea la respuesta de la IA usando un schema de Zod
   */
  parseResponse<T>(response: string, schema: z.ZodSchema<T>): T;

  /**
   * Envía un mensaje a la IA y retorna la respuesta parseada
   */
  sendMessage<T>(
    systemPrompt: string,
    userPrompt: string,
    responseSchema: z.ZodSchema<T>
  ): Promise<T>;
}
