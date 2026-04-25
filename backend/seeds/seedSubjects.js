const mongoose = require('mongoose');
const Subject = require('../models/Subject');
require('dotenv').config();

const SUBJECT_CATALOG = [
  { code: 'IT1010', name: 'Introduction to Programming' },
  { code: 'IT1020', name: 'Introduction to Computer Systems' },
  { code: 'IT1030', name: 'Mathematics for Computing' },
  { code: 'IT1040', name: 'Communication Skills' },
  { code: 'IT1050', name: 'Object Oriented Concepts' },
  { code: 'IT1060', name: 'Software Process Modeling' },
  { code: 'IT1080', name: 'English for Academic Purposes' },
  { code: 'IT1090', name: 'Information Systems and Data Modeling' },
  { code: 'IT1100', name: 'Internet and Web Technologies' },
  { code: 'IT2010', name: 'Mobile Application Development' },
  { code: 'IT2020', name: 'Software Engineering' },
  { code: 'IT2021', name: 'Artificial Intelligence and Machine Learning Project' },
  { code: 'IT2030', name: 'Object Oriented Programming' },
  { code: 'IT2040', name: 'Database Management Systems' },
  { code: 'IT2050', name: 'Computer Networks' },
  { code: 'IT2060', name: 'Operating Systems and System Administration' },
  { code: 'IT2070', name: 'Data Structures and Algorithms' },
  { code: 'IT2080', name: 'IT Project' },
  { code: 'IT2090', name: 'Professional Skills' },
  { code: 'IT2110', name: 'Probability and Statistics' },
  { code: 'IT2130', name: 'Operating Systems and System Administration [2026/JAN]' },
  { code: 'IT2160', name: 'Professional Skills' },
  { code: 'SE2020', name: 'Web and Mobile Technology' },
  { code: 'SE3010', name: 'Software Engineering Process & Quality Management' },
  { code: 'SE3020', name: 'Distributed Systems' },
  { code: 'SE3030', name: 'Software Architecture' },
  { code: 'SE3040', name: 'Application Frameworks' },
  { code: 'SE3050', name: 'User Experience Engineering' },
  { code: 'SE3070', name: 'Case Studies in Software Engineering' },
  { code: 'SE3080', name: 'Software Project Management' },
  { code: 'IT3110', name: 'Industry Placement' },
  { code: 'IT4010', name: 'Research Project' },
  { code: 'IT4020', name: 'Advanced Database Management Systems' },
  { code: 'IT4070', name: 'Preparation for the Professional World' },
  { code: 'SE4010', name: 'Software Quality Assurance' },
  { code: 'SE4020', name: 'Software Maintenance and Evolution' },
  { code: 'SE4030', name: 'Cloud Computing' },
  { code: 'SE4040', name: 'Software Security' },
  { code: 'IT4021', name: 'Internet of Things' },
];

const makeUniqueByName = (subjects) => {
  const seen = new Set();

  return subjects.map((subject) => {
    const normalizedName = (subject.name || '').trim().toLowerCase();

    if (!seen.has(normalizedName)) {
      seen.add(normalizedName);
      return subject;
    }

    return {
      ...subject,
      name: `${subject.name} (${subject.code})`,
    };
  });
};

const seedSubjects = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/univault');

    console.log('✓ Connected to MongoDB');

    // Get a system user (you might need to adjust this based on your User model)
    const User = require('../models/User');
    let systemUser = await User.findOne({ role: 'admin' });
    
    if (!systemUser) {
      console.log('ℹ No admin user found. Creating a system user for seeding...');
      systemUser = await User.create({
        name: 'System',
        email: `system-${Date.now()}@univault.local`,
        password: 'system-seed-password',
        role: 'admin',
      });
    }

    console.log(`✓ Using user: ${systemUser.name} (${systemUser._id})`);

    // Clear existing subjects (optional - comment out if you want to keep existing ones)
    // const cleared = await Subject.deleteMany({});
    // console.log(`✓ Cleared ${cleared.deletedCount} existing subjects`);

    // Upsert subjects by code so seeding is safe to run multiple times.
    const subjectsToSeed = makeUniqueByName(SUBJECT_CATALOG);

    const operations = subjectsToSeed.map((subject) => ({
      updateOne: {
        filter: { code: subject.code },
        update: {
          $set: {
            name: subject.name,
            code: subject.code,
          },
          $setOnInsert: {
            createdBy: systemUser._id,
          },
        },
        upsert: true,
      },
    }));

    const result = await Subject.bulkWrite(operations, { ordered: false });
    const insertedCount = result.upsertedCount || 0;
    const modifiedCount = result.modifiedCount || 0;

    console.log(`✓ Subjects seeded. Inserted: ${insertedCount}, Updated: ${modifiedCount}`);

    const finalSubjects = await Subject.find({ code: { $in: subjectsToSeed.map((s) => s.code) } })
      .select('code name')
      .sort({ code: 1 });

    console.log('\nSeeded Subjects:');
    finalSubjects.forEach((subject) => {
      console.log(`  - [${subject.code}] ${subject.name}`);
    });

    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding subjects:', error.message);
    if (error.code === 11000) {
      console.error('  (Duplicate key error - subjects may already exist in database)');
    }
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedSubjects();
