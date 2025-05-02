
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/votechain';

// Sample candidate data - adjust with real data as needed
const candidates = [
  { 
    name: 'Alex Johnson', 
    party: 'Progressive Party', 
    imageUrl: '/placeholder.svg', 
    voteCount: 0 
  },
  { 
    name: 'Sam Wilson', 
    party: 'Conservative Union', 
    imageUrl: '/placeholder.svg', 
    voteCount: 0 
  },
  { 
    name: 'Maria Rodriguez', 
    party: 'Liberty Alliance', 
    imageUrl: '/placeholder.svg', 
    voteCount: 0 
  },
  { 
    name: 'David Chen', 
    party: 'Equality Coalition', 
    imageUrl: '/placeholder.svg', 
    voteCount: 0 
  },
  { 
    name: 'Priya Patel', 
    party: 'Future Forward', 
    imageUrl: '/placeholder.svg', 
    voteCount: 0 
  }
];

// Define the models
const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  party: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    default: '/placeholder.svg'
  },
  voteCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return seedData();
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  });

async function seedData() {
  try {
    // Register models
    const Candidate = mongoose.models.Candidate || mongoose.model('Candidate', candidateSchema);
    
    // Clear existing data
    await Candidate.deleteMany({});
    console.log('Existing candidates cleared');
    
    // Insert new data
    const insertedCandidates = await Candidate.insertMany(candidates);
    console.log(`${insertedCandidates.length} candidates inserted successfully`);
    
    console.log('Sample data:');
    console.log(insertedCandidates);
    
    // Close connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}
