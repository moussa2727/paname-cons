import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Health")
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: "Health check" })
  getHealth() {
    return {
      message: "Paname Consulting API is running",
      status: "OK",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };
  }
}
