import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcrypt";
import { Model, Types } from "mongoose";
import { RegisterDto } from "../auth/dto/register.dto";
import { UpdatePasswordDto } from "../auth/dto/update-password.dto";
import { UpdateUserDto } from "../auth/dto/update-user.dto";
import { User, UserRole } from "../schemas/user.schema";
import { AuthConstants } from "../auth/auth.constants";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  private normalizeTelephone(input?: string): string {
    if (!input) return "";

    const trimmed = input.trim();
    if (trimmed === "") return "";

    const hasPlus = trimmed.startsWith("+");
    let digits = trimmed.replace(/[^\d]/g, "");

    if (!hasPlus && digits.startsWith("0")) {
      digits = "33" + digits.substring(1);
    }

    return hasPlus ? `+${digits}` : `+${digits}`;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      return user;
    }
    return null;
  }

  async exists(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).exec();
    return !!user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findByRole(role: UserRole): Promise<User | null> {
    return this.userModel.findOne({ role }).exec();
  }

  async findOne(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }
    return user;
  }

  async checkUserAccess(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) return false;
    if (user.role === UserRole.ADMIN) return true;
    if (!user.isActive) return false;
    if (user.logoutUntil && new Date() < user.logoutUntil) {
      return false;
    }
    return true;
  }

  async isMaintenanceMode(): Promise<boolean> {
    return process.env.MAINTENANCE_MODE === "true";
  }

  async setMaintenanceMode(enabled: boolean): Promise<void> {
    process.env.MAINTENANCE_MODE = enabled ? "true" : "false";
  }

  async create(createUserDto: RegisterDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new BadRequestException(
        "Un utilisateur avec cet email existe déjà",
      );
    }

    const existingAdmin = await this.findByRole(UserRole.ADMIN);
    if (existingAdmin && createUserDto.role === UserRole.ADMIN) {
      throw new BadRequestException(
        "Il ne peut y avoir qu'un seul administrateur",
      );
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      AuthConstants.BCRYPT_SALT_ROUNDS,
    );

    const normalizedTelephone = this.normalizeTelephone(
      createUserDto.telephone,
    );

    const createdUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      telephone: normalizedTelephone, // ✅ Maintenant c'est un string garanti
      role: existingAdmin ? UserRole.USER : UserRole.ADMIN,
    });

    return createdUser.save();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`🔄 Mise à jour utilisateur: ${id}`);

    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID utilisateur invalide");
    }

    const filteredUpdate = this.filterAndValidateUpdateData(updateUserDto);

    try {
      await this.verifyUserExists(id);
      await this.checkForConflicts(id, filteredUpdate);

      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, filteredUpdate, {
          new: true,
          runValidators: true,
          context: "query",
        })
        .exec();

      if (!updatedUser) {
        throw new NotFoundException("Utilisateur non trouvé après mise à jour");
      }

      this.logger.log(`✅ Utilisateur mis à jour: ${id}`);
      return updatedUser;
    } catch (error: any) {
      this.handleUpdateError(error);
    }
  }

  private filterAndValidateUpdateData(updateUserDto: UpdateUserDto): any {
    const allowedFields = ["email", "telephone"];
    const filteredUpdate: any = {};

    Object.keys(updateUserDto).forEach((key) => {
      if (
        allowedFields.includes(key) &&
        updateUserDto[key as keyof UpdateUserDto] !== undefined
      ) {
        const value = updateUserDto[key as keyof UpdateUserDto];
        if (value !== null && value !== "") {
          filteredUpdate[key] = value;
        }
      }
    });

    if (Object.keys(filteredUpdate).length === 0) {
      throw new BadRequestException("Aucune donnée valide à mettre à jour");
    }

    if (filteredUpdate.email) {
      filteredUpdate.email = filteredUpdate.email.toLowerCase().trim();
      this.validateEmail(filteredUpdate.email);
    }

    if (filteredUpdate.telephone) {
      filteredUpdate.telephone = this.normalizeTelephone(
        filteredUpdate.telephone,
      );
      this.validateTelephone(filteredUpdate.telephone);
    }

    return filteredUpdate;
  }

  private validateTelephone(telephone: string): void {
    if (telephone && telephone.length < 5) {
      throw new BadRequestException(
        "Le téléphone doit contenir au moins 5 caractères",
      );
    }
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException("Format d'email invalide");
    }
  }

  private async verifyUserExists(userId: string): Promise<void> {
    const existingUser = await this.userModel.findById(userId).exec();
    if (!existingUser) {
      throw new NotFoundException("Utilisateur non trouvé");
    }
  }

  private async checkForConflicts(
    userId: string,
    updateData: any,
  ): Promise<void> {
    if (updateData.email) {
      const existingUserWithEmail = await this.userModel
        .findOne({
          email: updateData.email,
          _id: { $ne: new Types.ObjectId(userId) },
        })
        .exec();

      if (existingUserWithEmail) {
        throw new BadRequestException("Cet email est déjà utilisé");
      }
    }

    if (updateData.telephone) {
      const existingUserWithPhone = await this.userModel
        .findOne({
          telephone: updateData.telephone,
          _id: { $ne: new Types.ObjectId(userId) },
        })
        .exec();

      if (existingUserWithPhone) {
        throw new BadRequestException(
          "Ce numéro de téléphone est déjà utilisé",
        );
      }
    }
  }

  private handleUpdateError(error: any): never {
    this.logger.error(`❌ Erreur mise à jour utilisateur: ${error.message}`);

    if (error?.code === 11000) {
      const fields = Object.keys(error.keyPattern || {});
      if (fields.includes("email")) {
        throw new BadRequestException("Cet email est déjà utilisé");
      }
      if (fields.includes("telephone")) {
        throw new BadRequestException(
          "Ce numéro de téléphone est déjà utilisé",
        );
      }
      throw new BadRequestException("Conflit de données");
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err: any) => err.message,
      );
      throw new BadRequestException(messages.join(", "));
    }

    if (error.name === "CastError") {
      throw new BadRequestException("ID utilisateur invalide");
    }

    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    throw new BadRequestException("Erreur lors de la mise à jour du profil");
  }

  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    const isMatch = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );
    if (!isMatch) {
      throw new UnauthorizedException("Mot de passe actuel incorrect");
    }

    user.password = await bcrypt.hash(
      updatePasswordDto.newPassword,
      AuthConstants.BCRYPT_SALT_ROUNDS,
    );

    await user.save();
    this.logger.log(`✅ Mot de passe mis à jour pour: ${userId}`);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    user.password = await bcrypt.hash(
      newPassword,
      AuthConstants.BCRYPT_SALT_ROUNDS,
    );

    await user.save();
    this.logger.log(`✅ Mot de passe réinitialisé pour: ${userId}`);
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException("Utilisateur non trouvé");
    }
    this.logger.log(`✅ Utilisateur supprimé: ${id}`);
  }

  async toggleStatus(id: string): Promise<User> {
    const user = await this.findById(id);
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { isActive: !user.isActive }, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException("Utilisateur non trouvé");
    }

    this.logger.log(
      `✅ Statut utilisateur modifié: ${id} -> ${updatedUser.isActive}`,
    );
    return updatedUser;
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      if (!this.userModel.db || !this.userModel.db.db) {
        return false;
      }
      await this.userModel.db.db.command({ ping: 1 });
      return true;
    } catch (error) {
      this.logger.error("Database connection check failed", error.stack);
      return false;
    }
  }

  async getStats() {
    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel.countDocuments({ role: "admin" }).exec(),
    ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminUsers,
      regularUsers: totalUsers - adminUsers,
    };
  }

  async getMaintenanceStatus() {
    return {
      isActive: await this.isMaintenanceMode(),
      logoutUntil: null,
    };
  }

  async logoutAll(): Promise<{
    message: string;
    loggedOutCount: number;
    stats: any;
  }> {
    this.logger.log(
      "🚀 Début de la déconnexion globale des utilisateurs NON-ADMIN",
    );

    const activeNonAdminUsers = await this.userModel
      .find({
        isActive: true,
        role: { $ne: UserRole.ADMIN },
      })
      .exec();

    this.logger.log(
      `📊 ${activeNonAdminUsers.length} utilisateurs non-admin actifs trouvés`,
    );

    if (activeNonAdminUsers.length === 0) {
      return {
        message: "Aucun utilisateur non-admin à déconnecter",
        loggedOutCount: 0,
        stats: {
          usersLoggedOut: 0,
          adminPreserved: true,
          timestamp: new Date().toISOString(),
        },
      };
    }

    await this.userModel.updateMany(
      { _id: { $in: activeNonAdminUsers.map((u) => u._id) } },
      {
        isActive: false,
        logoutUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastLogout: new Date(),
      },
    );

    this.logger.log(
      `✅ ${activeNonAdminUsers.length} utilisateurs non-admin déconnectés`,
    );

    return {
      message: `${activeNonAdminUsers.length} utilisateurs non-admin déconnectés avec succès - Admins préservés`,
      loggedOutCount: activeNonAdminUsers.length,
      stats: {
        usersLoggedOut: activeNonAdminUsers.length,
        adminPreserved: true,
        timestamp: new Date().toISOString(),
        userEmails: activeNonAdminUsers.map((user) => user.email),
      },
    };
  }
}
