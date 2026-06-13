import 'dotenv/config';
import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import sqlite3 from 'connect-sqlite3';
import cors from 'cors';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import multer from 'multer';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import officeParser from 'officeparser';

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const SQLiteStore = sqlite3(session);

const dbPath = process.env.DATABASE_PATH || 'campus_pulse.db';
const dbDir = path.dirname(dbPath);
if (dbDir !== '.' && dbDir !== '/' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize Firestore on Backend
const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firestoreDb: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    const firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log('[Firestore Sync] Firebase and Firestore successfully initialized on the backend.');
  } catch (err) {
    console.error('[Firestore Sync] Failed to initialize Firebase on server:', err);
  }
} else {
  console.warn('[Firestore Sync] firebase-applet-config.json not found in root.');
}

const CHUNK_SIZE = 800 * 1024; // 800 KB

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Asynchronous restore function
async function restoreDatabase() {
  if (!firestoreDb) {
    console.warn('[Firestore Sync] Firestore not initialized, skipping restore.');
    return;
  }
  
  const pathForGet = 'db_backup/metadata';
  let metaDoc;
  try {
    metaDoc = await getDoc(doc(firestoreDb, 'db_backup', 'metadata'));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, pathForGet);
    return;
  }

  if (!metaDoc.exists()) {
    console.log('[Firestore Sync] No database backup found in Firestore. Starting with local file/creation.');
    return;
  }
  const dataMeta = metaDoc.data();
  if (!dataMeta || typeof dataMeta.totalChunks !== 'number') {
    console.warn('[Firestore Sync] Invalid metadata format in Firestore.');
    return;
  }
  const { totalChunks, totalSize } = dataMeta;
  console.log(`[Firestore Sync] Restoring database of size ${totalSize} bytes from ${totalChunks} chunks...`);
  
  const chunks: Buffer[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = `db_backup/chunk_${i}`;
    let cDoc;
    try {
      cDoc = await getDoc(doc(firestoreDb, 'db_backup', `chunk_${i}`));
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, chunkPath);
      return;
    }

    if (!cDoc.exists()) {
      console.error(`[Firestore Sync] Missing chunk_${i} in Firestore. Aborting restore.`);
      return;
    }
    const cData = cDoc.data();
    if (!cData || typeof cData.data !== 'string') {
      console.error(`[Firestore Sync] Invalid data in chunk_${i}. Aborting restore.`);
      return;
    }
    chunks.push(Buffer.from(cData.data, 'base64'));
  }
  
  const dbBuffer = Buffer.concat(chunks);
  fs.writeFileSync(dbPath, dbBuffer);
  console.log(`[Firestore Sync] SQLite database file successfully restored to ${dbPath} (${dbBuffer.length} bytes).`);
}

let db: any;

let lastBackupMtime = 0;
if (fs.existsSync(dbPath)) {
  lastBackupMtime = fs.statSync(dbPath).mtimeMs;
}

// Asynchronous backup function
async function backupDatabase() {
  if (!firestoreDb) return;
  if (!fs.existsSync(dbPath)) return;
  
  try {
    const stats = fs.statSync(dbPath);
    const mtime = stats.mtimeMs;
    
    // Skip if nothing changed
    if (mtime <= lastBackupMtime) {
      return;
    }
    
    const fileBuffer = fs.readFileSync(dbPath);
    const size = fileBuffer.length;
    const totalChunks = Math.ceil(size / CHUNK_SIZE);
    
    console.log(`[Firestore Sync] Backing up database (${size} bytes) in ${totalChunks} chunks to Firestore...`);
    
    try {
      await setDoc(doc(firestoreDb, 'db_backup', 'metadata'), {
        totalSize: size,
        totalChunks,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'db_backup/metadata');
    }
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, size);
      const chunk = fileBuffer.subarray(start, end);
      try {
        await setDoc(doc(firestoreDb, 'db_backup', `chunk_${i}`), {
          chunkIndex: i,
          data: chunk.toString('base64')
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `db_backup/chunk_${i}`);
      }
    }
    
    lastBackupMtime = mtime;
    console.log('[Firestore Sync] Backup completed successfully.');
  } catch (err) {
    console.error('[Firestore Sync] Error during backup:', err);
  }
}

// Start auto-backup background interval checking for changes every 5 seconds
if (firestoreDb) {
  setInterval(() => {
    backupDatabase().catch(err => {
      console.error('[Firestore Sync] Auto-backup interval error:', err);
    });
  }, 5000);
  
  // Also backup when the process exits
  process.on('SIGINT', async () => {
    console.log('[Firestore Sync] SIGINT received. Running final database backup...');
    await backupDatabase();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('[Firestore Sync] SIGTERM received. Running final database backup...');
    await backupDatabase();
    process.exit(0);
  });
}

// Initialize Database
function initDbAndMigrations() {
db.exec(`
  CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT CHECK(type IN ('photo', 'video')) NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS performances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    performer TEXT NOT NULL,
    time TEXT NOT NULL DEFAULT '19:00',
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS demanding_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'song', 'videography', 'photography'
    title TEXT NOT NULL,
    link TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'Trending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS batch_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_name TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT CHECK(type IN ('photo', 'video')) NOT NULL,
    uploaded_by TEXT DEFAULT 'Anonymous',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS memory_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS content_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    logo TEXT NOT NULL DEFAULT 'BookOpen',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS content_topics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subject_id) REFERENCES content_subjects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS content_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id INTEGER NULL,
    subject_id INTEGER NULL,
    section TEXT DEFAULT 'textbook',
    headline TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL,
    file_path TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_ai_generated INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS standalone_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author_name TEXT NOT NULL DEFAULT 'BMLT Director',
    cover_color TEXT NOT NULL DEFAULT 'teal',
    allow_download INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS book_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    author_name TEXT NOT NULL DEFAULT 'BMLT Scholar',
    allow_download INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(book_id) REFERENCES standalone_books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS news_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_name TEXT NOT NULL DEFAULT 'Admin',
    category TEXT DEFAULT 'General',
    image_url TEXT NULL,
    file_path TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS mcqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NULL,
    topic_id INTEGER NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NULL,
    option_d TEXT NULL,
    option_e TEXT NULL,
    correct_option TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

`);

// Migrate tables to include allow_download if they exist
try {
  db.prepare("ALTER TABLE standalone_books ADD COLUMN allow_download INTEGER DEFAULT 1").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE book_documents ADD COLUMN allow_download INTEGER DEFAULT 1").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE content_articles ADD COLUMN allow_download INTEGER DEFAULT 1").run();
} catch (e) {}

// Migrate content_articles to support subject-level direct textbooks and notes as well as files
try {
  db.prepare("ALTER TABLE content_articles ADD COLUMN subject_id INTEGER").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE content_articles ADD COLUMN section TEXT DEFAULT 'textbook'").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE content_articles ADD COLUMN file_path TEXT").run();
} catch (e) {}

try {
  db.prepare("ALTER TABLE admins ADD COLUMN role TEXT DEFAULT 'admin'").run();
} catch (e) {}

// Initialize Custom BMLT Desk Tables for specialized MCQs and Case Studies
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS bmlt_mcqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NULL,
      option_d TEXT NULL,
      correct_option TEXT NOT NULL,
      image_url TEXT NULL,
      explanation TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
} catch (e) {}

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS bmlt_case_studies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      presentation TEXT NOT NULL,
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      option_a TEXT NULL,
      option_b TEXT NULL,
      option_c TEXT NULL,
      option_d TEXT NULL,
      correct_option TEXT NULL,
      correct_guidelines TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
} catch (e) {}

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS bmlt_slides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      target_cell TEXT NOT NULL,
      hint TEXT NOT NULL,
      image_url TEXT NOT NULL,
      fact TEXT NOT NULL,
      options TEXT NOT NULL,
      hotspots TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
} catch (e) {
  console.error("Error creating bmlt_slides table:", e);
}

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS bmlt_lab_params (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      normal_min_male REAL NOT NULL,
      normal_max_male REAL NOT NULL,
      normal_min_female REAL NOT NULL,
      normal_max_female REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
} catch (e) {
  console.error("Error creating bmlt_lab_params table:", e);
}

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL,
      roll_no TEXT NOT NULL UNIQUE,
      reg_no TEXT NOT NULL UNIQUE,
      points INTEGER DEFAULT 0,
      profile_pic TEXT NULL,
      correct_mcq_ids TEXT DEFAULT '[]',
      correct_bmlt_mcq_ids TEXT DEFAULT '[]',
      correct_bmlt_slide_ids TEXT DEFAULT '[]',
      correct_bmlt_case_ids TEXT DEFAULT '[]',
      correct_bmlt_case_paragraph_ids TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  try {
    db.prepare(`ALTER TABLE students ADD COLUMN session TEXT DEFAULT '2023-2026'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE students ADD COLUMN section TEXT DEFAULT 'A'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE students ADD COLUMN correct_bmlt_slide_ids TEXT DEFAULT '[]'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE students ADD COLUMN correct_bmlt_case_ids TEXT DEFAULT '[]'`).run();
  } catch (e) {}
  try {
    db.prepare(`ALTER TABLE students ADD COLUMN correct_bmlt_case_paragraph_ids TEXT DEFAULT '[]'`).run();
  } catch (e) {}
} catch (e) {
  console.error("Error creating students table:", e);
}

try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS academic_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  
  const countSessions = (db.prepare('SELECT COUNT(*) as cnt FROM academic_sessions').get() as { cnt: number }).cnt;
  if (countSessions === 0) {
    const defaultSessions = ['2022-2025', '2023-2026', '2024-2027', '2025-2028'];
    const insert = db.prepare('INSERT OR IGNORE INTO academic_sessions (name) VALUES (?)');
    for (const sess of defaultSessions) {
      insert.run(sess);
    }
  }
} catch (e) {
  console.error("Error creating academic_sessions table:", e);
}

