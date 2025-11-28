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
  constructor(private readonly rendezvousService: RendezvousService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  create(@Body() createDto: CreateRendezvousDto, @Req() _req: any) {
    return this.rendezvousService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(
    @Req() _req: any,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
    @Query("status") status?: string,
    @Query("date") date?: string,
    @Query("search") search?: string,
  ) {
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
    return this.rendezvousService.findByUser(email, page, limit, status);
  }

  @Get("available-slots")
  getAvailableSlots(@Query("date") date: string) {
    return this.rendezvousService.getAvailableSlots(date);
  }

  @Get("available-dates")
  async getAvailableDates() {
    return this.rendezvousService.getAvailableDates();
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  async findOne(@Param("id") id: string) {
    if (id === "stats") {
      throw new BadRequestException("Invalid rendezvous ID");
    }
    return this.rendezvousService.findOne(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(
    @Param("id") id: string,
    @Body() updateDto: UpdateRendezvousDto,
    @Req() _req: any,
  ) {
    return this.rendezvousService.update(id, updateDto, _req.user);
  }

  @Put(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("avisAdmin") avisAdmin?: string,
    @Req() _req?: any,
  ) {
    return this.rendezvousService.updateStatus(
      id,
      status,
      avisAdmin,
      _req.user,
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  remove(@Param("id") id: string, @Req() _req: any) {
    return this.rendezvousService.removeWithPolicy(id, _req.user);
  }

  @Put(":id/confirm")
  @UseGuards(JwtAuthGuard)
  async confirmRendezvous(@Param("id") id: string, @Req() _req: any) {
    return this.rendezvousService.confirmByUser(id, _req.user);
  }
}
