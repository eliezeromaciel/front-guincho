import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// 1. Carregar variáveis de ambiente do arquivo .env manualmente
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    for (const line of envConfig.split('\n')) {
      // Ignorar comentários e linhas vazias
      if (line.trim().startsWith('#') || !line.trim()) continue;
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remover aspas simples/duplas das pontas se houver
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value.trim();
      }
    }
  }
} catch (e) {
  console.error('Erro ao ler o arquivo .env:', e.message);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('ERRO: Credenciais do Firebase incompletas no arquivo .env.');
  console.error('Certifique-se de que FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY estão preenchidas.');
  process.exit(1);
}

// 2. Inicializar Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore(app);
const auth = getAuth(app);

// 3. Função para pedir confirmação no terminal
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// 4. Funções de Limpeza de Banco de Dados
async function clearAuthentication() {
  console.log('Limpando Firebase Authentication...');
  let totalDeleted = 0;
  
  async function deletePageOfUsers(nextPageToken) {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map((user) => user.uid);
    
    if (uids.length > 0) {
      await auth.deleteUsers(uids);
      totalDeleted += uids.length;
      console.log(`Deletados ${uids.length} usuários do Auth.`);
    }
    
    if (listUsersResult.pageToken) {
      await deletePageOfUsers(listUsersResult.pageToken);
    }
  }
  
  await deletePageOfUsers();
  console.log(`Firebase Authentication limpo com sucesso! Total deletado: ${totalDeleted} usuários.`);
}

