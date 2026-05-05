import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProgressPostDocument extends Document {
  userId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId | null;
  text: string;
  imageUrl: string;
  metrics: {
    reps?: number;
    duration?: number;
    calories?: number;
    heartRate?: number;
    steps?: number;
  };
  reactions: {
    userId: mongoose.Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ProgressPostSchema = new Schema<IProgressPostDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', default: null },
    text: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: '' },
    metrics: {
      reps: Number,
      duration: Number,
      calories: Number,
      heartRate: Number,
      steps: Number,
    },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String, default: '🔥' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

ProgressPostSchema.index({ groupId: 1, createdAt: -1 });
ProgressPostSchema.index({ userId: 1, createdAt: -1 });

const ProgressPost: Model<IProgressPostDocument> =
  mongoose.models.ProgressPost ||
  mongoose.model<IProgressPostDocument>('ProgressPost', ProgressPostSchema);

export default ProgressPost;
