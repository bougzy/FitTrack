import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRecoveryCheckinDocument extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // start-of-day UTC
  sleepHours: number;
  soreness: number; // 1-5 (5 = very sore)
  energy: number; // 1-5 (5 = very energized)
  mood: number; // 1-5
  restingHR?: number; // optional manual entry
  readinessScore: number; // computed 0-100
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecoveryCheckinSchema = new Schema<IRecoveryCheckinDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    sleepHours: { type: Number, default: 7, min: 0, max: 16 },
    soreness: { type: Number, default: 3, min: 1, max: 5 },
    energy: { type: Number, default: 3, min: 1, max: 5 },
    mood: { type: Number, default: 3, min: 1, max: 5 },
    restingHR: { type: Number },
    readinessScore: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

RecoveryCheckinSchema.index({ userId: 1, date: -1 }, { unique: true });

const RecoveryCheckin: Model<IRecoveryCheckinDocument> =
  mongoose.models.RecoveryCheckin ||
  mongoose.model<IRecoveryCheckinDocument>('RecoveryCheckin', RecoveryCheckinSchema);

export default RecoveryCheckin;
