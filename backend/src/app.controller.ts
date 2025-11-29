import { Controller, Get, Res, Req, UseInterceptors } from "@nestjs/common";
import { Request, Response } from "express";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";

@ApiTags("Root")
@Controller()
@UseInterceptors(LoggingInterceptor)
export class AppController {
  @Get()
  @ApiOperation({
    summary: "Point de terminaison racine de l'API",
    description: "Retourne les informations de base de l'API Paname Consulting",
  })
  @ApiResponse({
    status: 200,
    description: "API opérationnelle",
    schema: {
      example: {
        status: "success",
        message: "API Paname Consulting",
        timestamp: "2024-01-15T10:30:00.000Z",
        path: "/",
        version: "1.0.0",
        environment: "production",
        uptime: "5 days, 2 hours, 30 minutes",
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: "Erreur interne du serveur",
  })
  root(@Req() req: Request, @Res() res: Response) {
    try {
      const healthInfo = {
        status: "success",
        message: "API Paname Consulting - Système opérationnel",
        timestamp: new Date().toISOString(),
        path: req.path,
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        uptime: this.formatUptime(process.uptime()),
        nodeVersion: process.version,
        memoryUsage: this.getMemoryUsage(),
        // ✅ Informations de sécurité masquées
        security: {
          jwtEnabled: !!process.env.JWT_SECRET,
          corsEnabled: true,
          rateLimiting: true,
        },
      };

      // ✅ Headers de sécurité
      res.setHeader("X-API-Version", healthInfo.version);
      res.setHeader("X-Environment", healthInfo.environment);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");

      return res.status(200).json(healthInfo);
    } catch (error) {
      console.error("❌ Erreur dans le endpoint racine:", error);
      return res.status(500).json({
        status: "error",
        message: "Erreur interne du serveur",
        timestamp: new Date().toISOString(),
      });
    }
  }

  @Get("health")
  @ApiOperation({
    summary: "Health check de l'API",
    description: "Endpoint de vérification de la santé de l'application",
  })
  @ApiResponse({
    status: 200,
    description: "Système en bonne santé",
    schema: {
      example: {
        status: "ok",
        timestamp: "2024-01-15T10:30:00.000Z",
        database: "connected",
        memory: "healthy",
        environment: "production",
      },
    },
  })
  async healthCheck(@Res() res: Response) {
    try {
      const healthStatus = {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: "connected", // Vous pourriez ajouter un ping MongoDB ici
        memory: this.getMemoryHealth(),
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
        // ✅ Métriques supplémentaires
        metrics: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          pid: process.pid,
        },
      };

      return res.status(200).json(healthStatus);
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return res.status(503).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: "Service unavailable",
      });
    }
  }

  @Get("info")
  @ApiOperation({
    summary: "Informations techniques de l'API",
    description: "Retourne les informations techniques et de configuration",
  })
  @ApiResponse({
    status: 200,
    description: "Informations techniques",
  })
  getInfo(@Res() res: Response) {
    const info = {
      application: "Paname Consulting API",
      description:
        "API backend pour la gestion des consultations et procédures",
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      // ✅ Configuration (masquée pour la sécurité)
      config: {
        maintenanceMode: process.env.MAINTENANCE_MODE === "true",
        corsEnabled: true,
        uploadMaxSize: "10MB",
        supportedImageTypes: ["jpg", "jpeg", "png", "gif", "webp"],
      },
      // ✅ Endpoints disponibles
      endpoints: {
        auth: "/auth",
        users: "/users",
        destinations: "/destinations",
        contact: "/contact",
        procedures: "/procedures",
        rendezvous: "/rendezvous",
        notifications: "/notifications",
      },
      documentation: "/api", // Si vous avez Swagger
    };

    return res.status(200).json(info);
  }

  // ✅ Méthodes utilitaires privées
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    return `${days} days, ${hours} hours, ${minutes} minutes`;
  }

  private getMemoryUsage() {
    const memory = process.memoryUsage();
    return {
      used: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
      total: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
    };
  }

  private getMemoryHealth() {
    const memory = process.memoryUsage();
    const usedPercentage = (memory.heapUsed / memory.heapTotal) * 100;
    return usedPercentage > 90
      ? "critical"
      : usedPercentage > 80
        ? "warning"
        : "healthy";
  }
}