try {
  const countMcqs = (db.prepare('SELECT COUNT(*) as cnt FROM bmlt_mcqs').get() as { cnt: number }).cnt;
  if (countMcqs === 0) {
    db.prepare(`
      INSERT INTO bmlt_mcqs (question, option_a, option_b, option_c, option_d, correct_option, image_url, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Identify the abnormal erythrocyte shape displaying a "bullseye" central condensation of hemoglobin surrounded by a clear ring under blood smear:',
      'Spherocyte',
      'Target Cell (Codocyte)',
      'Schistocyte',
      'Sickle Cell (Drepanocyte)',
      'B',
      'https://images.unsplash.com/photo-1614850523011-8f49fc9ec67a?auto=format&fit=crop&q=80&w=600',
      'Target cells (codocytes) show a characteristic "bullseye" pattern. They are commonly seen in liver disease, thalassemia, and iron deficiency.'
    );
    
    db.prepare(`
      INSERT INTO bmlt_mcqs (question, option_a, option_b, option_c, option_d, correct_option, image_url, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'An elevated level of which granulocytic leukocyte is specifically indicative of a parasitic infection or allergic reaction in a clinical laboratory count?',
      'Neutrophils',
      'Lymphocytes',
      'Eosinophils',
      'Basophils',
      'C',
      'https://images.unsplash.com/photo-1579161748255-33b3fc535f26?auto=format&fit=crop&q=80&w=600',
      'Eosinophils are granular leukocytes whose primary role includes fighting off multi-cellular parasites and moderating allergic triggers.'
    );
  }
} catch (e) {
  console.error("Error seeding bmlt_mcqs:", e);
}

try {
  const countCases = (db.prepare('SELECT COUNT(*) as cnt FROM bmlt_case_studies').get() as { cnt: number }).cnt;
  if (countCases === 0) {
    db.prepare(`
      INSERT INTO bmlt_case_studies (title, presentation, type, question, option_a, option_b, option_c, option_d, correct_option, correct_guidelines)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Case of the Fatigued Scholar',
      'A 20-year-old student reports progressive fatigue, breathlessness on climbing stairs, and brittle nails over the semester. Lab values show microcytic, hypochromic erythrocytes on PBS, with Hemoglobin hovering at 8.2 g/dL. Serum Ferritin is low (7 ng/mL) and TIBC is high (450 mcg/dL).',
      'mcq',
      'Based on these diagnostic biomarkers, what microcytic anemia is represented?',
      'Iron Deficiency Anemia',
      'Beta Thalassemia Minor',
      'Aplastic Anemia',
      'Megaloblastic Anemia',
      'A',
      null
    );

    db.prepare(`
      INSERT INTO bmlt_case_studies (title, presentation, type, question, option_a, option_b, option_c, option_d, correct_option, correct_guidelines)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Acute Renal Stress Investigation',
      'A 62-year-old patient with long-term hypertension presents with sudden swelling in both legs, diminished urine volume, and a feeling of nausea. Lab tests confirm Serum Creatinine is extremely high at 4.2 mg/dL, and Blood Urea Nitrogen (BUN) is 85 mg/dL.',
      'paragraph',
      'Evaluate the patient condition. Explain the significance of the elevated Creatinine and BUN and name the likely clinical syndrome.',
      null,
      null,
      null,
      null,
      null,
      'Acute Kidney Injury (AKI), renal failure, impaired GFR filtration, elevated waste products, diminished clearance'
    );
  }
} catch (e) {
  console.error("Error seeding bmlt_case_studies:", e);
}

try {
  const countSlides = (db.prepare('SELECT COUNT(*) as cnt FROM bmlt_slides').get() as { cnt: number }).cnt;
  if (countSlides === 0) {
    db.prepare(`
      INSERT INTO bmlt_slides (name, description, target_cell, hint, image_url, fact, options, hotspots)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Normal Blood Smear - Polymorphonuclear Neutrophil',
      'Notice the multi-lobed nucleus (usually 3 to 5 lobes joined by thin strands) and fine, lilac-pink granules in the cytoplasm.',
      'Neutrophil',
      'Multi-lobed nucleus with neutral cytoplasm granules, crucial for immune defense.',
      'https://upload.wikimedia.org/wikipedia/commons/e/e5/Segmented_neutrophil.jpg',
      'Neutrophils are the most abundant type of granulocytes, making up 40% to 70% of all white blood cells in humans.',
      'Neutrophil,Eosinophil,Lymphocyte,Monocyte',
      JSON.stringify([
        { x: 50, y: 50, name: 'Normal Multi-lobed Nucleus', description: 'Classic polymorphonuclear clumped chromatin showing 3 distinct connected nuclear lobes.' },
        { x: 38, y: 64, name: 'Neutral Cytoplasmic Granules', description: 'Extremely fine, dusty pink-lilac neutrophilic lysosomal granules suspended in neutral cytoplasm.' },
        { x: 22, y: 35, name: 'Normal Biconcave Erythrocyte', description: 'A perfect biconcave discocyte showing ideal 1/3 circular central pallor of normal hemoglobin saturation.' },
        { x: 74, y: 72, name: 'Extracellular Platelet (Thrombocyte)', description: 'Small, 2-3 micron non-nucleated cytoplasmic fragment showing purple granule cores.' }
      ])
    );

    db.prepare(`
      INSERT INTO bmlt_slides (name, description, target_cell, hint, image_url, fact, options, hotspots)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Peripheral Blood Smear - Plasmodium falciparum (Ring Form)',
      'Look carefully inside the red blood cells. You will see delicate blue cytoplasmic rings with bright red chromatin dots resembling a signet-ring.',
      'Plasmodium falciparum',
      'A signet-ring shape inside erythrocyte cytoplasm. Causes malaria.',
      'https://upload.wikimedia.org/wikipedia/commons/c/c5/Plasmodium_falciparum_ring_forms_smear_9157_lores.jpg',
      'Plasmodium falciparum represents the most dangerous species of malaria parasite, causing cerebral symptoms.',
      'Plasmodium falciparum,Trypanosoma,Leishmania donovani,Babesia',
      JSON.stringify([
        { x: 42, y: 48, name: 'Plasmodium Ring Form (Trophozoite)', description: 'Early rings with high-contrast red chromatin bead and thin blue cytoplasmic ring loop.' },
        { x: 67, y: 34, name: 'Double Infection Ring Host', description: 'Erythrocyte containing multiple parasite rings, heavily suggestive of high-density P. falciparum loads.' },
        { x: 30, y: 72, name: 'Normal Uninfected Red Blood Cell', description: 'Standard healthy discocyte serving as morphologic size reference (approx 7 microns).' }
      ])
    );

    db.prepare(`
      INSERT INTO bmlt_slides (name, description, target_cell, hint, image_url, fact, options, hotspots)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'Erythrocyte Pathology - Sickle Cell Anemia (Drepanocytes)',
      'Look for elongated, crescent-shaped or sickle-like erythrocytes with pointed ends caused by mutated Hemoglobin S polymer chains under hypoxia.',
      'Sickle Cell',
      'Crescent or banana-shaped erythrocytes causing vascular occlusion.',
      'https://upload.wikimedia.org/wikipedia/commons/a/af/Sickle_cell_anemia_smear.jpg',
      'A single amino acid substitution (valine for glutamic acid at position 6 of the beta-globin chain) is the root genetic cause.',
      'Sickle Cell,Target Cell,Spherocyte,Schistocyte',
      JSON.stringify([
        { x: 48, y: 58, name: 'Classic Drepanocyte (Sickle Erythrocyte)', description: 'Rigid, crescent-shaped cell with sharp pointed ends, formed by polymerized mutant HbS tactile chains.' },
        { x: 32, y: 28, name: 'Normal Discocyte RBC', description: 'Standard healthy biconcave erythrocyte unaffected by sickling triggers.' },
        { x: 68, y: 42, name: 'Target Cell (Codocyte)', description: 'Erythrocyte featuring a target board central ring due to increased membrane surface area relative to hemoglobin content.' }
      ])
    );
  }
} catch (e) {
  console.error("Error seeding bmlt_slides:", e);
}

try {
  const countParams = (db.prepare('SELECT COUNT(*) as cnt FROM bmlt_lab_params').get() as { cnt: number }).cnt;
  if (countParams === 0) {
    const list = [
      { name: 'Hemoglobin (Hb)', unit: 'g/dL', normalMinMale: 13.5, normalMaxMale: 17.5, normalMinFemale: 12.0, normalMaxFemale: 15.5, category: 'Hematology', description: 'Oxygen-carrying protein in red blood cells.' },
      { name: 'Total WBC Count', unit: 'cells/cu.mm', normalMinMale: 4000, normalMaxMale: 11000, normalMinFemale: 4000, normalMaxFemale: 11000, category: 'Hematology', description: 'White blood cells count. Key indicator of systemic infection.' },
      { name: 'Platelet Count', unit: 'Lakhs/cu.mm', normalMinMale: 1.5, normalMaxMale: 4.5, normalMinFemale: 1.5, normalMaxFemale: 4.5, category: 'Hematology', description: 'Crucial element involved in cellular blood coagulation.' },
      { name: 'Serum Bilirubin (Total)', unit: 'mg/dL', normalMinMale: 0.2, normalMaxMale: 1.2, normalMinFemale: 0.2, normalMaxFemale: 1.2, category: 'Biochemistry', description: 'Heme degradation byproduct. Elevated levels indicate Jaundice or Hepatic dysfunction.' },
      { name: 'Fasting Blood Glucose', unit: 'mg/dL', normalMinMale: 70, normalMaxMale: 100, normalMinFemale: 70, normalMaxFemale: 100, category: 'Biochemistry', description: 'Blood sugar density. Primary benchmark for diabetes screening.' },
      { name: 'Serum Creatinine', unit: 'mg/dL', normalMinMale: 0.7, normalMaxMale: 1.3, normalMinFemale: 0.6, normalMaxFemale: 1.1, category: 'Biochemistry', description: 'Muscle creatinine breakdown waste filtered by kidneys. Serves as kidney health check.' }
    ];
    for (const item of list) {
      db.prepare(`
        INSERT INTO bmlt_lab_params (name, unit, normal_min_male, normal_max_male, normal_min_female, normal_max_female, category, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(item.name, item.unit, item.normalMinMale, item.normalMaxMale, item.normalMinFemale, item.normalMaxFemale, item.category, item.description);
    }
  }
} catch (e) {
  console.error("Error seeding bmlt_lab_params:", e);
}

// Ensure topic_id is nullable (SQLite migration)
try {
  const tableInfo = db.prepare("PRAGMA table_info(content_articles)").all() as Array<{
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
  }>;
  const topicIdCol = tableInfo.find(col => col.name === 'topic_id');
  if (topicIdCol && topicIdCol.notnull === 1) {
    console.log("Migrating table content_articles to make topic_id nullable...");
    db.transaction(() => {
      // 1. Rename existing table
      db.prepare("ALTER TABLE content_articles RENAME TO content_articles_old").run();

      // 2. Create the new table with nullable topic_id
      db.prepare(`
        CREATE TABLE content_articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          topic_id INTEGER NULL,
          subject_id INTEGER NULL,
          section TEXT DEFAULT 'textbook',
          headline TEXT NOT NULL,
          content TEXT NOT NULL,
          author_name TEXT NOT NULL,
          file_path TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_ai_generated INTEGER DEFAULT 0
        );
      `).run();

      // 3. Detect which columns exist in content_articles_old to copy them safely
      const oldCols = db.prepare("PRAGMA table_info(content_articles_old)").all() as Array<{ name: string }>;
      const oldColNames = oldCols.map(c => c.name);
      
      const colsToCopy = ['id', 'topic_id', 'headline', 'content', 'author_name', 'created_at', 'is_ai_generated'];
      if (oldColNames.includes('subject_id')) colsToCopy.push('subject_id');
      if (oldColNames.includes('section')) colsToCopy.push('section');
      if (oldColNames.includes('file_path')) colsToCopy.push('file_path');

      const colsStr = colsToCopy.join(', ');
      db.prepare(`
        INSERT INTO content_articles (${colsStr})
        SELECT ${colsStr} FROM content_articles_old
      `).run();

      // 4. Drop the old table
      db.prepare("DROP TABLE content_articles_old").run();
    })();
    console.log("Successfully migrated content_articles to support NULL topic_id.");
  }
} catch (migErr) {
  console.error("Migration to make topic_id nullable failed:", migErr);
}

// Migrate existing batch names from 'Batch of 202X' to 'Batch 202X' for consistent naming conventions
try {
  db.prepare("UPDATE batch_memories SET batch_name = REPLACE(batch_name, 'Batch of ', 'Batch ') WHERE batch_name LIKE 'Batch of %'").run();
} catch (migErr) {
  console.error("Migration error for batch names:", migErr);
}

// Seed memory_batches
try {
  const batchCountResult = db.prepare('SELECT COUNT(*) as count FROM memory_batches').get() as { count: number };
  if (batchCountResult.count === 0) {
    const defaultBatches = ['Batch 2023', 'Batch 2024', 'Batch 2025', 'Batch 2026'];
    const insertBatch = db.prepare('INSERT OR IGNORE INTO memory_batches (name) VALUES (?)');
    for (const b of defaultBatches) {
      insertBatch.run(b);
    }
    console.log("[Seed] Successfully seeded default batch cohorts");
  }
} catch (seedErr) {
  console.error("Failed to seed memory_batches:", seedErr);
}

// Seed default subjects and topics if empty
try {
  const subjectCountResult = db.prepare('SELECT COUNT(*) as count FROM content_subjects').get() as { count: number };
  if (subjectCountResult.count === 0) {
    const defaultSubjects = [
      { name: 'Hematology', logo: 'HeartPulse' },
      { name: 'Clinical Biochemistry', logo: 'FlaskConical' },
      { name: 'Medical Microbiology', logo: 'Microscope' },
      { name: 'Histopathology', logo: 'Dna' },
      { name: 'Clinical Immunology', logo: 'Activity' }
    ];
    const insertSubject = db.prepare('INSERT INTO content_subjects (name, logo) VALUES (?, ?)');
    const insertTopic = db.prepare('INSERT INTO content_topics (subject_id, name) VALUES (?, ?)');
    const insertArticle = db.prepare('INSERT INTO content_articles (topic_id, headline, content, author_name, is_ai_generated) VALUES (?, ?, ?, ?, ?)');

    for (const sub of defaultSubjects) {
      const info = insertSubject.run(sub.name, sub.logo);
      const subId = info.lastInsertRowid;

      // Seed a couple of default topics and articles for each default subject
      if (sub.name === 'Hematology') {
        const t1 = insertTopic.run(subId, 'Introduction to Anemias');
        insertArticle.run(t1.lastInsertRowid, 'Iron Deficiency Anemia: Etiology and Diagnosis', 'Iron deficiency anemia occurs due to dietary lack, chronic blood loss, or malabsorption of iron. Lab parameters show decreased hemoglobin, decreased serum ferritin, decreased MCV and MCH, and increased Total Iron Binding Capacity (TIBC). Peripheral blood smear shows microcytic hypochromic red blood cells with marked anisopoikilocytosis.', 'Dr. S. K. Safin', 0);

        const t2 = insertTopic.run(subId, 'Coagulation Pathways');
        insertArticle.run(t2.lastInsertRowid, 'Understanding PT and APTT tests', 'Prothrombin Time (PT) evaluates the extrinsic and common pathways of coagulation, highly sensitive to factors VII, X, V, II, and fibrinogen. Activated Partial Thromboplastin Time (APTT) evaluates the intrinsic and common pathways (XII, XI, IX, VIII, X, V, II, fibrinogen). Prolonged values indicate clotting factor deficiencies or presence of inhibitors.', 'Pathology Lab Team', 0);
      } else if (sub.name === 'Clinical Biochemistry') {
        const t1 = insertTopic.run(subId, 'Renal Function Tests');
        insertArticle.run(t1.lastInsertRowid, 'Clinical Utility of Serum Creatinine', 'Serum creatinine is a major nitrogenous waste product of muscle metabolism. It is freely filtered by the glomeruli and not reabsorbed, making it an excellent marker of Glomerular Filtration Rate (GFR). Elevated levels are observed in acute kidney injury, chronic kidney disease, and post-renal obstructions.', 'Medical Biochemistry Desk', 0);
      } else if (sub.name === 'Medical Microbiology') {
        const t1 = insertTopic.run(subId, 'Bacterial Staining Techniques');
        insertArticle.run(t1.lastInsertRowid, 'Gram Staining: Principles and Procedure', 'Gram staining differentiates bacteria into Gram-positive (violet) and Gram-negative (pink) based on cell wall composition. Step 1: Primary stain (Crystal Violet). Step 2: Mordant (Gram\'s Iodine). Step 3: Decolorizer (Acetone/Alcohol). Step 4: Counterstain (Safranin). Gram-positive bacteria retain the crystal violet-iodine complex due to their thick peptidoglycan layer.', 'Microbiology Club', 0);
      } else {
        const t1 = insertTopic.run(subId, 'General Diagnostics Overview');
        insertArticle.run(t1.lastInsertRowid, 'Standard Operating Procedures in Student Labs', 'All clinical diagnostics start with robust adherence to safety profiles, wearing personal protective equipment (PPE), validating specimen container signatures, labeling with double confirmation identifier keys, and performing baseline control assays before processing active samples.', 'System Admin', 0);
      }
    }
    console.log("[Seed] Successfully seeded default content subjects and topics");
  }
} catch (seedErr) {
  console.error("Failed to seed content library database:", seedErr);
}

// Seed default standalone books
try {
  const booksCountResult = db.prepare('SELECT COUNT(*) as count FROM standalone_books').get() as { count: number };
  if (booksCountResult.count === 0) {
    const defaultBooks = [
      { title: 'Ross & Wilson Anatomy and Physiology', author_name: 'Dr. S. K. Safin', cover_color: 'teal' },
      { title: 'Godkar Textbook of Medical Laboratory Technology', author_name: 'Pathology Lab Team', cover_color: 'indigo' },
      { title: 'Ananthanarayan Microbiology Book', author_name: 'Microbiology Club', cover_color: 'emerald' },
      { title: 'Harsh Mohan Textbook of Pathology', author_name: 'System Admin', cover_color: 'rose' }
    ];
    const insertBook = db.prepare('INSERT INTO standalone_books (title, author_name, cover_color) VALUES (?, ?, ?)');
    for (const b of defaultBooks) {
      insertBook.run(b.title, b.author_name, b.cover_color);
    }
    console.log("[Seed] Successfully seeded default standalone books");
  }
} catch (bkSeedErr) {
  console.error("Failed to seed standalone books:", bkSeedErr);
}


// Migrations for memory_batches to support cover_url, avatar_url, and motto
try {
  const mbTableInfo = db.prepare("PRAGMA table_info(memory_batches)").all() as any[];
  const mbColumns = mbTableInfo.map(c => c.name);
  if (!mbColumns.includes('cover_url')) {
    db.exec("ALTER TABLE memory_batches ADD COLUMN cover_url TEXT DEFAULT NULL");
  }
  if (!mbColumns.includes('avatar_url')) {
    db.exec("ALTER TABLE memory_batches ADD COLUMN avatar_url TEXT DEFAULT NULL");
  }
  if (!mbColumns.includes('motto')) {
    db.exec("ALTER TABLE memory_batches ADD COLUMN motto TEXT DEFAULT NULL");
  }
} catch (mbErr) {
  console.error("Failed to run memory_batches migrations:", mbErr);
}

// Migrations for demanding_items
const chilliTableInfo = db.prepare("PRAGMA table_info(demanding_items)").all() as any[];
const chilliColumns = chilliTableInfo.map(c => c.name);
if (!chilliColumns.includes('category')) {
  db.exec("ALTER TABLE demanding_items ADD COLUMN category TEXT DEFAULT 'Trending'");
}

// Migrations for performances table
const tableInfo = db.prepare("PRAGMA table_info(performances)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes('group_type')) {
  db.exec("ALTER TABLE performances ADD COLUMN group_type TEXT NOT NULL DEFAULT 'Single'");
}
if (!columns.includes('category')) {
  db.exec("ALTER TABLE performances ADD COLUMN category TEXT NOT NULL DEFAULT ''");
}
if (!columns.includes('media_url')) {
  db.exec("ALTER TABLE performances ADD COLUMN media_url TEXT");
}
if (!columns.includes('media_type')) {
  db.exec("ALTER TABLE performances ADD COLUMN media_type TEXT");
}
if (!columns.includes('time')) {
  db.exec("ALTER TABLE performances ADD COLUMN time TEXT NOT NULL DEFAULT '19:00'");
}
if (!columns.includes('contact_info')) {
  db.exec("ALTER TABLE performances ADD COLUMN contact_info TEXT");
}
if (!columns.includes('doc_id')) {
  db.exec("ALTER TABLE performances ADD COLUMN doc_id TEXT");
}

if (!columns.includes('is_approved')) {
  db.exec("ALTER TABLE performances ADD COLUMN is_approved INTEGER DEFAULT 0");
}
if (!columns.includes('program')) {
  db.exec("ALTER TABLE performances ADD COLUMN program TEXT");
}
if (!columns.includes('program_id')) {
  db.exec("ALTER TABLE performances ADD COLUMN program_id TEXT");
}

// Tables are initialized, now ensure they are empty if desired
// db.exec("DELETE FROM performances"); 
// db.exec("DELETE FROM media");
// db.exec("DELETE FROM demanding_items");

// Seed default admin if empty
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
if (adminCount.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admins (username, password, display_name) VALUES (?, ?, ?)').run('admin', hashedPassword, 'System Admin');
  
  // Adding a second admin to demonstrate multi-admin logic
  const hashedPassword2 = bcrypt.hashSync('staff123', 10);
  db.prepare('INSERT INTO admins (username, password, display_name) VALUES (?, ?, ?)').run('staff', hashedPassword2, 'Event Staff');
}

// Seed default demanding_items if empty
const demandingCount = db.prepare('SELECT COUNT(*) as count FROM demanding_items').get() as { count: number };
if (demandingCount.count === 0) {
  const defaultItems = [
    {
      type: 'song',
      title: 'Summer Breeze lofi',
      link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      description: 'Relaxing background lofi chords for study sessions.',
      category: 'Chill'
    },
    {
      type: 'song',
      title: 'Midnight Drive Synthwave',
      link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
      description: 'Synthesized bassline wave track for driving through campus.',
      category: 'Synthwave'
    },
    {
      type: 'song',
      title: 'Sunset Boulevard Solo',
      link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
      description: 'Slow melodic acoustic saxophone and piano fusion.',
      category: 'Retro Jazz'
    },
    {
      type: 'song',
      title: 'Flow State Electronic',
      link: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      description: 'Uplifting deep house and progressive synthesis.',
      category: 'Electronic'
    }
  ];

  const insertStmt = db.prepare('INSERT INTO demanding_items (type, title, link, description, category) VALUES (?, ?, ?, ?, ?)');
  for (const item of defaultItems) {
    insertStmt.run(item.type, item.title, item.link, item.description, item.category);
  }
}

// Seed default batch memories if empty
const batchMemoryCount = db.prepare('SELECT COUNT(*) as count FROM batch_memories').get() as { count: number };
if (batchMemoryCount.count === 0) {
  const defaultMemories = [
    {
      batch_name: 'Batch of 2024',
      title: 'Our final Year-End Farewell dinner! We will miss the lab chats and late night bug hunting.',
      url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800',
      type: 'photo',
      uploaded_by: 'Rohit Sharma (CSE 24)'
    },
    {
      batch_name: 'Batch of 2023',
      title: 'Winning the annual inter-department Hackathon championship! CSE seniors took the trophy.',
      url: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=800',
      type: 'photo',
      uploaded_by: 'Ananya Sen (ECE 23)'
    },
    {
      batch_name: 'Batch of 2024',
      title: 'Group study session in the main library before the brutal operating systems endsem.',
      url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800',
      type: 'photo',
      uploaded_by: 'Kabir Das (CSE 24)'
    },
    {
      batch_name: 'Batch of 2022',
      title: 'Memory video compilation. Remembering the campus walks, teachers, and student groups.',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      type: 'video',
      uploaded_by: 'Sneha Patil (IT 22)'
    }
  ];

  const insertMemStmt = db.prepare('INSERT INTO batch_memories (batch_name, title, url, type, uploaded_by) VALUES (?, ?, ?, ?, ?)');
  for (const memory of defaultMemories) {
    insertMemStmt.run(memory.batch_name, memory.title, memory.url, memory.type, memory.uploaded_by);
  }
}

// Seed default core settings for specific image keys if not already present
const defaultSettings = [
  { key: 'home_image_1', value: '/images/Hero 01.webp' },
  { key: 'home_image_2', value: '/images/Hero 02.webp' },
  { key: 'home_image_3', value: '/images/Hero 03.webp' },
  { key: 'polaroid_image_1', value: '/images/polaroid_1.png' },
  { key: 'polaroid_image_2', value: '/images/polaroid_2.png' },
  { key: 'polaroid_image_3', value: '/images/polaroid_3.png' },
  { key: 'showcase_image_1', value: '/images/legacy_1.png' },
  { key: 'showcase_image_2', value: '/images/legacy_2.png' }
];

const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
for (const item of defaultSettings) {
  insertSetting.run(item.key, item.value);
}
}

declare module 'express-session' {
  interface SessionData {
    adminId: number;
    username: string;
    displayName: string;
  }
}

async function startServer() {
  // Restore database from Firestore backup first
  if (firestoreDb) {
    try {
      await restoreDatabase();
    } catch (restoreErr) {
      console.error('[Firestore Sync] Failed to restore database on startup, continuing with local file...', restoreErr);
    }
  }

  // Open SQLite database connection
  try {
    db = new Database(dbPath);
    // Integrity check to fail fast if corrupted
    db.pragma('integrity_check');
  } catch (err: any) {
    console.error('[Database] Failed to open SQLite database. Checking for corruption...', err);
    if (err.message && (err.message.includes('corrupt') || err.message.includes('malformed') || err.code === 'SQLITE_CORRUPT')) {
      console.warn('[Database] Database is corrupted, discarding and recreating a clean database file.');
      try {
        if (fs.existsSync(dbPath)) {
          fs.unlinkSync(dbPath);
        }
        db = new Database(dbPath);
      } catch (innerErr) {
        console.error('[Database] Critical error recreating database:', innerErr);
        throw innerErr;
      }
    } else {
      throw err;
    }
  }

  // Re-establish baseline modified time
  if (fs.existsSync(dbPath)) {
    lastBackupMtime = fs.statSync(dbPath).mtimeMs;
  }

  // Initialize and migrate schema & seed data
  initDbAndMigrations();

  const app = express();
  // On Render.com, we must use process.env.PORT. In AI Studio/local, we use strictly 3000.
  const PORT = (process.env.RENDER && process.env.PORT) ? parseInt(process.env.PORT) : 3000;

  // CORS configuration for iframe support
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Required for SameSite=None to work behind proxies
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const sessionDb = process.env.SESSION_DB_NAME || 'sessions.db';
  const sessionDir = process.env.SESSION_DB_DIR || '.';
  if (sessionDir !== '.' && sessionDir !== '/' && !fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }

  app.use(session({
    store: new SQLiteStore({ db: sessionDb, dir: sessionDir }) as any,
    secret: 'campus-pulse-secret-key',
    resave: true,
    saveUninitialized: true,
    rolling: true,
    proxy: true,
    name: 'campus.pulse.sid',
    cookie: { 
      secure: true,      // Required for SameSite=None
      sameSite: 'none',  // Required for cross-origin iframe
      httpOnly: true,    // Security best practice
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Token-based session fallback middleware
  app.use(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && !req.session?.adminId && !(req.session as any)?.studentId) {
      const sessionId = authHeader.split(' ')[1];
      console.log(`[Token Fallback] Attempting to restore session: ${sessionId}`);
      
      // Manually load session from store
      const store = (req.sessionStore as any);
      store.get(sessionId, (err: any, sessionData: any) => {
        if (!err && sessionData) {
          console.log(`[Token Fallback] Session restored successfully for: ${sessionData.username}`);
          // Restore session data to current request
          Object.assign(req.session, sessionData);
          // We need to manually set the sessionID to match the token
          (req as any).sessionID = sessionId;
        }
        next();
      });
    } else {
      next();
    }
  });

  // Auth Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session) {
      console.error('[Auth Error] Session middleware not initialized');
      return res.status(500).json({ error: 'Internal server error' });
    }
    const { adminId, username } = req.session;
    console.log(`[Auth Check] Path: ${req.path}, SessionID: ${req.sessionID}, AdminID: ${adminId}, User: ${username}`);
    
    if (!adminId) {
      console.warn(`[Auth Failed] Unauthorized access attempt to ${req.path}. SessionID: ${req.sessionID}`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };

  const requireAdminOnly = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.session || !req.session.adminId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userRole = (req.session as any).role || 'admin';
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Permission denied. System Admin access required.' });
    }
    next();
  };

  // Google Sheets OAuth Setup
  const getOAuthClient = (req: express.Request, tokens?: any) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set in environment variables');
    }

    // Use APP_URL if available (recommended for AI Studio), otherwise fallback to headers
    const baseUrl = process.env.APP_URL || `${req.headers['x-forwarded-proto'] || req.protocol}://${req.headers.host}`;
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/api/auth/google/callback`;
    
    console.log(`[OAuth] Using Redirect URI: ${redirectUri}`);
    
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    if (tokens) {
      oauth2Client.setCredentials(tokens);
    }

    // Automatically save refreshed tokens
    oauth2Client.on('tokens', (newTokens) => {
      console.log('[OAuth] Tokens refreshed, saving to DB');
      const tokensSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_tokens') as { value: string } | undefined;
      let currentTokens = {};
      if (tokensSetting) {
        try {
          currentTokens = JSON.parse(tokensSetting.value);
        } catch (e) {
          console.error('[OAuth] Failed to parse existing tokens', e);
        }
      }
      const updatedTokens = { ...currentTokens, ...newTokens };
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('google_tokens', JSON.stringify(updatedTokens));
    });

    return oauth2Client;
  };

  app.get('/api/auth/google', requireAdmin, (req, res) => {
    try {
      const oauth2Client = getOAuthClient(req);
      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file'
        ],
        prompt: 'consent'
      });
      res.json({ url });
    } catch (error: any) {
      console.error('[OAuth Error]', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    const { code } = req.query;
    const oauth2Client = getOAuthClient(req);
    
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('google_tokens', JSON.stringify(tokens));
      
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #f4f4f5;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); text-align: center;">
              <h1 style="margin-top: 0;">Connected!</h1>
              <p>Google Sheets has been successfully connected.</p>
              <button onclick="window.close()" style="background: black; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer;">Close Window</button>
            </div>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error getting tokens:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.get('/api/admin/google-status', requireAdmin, (req, res) => {
    const tokens = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_tokens') as { value: string } | undefined;
    const spreadsheetId = db.prepare('SELECT value FROM settings WHERE key = ?').get('spreadsheet_id') as { value: string } | undefined;
    
    res.json({
      connected: !!tokens,
      spreadsheetId: spreadsheetId?.value || ''
    });
  });

  app.post('/api/admin/spreadsheet-id', requireAdmin, (req, res) => {
    let { spreadsheetId } = req.body;
    
    if (!spreadsheetId || typeof spreadsheetId !== 'string') {
      return res.status(400).json({ error: 'Invalid spreadsheet ID' });
    }

    spreadsheetId = spreadsheetId.trim();
    
    // Clean spreadsheet ID if it's a full URL
    const match = spreadsheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      spreadsheetId = match[1];
    }
    
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Spreadsheet ID cannot be empty' });
    }

    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('spreadsheet_id', spreadsheetId);
    res.json({ success: true, spreadsheetId });
  });

  // File Upload Setup
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  const upload = multer({ dest: uploadDir + '/' });

  // Serve uploads directory statically so uploads work locally and in production deployment fallbacks
  app.use('/uploads', express.static(path.join(process.cwd(), uploadDir)));

  app.post('/api/admin/upload', requireAdmin, upload.single('file'), async (req, res) => {
    return handleDriveUpload(req, res);
  });

  app.post('/api/public/upload', upload.single('file'), async (req, res) => {
    return handleDriveUpload(req, res);
  });

  async function handleDriveUpload(req: any, res: any) {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const renamedName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const targetPath = path.join(uploadDir, renamedName);

    try {
      fs.renameSync(req.file.path, targetPath);
      req.file.path = targetPath;
      req.file.filename = renamedName;
    } catch (e) {
      console.warn('[Upload Fallback] Failed to rename uploaded file, keeping original path', e);
    }

    const tokensSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_tokens') as { value: string } | undefined;
    
    if (!tokensSetting) {
      // Direct Local Upload Fallback
      console.log('[Upload Handlers] Google account not connected. Falling back to local storage.');
      const fileUrl = `/uploads/${renamedName}`;
      return res.json({ 
        success: true, 
        fileId: renamedName, 
        url: fileUrl,
        webViewLink: fileUrl 
      });
    }

    try {
      const oauth2Client = getOAuthClient(req, JSON.parse(tokensSetting.value));
      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      const fileMetadata = {
        name: renamedName,
        parents: [] 
      };
      
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path)
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink'
      });

      const fileId = file.data.id;

      await drive.permissions.create({
        fileId: fileId!,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      });

      if (req.file) fs.unlinkSync(req.file.path);

      const directUrl = `https://drive.google.com/uc?id=${fileId}`;
      
      res.json({ 
        success: true, 
        fileId, 
        url: directUrl,
        webViewLink: file.data.webViewLink 
      });
    } catch (error: any) {
      console.error('[Upload Error]', error.message);
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.status(500).json({ error: error.message });
    }
  }

  app.post('/api/admin/sync-sheets', requireAdmin, async (req, res) => {
    const tokensSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_tokens') as { value: string } | undefined;
    const spreadsheetIdSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('spreadsheet_id') as { value: string } | undefined;

    if (!tokensSetting || !spreadsheetIdSetting?.value) {
      return res.status(400).json({ error: 'Google Sheets not configured' });
    }

    try {
      const oauth2Client = getOAuthClient(req, JSON.parse(tokensSetting.value));
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      const { data } = req.body;
      
      if (!data || !Array.isArray(data)) {
        return res.status(400).json({ error: 'No data provided for sync' });
      }

      const sId = spreadsheetIdSetting.value.trim();
      
      // Ensure tabs exist
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: sId
      });
      
      const existingSheetNames = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
      const requiredSheets = ['Events', 'Chillies', 'VIP_Passes'];
      
      const requests = [];
      for (const name of requiredSheets) {
        if (!existingSheetNames.includes(name)) {
          requests.push({
            addSheet: { properties: { title: name } }
          });
        }
      }

      if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sId,
          requestBody: { requests }
        });
      }

      const eventData = data.filter((item: any) => item.type !== 'Demanding Chilli' && item.type !== 'VIP_Pass');
      const chilliData = data.filter((item: any) => item.type === 'Demanding Chilli');
      const vipPassData = data.filter((item: any) => item.type === 'VIP_Pass');

      // Sync Events
      const maxParticipants = eventData.length > 0 ? Math.max(...eventData.map((item: any) => {
        const participants = Array.isArray(item.participants) 
          ? item.participants 
          : (item.type === 'Performance' 
            ? (item.performer ? item.performer.split(', ') : []) 
            : (item.participant_name ? [item.participant_name] : []));
        return participants.length;
      }), 1) : 1;

      const participantHeaders = Array.from({ length: maxParticipants }, (_, i) => `Participant ${i + 1}`);
      const eventHeaders = ['Type', 'ID', 'Title', 'Description', 'Group Type', 'Category', 'Contact Info/Time', 'Media URL', 'Media Type', 'Program', 'Created At', ...participantHeaders];

      const eventValues = [
        eventHeaders,
        ...eventData.map((item: any) => {
          const participants = Array.isArray(item.participants) 
            ? item.participants 
            : (item.type === 'Performance' 
              ? (item.performer ? item.performer.split(', ') : []) 
              : (item.participant_name ? [item.participant_name] : []));
          
          return [
            item.type || 'Participation',
            item.id || 'N/A',
            item.title || 'N/A',
            item.description || 'N/A',
            item.group_type || 'N/A',
            Array.isArray(item.category) ? item.category.join(', ') : (item.category || 'N/A'),
            item.contact_info || item.time || 'N/A',
            item.media_url || 'N/A',
            item.media_type || 'N/A',
            item.program || item.program_id || 'N/A',
            item.created_at || new Date().toISOString(),
            ...participants
          ];
        })
      ];

      await sheets.spreadsheets.values.clear({ spreadsheetId: sId, range: 'Events!A1:Z5000' });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sId,
        range: 'Events!A1',
        valueInputOption: 'RAW',
        requestBody: { values: eventValues }
      });

      // Sync Chillies
      const chilliHeaders = ['ID', 'Type', 'Title', 'Link', 'Description', 'Style', 'Created At'];
      const chilliValues = [
        chilliHeaders,
        ...chilliData.map((item: any) => [
          item.id || 'N/A',
          item.group_type || item.type || 'song',
          item.title || 'N/A',
          item.media_url || item.link || 'N/A',
          item.description || 'N/A',
          item.category || item.style || 'Trending',
          item.created_at || new Date().toISOString()
        ])
      ];

      await sheets.spreadsheets.values.clear({ spreadsheetId: sId, range: 'Chillies!A1:Z5000' });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sId,
        range: 'Chillies!A1',
        valueInputOption: 'RAW',
        requestBody: { values: chilliValues }
      });

      // Sync VIP Passes
      const vipHeaders = ['Name/ID', 'Email/QR Signature', 'Is Validated', 'Validated At', 'Created At'];
      const vipValues = [
        vipHeaders,
        ...vipPassData.map((item: any) => [
          item.name || 'N/A',
          item.qr_code || 'N/A',
          item.is_validated ? 'TRUE' : 'FALSE',
          item.validated_at || 'N/A',
          item.createdAt || 'N/A'
        ])
      ];

      await sheets.spreadsheets.values.clear({ spreadsheetId: sId, range: 'VIP_Passes!A1:Z5000' });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sId,
        range: 'VIP_Passes!A1',
        valueInputOption: 'RAW',
        requestBody: { values: vipValues }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Sheets sync error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/admin/sheet-data', requireAdmin, async (req, res) => {
    const tokensSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_tokens') as { value: string } | undefined;
    const spreadsheetIdSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('spreadsheet_id') as { value: string } | undefined;

    if (!tokensSetting || !spreadsheetIdSetting?.value) {
      return res.status(400).json({ error: 'Google Sheets not configured' });
    }

    let valueRanges: any[] = [];
    try {
      const oauth2Client = getOAuthClient(req, JSON.parse(tokensSetting.value));
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      
      const sId = (spreadsheetIdSetting.value || '').trim();
      if (!sId) {
        console.error('Spreadsheet ID is empty in settings');
        return res.status(400).json({ error: 'Spreadsheet ID is missing in settings' });
      }

      console.log('Fetching sheets for ID:', sId);
      try {
        const response = await sheets.spreadsheets.values.batchGet({
          spreadsheetId: sId,
          ranges: ['Events!A1:Z5000', 'Chillies!A1:Z5000'],
        });
        valueRanges = response.data.valueRanges || [];
      } catch (e: any) {
        console.warn('One or more sheets missing, trying to read what is available');
        // If batchGet fails, it's usually because a range doesn't exist yet.
        // We'll try individually.
        try {
          const eventsRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sId,
            range: 'Events!A1:Z5000'
          });
          valueRanges.push(eventsRes.data);
        } catch (e) { valueRanges.push({}); }

        try {
          const chilliesRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sId,
            range: 'Chillies!A1:Z5000'
          });
          valueRanges.push(chilliesRes.data);
        } catch (e) { valueRanges.push({}); }
      }

      const allItems: any[] = [];

      // Process Events
      const eventRows = valueRanges[0]?.values;
      if (eventRows && eventRows.length > 1) {
        const headers = eventRows[0].map((h: string) => h.toLowerCase().trim());
        const typeIndex = headers.indexOf('type');
        
        eventRows.slice(1).forEach(row => {
          if (!row || row.length === 0) return;
          const item: any = { type: typeIndex !== -1 ? row[typeIndex] : 'Participation' };
          
          eventRows[0].forEach((header: string, index: number) => {
            const val = row[index];
            const cleanVal = typeof val === 'string' ? val.trim() : val;
            
            if (header.startsWith('Participant')) {
              if (!item.participants) item.participants = [];
              if (cleanVal && cleanVal !== 'N/A') item.participants.push(cleanVal);
            } else {
              const key = header.toLowerCase().replace(/ /g, '_').replace('/', '_').trim();
              item[key] = cleanVal;
            }
          });
          
          // Normalize type (case-insensitive conversion)
          if (item.type) {
            const t = String(item.type).toLowerCase();
            if (t.includes('performance')) item.type = 'Performance';
            else if (t.includes('participation')) item.type = 'Participation';
          }
          
          // Fallback if type is missing or invalid
          if (!item.type || item.type === 'N/A') item.type = 'Participation';
          
          allItems.push(item);
        });
      }

      // Process Chillies
      const chilliRows = valueRanges[1]?.values;
      if (chilliRows && chilliRows.length > 1) {
        const headers = chilliRows[0];
        chilliRows.slice(1).forEach(row => {
          if (!row || row.length === 0) return;
          const item: any = { type: 'Demanding Chilli' };
          headers.forEach((header: string, index: number) => {
            const val = row[index];
            const key = header.toLowerCase().replace(/ /g, '_').trim();
            item[key] = typeof val === 'string' ? val.trim() : val;
          });
          // Map back to expected fields with fallbacks
          item.group_type = item.group_type || item.type || 'song';
          item.type = 'Demanding Chilli';
          item.media_url = item.media_url || item.link || item.media_link;
          item.link = item.media_url;
          allItems.push(item);
        });
      }

      res.json({ data: allItems });
    } catch (error: any) {
      console.error('Sheets read error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/reconcile-bulk', requireAdmin, async (req, res) => {
    const { performances, participations, chillies } = req.body;
    
    try {
      // 1. Reconcile Performances (SQLite)
      if (performances && Array.isArray(performances)) {
        for (const p of performances) {
          const id = parseInt(p.id);
          
          if (isNaN(id)) {
            // Check if a performance with this title and performer already exists to prevent duplicates
            const existing = db.prepare('SELECT id FROM performances WHERE title = ? AND performer = ?').get(p.title, p.performer || '') as { id: number } | undefined;
            
            if (existing) {
              // Update existing instead of inserting
              db.prepare(`
                UPDATE performances 
                SET description = ?, group_type = ?, category = ?, media_url = ?, media_type = ?, contact_info = ?, is_approved = ?
                WHERE id = ?
              `).run(
                p.description || '',
                p.group_type || 'Single',
                p.category || '',
                p.media_url || '',
                p.media_type || 'link',
                p.contact_info || '',
                p.is_approved ? 1 : 0,
                existing.id
              );
            } else {
              // New item
              db.prepare(`
                INSERT INTO performances (title, description, performer, group_type, category, media_url, media_type, contact_info, is_approved)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                p.title || 'Untitled',
                p.description || '',
                p.performer || '',
                p.group_type || 'Single',
                p.category || '',
                p.media_url || '',
                p.media_type || 'link',
                p.contact_info || '',
                p.is_approved ? 1 : 0
              );
            }
          } else {
            // Update existing by ID
            db.prepare(`
              UPDATE performances 
              SET title = ?, description = ?, performer = ?, group_type = ?, category = ?, media_url = ?, media_type = ?, contact_info = ?, is_approved = ?
              WHERE id = ?
            `).run(
              p.title || 'Untitled',
              p.description || '',
              p.performer || '',
              p.group_type || 'Single',
              p.category || '',
              p.media_url || '',
              p.media_type || 'link',
              p.contact_info || '',
              p.is_approved ? 1 : 0,
              id
            );
          }
        }
      }

      // 2. Reconcile Chillies (SQLite)
      if (chillies && Array.isArray(chillies)) {
        for (const c of chillies) {
          const id = parseInt(c.id);
          if (isNaN(id)) {
            // Check if already exists by title and type
            const existing = db.prepare('SELECT id FROM demanding_items WHERE title = ? AND type = ?').get(c.title, c.type) as { id: number } | undefined;
            
            if (existing) {
              db.prepare(`
                UPDATE demanding_items 
                SET link = ?, description = ?, category = ?
                WHERE id = ?
              `).run(
                c.link || '',
                c.description || '',
                c.category || 'Trending',
                existing.id
              );
            } else {
              // New item
              db.prepare(`
                INSERT INTO demanding_items (type, title, link, description, category)
                VALUES (?, ?, ?, ?, ?)
              `).run(
                c.type || 'song',
                c.title || 'Untitled',
                c.link || '',
                c.description || '',
                c.category || 'Trending'
              );
            }
          } else {
            // Update existing
            db.prepare(`
              UPDATE demanding_items 
              SET type = ?, title = ?, link = ?, description = ?, category = ?
              WHERE id = ?
            `).run(
              c.type || 'song',
              c.title || 'Untitled',
              c.link || '',
              c.description || '',
              c.category || 'Trending',
              id
            );
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Bulk reconcile error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/public/sync-item', async (req, res) => {
    const tokensSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('google_tokens') as { value: string } | undefined;
    const spreadsheetIdSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('spreadsheet_id') as { value: string } | undefined;

    if (!tokensSetting || !spreadsheetIdSetting?.value) {
      return res.status(200).json({ success: false, message: 'Google Sheets not configured' });
    }

    try {
      const oauth2Client = getOAuthClient(req, JSON.parse(tokensSetting.value));
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
      const { type, data } = req.body;

      const isChilli = type === 'Demanding Chilli';
      const targetSheet = isChilli ? 'Chillies' : 'Events';

      const sId = spreadsheetIdSetting.value.trim();

      // Ensure tab exists
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sId });
      if (!spreadsheet.data.sheets?.some(s => s.properties?.title === targetSheet)) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sId,
          requestBody: { requests: [{ addSheet: { properties: { title: targetSheet } } }] }
        });
      }

      const rowData = isChilli 
        ? [data.id, data.group_type || 'song', data.title, data.media_url || data.link, data.description, data.category || 'Trending', data.created_at || new Date().toISOString()]
        : [
            type || 'Unknown',
            data.id || 'N/A',
            data.title || 'N/A',
            data.description || 'N/A',
            data.group_type || 'N/A',
            Array.isArray(data.category) ? data.category.join(', ') : (data.category || 'N/A'),
            data.contact_info || data.time || 'N/A',
            data.media_url || 'N/A',
            data.media_type || 'N/A',
            data.program || data.program_id || 'N/A',
            data.created_at || new Date().toISOString(),
            ...(Array.isArray(data.participants) ? data.participants : [data.participant_name || 'N/A'])
          ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: sId,
        range: `${targetSheet}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [rowData] }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Public Sheets sync error:', {
        message: error.message,
        code: error.code,
        spreadsheetId: spreadsheetIdSetting.value ? spreadsheetIdSetting.value.substring(0, 10) + '...' : 'NONE',
        response: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data.substring(0, 200) : error.response.data) : 'NO_RESPONSE_DATA'
      });
      res.status(500).json({ error: error.message, details: 'Check server logs for full error' });
    }
  });

  // Log all requests for debugging
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/admin')) {
      console.log(`[Request] ${req.method} ${req.path} - SessionID: ${req.sessionID} - Cookie: ${req.headers.cookie ? 'Present' : 'Missing'}`);
    }
    next();
  });

  // Auth Routes
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username) as any;

    if (admin && bcrypt.compareSync(password, admin.password)) {
      req.session.adminId = admin.id;
      req.session.username = admin.username;
      req.session.displayName = admin.display_name;
      (req.session as any).role = admin.role || 'admin';
      
      req.session.save((err) => {
        if (err) {
          console.error('[Session Save Error]', err);
          return res.status(500).json({ error: 'Session save failed' });
        }
        console.log(`[Login Success] User: ${admin.username}, SessionID: ${req.sessionID}`);
        res.json({ 
          success: true, 
          token: req.sessionID, // Send session ID as token
          admin: { 
            username: admin.username, 
            displayName: admin.display_name,
            role: admin.role || 'admin'
          } 
        });
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: 'Could not log out' });
      res.json({ success: true });
    });
  });

  app.get('/api/admin/me', (req, res) => {
    if (req.session.adminId) {
      res.json({ 
        authenticated: true, 
        admin: { 
          username: req.session.username, 
          displayName: req.session.displayName,
          role: (req.session as any).role || 'admin'
        }
      });
    } else {
      res.json({ authenticated: false });
    }
  });

  // Demanding Items API
  app.get('/api/demanding-items', (req, res) => {
    const items = db.prepare('SELECT * FROM demanding_items ORDER BY created_at DESC').all();
    res.json(items);
  });

  app.post('/api/admin/demanding-items', requireAdmin, (req, res) => {
    const { type, title, link, description, category } = req.body;
    if (!type || !title || !link) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const info = db.prepare('INSERT INTO demanding_items (type, title, link, description, category) VALUES (?, ?, ?, ?, ?)').run(type, title, link, description, category || 'Trending');
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/admin/demanding-items/:id', requireAdmin, (req, res) => {
    const { type, title, link, description, category } = req.body;
    if (!type || !title || !link) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    db.prepare('UPDATE demanding_items SET type = ?, title = ?, link = ?, description = ?, category = ? WHERE id = ?').run(type, title, link, description, category || 'Trending', req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/admin/demanding-items/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM demanding_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // --- STANDALONE BOOKS API ---

  app.get('/api/books', (req, res) => {
    try {
      const books = db.prepare(`
        SELECT b.*, COUNT(d.id) as document_count
        FROM standalone_books b
        LEFT JOIN book_documents d ON b.id = d.book_id
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `).all();
      res.json(books);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch books' });
    }
  });

  app.post('/api/books', (req, res) => {
    const { title, author_name, cover_color, allow_download } = req.body;
    if (!title) return res.status(400).json({ error: 'Book title is required' });
    const isDownloadable = allow_download !== undefined ? Number(allow_download) : 1;
    try {
      const info = db.prepare('INSERT INTO standalone_books (title, author_name, cover_color, allow_download) VALUES (?, ?, ?, ?)')
        .run(title, author_name || 'BMLT Director', cover_color || 'teal', isDownloadable);
      res.json({ id: info.lastInsertRowid, title, author_name: author_name || 'BMLT Director', cover_color: cover_color || 'teal', allow_download: isDownloadable });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create book' });
    }
  });

  app.put('/api/books/:id', (req, res) => {
    const { title, author_name, cover_color, allow_download } = req.body;
    if (!title) return res.status(400).json({ error: 'Book title is required' });
    const isDownloadable = allow_download !== undefined ? Number(allow_download) : 1;
    try {
      db.prepare('UPDATE standalone_books SET title = ?, author_name = ?, cover_color = ?, allow_download = ? WHERE id = ?')
        .run(title, author_name || 'BMLT Director', cover_color || 'teal', isDownloadable, req.params.id);
      res.json({ success: true, id: req.params.id, title, author_name, cover_color, allow_download: isDownloadable });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update book' });
    }
  });

  app.delete('/api/books/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM standalone_books WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete book' });
    }
  });

  app.get('/api/books/:id/documents', (req, res) => {
    try {
      const docs = db.prepare('SELECT * FROM book_documents WHERE book_id = ? ORDER BY created_at DESC').all(req.params.id);
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch book documents' });
    }
  });

  app.post('/api/books/:id/documents/upload', upload.single('file'), async (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { title, author_name, allow_download } = req.body;
    const book_id = Number(req.params.id);
    const isDownloadable = allow_download !== undefined ? Number(allow_download) : 1;

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const sanitizedBase = path.basename(req.file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFilename = `${Date.now()}-${sanitizedBase}${fileExt}`;
    const destinationPath = path.join(uploadDir, uniqueFilename);

    try {
      try {
        fs.renameSync(req.file.path, destinationPath);
      } catch (renameErr) {
        fs.copyFileSync(req.file.path, destinationPath);
        fs.unlinkSync(req.file.path);
      }

      const fileUrl = `/uploads/${uniqueFilename}`;
      const resolvedTitle = title || req.file.originalname;
      const resolvedAuthor = author_name || 'BMLT Scholar';

      const info = db.prepare('INSERT INTO book_documents (book_id, title, file_path, author_name, allow_download) VALUES (?, ?, ?, ?, ?)')
        .run(book_id, resolvedTitle, fileUrl, resolvedAuthor, isDownloadable);

      res.json({
        id: info.lastInsertRowid,
        book_id,
        title: resolvedTitle,
        file_path: fileUrl,
        author_name: resolvedAuthor,
        allow_download: isDownloadable,
        created_at: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upload book document' });
    }
  });

  app.put('/api/books/documents/:id', requireAdmin, (req: any, res: any) => {
    const { title, author_name, allow_download } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const isDownloadable = allow_download !== undefined ? Number(allow_download) : 1;
    try {
      db.prepare('UPDATE book_documents SET title = ?, author_name = ?, allow_download = ? WHERE id = ?')
        .run(title, author_name || 'BMLT Scholar', isDownloadable, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update book document' });
    }
  });

  app.delete('/api/books/documents/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM book_documents WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete book document' });
    }
  });

  // --- NEWS AND UPDATES API ---

  app.get('/api/public/news', (req, res) => {
    try {
      const news = db.prepare('SELECT * FROM news_updates ORDER BY created_at DESC').all();
      res.json(news);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch news' });
    }
  });

  app.post('/api/admin/news', requireAdmin, (req, res) => {
    const { title, content, author_name, category, image_url, file_path } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    try {
      const info = db.prepare('INSERT INTO news_updates (title, content, author_name, category, image_url, file_path) VALUES (?, ?, ?, ?, ?, ?)')
        .run(title, content, author_name || 'Admin', category || 'General', image_url || null, file_path || null);
      res.json({ id: info.lastInsertRowid, title, content, author_name: author_name || 'Admin', category: category || 'General', image_url, file_path });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create news update' });
    }
  });

  app.put('/api/admin/news/:id', requireAdmin, (req, res) => {
    const { title, content, author_name, category, image_url, file_path } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    try {
      db.prepare('UPDATE news_updates SET title = ?, content = ?, author_name = ?, category = ?, image_url = ?, file_path = ? WHERE id = ?')
        .run(title, content, author_name || 'Admin', category || 'General', image_url || null, file_path || null, req.params.id);
      res.json({ success: true, id: req.params.id, title, content, author_name, category, image_url, file_path });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update news update' });
    }
  });

  app.delete('/api/admin/news/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM news_updates WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete news update' });
    }
  });

  // --- MCQ SYSTEM APIs ---
  app.get('/api/public/mcqs', (req, res) => {
    try {
      const subject_id = req.query.subject_id;
      const topic_id = req.query.topic_id;
      let mcqs;
      if (topic_id) {
        mcqs = db.prepare('SELECT * FROM mcqs WHERE topic_id = ? ORDER BY id DESC').all(topic_id);
      } else if (subject_id) {
        mcqs = db.prepare('SELECT * FROM mcqs WHERE subject_id = ? ORDER BY id DESC').all(subject_id);
      } else {
        mcqs = db.prepare('SELECT * FROM mcqs ORDER BY id DESC').all();
      }
      res.json(mcqs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch MCQs' });
    }
  });

  app.post('/api/admin/mcqs', requireAdmin, (req, res) => {
    const { subject_id, topic_id, question, option_a, option_b, option_c, option_d, option_e, correct_option } = req.body;
    if (!question || !option_a || !option_b || !correct_option) {
      return res.status(400).json({ error: 'Missing question, options A and B, or correct option' });
    }
    try {
      const info = db.prepare('INSERT INTO mcqs (subject_id, topic_id, question, option_a, option_b, option_c, option_d, option_e, correct_option) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          subject_id ? Number(subject_id) : null,
          topic_id ? Number(topic_id) : null,
          question,
          option_a,
          option_b,
          option_c || null,
          option_d || null,
          option_e || null,
          correct_option.toUpperCase()
        );
      res.json({ id: info.lastInsertRowid, subject_id, topic_id, question, option_a, option_b, option_c, option_d, option_e, correct_option });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create MCQ' });
    }
  });

  app.put('/api/admin/mcqs/:id', requireAdmin, (req, res) => {
    const { subject_id, topic_id, question, option_a, option_b, option_c, option_d, option_e, correct_option } = req.body;
    if (!question || !option_a || !option_b || !correct_option) {
      return res.status(400).json({ error: 'Missing question, options A and B, or correct option' });
    }
    try {
      db.prepare('UPDATE mcqs SET subject_id = ?, topic_id = ?, question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, option_e = ?, correct_option = ? WHERE id = ?')
        .run(
          subject_id ? Number(subject_id) : null,
          topic_id ? Number(topic_id) : null,
          question,
          option_a,
          option_b,
          option_c || null,
          option_d || null,
          option_e || null,
          correct_option.toUpperCase(),
          req.params.id
        );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update MCQ' });
    }
  });

  app.delete('/api/admin/mcqs/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM mcqs WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete MCQ' });
    }
  });

  // Fetch all articles across all subjects and topics for general search & sequential admin DB listing
  app.get('/api/content/all-articles', (req, res) => {
    try {
      const articles = db.prepare('SELECT * FROM content_articles ORDER BY created_at DESC').all();
      res.json(articles);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch all articles' });
    }
  });

  // Fetch all book documents across all books for general search & sequential admin DB listing
  app.get('/api/content/all-book-documents', (req, res) => {
    try {
      const docs = db.prepare('SELECT * FROM book_documents ORDER BY created_at DESC').all();
      res.json(docs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch all book documents' });
    }
  });

  // Rename a book document / chapter directly from the Sequenced Admin Database Console
  app.put('/api/content/book-document/:id/rename', (req, res) => {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'Document title is required' });
    try {
      db.prepare('UPDATE book_documents SET title = ? WHERE id = ?').run(title, id);
      res.json({ success: true, message: 'Document renamed beautifully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to rename book document' });
    }
  });

  // --- CONTENT LIBRARY API ---

  // Subjects GET, POST, PUT, DELETE
  app.get('/api/content/subjects', (req, res) => {
    try {
      const subjects = db.prepare('SELECT * FROM content_subjects ORDER BY name ASC').all();
      res.json(subjects);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch subjects' });
    }
  });

  app.post('/api/content/subjects', requireAdmin, (req, res) => {
    const { name, logo } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name is required' });
    try {
      const info = db.prepare('INSERT INTO content_subjects (name, logo) VALUES (?, ?)').run(name, logo || 'BookOpen');
      res.json({ id: info.lastInsertRowid, name, logo: logo || 'BookOpen' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create subject' });
    }
  });

  app.put('/api/content/subjects/:id', requireAdmin, (req, res) => {
    const { name, logo } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name is required' });
    try {
      db.prepare('UPDATE content_subjects SET name = ?, logo = ? WHERE id = ?').run(name, logo || 'BookOpen', req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update subject' });
    }
  });

  app.delete('/api/content/subjects/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM content_subjects WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete subject' });
    }
  });

  // Topics GET, POST, PUT, DELETE
  app.get('/api/content/subjects/:id/topics', (req, res) => {
    try {
      const topics = db.prepare('SELECT * FROM content_topics WHERE subject_id = ? ORDER BY name ASC').all(req.params.id);
      res.json(topics);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch topics' });
    }
  });

  app.post('/api/content/topics', requireAdmin, (req, res) => {
    const { name, subject_id } = req.body;
    if (!name || !subject_id) return res.status(400).json({ error: 'Topic name and subject_id are required' });
    try {
      const info = db.prepare('INSERT INTO content_topics (name, subject_id) VALUES (?, ?)').run(name, subject_id);
      res.json({ id: info.lastInsertRowid, name, subject_id });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create topic' });
    }
  });

  app.put('/api/content/topics/:id', requireAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Topic name is required' });
    try {
      db.prepare('UPDATE content_topics SET name = ? WHERE id = ?').run(name, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update topic' });
    }
  });

  app.delete('/api/content/topics/:id', requireAdmin, (req, res) => {
    try {
      db.prepare('DELETE FROM content_topics WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete topic' });
    }
  });

  // Articles GET, POST, PUT, DELETE, GENERATE
  app.get('/api/content/topics/:id/articles', (req, res) => {
    try {
      const articles = db.prepare('SELECT id, topic_id, subject_id, section, headline, author_name, is_ai_generated, file_path, created_at FROM content_articles WHERE topic_id = ? ORDER BY created_at DESC').all(req.params.id);
      res.json(articles);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch articles' });
    }
  });

  app.get('/api/content/subjects/:id/articles', (req, res) => {
    try {
      const articles = db.prepare('SELECT id, topic_id, subject_id, section, headline, author_name, is_ai_generated, file_path, created_at FROM content_articles WHERE subject_id = ? ORDER BY created_at DESC').all(req.params.id);
      res.json(articles);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch subject articles' });
    }
  });

  app.get('/api/content/articles/:id', (req, res) => {
    try {
      const article = db.prepare('SELECT * FROM content_articles WHERE id = ?').get(req.params.id);
      if (!article) return res.status(404).json({ error: 'Article not found' });
      res.json(article);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch article' });
    }
  });

  app.post('/api/content/articles', (req, res) => {
    const { topic_id, subject_id, section, headline, content, author_name, file_path, allow_download } = req.body;
    if (!headline || !content || !author_name) {
      return res.status(400).json({ error: 'Missing headline, content, or author_name' });
    }
    const isDownloadable = allow_download !== undefined ? Number(allow_download) : 1;
    try {
      const info = db.prepare('INSERT INTO content_articles (topic_id, subject_id, section, headline, content, author_name, is_ai_generated, file_path, allow_download) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)')
        .run(topic_id || null, subject_id || null, section || 'textbook', headline, content, author_name, file_path || null, isDownloadable);
      res.json({ id: info.lastInsertRowid, topic_id, subject_id, section, headline, content, author_name, is_ai_generated: 0, file_path, allow_download: isDownloadable });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upload article' });
    }
  });

  app.put('/api/content/articles/:id', (req, res) => {
    const { headline, content, author_name, section, file_path, allow_download } = req.body;
    if (!headline || !content || !author_name) {
      return res.status(400).json({ error: 'Missing headline, content, or author_name' });
    }
    const isDownloadable = allow_download !== undefined ? Number(allow_download) : 1;
    try {
      db.prepare('UPDATE content_articles SET headline = ?, content = ?, author_name = ?, section = ?, file_path = ?, allow_download = ? WHERE id = ?')
        .run(headline, content, author_name, section || 'textbook', file_path || null, isDownloadable, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update article' });
    }
  });

  app.delete('/api/content/articles/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM content_articles WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete article' });
    }
  });

  app.post('/api/content/articles/generate', async (req, res) => {
    const { topicId, headline, topicName, subjectName } = req.body;
    if (!topicId || !headline) {
      return res.status(400).json({ error: 'Missing topicId or headline' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      let generatedContent = '';

      if (apiKey) {
        const genAi = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `You are an expert Medical Laboratory Scientist and Academic Professor specializing in ${subjectName || 'Clinical Diagnostics'}.
Generate a highly focused, scientifically accurate, and concise lecture note on the topic "${headline}" (which belongs to "${topicName || 'General Practice'}").

CRITICAL DESIGN & WRITING DIRECTIVES:
1. NO EXCESSIVE WRITING OR FILLER: Do not write lengthy essays or generic explanations. Write only what is strictly relevant to the heading and the subject scientifically. Avoid conversational introductory fluff or preambles.
2. STRICT SCIENTIFIC ACCURACY: Focus on exact clinical diagnostics, pathways, reagents, microscopy findings, and diagnostic assays.
3. CONCISE STRUCTURE: Arrange logically from basic to advanced diagnostics, utilizing clear compact tables for reference ranges.

Ensure the response contains:
1. Introduction & Basic concepts (Beginner level overview, glossary or basics)
2. In-depth clinical pathology, pathways, pathogens, or cellular features
3. Practical laboratory procedures or assays
4. Real reference clinical parameters, values, and alert limits
5. Troubleshooting lab errors, calibration offsets, and analytical interferences (Advanced scientist level)

CRITICAL IMAGE AND VISUAL DIRECTIVES:
- DO NOT USE IRRELEVANT IMAGES: Only embed an image if it is highly relevant to the diagnostic context. Choose exclusively from these approved Unsplash presets:
  * Blood specimens: \`[image: https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80 | Hematoloy Blood Smear Diagnostics]\`
  * Microscopy inspection: \`[image: https://images.unsplash.com/photo-1579154204601-01588f351167?auto=format&fit=crop&w=800&q=80 | Advanced Microscopic Clinical Inspection]\`
  * Pipetting / Lab testing: \`[image: https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80 | Clinical Laboratory Specimen Assay Running]\`
  * Agar plates: \`[image: https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&w=800&q=80 | Microbe Incubated Agar Culture Plates]\`
  If none of these images match the specific topic scientifically, DO NOT embed any image. Never invent or use custom external image URLs.

- EMBED INTERACTIVE SMART-ART: Include at least ONE smart-art element using our exact custom formats:
  * Step-by-step flowchart: \`[smartart: process | Step 1: Desc -> Step 2: Desc -> Step 3: Desc]\`
  * Comparative items / grids: \`[smartart: grid | Title A: Desc A || Title B: Desc B || Title C: Desc C]\`
  * Critical warning: \`[smartart: alert | CRITICAL: Description...]\`
  * Timeline progression: \`[smartart: timeline | Phase 1: Description -> Phase 2: Description]\`
  * Cyclical loops: \`[smartart: cycle | Step 1 -> Step 2 -> Step 3 -> back to 1]\`

Also, use slide splitters \`--- [slide] ---\` between major sections to group them elegantly so mobile viewers can read them as a clean slide deck.`;

        const response = await genAi.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
        });

        generatedContent = response.text || '';
      }

      if (!generatedContent) {
        generatedContent = `### Comprehensive Overview of ${headline}\n\n*Generated by VIBE academic backup generator.*\n\n#### 1. Introduction & Overview\nThis lecture note covers the absolute essentials of **${headline}** in relation to modern Medical Lab Technology.\n\n#### 2. Clinical Significance\nIn clinical diagnosis, understanding these systems is key to interpreting hematological, biochemical, or microbiological shifts in patient health.\n\n#### 3. Diagnostic Procedures\n- Sample preparation and collection\n- Quality control verification\n- High-resolution morphological analytics\n- Post-analytical validation and reference reporting.`;
      }

      // Insert article into database
      const info = db.prepare('INSERT INTO content_articles (topic_id, headline, content, author_name, is_ai_generated) VALUES (?, ?, ?, ?, 1)').run(topicId, headline, generatedContent, 'VIBE AI Instructor');

      const newArticle = {
        id: info.lastInsertRowid,
        topic_id: topicId,
        headline,
        content: generatedContent,
        author_name: 'VIBE AI Instructor',
        is_ai_generated: 1,
        created_at: new Date().toISOString()
      };

      res.json(newArticle);
    } catch (err: any) {
      console.error("Gemini Content Generation error:", err);
      res.status(500).json({ error: err.message || 'Failed to compile article with AI' });
    }
  });

  app.post('/api/content/articles/upload-document', upload.single('file'), async (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No document file uploaded' });
    }

    const { subjectId, topicId, section, author_name, headline, allow_download } = req.body;
    const isDownloadable = allow_download !== undefined ? Number(allow_download) : 1;
    const resolvedSubjectId = subjectId ? Number(subjectId) : null;
    const resolvedTopicId = topicId ? Number(topicId) : null;
    const resolvedSection = section || 'textbook';

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Generate a secure unique filename with timestamp to preserve extension & avoid overlaps
    const sanitizedBase = path.basename(req.file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueFilename = `${Date.now()}-${sanitizedBase}${fileExt}`;
    const destinationPath = path.join(uploadDir, uniqueFilename);

    try {
      // Direct file move/save (cross-device safe fallback)
      try {
        fs.renameSync(req.file.path, destinationPath);
      } catch (renameErr) {
        console.warn('[Upload Server] fs.renameSync failed, fallback to copy+unlink:', renameErr);
        fs.copyFileSync(req.file.path, destinationPath);
        fs.unlinkSync(req.file.path);
      }

      const userAuthor = author_name || 'Academic Scholar';
      const resolvedHeadline = headline || req.file.originalname;
      const fileUrl = `/uploads/${uniqueFilename}`;

      // Dynamically extract text content to support in-app study text reading fallback
      let extractedContent = `Document Attachment: ${req.file.originalname}`;
      try {
        console.log(`[Upload Parser] Extracting content from ${fileExt} file...`);
        const ast = await officeParser.parseOffice(destinationPath);
        const parsedText = ast.toText();
        if (parsedText && typeof parsedText === 'string' && parsedText.trim()) {
          extractedContent = parsedText.trim();
          console.log(`[Upload Parser] Successfully extracted ${extractedContent.length} chars.`);
        }
      } catch (parserErr) {
        console.warn('[Upload Parser] OfficeParser failed, using fallback label:', parserErr);
      }

      // Insert directly into the database as a document path item with its text parsed inside the content column
      const info = db.prepare('INSERT INTO content_articles (topic_id, subject_id, section, headline, content, author_name, is_ai_generated, file_path, allow_download) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)')
        .run(resolvedTopicId, resolvedSubjectId, resolvedSection, resolvedHeadline, extractedContent, userAuthor, fileUrl, isDownloadable);

      const newArticle = {
        id: info.lastInsertRowid,
        topic_id: resolvedTopicId,
        subject_id: resolvedSubjectId,
        section: resolvedSection,
        headline: resolvedHeadline,
        content: extractedContent,
        author_name: userAuthor,
        is_ai_generated: 0,
        file_path: fileUrl,
        allow_download: isDownloadable,
        created_at: new Date().toISOString()
      };

      res.json(newArticle);
    } catch (err: any) {
      console.error("Document upload error:", err);
      // Clean up temp file on error if it still exists
      if (fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      res.status(500).json({ error: err.message || 'Failed to process and store document' });
    }
  });

  // MCQ AI Generator Endpoint
  app.post('/api/content/mcq/generate', async (req: any, res: any) => {
    const { topicId, subjectId, authorPrompt, authorName, subjectName, topicName } = req.body;
    if (!topicId || !authorPrompt) {
      return res.status(400).json({ error: 'Missing topic association or generation guidelines' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      let mcqsJson = '';

      if (apiKey) {
        const genAi = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });

        const prompt = `You are an expert Medical Laboratory Scientist and Academic Professor specializing in ${subjectName || 'Clinical Diagnostics'}.
Your task is to generate high-quality, scientifically accurate, and interactive Multiple-Choice Questions (MCQs) on the topic: "${topicName || 'Lab Practice'}".

Specific author guidelines on the type of questions:
"${authorPrompt}"

You MUST return a JSON array at the root matching this exact schema:
[
  {
    "question": "The question or clinical scenario text.",
    "options": ["A text", "B text", "C text", "D text"],
    "answerIndex": 2, // 0-based index of correct option
    "explanation": "Detailed professional explanation."
  }
]
Do not return any other text or wrapper. Return ONLY the JSON.`;

        const response = await genAi.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        mcqsJson = response.text || '';
      }

      // Fallback questions if API key isn't provided or fails
      if (!mcqsJson || mcqsJson.trim().length === 0) {
        mcqsJson = JSON.stringify([
          {
            "question": `Review MCQ on ${topicName || 'chemical analytes'}: Which parameter is considered the gold-standard test in quality control?`,
            "options": ["Standard deviation analysis", "Single diagnostic measurement", "Qualitative observation only", "Comparing with historic files"],
            "answerIndex": 0,
            "explanation": "Standard deviation analysis and Levey-Jennings charts are the standard statistical rules for daily clinical laboratory quality control."
          },
          {
            "question": `To ensure precision of laboratory instruments, which of the following is performed daily?`,
            "options": ["Calibration controls", "Washing with regular tap water", "Reporting raw results directly", "Powering off the analyzer repeatedly"],
            "answerIndex": 0,
            "explanation": "Running calibration controls monitors system accuracy and checks for drifts or offsets prior to analyzing clinical patient specimens."
          }
        ]);
      }

      const headline = `MCQ Study Guide: ${authorPrompt.slice(0, 40)}...`;
      const userAuthor = authorName || 'Academic Advisor';

      const info = db.prepare('INSERT INTO content_articles (topic_id, subject_id, section, headline, content, author_name, is_ai_generated) VALUES (?, ?, ?, ?, ?, ?, 1)')
        .run(topicId, subjectId ? Number(subjectId) : null, 'mcq', headline, mcqsJson, userAuthor);

      const newArticle = {
        id: info.lastInsertRowid,
        topic_id: Number(topicId),
        subject_id: subjectId ? Number(subjectId) : null,
        section: 'mcq',
        headline,
        content: mcqsJson,
        author_name: userAuthor,
        is_ai_generated: 1,
        created_at: new Date().toISOString()
      };

      res.json(newArticle);
    } catch (err: any) {
      console.error("MCQ Generation error:", err);
      res.status(500).json({ error: err.message || 'Failed to generate MCQ with AI' });
    }
  });

  // Vibe Check AI Mood Analytics & Smart Playlists Route
  app.post('/api/vibe-check-playlist', async (req, res) => {
    const { mood } = req.body;
    if (!mood || typeof mood !== 'string') {
      return res.status(400).json({ error: 'Please enter how you are feeling.' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('GEMINI_API_KEY is not set in environment variables. Falling back to local procedural mood analysis.');
        return res.json(getProceduralFallbackResponse(mood));
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Get existing songs from SQLite database to recommend them if they match!
      const dbSongs = db.prepare("SELECT * FROM demanding_items WHERE type = 'song'").all() as any[];
      const songPool = dbSongs.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description || '',
        category: s.category || 'Trending',
        link: s.link
      }));

      const prompt = `You are an expert AI Music DJ & Mood Analyzer for VIBE, our college campus festival and platform.
Analyze the user's mood inputs, do a sophisticated mood "vibe check", and return of a JSON containing:
1. "detectedMood": a 1-2 word mood title.
2. "moodSummary": a poetic, human, and encouraging 1-2 sentence description of their current state.
3. "colorPalette": tailwind css styles for background primary ("bg-rose-950" etc), text ("text-rose-400" etc), and border colors ("border-rose-500/20") that resonate with this mood. Let these be highly premium, deep, moody dark background colors (dark slate, dark red, dark teal, dark indigo).
4. "scores": analytical scores (0 to 100) for "happiness", "energy", "focus", and "calm".
5. "playlist": a smart customized selection of exactly 3-4 songs.
   We have a pool of existing tracks from our campus database. If any of these fits the mood, you MUST prefer using them. Match them dynamically based on their titles, descriptions, and category!
   - Available Tracks Pool: ${JSON.stringify(songPool)}
   
   If enough pool tracks don't match, or you want to expand, you should suggest newly inspired virtual songs with 'id' set to null and 'link' to a reasonable YouTube search query or link, but with wonderful titles and descriptions.
   
For each song in the playlist, provide:
- "id": number (for pool songs) or null (for virtual songs)
- "title": song title
- "artist": artist of the song (e.g. standard artist or an inspired student performer group name for virtual songs, e.g. "The College Jazz Trio", "Symphony Club" or "DJ Neon")
- "vibeReason": 1-2 sentences of why this track perfectly matches their current feeling
- "vibeStyle": sub-genre / style category
- "bpm": beat count per minute
- "audioFrequency": an identifier string for procedural sound wave effects in the UI: choose from "synthWave", "ambientMelody", "subBass", "jazzyGuitar", "chillHarmonics"
- "link": the real web link (from pool song) or helper search link

User's described mood: "${mood}"
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedMood: { type: Type.STRING },
              moodSummary: { type: Type.STRING },
              colorPalette: {
                type: Type.OBJECT,
                properties: {
                  primary: { type: Type.STRING },
                  text: { type: Type.STRING },
                  border: { type: Type.STRING }
                },
                required: ["primary", "text", "border"]
              },
              scores: {
                type: Type.OBJECT,
                properties: {
                  happiness: { type: Type.INTEGER },
                  energy: { type: Type.INTEGER },
                  focus: { type: Type.INTEGER },
                  calm: { type: Type.INTEGER }
                },
                required: ["happiness", "energy", "focus", "calm"]
              },
              playlist: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER, nullable: true },
                    title: { type: Type.STRING },
                    artist: { type: Type.STRING },
                    vibeReason: { type: Type.STRING },
                    vibeStyle: { type: Type.STRING },
                    bpm: { type: Type.INTEGER },
                    audioFrequency: { type: Type.STRING },
                    link: { type: Type.STRING }
                  },
                  required: ["title", "artist", "vibeReason", "vibeStyle", "bpm", "audioFrequency", "link"]
                }
              }
            },
            required: ["detectedMood", "moodSummary", "colorPalette", "scores", "playlist"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Empty response from Gemini API');
      }

      const playlistData = JSON.parse(responseText.trim());
      res.json(playlistData);

    } catch (error: any) {
      console.error('[Vibe Check API Error]', error);
      res.json(getProceduralFallbackResponse(mood));
    }
  });

  // Public API Routes
  app.get('/api/media', (req, res) => {
    const media = db.prepare('SELECT * FROM media ORDER BY year DESC, created_at DESC').all();
    res.json(media);
  });

  app.get('/api/batch-memories', (req, res) => {
    const memories = db.prepare('SELECT * FROM batch_memories ORDER BY batch_name DESC, created_at DESC').all();
    res.json(memories);
  });

  app.get('/api/batches', (req, res) => {
    try {
      const batches = db.prepare('SELECT * FROM memory_batches ORDER BY name DESC').all();
      res.json(batches || []);
    } catch (err: any) {
      console.error('Error fetching batches:', err);
      res.status(500).json({ error: 'Could not fetch batches' });
    }
  });

  app.post('/api/admin/batches', requireAdmin, (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    try {
      const trimmedName = name.trim();
      // Ensure it has a valid name format, e.g. "Batch 2027" or "Batch of 2027"
      db.prepare('INSERT OR IGNORE INTO memory_batches (name) VALUES (?)').run(trimmedName);
      res.json({ success: true, message: `Batch ${trimmedName} added successfully!` });
    } catch (err: any) {
      console.error('Error adding batch:', err);
      res.status(500).json({ error: 'Could not add batch' });
    }
  });

  app.delete('/api/admin/batches/:name', requireAdmin, (req, res) => {
    const { name } = req.params;
    if (!name) {
      return res.status(400).json({ error: 'Batch name is required' });
    }

    try {
      const decodedName = decodeURIComponent(name).trim();
      // Precaution/clean-up: Delete all associated memories inside batch_memories
      db.prepare('DELETE FROM batch_memories WHERE batch_name = ?').run(decodedName);
      // Now delete the batch cohort card
      db.prepare('DELETE FROM memory_batches WHERE name = ?').run(decodedName);
      res.json({ success: true, message: `Batch "${decodedName}" and all associated gallery memories were deleted successfully!` });
    } catch (err: any) {
      console.error('Error deleting batch:', err);
      res.status(500).json({ error: 'Could not delete batch' });
    }
  });

  app.put('/api/admin/batches/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { cover_url, avatar_url, motto } = req.body;
    try {
      db.prepare('UPDATE memory_batches SET cover_url = ?, avatar_url = ?, motto = ? WHERE id = ?')
        .run(cover_url || null, avatar_url || null, motto || null, id);
      res.json({ success: true, message: 'Batch cohort updated successfully!' });
    } catch (err: any) {
      console.error('Error updating batch cohort:', err);
      res.status(500).json({ error: 'Could not update batch cohort details' });
    }
  });

  app.get('/api/public/settings', (req, res) => {
    try {
      const keys = [
        'allow_viewer_uploads',
        'breaking_news_enabled',
        'breaking_news_text',
        'home_image_1',
        'home_image_2',
        'home_image_3',
        'polaroid_image_1',
        'polaroid_image_2',
        'polaroid_image_3',
        'showcase_image_1',
        'showcase_image_2',
        'custom_app_logo_svg'
      ];
      
      const payload: Record<string, any> = {};
      const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
      
      for (const k of keys) {
        // Enforce environmentOverrides first sothat they can configure default images via env
        let envVal: string | undefined;
        if (k === 'home_image_1') envVal = process.env.HOME_IMAGE_1;
        else if (k === 'home_image_2') envVal = process.env.HOME_IMAGE_2;
        else if (k === 'home_image_3') envVal = process.env.HOME_IMAGE_3;
        else if (k === 'polaroid_image_1') envVal = process.env.POLAROID_IMAGE_1;
        else if (k === 'polaroid_image_2') envVal = process.env.POLAROID_IMAGE_2;
        else if (k === 'polaroid_image_3') envVal = process.env.POLAROID_IMAGE_3;
        else if (k === 'showcase_image_1') envVal = process.env.SHOWCASE_IMAGE_1;
        else if (k === 'showcase_image_2') envVal = process.env.SHOWCASE_IMAGE_2;
        else if (k === 'custom_app_logo_svg') envVal = process.env.APP_LOGO_URL;

        if (envVal) {
          payload[k] = envVal;
          continue;
        }

        const row = stmt.get(k) as { value: string } | undefined;
        if (k === 'allow_viewer_uploads') {
          payload[k] = row ? row.value === 'true' : true;
        } else if (k === 'breaking_news_enabled') {
          payload[k] = row ? row.value === 'true' : false;
        } else {
          payload[k] = row ? row.value : '';
        }
      }
      
      res.json(payload);
    } catch (err: any) {
      console.error('Error fetching public settings:', err);
      res.json({ 
        allow_viewer_uploads: true,
        breaking_news_enabled: false,
        breaking_news_text: '',
        home_image_1: '',
        home_image_2: '',
        home_image_3: '',
        polaroid_image_1: '',
        polaroid_image_2: '',
        polaroid_image_3: '',
        showcase_image_1: '',
        showcase_image_2: ''
      });
    }
  });

  app.post('/api/admin/settings/batch', requireAdmin, (req, res) => {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }
    
    try {
      const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      const tx = db.transaction((data) => {
        for (const [k, v] of Object.entries(data)) {
          let strVal = '';
          if (typeof v === 'boolean') {
            strVal = v ? 'true' : 'false';
          } else if (v !== null && v !== undefined) {
            strVal = String(v);
          }
          stmt.run(k, strVal);
        }
      });
      tx(settings);
      res.json({ success: true, message: 'Settings saved successfully' });
    } catch (err: any) {
      console.error('Error updating settings batch:', err);
      res.status(500).json({ error: 'Could not update settings' });
    }
  });

  app.post('/api/admin/settings/allow-viewer-uploads', requireAdmin, (req, res) => {
    const { enabled } = req.body;
    if (enabled === undefined) {
      return res.status(400).json({ error: 'Field "enabled" is required' });
    }
    
    try {
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('allow_viewer_uploads', enabled ? 'true' : 'false');
      res.json({ success: true, enabled });
    } catch (err: any) {
      console.error('Error updating viewer uploads setting:', err);
      res.status(500).json({ error: 'Could not update setting' });
    }
  });

  app.post('/api/public/batch-memories', (req, res) => {
    // Check if public uploads are allowed, or if user is an admin
    const isAdmin = !!(req.session && req.session.adminId);
    if (!isAdmin) {
      try {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('allow_viewer_uploads') as { value: string } | undefined;
        const allowed = row ? row.value === 'true' : true;
        if (!allowed) {
          return res.status(403).json({ error: 'Public uploads are currently disabled by the administrator.' });
        }
      } catch (err) {
        // Safe fallback if table read fails
      }
    }

    const { batch_name, title, url, type, uploaded_by } = req.body;
    if (!batch_name || !title || !url || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const info = db.prepare('INSERT INTO batch_memories (batch_name, title, url, type, uploaded_by) VALUES (?, ?, ?, ?, ?)').run(batch_name, title, url, type, uploaded_by || 'Anonymous');
    res.json({ id: info.lastInsertRowid, message: 'Memory successfully added to the Memory Book!' });
  });

  app.get('/api/performances', (req, res) => {
    const performances = db.prepare('SELECT id, title, description, performer, time, group_type, category, media_url, media_type, program, program_id, created_at FROM performances WHERE is_approved = 1 ORDER BY created_at DESC').all();
    res.json(performances);
  });

  // Public Submission Route
  app.post('/api/public/performances', async (req, res) => {
    const { title, description, performer, time, group_type, category, media_url, media_type, contact_info, doc_id, program, program_id } = req.body;
    if (!title || !description || !performer || !group_type || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const performanceTime = time || '19:00';
    const categoryStr = Array.isArray(category) ? category.join(', ') : (category || '');
    const info = db.prepare('INSERT INTO performances (title, description, performer, time, group_type, category, media_url, media_type, contact_info, doc_id, program, program_id, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)').run(title, description, performer, performanceTime, group_type, categoryStr, media_url, media_type, contact_info, doc_id, program || 'N/A', program_id || 'default');
    res.json({ id: info.lastInsertRowid, message: 'Performance submitted for approval' });
  });

  // Protected Admin API Routes
  app.get('/api/admin/performances/all', requireAdmin, (req, res) => {
    const performances = db.prepare('SELECT * FROM performances ORDER BY created_at DESC').all();
    res.json(performances);
  });

  app.post('/api/admin/performances/:id/approve', requireAdmin, (req, res) => {
    const info = db.prepare('UPDATE performances SET is_approved = 1 WHERE id = ?').run(req.params.id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Performance not found' });
    }
    res.json({ success: true });
  });

  app.post('/api/media', requireAdmin, (req, res) => {
    const { title, url, type, year } = req.body;
    if (!title || !url || !type || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const info = db.prepare('INSERT INTO media (title, url, type, year) VALUES (?, ?, ?, ?)').run(title, url, type, year);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete('/api/media/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM media WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/admin/batch-memories/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM batch_memories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/performances', requireAdmin, (req, res) => {
    const { title, description, performer, time, group_type, category, media_url, media_type, contact_info, doc_id, is_approved } = req.body;
    if (!title || !description || !performer || !group_type || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const performanceTime = time || '19:00';
    const approved = is_approved !== undefined ? is_approved : 0;
    const categoryStr = Array.isArray(category) ? category.join(', ') : (category || '');
    const info = db.prepare('INSERT INTO performances (title, description, performer, time, group_type, category, media_url, media_type, contact_info, doc_id, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(title, description, performer, performanceTime, group_type, categoryStr, media_url, media_type, contact_info, doc_id, approved);
    res.json({ id: info.lastInsertRowid });
  });

  app.put('/api/performances/:id', requireAdmin, (req, res) => {
    const { title, description, performer, time, group_type, category, media_url, media_type, contact_info } = req.body;
    if (!title || !description || !performer || !group_type || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const performanceTime = time || '19:00';
    const categoryStr = Array.isArray(category) ? category.join(', ') : (category || '');
    db.prepare('UPDATE performances SET title = ?, description = ?, performer = ?, time = ?, group_type = ?, category = ?, media_url = ?, media_type = ?, contact_info = ? WHERE id = ?').run(title, description, performer, performanceTime, group_type, categoryStr, media_url, media_type, contact_info, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/performances/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM performances WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/performances/by-doc/:docId', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM performances WHERE doc_id = ?').run(req.params.docId);
    res.json({ success: true });
  });

  // Admin Management (Protected)
  app.get('/api/admin/list', requireAdminOnly, (req, res) => {
    const admins = db.prepare("SELECT id, username, display_name, COALESCE(role, 'admin') as role, created_at FROM admins").all();
    res.json(admins);
  });

  app.post('/api/admin/register', requireAdminOnly, (req, res) => {
    const { username, password, display_name, role } = req.body;
    if (!username || !password || !display_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = db.prepare('INSERT INTO admins (username, password, display_name, role) VALUES (?, ?, ?, ?)').run(username, hashedPassword, display_name, role || 'author');
      res.json({ id: info.lastInsertRowid });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Username already exists' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.delete('/api/admin/:id', requireAdminOnly, (req, res) => {
    const targetId = parseInt(req.params.id);
    if (targetId === req.session.adminId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }
    
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
    if (adminCount.count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin account' });
    }

    db.prepare('DELETE FROM admins WHERE id = ?').run(targetId);
    res.json({ success: true });
  });

  app.put('/api/admin/:id/password', requireAdminOnly, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashedPassword, req.params.id);
    res.json({ success: true });
  });

  app.post('/api/admin/recovery-reset', (req, res) => {
    const { username, recoveryKey, newPassword } = req.body;
    const systemRecoveryKey = process.env.ADMIN_RECOVERY_KEY || 'campus-pulse-recovery-2026';
    
    if (recoveryKey !== systemRecoveryKey) {
      return res.status(401).json({ error: 'Invalid recovery key' });
    }

    const admin = db.prepare('SELECT id FROM admins WHERE username = ?').get(username) as { id: number } | undefined;
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE admins SET password = ? WHERE id = ?').run(hashedPassword, admin.id);
    res.json({ success: true });
  });

  // --- BMLT DESK CUSTOM MCQS & CASE STUDIES APIs ---

  // Custom BMLT MCQs
  app.get('/api/bmlt/mcqs', (req, res) => {
    try {
      const mcqs = db.prepare('SELECT * FROM bmlt_mcqs ORDER BY id DESC').all();
      res.json(mcqs);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch BMLT MCQs' });
    }
  });

  app.post('/api/bmlt/mcqs', (req, res) => {
    const { question, option_a, option_b, option_c, option_d, correct_option, image_url, explanation } = req.body;
    if (!question || !option_a || !option_b || !correct_option) {
      return res.status(400).json({ error: 'Missing required MCQ fields' });
    }
    try {
      const info = db.prepare(`
        INSERT INTO bmlt_mcqs (question, option_a, option_b, option_c, option_d, correct_option, image_url, explanation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(question, option_a, option_b, option_c || null, option_d || null, correct_option, image_url || null, explanation || null);
      res.json({ id: info.lastInsertRowid, question, option_a, option_b, option_c, option_d, correct_option, image_url, explanation });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create BMLT MCQ' });
    }
  });

  app.put('/api/bmlt/mcqs/:id', (req, res) => {
    const { question, option_a, option_b, option_c, option_d, correct_option, image_url, explanation } = req.body;
    if (!question || !option_a || !option_b || !correct_option) {
      return res.status(400).json({ error: 'Missing required MCQ fields' });
    }
    try {
      db.prepare(`
        UPDATE bmlt_mcqs 
        SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, image_url = ?, explanation = ?
        WHERE id = ?
      `).run(question, option_a, option_b, option_c || null, option_d || null, correct_option, image_url || null, explanation || null, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update BMLT MCQ' });
    }
  });

  app.delete('/api/bmlt/mcqs/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM bmlt_mcqs WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete BMLT MCQ' });
    }
  });

  // Custom BMLT Case Studies
  app.get('/api/bmlt/cases', (req, res) => {
    try {
      const cases = db.prepare('SELECT * FROM bmlt_case_studies ORDER BY id DESC').all();
      const mapped = cases.map((c: any) => {
        const parts = [];
        if (c.option_a) parts.push(c.option_a);
        if (c.option_b) parts.push(c.option_b);
        if (c.option_c) parts.push(c.option_c);
        if (c.option_d) parts.push(c.option_d);
        const optionsStr = parts.join(', ');

        return {
          ...c,
          scenario: c.presentation || '',
          options: optionsStr,
          correct: c.type === 'mcq' ? (c.correct_option || '') : (c.correct_guidelines || ''),
          explanation: c.correct_guidelines || '',
          normalParams: ''
        };
      });
      res.json(mapped);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch BMLT cases' });
    }
  });

  app.post('/api/bmlt/cases', (req, res) => {
    const { 
      title, presentation, scenario, type, question, 
      option_a, option_b, option_c, option_d, options,
      correct_option, correct, correct_guidelines, explanation 
    } = req.body;
    
    const final_presentation = presentation || scenario;
    if (!title || !final_presentation || !type || !question) {
      return res.status(400).json({ error: 'Missing required case study fields' });
    }

    let a = option_a, b = option_b, c = option_c, d = option_d;
    if (options && typeof options === 'string' && !a) {
      const parts = options.split(',').map(s => s.trim());
      a = parts[0] || null;
      b = parts[1] || null;
      c = parts[2] || null;
      d = parts[3] || null;
    }

    const final_correct_option = type === 'mcq' ? (correct_option || correct || null) : null;
    const final_correct_guidelines = type === 'paragraph' ? (correct_guidelines || explanation || correct || null) : null;

    try {
      const info = db.prepare(`
        INSERT INTO bmlt_case_studies (title, presentation, type, question, option_a, option_b, option_c, option_d, correct_option, correct_guidelines)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, final_presentation, type, question, a || null, b || null, c || null, d || null, final_correct_option, final_correct_guidelines);
      res.json({ id: info.lastInsertRowid, title, presentation: final_presentation, type, question });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create BMLT case study' });
    }
  });

  app.put('/api/bmlt/cases/:id', (req, res) => {
    const { 
      title, presentation, scenario, type, question, 
      option_a, option_b, option_c, option_d, options,
      correct_option, correct, correct_guidelines, explanation 
    } = req.body;
    
    const final_presentation = presentation || scenario;
    if (!title || !final_presentation || !type || !question) {
      return res.status(400).json({ error: 'Missing required case study fields' });
    }

    let a = option_a, b = option_b, c = option_c, d = option_d;
    if (options && typeof options === 'string' && !a) {
      const parts = options.split(',').map(s => s.trim());
      a = parts[0] || null;
      b = parts[1] || null;
      c = parts[2] || null;
      d = parts[3] || null;
    }

    const final_correct_option = type === 'mcq' ? (correct_option || correct || null) : null;
    const final_correct_guidelines = type === 'paragraph' ? (correct_guidelines || explanation || correct || null) : null;

    try {
      db.prepare(`
        UPDATE bmlt_case_studies 
        SET title = ?, presentation = ?, type = ?, question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?, correct_guidelines = ?
        WHERE id = ?
      `).run(title, final_presentation, type, question, a || null, b || null, c || null, d || null, final_correct_option, final_correct_guidelines, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update BMLT case study' });
    }
  });

  app.delete('/api/bmlt/cases/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM bmlt_case_studies WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete BMLT case study' });
    }
  });

  // Dynamic BMLT Microscope Slides
  app.get('/api/bmlt/slides', (req, res) => {
    try {
      const slides = db.prepare('SELECT * FROM bmlt_slides ORDER BY id ASC').all();
      res.json(slides);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch BMLT slides' });
    }
  });

  app.post('/api/bmlt/slides', (req, res) => {
    const { name, description, target_cell, targetCell, hint, image_url, imageUrl, fact, options, hotspots } = req.body;
    const final_target_cell = target_cell || targetCell;
    const final_image_url = image_url || imageUrl;
    if (!name || !description || !final_target_cell || !final_image_url || !options) {
      return res.status(400).json({ error: 'Missing required slide fields' });
    }
    try {
      const hspots = typeof hotspots === 'string' ? hotspots : JSON.stringify(hotspots || []);
      const info = db.prepare(`
        INSERT INTO bmlt_slides (name, description, target_cell, hint, image_url, fact, options, hotspots)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, description, final_target_cell, hint || '', final_image_url, fact || '', options, hspots);
      res.json({ id: info.lastInsertRowid, name, description, target_cell: final_target_cell, hint, image_url: final_image_url, fact, options, hotspots: hspots });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create slide' });
    }
  });

  app.put('/api/bmlt/slides/:id', (req, res) => {
    const { name, description, target_cell, targetCell, hint, image_url, imageUrl, fact, options, hotspots } = req.body;
    const final_target_cell = target_cell || targetCell;
    const final_image_url = image_url || imageUrl;
    if (!name || !description || !final_target_cell || !final_image_url || !options) {
      return res.status(400).json({ error: 'Missing required slide fields' });
    }
    try {
      const hspots = typeof hotspots === 'string' ? hotspots : JSON.stringify(hotspots || []);
      db.prepare(`
        UPDATE bmlt_slides 
        SET name = ?, description = ?, target_cell = ?, hint = ?, image_url = ?, fact = ?, options = ?, hotspots = ?
        WHERE id = ?
      `).run(name, description, final_target_cell, hint || '', final_image_url, fact || '', options, hspots, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update slide' });
    }
  });

  app.delete('/api/bmlt/slides/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM bmlt_slides WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete slide' });
    }
  });

  // Dynamic BMLT Laboratory Parameters and normal ranges
  app.get('/api/bmlt/lab-params', (req, res) => {
    try {
      const params = db.prepare('SELECT * FROM bmlt_lab_params ORDER BY id ASC').all();
      res.json(params);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch BMLT laboratory parameters' });
    }
  });

  app.post('/api/bmlt/lab-params', (req, res) => {
    const { 
      name, unit, 
      normal_min_male, normalMinMale, 
      normal_max_male, normalMaxMale, 
      normal_min_female, normalMinFemale, 
      normal_max_female, normalMaxFemale, 
      category, description 
    } = req.body;
    
    if (!name || !unit || !category) {
      return res.status(400).json({ error: 'Missing required lab parameter fields' });
    }

    const min_male = normal_min_male !== undefined ? normal_min_male : normalMinMale;
    const max_male = normal_max_male !== undefined ? normal_max_male : normalMaxMale;
    const min_female = normal_min_female !== undefined ? normal_min_female : normalMinFemale;
    const max_female = normal_max_female !== undefined ? normal_max_female : normalMaxFemale;

    try {
      const info = db.prepare(`
        INSERT INTO bmlt_lab_params (name, unit, normal_min_male, normal_max_male, normal_min_female, normal_max_female, category, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, unit, Number(min_male || 0), Number(max_male || 0), Number(min_female || 0), Number(max_female || 0), category, description || '');
      res.json({ id: info.lastInsertRowid, name, unit, normal_min_male: min_male, normal_max_male: max_male, normal_min_female: min_female, normal_max_female: max_female, category, description });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create parameter' });
    }
  });

  app.put('/api/bmlt/lab-params/:id', (req, res) => {
    const { 
      name, unit, 
      normal_min_male, normalMinMale, 
      normal_max_male, normalMaxMale, 
      normal_min_female, normalMinFemale, 
      normal_max_female, normalMaxFemale, 
      category, description 
    } = req.body;

    if (!name || !unit || !category) {
      return res.status(400).json({ error: 'Missing required lab parameter fields' });
    }

    const min_male = normal_min_male !== undefined ? normal_min_male : normalMinMale;
    const max_male = normal_max_male !== undefined ? normal_max_male : normalMaxMale;
    const min_female = normal_min_female !== undefined ? normal_min_female : normalMinFemale;
    const max_female = normal_max_female !== undefined ? normal_max_female : normalMaxFemale;

    try {
      db.prepare(`
        UPDATE bmlt_lab_params 
        SET name = ?, unit = ?, normal_min_male = ?, normal_max_male = ?, normal_min_female = ?, normal_max_female = ?, category = ?, description = ?
        WHERE id = ?
      `).run(name, unit, Number(min_male || 0), Number(max_male || 0), Number(min_female || 0), Number(max_female || 0), category, description || '', req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update parameter' });
    }
  });

  app.delete('/api/bmlt/lab-params/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM bmlt_lab_params WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete parameter' });
    }
  });

  // STUDENT AUTH & PROFILE ENDPOINTS
  app.post('/api/student/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    try {
      const student = db.prepare('SELECT * FROM students WHERE username = ?').get(username) as any;
      if (!student) {
        return res.status(401).json({ error: 'Invalid User ID or Password' });
      }
      const valid = bcrypt.compareSync(password, student.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid User ID or Password' });
      }

      (req.session as any).studentId = student.id;
      (req.session as any).studentUsername = student.username;
      (req.session as any).studentDisplayName = student.display_name;

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: 'Session save failed' });
        }
        res.json({
          success: true,
          token: req.sessionID,
          student: {
            id: student.id,
            username: student.username,
            displayName: student.display_name,
            rollNo: student.roll_no,
            regNo: student.reg_no,
            points: student.points,
            profilePic: student.profile_pic,
            session: student.session || '',
            section: student.section || '',
            correctMcqIds: JSON.parse(student.correct_mcq_ids || '[]'),
            correctBmltMcqIds: JSON.parse(student.correct_bmlt_mcq_ids || '[]')
          }
        });
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error during login' });
    }
  });

  app.get('/api/student/me', (req, res) => {
    const studentId = (req.session as any).studentId;
    if (!studentId) {
      return res.status(401).json({ authenticated: false });
    }
    try {
      const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId) as any;
      if (!student) {
        return res.status(404).json({ authenticated: false, error: 'Student not found' });
      }
      res.json({
        authenticated: true,
        student: {
          id: student.id,
          username: student.username,
          displayName: student.display_name,
          rollNo: student.roll_no,
          regNo: student.reg_no,
          points: student.points,
          profilePic: student.profile_pic,
          session: student.session || '',
          section: student.section || '',
          correctMcqIds: JSON.parse(student.correct_mcq_ids || '[]'),
          correctBmltMcqIds: JSON.parse(student.correct_bmlt_mcq_ids || '[]')
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve profile' });
    }
  });

  app.post('/api/student/logout', (req, res) => {
    req.session.destroy((err) => {
      res.json({ success: true });
    });
  });

  app.put('/api/student/profile', (req, res) => {
    const studentId = (req.session as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { displayName, profilePic, newPassword } = req.body;
    
    try {
      if (newPassword) {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        db.prepare('UPDATE students SET display_name = COALESCE(?, display_name), profile_pic = COALESCE(?, profile_pic), password = ? WHERE id = ?')
          .run(displayName, profilePic, hashedPassword, studentId);
      } else {
        db.prepare('UPDATE students SET display_name = COALESCE(?, display_name), profile_pic = COALESCE(?, profile_pic) WHERE id = ?')
          .run(displayName, profilePic, studentId);
      }
      
      const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId) as any;
      res.json({
        success: true,
        student: {
          id: updated.id,
          username: updated.username,
          displayName: updated.display_name,
          rollNo: updated.roll_no,
          regNo: updated.reg_no,
          points: updated.points,
          profilePic: updated.profile_pic,
          session: updated.session || '',
          section: updated.section || '',
          correctMcqIds: JSON.parse(updated.correct_mcq_ids || '[]'),
          correctBmltMcqIds: JSON.parse(updated.correct_bmlt_mcq_ids || '[]')
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update student profile' });
    }
  });

  // Student awards point when answering MCQ, Slide, or Case correctly without duplicates
  app.post('/api/student/earn-points', (req, res) => {
    const studentId = (req.session as any).studentId;
    if (!studentId) {
      return res.status(401).json({ error: 'Student login required to earn points' });
    }
    const { pointsToAdd, mcqId, isBmlt, type, id } = req.body;
    
    // Fallbacks to support older clients
    const activityId = id !== undefined ? id : mcqId;
    let activityType = type;
    if (!activityType) {
      activityType = isBmlt ? 'bmlt_mcq' : 'mcq';
    }

    if (activityId === undefined || pointsToAdd === undefined) {
      return res.status(400).json({ error: 'Missing pointsToAdd or activity ID' });
    }

    try {
      const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId) as any;
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      let correctIds: number[] = [];
      let fieldName = 'correct_mcq_ids';
      
      if (activityType === 'bmlt_mcq') {
        correctIds = JSON.parse(student.correct_bmlt_mcq_ids || '[]');
        fieldName = 'correct_bmlt_mcq_ids';
      } else if (activityType === 'bmlt_slide') {
        correctIds = JSON.parse(student.correct_bmlt_slide_ids || '[]');
        fieldName = 'correct_bmlt_slide_ids';
      } else if (activityType === 'bmlt_case') {
        correctIds = JSON.parse(student.correct_bmlt_case_ids || '[]');
        fieldName = 'correct_bmlt_case_ids';
      } else if (activityType === 'bmlt_case_paragraph') {
        correctIds = JSON.parse(student.correct_bmlt_case_paragraph_ids || '[]');
        fieldName = 'correct_bmlt_case_paragraph_ids';
      } else {
        correctIds = JSON.parse(student.correct_mcq_ids || '[]');
      }

      // Check if already answered
      if (correctIds.includes(Number(activityId))) {
        return res.json({ 
          success: true, 
          alreadyEarned: true, 
          points: student.points,
          msg: 'Points already earned for this activity' 
        });
      }

      const pointsDelta = Number(pointsToAdd);
      let updatedPoints = student.points;
      
      if (pointsDelta > 0) {
        // Only push to correctIds if they actually scored positive points (correct answer)
        correctIds.push(Number(activityId));
        updatedPoints = student.points + pointsDelta;
      } else {
        // Incorrect attempt (deduction), do not mark as correctly answered
        updatedPoints = student.points + pointsDelta;
      }

      // Ensure points do not drop below zero
      if (updatedPoints < 0) {
        updatedPoints = 0;
      }

      db.prepare(`UPDATE students SET points = ?, ${fieldName} = ? WHERE id = ?`)
        .run(updatedPoints, JSON.stringify(correctIds), studentId);

      res.json({
        success: true,
        alreadyEarned: false,
        points: updatedPoints,
        correctMcqIds: activityType === 'mcq' ? correctIds : JSON.parse(student.correct_mcq_ids || '[]'),
        correctBmltMcqIds: activityType === 'bmlt_mcq' ? correctIds : JSON.parse(student.correct_bmlt_mcq_ids || '[]'),
        correctBmltSlideIds: activityType === 'bmlt_slide' ? correctIds : JSON.parse(student.correct_bmlt_slide_ids || '[]'),
        correctBmltCaseIds: activityType === 'bmlt_case' ? correctIds : JSON.parse(student.correct_bmlt_case_ids || '[]'),
        correctBmltCaseParagraphIds: activityType === 'bmlt_case_paragraph' ? correctIds : JSON.parse(student.correct_bmlt_case_paragraph_ids || '[]')
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to record points' });
    }
  });


  // ADMIN STUDENT MANAGEMENT ENDPOINTS (Authorized System Admins only)
  app.get('/api/admin/students', requireAdminOnly, (req, res) => {
    try {
      const students = db.prepare('SELECT id, username, display_name, roll_no, reg_no, points, profile_pic, session, section, created_at FROM students').all();
      res.json(students);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve students' });
    }
  });

  app.post('/api/admin/students', requireAdminOnly, (req, res) => {
    const { username, password, display_name, roll_no, reg_no, session, section } = req.body;
    if (!username || !password || !display_name || !roll_no || !reg_no) {
      return res.status(400).json({ error: 'All fields (ID, Password, Name, Roll No, Reg No) are required' });
    }
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const info = db.prepare('INSERT INTO students (username, password, display_name, roll_no, reg_no, session, section) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(username, hashedPassword, display_name, roll_no, reg_no, session || '2023-2026', section || 'A');
      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Roll No, Reg No, or Login ID already registered' });
      } else {
        res.status(500).json({ error: err.message || 'Server error creating student account' });
      }
    }
  });

  app.put('/api/admin/students/:id', requireAdminOnly, (req, res) => {
    const { username, password, display_name, roll_no, reg_no, points, session, section } = req.body;
    const studentId = req.params.id;
    try {
      const existing = db.prepare('SELECT password FROM students WHERE id = ?').get(studentId) as any;
      if (!existing) {
        return res.status(404).json({ error: 'Student not found' });
      }

      let activePassword = existing.password;
      if (password && password.trim() !== '') {
        activePassword = bcrypt.hashSync(password, 10);
      }

      db.prepare(`
        UPDATE students 
        SET username = COALESCE(?, username), 
            password = ?, 
            display_name = COALESCE(?, display_name), 
            roll_no = COALESCE(?, roll_no), 
            reg_no = COALESCE(?, reg_no), 
            points = COALESCE(?, points),
            session = COALESCE(?, session),
            section = COALESCE(?, section)
        WHERE id = ?
      `).run(username, activePassword, display_name, roll_no, reg_no, points !== undefined ? Number(points) : undefined, session, section, studentId);

      res.json({ success: true });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Roll No, Reg No, or Login ID already registered to another account' });
      } else {
        res.status(500).json({ error: err.message || 'Failed to update student account' });
      }
    }
  });

  app.delete('/api/admin/students/:id', requireAdminOnly, (req, res) => {
    try {
      db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete student' });
    }
  });

  // ADMIN ACADEMIC SESSIONS ENDPOINTS
  app.get('/api/admin/sessions', (req, res) => {
    try {
      const sessions = db.prepare('SELECT id, name FROM academic_sessions ORDER BY name ASC').all();
      res.json(sessions);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve academic sessions' });
    }
  });

  app.post('/api/admin/sessions', requireAdminOnly, (req, res) => {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Session name is required' });
    }
    try {
      const info = db.prepare('INSERT INTO academic_sessions (name) VALUES (?)').run(name.trim());
      res.json({ success: true, id: info.lastInsertRowid, name: name.trim() });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Session already exists' });
      } else {
        res.status(500).json({ error: err.message || 'Failed to create academic session' });
      }
    }
  });

  app.put('/api/admin/sessions/:id', requireAdminOnly, (req, res) => {
    const { name } = req.body;
    const sessionId = req.params.id;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Session name is required' });
    }
    try {
      db.prepare('UPDATE academic_sessions SET name = ? WHERE id = ?').run(name.trim(), sessionId);
      res.json({ success: true, id: Number(sessionId), name: name.trim() });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        res.status(400).json({ error: 'Session name already exists' });
      } else {
        res.status(500).json({ error: err.message || 'Failed to update academic session' });
      }
    }
  });

  app.delete('/api/admin/sessions/:id', requireAdminOnly, (req, res) => {
    const sessionId = req.params.id;
    try {
      db.prepare('DELETE FROM academic_sessions WHERE id = ?').run(sessionId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete academic session' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production' && !process.env.SKIP_VITE_DEV) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e: any) {
      console.warn('Vite dev server could not be loaded dynamically. Falling back to static assets serving.', e?.message || e);
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

// Fallback logic for when GEMINI_API_KEY is not defined
function getProceduralFallbackResponse(mood: string) {
  const m = mood.toLowerCase();
  let moodTag = 'Chilled';
  let desc = 'The sonic landscape reflects a peaceful wave of ambient harmonics. Let the syncopated melodies soothe and center you.';
  let primaryCol = 'bg-slate-950';
  let textCol = 'text-slate-400';
  let borderCol = 'border-slate-500/20';
  
  let hap = 60, nrg = 40, foc = 70, clm = 80;
  let songs = [
    { title: 'Morning Dew', artist: 'The Campus Lofi Syndicate', vibeStyle: 'Lofi Jazz', bpm: 72, freq: 'synthWave' },
    { title: 'Velvet Strings', artist: 'Symphonic Club v2', vibeStyle: 'Classical Fusion', bpm: 80, freq: 'ambientMelody' },
    { title: 'Quiet Lights', artist: 'The Chillies Collective', vibeStyle: 'Retro Soft', bpm: 65, freq: 'subBass' }
  ];

  if (m.includes('happy') || m.includes('pump') || m.includes('excited') || m.includes('energy') || m.includes('dance') || m.includes('go') || m.includes('high') || m.includes('rock') || m.includes('fun')) {
    moodTag = 'Energetic';
    desc = 'High-amplitude dynamics detected! Your energy signature is thriving. It\'s time to set the main stage on fire.';
    primaryCol = 'bg-red-950';
    textCol = 'text-red-400';
    borderCol = 'border-red-500/20';
    hap = 95; nrg = 95; foc = 50; clm = 30;
    songs = [
      { title: 'Chilli Flame', artist: 'The Red-Hot Trombone Crew', vibeStyle: 'Ska Jazz', bpm: 135, freq: 'jazzyGuitar' },
      { title: 'Neon Pulse Beat', artist: 'DJ Synthesist', vibeStyle: 'Synthwave Hop', bpm: 120, freq: 'synthWave' },
      { title: 'Kickin It', artist: 'Udaan Beats', vibeStyle: 'Brass House', bpm: 128, freq: 'subBass' }
    ];
  } else if (m.includes('stress') || m.includes('sad') || m.includes('tired') || m.includes('exam') || m.includes('down') || m.includes('exhaust') || m.includes('depress') || m.includes('low')) {
    moodTag = 'Healing & Warm';
    desc = 'Smooth, restorative frequencies designed to alleviate tension. Lean back, take a deep breath, and let the jazz lift you.';
    primaryCol = 'bg-teal-950';
    textCol = 'text-teal-400';
    borderCol = 'border-teal-500/20';
    hap = 40; nrg = 25; foc = 55; clm = 95;
    songs = [
      { title: 'Calm After Exam', artist: 'The Campus Lofi Syndicate', vibeStyle: 'Restorative Jazz', bpm: 68, freq: 'chillHarmonics' },
      { title: 'Ocean Drift', artist: 'Guitar Strings Deluxe', vibeStyle: 'Ambient Acoustic', bpm: 60, freq: 'ambientMelody' },
      { title: 'Midnight Coffee', artist: 'Smoky Quartet', vibeStyle: 'Classic Lounge', bpm: 70, freq: 'jazzyGuitar' }
    ];
  } else if (m.includes('focus') || m.includes('study') || m.includes('work') || m.includes('code') || m.includes('read') || m.includes('think')) {
    moodTag = 'Deep Focus';
    desc = 'Cerebral alpha waves aligned with hyper-focused jazz rhythms. Optimized for zero distractions.';
    primaryCol = 'bg-indigo-950';
    textCol = 'text-indigo-400';
    borderCol = 'border-indigo-500/20';
    hap = 65; nrg = 50; foc = 98; clm = 75;
    songs = [
      { title: 'Study Session Alpha', artist: 'The Code & Chill Combo', vibeStyle: 'Focus Binaural Lofi', bpm: 85, freq: 'synthWave' },
      { title: 'Flow State Brass', artist: 'Saxophone Intellect', vibeStyle: 'Jazz instrumental', bpm: 80, freq: 'chillHarmonics' },
      { title: 'Logical Harmony', artist: 'Synthesized Calm', vibeStyle: 'Chamber Beat', bpm: 90, freq: 'ambientMelody' }
    ];
  }

  return {
    detectedMood: moodTag,
    moodSummary: `${desc} (Procedurally analyzed based on VIBE core logic)`,
    colorPalette: {
      primary: primaryCol,
      text: textCol,
      border: borderCol
    },
    scores: {
      happiness: hap,
      energy: nrg,
      focus: foc,
      calm: clm
    },
    playlist: songs.map(s => ({
      id: null,
      title: s.title,
      artist: s.artist,
      vibeReason: `Matches the structural pacing required for a ${moodTag} vibe.`,
      vibeStyle: s.vibeStyle,
      bpm: s.bpm,
      audioFrequency: s.freq,
      link: `https://youtube.com/results?search_query=${encodeURIComponent(s.title + ' ' + s.artist)}`
    }))
  };
}
