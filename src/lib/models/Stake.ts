import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStakeDocument extends Document {
  userId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId; // optional — solo stakes also allowed
  goalType: 'workouts' | 'reps' | 'duration' | 'streak';
  target: number;
  progress: number;
  deadline: Date;
  stakeXP: number;
  status: 'active' | 'won' | 'lost' | 'cancelled';
  witnesses: mongoose.Types.ObjectId[]; // group members who can verify
  description: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StakeSchema = new Schema<IStakeDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    goalType: {
      type: String,
      enum: ['workouts', 'reps', 'duration', 'streak'],
      required: true,
    },
    target: { type: Number, required: true, min: 1 },
    progress: { type: Number, default: 0 },
    deadline: { type: Date, required: true },
    stakeXP: { type: Number, required: true, min: 10 },
    status: {
      type: String,
      enum: ['active', 'won', 'lost', 'cancelled'],
      default: 'active',
    },
    witnesses: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    description: { type: String, default: '' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

StakeSchema.index({ userId: 1, status: 1 });
StakeSchema.index({ groupId: 1, status: 1 });
StakeSchema.index({ deadline: 1, status: 1 });

const Stake: Model<IStakeDocument> =
  mongoose.models.Stake || mongoose.model<IStakeDocument>('Stake', StakeSchema);

export default Stake;
