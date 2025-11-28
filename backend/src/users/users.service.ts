import{
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
  private readonly cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // 🔧 Méthodes utilitaires
  private normalizeTelephone(input?: string): string | undefined {
    if (!input) return undefined;

    const trimmed = input.trim();
    if (trimmed === "") return undefined;

    // Extraire uniquement les chiffres
    const digitsOnly = trimmed.replace(/\D/g, "");

    // Validation minimale : au moins 5 chiffres
    if (digitsOnly.length < 5) {
      return undefined;
    }

    return digitsOnly;
  }

  private getCacheKey(method: string, identifier: string): string {
    return `${method}:${identifier}`;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private clearUserCache(userId?: string): void {
    if (userId) {
      // Supprimer tous les caches liés à cet utilisateur
      for (const key of this.cache.keys()) {
        if (key.includes(userId)) {
          this.cache.delete(key);
        }
      }
    }
    // Supprimer les caches globaux
    for (const key of this.cache.keys()) {
      if (key.startsWith("findAll:") || key.startsWith("getStats:")) {
        this.cache.delete(key);
      }
    }
  }

  private maskEmail(email: string): string {
    if (!email) return 'email_inconnu';
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) return 'email_invalide';
    
    const maskedLocal = localPart.length <= 2 
      ? localPart.charAt(0) + '*'
      : localPart.charAt(0) + '***' + localPart.charAt(localPart.length - 1);
    
    return `${maskedLocal}@${domain}`;
  }

  private maskUserId(userId: string): string {
    if (!userId) return 'user_inconnu';
    return userId.length <= 8 ? userId : userId.substring(0, 4) + '***' + userId.substring(userId.length - 4);
  }

  // 🔐 Méthodes d'authentification
  async validateUser(email: string, password: string): Promise<User | null> {
    const cacheKey = this.getCacheKey("validateUser", email);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.findByEmail(email);
    if (user && (await bcrypt.compare(password, user.password))) {
      this.setCache(cacheKey, user);
      this.logger.log(`Validation utilisateur réussie: ${this.maskEmail(email)}`);
      return user;
    }
    
    this.logger.warn(`Échec validation utilisateur: ${this.maskEmail(email)}`);
    return null;
  }

  async exists(userId: string): Promise<boolean> {
    const cacheKey = this.getCacheKey("exists", userId);
    const cached = this.getCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const user = await this.userModel
      .findById(userId)
      .select("_id")
      .lean()
      .exec();
    const exists = !!user;
    this.setCache(cacheKey, exists);
    return exists;
  }

  // 👤 Méthodes de recherche
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const cacheKey = this.getCacheKey("findByEmail", normalizedEmail);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userModel
      .findOne({ email: normalizedEmail })
      .exec();
    this.setCache(cacheKey, user);
    return user;
  }

  async findByRole(role: UserRole): Promise<User | null> {
    const cacheKey = this.getCacheKey("findByRole", role);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userModel.findOne({ role }).exec();
    this.setCache(cacheKey, user);
    return user;
  }

  async findOne(id: string): Promise<User | null> {
    if (!Types.ObjectId.isValid(id)) {
      this.logger.warn(`Tentative de recherche avec ID invalide: ${id}`);
      return null;
    }

    const cacheKey = this.getCacheKey("findOne", id);
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userModel.findById(id).exec();
    this.setCache(cacheKey, user);
    
    if (user) {
      this.logger.debug(`Utilisateur trouvé: ${this.maskUserId(id)}`);
    } else {
      this.logger.debug(`Utilisateur non trouvé: ${this.maskUserId(id)}`);
    }
    
    return user;
  }

  async findAll(): Promise<User[]> {
    const cacheKey = this.getCacheKey("findAll", "all");
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.logger.debug(`Liste utilisateurs récupérée depuis le cache: ${cached.length} utilisateurs`);
      return cached;
    }

    const users = await this.userModel.find().select("-password").exec();
    this.setCache(cacheKey, users);
    this.logger.debug(`Liste utilisateurs récupérée depuis la base: ${users.length} utilisateurs`);
    return users;
  }

  async findById(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      this.logger.warn(`Utilisateur non trouvé: ${this.maskUserId(id)}`);
      throw new NotFoundException("Utilisateur non trouvé");
    }
    return user;
  }

  // 🔒 Méthodes d'accès et sécurité
  async checkUserAccess(userId: string): Promise<boolean> {
    const cacheKey = this.getCacheKey("checkUserAccess", userId);
    const cached = this.getCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.warn(`Vérification accès - Utilisateur non trouvé: ${this.maskUserId(userId)}`);
      this.setCache(cacheKey, false);
      return false;
    }

    if (user.role === UserRole.ADMIN) {
      this.setCache(cacheKey, true);
      return true;
    }

    if (!user.isActive) {
      this.logger.warn(`Vérification accès - Utilisateur inactif: ${this.maskUserId(userId)}`);
      this.setCache(cacheKey, false);
      return false;
    }

    if (user.logoutUntil && new Date() < user.logoutUntil) {
      this.logger.warn(`Vérification accès - Utilisateur temporairement déconnecté: ${this.maskUserId(userId)}`);
      this.setCache(cacheKey, false);
      return false;
    }

    this.setCache(cacheKey, true);
    return true;
  }

  async isMaintenanceMode(): Promise<boolean> {
    const cacheKey = this.getCacheKey("isMaintenanceMode", "status");
    const cached = this.getCache(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const isMaintenance = process.env.MAINTENANCE_MODE === "true";
    this.setCache(cacheKey, isMaintenance);
    return isMaintenance;
  }

  async setMaintenanceMode(enabled: boolean): Promise<void> {
    this.logger.log(`Changement mode maintenance: ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
    process.env.MAINTENANCE_MODE = enabled ? "true" : "false";
    this.clearUserCache(); // Vider le cache car les permissions peuvent changer
  }

  // ➕ Méthodes de création
  async create(createUserDto: RegisterDto): Promise<User> {
    const maskedEmail = this.maskEmail(createUserDto.email);
    this.logger.log(`Début création utilisateur: ${maskedEmail}`);

    try {
      // Vérifier l'email
      const existingUserWithEmail = await this.findByEmail(createUserDto.email);
      if (existingUserWithEmail) {
        this.logger.warn(`Email déjà utilisé: ${maskedEmail}`);
        throw new BadRequestException("Cet email est déjà utilisé");
      }

      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        AuthConstants.BCRYPT_SALT_ROUNDS,
      );

      // Normalisation du téléphone
      const normalizedTelephone = this.normalizeTelephone(
        createUserDto.telephone,
      );

      const userData: any = {
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        email: createUserDto.email.toLowerCase().trim(),
        password: hashedPassword,
        isActive: true,
      };

      // Ajouter le téléphone seulement s'il est valide
      if (normalizedTelephone) {
        userData.telephone = normalizedTelephone;
      } else {
        this.logger.warn(`Téléphone invalide pour: ${maskedEmail}`);
        throw new BadRequestException("Le numéro de téléphone est invalide");
      }

      const user = new this.userModel(userData);
      const savedUser = await user.save();

      // Nettoyer le cache après création
      this.clearUserCache();

      this.logger.log(`Utilisateur créé avec succès: ${maskedEmail}, ID: ${this.maskUserId(savedUser._id.toString())}`);
      return savedUser;
    } catch (error: any) {
      // Gestion des erreurs MongoDB
      if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        if (field === "email") {
          this.logger.warn(`Conflit email: ${maskedEmail}`);
          throw new BadRequestException("Cet email est déjà utilisé");
        }
      }

      // Propager les erreurs métier existantes
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Erreur création utilisateur ${maskedEmail}: ${error.message}`);
      throw new BadRequestException("Erreur lors de la création du compte");
    }
  }

  // ✏️ Méthodes de mise à jour
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const maskedId = this.maskUserId(id);
    this.logger.log(`Début mise à jour utilisateur: ${maskedId}`);

    // Validation de l'ID
    if (!id || !Types.ObjectId.isValid(id)) {
      this.logger.warn(`ID utilisateur invalide: ${id}`);
      throw new BadRequestException("ID utilisateur invalide");
    }

    // Filtrer et valider les données
    const filteredUpdate = this.filterAndValidateUpdateData(updateUserDto);

    try {
      // Vérifier l'existence de l'utilisateur
      await this.verifyUserExists(id);

      // Vérifier les conflits avant mise à jour
      await this.checkForConflicts(id, filteredUpdate);

      // Effectuer la mise à jour
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, filteredUpdate, {
          new: true,
          runValidators: true,
          context: "query",
        })
        .select("-password")
        .exec();

      if (!updatedUser) {
        this.logger.error(`Utilisateur non trouvé après mise à jour: ${maskedId}`);
        throw new NotFoundException("Utilisateur non trouvé après mise à jour");
      }

      // Nettoyer le cache après mise à jour
      this.clearUserCache(id);

      this.logger.log(`Utilisateur mis à jour avec succès: ${maskedId}`);
      return updatedUser;
    } catch (error: any) {
      this.handleUpdateError(error, maskedId);
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

    // Normalisation
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

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException("Format d'email invalide");
    }
  }

  private validateTelephone(telephone: string | undefined): void {
    if (telephone && telephone.length < 5) {
      throw new BadRequestException(
        "Le téléphone doit contenir au moins 5 caractères",
      );
    }
  }

  private async verifyUserExists(userId: string): Promise<void> {
    const existingUser = await this.userModel
      .findById(userId)
      .select("_id")
      .exec();
    if (!existingUser) {
      this.logger.warn(`Utilisateur non trouvé: ${this.maskUserId(userId)}`);
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
        .select("_id")
        .exec();

      if (existingUserWithEmail) {
        this.logger.warn(`Conflit email: ${this.maskEmail(updateData.email)} déjà utilisé`);
        throw new BadRequestException("Cet email est déjà utilisé");
      }
    }

    if (updateData.telephone) {
      const existingUserWithPhone = await this.userModel
        .findOne({
          telephone: updateData.telephone,
          _id: { $ne: new Types.ObjectId(userId) },
        })
        .select("_id")
        .exec();

      if (existingUserWithPhone) {
        this.logger.warn(`Conflit téléphone: ${updateData.telephone} déjà utilisé`);
        throw new BadRequestException(
          "Ce numéro de téléphone est déjà utilisé",
        );
      }
    }
  }

  private handleUpdateError(error: any, userId: string): never {
    if (error?.code === 11000) {
      const fields = Object.keys(error.keyPattern || {});
      if (fields.includes("email")) {
        this.logger.warn(`Erreur duplication email pour: ${userId}`);
        throw new BadRequestException("Cet email est déjà utilisé");
      }
      if (fields.includes("telephone")) {
        this.logger.warn(`Erreur duplication téléphone pour: ${userId}`);
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
      this.logger.warn(`Erreur validation pour ${userId}: ${messages.join(', ')}`);
      throw new BadRequestException(messages.join(", "));
    }

    if (error.name === "CastError") {
      this.logger.warn(`ID utilisateur invalide: ${userId}`);
      throw new BadRequestException("ID utilisateur invalide");
    }

    // Propager les erreurs métier existantes
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    }

    this.logger.error(`Erreur inattendue pour ${userId}: ${error.message}`, error.stack);
    throw new BadRequestException("Erreur lors de la mise à jour du profil");
  }

  // 🔑 Méthodes de gestion des mots de passe
  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const maskedId = this.maskUserId(userId);
    this.logger.log(`Début changement mot de passe: ${maskedId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.warn(`Utilisateur non trouvé pour changement mot de passe: ${maskedId}`);
      throw new NotFoundException("Utilisateur non trouvé");
    }

    const isMatch = await bcrypt.compare(
      updatePasswordDto.currentPassword,
      user.password,
    );
    if (!isMatch) {
      this.logger.warn(`Mot de passe actuel incorrect: ${maskedId}`);
      throw new UnauthorizedException("Mot de passe actuel incorrect");
    }

    user.password = await bcrypt.hash(
      updatePasswordDto.newPassword,
      AuthConstants.BCRYPT_SALT_ROUNDS,
    );

    await user.save();
    this.clearUserCache(userId);
    
    this.logger.log(`Mot de passe changé avec succès: ${maskedId}`);
  }

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const maskedId = this.maskUserId(userId);
    this.logger.log(`Réinitialisation mot de passe: ${maskedId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      this.logger.warn(`Utilisateur non trouvé pour réinitialisation: ${maskedId}`);
      throw new NotFoundException("Utilisateur non trouvé");
    }

    user.password = await bcrypt.hash(
      newPassword,
      AuthConstants.BCRYPT_SALT_ROUNDS,
    );

    await user.save();
    this.clearUserCache(userId);
    
    this.logger.log(`Mot de passe réinitialisé: ${maskedId}`);
  }

  // 🗑️ Méthodes de suppression
  async delete(id: string): Promise<void> {
    const maskedId = this.maskUserId(id);
    this.logger.log(`Début suppression utilisateur: ${maskedId}`);

    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      this.logger.warn(`Utilisateur non trouvé pour suppression: ${maskedId}`);
      throw new NotFoundException("Utilisateur non trouvé");
    }
    
    this.clearUserCache(id);
    this.logger.log(`Utilisateur supprimé: ${maskedId}`);
  }

  async toggleStatus(id: string): Promise<User> {
    const maskedId = this.maskUserId(id);
    this.logger.log(`Changement statut utilisateur: ${maskedId}`);

    const user = await this.findById(id);
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { isActive: !user.isActive }, { new: true })
      .select("-password")
      .exec();

    if (!updatedUser) {
      this.logger.error(`Utilisateur non trouvé après changement statut: ${maskedId}`);
      throw new NotFoundException("Utilisateur non trouvé");
    }

    this.clearUserCache(id);
    this.logger.log(`Statut utilisateur modifié: ${maskedId}, Actif: ${updatedUser.isActive}`);
    return updatedUser;
  }

  // 📊 Méthodes de statistiques et monitoring
  async checkDatabaseConnection(): Promise<boolean> {
    try {
      if (!this.userModel.db || !this.userModel.db.db) {
        this.logger.error("Connexion base de données non disponible");
        return false;
      }
      await this.userModel.db.db.command({ ping: 1 });
      this.logger.debug("Connexion base de données vérifiée avec succès");
      return true;
    } catch (error) {
      this.logger.error("Échec vérification connexion base de données", error.stack);
      return false;
    }
  }

  async getStats() {
    const cacheKey = this.getCacheKey("getStats", "all");
    const cached = this.getCache(cacheKey);
    if (cached) {
      this.logger.debug("Statistiques récupérées depuis le cache");
      return cached;
    }

    const [totalUsers, activeUsers, adminUsers] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ isActive: true }).exec(),
      this.userModel.countDocuments({ role: "admin" }).exec(),
    ]);

    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminUsers,
      regularUsers: totalUsers - adminUsers,
    };

    this.setCache(cacheKey, stats);
    this.logger.debug(`Statistiques générées - Total: ${totalUsers}, Actifs: ${activeUsers}, Admins: ${adminUsers}`);
    return stats;
  }

  async getMaintenanceStatus() {
    const cacheKey = this.getCacheKey("getMaintenanceStatus", "status");
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const status = {
      isActive: await this.isMaintenanceMode(),
      logoutUntil: null,
    };

    this.setCache(cacheKey, status);
    return status;
  }

  // 🧹 Méthode de nettoyage du cache (pour les tests ou maintenance)
  async clearAllCache(): Promise<void> {
    const cacheSize = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cache utilisateur vidé - ${cacheSize} entrées supprimées`);
  }
}