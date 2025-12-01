import { Request, Response } from 'express';
import { Protocol } from '../models/Protocol';
import { User } from '../models/User';

export const statsController = {
  // Obtener estadísticas del dashboard
  getDashboardStats: async (_req: Request, res: Response): Promise<void> => {
    try {
      // Solo calcular las métricas que se usan en el frontend
      const [
        activeProtocols,
        protocols,
        activeUsers,
        totalMedicos,
        totalInvestigadores,
      ] = await Promise.all([
        Protocol.countDocuments({ status: 'active' }),
        Protocol.find().select('sponsor').lean(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ role: 'medico', isActive: true }),
        User.countDocuments({ role: 'investigador_principal', isActive: true }),
      ]);

      // Estadísticas de protocolos por sponsor (top 5)
      const sponsorStats = protocols.reduce((acc: any, protocol: any) => {
        const sponsor = protocol.sponsor || 'Sin sponsor';
        if (!acc[sponsor]) {
          acc[sponsor] = 0;
        }
        acc[sponsor]++;
        return acc;
      }, {});

      const topSponsors = Object.entries(sponsorStats)
        .map(([sponsor, count]) => ({ sponsor, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      res.json({
        success: true,
        data: {
          protocols: {
            active: activeProtocols,
          },
          users: {
            active: activeUsers,
            medicos: totalMedicos,
            investigadores: totalInvestigadores,
          },
          topSponsors,
        },
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas',
      });
    }
  },
};

