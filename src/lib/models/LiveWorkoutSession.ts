import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ILiveParticipant {
  userId: mongoose.Types.ObjectId;
  name: string;
  joinedAt: Date;
  reps: number;
  durationSeconds: number;
  heartRate?: number;
  status: 'joined' | 'active' | 'finished';
  finalScore: number; // 0-100, populated when status = finished
  lastPingAt: Date;
}

export interface ILiveWorkoutSessionDocument extends Document {
  hostId: mongoose.Types.ObjectId;
  hostName: string;
  joinCode: string; // 8-char shareable
  title: string;
  exerciseType: string;
  programId?: mongoose.Types.ObjectId;
  status: 'waiting' | 'active' | 'ended';
  isPublic: boolean;
  maxParticipants: number;
  scheduledFor?: Date;
  startedAt?: Date;
  endedAt?: Date;
  // Live host stats — broadcast to participants
  hostReps: number;
  hostDurationSeconds: number;
  hostHeartRate?: number;
  participants: ILiveParticipant[];
  groupId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LiveWorkoutSessionSchema = new Schema<ILiveWorkoutSessionDocument>(
  {
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hostName: { type: String, required: true },
    joinCode: {
      type: String,
      required: true,
      default: () => uuidv4().substring(0, 8).toUpperCase(),
    },
    title: { type: String, required: true, trim: true },
    exerciseType: { type: String, required: true },
    programId: { type: Schema.Types.ObjectId, ref: 'Program' },
    status: {
      type: String,
      enum: ['waiting', 'active', 'ended'],
      default: 'waiting',
    },
    isPublic: { type: Boolean, default: true },
    maxParticipants: { type: Number, default: 50 },
    scheduledFor: { type: Date },
    startedAt: { type: Date },
    endedAt: { type: Date },
    hostReps: { type: Number, default: 0 },
    hostDurationSeconds: { type: Number, default: 0 },
    hostHeartRate: { type: Number },
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        joinedAt: { type: Date, default: Date.now },
        reps: { type: Number, default: 0 },
        durationSeconds: { type: Number, default: 0 },
        heartRate: { type: Number },
        status: { type: String, enum: ['joined', 'active', 'finished'], default: 'joined' },
        finalScore: { type: Number, default: 0 },
        lastPingAt: { type: Date, default: Date.now },
      },
    ],
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
  },
  { timestamps: true }
);

LiveWorkoutSessionSchema.index({ joinCode: 1 }, { unique: true });
LiveWorkoutSessionSchema.index({ hostId: 1, status: 1 });
LiveWorkoutSessionSchema.index({ status: 1, isPublic: 1, createdAt: -1 });
// Auto-cleanup ended sessions after 7 days
LiveWorkoutSessionSchema.index({ endedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7, partialFilterExpression: { endedAt: { $exists: true } } });

const LiveWorkoutSession: Model<ILiveWorkoutSessionDocument> =
  mongoose.models.LiveWorkoutSession ||
  mongoose.model<ILiveWorkoutSessionDocument>('LiveWorkoutSession', LiveWorkoutSessionSchema);

export default LiveWorkoutSession;
