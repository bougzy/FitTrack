// import { NextRequest, NextResponse } from 'next/server';
// import connectDB from '@/lib/db/connect';
// import Group from '@/lib/models/Group';
// import User from '@/lib/models/User';
// import ExerciseSession from '@/lib/models/ExerciseSession';
// import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

// export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const token = extractTokenFromHeader(req.headers.get('authorization'));
//     if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

//     const payload = verifyToken(token);
//     await connectDB();

//     const group = await Group.findById(params.id)
//       .populate('members.userId', 'name email level xp streak totalWorkouts badges')
//       .populate('owner', 'name email')
//       .lean();

//     if (!group) {
//       return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
//     }

//     // Privacy check: non-members cannot see private groups
//     const isMember = group.members.some(
//       (m: { userId: { _id?: string; toString?: () => string } | string }) => {
//         const uid = typeof m.userId === 'object' && m.userId !== null
//           ? (m.userId as { _id: { toString: () => string } })._id?.toString()
//           : m.userId?.toString();
//         return uid === payload.userId;
//       }
//     );

//     if (!isMember && group.privacy === 'private') {
//       return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
//     }

//     // Get recent sessions for this group
//     const recentSessions = await ExerciseSession.find({ sharedGroups: params.id })
//       .sort({ date: -1 })
//       .limit(20)
//       .populate('userId', 'name level')
//       .lean();

//     return NextResponse.json({ success: true, data: { group, recentSessions } });
//   } catch (error) {
//     console.error('Get group error:', error);
//     return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
//   }
// }

// export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const token = extractTokenFromHeader(req.headers.get('authorization'));
//     if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

//     const payload = verifyToken(token);
//     await connectDB();

//     const group = await Group.findById(params.id);
//     if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

//     // Only admin or owner can update
//     const isAdmin = group.members.some(
//       (m) => m.userId.toString() === payload.userId && m.role === 'admin'
//     );
//     if (!isAdmin) {
//       return NextResponse.json({ success: false, error: 'Only admins can update this group' }, { status: 403 });
//     }

//     const updates = await req.json();
//     delete updates._id;
//     delete updates.owner;
//     delete updates.members;

//     const updated = await Group.findByIdAndUpdate(params.id, { $set: updates }, { new: true });
//     return NextResponse.json({ success: true, data: updated });
//   } catch {
//     return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
//   }
// }

// export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const token = extractTokenFromHeader(req.headers.get('authorization'));
//     if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

//     const payload = verifyToken(token);
//     await connectDB();

//     const group = await Group.findById(params.id);
//     if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

//     if (group.owner.toString() !== payload.userId) {
//       return NextResponse.json({ success: false, error: 'Only the owner can delete this group' }, { status: 403 });
//     }

//     // Remove group from all members
//     const memberIds = group.members.map((m) => m.userId);
//     await User.updateMany(
//       { _id: { $in: memberIds } },
//       { $pull: { groups: group._id } }
//     );

//     await Group.findByIdAndDelete(params.id);
//     return NextResponse.json({ success: true, message: 'Group deleted' });
//   } catch {
//     return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
//   }
// }



import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/connect';
import Group from '@/lib/models/Group';
import User from '@/lib/models/User';
import ExerciseSession from '@/lib/models/ExerciseSession';
import { verifyToken, extractTokenFromHeader } from '@/lib/utils/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id)
      .populate('members.userId', 'name email level xp streak totalWorkouts badges')
      .populate('owner', 'name email')
      .lean();

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });
    }

    // Privacy check: non-members cannot see private groups
    const isMember = group.members.some((m) => {
      const uid = m.userId?.toString();
      return uid === payload.userId;
    });

    if (!isMember && group.privacy === 'private') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get recent sessions for this group
    const recentSessions = await ExerciseSession.find({ sharedGroups: params.id })
      .sort({ date: -1 })
      .limit(20)
      .populate('userId', 'name level')
      .lean();

    return NextResponse.json({ success: true, data: { group, recentSessions } });
  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    const isAdmin = group.members.some(
      (m) => m.userId.toString() === payload.userId && m.role === 'admin'
    );
    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Only admins can update this group' }, { status: 403 });
    }

    const updates = await req.json();
    delete updates._id;
    delete updates.owner;
    delete updates.members;

    const updated = await Group.findByIdAndUpdate(params.id, { $set: updates }, { new: true });
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = extractTokenFromHeader(req.headers.get('authorization'));
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const payload = verifyToken(token);
    await connectDB();

    const group = await Group.findById(params.id);
    if (!group) return NextResponse.json({ success: false, error: 'Group not found' }, { status: 404 });

    if (group.owner.toString() !== payload.userId) {
      return NextResponse.json({ success: false, error: 'Only the owner can delete this group' }, { status: 403 });
    }

    const memberIds = group.members.map((m) => m.userId);
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { groups: group._id } }
    );

    await Group.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'Group deleted' });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}