import OpenAI from 'openai';
import { z } from 'zod';
import { IAIService } from './interfaces/ai-service.interface';

/**
 * Servicio de OpenAI que implementa IAIService
 */
export class OpenAIService implements IAIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno');
    }

    this.client = new OpenAI({
      apiKey,
    });
  }

  /**
   * Construye un prompt completo combinando system prompt y user prompt
   */
  buildPrompt(systemPrompt: string, userPrompt: string): string {
    return `${systemPrompt}\n\n${userPrompt}`;
  }

  /**
   * Parsea la respuesta de la IA usando un schema de Zod
   * Usa safeParse para mejor manejo de errores
   */
  parseResponse<T>(response: string, schema: z.ZodSchema<T>): T {
    try {
      const parsed = JSON.parse(response.trim());
      
      const result = schema.safeParse(parsed);
      
      if (!result.success) {
        const errorMessages = result.error.errors.map((e: z.ZodIssue) => {
          const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
          return `${path}${e.message}`;
        }).join(', ');
        throw new Error(`Error de validación: ${errorMessages}`);
      }
      
      return result.data;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Error de validación:')) {
        throw error;
      }
      throw new Error(`Error al parsear respuesta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Envía un mensaje a la IA y retorna la respuesta parseada
   */
  async sendMessage<T>(
    systemPrompt: string,
    userPrompt: string,
    responseSchema: z.ZodSchema<T>
  ): Promise<T> {
    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    return this.parseResponse(content, responseSchema);
  }

  /**
   * Envía un mensaje a la IA y retorna texto libre (sin schema)
   */
  async sendMessageText(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    return content;
  }
}
