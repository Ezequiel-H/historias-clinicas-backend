import { z } from 'zod';
import { VisitSchema } from './visit.schema';

/**
 * Schema de Zod para validación de protocolos completos generados desde la sistemática
 * Basado en el ejemplo JSON proporcionado y la estructura del modelo IProtocol
 */
export const ProtocolGenerationSchema = z.object({
    name: z.string().min(1, 'El nombre del protocolo es requerido'),
    code: z.string().min(1, 'El código del protocolo es requerido'),
    sponsor: z.string().min(1, 'El sponsor es requerido'),
    description: z.string().min(1, 'La descripción es requerida'),
    visits: z.array(VisitSchema).min(1, 'Debe haber al menos una visita'),
});

/**
 * Tipo TypeScript inferido del schema de Protocol Generation
 */
export type ProtocolGenerationSchemaType = z.infer<typeof ProtocolGenerationSchema>;

