import OpenAI from 'openai';
import { z } from 'zod';
import { RedactorService } from './interfaces/redactor-service.interface';

/**
 * Implementación técnica del redactor clínico vía API de OpenAI.
 */
export class OpenAIService implements RedactorService {
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
   * Parsea la respuesta del modelo usando un schema de Zod
   * Usa safeParse para mejor manejo de errores
   * Extrae JSON incluso si hay texto adicional o comentarios
   */
  parseResponse<T>(response: string, schema: z.ZodSchema<T>): T {
    try {
      let cleanedResponse = response.trim();

      // Intentar extraer JSON si hay texto adicional
      // Buscar el primer { o [ y el último } o ]
      const jsonStart = cleanedResponse.search(/[{\[]/);
      const jsonEndMatch = cleanedResponse.match(/[}\]]/g);
      const jsonEnd = jsonEndMatch ? cleanedResponse.lastIndexOf(jsonEndMatch[jsonEndMatch.length - 1]) : -1;

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
      }

      // Remover comentarios de JavaScript (// y /* */)
      cleanedResponse = cleanedResponse
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios /* */
        .replace(/\/\/.*$/gm, '') // Remover comentarios //
        .trim();

      // Intentar parsear el JSON
      let parsed: any;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // Si falla, intentar extraer JSON usando regex más agresivo
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw parseError;
        }
      }

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
   * Envía el prompt y retorna la respuesta parseada
   */
  async sendMessage<T>(
    systemPrompt: string,
    userPrompt: string,
    responseSchema: z.ZodSchema<T>
  ): Promise<T> {
    const model = process.env.OPENAI_MODEL || 'gpt-4';

    // Los modelos que soportan response_format json_object son principalmente:
    // gpt-4-turbo, gpt-4-turbo-preview, gpt-4-0125-preview, gpt-3.5-turbo (algunos)
    // Verificamos si el modelo soporta json_object
    const supportsJsonMode = model.includes('gpt-4-turbo') ||
      model.includes('gpt-4-0125') ||
      model.includes('gpt-4-1106') ||
      model.includes('gpt-3.5-turbo-1106') ||
      model.includes('gpt-4o');

    const requestConfig: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    };

    // Solo agregar response_format si el modelo lo soporta
    if (supportsJsonMode) {
      requestConfig.response_format = { type: 'json_object' };
    } else {
      // Si no soporta json_object, agregamos instrucción en el prompt para que responda en JSON
      requestConfig.messages[1].content = `${userPrompt}\n\nIMPORTANTE: Responde ÚNICAMENTE con un JSON válido, sin texto adicional antes o después del JSON.`;
    }

    const response = await this.client.chat.completions.create(requestConfig);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    return this.parseResponse(content, responseSchema);
  }

  /**
   * Envía el prompt y retorna texto libre (sin schema)
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