async function deleteCollection(collectionPath) {
  console.log(`Limpando coleção: "${collectionPath}"...`);
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`Coleção "${collectionPath}" já estava vazia.`);
    return;
  }
  
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Coleção "${collectionPath}" limpa com sucesso (${snapshot.size} docs).`);
}

async function deleteServicosCollection() {
  console.log('Limpando coleção: "servicos" (incluindo subcoleção "fotos")...');
  const servicosRef = db.collection('servicos');
  const snapshot = await servicosRef.get();
  
  if (snapshot.empty) {
    console.log('Coleção "servicos" já estava vazia.');
    return;
  }
  
  let totalFotosDeletadas = 0;
  for (const doc of snapshot.docs) {
    // Buscar subcoleção de fotos
    const fotosRef = doc.ref.collection('fotos');
    const fotosSnap = await fotosRef.get();
    
    if (!fotosSnap.empty) {
      const subBatch = db.batch();
      fotosSnap.docs.forEach((fotoDoc) => {
        subBatch.delete(fotoDoc.ref);
        totalFotosDeletadas++;
      });
      await subBatch.commit();
    }
    
    // Deletar o serviço pai
    await doc.ref.delete();
  }
  
  console.log(`Coleção "servicos" limpa com sucesso (${snapshot.size} serviços e ${totalFotosDeletadas} fotos deletadas).`);
}

// 5. Função Principal
async function main() {
  const force = process.argv.includes('--force') || process.argv.includes('-f');
  
  console.log('====================================================');
  console.log('       RESET E CARGA DE DADOS DO BANCO DE DADOS     ');
  console.log('====================================================');
  console.log(`Projeto Firebase Alvo: ${projectId}`);
  console.log('====================================================');
  
  if (!force) {
    const confirmation = await askConfirmation(
      'ATENÇÃO: Isso irá APAGAR TODOS os dados do Firestore e do Auth deste projeto. Continuar? (sim/y para confirmar): '
    );
    
    if (confirmation !== 'sim' && confirmation !== 'y') {
      console.log('Operação cancelada pelo usuário.');
      process.exit(0);
    }
  } else {
    console.log('Aviso: Flag --force utilizada. Ignorando confirmação por terminal.');
  }
  
  console.log('\nIniciando limpeza dos dados...');
  try {
    // 1. Limpar Auth
    await clearAuthentication();
    
    // 2. Limpar Coleções do Firestore
    await deleteServicosCollection(); // Limpa serviços e suas fotos
    await deleteCollection('subscriptions');
    await deleteCollection('veiculos');
    await deleteCollection('funcionarios');
    await deleteCollection('seguradoras');
    await deleteCollection('despesas');
    await deleteCollection('clientes');
    
    console.log('\nLimpeza concluída com sucesso!');
    console.log('Iniciando carga de dados de teste (Seeding)...\n');
    
    // 3. Seed: Seguradoras
    console.log('Cadastrando seguradoras...');
    const seguradorasDocs = [
      { nome: 'Porto Seguro', ativa: true },
      { nome: 'Azul Seguros', ativa: true },
      { nome: 'Allianz Seguros', ativa: true },
      { nome: 'Bradesco Seguros', ativa: true },
    ];
    const seguradorasMap = {};
    for (const item of seguradorasDocs) {
      const ref = await db.collection('seguradoras').add({
        ...item,
        createdAt: FieldValue.serverTimestamp(),
      });
      seguradorasMap[item.nome] = { id: ref.id, nome: item.nome };
    }
    console.log(`Cadastradas ${Object.keys(seguradorasMap).length} seguradoras.`);
    
    // 4. Seed: Veículos
    console.log('Cadastrando veículos/guinchos...');
    const veiculosDocs = [
      { placa: 'AAA-1A11', modelo: 'Volkswagen Delivery 9.170 (Guincho A)' },
      { placa: 'BBB-2B22', modelo: 'Mercedes-Benz Accelo 1016 (Guincho B)' },
      { placa: 'CCC-3C33', modelo: 'Scania P310 Heavy Duty (Guincho C)' },
    ];
    const veiculosMap = {};
    for (const item of veiculosDocs) {
      const ref = await db.collection('veiculos').add({
        placa: item.placa,
        modelo: item.modelo,
      });
      veiculosMap[item.placa] = { id: ref.id, placa: item.placa, modelo: item.modelo };
    }
    console.log(`Cadastrados ${Object.keys(veiculosMap).length} veículos.`);

    // 5. Seed: Clientes
    console.log('Cadastrando clientes...');
    const clientesDocs = [
      {
        nome: 'Oficina do Tonho',
        telefone: '(11) 98888-7777',
        endereco: 'Rua das Oficinas, 100 - Centro',
        enderecoEntrega: 'Rua das Oficinas, 100 - Centro',
        enderecoRetirada: 'Av. Paulista, 1000 - Bela Vista',
      },
      {
        nome: 'Auto Socorro Silva',
        telefone: '(11) 97777-6666',
        endereco: 'Av. dos Autódromos, 500',
        enderecoEntrega: 'Av. dos Autódromos, 500',
        enderecoRetirada: 'Rodovia Imigrantes, KM 20',
      },
      {
        nome: 'Mariana Souza',
        telefone: '(11) 96666-5555',
        endereco: 'Rua das Flores, 12 - Jardins',
        enderecoEntrega: 'Rua das Flores, 12 - Jardins',
        enderecoRetirada: 'Av. Paulista, 1000 - Bela Vista',
      },
      {
        nome: 'Carlos Eduardo',
        telefone: '(11) 95555-4444',
        endereco: 'Av. Brasil, 1500 - Pinheiros',
        enderecoEntrega: 'Av. Brasil, 1500 - Pinheiros',
        enderecoRetirada: 'Av. Brigadeiro Luis Antonio, 200',
      },
    ];
    const clientesList = [];
    for (const item of clientesDocs) {
      const ref = await db.collection('clientes').add(item);
      clientesList.push({ id: ref.id, ...item });
    }
    console.log(`Cadastrados ${clientesList.length} clientes.`);

    // 6. Seed: Funcionários (Auth + Firestore)
    console.log('Cadastrando funcionários no Authentication e Firestore...');
    const funcionariosDocs = [
      {
        nome: 'Admin Guincho',
        email: 'admin@guincho.com',
        senha: 'admin123',
        role: 'admin',
        motorista: 'A',
      },
      {
        nome: 'João Motorista B',
        email: 'motoristab@guincho.com',
        senha: 'motorista123',
        role: 'readonly',
        motorista: 'B',
      },
      {
        nome: 'Pedro Motorista C',
        email: 'motoristac@guincho.com',
        senha: 'motorista123',
        role: 'readonly',
        motorista: 'C',
      },
    ];
    const funcionariosList = [];
    for (const func of funcionariosDocs) {
      // Criar no Auth
      const userRecord = await auth.createUser({
        email: func.email,
        password: func.senha,
        displayName: func.nome,
      });
      
      // Criar no Firestore com o mesmo UID
      await db.collection('funcionarios').doc(userRecord.uid).set({
        nome: func.nome,
        email: func.email,
        role: func.role,
        motorista: func.motorista,
      });
      
      funcionariosList.push({ uid: userRecord.uid, ...func });
      console.log(`> Usuário cadastrado: ${func.nome} (${func.email})`);
    }

    // 7. Seed: Despesas
    console.log('Cadastrando despesas...');
    const despesasDocs = [
      {
        caminhao: 'A',
        descricao: 'Troca de Óleo e Filtros',
        valorTotal: 450.00,
        dataPagamento: new Date().toISOString().split('T')[0],
        parcelas: 1,
        valorParcela: 450.00,
      },
      {
        caminhao: 'B',
        descricao: 'Pneus Dianteiros Novos',
        valorTotal: 1600.00,
        dataPagamento: '2026-05-15',
        parcelas: 2,
        valorParcela: 800.00,
      },
      {
        caminhao: 'C',
        descricao: 'Seguro Obrigatório ANTT',
        valorTotal: 1200.00,
        dataPagamento: '2026-06-03',
        parcelas: 1,
        valorParcela: 1200.00,
      },
    ];
    for (const item of despesasDocs) {
      await db.collection('despesas').add({
        ...item,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    console.log(`Cadastradas ${despesasDocs.length} despesas.`);

    // 8. Seed: Serviços
    console.log('Cadastrando serviços...');
    const adminFunc = funcionariosList.find((f) => f.role === 'admin');
    const bFunc = funcionariosList.find((f) => f.motorista === 'B');
    const cFunc = funcionariosList.find((f) => f.motorista === 'C');
    
    const client1 = clientesList[2]; // Mariana Souza
    const client2 = clientesList[3]; // Carlos Eduardo
    const client3 = clientesList[0]; // Oficina do Tonho

    const vehicleA = veiculosMap['AAA-1A11'];
    const vehicleB = veiculosMap['BBB-2B22'];
    const vehicleC = veiculosMap['CCC-3C33'];

    const seguradoraPorto = seguradorasMap['Porto Seguro'];

    const servicosDocs = [
      // Serviço 1: Concluído, pago via motorista
      {
        clienteId: client1.id,
        veiculoId: vehicleA.id,
        placaVeiculo: vehicleA.placa,
        valorCobrado: 250.00,
        receiver: adminFunc.nome,
        quemRecebeUid: adminFunc.uid,
        pickUpAdress: client1.enderecoRetirada,
        deliveryAdress: client1.enderecoEntrega,
        motoristaUid: adminFunc.uid,
        motoristaNome: adminFunc.nome,
        detalhesVeiculo: 'Chevrolet Onix Branco',
        status: 'concluido',
        fotosEnviadas: false,
        tipoRecebedor: 'motorista',
        createdAt: FieldValue.serverTimestamp(),
        finalizedAt: FieldValue.serverTimestamp(),
      },
      // Serviço 2: Concluído, faturado para seguradora
      {
        clienteId: client2.id,
        veiculoId: vehicleB.id,
        placaVeiculo: vehicleB.placa,
        valorCobrado: 450.00,
        receiver: '',
        quemRecebeUid: '',
        pickUpAdress: client2.enderecoRetirada,
        deliveryAdress: client2.enderecoEntrega,
        motoristaUid: bFunc.uid,
        motoristaNome: bFunc.nome,
        detalhesVeiculo: 'BMW 320i Preta',
        status: 'concluido',
        fotosEnviadas: false,
        tipoRecebedor: 'seguradora',
        seguradoraId: seguradoraPorto.id,
        seguradoraNome: seguradoraPorto.nome,
        faturadoStatus: 'pendente',
        createdAt: FieldValue.serverTimestamp(),
        finalizedAt: FieldValue.serverTimestamp(),
      },
      // Serviço 3: Pendente
      {
        clienteId: client3.id,
        veiculoId: vehicleC.id,
        placaVeiculo: vehicleC.placa,
        valorCobrado: 800.00,
        receiver: '',
        quemRecebeUid: '',
        pickUpAdress: 'Rodovia Dutra, KM 210',
        deliveryAdress: client3.enderecoEntrega,
        motoristaUid: cFunc.uid,
        motoristaNome: cFunc.nome,
        detalhesVeiculo: 'Caminhão Baú Ford (Pane Mecânica)',
        status: 'pendente',
        fotosEnviadas: false,
        tipoRecebedor: 'nenhum',
        createdAt: FieldValue.serverTimestamp(),
      },
    ];

    for (const item of servicosDocs) {
      await db.collection('servicos').add(item);
    }
    console.log(`Cadastrados ${servicosDocs.length} serviços.`);

    console.log('====================================================');
    console.log('    RESET E CARGA DE DADOS REALIZADOS COM SUCESSO!  ');
    console.log('====================================================');
    console.log('\nUse as credenciais abaixo para fazer o login:');
    funcionariosList.forEach((f) => {
      console.log(`- Nome: ${f.nome}`);
      console.log(`  E-mail: ${f.email}`);
      console.log(`  Senha: ${f.senha}`);
      console.log(`  Função: ${f.role} | Motorista Categoria: ${f.motorista}\n`);
    });
    console.log('====================================================');
    process.exit(0);

  } catch (error) {
    console.error('Ocorreu um erro durante a operação:', error);
    process.exit(1);
  }
}

main();
