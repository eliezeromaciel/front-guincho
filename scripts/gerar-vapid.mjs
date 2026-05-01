import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();

console.log('\n=== Chaves VAPID geradas ===\n');
console.log('Copie estas linhas para o seu arquivo .env:\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('\nIMPORTANTE:');
console.log('- VITE_VAPID_PUBLIC_KEY: usada no client e no server (pode ser pública)');
console.log('- VAPID_PRIVATE_KEY: usada SOMENTE no server. Nunca commitar no git.\n');
