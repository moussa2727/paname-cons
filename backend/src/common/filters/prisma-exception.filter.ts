import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientRustPanicError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erreur interne de la base de données';
    let errorCode = 'DATABASE_ERROR';
    let details: Record<string, unknown> = {};

    // Journalisation de l'erreur - format simplifié
    this.logger.error(`${request.method} ${request.url} -> ${statusCode}`);

    // Traitement selon le type d'erreur
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handleKnownRequestError(exception, response, request);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      statusCode = HttpStatus.BAD_REQUEST;
      message = 'Erreur de validation des données';
      errorCode = 'VALIDATION_ERROR';
      details = {
        validationError: exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Erreur d'initialisation de la base de données";
      errorCode = 'DATABASE_INIT_ERROR';
      details = {
        errorCode: exception.errorCode,
        message: exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientRustPanicError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Erreur critique du moteur de base de données';
      errorCode = 'DATABASE_PANIC';
    }

    response.status(statusCode).json({
      statusCode,
      message,
      errorCode,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private handleKnownRequestError(
    exception: Prisma.PrismaClientKnownRequestError,
    response: Response,
    request: Request,
  ) {
    const { code, meta } = exception;

    this.logger.debug(`Prisma error code: ${code}`, { meta });

    let errorResponse: {
      statusCode: number;
      message: string;
      errorCode: string;
    };

    switch (code) {
      case 'P2002':
        errorResponse = {
          statusCode: HttpStatus.CONFLICT,
          message: 'Conflit de données - Enregistrement déjà existant',
          errorCode: 'DUPLICATE_RESOURCE',
        };
        break;

      case 'P2025':
        errorResponse = {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Enregistrement non trouvé',
          errorCode: 'RESOURCE_NOT_FOUND',
        };
        break;

      case 'P2003':
        errorResponse = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Erreur de contrainte de clé étrangère',
          errorCode: 'FOREIGN_KEY_CONSTRAINT',
        };
        break;

      case 'P2014':
        errorResponse = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Erreur de contrainte',
          errorCode: 'CONSTRAINT_VIOLATION',
        };
        break;

      case 'P2021':
        errorResponse = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Connexion à la base de données impossible',
          errorCode: 'DATABASE_CONNECTION',
        };
        break;

      case 'P2022':
        errorResponse = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'La valeur de la colonne est trop longue',
          errorCode: 'VALUE_TOO_LONG',
        };
        break;

      case 'P2023':
        errorResponse = {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Type de données invalide',
          errorCode: 'INVALID_DATA_TYPE',
        };
        break;

      default:
        errorResponse = {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erreur de base de données inconnue',
          errorCode: 'DATABASE_ERROR',
        };
        break;
    }

    response.status(errorResponse.statusCode).json({
      statusCode: errorResponse.statusCode,
      message: errorResponse.message,
      errorCode: errorResponse.errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
