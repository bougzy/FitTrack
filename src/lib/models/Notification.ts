import mongoose, { Schema, Document, Model } from 'mongoose';

// ============ NOTIFICATION MODEL ============
export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', NotificationSchema);

// ============ INVITATION MODEL ============
export interface IGroupInvitationDocument extends Document {
  groupId: mongoose.Types.ObjectId;
  inviterId: mongoose.Types.ObjectId;
  inviteeId?: mongoose.Types.ObjectId;
  inviteeEmail?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const GroupInvitationSchema = new Schema<IGroupInvitationDocument>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteeId: { type: Schema.Types.ObjectId, ref: 'User' },
    inviteeEmail: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

GroupInvitationSchema.index({ inviteeId: 1, status: 1 });
GroupInvitationSchema.index({ groupId: 1 });

export const GroupInvitation: Model<IGroupInvitationDocument> =
  mongoose.models.GroupInvitation ||
  mongoose.model<IGroupInvitationDocument>('GroupInvitation', GroupInvitationSchema);
