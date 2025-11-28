import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Model, Types } from "mongoose";

export enum StepStatus {
  PENDING = "En attente",
  IN_PROGRESS = "En cours",
  COMPLETED = "Terminé",
  REJECTED = "Rejeté",
  CANCELLED = "Annulé",
}

export enum StepName {
  DEMANDE_ADMISSION = "DEMANDE ADMISSION",
  DEMANDE_VISA = "DEMANDE VISA",
  PREPARATIF_VOYAGE = "PREPARATIF VOYAGE",
}

export enum ProcedureStatus {
  IN_PROGRESS = "En cours",
  COMPLETED = "Terminée",
  REJECTED = "Refusée",
  CANCELLED = "Annulée",
}

@Schema({ _id: false })
export class Step {
  @Prop({ type: String, enum: StepName, required: true })
  nom: StepName;

  @Prop({
    type: String,
    enum: StepStatus,
    default: StepStatus.PENDING,
    required: true,
  })
  statut: StepStatus;

  @Prop({ type: String, required: false })
  raisonRefus?: string;

  @Prop({ type: Date, default: Date.now })
  dateMaj: Date;

  @Prop({ type: Date, default: Date.now })
  dateCreation: Date;

  @Prop({ type: Date, required: false })
  dateCompletion?: Date;
}

export const StepSchema = SchemaFactory.createForClass(Step);

// Interface pour les méthodes d'instance
export interface ProcedureMethods {
  updateGlobalStatus(): void;
  addStep(stepName: StepName): void;
  updateStep(stepName: StepName, updates: Partial<Step>): void;
}

// Interface pour les méthodes statiques
export interface ProcedureModel extends Model<Procedure, object, ProcedureMethods> {
  findByRendezvousId(rendezVousId: Types.ObjectId): Promise<Procedure>;
  findByUserEmail(email: string): Promise<Procedure[]>;
}

@Schema({
  timestamps: true,
  collection: "procedures",
})
export class Procedure extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: "Rendezvous",
    required: true,
    unique: true,
  })
  rendezVousId: Types.ObjectId;

  @Prop({ type: String, required: true })
  prenom: string;

  @Prop({ type: String, required: true })
  nom: string;

  @Prop({ type: String, required: true })
  email: string;

  @Prop({ type: String, required: true })
  destination: string;

  @Prop({
    type: String,
    enum: ProcedureStatus,
    default: ProcedureStatus.IN_PROGRESS,
  })
  statut: ProcedureStatus;

  @Prop({ type: [StepSchema], default: [] })
  steps: Step[];

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: String })
  deletionReason?: string;

  @Prop({ type: String })
  raisonRejet?: string;

  @Prop({ type: Date })
  dateCompletion?: Date;

  @Prop({ type: Date, default: Date.now })
  dateDerniereModification?: Date;

  updateGlobalStatus?: () => void;
  addStep?: (stepName: StepName) => void;
  updateStep?: (stepName: StepName, updates: Partial<Step>) => void;
}

export const ProcedureSchema = SchemaFactory.createForClass(Procedure);

// ==================== MÉTHODES D'INSTANCE ====================

ProcedureSchema.methods.updateGlobalStatus = function () {
  const procedure = this as any;

  if (!procedure.steps || procedure.steps.length === 0) {
    procedure.statut = ProcedureStatus.IN_PROGRESS;
    return;
  }

  const allCompleted = procedure.steps.every(
    (step: Step) => step.statut === StepStatus.COMPLETED,
  );
  const anyRejected = procedure.steps.some(
    (step: Step) => step.statut === StepStatus.REJECTED,
  );
  const anyCancelled = procedure.steps.some(
    (step: Step) => step.statut === StepStatus.CANCELLED,
  );

  if (anyRejected) {
    procedure.statut = ProcedureStatus.REJECTED;
    const rejectedStep = procedure.steps.find(
      (step: Step) => step.statut === StepStatus.REJECTED,
    );
    procedure.raisonRejet = rejectedStep?.raisonRefus;
  } else if (anyCancelled) {
    procedure.statut = ProcedureStatus.CANCELLED;
  } else if (allCompleted) {
    procedure.statut = ProcedureStatus.COMPLETED;
    procedure.dateCompletion = new Date();
  } else {
    procedure.statut = ProcedureStatus.IN_PROGRESS;
  }
};

ProcedureSchema.methods.addStep = function (stepName: StepName) {
  const procedure = this as any;
  const existingStep = procedure.steps.find(
    (step: Step) => step.nom === stepName,
  );

  if (!existingStep) {
    procedure.steps.push({
      nom: stepName,
      statut: StepStatus.PENDING,
      dateCreation: new Date(),
      dateMaj: new Date(),
    });
    procedure.updateGlobalStatus();
  }
};

ProcedureSchema.methods.updateStep = function (
  stepName: StepName,
  updates: Partial<Step>,
) {
  const procedure = this as any;
  const stepIndex = procedure.steps.findIndex(
    (step: Step) => step.nom === stepName,
  );

  if (stepIndex !== -1) {
    procedure.steps[stepIndex] = {
      ...procedure.steps[stepIndex],
      ...updates,
      dateMaj: new Date(),
    };

    if (
      updates.statut === StepStatus.COMPLETED ||
      updates.statut === StepStatus.REJECTED
    ) {
      procedure.steps[stepIndex].dateCompletion = new Date();
    }

    procedure.updateGlobalStatus();
  }
};

// ==================== MÉTHODES STATIQUES ====================

ProcedureSchema.statics.findByRendezvousId = function (
  rendezVousId: Types.ObjectId,
) {
  return this.findOne({ rendezVousId, isDeleted: false });
};

ProcedureSchema.statics.findByUserEmail = function (email: string) {
  return this.find({ email, isDeleted: false }).sort({ createdAt: -1 });
};

// ==================== MIDDLEWARES ====================

ProcedureSchema.pre("save", function (next) {
  const procedure = this as any;
  procedure.dateDerniereModification = new Date();

  // ✅ GARANTIR LES 3 ÉTAPES OBLIGATOIRES
  const requiredSteps = [
    StepName.DEMANDE_ADMISSION,
    StepName.DEMANDE_VISA,
    StepName.PREPARATIF_VOYAGE,
  ];

  requiredSteps.forEach((stepName) => {
    const existingStep = procedure.steps.find(
      (step: Step) => step.nom === stepName,
    );
    if (!existingStep) {
      procedure.steps.push({
        nom: stepName,
        statut:
          stepName === StepName.DEMANDE_ADMISSION
            ? StepStatus.IN_PROGRESS
            : StepStatus.PENDING,
        dateCreation: new Date(),
        dateMaj: new Date(),
      });
    }
  });

  if (procedure.isModified("steps")) {
    procedure.updateGlobalStatus();
  }

  next();
});
