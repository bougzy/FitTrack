import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  level: number;
  xp: number;
  lastWorkoutDate: Date | null;
  groups: mongoose.Types.ObjectId[];
  accountabilityPartners: mongoose.Types.ObjectId[];
  badges: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
  }[];
  preferences: {
    fitnessLevel: string;
    preferredExercises: string[];
    reminderTime: string;
    darkMode: boolean;
    notificationsEnabled: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalWorkouts: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    lastWorkoutDate: { type: Date, default: null },
    groups: [{ type: Schema.Types.ObjectId, ref: 'Group' }],
    accountabilityPartners: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    badges: [
      {
        id: String,
        name: String,
        description: String,
        icon: String,
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      fitnessLevel: { type: String, default: 'beginner' },
      preferredExercises: [String],
      reminderTime: { type: String, default: '07:00' },
      darkMode: { type: Boolean, default: true },
      notificationsEnabled: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Single index definition — no duplicate
UserSchema.index({ email: 1 }, { unique: true });

const User: Model<IUserDocument> =
  mongoose.models.User ||
  mongoose.model<IUserDocument>('User', UserSchema);

export default User;