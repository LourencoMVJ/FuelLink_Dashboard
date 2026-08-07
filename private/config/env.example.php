<?php
// Copy this file to env.php and fill in real values.
// env.php is git-ignored — never commit real secrets.

return [
    'SUPABASE_URL' => 'https://YOUR-PROJECT.supabase.co',
    'SUPABASE_SECRET_KEY' => 'sb_secret_xxx',

    // 'jwks' (asymmetric, preferred) or 'legacy_hs256' — confirm in
    // Supabase Settings -> API -> JWT Keys before relying on this.
    'SUPABASE_JWT_MODEL' => 'jwks',

    // Only required if SUPABASE_JWT_MODEL is 'legacy_hs256'.
    'SUPABASE_JWT_SECRET' => '',
];
