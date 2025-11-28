import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/shared/guards/jwt-auth.guard";
import { RolesGuard } from "@/shared/guards/roles.guard";
import { CreateRendezvousDto } from "./dto/create-rendezvous.dto";
import { UpdateRendezvousDto } from "./dto/update-rendezvous.dto";
import { RendezvousService } from "./rendez-vous.service";
import { UserRole } from "@/schemas/user.schema";
import { Roles } from "@/shared/decorators/roles.decorator";

@Controller("rendezvous")
export class RendezvousController {
  private readonly logger = new Logger(RendezvousController.name);

  constructor(private readonly rendezvousService: RendezvousService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  create(@Body() createDto: CreateRendezvousDto, @Req() req: any) {
    const maskedEmail = this.maskEmail(req.user?.email);
    this.logger.log(`Création rendez-vous par: ${maskedEmail}`);
    
    return this.rendezvousService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Req() req: any,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: string,
    @Query("date") date?: string,
    @Query("search") search?: string,
  ) {
    const maskedEmail = this.maskEmail(req.user?.email);
    this.logger.log(`Liste rendez-vous admin - Page: ${page}, Limit: ${limit}, Filtres: ${JSON.stringify({ status, date, search: search ? 'avec recherche' : 'sans recherche' })} par: ${maskedEmail}`);
    
    return this.rendezvousService.findAll(page, limit, status, date, search);
  }

  @Get("user")
  @UseGuards(JwtAuthGuard)
  findByUser(
    @Query("email") email: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: string,
  ) {
    const maskedEmail = this.maskEmail(email);
    this.logger.log(`Liste rendez-vous utilisateur - Email: ${maskedEmail}, Page: ${page}, Limit: ${limit}, Statut: ${status || 'tous'}`);
    
    return this.rendezvousService.findByUser(email, page, limit, status);
  }

  @Get("available-slots")
  getAvailableSlots(@Query("date") date: string) {
    this.logger.log(`Récupération créneaux disponibles pour: ${date}`);
    
    return this.rendezvousService.getAvailableSlots(date);
  }

  @Get("available-dates")
  async getAvailableDates() {
    this.logger.log("Récupération dates disponibles");
    
    const dates = await this.rendezvousService.getAvailableDates();
    
    this.logger.log(`Dates disponibles récupérées: ${dates.length} dates`);
    
    return dates;
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async findOne(@Param("id") id: string) {
    if (id === "stats") {
      throw new BadRequestException("Invalid rendezvous ID");
    }
    
    const maskedId = this.maskId(id);
    this.logger.log(`Consultation rendez-vous: ${maskedId}`);
    
    const rendezvous = await this.rendezvousService.findOne(id);
    
    this.logger.log(`Rendez-vous consulté: ${maskedId}`);
    
    return rendezvous;
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateRendezvousDto,
    @Req() req: any,
  ) {
    const maskedId = this.maskId(id);
    const maskedEmail = this.maskEmail(req.user?.email);
    this.logger.log(`Modification rendez-vous: ${maskedId} par: ${maskedEmail}`);
    
    return this.rendezvousService.update(id, updateDto, req.user);
  }

  @Put(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("avisAdmin") avisAdmin?: string,
    @Req() req?: any,
  ) {
    const maskedId = this.maskId(id);
    const maskedEmail = this.maskEmail(req?.user?.email);
    this.logger.log(`Changement statut rendez-vous: ${maskedId} - Nouveau statut: ${status} par: ${maskedEmail}`);
    
    return this.rendezvousService.updateStatus(
      id,
      status,
      avisAdmin,
      req.user,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") id: string, @Req() req: any) {
    const maskedId = this.maskId(id);
    const maskedEmail = this.maskEmail(req.user?.email);
    this.logger.log(`Suppression rendez-vous: ${maskedId} par: ${maskedEmail}`);
    
    return this.rendezvousService.removeWithPolicy(id, req.user);
  }

  @Put(":id/confirm")
  @UseGuards(JwtAuthGuard)
  async confirmRendezvous(@Param("id") id: string, @Req() req: any) {
    const maskedId = this.maskId(id);
    const maskedEmail = this.maskEmail(req.user?.email);
    this.logger.log(`Confirmation rendez-vous: ${maskedId} par: ${maskedEmail}`);
    
    return this.rendezvousService.confirmByUser(id, req.user);
  }

  // ==================== UTILITY METHODS ====================

  private maskEmail(email: string): string {
    if (!email) return "***";
    const [name, domain] = email.split("@");
    if (!name || !domain) return "***";

    const maskedName =
      name.length > 2
        ? name.substring(0, 2) + "*".repeat(Math.max(name.length - 2, 1))
        : "*".repeat(name.length);

    return `${maskedName}@${domain}`;
  }

  private maskId(id: string): string {
    if (!id || id.length < 8) return "***";
    return id.substring(0, 4) + "***" + id.substring(id.length - 4);
  }
}