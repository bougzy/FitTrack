import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExerciseSessionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  exerciseType: string;
  duration: number;
  reps: number;
  sets: number;
  motionScore: number;
  verificationScore: number;
  verificationBreakdown: {
    motionConsistency: number;
    repetitionPatternAccuracy: number;
    orientationConsistency: number;
    sessionDuration: number;
    intensityScore: number;
    partnerConfirmation: number;
  };
  verified: boolean;
  verificationLevel: number;
  caloriesBurned: number;
  sharedGroups: mongoose.Types.ObjectId[];
  notes: string;
  date: Date;
  sensorData: {
    timestamp: number;
    accelerometer: { x: number; y: number; z: number };
    gyroscope?: { x: number; y: number; z: number };
    orientation?: { alpha: number; beta: number; gamma: number };
    gps?: { lat: number; lng: number; speed: number };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSessionSchema = new Schema<IExerciseSessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exerciseType: { type: String, required: true },
    duration: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    sets: { type: Number, default: 1 },
    motionScore: { type: Number, default: 0 },
    verificationScore: { type: Number, default: 0 },
    verificationBreakdown: {
      motionConsistency: { type: Number, default: 0 },
      repetitionPatternAccuracy: { type: Number, default: 0 },
      orientationConsistency: { type: Number, default: 0 },
      sessionDuration: { type: Number, default: 0 },
      intensityScore: { type: Number, default: 0 },
      partnerConfirmation: { type: Number, default: 0 },
    },
    verified: { type: Boolean, default: false },
    verificationLevel: { type: Number, default: 1 },
    caloriesBurned: { type: Number, default: 0 },
    sharedGroups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
    notes: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    sensorData: [
      {
        timestamp: Number,
        accelerometer: { x: Number, y: Number, z: Number },
        gyroscope: { x: Number, y: Number, z: Number },
        orientation: { alpha: Number, beta: Number, gamma: Number },
        gps: { lat: Number, lng: Number, speed: Number },
      },
    ],
  },
  {
    timestamps: true,
  }
);

ExerciseSessionSchema.index({ userId: 1, date: -1 });
ExerciseSessionSchema.index({ sharedGroups: 1 });

const ExerciseSession: Model<IExerciseSessionDocument> =
  mongoose.models.ExerciseSession ||
  mongoose.model<IExerciseSessionDocument>('ExerciseSession', ExerciseSessionSchema);

export default ExerciseSession;
