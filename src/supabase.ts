import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
}) : null;
export function client() {
  if (!supabase) throw new Error('Falta configurar la conexión con Supabase.');
  return supabase;
}
// Sin rutas de servidor: funciona también en alojamientos estáticos y subcarpetas.
export function authRedirect(recovery = false) {
  return `${window.location.origin}${window.location.pathname}${recovery ? '?auth=recovery' : ''}`;
}
export function authMessage(error: unknown) {
  const e = error as { code?: string; message?: string; status?: number };
  const messages: Record<string, string> = {
    invalid_credentials: 'Correo o contraseña incorrectos.',
    email_not_confirmed: 'Confirma tu correo antes de iniciar sesión. Puedes reenviar el enlace.',
    user_already_exists: 'No se pudo crear la cuenta. Prueba a iniciar sesión o recuperar tu contraseña.',
    weak_password: 'La contraseña no cumple los requisitos de seguridad.',
    same_password: 'Elige una contraseña distinta de la actual.',
    over_email_send_rate_limit: 'Se ha alcanzado el límite de correos. Espera unos minutos e inténtalo de nuevo.',
    over_request_rate_limit: 'Demasiados intentos. Espera unos minutos.',
    email_address_not_authorized: 'El envío a este correo aún no está habilitado. El administrador debe configurar SMTP en Supabase.',
    otp_expired: 'El enlace ha caducado o ya se ha utilizado. Solicita uno nuevo.',
    signup_disabled: 'Los registros están desactivados temporalmente.',
    reauthentication_needed: 'Vuelve a iniciar sesión para realizar este cambio.',
    email_exists: 'No se pudo cambiar el correo. Revisa la dirección o prueba otra.',
  };
  if (e?.code && messages[e.code]) return messages[e.code];
  if (e?.message === 'Invalid login credentials') return messages.invalid_credentials;
  if (e?.message === 'Email not confirmed') return messages.email_not_confirmed;
  if (e?.message?.includes('Failed to fetch') || e?.message?.includes('Network')) return 'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.';
  return e?.message || 'No se pudo completar la operación. Inténtalo de nuevo.';
}
