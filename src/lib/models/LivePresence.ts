import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILivePresenceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  exerciseType: string;
  reps: number;
  durationSeconds: number;
  heartRate?: number;
  startedAt: Date;
  lastPingAt: Date;
  finished: boolean;
}

const LivePresenceSchema = new Schema<ILivePresenceDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
  exerciseType: { type: String, required: true },
  reps: { type: Number, default: 0 },
  durationSeconds: { type: Number, default: 0 },
  heartRate: { type: Number },
  startedAt: { type: Date, default: Date.now },
  lastPingAt: { type: Date, default: Date.now },
  finished: { type: Boolean, default: false },
});

LivePresenceSchema.index({ userId: 1, groupId: 1 }, { unique: true });
LivePresenceSchema.index({ groupId: 1, lastPingAt: -1 });
// TTL — auto-clean stale presence after 10 minutes
LivePresenceSchema.index({ lastPingAt: 1 }, { expireAfterSeconds: 600 });

const LivePresence: Model<ILivePresenceDocument> =
  mongoose.models.LivePresence ||
  mongoose.model<ILivePresenceDocument>('LivePresence', LivePresenceSchema);

export default LivePresence;
