import { Controller, Get, Res, Req } from "@nestjs/common";
import { Request, Response } from "express";
@Controller()
export class AppController {
  @Get()
  root(@Req() req: Request, @Res() res: Response) {
    console.log("Reçu requête pour:", req.path);
    res.status(200).json({
      status: "success",
      message: "API Paname Consulting",
      timestamp: new Date(),
      path: req.path,
    });
  }
}
