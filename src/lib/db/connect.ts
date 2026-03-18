// // ============================================
// // MongoDB Connection - Embedded, no external URI needed
// // ============================================
// import mongoose from 'mongoose';

// // Embedded MongoDB URI - works locally without any env configuration
// const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://stockpulse:stockpulse@stockpulse.k7rlq2w.mongodb.net/stockpulse";

// interface MongooseCache {
//   conn: typeof mongoose | null;
//   promise: Promise<typeof mongoose> | null;
// }

// // Global cache to prevent multiple connections in dev (Next.js hot reload)
// declare global {
//   // eslint-disable-next-line no-var
//   var mongooseCache: MongooseCache | undefined;
// }

// const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
// global.mongooseCache = cache;

// export async function connectDB(): Promise<typeof mongoose> {
//   if (cache.conn) {
//     return cache.conn;
//   }

//   if (!cache.promise) {
//     const opts = {
//       bufferCommands: false,
//       maxPoolSize: 10,
//       serverSelectionTimeoutMS: 5000,
//       socketTimeoutMS: 45000,
//     };

//     console.log('🔌 Connecting to MongoDB:', MONGODB_URI);

//     cache.promise = mongoose
//       .connect(MONGODB_URI, opts)
//       .then((m) => {
//         console.log('✅ MongoDB connected successfully');
//         return m;
//       })
//       .catch((err) => {
//         console.error('❌ MongoDB connection error:', err);
//         cache.promise = null;
//         throw err;
//       });
//   }

//   try {
//     cache.conn = await cache.promise;
//   } catch (e) {
//     cache.promise = null;
//     throw e;
//   }

//   return cache.conn;
// }

// export default connectDB;



import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://stockpulse:stockpulse@stockpulse.k7rlq2w.mongodb.net/fittrack';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      w: 'majority' as const,
    };

    cache.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => {
        console.log('✅ MongoDB connected');
        return m;
      })
      .catch((err) => {
        console.error('❌ MongoDB error:', err);
        cache.promise = null;
        throw err;
      });
  }

  try {
    cache.conn = await cache.promise;
  } catch (e) {
    cache.promise = null;
    throw e;
  }

  return cache.conn;
}

export default connectDB;