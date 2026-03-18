import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IGroupDocument extends Document {
  name: string;
  description: string;
  owner: mongoose.Types.ObjectId;
  members: {
    userId: mongoose.Types.ObjectId;
    role: 'admin' | 'member';
    joinedAt: Date;
    streak: number;
    totalWorkouts: number;
  }[];
  privacy: 'private' | 'public';
  autoAccept: boolean;
  inviteCode: string;
  category: string;
  totalWorkouts: number;
  challenges: {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    type: string;
    target: number;
    startDate: Date;
    endDate: Date;
    participants: {
      userId: mongoose.Types.ObjectId;
      progress: number;
      completed: boolean;
    }[];
    active: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroupDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        streak: { type: Number, default: 0 },
        totalWorkouts: { type: Number, default: 0 },
      },
    ],
    privacy: {
      type: String,
      enum: ['private', 'public'],
      default: 'private',
    },
    autoAccept: { type: Boolean, default: false },
    // removed unique:true here — index below handles it
    inviteCode: {
      type: String,
      default: () => uuidv4().substring(0, 8).toUpperCase(),
    },
    category: { type: String, default: 'general' },
    totalWorkouts: { type: Number, default: 0 },
    challenges: [
      {
        name: String,
        description: String,
        type: {
          type: String,
          enum: ['reps', 'duration', 'streak', 'workouts'],
        },
        target: Number,
        startDate: Date,
        endDate: Date,
        participants: [
          {
            userId: { type: Schema.Types.ObjectId, ref: 'User' },
            progress: { type: Number, default: 0 },
            completed: { type: Boolean, default: false },
          },
        ],
        active: { type: Boolean, default: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Single index definitions — no duplicates
GroupSchema.index({ privacy: 1 });
GroupSchema.index({ inviteCode: 1 }, { unique: true });
GroupSchema.index({ 'members.userId': 1 });

const Group: Model<IGroupDocument> =
  mongoose.models.Group ||
  mongoose.model<IGroupDocument>('Group', GroupSchema);

export default Group;