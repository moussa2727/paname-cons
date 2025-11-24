import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type RendezvousDocument = Rendezvous & Document;

@Schema({
  timestamps: true,
  collection: "rendezvous",
  versionKey: "version",
  optimisticConcurrency: true,
})
export class Rendezvous {
  @Prop({ type: Number, default: 1 })
  version: number;

  @Prop({ required: true, trim: true, maxlength: 50 })
  firstName: string;

  @Prop({ required: true, trim: true, maxlength: 50 })
  lastName: string;

  @Prop({
    required: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  })
  email: string;

  @Prop({
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 20,
  })
  telephone: string;

  @Prop({
    required: true,
    type: String,
    trim: true,
    maxlength: 100,
  })
  destination: string;

  @Prop({
    trim: true,
    maxlength: 100,
    required: false,
  })
  destinationAutre?: string;

  @Prop({
    required: true,
    enum: [
      "Bac",
      "Bac+1",
      "Bac+2",
      "Licence",
      "Master I",
      "Master II",
      "Doctorat",
    ],
  })
  niveauEtude: string;

  @Prop({
    required: true,
    type: String,
    trim: true,
    maxlength: 100,
  })
  filiere: string;

  @Prop({
    trim: true,
    maxlength: 100,
    required: false,
  })
  filiereAutre?: string;

  @Prop({
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    validate: {
      validator: function (date: string) {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selectedDate >= today;
      },
      message: "La date doit être aujourd'hui ou ultérieure",
    },
  })
  date: string;

  @Prop({
    required: true,
    match: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    validate: {
      validator: function (time: string) {
        const [hours, minutes] = time.split(":").map(Number);
        const timeInHours = hours + minutes / 60;

        // Vérification des horaires de travail (9h-16h30)
        if (timeInHours < 9 || timeInHours > 16.5) {
          return false;
        }

        // Vérification des créneaux de 30 minutes
        const totalMinutes = (hours - 9) * 60 + minutes;
        return totalMinutes % 30 === 0;
      },
      message: "Créneau horaire invalide (09:00-16:30, par pas de 30min)",
    },
  })
  time: string;

  @Prop({
    required: true,
    enum: ["En attente", "Confirmé", "Terminé", "Annulé"],
    default: "En attente",
  })
  status: string;

  @Prop({
    enum: ["Favorable", "Défavorable", null],
    default: null,
  })
  avisAdmin?: string;

  @Prop({ type: Types.ObjectId, ref: "User" })
  userId?: Types.ObjectId;

  // Champs pour le soft delete
  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({
    enum: ["user", "admin"],
    required: false,
  })
  cancelledBy?: string;

  @Prop({
    type: String,
    maxlength: 500,
    required: false,
  })
  cancellationReason?: string;

  _id: any;
}

export const RendezvousSchema = SchemaFactory.createForClass(Rendezvous);

RendezvousSchema.pre("save", function (next: () => void) {
  this.increment();
  next();
});

RendezvousSchema.pre("save", function (next: () => void) {
  const selectedDate = new Date(this.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDateOnly = new Date(selectedDate);
  selectedDateOnly.setHours(0, 0, 0, 0);

  if (selectedDateOnly < today) {
    throw new Error("La date doit être aujourd'hui ou ultérieure");
  }

  // Si c'est aujourd'hui, vérifier l'heure actuelle
  if (selectedDateOnly.getTime() === today.getTime()) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [hours, minutes] = this.time.split(":").map(Number);
    const selectedTime = hours * 60 + minutes;

    if (selectedTime <= currentTime) {
      throw new Error(
        "Vous ne pouvez pas réserver un créneau passé pour aujourd'hui",
      );
    }
  }

  const [hours, minutes] = this.time.split(":").map(Number);
  const timeInMinutes = hours * 60 + minutes;
  const startTimeInMinutes = 9 * 60; // 9h00
  const endTimeInMinutes = 16 * 60 + 30; // 16h30

  if (timeInMinutes < startTimeInMinutes || timeInMinutes > endTimeInMinutes) {
    throw new Error("Les horaires disponibles sont entre 9h00 et 16h30");
  }

  // Vérifier que l'horaire est un multiple de 30 minutes depuis 9h00
  const timeSinceStart = timeInMinutes - startTimeInMinutes;
  if (timeSinceStart % 30 !== 0) {
    throw new Error(
      "Les créneaux doivent être espacés de 30 minutes (9h00, 9h30, 10h00, etc.)",
    );
  }

  // TRAITEMENT DES CHAMPS "AUTRE" - CORRECTION
  // Si destination est "Autre", vérifier que destinationAutre est rempli
  if (this.destination === "Autre") {
    if (!this.destinationAutre || this.destinationAutre.trim() === "") {
      throw new Error("Veuillez préciser votre destination");
    }
    // Utiliser la valeur personnalisée comme valeur principale
    this.destination = this.destinationAutre.trim();
  }

  // Si filière est "Autre", vérifier que filiereAutre est rempli
  if (this.filiere === "Autre") {
    if (!this.filiereAutre || this.filiereAutre.trim() === "") {
      throw new Error("Veuillez préciser votre filière");
    }
    // Utiliser la valeur personnalisée comme valeur principale
    this.filiere = this.filiereAutre.trim();
  }

  // Nettoyer les champs *_Autre si la valeur est identique à la valeur principale
  if (this.destinationAutre && this.destinationAutre === this.destination) {
    this.destinationAutre = undefined;
  }

  if (this.filiereAutre && this.filiereAutre === this.filiere) {
    this.filiereAutre = undefined;
  }

  next();
});

// Index pour les recherches courantes
RendezvousSchema.index({ email: 1 });
RendezvousSchema.index({ date: 1, time: 1 });
RendezvousSchema.index({ status: 1 });
RendezvousSchema.index({ createdAt: 1 });
RendezvousSchema.index({ destination: 1 });
