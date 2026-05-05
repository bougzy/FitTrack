import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProgramExercise {
  exerciseType: string;
  targetReps?: number;
  durationSeconds?: number;
  sets: number;
  restSeconds: number;
}

export interface IProgramDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exercises: IProgramExercise[];
  estimatedMinutes: number;
  shared: boolean;
  timesStarted: number;
  timesCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProgramSchema = new Schema<IProgramDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    exercises: [
      {
        exerciseType: { type: String, required: true },
        targetReps: { type: Number },
        durationSeconds: { type: Number },
        sets: { type: Number, default: 1 },
        restSeconds: { type: Number, default: 30 },
      },
    ],
    estimatedMinutes: { type: Number, default: 0 },
    shared: { type: Boolean, default: false },
    timesStarted: { type: Number, default: 0 },
    timesCompleted: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProgramSchema.index({ userId: 1, createdAt: -1 });
ProgramSchema.index({ shared: 1 });

const Program: Model<IProgramDocument> =
  mongoose.models.Program ||
  mongoose.model<IProgramDocument>('Program', ProgramSchema);

export default Program;
