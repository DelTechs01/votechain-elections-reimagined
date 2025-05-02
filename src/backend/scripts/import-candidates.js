
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const csv = require('csv-parser');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/votechain')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// Candidate model schema
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
    type: String
  },
  bio: {
    type: String
  },
  voteCount: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);

// Parse command line arguments
const args = process.argv.slice(2);
let filePath = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && i + 1 < args.length) {
    filePath = args[i + 1];
    break;
  }
}

if (!filePath) {
  console.error('Please provide a CSV file path using --file option');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Process CSV file
console.log(`Importing candidates from: ${filePath}`);

const results = [];
fs.createReadStream(filePath)
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', async () => {
    try {
      console.log(`Found ${results.length} candidates to import`);
      
      // Clear existing candidates if needed
      // Uncomment the line below to remove all existing candidates before importing
      // await Candidate.deleteMany({});
      
      // Process each candidate
      for (const candidate of results) {
        const exists = await Candidate.findOne({ name: candidate.name, party: candidate.party });
        
        if (exists) {
          console.log(`Skipping: ${candidate.name} (already exists)`);
          continue;
        }
        
        const newCandidate = new Candidate({
          name: candidate.name,
          party: candidate.party,
          bio: candidate.bio || '',
          imageUrl: candidate.imageUrl || '/placeholder.svg',
          voteCount: 0,
          active: true
        });
        
        await newCandidate.save();
        console.log(`Imported: ${candidate.name} (${candidate.party})`);
      }
      
      console.log('Import completed successfully');
      process.exit(0);
      
    } catch (error) {
      console.error('Error importing candidates:', error);
      process.exit(1);
    }
  });
