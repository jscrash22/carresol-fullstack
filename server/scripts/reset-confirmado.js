// reset-confirmado.js — reinicia la BD desde cero SOLO con confirmación explícita
// Uso: CONFIRM_RESET=yes npm run db:reset
// La confirmación por variable evita borrar por accidente una BD en la nube (Supabase).
import { execSync } from 'node:child_process';

if (process.env.CONFIRM_RESET !== 'yes') {
  console.error('Este comando BORRA y recrea la base de datos.');
  console.error('Si estás seguro, ejecuta:  CONFIRM_RESET=yes npm run db:reset');
  console.error('(en PowerShell:  $env:CONFIRM_RESET="yes"; npm run db:reset)');
  process.exit(1);
}

console.log('Confirmando reset de la base de datos...');
execSync('npx prisma migrate reset --force --skip-generate', { stdio: 'inherit', shell: true });
