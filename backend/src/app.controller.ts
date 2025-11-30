import { Controller, Get, Res, Req, UseInterceptors } from "@nestjs/common";
import { Request, Response } from "express";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";

@Controller()
@UseInterceptors(LoggingInterceptor)
export class AppController {
  @Get()
  root(@Req() req: Request, @Res() res: Response) {
    try {
      const apiInfo = {
        status: "success",
        message: "API Paname Consulting",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
      };

      // ✅ Headers de sécurité
      res.setHeader("X-API-Version", apiInfo.version);
      res.setHeader("X-Environment", apiInfo.environment);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");

      return res.status(200).json(apiInfo);
    } catch (error) {
      console.error("❌ Erreur dans le endpoint racine:", error);
      return res.status(500).json({
        status: "error",
        message: "Erreur interne du serveur",
        timestamp: new Date().toISOString(),
      });
    }
  }
}