import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
  console.log('MongoDB connected');
}
