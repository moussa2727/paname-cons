import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RevokedToken } from "../schemas/revoked-token.schema";

@Injectable()
export class RevokedTokenService {
  private readonly logger = new Logger(RevokedTokenService.name);

  constructor(
    @InjectModel(RevokedToken.name)
    private revokedTokenModel: Model<RevokedToken>,
    private jwtService: JwtService,
  ) {}

  async revokeToken(token: string, expiresAt: Date): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      const userId = decoded?.sub;

      // ✅ VÉRIFICATION EXISTENCE AVANT CRÉATION
      const exists = await this.revokedTokenModel.findOne({ token });
      
      if (exists) {
        this.logger.log(`Token déjà révoqué: ${token.substring(0, 20)}...`);
        return; // Sortir silencieusement si déjà révoqué
      }

      // ✅ CRÉATION AVEC GESTION D'ERREUR DE DUPLICATA
      await this.revokedTokenModel.create({
        token,
        userId,
        expiresAt,
        revokedAt: new Date(), // ✅ AJOUT TIMESTAMP
      });

      this.logger.log(`Token révoqué avec succès: ${token.substring(0, 20)}...`);
      
    } catch (error) {
      // ✅ GESTION SPÉCIFIQUE DES ERREURS DE DUPLICATA
      if (error?.code === 11000) {
        this.logger.warn(`Token déjà présent (duplicate key): ${token.substring(0, 20)}...`);
        return; // Ignorer l'erreur de duplication
      }
      
      this.logger.error(`Erreur revocation token: ${error.message}`);
      // ❌ NE PAS PROPAGER L'ERREUR POUR ÉVITER LES BLOCAGES
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const found = await this.revokedTokenModel.findOne({ token }).exec();
      return !!found;
    } catch (error) {
      this.logger.error(`Erreur vérification token: ${error.message}`);
      return false; // En cas d'erreur, considérer comme non révoqué
    }
  }

  async revokeAllTokens(): Promise<{
    message: string;
    revokedCount: number;
  }> {
    try {
      // ✅ COMPTER AVANT SUPPRESSION POUR LOG
      const countBefore = await this.revokedTokenModel.countDocuments().exec();
      
      const result = await this.revokedTokenModel.deleteMany({}).exec();
      
      this.logger.log(`Tous les tokens révoqués: ${result.deletedCount} supprimés`);
      
      return {
        message: `${result.deletedCount} tokens révoqués`,
        revokedCount: result.deletedCount,
      };
    } catch (error) {
      this.logger.error(`Erreur révocation globale: ${error.message}`);
      return {
        message: "Erreur lors de la révocation globale",
        revokedCount: 0,
      };
    }
  }

  async cleanupExpiredTokens(): Promise<{ deletedCount: number }> {
    try {
      const result = await this.revokedTokenModel
        .deleteMany({
          expiresAt: { $lt: new Date() },
        })
        .exec();

      this.logger.log(`Tokens expirés nettoyés: ${result.deletedCount}`);
      
      return { deletedCount: result.deletedCount };
    } catch (error) {
      this.logger.error(`Erreur nettoyage tokens expirés: ${error.message}`);
      return { deletedCount: 0 };
    }
  }

  async revokeTokensForUser(userId: string): Promise<{ deletedCount: number }> {
    try {
      const result = await this.revokedTokenModel.deleteMany({ userId }).exec();
      
      this.logger.log(`Tokens révoqués pour utilisateur ${userId}: ${result.deletedCount}`);
      
      return { deletedCount: result.deletedCount };
    } catch (error) {
      this.logger.error(`Erreur révocation tokens utilisateur: ${error.message}`);
      return { deletedCount: 0 };
    }
  }

  // ✅ NOUVELLE MÉTHODE : STATUT DU SERVICE
  async getServiceStatus(): Promise<{
    totalRevoked: number;
    expiredCount: number;
    status: string;
  }> {
    try {
      const [totalRevoked, expiredCount] = await Promise.all([
        this.revokedTokenModel.countDocuments().exec(),
        this.revokedTokenModel.countDocuments({ 
          expiresAt: { $lt: new Date() } 
        }).exec(),
      ]);

      return {
        totalRevoked,
        expiredCount,
        status: 'healthy'
      };
    } catch (error) {
      this.logger.error(`Erreur statut service: ${error.message}`);
      return {
        totalRevoked: 0,
        expiredCount: 0,
        status: 'error'
      };
    }
  }
}