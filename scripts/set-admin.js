import fs from 'fs';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf-8');
for (const line of envConfig.split('\n')) {
  if (line.trim().startsWith('#') || !line.trim()) continue;
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.substring(1, value.length - 1);
    else if (value.startsWith("'") && value.endsWith("'")) value = value.substring(1, value.length - 1);
    process.env[match[1]] = value.trim();
  }
}

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);

db.collection('funcionarios').doc('7RoK9Ia4FtTW0tIpm25DVRQQOay2').set({
  nome: 'Admin Dev',
  email: 'admin-dev@guincho.com',
  role: 'admin',
  motorista: 'none',
}).then(() => {
  console.log('✅ Usuário Admin registrado no Firestore com sucesso.');
  process.exit(0);
}).catch(e => {
  console.error('Erro:', e);
  process.exit(1);
});
