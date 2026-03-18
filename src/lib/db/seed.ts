// import mongoose from 'mongoose';
// import bcrypt from 'bcryptjs';

// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fittrack';

// async function seed() {
//   await mongoose.connect(MONGODB_URI);
//   console.log('Connected to MongoDB');

//   // Define minimal schemas inline for seeding
//   const UserSchema = new mongoose.Schema({
//     name: String, email: String, passwordHash: String,
//     streak: { type: Number, default: 0 },
//     longestStreak: { type: Number, default: 0 },
//     totalWorkouts: { type: Number, default: 0 },
//     level: { type: Number, default: 1 },
//     xp: { type: Number, default: 0 },
//     groups: [mongoose.Schema.Types.ObjectId],
//     badges: Array,
//     preferences: Object,
//     accountabilityPartners: Array,
//     lastWorkoutDate: Date,
//   }, { timestamps: true });

//   const User = mongoose.models.User || mongoose.model('User', UserSchema);

//   // Clear existing
//   await User.deleteMany({});
//   console.log('Cleared users');

//   // Seed test users
//   const password = await bcrypt.hash('password123', 12);
//   const users = await User.insertMany([
//     {
//       name: 'Demo User',
//       email: 'demo@fittrack.app',
//       passwordHash: password,
//       streak: 7,
//       longestStreak: 14,
//       totalWorkouts: 23,
//       level: 3,
//       xp: 1250,
//       badges: [
//         { id: 'first_workout', name: 'First Step', icon: '🎉', earnedAt: new Date() },
//         { id: 'streak_7', name: '7-Day Warrior', icon: '🔥', earnedAt: new Date() },
//       ],
//       preferences: {
//         fitnessLevel: 'intermediate',
//         darkMode: true,
//         notificationsEnabled: true,
//         reminderTime: '07:00',
//       },
//     },
//     {
//       name: 'Alex Fitness',
//       email: 'alex@fittrack.app',
//       passwordHash: password,
//       streak: 3,
//       longestStreak: 21,
//       totalWorkouts: 45,
//       level: 5,
//       xp: 2500,
//       badges: [
//         { id: 'first_workout', name: 'First Step', icon: '🎉', earnedAt: new Date() },
//         { id: 'streak_7', name: '7-Day Warrior', icon: '🔥', earnedAt: new Date() },
//         { id: 'verified_10', name: 'Verified Athlete', icon: '✅', earnedAt: new Date() },
//       ],
//       preferences: { fitnessLevel: 'advanced', darkMode: true, notificationsEnabled: true },
//     },
//   ]);

//   console.log(`✅ Seeded ${users.length} users`);
//   console.log('\n📋 Demo credentials:');
//   console.log('  Email: demo@fittrack.app');
//   console.log('  Password: password123\n');

//   await mongoose.disconnect();
//   console.log('Done!');
// }

// seed().catch(console.error);




import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb+srv://stockpulse:stockpulse@stockpulse.k7rlq2w.mongodb.net/fittrack';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const UserSchema = new mongoose.Schema({
    name: String, email: String, passwordHash: String,
    streak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    totalWorkouts: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    groups: [mongoose.Schema.Types.ObjectId],
    badges: Array,
    preferences: Object,
    accountabilityPartners: Array,
    lastWorkoutDate: Date,
  }, { timestamps: true });

  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  await User.deleteMany({});
  console.log('Cleared users');

  const password = await bcrypt.hash('password123', 12);
  const users = await User.insertMany([
    {
      name: 'Demo User',
      email: 'demo@fittrack.app',
      passwordHash: password,
      streak: 7,
      longestStreak: 14,
      totalWorkouts: 23,
      level: 3,
      xp: 1250,
      badges: [
        { id: 'first_workout', name: 'First Step', icon: '🎉', earnedAt: new Date() },
        { id: 'streak_7', name: '7-Day Warrior', icon: '🔥', earnedAt: new Date() },
      ],
      preferences: {
        fitnessLevel: 'intermediate',
        darkMode: true,
        notificationsEnabled: true,
        reminderTime: '07:00',
      },
    },
    {
      name: 'Alex Fitness',
      email: 'alex@fittrack.app',
      passwordHash: password,
      streak: 3,
      longestStreak: 21,
      totalWorkouts: 45,
      level: 5,
      xp: 2500,
      badges: [
        { id: 'first_workout', name: 'First Step', icon: '🎉', earnedAt: new Date() },
        { id: 'streak_7', name: '7-Day Warrior', icon: '🔥', earnedAt: new Date() },
        { id: 'verified_10', name: 'Verified Athlete', icon: '✅', earnedAt: new Date() },
      ],
      preferences: { fitnessLevel: 'advanced', darkMode: true, notificationsEnabled: true },
    },
  ]);

  console.log(`✅ Seeded ${users.length} users`);
  console.log('\n📋 Demo credentials:');
  console.log('  Email: demo@fittrack.app');
  console.log('  Password: password123\n');

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(console.error);